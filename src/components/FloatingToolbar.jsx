import React, { useRef, useState, useEffect } from 'react';
import { useNotes } from '../contexts/NotesContext';
import ColorPicker from './ColorPicker';

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
  Settings: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
  Shapes: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="7" r="5"></circle><rect x="13" y="13" width="8" height="8" rx="1"></rect><path d="M12 2l3 5h-6l3-5z"></path></svg>,
  Plus: (props) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  ChevronUp: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>,
  Mermaid: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
  Mindmap: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 9V5"></path><path d="M12 15v4"></path><path d="M15 12h4"></path><path d="M9 12H5"></path><circle cx="12" cy="3" r="2"></circle><circle cx="12" cy="21" r="2"></circle><circle cx="21" cy="12" r="2"></circle><circle cx="3" cy="12" r="2"></circle></svg>,
  Rectangle: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect></svg>,
  Circle: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"></circle></svg>,
  Ellipse: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="12" rx="10" ry="6"></ellipse></svg>,
  ArrowHead: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-7-7l7 7-7 7" /></svg>,
  LineHead: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  Pentagon: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l9 7-3 12H6l-3-12 9-7z" /></svg>,
  Hexagon: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l8.66 5v10L12 22l-8.66-5V7L12 2z" /></svg>,
  Octagon: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="7 2h10l5 5v10l-5 5H7l-5-5V7l5-5z" /></svg>,
  Diamond: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l10 10-10 10-10-10z" /></svg>
};

// --- Componentes Locais ---

const ToolbarButton = ({ icon: Icon, label, onClick, isActive, color, className = "", style = {} }) => (
  <button
    onClick={onClick}
    title={label}
    className={`liquid-item toolbar-btn ${isActive ? 'active' : ''} ${className}`}
    style={{
      background: isActive ? 'rgba(124, 58, 237, 0.25)' : 'transparent',
      border: 'none',
      borderRadius: '10px',
      padding: '8px',
      margin: '0 1px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      color: isActive ? '#ffffff' : 'rgba(255,255,255,0.5)',
      transition: 'all 0.3s ease',
      boxShadow: isActive ? '0 0 16px rgba(124, 58, 237, 0.5)' : 'none',
      ...style
    }}
  >
    <Icon />
  </button>
);

const ColorDot = ({ color, width, selected, onClick, onRemove, onEdit, isHighlighter }) => {
  const editInputRef = useRef(null);
  return (
    <div
      onClick={() => onClick()}
      onContextMenu={(e) => { e.preventDefault(); onRemove(); }}
      onDoubleClick={(e) => { e.preventDefault(); editInputRef.current?.click(); }}
      title={`${isHighlighter ? 'Marca-texto' : 'Caneta'} ${width}px\n(Clique duplo para editar cor, botão direito para apagar)`}
      style={{
        width: isHighlighter ? '18px' : '16px',
        height: isHighlighter ? '18px' : '16px',
        borderRadius: isHighlighter ? '4px' : '50%',
        backgroundColor: color,
        border: selected ? '2px solid white' : '1px solid rgba(255,255,255,0.2)',
        cursor: 'pointer', margin: '0 2px',
        transform: selected ? 'scale(1.15)' : 'scale(1)',
        opacity: isHighlighter ? 0.6 : 1,
        transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: selected ? `0 0 8px ${color}80` : '0 1px 3px rgba(0,0,0,0.1)',
        position: 'relative'
      }}
    >
      <input
        type="color"
        ref={editInputRef}
        style={{ opacity: 0, position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}
        value={color}
        onChange={(e) => onEdit(e.target.value)}
      />
    </div>
  );
};

// --- Componente Principal da Barra ---
const FloatingToolbar = ({
  isSidebarOpen, onToggleSidebar, activeTool, setActiveTool,
  isDarkMode, onToggleTheme, onImportPDF, onOpenSettings,
  penConfig, setPenConfig,
  highlighterConfig, setHighlighterConfig,
  penType, setPenType,
  toolPresets, onAddPreset, onRemovePreset, onSelectPreset, onUpdatePreset,
  recentColors, colorIdeas, onColorChange,
  paperPattern, setPaperPattern,
  activeForcedShape, setActiveForcedShape,
  sidebarWidth = 0
}) => {
  const { activeNoteId, activeNote, updateNoteBackground, setDefaultBackground, updateNoteContent } = useNotes();
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  const [showPaperMenu, setShowPaperMenu] = useState(false);
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [showAddInMenu, setShowAddInMenu] = useState(false);
  const [showDiscovery, setShowDiscovery] = useState(null); // 'pen' | 'highlighter' | null

  const closeAllSubMenus = () => {
    setShowPaperMenu(false);
    setShowShapeMenu(false);
    setShowAddInMenu(false);
  };

  const toggleSubMenu = (menu) => {
    if (menu === 'paper') {
      const target = !showPaperMenu;
      closeAllSubMenus();
      setShowPaperMenu(target);
    } else if (menu === 'shape') {
      const target = !showShapeMenu;
      closeAllSubMenus();
      setShowShapeMenu(target);
    } else if (menu === 'plus') {
      const target = !showAddInMenu;
      closeAllSubMenus();
      setShowAddInMenu(target);
    }
  };

  // Clear forced shape when shape menu is closed
  useEffect(() => {
    if (!showShapeMenu && activeForcedShape) {
      setActiveForcedShape(null);
    }
  }, [showShapeMenu, activeForcedShape, setActiveForcedShape]);

  const [isDragging, setIsDragging] = useState(false);
  const [orientation, setOrientation] = useState('horizontal'); // 'horizontal' | 'vertical'
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('connected-notes-toolbar-pos');
    return saved ? JSON.parse(saved) : { x: window.innerWidth / 2, y: window.innerHeight - 60 };
  });
  const dragStartRef = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });
  const lastBoundaryRef = useRef(sidebarWidth > 0 ? sidebarWidth + 56 : 60);

  // Sidebar sync: push/pull toolbar when sidebar width or status changes
  useEffect(() => {
    if (isDragging) {
      // Keep boundary updated during drag so we can "attach" on release
      lastBoundaryRef.current = sidebarWidth > 0 ? sidebarWidth + 56 : 60;
      return;
    }

    const currentBoundary = sidebarWidth > 0 ? sidebarWidth + 56 : 60;

    // Check if the toolbar was "glued" to the previous boundary
    // or if it's currently inside the new boundary (pushed)
    const wasAtEdge = Math.abs(position.x - lastBoundaryRef.current) < 2;
    const isInsideNewBoundary = position.x < currentBoundary;

    if (orientation === 'vertical' && (wasAtEdge || isInsideNewBoundary)) {
      if (Math.abs(position.x - currentBoundary) > 0.5) {
        setPosition(prev => ({ ...prev, x: currentBoundary }));
      }
    }

  lastBoundaryRef.current = currentBoundary;
  }, [sidebarWidth, isDragging, orientation, position.x]);

  // Click away to close submenus and discovery (ColorPicker)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        // Close everything EXCEPT the shapes menu and discovery
        setShowPaperMenu(false);
        setShowAddInMenu(false);
        setShowDiscovery(null);
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  // Close ColorPicker on tool change
  useEffect(() => {
    setShowDiscovery(null);
  }, [activeTool]);

  const handlePointerDown = (e) => {
    if (!e.target.closest('.drag-handle')) return;
    setIsDragging(true);
    if (containerRef.current) containerRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;

    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const newX = e.clientX;
    const newY = e.clientY;

    const distLeft = newX;
    const distRight = winW - newX;
    const distTop = newY;
    const distBottom = winH - newY;
    const minDist = Math.min(distLeft, distRight, distTop, distBottom);

    if (minDist === distTop || minDist === distBottom) {
      setOrientation('horizontal');
    } else {
      setOrientation('vertical');
    }

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;

    // Magnetic Snap on Release
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const distLeft = position.x;
    const distRight = winW - position.x;
    const distTop = position.y;
    const distBottom = winH - position.y;
    const minDist = Math.min(distLeft, distRight, distTop, distBottom);

    let snappedX = position.x;
    let snappedY = position.y;
    let snappedOrientation = orientation;

    if (minDist === distTop) {
      snappedY = 100; // Below TabBar
      snappedOrientation = 'horizontal';
      snappedX = Math.max(24, Math.min(position.x, winW - 300));
    } else if (minDist === distBottom) {
      snappedY = winH - 60;
      snappedOrientation = 'horizontal';
      snappedX = Math.max(24, Math.min(position.x, winW - 300));
    } else if (minDist === distLeft) {
      // Sidebar aware snapping with larger gap
      const snapX = sidebarWidth > 0 ? sidebarWidth + 56 : 60;
      snappedX = snapX;
      snappedOrientation = 'vertical';
      snappedY = Math.max(24, Math.min(position.y, winH - 100));
    } else if (minDist === distRight) {
      snappedX = winW - 60;
      snappedOrientation = 'vertical';
      snappedY = Math.max(24, Math.min(position.y, winH - 100));
    }

    const finalPos = { x: snappedX, y: snappedY };
    setPosition(finalPos);
    setOrientation(snappedOrientation);
    setIsDragging(false);

    localStorage.setItem('connected-notes-toolbar-pos', JSON.stringify(finalPos));
    if (containerRef.current) containerRef.current.releasePointerCapture(e.pointerId);
  };

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

  const handleExportClick = () => {
    if (!activeNoteId || !activeNote) return;
    console.log('[FloatingToolbar] Export PNG clicked. Triggering hybrid flow.');
    window.dispatchEvent(new CustomEvent('triggerExport', {
      detail: { noteId: activeNoteId, format: 'png', note: activeNote }
    }));
  };

  // Determine current side for adaptive layout
  const isLeftSide = position.x < window.innerWidth / 2;
  const isTopSide = position.y < window.innerHeight / 2;

  return (
    <div
      ref={containerRef}
      className={`floating-toolbar-container ${isDragging ? 'is-dragging' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        // Handle is ALWAYS the reference point (center).
        // During dock, we adjust transform to stick the bar to the edge.
        transform: isDragging
          ? 'translate(-24px, -24px)'
          : (orientation === 'horizontal'
            ? (isLeftSide ? 'translate(0, -24px)' : 'translate(-100%, -24px)')
            : (isTopSide ? 'translate(-24px, 0)' : 'translate(-24px, -100%)')
          ),
        display: 'flex',
        flexDirection: orientation === 'horizontal' ? 'column' : 'row',
        gap: '4px',
        alignItems: orientation === 'horizontal'
          ? (isLeftSide ? 'flex-start' : 'flex-end')
          : (isTopSide ? 'flex-start' : 'flex-end'),
        zIndex: 5000,
        pointerEvents: 'auto',
        transition: isDragging ? 'none' : 'all 0.4s cubic-bezier(0.19, 1, 0.22, 1)',
        cursor: isDragging ? 'grabbing' : 'default',
        // Force active dragging handle centering
        willChange: 'top, left, transform'
      }}
    >

      {/* Menu de Formas */}
      {!isDragging && showShapeMenu && (
        <div className="glass-extreme" style={{
          padding: '10px', borderRadius: '16px',
          display: 'flex',
          flexDirection: orientation === 'horizontal' ? 'row' : 'column',
          gap: '8px', alignItems: 'center',
          pointerEvents: 'auto',
          position: 'absolute',
          ...(orientation === 'horizontal'
            ? {
              left: '50%', transform: 'translateX(-50%)',
              ...(isTopSide ? { top: 'calc(100% + 12px)' } : { bottom: 'calc(100% + 12px)' })
            }
            : {
              top: '50%', transform: 'translateY(-50%)',
              ...(isLeftSide ? { left: 'calc(100% + 12px)' } : { right: 'calc(100% + 12px)' })
            }
          ),
          justifyContent: 'center'
        }}>
          {[
            { id: 'circle', icon: Icons.Circle, label: 'Círculo' },
            { id: 'rectangle', icon: Icons.Rectangle, label: 'Retângulo' },
            { id: 'line', icon: Icons.LineHead, label: 'Reta' },
            { id: 'arrow', icon: Icons.ArrowHead, label: 'Seta' },
            { id: 'pentagon', icon: Icons.Pentagon, label: 'Shape' },
            { id: 'diamond', icon: Icons.Diamond, label: 'Diamante' }
          ].map(s => (
            <button
              key={s.id}
              onClick={() => {
                setActiveForcedShape(activeForcedShape === s.id ? null : s.id);
                if (activeTool !== 'pen') setActiveTool('pen');
              }}
              className="liquid-item"
              title={s.label}
              style={{
                background: activeForcedShape === s.id ? 'var(--accent-gradient)' : 'transparent',
                color: activeForcedShape === s.id ? 'white' : 'var(--text-primary)',
                border: 'none', borderRadius: '10px',
                padding: '8px', cursor: 'pointer',
                display: 'flex', transition: 'all 0.2s'
              }}
            >
              <s.icon />
            </button>
          ))}
        </div>
      )}

      {/* Menu de Papel */}
      {!isDragging && showPaperMenu && (
        <div className="glass-extreme" style={{
          padding: '10px', borderRadius: '16px',
          display: 'flex',
          flexDirection: orientation === 'horizontal' ? 'row' : 'column',
          gap: '8px',
          pointerEvents: 'auto',
          position: 'absolute',
          ...(orientation === 'horizontal'
            ? {
              left: '50%', transform: 'translateX(-50%)',
              ...(isTopSide ? { top: 'calc(100% + 12px)' } : { bottom: 'calc(100% + 12px)' })
            }
            : {
              top: '50%', transform: 'translateY(-50%)',
              ...(isLeftSide ? { left: 'calc(100% + 12px)' } : { right: 'calc(100% + 12px)' })
            }
          ),
          justifyContent: 'center'
        }}>
          {[
            { id: 'dots', label: 'Pontilhado' },
            { id: 'lines', label: 'Pautado' },
            { id: 'grid', label: 'Quadriculado' },
            { id: 'blank', label: 'Branco' }
          ].map(p => (
            <button
              key={p.id}
              className="liquid-button"
              onClick={() => handleSetPaper(p.id)}
              style={{
                background: paperPattern === p.id ? 'var(--accent-color)' : 'transparent',
                color: paperPattern === p.id ? 'white' : 'var(--text-primary)',
                border: '1px solid var(--border-color)', borderRadius: '10px',
                padding: '6px 12px', fontSize: '0.85rem', cursor: 'pointer'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Menu de Caneta (Exclusivo) */}
      {!isDragging && activeTool === 'pen' && !showPaperMenu && !showShapeMenu && !showAddInMenu && (
        <div className="glass-extreme" style={{
          padding: '6px 12px', borderRadius: '16px',
          display: 'flex',
          alignItems: 'center', gap: '12px',
          whiteSpace: 'nowrap',
          pointerEvents: 'auto',
          position: 'absolute',
          ...(orientation === 'horizontal'
            ? {
              left: '50%', transform: 'translateX(-50%)',
              ...(isTopSide ? { top: 'calc(100% + 12px)' } : { bottom: 'calc(100% + 12px)' })
            }
            : {
              top: '50%', transform: 'translateY(-50%)',
              ...(isLeftSide ? { left: 'calc(100% + 12px)' } : { right: 'calc(100% + 12px)' })
            }
          ),
          flexDirection: orientation === 'horizontal' ? 'row' : 'column',
          justifyContent: 'center'
        }}>
          {/* Fila de Presets */}
          <div style={{
            display: 'flex',
            gap: '1px',
            marginRight: orientation === 'horizontal' ? '4px' : '0',
            paddingRight: orientation === 'horizontal' ? '4px' : '0',
            borderRight: (orientation === 'horizontal' ? '1px solid rgba(255,255,255,0.1)' : 'none'),
            borderBottom: (orientation === 'vertical' ? '1px solid rgba(255,255,255,0.1)' : 'none'),
            paddingBottom: orientation === 'vertical' ? '4px' : '0',
            flexDirection: orientation === 'horizontal' ? 'row' : 'column',
            alignItems: 'center'
          }}>
            {toolPresets.filter(p => p.type === 'pen').map(p => (
              <ColorDot
                key={p.id}
                color={p.color}
                width={p.width}
                selected={penConfig.color === p.color && penConfig.width === p.width}
                onClick={() => onSelectPreset(p)}
                onRemove={() => onRemovePreset(p.id)}
                onEdit={(newColor) => onUpdatePreset(p.id, { color: newColor })}
              />
            ))}
            <button
              onClick={() => onAddPreset('pen')}
              style={{
                width: '18px', height: '18px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.3)',
                color: 'white', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '2px'
              }}
              title="Salvar Preset"
            >
              <Icons.Plus size={10} style={{ width: 10, height: 10 }} />
            </button>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => setShowDiscovery(showDiscovery === 'pen' ? null : 'pen')}
              style={{
                width: '26px', height: '26px', borderRadius: '50%',
                backgroundColor: penConfig.color, border: '2px solid rgba(255,255,255,0.4)',
                cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                transition: 'transform 0.2s', flexShrink: 0
              }}
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            />
          </div>

          <input
            type="range" min="1" max="10" step="1"
            value={penConfig.width}
            onChange={(e) => setPenConfig(prev => ({ ...prev, width: Number(e.target.value) }))}
            style={{
              width: orientation === 'horizontal' ? '60px' : '15px',
              height: orientation === 'horizontal' ? '15px' : '60px',
              WebkitAppearance: orientation === 'vertical' ? 'slider-vertical' : 'auto',
              accentColor: 'var(--accent-color)',
              cursor: 'pointer'
            }}
          />
        </div>
      )}

      {/* Menu de Marca-Texto (Exclusivo) */}
      {!isDragging && activeTool === 'highlighter' && !showPaperMenu && !showShapeMenu && !showAddInMenu && (
        <div className="glass-extreme" style={{
          padding: '6px 12px', borderRadius: '16px',
          display: 'flex',
          alignItems: 'center', gap: '12px',
          whiteSpace: 'nowrap',
          pointerEvents: 'auto',
          position: 'absolute',
          ...(orientation === 'horizontal'
            ? {
              left: '50%', transform: 'translateX(-50%)',
              ...(isTopSide ? { top: 'calc(100% + 12px)' } : { bottom: 'calc(100% + 12px)' })
            }
            : {
              top: '50%', transform: 'translateY(-50%)',
              ...(isLeftSide ? { left: 'calc(100% + 12px)' } : { right: 'calc(100% + 12px)' })
            }
          ),
          flexDirection: orientation === 'horizontal' ? 'row' : 'column',
          justifyContent: 'center'
        }}>
          {/* Presets de Marca-texto */}
          <div style={{
            display: 'flex',
            gap: '1px',
            marginRight: orientation === 'horizontal' ? '4px' : '0',
            paddingRight: orientation === 'horizontal' ? '4px' : '0',
            borderRight: (orientation === 'horizontal' ? '1px solid rgba(255,255,255,0.1)' : 'none'),
            borderBottom: (orientation === 'vertical' ? '1px solid rgba(255,255,255,0.1)' : 'none'),
            paddingBottom: orientation === 'vertical' ? '4px' : '0',
            flexDirection: orientation === 'horizontal' ? 'row' : 'column',
            alignItems: 'center'
          }}>
            {toolPresets.filter(p => p.type === 'highlighter').map(p => (
              <ColorDot
                key={p.id}
                color={p.color}
                width={p.width}
                isHighlighter={true}
                selected={highlighterConfig.color === p.color && highlighterConfig.width === p.width}
                onClick={() => onSelectPreset(p)}
                onRemove={() => onRemovePreset(p.id)}
                onEdit={(newColor) => onUpdatePreset(p.id, { color: newColor })}
              />
            ))}
            <button
              onClick={() => onAddPreset('highlighter')}
              style={{
                width: '20px', height: '18px', borderRadius: '4px',
                background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.3)',
                color: 'white', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '2px'
              }}
              title="Salvar Preset"
            >
              <Icons.Plus style={{ width: 10, height: 10 }} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: orientation === 'horizontal' ? 'row' : 'column', gap: '4px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: orientation === 'horizontal' ? 'row' : 'column', gap: '4px' }}>
              {['#fef08a', '#fda4af', '#a5f3fc', '#d9f99d'].map(c => {
                const isSelected = highlighterConfig.color === c;
                return (
                  <button
                    key={c}
                    onClick={() => { setHighlighterConfig(prev => ({ ...prev, color: c })); }}
                    style={{
                      width: 18, height: 18,
                      borderRadius: '4px',
                      backgroundColor: c,
                      opacity: isSelected ? 1 : 0.6,
                      border: isSelected ? '2px solid white' : '1px solid rgba(255,255,255,0.2)',
                      transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                  />
                );
              })}
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <button
                onClick={() => setShowDiscovery(showDiscovery === 'highlighter' ? null : 'highlighter')}
                style={{
                  width: '26px', height: '26px', borderRadius: '4px',
                  backgroundColor: highlighterConfig.color, border: '2px solid rgba(255,255,255,0.4)',
                  cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  transition: 'transform 0.2s', flexShrink: 0, opacity: 0.7
                }}
                onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              />
            </div>

            <input
              type="range" min="10" max="60" step="2"
              value={highlighterConfig.width}
              onChange={(e) => setHighlighterConfig(prev => ({ ...prev, width: Number(e.target.value) }))}
              style={{
                width: orientation === 'horizontal' ? '60px' : '15px',
                height: orientation === 'horizontal' ? '15px' : '60px',
                WebkitAppearance: orientation === 'vertical' ? 'slider-vertical' : 'auto',
                accentColor: 'var(--accent-color)',
                cursor: 'pointer'
              }}
            />
          </div>
        </div>
      )}
      {/* Discovery Menus (ColorPicker) - Rendered outside nested glass for backdrop-filter issues */}
      {!isDragging && showDiscovery && (
        <div style={{
          position: 'absolute',
          zIndex: 6000,
          pointerEvents: 'auto',
          ...(orientation === 'horizontal'
            ? {
              left: '50%', transform: 'translateX(-50%)',
              ...(isTopSide ? { top: 'calc(100% + 80px)' } : { bottom: 'calc(100% + 80px)' })
            }
            : {
              top: '50%', transform: 'translateY(-50%)',
              ...(isLeftSide ? { left: 'calc(100% + 80px)' } : { right: 'calc(100% + 80px)' })
            }
          )
        }}>
          <ColorPicker
            color={showDiscovery === 'pen' ? penConfig.color : highlighterConfig.color}
            onChange={(color) => {
              if (showDiscovery === 'pen') setPenConfig(prev => ({ ...prev, color }));
              else setHighlighterConfig(prev => ({ ...prev, color }));
            }}
            onComplete={(color) => {
              onColorChange(color);
              setShowDiscovery(null);
            }}
            recentColors={recentColors}
            colorIdeas={colorIdeas}
          />
        </div>
      )}

      <div className="glass-extreme" style={{
        display: 'flex',
        flexDirection: orientation === 'horizontal' ? 'row' : 'column',
        padding: '6px',
        borderRadius: '9999px',
        width: isDragging ? '48px' : 'auto',
        height: isDragging ? '48px' : 'auto',
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'auto',
        gap: isDragging ? '0' : '4px',
        transition: 'all 0.4s cubic-bezier(0.19, 1, 0.22, 1)',
        overflow: isDragging ? 'hidden' : 'visible'
      }}>
        {/* Handle - Always visible, position managed by flexDirection */}
        <div className="drag-handle liquid-item" style={{
          padding: '8px', cursor: 'grab',
          color: isDragging ? 'var(--accent-color)' : 'rgba(255,255,255,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          borderRadius: '50%'
        }}>
          <Icons.Menu />
        </div>

        {/* Tools - Hidden during dragging */}
        {!isDragging && (
          <div style={{
            display: 'flex',
            flexDirection: orientation === 'horizontal' ? 'row' : 'column',
            alignItems: 'center',
            gap: '4px',
            opacity: 1,
            transition: 'opacity 0.2s'
          }}>
            <input type="file" accept="application/pdf" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />

            <ToolbarButton icon={Icons.Cursor} label="Cursor" isActive={activeTool === 'cursor'} onClick={() => { setActiveTool('cursor'); closeAllSubMenus(); }} />
            <ToolbarButton icon={Icons.AI} label="AI" isActive={activeTool === 'ai-lasso'} onClick={() => { setActiveTool('ai-lasso'); closeAllSubMenus(); }} />

            <div style={{ width: orientation === 'horizontal' ? '1px' : '12px', height: orientation === 'horizontal' ? '12px' : '1px', background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <button
                onClick={() => toggleSubMenu('plus')}
                className={`liquid-button glass-extreme ${showAddInMenu ? 'active' : ''}`}
                style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: showAddInMenu ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
                  border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transform: showAddInMenu ? 'rotate(135deg)' : 'rotate(0deg)'
                }}
              >
                <Icons.Plus />
              </button>
              <div style={{
                position: 'absolute',
                bottom: orientation === 'horizontal' ? (isTopSide ? 'auto' : 'calc(100% + 12px)') : 'auto',
                top: orientation === 'horizontal' ? (isTopSide ? 'calc(100% + 12px)' : 'auto') : '50%',
                left: orientation === 'vertical' ? (isLeftSide ? 'calc(100% + 12px)' : 'auto') : '50%',
                right: orientation === 'vertical' ? (isLeftSide ? 'auto' : 'calc(100% + 12px)') : 'auto',
                transform: orientation === 'horizontal'
                  ? `translateX(-50%) translateY(${showAddInMenu ? '0' : (isTopSide ? '-12px' : '12px')}) scale(${showAddInMenu ? '1' : '0.8'})`
                  : `translateY(-50%) translateX(${showAddInMenu ? '0' : (isLeftSide ? '-12px' : '12px')}) scale(${showAddInMenu ? '1' : '0.8'})`,
                opacity: showAddInMenu ? 1 : 0, pointerEvents: showAddInMenu ? 'auto' : 'none',
                display: 'flex', flexDirection: orientation === 'horizontal' ? 'row' : 'column',
                gap: '8px', padding: '8px', borderRadius: '16px',
                transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)', zIndex: 10
              }} className="glass-extreme">
                <ToolbarButton icon={Icons.Type} label="Texto" isActive={activeTool === 'text'} onClick={() => { setActiveTool('text'); setShowAddInMenu(false); }} />
                <ToolbarButton icon={Icons.Math} label="Fórmula" isActive={activeTool === 'math'} onClick={() => { setActiveTool('math'); setShowAddInMenu(false); }} />
                <ToolbarButton icon={Icons.Code} label="GGB" isActive={activeTool === 'ggb'} onClick={() => { setActiveTool('ggb'); setShowAddInMenu(false); }} />
                <ToolbarButton icon={Icons.Mermaid} label="Diagram" isActive={activeTool === 'mermaid'} onClick={() => { setActiveTool('mermaid'); setShowAddInMenu(false); }} />
                <ToolbarButton icon={Icons.Mindmap} label="Mindmap" isActive={activeTool === 'mindmap'} onClick={() => { setActiveTool('mindmap'); setShowAddInMenu(false); }} />
              </div>
            </div>

            <div style={{ width: orientation === 'horizontal' ? '1px' : '12px', height: orientation === 'horizontal' ? '12px' : '1px', background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

            <ToolbarButton icon={Icons.Pen} label="Caneta" isActive={activeTool === 'pen'} onClick={() => { setActiveTool('pen'); setPenType('pen'); closeAllSubMenus(); }} />
            <ToolbarButton icon={Icons.Highlighter} label="Marca-texto" isActive={activeTool === 'highlighter'} onClick={() => { setActiveTool('highlighter'); setPenType('highlighter'); closeAllSubMenus(); }} />
            <ToolbarButton icon={Icons.Eraser} label="Borracha" isActive={activeTool === 'eraser'} onClick={() => { setActiveTool('eraser'); closeAllSubMenus(); }} />

            <div style={{ width: orientation === 'horizontal' ? '1px' : '12px', height: orientation === 'horizontal' ? '12px' : '1px', background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

            <ToolbarButton icon={Icons.Shapes} label="Formas" isActive={showShapeMenu} onClick={() => toggleSubMenu('shape')} />
            <ToolbarButton icon={Icons.Paper} label="Fundo" isActive={showPaperMenu} onClick={() => toggleSubMenu('paper')} />
          </div>
        )}

      </div>
    </div >
  );
};

export default FloatingToolbar;