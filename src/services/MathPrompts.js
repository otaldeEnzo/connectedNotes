/**
 * Enhanced math prompts for complex problem solving
 */
export const getMathPrompt = (type, expression) => {
    const prompts = {
        solve: `Você é um matemático especialista. Resolva esta expressão/equação matemática e retorne APENAS o resultado final em formato LaTeX.

REGRAS IMPORTANTES:
1. Use SEMPRE a barra invertida (\\) para comandos LaTeX (ex: \\sqrt, \\pm, \\text, \\quad, \\approx). NUNCA escreva comandos sem barra.
2. Para equações simples, retorne a solução exata (ex: x = 5 ou x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}).
3. Para equações de grau alto (3+), sistemas complexos, ou problemas sem solução analítica simples:
   - Use métodos numéricos se necessário
   - Forneça soluções aproximadas com \\approx
   - Liste todas as raízes reais e complexas encontradas
4. Para polinômios de grau muito alto (ex: grau 20), indique:
   - As raízes reais aproximadas
   - O número de raízes complexas conjugadas
   - Use notação científica se necessário (ex: 1.23 \\times 10^{5})
5. Se não houver solução real, indique claramente (ex: \\text{Sem raízes reais} ou liste as raízes complexas).
6. Se houver múltiplas soluções, liste todas separadas por vírgula ou \\text{ e }.

Expressão para resolver: ${expression}`,

        steps: `Você é um tutor de matemática especialista. Resolva esta expressão passo a passo de forma clara e concisa em LaTeX.

REGRAS IMPORTANTES:
1. Use SEMPRE a barra invertida (\\) para comandos LaTeX (ex: \\sqrt, \\pm, \\text, \\quad).
2. Use o formato EXATO:
   Passo 1: [descrição breve] - [expressão LaTeX]
   Passo 2: [descrição breve] - [expressão LaTeX]
   ...
   Resultado: [resultado final em LaTeX]
3. Para problemas complexos (polinômios de grau alto, sistemas não-lineares):
   - Explique qual método está usando (Cardano, Newton-Raphson, fatoração, etc.)
   - Mostre os cálculos intermediários relevantes
   - Use aproximações numéricas quando necessário (indicando com \\approx)
4. Seja conciso mas completo - mostre os passos essenciais sem pular etapas críticas.

Expressão para resolver: ${expression}`
    };

    return prompts[type] || prompts.solve;
};
