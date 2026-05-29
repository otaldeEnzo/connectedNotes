import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { validateKey } from '../services/AIService';
import { useNotes } from '../contexts/NotesContext';
import { StorageService } from '../services/StorageService';
import { useCanvasStore } from '../store/useCanvasStore';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, updateFirebaseConfig, getFirebaseConfig, isCustomFirebaseActive } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';

const TABS = [
  { id: 'appearance', label: '🎨 Aparência' },
  { id: 'editor', label: '✏️ Editor' },
  { id: 'storage', label: '📦 Armazenamento' },
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

const CLOUD_PROVIDERS = [
  { id: 'firebase', label: '🔥 Firebase Cloud (Ativo)' },
  { id: 'custom_server', label: '🖥️ Servidor Próprio (Self-Hosted)' },
  { id: 'supabase', label: '⚡ Supabase (Planejado)' },
  { id: 'couchdb', label: ' CouchDB (Planejado)' },
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
        background: checked ? 'var(--accent-color, #ec4899)' : 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.1)',
        position: 'relative', cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow: checked ? '0 0 12px var(--accent-glow, rgba(139, 92, 246, 0.4))' : 'inset 0 2px 4px rgba(0,0,0,0.2)'
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
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(event.target))
      ) {
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
      ref={dropdownRef}
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

      {/* Portal render */}
      {typeof document !== 'undefined' && createPortal(dropdown, document.body)}
    </div>
  );
};

const withTimeout = (promise, ms, errorMsg) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(errorMsg)), ms);
    promise.then(
      (res) => { clearTimeout(timer); resolve(res); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
};

const SettingsModal = ({ isOpen, onClose, apiKey, setApiKey, currentTheme, setTheme, customThemes, setCustomThemes, appearance, setAppearance }) => {
  const { notes } = useNotes();

  const strokeSmoothing = useCanvasStore(state => state.strokeSmoothing);
  const setStrokeSmoothing = useCanvasStore(state => state.setStrokeSmoothing);
  const strokeSmoothingEnabled = useCanvasStore(state => state.strokeSmoothingEnabled);
  const setStrokeSmoothingEnabled = useCanvasStore(state => state.setStrokeSmoothingEnabled);

  const [activeTab, setActiveTab] = useState('appearance');
  const [status, setStatus] = useState('');
  const [editingTheme, setEditingTheme] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef(null);

  const [storageProviders, setStorageProviders] = useState({ indexeddb: true, local_vault: false, firebase: false });
  const [selectedCloudProvider, setSelectedCloudProvider] = useState(() => {
    return localStorage.getItem('selected-cloud-provider') || 'firebase';
  });
  const [customServerUrl, setCustomServerUrl] = useState(() => {
    return localStorage.getItem('connected-notes-server-url') || '';
  });
  const [customServerToken, setCustomServerToken] = useState(() => {
    return localStorage.getItem('connected-notes-server-token') || '';
  });
  const [vaultPath, setVaultPath] = useState(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authUser, setAuthUser] = useState(null);
  const [authStatus, setAuthStatus] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState('');
  const [showGoogleHelp, setShowGoogleHelp] = useState(false);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [customFirebaseConfigText, setCustomFirebaseConfigText] = useState(() => {
    return localStorage.getItem('connected-notes-custom-firebase-config') || '';
  });

  const [activeAuth, setActiveAuth] = useState(auth);

  // Escuta as mudanças globais de configuração do Firebase
  useEffect(() => {
    const handleConfigChange = (e) => {
      setActiveAuth(e.detail.auth);
    };
    window.addEventListener('firebase-config-changed', handleConfigChange);
    return () => window.removeEventListener('firebase-config-changed', handleConfigChange);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(activeAuth, async (user) => {
      setAuthUser(user);

      // Se estiver conectado em um Firebase personalizado, puxa e aplica as preferências automaticamente
      if (user && isCustomFirebaseActive()) {
        try {
          const prefRef = doc(db, 'users', user.uid, 'config', 'preferences');
          const prefSnap = await getDoc(prefRef);
          if (prefSnap.exists()) {
            const data = prefSnap.data();
            if (data.appearance) {
              localStorage.setItem('connected-notes-appearance-settings', JSON.stringify(data.appearance));
              setTempAppearance(data.appearance);
              if (setAppearance) setAppearance(data.appearance);
              applySettings(data.appearance);
            }
            if (data.editor) {
              localStorage.setItem('connected-notes-editor-settings', JSON.stringify(data.editor));
              setTempEditor(data.editor);
            }
            if (data.theme) {
              setTheme(data.theme);
              setTempTheme(data.theme);
            }
          }
        } catch (err) {
          console.warn("Aviso ao puxar preferências da nuvem:", err);
        }
      }
    });
    return () => unsub();
  }, [activeAuth]);

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
    const defaultSettings = { defaultNoteType: 'canvas', spellCheck: true, showLineNumbers: true, tabSize: 2 };
    try {
      const saved = localStorage.getItem('connected-notes-editor-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return { ...defaultSettings, ...parsed };
        }
      }
      return defaultSettings;
    } catch (e) {
      return defaultSettings;
    }
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
      setShowGoogleHelp(false);
      setCustomFirebaseConfigText(localStorage.getItem('connected-notes-custom-firebase-config') || '');
      
      // Carrega configurações de armazenamento
      setStorageProviders(StorageService.getActiveProviders());
      setVaultPath(StorageService.getVaultPath());
      setAuthStatus('');
      setMigrationStatus('');
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
    localStorage.setItem('connected-notes-editor-settings', JSON.stringify(tempEditor));
    applySettings(tempAppearance);
    
    // Sincroniza preferências na nuvem do usuário se estiver logado
    if (auth.currentUser && isCustomFirebaseActive()) {
      try {
        const prefRef = doc(db, 'users', auth.currentUser.uid, 'config', 'preferences');
        setDoc(prefRef, {
          appearance: tempAppearance,
          editor: tempEditor,
          theme: tempTheme
        });
      } catch (err) {
        console.warn("Aviso ao salvar preferências na nuvem:", err);
      }
    }

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

  const handleToggleProvider = async (providerName, currentIsActive) => {
    const newIsActive = !currentIsActive;

    // Garante que pelo menos um local de armazenamento deve estar ativo
    const activeCount = Object.values(storageProviders).filter(Boolean).length;
    if (!newIsActive && activeCount <= 1) {
      setAuthStatus('⚠️ Pelo menos um local de armazenamento deve estar ativo.');
      return;
    }



    try {
      setAuthStatus('Alterando armazenamento...');
      const success = await StorageService.setProviderActive(providerName, newIsActive);
      if (success) {
        const updatedProviders = { ...storageProviders, [providerName]: newIsActive };
        setStorageProviders(updatedProviders);
        setVaultPath(StorageService.getVaultPath());
        setAuthStatus('');
      } else {
        setAuthStatus('❌ Seleção de pasta cancelada ou não suportada pelo navegador.');
      }
    } catch (err) {
      setAuthStatus('❌ Erro: ' + err.message);
    }
  };

  const handleFirebaseLogin = async (e) => {
    e.preventDefault();
    setAuthStatus('Conectando...');
    try {
      await signInWithEmailAndPassword(auth, authEmail, authPassword);
      setAuthStatus('✅ Conectado com sucesso!');
      await StorageService.setProviderActive('firebase', true);
      setStorageProviders(prev => ({ ...prev, firebase: true }));
    } catch (err) {
      setAuthStatus('❌ Erro no login: ' + err.message);
    }
  };

  const handleFirebaseSignup = async (e) => {
    e.preventDefault();
    setAuthStatus('Criando conta...');
    try {
      await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      setAuthStatus('✅ Conta criada com sucesso!');
      await StorageService.setProviderActive('firebase', true);
      setStorageProviders(prev => ({ ...prev, firebase: true }));
    } catch (err) {
      setAuthStatus('❌ Erro no cadastro: ' + err.message);
    }
  };

  const handleFirebaseLogout = async () => {
    setAuthStatus('Desconectando...');
    try {
      await signOut(auth);
      // Redefine para o Auth Router central ao deslogar
      updateFirebaseConfig(null);
      setCustomFirebaseConfigText('');
      setAuthStatus('Desconectado. Retornado ao Roteador de Autenticação padrão.');
      await StorageService.setProviderActive('firebase', false);
      setStorageProviders(StorageService.getActiveProviders());
    } catch (err) {
      setAuthStatus('❌ Erro ao desconectar: ' + err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthStatus('Conectando ao Google...');
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      // Se o Firebase ativo no momento for o ROTEADOR padrão (ou seja, isCustomFirebaseActive() é falso)
      if (!isCustomFirebaseActive()) {
        setAuthStatus('Buscando servidor privado do usuário...');
        const docRef = doc(db, 'user_routers', user.uid);
        const docSnap = await withTimeout(
          getDoc(docRef),
          8000,
          'Tempo limite esgotado ao buscar do banco do Roteador Central. Certifique-se de que o "Firestore Database" foi criado e ativado no console do seu Firebase central (.env)!'
        );

        if (docSnap.exists()) {
          const config = docSnap.data();
          setAuthStatus('Servidor privado encontrado! Conectando...');
          
          // Desloga do Roteador Central com segurança ANTES de alterar a config
          await signOut(auth);

          // Desconecta do Roteador central e inicializa o Firebase Privado do usuário (Dispara o evento in-memory)
          updateFirebaseConfig(config);
          
          // Preenche a caixa de texto
          setCustomFirebaseConfigText(JSON.stringify(config, null, 2));
          
          // Como o clique inicial do usuário ainda está na pilha de execução,
          // podemos chamar a autenticação do servidor privado imediatamente sem que o popup seja bloqueado!
          setAuthStatus('Autenticando no seu servidor privado...');
          const privateCredential = await signInWithPopup(auth, provider);
          setAuthUser(privateCredential.user);

          setAuthStatus('✅ Conectado com sucesso ao seu servidor privado!');
          await StorageService.setProviderActive('firebase', true);
          setStorageProviders(prev => ({ ...prev, firebase: true }));
          return;
        } else {
          // Não tem configuração ainda! É uma conta nova.
          setAuthStatus('Conectado com sucesso! Nenhuma chave do seu servidor privado foi detectada. Por favor, cole a configuração do seu Firebase abaixo para concluir o registro.');
          setShowConfigForm(true);
          return;
        }
      }

      setAuthStatus('✅ Conectado com o Google com sucesso! Sincronizando notas...');
      await StorageService.setProviderActive('firebase', true);
      setStorageProviders(prev => ({ ...prev, firebase: true }));
    } catch (err) {
      setAuthStatus('❌ Erro no login com Google: ' + err.message);
    }
  };

  const handleSaveCustomFirebaseConfig = async (e) => {
    if (e) e.preventDefault();
    setAuthStatus('Atualizando chaves do Firebase...');
    try {
      if (!customFirebaseConfigText.trim()) {
        // Redefinir para o padrão
        updateFirebaseConfig(null);
        setAuthStatus('✅ Firebase redefinido para as chaves padrão do sistema!');
        return;
      }

      // Analisa o texto colado
      let cleanText = customFirebaseConfigText.trim();
      
      // Limpeza de declarações como "const firebaseConfig = " ou semelhantes
      cleanText = cleanText.replace(/^(const|let|var)\s+\w+\s*=\s*/, '');
      if (cleanText.endsWith(';')) {
        cleanText = cleanText.slice(0, -1);
      }
      
      if (!cleanText.startsWith('{')) {
        throw new Error('O formato deve ser um objeto iniciando com { e terminando com }.');
      }
      
      let parsed;
      try {
        parsed = JSON.parse(cleanText);
      } catch (jsonErr) {
        // Fallback de objeto JS para JSON
        const jsToJson = cleanText
          .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')
          .replace(/'/g, '"')
          .replace(/,\s*([\]}])/g, '$1');
        parsed = JSON.parse(jsToJson);
      }

      if (!parsed.apiKey || !parsed.authDomain || !parsed.projectId) {
        throw new Error('A configuração deve conter pelo menos "apiKey", "authDomain" e "projectId".');
      }

      // Se já houver uma configuração salva e for idêntica, apenas fecha o modo edição
      const currentConfigStr = localStorage.getItem('connected-notes-custom-firebase-config');
      if (currentConfigStr) {
        try {
          const parsedCurrent = JSON.parse(currentConfigStr);
          if (parsedCurrent.apiKey === parsed.apiKey && parsedCurrent.projectId === parsed.projectId) {
            setAuthStatus('✅ Servidor mantido (sem alterações).');
            setIsEditingConfig(false);
            setShowConfigForm(false);
            return;
          }
        } catch (e) {
          // ignorar erro de parse antigo
        }
      }

      const wasLoggedInOnRouter = !isCustomFirebaseActive() && auth.currentUser;

      // Se o usuário estiver logado no Roteador Central, grava as chaves no banco do roteador primeiro
      if (wasLoggedInOnRouter) {
        setAuthStatus('Gravando chaves no seu perfil do Roteador de Autenticação...');
        const docRef = doc(db, 'user_routers', auth.currentUser.uid);
        await withTimeout(
          setDoc(docRef, parsed),
          8000,
          'Tempo limite esgotado ao salvar chaves no Roteador Central. Certifique-se de que o "Firestore Database" foi criado e ativado no console do seu Firebase central (.env)!'
        );
      }

      // Se estivesse logado no Roteador, desloga para forçar autenticação no novo Firebase
      if (auth.currentUser) {
        await signOut(auth);
      }

      // Atualiza a conexão para o novo Firebase in-memory
      updateFirebaseConfig(parsed);

      // Se estava logado anteriormente, oferece login silencioso/imediato no novo Firebase aproveitando o clique
      if (wasLoggedInOnRouter) {
        setAuthStatus('Autenticando no seu novo servidor privado...');
        const provider = new GoogleAuthProvider();
        const privateCredential = await signInWithPopup(auth, provider);
        setAuthUser(privateCredential.user);
        await StorageService.setProviderActive('firebase', true);
        setStorageProviders(prev => ({ ...prev, firebase: true }));
        setAuthStatus('✅ Servidor personalizado registrado e conectado com sucesso!');
      } else {
        setAuthStatus('✅ Servidor personalizado conectado localmente!');
      }
      setIsEditingConfig(false);
      setShowConfigForm(false);
    } catch (err) {
      setAuthStatus('❌ Erro na configuração do Firebase: ' + err.message);
    }
  };

  const handleSaveCustomServer = async (e) => {
    e.preventDefault();
    setAuthStatus('Salvando configuração do servidor...');
    try {
      localStorage.setItem('connected-notes-server-url', customServerUrl);
      localStorage.setItem('connected-notes-server-token', customServerToken);
      
      // Simula a ativação da sincronização em nuvem
      await StorageService.setProviderActive('firebase', true);
      setStorageProviders(prev => ({ ...prev, firebase: true }));
      setAuthStatus('✅ Configurações do servidor próprio salvas e sincronização ativada!');
    } catch (err) {
      setAuthStatus('❌ Erro ao salvar configurações: ' + err.message);
    }
  };

  const handleMigrateNotes = async () => {
    setMigrationStatus('Sincronizando notas...');
    try {
      const noteCount = Object.keys(notes).length;
      if (noteCount === 0) {
        setMigrationStatus('⚠️ Nenhuma nota encontrada para migrar.');
        return;
      }

      // Calcula a lista de notas alcançáveis por ordem hierárquica (BFS a partir de root)
      const orderedIds = [];
      const queue = ['root'];
      const visited = new Set(['root']);

      while (queue.length > 0) {
        const currentId = queue.shift();
        orderedIds.push(currentId);

        const currentNote = notes[currentId];
        if (currentNote && currentNote.children) {
          currentNote.children.forEach(childId => {
            if (!visited.has(childId) && notes[childId]) {
              visited.add(childId);
              queue.push(childId);
            }
          });
        }
      }

      const activeList = Object.keys(storageProviders)
        .filter(k => storageProviders[k])
        .map(k => k === 'local_vault' ? 'Pasta Local' : k === 'firebase' ? 'Nuvem' : 'Navegador')
        .join(', ');

      // Grava em lote seguindo a ordem de hierarquia top-down
      for (const noteId of orderedIds) {
        const noteData = notes[noteId];
        if (noteData) {
          await StorageService.saveNote(noteId, noteData, notes);
        }
      }

      setMigrationStatus(`✅ Sincronização concluída! ${orderedIds.length} notas organizadas em: ${activeList}.`);
    } catch (err) {
      setMigrationStatus('❌ Falha na sincronização: ' + err.message);
    }
  };

  const renderStorage = () => {
    const isLocalVault = storageProviders.local_vault;
    const isFirebase = storageProviders.firebase;
    const isIndexedDB = storageProviders.indexeddb;

    const activeListText = Object.keys(storageProviders)
      .filter(k => storageProviders[k])
      .map(k => k === 'local_vault' ? 'Pasta Local' : k === 'firebase' ? 'Nuvem' : 'Navegador')
      .join(' e ');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Escolha do Provedor */}
        <div className="glass-extreme" style={{ padding: '1.5rem', borderRadius: '1.5rem', background: 'var(--glass-bg)' }}>
          <label style={{ display: 'block', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.5px' }}>
            LOCAIS DE ARMAZENAMENTO DAS NOTAS
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Provedor 1: IndexedDB */}
            <div
              style={{
                width: '100%', padding: '14px 20px',
                background: 'rgba(255,255,255,0.03)',
                color: 'var(--text-primary)',
                border: isIndexedDB ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '14px',
                boxShadow: isIndexedDB ? '0 4px 15px rgba(139, 92, 246, 0.05)' : 'none',
                boxSizing: 'border-box',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                boxShadow: '0 4px 10px rgba(139, 92, 246, 0.3)',
                flexShrink: 0
              }}>
                💾
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Navegador</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '2px' }}>Notas salvas localmente na memória do navegador.</div>
              </div>
              <div style={{ pointerEvents: 'auto', flexShrink: 0 }}>
                <GlassToggle
                  checked={isIndexedDB}
                  onChange={() => handleToggleProvider('indexeddb', isIndexedDB)}
                />
              </div>
            </div>

            {/* Provedor 2: Local Vault */}
            <div
              style={{
                width: '100%', padding: '14px 20px',
                background: 'rgba(255,255,255,0.03)',
                color: 'var(--text-primary)',
                border: isLocalVault ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '14px',
                boxShadow: isLocalVault ? '0 4px 15px rgba(6, 182, 212, 0.05)' : 'none',
                boxSizing: 'border-box',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '100%' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #67e8f9 0%, #06b6d4 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                  boxShadow: '0 4px 10px rgba(6, 182, 212, 0.3)',
                  flexShrink: 0
                }}>
                  📂
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Pasta Local</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '2px' }}>Salva notas como arquivos reais (.md, .canvas) na pasta que escolher.</div>
                </div>
                <div style={{ pointerEvents: 'auto', flexShrink: 0 }}>
                  <GlassToggle
                    checked={isLocalVault}
                    onChange={() => handleToggleProvider('local_vault', isLocalVault)}
                  />
                </div>
              </div>

              {/* Bloco de Configuração da Pasta Local aninhado */}
              {isLocalVault && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', marginTop: '4px', width: '100%', boxSizing: 'border-box', animation: 'fadeIn 0.3s ease' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.5px', opacity: 0.8 }}>
                    CONFIGURAÇÃO DA PASTA LOCAL
                  </label>
                  <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.85rem' }}>
                    <div style={{ opacity: 0.6, marginBottom: '4px' }}>Caminho do Vault Ativo:</div>
                    <div style={{ fontWeight: 600, wordBreak: 'break-all', color: 'var(--accent-color)' }}>
                      {vaultPath || 'Nenhuma pasta selecionada'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleProvider('local_vault', false)}
                    className="liquid-button"
                    style={{
                      width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)',
                      background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                      color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                      boxShadow: '0 4px 15px rgba(6, 182, 212, 0.4)'
                    }}
                  >
                    Escolher outra pasta
                  </button>
                  <p style={{ fontSize: '0.7rem', opacity: 0.5, margin: 0 }}>
                    💡 Suas notas serão criadas e sincronizadas nesta pasta física. Use a sincronização abaixo para enviar suas notas existentes.
                  </p>
                </div>
              )}
            </div>

            {/* Provedor 3: Nuvem */}
            <div
              style={{
                width: '100%', padding: '14px 20px',
                background: 'rgba(255,255,255,0.03)',
                color: 'var(--text-primary)',
                border: isFirebase ? '1px solid rgba(236, 72, 153, 0.4)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '14px',
                boxShadow: isFirebase ? '0 4px 15px rgba(236, 72, 153, 0.05)' : 'none',
                boxSizing: 'border-box',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '100%' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                  boxShadow: '0 4px 10px rgba(236, 72, 153, 0.3)',
                  flexShrink: 0
                }}>
                  ☁️
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Nuvem</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '2px' }}>Sincronização em tempo real entre múltiplos dispositivos.</div>
                </div>
                <div style={{ pointerEvents: 'auto', flexShrink: 0 }}>
                  <GlassToggle
                    checked={isFirebase}
                    onChange={() => handleToggleProvider('firebase', isFirebase)}
                  />
                </div>
              </div>

              {/* Permite escolher o provedor de nuvem de forma permanente com GlassSelect */}
              {isFirebase && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', marginTop: '4px', width: '100%', boxSizing: 'border-box' }}>
                    <GlassSelect
                      label="PROVEDOR DE NUVEM"
                      options={CLOUD_PROVIDERS}
                      value={selectedCloudProvider}
                      onChange={(v) => {
                        setSelectedCloudProvider(v);
                        localStorage.setItem('selected-cloud-provider', v);
                      }}
                    />
                  </div>

                  {/* Detalhes do Provedor de Nuvem Ativo (Firebase) */}
                  {selectedCloudProvider === 'firebase' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', boxSizing: 'border-box', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', animation: 'fadeIn 0.3s ease' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.5px', opacity: 0.8, margin: 0 }}>
                          AUTENTICAÇÃO FIREBASE CLOUD
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowGoogleHelp(true)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'var(--accent-color, #ec4899)',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'var(--accent-color, #ec4899)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                        >
                          ❓ Ajuda com Google
                        </button>
                      </div>

                      {/* Traga seu próprio Firebase Collapsible Card */}
                      {(!authUser && showConfigForm) && (
                        <div 
                          className="glass-extreme" 
                          style={{ 
                            padding: '14px 16px', 
                            borderRadius: '16px', 
                            background: 'rgba(255, 255, 255, 0.02)', 
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-color, #ec4899)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              🔧 Configuração do Servidor Privado
                            </span>
                            <span style={{ fontSize: '0.7rem', opacity: 0.7, color: 'var(--accent-color, #ec4899)', fontWeight: 600 }}>
                              {localStorage.getItem('connected-notes-custom-firebase-config') ? '🟢 Conectado' : '⚪ Padrão'}
                            </span>
                          </div>
                          
                          <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.6, lineHeight: 1.4 }}>
                            Cole abaixo o objeto de configuração Web do seu console Firebase para usar seu próprio banco de dados descentralizado gratuitamente.
                          </p>

                          <form onSubmit={handleSaveCustomFirebaseConfig} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <textarea
                              value={customFirebaseConfigText}
                              onChange={(e) => setCustomFirebaseConfigText(e.target.value)}
                              placeholder={`const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  authDomain: "connectednotes-f7f35.firebaseapp.com",\n  projectId: "connectednotes-f7f35"\n};`}
                              style={{
                                width: '100%',
                                height: '80px',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                background: 'rgba(0, 0, 0, 0.2)',
                                color: '#a78bfa',
                                fontFamily: 'monospace',
                                fontSize: '0.75rem',
                                resize: 'none',
                                outline: 'none',
                                boxSizing: 'border-box'
                              }}
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="submit"
                                className="liquid-button"
                                style={{
                                  flex: 1,
                                  height: '36px',
                                  background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
                                  border: 'none',
                                  color: 'white',
                                  borderRadius: '8px',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  boxShadow: '0 4px 10px rgba(139, 92, 246, 0.2)'
                                }}
                              >
                                Conectar Servidor
                              </button>
                              {showConfigForm && (
                                <button
                                  type="button"
                                  onClick={() => setShowConfigForm(false)}
                                  className="liquid-button"
                                  style={{
                                    padding: '0 12px',
                                    height: '36px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    color: 'white',
                                    borderRadius: '8px',
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Cancelar
                                </button>
                              )}
                            </div>
                          </form>
                        </div>
                      )}

                      {authUser ? (
                        // Logged In
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: 'white', fontWeight: 'bold' }}>
                              {authUser.email?.substring(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{authUser.email}</div>
                              <div style={{ fontSize: '0.7rem', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} /> Conectado e Sincronizando
                              </div>
                            </div>
                          </div>

                          {isCustomFirebaseActive() && (
                            <div className="glass-extreme" style={{ padding: '12px 14px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                🔧 <strong>Status:</strong> Utilizando servidor privado descentralizado.
                              </div>
                              
                              {isEditingConfig ? (
                                <form onSubmit={handleSaveCustomFirebaseConfig} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <textarea
                                    value={customFirebaseConfigText}
                                    onChange={(e) => setCustomFirebaseConfigText(e.target.value)}
                                    placeholder="Configuração do Firebase..."
                                    style={{
                                      width: '100%', height: '80px', padding: '8px', borderRadius: '8px',
                                      border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)',
                                      color: '#a78bfa', fontFamily: 'monospace', fontSize: '0.7rem', resize: 'none', outline: 'none'
                                    }}
                                  />
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button type="submit" className="liquid-button" style={{ flex: 1, padding: '8px', borderRadius: '8px', background: 'var(--accent-color)', color: 'white', border: 'none', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                                      Atualizar Credenciais
                                    </button>
                                    <button type="button" onClick={() => setIsEditingConfig(false)} className="liquid-button" style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.75rem', cursor: 'pointer' }}>
                                      Cancelar
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    onClick={() => setIsEditingConfig(true)}
                                    className="liquid-button"
                                    style={{
                                      flex: 1, padding: '8px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)',
                                      border: '1px solid rgba(255, 255, 255, 0.1)', color: '#c084fc', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600
                                    }}
                                  >
                                    Alterar Servidor
                                  </button>
                                  <button
                                    onClick={() => {
                                      updateFirebaseConfig(null);
                                      setCustomFirebaseConfigText('');
                                      setAuthStatus('✅ Redefinido para o servidor padrão!');
                                      setTimeout(() => window.location.reload(), 1000);
                                    }}
                                    className="liquid-button"
                                    style={{
                                      padding: '8px 12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)',
                                      border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600
                                    }}
                                  >
                                    Voltar ao Padrão
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          <button
                            onClick={handleFirebaseLogout}
                            className="liquid-button"
                            style={{
                              width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)',
                              background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', cursor: 'pointer', fontSize: '0.85rem',
                              fontWeight: 600, transition: 'all 0.3s ease'
                            }}
                          >
                            Desconectar Conta
                          </button>
                        </div>
                      ) : (
                        // Logged Out Form (Simplified with Google login only)
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          <div style={{
                            padding: '12px 14px', borderRadius: '12px',
                            background: 'rgba(139, 92, 246, 0.08)',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                            fontSize: '0.78rem', lineHeight: 1.4, opacity: 0.9,
                            color: '#c084fc'
                          }}>
                            💡 <strong>Sincronização Descentralizada Privada:</strong><br />
                            Conecte-se com sua conta Google para sincronizar suas notas automaticamente. Se for seu primeiro uso, você poderá vincular seu Firebase privado à sua conta de forma totalmente gratuita!
                          </div>

                          <button
                            type="button"
                            onClick={handleGoogleSignIn}
                            className="liquid-button"
                            style={{
                              width: '100%', padding: '14px', borderRadius: '12px',
                              border: '1px solid rgba(255,255,255,0.15)',
                              background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: 'white',
                              cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                              transition: 'all 0.3s ease',
                              boxShadow: '0 4px 15px rgba(109, 40, 217, 0.3)'
                            }}
                            onMouseEnter={(e) => { e.target.style.background = 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)'; }}
                            onMouseLeave={(e) => { e.target.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)'; }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Entrar com o Google
                          </button>

                          {!showConfigForm && (
                            <div style={{ textAlign: 'center', marginTop: '6px' }}>
                              <button
                                type="button"
                                onClick={() => setShowConfigForm(true)}
                                style={{ background: 'none', border: 'none', color: '#c084fc', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'underline' }}
                              >
                                Configurar chaves do Firebase manualmente (Avançado)
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Servidor Próprio (Self-Hosted) */}
                  {selectedCloudProvider === 'custom_server' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', boxSizing: 'border-box', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', animation: 'fadeIn 0.3s ease' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.5px', opacity: 0.8 }}>
                        CONFIGURAÇÃO DO SERVIDOR PRÓPRIO
                      </label>
                      <div style={{
                        padding: '12px 14px', borderRadius: '12px',
                        background: 'rgba(139, 92, 246, 0.08)',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                        fontSize: '0.78rem', lineHeight: 1.4, opacity: 0.9,
                        color: '#c084fc'
                      }}>
                        🖥️ <strong>Sincronização Customizada (Self-Hosted):</strong><br />
                        Insira a URL do seu servidor self-hosted e o Token de API (JWT) para sincronização e controle absoluto dos seus dados!
                      </div>

                      <form onSubmit={handleSaveCustomServer} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.7 }}>URL DO SERVIDOR</span>
                          <GlassInput
                            type="url"
                            required
                            value={customServerUrl}
                            onChange={(e) => setCustomServerUrl(e.target.value)}
                            placeholder="https://seu-servidor-connected-notes.com"
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.7 }}>TOKEN DE API (JWT)</span>
                          <GlassInput
                            type="text"
                            required
                            value={customServerToken}
                            onChange={(e) => setCustomServerToken(e.target.value)}
                            placeholder="Seu token de autenticação..."
                          />
                        </div>
                        <button
                          type="submit"
                          className="liquid-button"
                          style={{
                            width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                            background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
                            color: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
                            boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)', marginTop: '6px'
                          }}
                        >
                          Salvar e Sincronizar
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Provedores Planejados */}
                  {['supabase', 'couchdb'].includes(selectedCloudProvider) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', boxSizing: 'border-box', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', animation: 'fadeIn 0.3s ease' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.5px', opacity: 0.8 }}>
                        CONFIGURAÇÃO DE NUVEM: {selectedCloudProvider.toUpperCase()}
                      </label>
                      <div style={{
                        padding: '16px', borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        fontSize: '0.8rem', lineHeight: 1.5, opacity: 0.8,
                        textAlign: 'center'
                      }}>
                        🚀 O suporte para o provedor <strong>{selectedCloudProvider === 'supabase' ? 'Supabase' : 'CouchDB'}</strong> estará disponível nas próximas atualizações.<br />Por enquanto, utilize o Firebase Cloud ou Servidor Próprio para sincronização em nuvem active.
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Feedback de Status Geral de Armazenamento */}
        {authStatus && (
          <div className="glass-extreme" style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.82rem', textAlign: 'center', animation: 'fadeIn 0.3s ease' }}>
            {authStatus}
          </div>
        )}

        {/* Ferramenta de Sincronização */}
        <div className="glass-extreme" style={{ padding: '1.5rem', borderRadius: '1.5rem', background: 'var(--glass-bg)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.5px' }}>
            SINCRONIZAÇÃO E MIGRAÇÃO MULTI-DESTINO
          </label>
          <p style={{ fontSize: '0.78rem', opacity: 0.7, margin: '0 0 6px 0', lineHeight: 1.4 }}>
            Esta ferramenta grava todas as suas notas abertas em <strong>todos os locais de salvamento atualmente ativados</strong> ({activeListText}). Ideal para evitar perda de dados ao ativar novos destinos de backup.
          </p>
          {migrationStatus && (
            <div style={{ fontSize: '0.8rem', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', margin: '4px 0' }}>
              {migrationStatus}
            </div>
          )}
          <button
            onClick={handleMigrateNotes}
            className="liquid-button"
            style={{
              width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', fontSize: '0.85rem',
              fontWeight: 600, transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => { e.target.style.background = 'rgba(255,255,255,0.08)'; e.target.style.borderColor = 'var(--accent-color)'; }}
            onMouseLeave={(e) => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.borderColor = 'rgba(255,255,255,0.15)'; }}
          >
            Sincronizar Notas nos locais ativos
          </button>
        </div>
      </div>
    );
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

  const renderEditor = () => {
    return (
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
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.5px' }}>CANVAS & ESCRITA DIGITAL</label>

          <GlassToggle
            label="Suavizar Traço (Estabilizador)" sublabel="Evita traçados trêmulos e caligrafia irregular"
            checked={strokeSmoothingEnabled}
            onChange={(v) => setStrokeSmoothingEnabled(v)}
          />

          {strokeSmoothingEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Intensidade da Suavização</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-color)' }}>{Math.round(strokeSmoothing * 100)}%</span>
              </div>
              <input
                type="range" min="0" max="1" step="0.1"
                value={strokeSmoothing}
                onChange={(e) => setStrokeSmoothing(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: 'var(--accent-color)',
                  cursor: 'pointer'
                }}
              />
            </div>
          )}
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
  };

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
          {activeTab === 'storage' && renderStorage()}
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
        {/* Google Login Guide Overlay */}
        {showGoogleHelp && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1000,
              background: 'var(--bg-color, #0f172a)', // Solid opaque background matching current theme
              display: 'flex',
              flexDirection: 'column',
              padding: '28px',
              animation: 'fadeIn 0.2s ease',
              boxSizing: 'border-box',
              borderRadius: '32px'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>🔥</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>Ativar Login com Google</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', opacity: 0.5, color: 'var(--text-primary)' }}>Guia passo a passo para o Firebase Console</p>
                </div>
              </div>
              <button 
                onClick={() => setShowGoogleHelp(false)}
                className="liquid-button"
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ×
              </button>
            </div>

            {/* Steps Scrollable Container */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px' }} className="custom-scrollbar">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{
                  padding: '12px 14px', borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  fontSize: '0.8rem', lineHeight: 1.4, color: '#fecaca'
                }}>
                  ⚠️ <strong>auth/operation-not-allowed:</strong> O provedor Google está desativado no Firebase. Siga os passos 1 a 5 abaixo.
                </div>
                
                <div style={{
                  padding: '12px 14px', borderRadius: '12px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  fontSize: '0.8rem', lineHeight: 1.4, color: '#fef3c7'
                }}>
                  🌐 <strong>auth/unauthorized-domain:</strong> O domínio/IP atual não está autorizado. No console Firebase, acesse <strong>Authentication</strong> &rarr; <strong>Settings</strong> &rarr; <strong>Authorized domains</strong> e adicione o endereço de execução do seu app.
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--accent-color, #ec4899)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', flexShrink: 0 }}>1</div>
                  <div style={{ fontSize: '0.82rem', lineHeight: 1.4, color: 'var(--text-primary)' }}>
                    Acesse o <strong><a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-color, #ec4899)', textDecoration: 'none', fontWeight: 600 }}>Console do Firebase ↗</a></strong> e selecione o seu projeto na lista.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--accent-color, #ec4899)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', flexShrink: 0 }}>2</div>
                  <div style={{ fontSize: '0.82rem', lineHeight: 1.4, color: 'var(--text-primary)' }}>
                    No menu lateral esquerdo, clique em <strong>Authentication</strong> (Autenticação).
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--accent-color, #ec4899)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', flexShrink: 0 }}>3</div>
                  <div style={{ fontSize: '0.82rem', lineHeight: 1.4, color: 'var(--text-primary)' }}>
                    Clique na aba superior chamada <strong>Sign-in method</strong> (Método de login).
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--accent-color, #ec4899)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', flexShrink: 0 }}>4</div>
                  <div style={{ fontSize: '0.82rem', lineHeight: 1.4, color: 'var(--text-primary)' }}>
                    Sob <strong>Sign-in providers</strong>, clique em <strong>Adicionar novo provedor</strong> e selecione o <strong>Google</strong>.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--accent-color, #ec4899)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', flexShrink: 0 }}>5</div>
                  <div style={{ fontSize: '0.82rem', lineHeight: 1.4, color: 'var(--text-primary)' }}>
                    Ative a opção <strong>Habilitar / Enable</strong>, escolha o <strong>e-mail de suporte do projeto</strong> e clique em <strong>Salvar</strong>.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--accent-color, #ec4899)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', flexShrink: 0 }}>6</div>
                  <div style={{ fontSize: '0.82rem', lineHeight: 1.4, color: 'var(--text-primary)' }}>
                    <strong>Para obter suas chaves privadas</strong>: Clique no ícone de engrenagem ⚙️ (Configurações do Projeto), role até <strong>Seus aplicativos</strong> na aba <em>Geral</em>, e copie o objeto de configuração JavaScript para colar na caixa "Servidor Firebase Privado".
                  </div>
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowGoogleHelp(false)}
                className="liquid-button"
                style={{
                  height: '44px', padding: '0 28px', borderRadius: '12px', border: 'none',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
                  color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                  boxShadow: '0 6px 15px rgba(139, 92, 246, 0.3)'
                }}
              >
                Entendi, vou configurar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsModal;