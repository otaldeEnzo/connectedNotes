import { queryGemini } from './AIService';

/**
 * MathRecognitionService.js
 * Cloud-based Math Handwriting Recognition using Gemini API.
 * Replaces the heavy legacy local ONNX implementation.
 */

class MathRecognitionService {
    /**
     * Converts a selection of ink strokes to a LaTeX expression using Gemini Vision.
     * @param {Array} strokes - Array of stroke objects.
     * @param {string} apiKey - User's personal Gemini API key.
     */
    async recognizeExpression(strokes, apiKey) {
        if (!apiKey) {
            throw new Error("MISSING_API_KEY");
        }

        try {
            // 1. Convert strokes to a base64 image
            // We use a helper from CanvasUtils via the context or directly here
            // For simplicity and decoupling, we implement a robust conversion here.
            const imageData = await this.strokesToBase64(strokes);

            // 2. Prepare the prompt for Gemini
            const prompt = `
                Você é um especialista em OCR de matemática. 
                Analise a imagem da escrita manual fornecida e converta-a EXATAMENTE para LaTeX.
                REGRAS:
                - Retorne APENAS o código LaTeX, sem explicações, sem blocos de código markdown (\`\`\`).
                - Se houver múltiplos termos, organize-os corretamente.
                - Se não conseguir identificar nada, retorne apenas "?".
            `;

            // 3. Query Gemini
            const response = await queryGemini(apiKey, prompt, [{ src: imageData }]);

            // Clean up the response (Gemini sometimes adds markdown blocks, quotes, or JSON)
            let cleanResult = response
                .replace(/```latex/g, '')
                .replace(/```/g, '')
                .replace(/^["'`]+|["'`]+$/g, '') // Remove aspas ao redor
                .trim();

            // Tenta extrair do JSON se vier no formato {"message": ...}
            try {
                const parsed = JSON.parse(cleanResult);
                if (parsed.message) cleanResult = parsed.message;
                if (parsed.latex_content) cleanResult = parsed.latex_content;
            } catch (_) { /* Não é JSON, usar como está */ }

            return cleanResult || "?";
        } catch (err) {
            console.error("Math Recognition Error:", err);
            throw err;
        }
    }

    /**
     * Helper to convert strokes to a base64 PNG image for the API.
     */
    async strokesToBase64(strokes) {
        const DIM = 384; // Good resolution for Gemini
        const canvas = document.createElement('canvas');
        canvas.width = DIM; canvas.height = DIM;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, DIM, DIM);
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const bounds = this.getStrokesBounds(strokes);
        const padding = 20;
        const scale = Math.min((DIM - padding * 2) / bounds.width, (DIM - padding * 2) / bounds.height);
        const ox = (DIM - bounds.width * scale) / 2;
        const oy = (DIM - bounds.height * scale) / 2;

        strokes.forEach(s => {
            if (s.points.length < 2) return;
            ctx.beginPath();
            ctx.moveTo((s.points[0].x - bounds.x) * scale + ox, (s.points[0].y - bounds.y) * scale + oy);
            for (let i = 1; i < s.points.length; i++) {
                ctx.lineTo((s.points[i].x - bounds.x) * scale + ox, (s.points[i].y - bounds.y) * scale + oy);
            }
            ctx.stroke();
        });

        return canvas.toDataURL('image/png');
    }

    getStrokesBounds(strokes) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        strokes.forEach(s => s.points.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }));
        if (minX === Infinity) return { x: 0, y: 0, width: 10, height: 10 };
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
}

export default new MathRecognitionService();
