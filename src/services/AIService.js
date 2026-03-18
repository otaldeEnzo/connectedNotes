import { getMathPrompt } from './MathPrompts';

// Cache para evitar muitas chamadas de listagem
let cachedModel = null;
const blacklistedModels = new Set();
// Limpa blacklist a cada 5 minutos
setInterval(() => blacklistedModels.clear(), 5 * 60 * 1000);

const getBestAvailableModel = async (apiKey) => {
  if (cachedModel && !blacklistedModels.has(cachedModel)) return cachedModel;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();

    if (!data.models) return "gemini-2.0-flash"; // Fallback to newest stable

    // Prioridade de escolha (Newest Stable > Older)
    const priority = [
      "gemini-2.0-flash",         // Current stable Flash
      "gemini-2.0-flash-exp",     // Experimental
      "gemini-1.5-flash-latest",
      "gemini-1.5-flash-002",
      "gemini-1.5-flash-001",
      "gemini-1.5-flash",
      "gemini-1.5-pro-latest",
      "gemini-1.5-pro",
      "gemini-pro"
    ];

    const availableNames = data.models.map(m => m.name.replace("models/", ""));
    console.log("Modelos disponíveis para esta chave:", availableNames);

    for (const p of priority) {
      if (availableNames.includes(p) && !blacklistedModels.has(p)) {
        cachedModel = p;
        return p;
      }
    }

    // Se nenhum da lista de prioridade estiver limpo, pega o primeiro gemini que não esteja na blacklist
    const fallback = availableNames.find(n => n.startsWith("gemini") && !n.includes("vision") && !blacklistedModels.has(n));
    if (fallback) {
      cachedModel = fallback;
      return fallback;
    }

    // Caso extremo: se tudo estiver na blacklist, limpa e pega o primeiro prioritário
    if (availableNames.length > 0) {
      blacklistedModels.clear();
      return priority.find(p => availableNames.includes(p)) || availableNames[0];
    }

    return "gemini-2.0-flash";
  } catch (e) {
    console.warn("Falha ao listar modelos, usando fallback:", e);
    return "gemini-2.0-flash";
  }
};

export const clearModelCache = () => {
  cachedModel = null;
};

/**
 * Simple query to Gemini without JSON formatting - for math solving
 * Returns plain text/LaTeX response or error message
 * Has fallback logic for quota exceeded (429) errors
 */
const queryGeminiSimple = async (apiKey, prompt, depth = 0) => {
  if (!apiKey) {
    console.error("[SimpleMath] API Key is missing!");
    return "Erro: Chave de API não configurada.";
  }

  // Prevent infinite retry loop
  if (depth > 5) {
    return "Erro: Todos os modelos atingiram o limite de cota. Aguarde alguns minutos.";
  }

  const model = await getBestAvailableModel(apiKey);
  console.log(`[SimpleMath] Tentativa ${depth + 1}, modelo: ${model}`);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      })
    });

    // Check for quota exceeded (429 error)
    if (response.status === 429) {
      console.warn(`[SimpleMath] Cota excedida para ${model}, tentando outro modelo...`);
      blacklistedModels.add(model);
      cachedModel = null;
      // Wait a bit before retrying
      await new Promise(r => setTimeout(r, 500));
      return queryGeminiSimple(apiKey, prompt, depth + 1);
    }

    const data = await response.json();

    // Also check for quota error in response body
    if (data.error) {
      console.error("[SimpleMath] API Error:", data.error);
      if (data.error.code === 429 || data.error.status === "RESOURCE_EXHAUSTED") {
        console.warn(`[SimpleMath] Cota excedida (resposta), tentando outro modelo...`);
        blacklistedModels.add(model);
        cachedModel = null;
        await new Promise(r => setTimeout(r, 500));
        return queryGeminiSimple(apiKey, prompt, depth + 1);
      }
      return `Erro: ${data.error.message || "API Error"}`;
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("[SimpleMath] No text in response:", data);
      return "Erro: Resposta vazia da IA.";
    }

    return text;
  } catch (err) {
    console.error("[SimpleMath] Exception:", err);
    return `Erro: ${err.message}`;
  }
};

export const queryGemini = async (apiKey, prompt, images = [], history = [], depth = 0) => {
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  // Se excedermos 5 tentativas de modelos diferentes, interrompe para evitar loop infinito
  if (depth > 5) {
    throw new Error("⚠️ Todos os modelos de IA disponíveis atingiram o limite de uso. Isso é comum no plano gratuito se houver muitos pedidos seguidos. Aguarde de 1 a 5 minutos para que o Google restaure sua cota.");
  }

  const model = await getBestAvailableModel(apiKey);
  console.log(`Usando modelo Gemini (Tentativa ${depth + 1}): ${model}`);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const systemPrompt = `
    Você é um tutor de Exatas (Física, Matemática, Engenharia) altamente didático e paciente.
    Seu objetivo é ajudar o estudante a compreender conceitos profundamente e resolver problemas passo a passo.
    
    DIRETRIZES:
    1. Analise o conteúdo (imagem/texto).
    2. RESPONDA SEMPRE EM JSON neste formato rigoroso:
    {
      "message": "Texto explicativo ou pergunta para o usuário (pode usar LaTeX $$...$$)",
      "type": "question|math_analysis|general",
      "suggested_actions": [
        { "label": "Título do Botão", "action_id": "PLOT_GRAPH | SOLVE | DERIVE | SUMMARIZE | ADD_TO_NOTE", "payload": "Dados extras se necessário" }
      ],
      "data": {
        "ggb_command": "", // Se for gráfico, forneça o comando ou expressão para o GeoGebra (ex: "f(x)=sin(x)", "x^2 + y^2 = 9")
        "latex_detailed": "", // Resolução completa com explicações detalhadas em \text{...}
        "latex_math_only": "" // Apenas os passos matemáticos puros
      }
    }

    3. COMPORTAMENTO:
       - Se o usuário circular uma fórmula/função: Identifique-a e ofereça ["PLOT_GRAPH", "SOLVE"].
       - Se for pedido para PLOTAR (action_id=PLOT_GRAPH): Forneça a expressão ou comando puro para o GeoGebra no campo "data.ggb_command".
       - Se for pedido para RESOLVER (action_id=SOLVE): Encontre os valores das variáveis ($x$, $y$, etc.). 
       - O campo "data.latex_detailed" deve conter o PASSO A PASSO COMPLETO com explicações ricas em Português usando o comando \\text{...}. Deixe o conteúdo rico para que o usuário possa estudar os passos.
       - O campo "data.latex_math_only" deve conter APENAS as equações e passos matemáticos puros, sem explicações textuais em Português.
       - REGRAS DE LaTeX:
         * SEMPRE use a barra invertida (\\) para comandos (ex: \\quad, \\sqrt, \\frac). NUNCA omita a barra (ex: NÃO use "quad").
         * TODO E QUALQUER texto em Português ou caracteres com acento (á, é, í, ó, ú, ç, etc.) DEVE estar obrigatoriamente dentro de um comando \\text{...}. Caso contrário o renderizador falhará.
         * NUNCA retorne a palavra "undefined" ou "null" em campos de conteúdo. Se não souber algo, use \\text{Erro ao processar}.
         * Use \\quad x para dar espaço antes de uma variável em texto ou listas.
       - Se for pedido para DEDUZIR (action_id=DERIVE): Explique a origem física/matemática da fórmula usando apenas LaTeX detalhado (com \\text para explicações).
       - Nunca quebre o JSON. O usuário não vê o JSON, o app processa.
  `;

  // Monta o histórico de mensagens
  const contents = [];

  // Se houver histórico, adiciona as mensagens anteriores
  history.forEach((msg, idx) => {
    let partText = "";
    if (msg.role === 'ai') {
      partText = typeof msg.content === 'object' ? JSON.stringify(msg.content) : msg.content;
    } else {
      partText = msg.text || "";
    }

    // Se for a PRIMEIRA mensagem da conversa, injeta o system prompt
    if (idx === 0 && msg.role === 'user') {
      partText = `INSTRUÇÕES DE SISTEMA:\n${systemPrompt}\n\n---\n\nUSUÁRIO: ${partText}`;
    }

    contents.push({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: partText }]
    });
  });

  // Adiciona a mensagem atual
  const currentParts = [{ text: prompt }];

  // Se for uma nova conversa (sem histórico), injeta o system prompt aqui
  if (contents.length === 0) {
    currentParts[0].text = `INSTRUÇÕES DE SISTEMA:\n${systemPrompt}\n\n---\n\nUSUÁRIO: ${prompt}`;
  }

  // Adiciona imagens convertidas em Base64 à mensagem atual
  images.forEach(img => {
    const base64 = img.src.includes(',') ? img.src.split(',')[1] : img.src;
    if (base64) {
      currentParts.push({
        inlineData: {
          mimeType: "image/png",
          data: base64
        }
      });
    }
  });

  contents.push({ role: 'user', parts: currentParts });

  // Helper para retry com backoff exponencial
  const fetchWithRetry = async (url, options, retries = 2, backoff = 1000) => {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        console.warn(`Cota excedida para ${model}.`);
        if (retries > 0) {
          console.log(`Tentando novamente em ${backoff}ms...`);
          await new Promise(r => setTimeout(r, backoff));
          return fetchWithRetry(url, options, retries - 1, backoff * 1.5);
        } else {
          // Se esgotou as tentativas, coloca o modelo na blacklist e tenta trocar de modelo
          console.log(`Blacklisting model ${model} and switching...`);
          blacklistedModels.add(model);
          cachedModel = null;
          throw new Error("QUOTA_EXCEEDED_FOR_MODEL");
        }
      }

      return response;
    } catch (err) {
      if (err.message === "QUOTA_EXCEEDED_FOR_MODEL") throw err;
      if (retries > 0) {
        await new Promise(r => setTimeout(r, backoff));
        return fetchWithRetry(url, options, retries - 1, backoff * 1.5);
      }
      throw err;
    }
  };

  try {
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    // Defensive check for nesting
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    // Hard Strike: Prune "undefined" or null strings
    if (!text || text === "undefined" || text === "null") {
      return "Não consegui gerar uma resposta válida.";
    }

    return text;

  } catch (err) {
    if (err.message === "QUOTA_EXCEEDED_FOR_MODEL") {
      return queryGemini(apiKey, prompt, images, history, depth + 1);
    }
    console.error("AI Service Error:", err);
    throw err;
  }
};

export const validateKey = async (apiKey) => {
  if (!apiKey) throw new Error("Chave vazia");
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.models || [];
};

/**
 * For rapid actions on the canvas (Solve/Steps)
 * Uses queryGeminiSimple for plain text responses without JSON formatting
 */
export const quickMathAction = async (apiKey, type, expression) => {
  const prompts = {
    solve: `Você é um solucionador de equações matemáticas. Resolva a equação ou expressão abaixo e encontre o valor da variável.

TAREFA: Encontrar o valor de x (ou outras variáveis) que satisfaz a equação.
EXPRESSÃO: ${expression}

INSTRUÇÃO CRÍTICA: 
- NÃO repita a expressão original
- RESOLVA a equação e encontre os valores das variáveis
- Retorne APENAS o resultado no formato: x = [valor]
- Use formato LaTeX puro (use \\\\ para comandos como \\\\frac, \\\\sqrt, \\\\pm)
- Se houver múltiplas soluções: x = valor_1 \\\\text{ ou } x = valor_2
- Se for uma expressão sem variável, calcule o resultado numérico`,

    steps: `Você é um tutor de matemática. Resolva a equação/expressão abaixo mostrando CADA PASSO da resolução.

EXPRESSÃO: ${expression}

FORMATO OBRIGATÓRIO - use este formato EXATO com cada passo em uma NOVA LINHA:
Passo 1: Isolar termos com x - 2x = 7 - 3
Passo 2: Simplificar - 2x = 4
Passo 3: Dividir ambos os lados por 2 - x = 2
Resultado: x = 2

REGRAS CRÍTICAS:
- Mostre PELO MENOS 3 passos (ou mais se necessário)
- Cada passo DEVE estar em uma linha separada
- Use o formato "Passo N: descrição - expressão"
- NÃO use JSON
- NÃO use asteriscos ou markdown
- Use LaTeX simples sem delimitadores $ (ex: \\frac{a}{b}, \\sqrt{x})`
  };

  const prompt = prompts[type] || prompts.solve;

  try {
    const response = await queryGeminiSimple(apiKey, prompt);

    // If queryGeminiSimple returned an error message, pass it through
    if (response && typeof response === 'string' && response.startsWith('Erro:')) {
      return response;
    }

    // Robust validation
    if (!response || typeof response !== 'string') {
      return "Erro: Resposta inválida da IA.";
    }

    const trimmed = response.trim();
    if (trimmed.toLowerCase() === "undefined" || trimmed.toLowerCase() === "null" || trimmed === "") {
      return "Erro: Não foi possível processar a expressão.";
    }

    // Extract LaTeX content if wrapped in $$ or $ delimiters
    // Only for 'solve' type - for 'steps' we need the full multi-line response
    let clean = trimmed;

    if (type === 'solve') {
      // Try $$ first
      if (clean.includes('$$')) {
        const match = clean.match(/\$\$([\s\S]*?)\$\$/);
        if (match) clean = match[1].trim();
      }
      // Try single $ for inline
      else if (clean.includes('$') && !clean.includes('$$')) {
        const match = clean.match(/\$([^$]+)\$/);
        if (match) clean = match[1].trim();
      }
    }
    // For 'steps', just remove $ delimiters but keep the content structure
    else if (type === 'steps') {
      // Remove $ delimiters but keep the text structure
      clean = clean.replace(/\$/g, '');
    }

    // Final validation
    if (!clean || clean.toLowerCase() === "undefined" || clean.toLowerCase() === "null") {
      return "Erro: Processamento falhou.";
    }

    return clean;
  } catch (err) {
    console.error("Quick Math Error:", err);
    return `Erro: ${err.message}`;
  }
};