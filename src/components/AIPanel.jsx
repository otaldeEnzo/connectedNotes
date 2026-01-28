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
               return <div key={index} dangerouslySetInnerHTML={{ __html: html }} style={{ margin: '8px 0', overflowX: 'auto' }} />;
             } catch(e) { return <div key={index}>{part}</div>; }
          }
          // Inline Matemático
          else if (part.startsWith('$')) {
             const math = part.replace(/^\$|\$$/g, '');
             try {
               const html = window.katex.renderToString(math, { displayMode: false, throwOnError: false });
               return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
             } catch(e) { return <span key={index}>{part}</span>; }
          }
          // Texto Normal
          else {
             return <span key={index} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>;
          }
      })}
    </div>
  );
};

const AIPanel = ({ apiKey, contextData, onClose, onOpenSettings }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);
  
  // Ref para rastrear ID do contexto
  const lastProcessedId = useRef(null);

  useEffect(() => {
    // Verifica se recebemos dados novos (comparando ID)
    if (contextData && contextData.id !== lastProcessedId.current) {
      lastProcessedId.current = contextData.id;
      
      const { text, images, isSelection } = contextData;
      
      if (isSelection && (text || images.length > 0)) {
        handleSend(text, images, true);
      }
    }
  }, [contextData]);

  // Auto-scroll
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
    
    setMessages(prev => [...prev, { 
        role: 'user', 
        text: displayText, 
        hasImage: images.length > 0 
    }]);
    
    setIsLoading(true);

    try {
      const prompt = isSystemContext 
        ? `Analise este conteúdo selecionado do caderno:\n${text || "(Apenas imagens)"}\n\nExplique ou resolva.` 
        : text;

      const response = await queryGemini(apiKey, prompt, images);
      setMessages(prev => [...prev, { role: 'ai', text: response }]);
    } catch (error) {
      if (error.message === 'API_KEY_MISSING') {
        setMessages(prev => [...prev, { role: 'error', text: 'Chave de API não configurada.', isKeyError: true }]);
      } else {
        setMessages(prev => [...prev, { role: 'error', text: `Erro: ${error.message}` }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ 
      position: 'absolute', right: '20px', top: '20px', bottom: '20px', width: '380px', 
      zIndex: 200, padding: '0', borderRadius: '16px', display: 'flex', flexDirection: 'column', 
      boxShadow: 'var(--glass-shadow)', border: '1px solid var(--border-color)',
      backgroundColor: 'var(--bg-color)',
      maxHeight: 'calc(100vh - 40px)' // Garante que não ultrapasse a tela
    }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <h3 style={{ fontSize: '1rem', color: '#10b981', margin: 0, fontWeight: 600 }}>✨ Tutor IA</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-secondary)' }}>×</button>
      </div>

      {/* Área de Mensagens (Scrollável) */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
        {messages.length === 0 && !isLoading && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px', fontSize: '0.9rem' }}>
            <p>Olá! Sou seu assistente de estudos.</p>
            <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>Use o laço para circular questões ou digite abaixo.</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} style={{ 
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '90%',
            padding: '10px 14px', borderRadius: '12px', fontSize: '0.9rem', lineHeight: '1.5',
            background: msg.role === 'user' ? 'var(--accent-color)' : (msg.role === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(0,0,0,0.05)'),
            color: msg.role === 'user' ? 'white' : (msg.role === 'error' ? '#ef4444' : 'var(--text-primary)'),
            border: msg.role === 'error' ? '1px solid #fecaca' : 'none'
          }}>
            {msg.hasImage && <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: 4 }}>📷 [Imagem Anexada]</div>}
            <LatexMessage text={msg.text} />
            {msg.isKeyError && (
               <button onClick={onOpenSettings} style={{ marginTop: '8px', padding: '4px 8px', background: 'white', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Configurar Agora</button>
            )}
          </div>
        ))}
        
        {isLoading && <div style={{ alignSelf: 'flex-start', color: 'var(--text-secondary)', fontSize: '0.8rem', paddingLeft: 10 }}>Digitando...</div>}
      </div>

      {/* Input (Fixo no rodapé) */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px', flexShrink: 0 }}>
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (handleSend(input), setInput(''))}
          placeholder="Pergunte algo..."
          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', outline: 'none' }}
        />
        <button onClick={() => { handleSend(input); setInput(''); }} style={{ padding: '10px', borderRadius: '8px', border: 'none', background: 'var(--accent-color)', color: 'white', cursor: 'pointer' }}>➤</button>
      </div>
    </div>
  );
};

export default AIPanel;