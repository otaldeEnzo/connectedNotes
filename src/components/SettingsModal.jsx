import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { validateKey } from '../services/AIService';
import { useNotes } from '../contexts/NotesContext';

const TABS = [
  { id: 'appearance', label: '🎨 Aparência' },
  { id: 'editor', label: '✏️ Editor' },
  { id: 'data', label: '💾 Dados' },
  { id: 'about', label: 'ℹ️ Sobre' },
];

const NOTE_TYPES = [
  { id: 'text', label: 'Texto' },
  { id: 'canvas', label: 'Canvas' },
  { id: 'code', label: 'Código' },
  { id: 'mermaid', label: 'Mermaid' },
  { id: 'mindmap', label: 'Mindmap' },
];

const SettingsIcons = {
  Gear: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  ),
  Save: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
      <polyline points="17 21 17 13 7 13 7 21"></polyline>
      <polyline points="7 3 7 8 15 8"></polyline>
    </svg>
  ),
  Trash: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  ),
  Book: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
    </svg>
  )
};

const GlassInput = ({ ...props }) => (
  <input
    {...props}
    style={{
      width: '100%', padding: '14px 18px', borderRadius: '14px',
      border: '1px solid rgba(255,255,255,0.15)',
      background: 'rgba(255,255,255,0.05)', color: 'inherit',
      outline: 'none', fontSize: '0.95rem',
      boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.1)',
      transition: 'all 0.2s ease',
      height: '50px',
      boxSizing: 'border-box',
      ...props.style
    }}
    onFocus={(e) => {
      e.target.style.borderColor = 'var(--accent-color)';
      e.target.style.boxShadow = 'inset 0 2px 10px rgba(0,0,0,0.15), 0 0 0 3px var(--accent-glow)';
      e.target.style.background = 'rgba(255,255,255,0.08)';
    }}
    onBlur={(e) => {
      e.target.style.borderColor = 'rgba(255,255,255,0.15)';
      e.target.style.boxShadow = 'inset 0 2px 10px rgba(0,0,0,0.1)';
      e.target.style.background = 'rgba(255,255,255,0.05)';
    }}
  />
);

const GlassToggle = ({ checked, onChange, label, sublabel }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{label}</span>
      {sublabel && <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{sublabel}</span>}
    </div>
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: '42px', height: '22px', borderRadius: '11px',
        background: checked ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        position: 'relative', cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow: checked ? '0 0 12px var(--accent-glow)' : 'inset 0 2px 4px rgba(0,0,0,0.2)'
      }}
    >
      <div style={{
        position: 'absolute', top: '2px',
        left: checked ? '22px' : '2px',
        width: '16px', height: '16px', borderRadius: '50%',
        background: '#ffffff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }} />
    </div>
  </div>
);

const GlassSlider = ({ value, min, max, onChange, label, unit }) => (
  <div style={{ padding: '4px 0' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-color)' }}>{value}{unit}</span>
    </div>
    <input
      type="range" min={min} max={max} value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      style={{
        width: '100%', height: '6px', borderRadius: '3px',
        background: 'rgba(0,0,0,0.3)', appearance: 'none',
        outline: 'none', cursor: 'pointer',
      }}
      className="custom-glass-slider"
    />
    <style>{`
      .custom-glass-slider::-webkit-slider-thumb {
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--accent-color);
        border: 2px solid white;
        box-shadow: 0 0 10px var(--accent-glow);
        cursor: pointer;
        transition: transform 0.1s;
      }
      .custom-glass-slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
    `}</style>
  </div>
);

const GlassSelect = ({ value, options, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [rect, setRect] = useState(null);

  const updateRect = () => {
    if (containerRef.current) {
      setRect(containerRef.current.getBoundingClientRect());
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateRect();
      window.addEventListener('scroll', updateRect, true);
      window.addEventListener('resize', updateRect);
    }
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [isOpen]);

  const selectedOption = options.find(o => o.id === value) || options[0];

  // Usando um portal "simulado" com position fixed para garantir que o blur funcione (separado do stacking context do modal)
  const dropdown = isOpen && rect && (
    <div
      className="glass-extreme"
      style={{
        position: 'fixed', 
        top: `${rect.bottom + 8}px`, 
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        zIndex: 100000, 
        borderRadius: '14px',
        padding: '6px', 
        overflow: 'hidden', 
        animation: 'slideDown 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        background: 'var(--glass-bg-floating)',
        backdropFilter: 'blur(32px) saturate(180%) brightness(1.2)',
        WebkitBackdropFilter: 'blur(32px) saturate(180%) brightness(1.2)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: 'var(--glass-shadow), 0 20px 40px rgba(0,0,0,0.4)',
        pointerEvents: 'auto'
      }}
    >
      {options.map(opt => (
        <div
          key={opt.id}
          onClick={() => { onChange(opt.id); setIsOpen(false); }}
          className="liquid-item"
          style={{
            padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
            fontSize: '0.9rem', color: value === opt.id ? 'var(--accent-color)' : 'var(--text-primary)',
            background: value === opt.id ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
            fontWeight: value === opt.id ? 700 : 500,
            display: 'flex', alignItems: 'center', gap: '10px'
          }}
          onMouseEnter={(e) => { 
            if (value !== opt.id) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; 
              e.currentTarget.style.transform = 'translateX(4px)';
            }
          }}
          onMouseLeave={(e) => { 
            if (value !== opt.id) {
              e.currentTarget.style.background = 'transparent'; 
              e.currentTarget.style.transform = 'translateX(0)';
            }
          }}
        >
          {value === opt.id && <span style={{ width: '4px', height: '14px', background: 'var(--accent-color)', borderRadius: '2px' }} />}
          {opt.label}
        </div>
      ))}
    </div>
  );

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', pointerEvents: 'auto' }}>
      {label && <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.5px' }}>{label}</label>}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%', height: '50px', padding: '0 18px', borderRadius: '14px',
          border: '1px solid rgba(255,255,255,0.15)',
          background: 'rgba(255,255,255,0.05)', color: 'inherit',
          fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', boxSizing: 'border-box', transition: 'all 0.3s ease',
          boxShadow: isOpen ? '0 0 0 3px var(--accent-glow)' : 'inset 0 2px 10px rgba(0,0,0,0.1)',
        }}
      >
        <span style={{ fontWeight: 500 }}>{selectedOption?.label || ''}</span>
        <span style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s', opacity: 0.5 }}>▼</span>
      </div>

      {/* Renderizado no body via Portal para ser imune ao transform do Modal e resolver Scroll Offset */}
      {isOpen && rect && createPortal(dropdown, document.body)}
    </div>
  );
};

const SettingsModal = ({ isOpen, onClose, apiKey, setApiKey, currentTheme, setTheme, customThemes, setCustomThemes, appearance, setAppearance }) => {
  const { notes } = useNotes();

  const [activeTab, setActiveTab] = useState('appearance');
  const [status, setStatus] = useState('');
  const [editingTheme, setEditingTheme] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef(null);

  const getSavedAppearance = () => {
    const saved = localStorage.getItem('connected-notes-appearance-settings');
    return saved ? JSON.parse(saved) : {
      fontSize: 14,
      accentColor: '#6366f1',
      sidebarWidth: 260,
      animationsEnabled: true,
      backgroundGradient: true,
    };
  };

  const getSavedEditor = () => {
    const saved = localStorage.getItem('connected-notes-editor-settings');
    return saved ? JSON.parse(saved) : {
      defaultNoteType: 'text',
      spellCheck: true,
      showLineNumbers: true,
      tabSize: 2,
    };
  };

  const [tempKey, setTempKey] = useState(apiKey);
  const [tempTheme, setTempTheme] = useState(currentTheme);
  const [tempAppearance, setTempAppearance] = useState(appearance);
  const [tempEditor, setTempEditor] = useState(getSavedEditor);

  const DEFAULT_APPEARANCE = {
    fontSize: 14,
    accentColor: '#6366f1',
    sidebarWidth: 260,
    animationsEnabled: true,
    backgroundGradient: true,
  };

  const DEFAULT_EDITOR = {
    defaultNoteType: 'text',
    spellCheck: true,
    showLineNumbers: true,
    tabSize: 2,
  };

  useEffect(() => {
    if (isOpen) {
      setTempKey(apiKey);
      setTempTheme(currentTheme);
      setTempAppearance(getSavedAppearance());
      setTempEditor(getSavedEditor());
      setStatus('');
      setEditingTheme(null);
      setIsCreating(false);
      setShowClearConfirm(false);
    }
  }, [isOpen, apiKey, currentTheme]);

  const applySettings = (appearance) => {
    document.documentElement.style.setProperty('--base-font-size', `${appearance.fontSize}px`);
    document.documentElement.style.setProperty('--sidebar-width', `${appearance.sidebarWidth}px`);
    document.documentElement.style.setProperty('--animation-duration', appearance.animationsEnabled ? '0.2s' : '0s');

    if (appearance.backgroundGradient) {
      document.body.classList.add('gradient-enabled');
    } else {
      document.body.classList.remove('gradient-enabled');
    }

    const isCustom = !['light', 'dark', 'nord', 'gruvbox', 'dracula', 'midnight'].includes(currentTheme);
    if (!isCustom) {
      document.documentElement.style.setProperty('--accent-color', appearance.accentColor);
      document.documentElement.style.setProperty('--accent-glow', `${appearance.accentColor}80`);
    }
  };

  useEffect(() => {
    applySettings(getSavedAppearance());
  }, []);

  // Effect for Live Preview
  useEffect(() => {
    if (isOpen) {
      applySettings(tempAppearance);
      if (setAppearance) setAppearance(tempAppearance);
    }
  }, [tempAppearance, isOpen]);

  const updateTempAppearance = (key, value) => {
    setTempAppearance(prev => ({ ...prev, [key]: value }));
  };

  const updateTempEditor = (key, value) => {
    setTempEditor(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    setApiKey(tempKey);
    setTheme(tempTheme);
    setAppearance(tempAppearance);
    localStorage.setItem('connected-notes-appearance-settings', JSON.stringify(tempAppearance));
    applySettings(tempAppearance);
    localStorage.setItem('connected-notes-editor-settings', JSON.stringify(tempEditor));
    onClose();
  };

  const resetAllSettings = () => {
    setTempAppearance(DEFAULT_APPEARANCE);
    setTempEditor(DEFAULT_EDITOR);
    setTempKey('');
    setTempTheme('dark');
  };

  const handleVerify = async () => {
    setStatus('Verificando...');
    try {
      const models = await validateKey(tempKey);
      const modelNames = models.map(m => m.name.replace('models/', '')).join(', ');
      const hasModel = modelNames.includes('gemini-2.0-flash') || modelNames.includes('gemini-1.5-flash');

      if (hasModel) {
        setStatus(`✅ Sucesso! Modelos disponíveis.`);
      } else {
        setStatus('⚠️ Chave válida, mas sem acesso ao Flash.');
      }
    } catch (e) {
      setStatus('❌ Erro: ' + e.message);
    }
  };

  const standardThemes = [
    { id: 'light', name: 'Claro', bg: '#f8fafc', accent: '#6366f1' },
    { id: 'dark', name: 'Escuro', bg: '#0f172a', accent: '#818cf8' },
    { id: 'nord', name: 'Nord', bg: '#2e3440', accent: '#88c0d0' },
    { id: 'gruvbox', name: 'Gruvbox', bg: '#282828', accent: '#fe8019' },
    { id: 'dracula', name: 'Dracula', bg: '#282a36', accent: '#ff79c6' },
    { id: 'midnight', name: 'Midnight', bg: '#000000', accent: '#3b82f6' }
  ];

  const handleEditTheme = (theme) => {
    setEditingTheme({ ...theme });
    setIsCreating(false);
    setTempTheme(theme.id);
  };

  const handleCreateTheme = () => {
    const newId = `custom-${Date.now()}`;
    const newTheme = {
      id: newId,
      name: 'Novo Tema',
      colors: { bg: '#202020ff', text: '#ffffffff', accent: '#ff0055ff' }
    };
    setEditingTheme(newTheme);
    setIsCreating(true);
    setCustomThemes([...customThemes, newTheme]);
    setTempTheme(newId);
  };

  const handleSaveTheme = () => {
    setCustomThemes(prev => prev.map(t => t.id === editingTheme.id ? editingTheme : t));
    setEditingTheme(null);
    setIsCreating(false);
  };

  const handleDeleteTheme = (id) => {
    setCustomThemes(prev => prev.filter(t => t.id !== id));
    if (currentTheme === id) setTheme('light');
    setEditingTheme(null);
  };

  const updateEditingColor = (key, value) => {
    setEditingTheme(prev => ({
      ...prev,
      colors: { ...prev.colors, [key]: value }
    }));
    setCustomThemes(prev => prev.map(t => t.id === editingTheme.id ? { ...editingTheme, colors: { ...editingTheme.colors, [key]: value } } : t));
  };

  const updateEditingName = (name) => {
    setEditingTheme(prev => ({ ...prev, name }));
    setCustomThemes(prev => prev.map(t => t.id === editingTheme.id ? { ...editingTheme, name } : t));
  };

  const handleExport = () => {
    const data = JSON.stringify(notes, null, 2);
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `backup-${dateStr}.connected`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data && typeof data === 'object' && data['root']) {
          localStorage.setItem('connected-notes-data', JSON.stringify(data));
          alert('Notas importadas com sucesso! Recarregando aplicação...');
          window.location.reload();
        } else {
          alert('Erro: O arquivo não parece ser um backup válido do Connected Notes.');
        }
      } catch (err) {
        alert('Erro ao importar: arquivo corrompido ou formato inválido.');
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
    localStorage.removeItem('connected-notes-data');
    localStorage.removeItem('connected-notes-tabs');
    alert('Dados apagados! Recarregando...');
    window.location.reload();
  };

  if (!isOpen) return null;

  const renderAppearance = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-extreme" style={{ padding: '1.5rem', borderRadius: '1.5rem', background: 'var(--glass-bg)' }}>
        <label style={{ display: 'block', marginBottom: '12px', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.5px' }}>
          CHAVE DE API (GOOGLE GEMINI)
        </label>
        <GlassInput
          type="password"
          value={tempKey}
          onChange={(e) => setTempKey(e.target.value)}
          placeholder="AI Key..."
        />
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--accent-color)', textDecoration: 'none' }}>Obter chave gratuita ↗</a>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{status}</span>
            <button
              onClick={handleVerify}
              className="liquid-button"
              style={{
                height: '40px', padding: '0 20px', fontSize: '0.85rem', fontWeight: 600,
                background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '10px',
                boxShadow: '0 4px 15px var(--accent-glow)'
              }}
            >
              Verificar
            </button>
          </div>
        </div>
      </div>

      <div className="glass-extreme" style={{ padding: '1.5rem', borderRadius: '1.5rem', background: 'var(--glass-bg)' }}>
        <label style={{ display: 'block', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.5px' }}>TEMAS PADRÃO</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
          {standardThemes.map(theme => (
            <button
              key={theme.id}
              onClick={() => { setTheme(theme.id); setTempTheme(theme.id); setEditingTheme(null); }}
              className="liquid-button"
              style={{
                padding: '10px', cursor: 'pointer',
                background: theme.bg, color: theme.id === 'light' ? '#0f172a' : '#f8fafc',
                border: tempTheme === theme.id ? `2px solid var(--accent-color)` : '1px solid rgba(255,255,255,0.05)',
                borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center',
                boxShadow: tempTheme === theme.id ? `0 0 20px ${theme.accent}60` : '0 4px 12px rgba(0,0,0,0.2)',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transform: tempTheme === theme.id ? 'scale(1.05)' : 'scale(1)'
              }}
            >
              <div style={{ width: '100%', height: '8px', background: theme.accent, borderRadius: '4px', marginBottom: '8px', boxShadow: `0 0 8px ${theme.accent}40` }}></div>
              <span style={{ fontSize: '0.75rem', fontWeight: tempTheme === theme.id ? 700 : 500 }}>{theme.name}</span>
            </button>
          ))}
        </div>

        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '0.85rem', fontWeight: 600 }}>
          <span>MEUS TEMAS</span>
          <button onClick={handleCreateTheme} className="liquid-button" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer', padding: '4px 10px', fontSize: '0.7rem', color: 'var(--text-primary)' }}>
            + Criar novo
          </button>
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {customThemes.map(theme => (
            <div key={theme.id} style={{ position: 'relative' }}>
              <button
                onClick={() => { setTheme(theme.id); setTempTheme(theme.id); setEditingTheme(null); }}
                className="liquid-button"
                style={{
                  width: '100%', padding: '10px', cursor: 'pointer',
                  background: theme.colors.bg, color: theme.colors.text,
                  border: tempTheme === theme.id ? `2px solid var(--accent-color)` : '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center',
                  boxShadow: tempTheme === theme.id ? `0 0 20px ${theme.colors.accent}60` : '0 4px 12px rgba(0,0,0,0.2)',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transform: tempTheme === theme.id ? 'scale(1.05)' : 'scale(1)'
                }}
              >
                <div style={{ width: '100%', height: '8px', background: theme.colors.accent, borderRadius: '4px', marginBottom: '8px' }}></div>
                <span style={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{theme.name}</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleEditTheme(theme); }}
                style={{ position: 'absolute', top: '-4px', right: '-4px', width: '22px', height: '22px', borderRadius: '50%', background: 'var(--bg-color)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}
              >
                ✏️
              </button>
            </div>
          ))}
        </div>

        {editingTheme && (
          <div style={{ marginTop: '16px', padding: '12px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Editando Tema</span>
              <button onClick={() => setEditingTheme(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'white' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <GlassInput type="text" value={editingTheme.name} onChange={(e) => updateEditingName(e.target.value)} placeholder="Nome do Tema" />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '0.85rem' }}>Fundo (ARGB)</span><input type="color" value={editingTheme.colors.bg.substring(0, 7)} onChange={(e) => updateEditingColor('bg', e.target.value + (editingTheme.colors.bg.substring(7) || 'ff'))} style={{ width: '28px', height: '28px', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '50%', cursor: 'pointer', background: 'transparent' }} /></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="range" min="0" max="255" value={parseInt(editingTheme.colors.bg.substring(7) || 'ff', 16)} onChange={(e) => {
                  const alpha = parseInt(e.target.value).toString(16).padStart(2, '0');
                  updateEditingColor('bg', editingTheme.colors.bg.substring(0, 7) + alpha);
                }} style={{ flex: 1 }} />
                <span style={{ fontSize: '0.7rem', width: '30px', opacity: 0.6 }}>{Math.round(parseInt(editingTheme.colors.bg.substring(7) || 'ff', 16) / 2.55)}%</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}><span style={{ fontSize: '0.85rem' }}>Texto (ARGB)</span><input type="color" value={editingTheme.colors.text.substring(0, 7)} onChange={(e) => updateEditingColor('text', e.target.value + (editingTheme.colors.text.substring(7) || 'ff'))} style={{ width: '28px', height: '28px', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '50%', cursor: 'pointer', background: 'transparent' }} /></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="range" min="0" max="255" value={parseInt(editingTheme.colors.text.substring(7) || 'ff', 16)} onChange={(e) => {
                  const alpha = parseInt(e.target.value).toString(16).padStart(2, '0');
                  updateEditingColor('text', editingTheme.colors.text.substring(0, 7) + alpha);
                }} style={{ flex: 1 }} />
                <span style={{ fontSize: '0.7rem', width: '30px', opacity: 0.6 }}>{Math.round(parseInt(editingTheme.colors.text.substring(7) || 'ff', 16) / 2.55)}%</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}><span style={{ fontSize: '0.85rem' }}>Destaque (ARGB)</span><input type="color" value={editingTheme.colors.accent.substring(0, 7)} onChange={(e) => updateEditingColor('accent', e.target.value + (editingTheme.colors.accent.substring(7) || 'ff'))} style={{ width: '28px', height: '28px', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '50%', cursor: 'pointer', background: 'transparent' }} /></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="range" min="0" max="255" value={parseInt(editingTheme.colors.accent.substring(7) || 'ff', 16)} onChange={(e) => {
                  const alpha = parseInt(e.target.value).toString(16).padStart(2, '0');
                  updateEditingColor('accent', editingTheme.colors.accent.substring(0, 7) + alpha);
                }} style={{ flex: 1 }} />
                <span style={{ fontSize: '0.7rem', width: '30px', opacity: 0.6 }}>{Math.round(parseInt(editingTheme.colors.accent.substring(7) || 'ff', 16) / 2.55)}%</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button onClick={handleSaveTheme} className="liquid-button" style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: 'var(--accent-color)', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Salvar</button>
                <button onClick={() => handleDeleteTheme(editingTheme.id)} className="liquid-button" style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>Excluir</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="glass-extreme" style={{ padding: '1.5rem', borderRadius: '1.5rem', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--glass-bg)' }}>
        <GlassSlider
          label="Tamanho da Fonte" unit="px"
          min={12} max={18} value={tempAppearance.fontSize}
          onChange={(v) => updateTempAppearance('fontSize', v)}
        />
        <GlassSlider
          label="Largura da Sidebar" unit="px"
          min={200} max={400} value={tempAppearance.sidebarWidth}
          onChange={(v) => updateTempAppearance('sidebarWidth', v)}
        />

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />

        <GlassToggle
          label="Animações Fluídas" sublabel="Transições e micro-interações"
          checked={tempAppearance.animationsEnabled}
          onChange={(v) => updateTempAppearance('animationsEnabled', v)}
        />
        <GlassToggle
          label="Gradiente de Fundo" sublabel="Efeito profundo nas notas"
          checked={tempAppearance.backgroundGradient}
          onChange={(v) => updateTempAppearance('backgroundGradient', v)}
        />
      </div>
    </div>
  );

  const renderEditor = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-extreme" style={{ padding: '1.5rem', borderRadius: '1.5rem', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--glass-bg)' }}>
        <GlassSelect
          label="TIPO DE NOTA PADRÃO"
          options={NOTE_TYPES}
          value={tempEditor.defaultNoteType}
          onChange={(v) => updateTempEditor('defaultNoteType', v)}
        />

        <GlassToggle
          label="Corretor Ortográfico" sublabel="Verificação em tempo real"
          checked={tempEditor.spellCheck}
          onChange={(v) => updateTempEditor('spellCheck', v)}
        />
      </div>

      <div className="glass-extreme" style={{ padding: '1.5rem', borderRadius: '1.5rem', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--glass-bg)' }}>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.5px' }}>EDITOR DE CÓDIGO</label>

        <GlassToggle
          label="Números de Linha"
          checked={tempEditor.showLineNumbers}
          onChange={(v) => updateTempEditor('showLineNumbers', v)}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Tamanho do Tab</span>
          <div style={{ width: '130px' }}>
            <GlassSelect
              options={[{ id: 2, label: '2 espaços' }, { id: 4, label: '4 espaços' }]}
              value={tempEditor.tabSize}
              onChange={(v) => updateTempEditor('tabSize', v)}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderData = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-extreme" style={{ padding: '1.5rem', borderRadius: '1.5rem', background: 'var(--glass-bg)' }}>
        <label style={{ display: 'block', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.5px' }}>BACKUP E SINCRONIZAÇÃO</label>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={handleExport}
            className="liquid-button"
            style={{
              padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
              color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
              boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)'
            }}
          >
            Exportar .connected
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="liquid-button"
            style={{
              padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500
            }}
          >
            Importar Backup
          </button>
          <input ref={fileInputRef} type="file" accept=".connected,.json" style={{ display: 'none' }} onChange={handleImport} />
        </div>
      </div>

      <div className="glass-extreme" style={{ padding: '1.5rem', borderRadius: '1.5rem', background: 'var(--glass-bg)' }}>
        <label style={{ display: 'block', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.5px', color: '#fda4af' }}>ZONA DE PERIGO</label>
        {!showClearConfirm ? (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="liquid-button"
            style={{
              width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)',
              background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', cursor: 'pointer', fontSize: '0.85rem',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => { e.target.style.background = 'rgba(239, 68, 68, 0.2)'; e.target.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.2)'; }}
            onMouseLeave={(e) => { e.target.style.background = 'rgba(239, 68, 68, 0.1)'; e.target.style.boxShadow = 'none'; }}
          >
            Apagar todos os dados locais
          </button>
        ) : (
          <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', animation: 'fadeIn 0.3s ease' }}>
            <p style={{ fontSize: '0.85rem', marginBottom: '16px', color: '#fecaca', fontWeight: 500 }}>Isso apagará permanentemente todas as suas notas. Deseja continuar?</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleClearData} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Sim, apagar tudo</button>
              <button onClick={() => setShowClearConfirm(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', fontSize: '0.8rem' }}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderAbout = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px' }}>
      <div style={{
        width: '80px', height: '80px', borderRadius: '24px',
        background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 10px 30px rgba(139, 92, 246, 0.4)',
        border: '1px solid rgba(255,255,255,0.2)',
        color: 'white'
      }}>
        <SettingsIcons.Book />
      </div>
      <div>
        <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.5px' }}>Connected Notes</h2>
        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, opacity: 0.7 }}>v0.2.0 BETA</p>
      </div>

      <p style={{ fontSize: '0.9rem', color: '#e2e8f0', maxWidth: '300px', lineHeight: 1.6 }}>
        Ecossistema moderno para pensamentos conectados, gráficos GeoGebra e diagramas infinitos.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
        {['React', 'dnd-kit', 'GeoGebra', 'Mermaid', 'Glass UI'].map(tech => (
          <span key={tech} className="glass-extreme" style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600, color: 'var(--accent-color)' }}>{tech}</span>
        ))}
      </div>

      <div style={{ marginTop: '12px', display: 'flex', gap: '24px' }}>
        <a href="#" style={{ color: '#ffffff', opacity: 0.6, fontSize: '0.85rem', textDecoration: 'none', fontWeight: 500 }}>GitHub</a>
        <a href="#" style={{ color: '#ffffff', opacity: 0.6, fontSize: '0.85rem', textDecoration: 'none', fontWeight: 500 }}>Docs</a>
        <a href="#" style={{ color: '#ffffff', opacity: 0.6, fontSize: '0.85rem', textDecoration: 'none', fontWeight: 500 }}>Feedback</a>
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 3000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(60px) saturate(180%) brightness(0.8)',
      WebkitBackdropFilter: 'blur(60px) saturate(180%) brightness(0.8)',
      animation: 'fadeIn 0.3s ease'
    }} onClick={onClose}>
      <div
        className="glass-extreme settings-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: '0', borderRadius: '32px', width: '92%', maxWidth: '520px',
          color: 'var(--text-primary)',
          maxHeight: '88vh', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)',
          background: 'var(--glass-bg-floating)',
          boxShadow: 'var(--glass-shadow), 0 30px 80px rgba(0,0,0,0.5)',
          animation: 'modalScale 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        <style>{`
          @keyframes modalScale {
            from { opacity: 0; transform: scale(0.9) translateY(20px); filter: blur(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>

        {/* Header */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              padding: '8px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)', color: 'var(--accent-color)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2)'
            }}>
              <SettingsIcons.Gear />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.5px' }}>Configurações</h2>
          </div>
          <button onClick={onClose} className="liquid-button" style={{ background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Tabs */}
        <div 
          className="settings-tabs-container"
          style={{ display: 'flex', padding: '0 12px', background: 'rgba(0,0,0,0.1)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="settings-tab-btn"
                style={{
                  flex: 1, padding: '16px 4px', border: 'none', background: 'transparent',
                  cursor: 'pointer', fontSize: '0.8rem', fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#ffffff' : 'rgba(255,255,255,0.4)',
                  position: 'relative',
                  transition: 'all 0.3s ease'
                }}
              >
                {tab.label}
                {isActive && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: '20%', right: '20%',
                    height: '3px', background: 'linear-gradient(90deg, #8b5cf6, #d946ef)',
                    borderRadius: '3px 3px 0 0',
                    boxShadow: '0 -2px 10px rgba(139, 92, 246, 0.8)'
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ padding: '28px', overflowY: 'auto', flex: 1 }} className="custom-scrollbar">
          {activeTab === 'appearance' && renderAppearance()}
          {activeTab === 'editor' && renderEditor()}
          {activeTab === 'data' && renderData()}
          {activeTab === 'about' && renderAbout()}
        </div>

        {/* Footer */}
        <div style={{ padding: '20px 28px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.1)' }}>
          <button
            onClick={resetAllSettings}
            className="liquid-button"
            style={{
              height: '48px', padding: '0 24px', borderRadius: '14px', border: '1px solid rgba(239, 68, 68, 0.4)',
              background: 'rgba(239, 68, 68, 0.05)', color: '#fca5a5', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600
            }}
          >
            Resetar
          </button>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              className="liquid-button"
              style={{
                height: '48px', padding: '0 24px', borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="liquid-button"
              style={{
                height: '48px', padding: '0 32px', borderRadius: '14px', border: 'none',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
                color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                boxShadow: '0 8px 20px rgba(139, 92, 246, 0.4)'
              }}
            >
              Salvar alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;