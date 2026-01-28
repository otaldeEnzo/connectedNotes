import React, { useRef, useState } from 'react';
import { useNotes } from '../contexts/NotesContext';

// --- Ícones SVG ---
const Icons = {
  Menu: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>,
  Cursor: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path></svg>,
  Select: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h7v7H3z"></path><path d="M14 3h7v7h-7z"></path><path d="M14 14h7v7h-7z"></path><path d="M3 14h7v7H3z"></path></svg>,
  Pen: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>,
  Highlighter: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l-6 6v3h9l3-3"></path><path d="M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"></path></svg>,
  Type: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>,
  Eraser: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.998 8.798l6-6.002 12.004 12.004-6.002 6.002L2.998 8.798z"></path><path d="M11 5l6 6"></path></svg>,
  Math: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 4H6l8 8-8 8h12"></path></svg>,
  PDF: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  Code: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>,
  Paper: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>,
  AI: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path></svg>,
  Sun: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="3"></line></svg>,
  Moon: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>,
  Settings: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
};

// --- Componentes Locais ---

const ToolbarButton = ({ icon: Icon, label, onClick, isActive, color }) => (
  <button
    onClick={onClick}
    title={label}
    style={{
      background: isActive ? (color ? `${color}22` : 'rgba(99, 102, 241, 0.2)') : 'transparent',
      border: 'none', borderRadius: '8px', padding: '10px', margin: '0 2px',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: isActive ? (color || 'var(--accent-color)') : 'var(--text-primary)',
      transition: 'all 0.2s ease', boxShadow: isActive ? '0 0 10px rgba(99, 102, 241, 0.1)' : 'none'
    }}
    onMouseEnter={(e) => !isActive && (e.currentTarget.style.background = 'rgba(128,128,128,0.1)')}
    onMouseLeave={(e) => !isActive && (e.currentTarget.style.background = 'transparent')}
  >
    <Icon />
  </button>
);

const ColorDot = ({ color, width, selected, onClick, onRemove, isHighlighter }) => (
  <div 
    onClick={() => onClick()}
    onContextMenu={(e) => { e.preventDefault(); onRemove(); }}
    title={`${isHighlighter ? 'Marca-texto' : 'Caneta'} ${width}px\n(Botão direito para remover)`}
    style={{
      width: isHighlighter ? '22px' : '18px', 
      height: isHighlighter ? '22px' : '18px', 
      borderRadius: isHighlighter ? '4px' : '50%',
      backgroundColor: color,
      border: selected ? '2px solid var(--accent-color)' : '1px solid rgba(128,128,128,0.4)',
      cursor: 'pointer', margin: '0 4px',
      transform: selected ? 'scale(1.2)' : 'scale(1)',
      opacity: isHighlighter ? 0.6 : 1,
      transition: 'transform 0.2s',
      boxShadow: selected ? '0 0 5px rgba(0,0,0,0.2)' : 'none'
    }}
  />
);

// --- Componente Principal da Barra ---
const FloatingToolbar = ({ 
  onToggleSidebar, activeTool, setActiveTool, 
  isDarkMode, onToggleTheme, onImportPDF, onOpenSettings,
  penColor, setPenColor, penWidth, setPenWidth, penType, setPenType,
  toolPresets, onAddPreset, onRemovePreset, onSelectPreset,
  paperPattern, setPaperPattern
}) => {
  const { activeNoteId, updateNoteBackground, setDefaultBackground } = useNotes();
  const fileInputRef = useRef(null);
  const [showPaperMenu, setShowPaperMenu] = useState(false);

  const handlePdfClick = () => { if (fileInputRef.current) fileInputRef.current.click(); };
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && onImportPDF) onImportPDF(file);
    e.target.value = null;
  };

  const showPenSettings = activeTool === 'pen' || activeTool === 'highlighter';

  // Handler para atualizar o papel
  const handleSetPaper = (pattern) => {
    if (activeNoteId) {
      updateNoteBackground(activeNoteId, pattern); // Atualiza nota atual
      setDefaultBackground(pattern); // Salva como preferência para futuras
    }
    setPaperPattern(pattern); // Atualiza visual imediato
    setShowPaperMenu(false);
  };

  return (
    <div style={{
      position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 100
    }}>
      
      {/* Menu de Papel */}
      {showPaperMenu && (
        <div className="glass-panel" style={{
          marginBottom: '8px', padding: '8px', borderRadius: '12px',
          display: 'flex', gap: '8px'
        }}>
          {[
            { id: 'dots', label: 'Pontilhado' },
            { id: 'lines', label: 'Pautado' },
            { id: 'grid', label: 'Quadriculado' },
            { id: 'blank', label: 'Branco' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => handleSetPaper(p.id)}
              style={{
                background: paperPattern === p.id ? 'var(--accent-color)' : 'transparent',
                color: paperPattern === p.id ? 'white' : 'var(--text-primary)',
                border: '1px solid var(--border-color)', borderRadius: '6px',
                padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Menu de Canetas */}
      {showPenSettings && !showPaperMenu && (
        <div className="glass-panel" style={{
          marginBottom: '8px', padding: '8px 12px', borderRadius: '12px',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {toolPresets.map(preset => (
            <ColorDot 
              key={preset.id} 
              color={preset.color} 
              width={preset.width}
              isHighlighter={preset.type === 'highlighter'}
              selected={penType === preset.type && penColor === preset.color && penWidth === preset.width}
              onClick={() => onSelectPreset(preset)} 
              onRemove={() => onRemovePreset(preset.id)}
            />
          ))}
          <div style={{ width: '1px', height: '16px', background: 'var(--border-color)', margin: '0 4px' }}></div>
          <input type="color" value={penColor} onChange={(e) => setPenColor(e.target.value)} style={{ width: '24px', height: '24px', border: 'none', background: 'none', cursor: 'pointer' }} />
          <input type="range" min="1" max="50" step="1" value={penWidth} onChange={(e) => setPenWidth(Number(e.target.value))} style={{ width: '60px', accentColor: 'var(--accent-color)' }} />
          <button onClick={onAddPreset} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)' }}>+</button>
        </div>
      )}

      <div className="glass-panel" style={{ display: 'flex', padding: '6px', borderRadius: '16px', boxShadow: 'var(--glass-shadow)' }}>
        <input type="file" accept="application/pdf" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />

        <ToolbarButton icon={Icons.Menu} label="Sidebar" onClick={onToggleSidebar} />
        <div style={{ width: '1px', background: 'var(--border-color)', margin: '0 4px' }} />
        
        <ToolbarButton icon={Icons.Cursor} label="Cursor (Mover/Selecionar)" isActive={activeTool === 'cursor'} onClick={() => setActiveTool('cursor')} />
        <ToolbarButton icon={Icons.AI} label="Tutor IA" isActive={activeTool === 'ai-lasso'} onClick={() => setActiveTool('ai-lasso')} color="#10b981" />
        
        <ToolbarButton icon={Icons.Type} label="Texto" isActive={activeTool === 'text'} onClick={() => setActiveTool('text')} />
        <ToolbarButton icon={Icons.Math} label="Fórmula" isActive={activeTool === 'math'} onClick={() => setActiveTool('math')} />
        <ToolbarButton icon={Icons.Code} label="Código" isActive={activeTool === 'code'} onClick={() => setActiveTool('code')} />
        <ToolbarButton icon={Icons.PDF} label="Importar PDF" onClick={handlePdfClick} />
        
        <div style={{ width: '1px', background: 'var(--border-color)', margin: '0 4px' }} />
        
        <ToolbarButton icon={Icons.Pen} label="Caneta" isActive={activeTool === 'pen'} onClick={() => { setActiveTool('pen'); setPenType('pen'); }} />
        <ToolbarButton icon={Icons.Highlighter} label="Marca-texto" isActive={activeTool === 'highlighter'} onClick={() => { setActiveTool('highlighter'); setPenType('highlighter'); }} />
        <ToolbarButton icon={Icons.Eraser} label="Borracha" isActive={activeTool === 'eraser'} onClick={() => setActiveTool('eraser')} />
        
        <div style={{ width: '1px', background: 'var(--border-color)', margin: '0 4px' }} />
        <ToolbarButton icon={Icons.Paper} label="Fundo" isActive={showPaperMenu} onClick={() => setShowPaperMenu(!showPaperMenu)} />
        <ToolbarButton icon={isDarkMode ? Icons.Sun : Icons.Moon} label="Tema" onClick={onToggleTheme} />
        <ToolbarButton icon={Icons.Settings} label="Configurações" onClick={onOpenSettings} />
      </div>
    </div>
  );
};

export default FloatingToolbar;