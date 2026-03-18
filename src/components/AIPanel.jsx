import React, { useState, useEffect, useRef } from 'react';
import { queryGemini } from '../services/AIService';

// Renderizador simplificado de LaTeX para o chat
const LatexMessage = ({ text }) => {
  const containerRef = useRef(null);

  if (!window.katex) return <div style={{ whiteSpace: 'pre-wrap' }}>{text}</div>;

  // Divide o texto para processar blocos $$ e inline $
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);

  return (
    <div>
      {parts.map((part, index) => {
        if (!part) return null;
        // Bloco Matemático
        if (part.startsWith('$$')) {
          const math = part.replace(/^\$\$|\$\$$/g, '');
          try {
            const html = window.katex.renderToString(math, { displayMode: true, throwOnError: false });
            return <div key={index} dangerouslySetInnerHTML={{ __html: html }} style={{ margin: '8px 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} />;
          } catch (e) { return <div key={index}>{part}</div>; }
        }
        // Inline Matemático
        else if (part.startsWith('$')) {
          const math = part.replace(/^\$|\$$/g, '');
          try {
            const html = window.katex.renderToString(math, { displayMode: false, throwOnError: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
          } catch (e) { return <span key={index}>{part}</span>; }
        }
        // Texto Normal
        else {
          return <span key={index} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>;
        }
      })}
    </div>
  );
};

const AIPanel = ({ apiKey, contextData, onClose, onOpenSettings, onAddBlock, onUpdateNote, onCreateNote }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  const cleanLatex = (raw) => {
    if (!raw) return "";
    // Se vier como string "undefined", limpa
    if (raw === "undefined") return "";

    let clean = raw.trim();
    // Se tiver $$, extrai o que está dentro (se houver apenas um bloco principal)
    if (clean.includes('$$')) {
      const match = clean.match(/\$\$([\s\S]*?)\$\$/);
      if (match) clean = match[1].trim();
    }
    // Remove aspas extras se o Gemini se empolgar
    clean = clean.replace(/^["']|["']$/g, '');
    return clean;
  };

  const lastProcessedId = useRef(null);

  useEffect(() => {
    if (contextData && contextData.id !== lastProcessedId.current) {
      lastProcessedId.current = contextData.id;
      const { text, images, isSelection } = contextData;
      if (isSelection && (text || images.length > 0)) {
        handleSend(text, images, true);
      }
    }
  }, [contextData]);

  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      });
    }
  }, [messages, isLoading]);

  const handleSend = async (text, images = [], isSystemContext = false) => {
    if (!text && images.length === 0) return;

    const displayText = isSystemContext ? "Analise a área selecionada." : text;
    setMessages(prev => [...prev, { role: 'user', text: displayText, hasImage: images.length > 0 }]);
    setIsLoading(true);

    try {
      const prompt = isSystemContext
        ? `Analise este conteúdo selecionado do caderno:\n${text || "(Apenas imagens)"}.`
        : text;

      const responseText = await queryGemini(apiKey, prompt, images, messages);
      console.log("Gemini Raw Response:", responseText);

      // Tenta fazer o parse do JSON com limpeza robusta
      let parsedResponse = null;
      try {
        // Limpa possíveis blocos de código ```json ... ``` ou espaços extras
        let cleanJson = responseText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        // Se ainda não começa com {, tenta encontrar o primeiro { até o último }
        if (!cleanJson.startsWith('{')) {
          const firstBrace = cleanJson.indexOf('{');
          const lastBrace = cleanJson.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace > firstBrace) {
            cleanJson = cleanJson.slice(firstBrace, lastBrace + 1);
          }
        }

        parsedResponse = JSON.parse(cleanJson);
        console.log("Parsed AI Response:", parsedResponse);
      } catch (e) {
        // Se falhar, assume que é texto plano
        console.warn("Failed to parse AI response as JSON, using as text.");
        parsedResponse = { message: responseText, type: 'general' };
      }

      setMessages(prev => [...prev, { role: 'ai', content: parsedResponse }]);

    } catch (error) {
      const isKeyError = error.message === 'API_KEY_MISSING';
      setMessages(prev => [...prev, {
        role: 'error',
        text: isKeyError ? 'Chave de API não configurada.' : `Erro: ${error.message}`,
        isKeyError
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (action) => {
    // A ação pode ter payload pronto (ex: o plot já veio no JSON) ou precisar pedir de novo
    const { action_id, payload } = action;

    // Se o payload do gráfico já estiver no "content.data" da mensagem pai, precisariamos acessá-lo.
    // Mas aqui 'action' é o botão clicado.
    // Vamos simplificar: Se a ação tem 'payload' (dados), usamos.
    // Se não, enviamos um prompt oculto para a IA gerar.

    // Estratégia melhor: O JSON da resposta original já deve conter os dados em 'data' se possível,
    // ou a IA deve ter sido instruída a só sugerir.
    // Nosso prompt diz para a IA oferecer ações.
    // Se o usuário clicar em "Plotar", enviamos "Gere o JSON do gráfico para isso" para a IA,
    // E ela retornará um JSON com "data.plot_json".

    // Porém, se a IA já foi esperta e mandou os dados (cenário ideal mas gasta tokens),
    // podemos checar se action.payload existe.

    // Vamos assumir o fluxo de "comando de volta":
    // Clicar no botão envia uma mensagem oculta de sistema pedindo o artefato específico.

    if (action_id === 'PLOT_GRAPH') {
      handleSend("Gere a expressão ou comando para o GeoGebra (action_id=PLOT_GRAPH) para a função/dados discutidos.", [], false);
    }
    else if (action_id === 'SOLVE') {
      handleSend("Resolva a equação passo a passo em LaTeX (action_id=SOLVE).", [], false);
    }
    else if (action_id === 'DERIVE') {
      handleSend("Mostre a dedução detalhada em LaTeX (action_id=DERIVE).", [], false);
    }
    else if (action_id === 'UPDATE_NOTE' || action_id === 'ADD_TO_NOTE') {
      if (payload && onUpdateNote) {
        onUpdateNote(payload);
      }
    }
    else if (action_id === 'CREATE_NOTE') {
      if (payload && onCreateNote) {
        onCreateNote(payload.type, payload.content, payload.title);
      }
    }
  };

  // Ref para o painel principal para gerenciar eventos nativos
  const panelRef = useRef(null);

  // Impede que o scroll do painel propague para o Canvas ( que tem preventDefault)
  useEffect(() => {
    const section = panelRef.current;
    if (!section) return;

    const handleWheelProp = (e) => {
      e.stopPropagation();
      // Não chamamos preventDefault() aqui, pois queremos que o scroll nativo da div aconteça!
    };

    section.addEventListener('wheel', handleWheelProp, { passive: false });
    return () => section.removeEventListener('wheel', handleWheelProp);
  }, []);

  return (
    <div
      ref={panelRef}
      className="glass-panel accent-glow"
      style={{
        position: 'absolute', right: '20px', top: '20px', bottom: '20px', width: '380px',
        zIndex: 200, padding: '0', borderRadius: '20px', display: 'flex', flexDirection: 'column',
        maxHeight: 'calc(100vh - 40px)', overflow: 'hidden'
      }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1rem', color: '#10b981', margin: 0, fontWeight: 600 }}>✨ Tutor IA</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-secondary)' }}>×</button>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.length === 0 && !isLoading && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '20px', fontSize: '0.9rem' }}>
            <p>Olá! Sou seu assistente de exatas.</p>
            <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>Use o laço verde para circular e perguntar.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '20px' }}>
              <button className="liquid-item" onClick={() => handleSend("Faça um resumo disto.")} style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8rem' }}>
                📝 Resumir
              </button>
              <button className="liquid-item" onClick={() => handleSend("Crie um mapa mental sobre este conteúdo. Gere um JSON compatível.")} style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8rem' }}>
                🧠 Mapa Mental
              </button>
              <button className="liquid-item" onClick={() => handleSend("Explique este conceito como se eu tivesse 5 anos.")} style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8rem' }}>
                👶 Explicar
              </button>
              <button className="liquid-item" onClick={() => handleSend("Analise este código/texto e sugira melhorias.")} style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8rem' }}>
                🔧 Melhorar
              </button>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isAi = msg.role === 'ai';
          const content = msg.content || {}; // JSON parsed
          const text = msg.text || content.message || ""; // Fallback

          // Dados que podem vir no JSON
          const ggbCommand = content.data?.ggb_command;
          const latexDetailed = cleanLatex(content.data?.latex_detailed || content.data?.latex_content); // Fallback to old field
          const latexMathOnly = cleanLatex(content.data?.latex_math_only);
          const actions = content.suggested_actions || [];

          return (
            <div key={idx} style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '90%',
              padding: '12px 16px', borderRadius: '16px', fontSize: '0.9rem', lineHeight: '1.5',
              background: msg.role === 'user' ? 'var(--accent-gradient)' : (msg.role === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)'),
              color: msg.role === 'user' ? 'white' : (msg.role === 'error' ? '#ef4444' : 'var(--text-primary)'),
              boxShadow: msg.role === 'user' ? '0 4px 15px var(--accent-glow)' : 'none',
              border: msg.role === 'error' ? '1px solid #fecaca' : (msg.role === 'ai' ? '1px solid rgba(255,255,255,0.1)' : 'none'),
              backdropFilter: msg.role === 'ai' ? 'blur(10px)' : 'none'
            }}>
              {msg.hasImage && <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: 4 }}>📷 [Imagem]</div>}

              <LatexMessage text={text} />

              {/* Mostra o conteúdo LaTeX diretamente no chat se existir (Prévia Simplificada) */}
              {isAi && (latexDetailed || latexMathOnly) && (
                <div style={{
                  marginTop: '10px',
                  padding: '4px 0',
                  borderTop: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div style={{ fontSize: '0.65rem', opacity: 0.5, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prévia Matemática:</div>
                  <LatexMessage text={(latexMathOnly || latexDetailed).includes('$$') ? (latexMathOnly || latexDetailed) : `$$${(latexMathOnly || latexDetailed)}$$`} />
                </div>
              )}

              {/* Ações Sugeridas (Botões) */}
              {actions.length > 0 && (
                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {actions.map((act, i) => (
                    <button key={i} onClick={(e) => { e.stopPropagation(); handleAction(act); }} className="liquid-item" style={{
                      padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px', border: '1px solid var(--accent-color)',
                      background: 'rgba(255,255,255,0.1)', color: 'var(--accent-color)', cursor: 'pointer', fontWeight: '600',
                      backdropFilter: 'blur(5px)'
                    }}>
                      {act.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Botão Adicionar Gráfico (se veio comando GeoGebra) */}
              {ggbCommand && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#10b981', marginBottom: '4px' }}>📊 Gráfico GeoGebra</div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddBlock('PLOT', ggbCommand, contextData?.sourceBlockId); }}
                    className="liquid-item"
                    style={{
                      width: '100%', padding: '6px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'
                    }}
                  >
                    + Adicionar Gráfico à Nota
                  </button>
                </div>
              )}

              {/* Botão Adicionar Resolução/Dedução (Dual Mode) */}
              {(latexDetailed || latexMathOnly) && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-color)', marginBottom: '10px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '1rem' }}>✨</span> Adicionar ao Caderno
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {latexDetailed && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddBlock('LATEX', latexDetailed, contextData?.sourceBlockId);
                          alert("Resolução detalhada adicionada!");
                        }}
                        className="liquid-item"
                        style={{
                          width: '100%', padding: '10px', background: 'var(--accent-gradient)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer',
                          fontSize: '0.85rem', fontWeight: '700', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                        }}
                      >
                        📝 + Detalhado (Passo a Passo)
                      </button>
                    )}
                    {latexMathOnly && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddBlock('LATEX', latexMathOnly, contextData?.sourceBlockId);
                          alert("Cálculos adicionados!");
                        }}
                        className="liquid-item"
                        style={{
                          width: '100%', padding: '10px', background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '10px', cursor: 'pointer',
                          fontSize: '0.85rem', fontWeight: '600'
                        }}
                      >
                        🔢 + Só Cálculos (Matemática Pura)
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Botão Aplicar Atualização de Nota (Mindmap, Code, Text) */}
              {content.data?.update_note && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#10b981', marginBottom: '4px' }}>📝 Conteúdo Estruturado</div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onUpdateNote(content.data.update_note); }}
                    className="liquid-item"
                    style={{
                      width: '100%', padding: '6px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'
                    }}
                  >
                    + Aplicar à Nota Ativa
                  </button>
                </div>
              )}

              {/* Botão Criar Nota (Generic) */}
              {content.suggested_note && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#8b5cf6', marginBottom: '4px' }}>✨ Sugestão de Nota</div>
                  <button
                    onClick={() => onCreateNote(content.suggested_note.type, content.suggested_note.content, content.suggested_note.title)}
                    style={{
                      width: '100%', padding: '6px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'
                    }}
                  >
                    + Criar Nota: {content.suggested_note.title}
                  </button>
                </div>
              )}

              {msg.isKeyError && (
                <button onClick={onOpenSettings} style={{ marginTop: '8px', padding: '4px 8px', background: 'white', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Configurar</button>
              )}
            </div>
          );
        })}
        {isLoading && <div style={{ alignSelf: 'flex-start', color: 'var(--text-secondary)', fontSize: '0.8rem', paddingLeft: 10 }}>Pensando...</div>}
      </div>

      <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px', flexShrink: 0, background: 'rgba(255,255,255,0.02)' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (handleSend(input), setInput(''))}
          placeholder="Pergunte algo..."
          style={{
            flex: 1, padding: '12px', borderRadius: '12px',
            border: '1px solid var(--border-color)',
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--text-primary)', outline: 'none',
            fontSize: '0.9rem'
          }}
        />
        <button
          onClick={() => { handleSend(input); setInput(''); }}
          className="liquid-item"
          style={{
            padding: '12px 16px', borderRadius: '12px', border: 'none',
            background: 'var(--accent-gradient)', color: 'white',
            cursor: 'pointer', boxShadow: '0 4px 15px var(--accent-glow)'
          }}
        >➤</button>
      </div>
    </div>
  );
};

// Helper simples para validar se data é objeto não vazio
const parseData = (d) => {
  if (!d) return null;
  if (Object.keys(d).length === 0) return null;
  // Se for string JSON, dar parse
  if (typeof d === 'string') {
    try { return JSON.parse(d); } catch (e) { return null; }
  }
  return d;
};

export default AIPanel;