import React, { useState, useEffect } from 'react';

const SettingsModal = ({ isOpen, onClose, apiKey, setApiKey }) => {
  const [tempKey, setTempKey] = useState(apiKey);

  useEffect(() => {
    setTempKey(apiKey);
  }, [apiKey, isOpen]);

  const handleSave = () => {
    setApiKey(tempKey);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)'
    }} onClick={onClose}>
      <div 
        className="glass-panel" 
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: '24px', borderRadius: '16px', width: '90%', maxWidth: '400px',
          backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          border: '1px solid var(--border-color)'
        }}
      >
        <h2 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', fontWeight: 600 }}>Configurações</h2>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>
            Chave de API (Google Gemini)
          </label>
          <input 
            type="password" 
            value={tempKey}
            onChange={(e) => setTempKey(e.target.value)}
            placeholder="Cole sua API Key aqui..."
            style={{
              width: '100%', padding: '10px', borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--canvas-bg-color)', color: 'var(--text-primary)',
              outline: 'none', fontSize: '0.9rem'
            }}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.4' }}>
            Necessária para o Tutor IA. A chave é salva apenas no seu navegador.
            <br/>
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-color)' }}>Obter chave gratuita</a>
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button 
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)',
              background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              background: 'var(--accent-color)', color: 'white', cursor: 'pointer', fontWeight: 500
            }}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;