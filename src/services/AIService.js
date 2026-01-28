export const queryGemini = async (apiKey, prompt, images = []) => {
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  
  const systemPrompt = `
    Você é um tutor de Exatas (Física, Matemática, Engenharia).
    Analise o texto e as imagens fornecidas.
    Se for uma questão, resolva passo a passo.
    Se for um conceito, explique didaticamente.
    Use LaTeX para matemática: $$ fórmula $$ para bloco, $ fórmula $ para linha.
    Responda em Português do Brasil.
  `;

  // Monta o conteúdo
  const parts = [{ text: prompt }];

  // Adiciona imagens convertidas em Base64
  images.forEach(img => {
    const base64 = img.src.includes(',') ? img.src.split(',')[1] : img.src;
    if (base64) {
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: base64
        }
      });
    }
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        systemInstruction: { parts: [{ text: systemPrompt }] }
      })
    });

    if (response.status === 429) {
      throw new Error("Cota de uso excedida (429). Aguarde um momento.");
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Não consegui gerar uma resposta sobre isso.";

  } catch (err) {
    console.error("AI Service Error:", err);
    throw err;
  }
};