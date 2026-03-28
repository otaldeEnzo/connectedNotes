import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
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
  Math: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 7V4H6l6 8-6 8h12v-3"></path></svg>,
  PDF: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  Code: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"></path><path d="M18 9c-6 0-9 6-12 9" stroke="var(--accent-color)" strokeWidth="2.5"></path><circle cx="18" cy="9" r="2" fill="var(--accent-color)"></circle></svg>,
  Paper: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>,
  AI: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path></svg>,
  Sun: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="3"></line></svg>,
  Moon: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>,
  Settings: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
  Shapes: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="7" r="5"></circle><rect x="13" y="13" width="8" height="8" rx="1"></rect><path d="M12 2l3 5h-6l3-5z"></path></svg>,
  Plus: (props) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  ChevronUp: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>,
  Mermaid: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><path d="M10 6h4v4" opacity="0.5"></path><path d="M17 14v-4h-4" opacity="0.5"></path><path d="M7 10v4h4" opacity="0.5"></path></svg>,
  Mindmap: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2.5"></circle><path d="M12 9.5V5M12 14.5v4.5M14.5 12h4.5M9.5 12H5"></path><circle cx="12" cy="3" r="1.5" opacity="0.6"></circle><circle cx="12" cy="21" r="1.5" opacity="0.6"></circle><circle cx="21" cy="12" r="1.5" opacity="0.6"></circle><circle cx="3" cy="12" r="1.5" opacity="0.6"></circle></svg>,
  Rectangle: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect></svg>,
  Circle: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"></circle></svg>,
  Ellipse: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="12" rx="10" ry="6"></ellipse></svg>,
  ArrowHead: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-7-7l7 7-7 7" /></svg>,
  LineHead: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  Pentagon: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l9 7-3 12H6l-3-12 9-7z" /></svg>,
  Hexagon: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l8.66 5v10L12 22l-8.66-5V7L12 2z" /></svg>,
  Octagon: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="7 2h10l5 5v10l-5 5H7l-5-5V7l5-5z" /></svg>,
  Diamond: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l10 10-10 10-10-10z" /></svg>,
  Maximize: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>,
  DynamicPen: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
      <path d="M2.5 13.5l1.5-1.5m4-4l1.5-1.5" stroke="var(--accent-color)" opacity="0.6" />
      <circle cx="11" cy="11" r="1.5" fill="var(--accent-color)" />
      <path d="M20 4l-1 1m0-1l1 1" stroke="var(--accent-color)" />
    </svg>
  )
};

// --- Componentes Locais ---

const ToolbarButton = ({ icon: Icon, label, onClick, isActive, color, className = "", style = {}, toolId }) => {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const handleShortcut = (e) => {
      if (e.detail?.tool === toolId) {
        setPulse(true);
        setTimeout(() => setPulse(false), 600);
      }
    };
    window.addEventListener('toolShortcutTriggered', handleShortcut);
    return () => window.removeEventListener('toolShortcutTriggered', handleShortcut);
  }, [toolId]);

  return (
    <button
      onClick={onClick}
      title={label}
      className={`liquid-item toolbar-btn ${isActive ? 'active' : ''} ${pulse ? 'shortcut-pulse' : ''} ${className}`}
      style={{
        background: isActive ? 'var(--accent-gradient)' : 'transparent',
        border: 'none',
        borderRadius: '10px',
        padding: '8px',
        margin: '0 1px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: (isActive || pulse) ? '#ffffff' : 'var(--text-primary)',
        opacity: (isActive || pulse) ? 1 : 0.6,
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow: pulse ? '0 0 25px var(--accent-glow)' : (isActive ? '0 0 16px rgba(124, 58, 237, 0.5)' : 'none'),
        transform: pulse ? 'scale(1.2)' : 'scale(1)',
      }}
      onMouseEnter={(e) => {
        if (!isActive && !pulse) {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.backgroundColor = 'var(--glass-surface-focus)';
          e.currentTarget.style.opacity = '1';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive && !pulse) {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.opacity = '0.6';
        }
      }}
    >
      <Icon />
    </button>
  );
};

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
  const { activeNoteId, activeNote, updateNoteBackground, updateNoteBackgroundSize, setDefaultBackground, updateNoteContent } = useNotes();
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);
  const mainBarRef = useRef(null);
  const plusBtnRef = useRef(null);
  const [plusMenuPos, setPlusMenuPos] = useState(null);

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
  const [orientation, setOrientation] = useState(() => {
    return localStorage.getItem('connected-notes-toolbar-orientation') || 'horizontal';
  });

  // New positioning strategy: Save side + distance to edge
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('connected-notes-toolbar-anchor');
    if (saved) {
      const anchor = JSON.parse(saved);
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      let x = winW / 2;
      let y = winH - 60;

      if (anchor.sideX === 'left') x = anchor.offsetX;
      else if (anchor.sideX === 'right') x = winW - anchor.offsetX;

      if (anchor.sideY === 'top') y = anchor.offsetY;
      else if (anchor.sideY === 'bottom') y = winH - anchor.offsetY;

      return { x, y };
    }
    return { x: window.innerWidth / 2, y: window.innerHeight - 60 };
  });

  // Keep position updated during resize using the same anchor logic
  useEffect(() => {
    const handleResize = () => {
      const saved = localStorage.getItem('connected-notes-toolbar-anchor');
      if (saved) {
        const anchor = JSON.parse(saved);
        const winW = window.innerWidth;
        const winH = window.innerHeight;

        setPosition(prev => {
          let x = prev.x;
          let y = prev.y;

          if (anchor.sideX === 'left') x = anchor.offsetX;
          else if (anchor.sideX === 'right') x = winW - anchor.offsetX;

          if (anchor.sideY === 'top') y = anchor.offsetY;
          else if (anchor.sideY === 'bottom') y = winH - anchor.offsetY;

          return { x, y };
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
  }, [sidebarWidth, isDragging, orientation]);

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

  // Monitoramento do Tema para Caneta Dinâmica
  useEffect(() => {
    if (penConfig.isDynamic) {
      const newAutoColor = isDarkMode ? '#f8fafc' : '#0f172a';
      if (penConfig.color !== newAutoColor) {
        setPenConfig(prev => ({ ...prev, color: newAutoColor }));
      }
    }
  }, [isDarkMode, penConfig.isDynamic, setPenConfig]);

  // Close ColorPicker on tool change
  useEffect(() => {
    setShowDiscovery(null);
  }, [activeTool]);

  const handlePointerDown = (e) => {
    if (!e.target.closest('.drag-handle')) return;
    setIsDragging(true);
    closeAllSubMenus();
    setShowDiscovery(null);
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

    // Save Anchor Logic (Distance to closest edge)
    const sideX = (snappedX < winW / 2) ? 'left' : 'right';
    const sideY = (snappedY < winH / 2) ? 'top' : 'bottom';

    const anchor = {
      sideX,
      sideY,
      offsetX: sideX === 'left' ? snappedX : winW - snappedX,
      offsetY: sideY === 'top' ? snappedY : winH - snappedY
    };

    localStorage.setItem('connected-notes-toolbar-anchor', JSON.stringify(anchor));
    localStorage.setItem('connected-notes-toolbar-orientation', snappedOrientation);

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
      {/* Menu de Extras (+) */}
      {!isDragging && showAddInMenu && (
        <div className="glass-extreme" style={{
          padding: '10px', borderRadius: '18px',
          display: 'flex',
          flexDirection: orientation === 'horizontal' ? 'row' : 'column',
          gap: '10px', alignItems: 'center',
          pointerEvents: 'auto',
          position: 'absolute',
          opacity: isDragging ? 0.4 : 1,
          ...(orientation === 'horizontal'
            ? {
                left: '50%', transform: 'translateX(-50%)',
                ...(isTopSide ? { top: 'calc(100% + 16px)', animation: 'moscaro-in-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' } : { bottom: 'calc(100% + 16px)', animation: 'moscaro-in-down 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' })
              }
            : {
                top: '50%', transform: 'translateY(-50%)',
                ...(isLeftSide ? { left: 'calc(100% + 16px)', animation: 'moscaro-in-right 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' } : { right: 'calc(100% + 16px)', animation: 'moscaro-in-left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' })
              }
          ),
          justifyContent: 'center',
          zIndex: 6100,
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4)'
        }}>
          <ToolbarButton toolId="text" icon={Icons.Type} label="Texto" isActive={activeTool === 'text'} onClick={() => { setActiveTool('text'); setShowAddInMenu(false); }} />
          <ToolbarButton toolId="math" icon={Icons.Math} label="Fórmula" isActive={activeTool === 'math'} onClick={() => { setActiveTool('math'); setShowAddInMenu(false); }} />
          <ToolbarButton toolId="ggb" icon={Icons.Code} label="GGB" isActive={activeTool === 'ggb'} onClick={() => { setActiveTool('ggb'); setShowAddInMenu(false); }} />
          <ToolbarButton toolId="mermaid" icon={Icons.Mermaid} label="Diagram" isActive={activeTool === 'mermaid'} onClick={() => { setActiveTool('mermaid'); setShowAddInMenu(false); }} />
          <ToolbarButton toolId="mindmap" icon={Icons.Mindmap} label="Mindmap" isActive={activeTool === 'mindmap'} onClick={() => { setActiveTool('mindmap'); setShowAddInMenu(false); }} />
          <ToolbarButton toolId="pdf" icon={Icons.PDF} label="Inserir PDF" isActive={false} onClick={() => { handlePdfClick(); setShowAddInMenu(false); }} />
        </div>
      )}

      {/* Menu de Formas */}
      {!isDragging && showShapeMenu && (
        <div className="glass-extreme" style={{
          padding: '10px', borderRadius: '18px',
          display: 'flex',
          flexDirection: orientation === 'horizontal' ? 'row' : 'column',
          gap: '8px', alignItems: 'center',
          pointerEvents: 'auto',
          position: 'absolute',
          opacity: isDragging ? 0.4 : 1,
          ...(orientation === 'horizontal'
            ? {
              left: '50%', transform: 'translateX(-50%)',
              ...(isTopSide ? { top: 'calc(100% + 16px)', animation: 'moscaro-in-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' } : { bottom: 'calc(100% + 16px)', animation: 'moscaro-in-down 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' })
            }
            : {
              top: '50%', transform: 'translateY(-50%)',
              ...(isLeftSide ? { left: 'calc(100% + 16px)', animation: 'moscaro-in-right 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' } : { right: 'calc(100% + 16px)', animation: 'moscaro-in-left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' })
            }
          ),
          justifyContent: 'center',
          zIndex: 6100,
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4)'
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
          padding: '12px', borderRadius: '20px',
          display: 'flex',
          flexDirection: orientation === 'horizontal' ? 'row' : 'column',
          gap: '12px',
          pointerEvents: 'auto',
          position: 'absolute',
          opacity: isDragging ? 0.4 : 1,
          ...(orientation === 'horizontal'
            ? {
              left: '50%', transform: 'translateX(-50%)',
              ...(isTopSide ? { top: 'calc(100% + 16px)', animation: 'moscaro-in-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' } : { bottom: 'calc(100% + 16px)', animation: 'moscaro-in-down 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' })
            }
            : {
              top: '50%', transform: 'translateY(-50%)',
              ...(isLeftSide ? { left: 'calc(100% + 16px)', animation: 'moscaro-in-right 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' } : { right: 'calc(100% + 16px)', animation: 'moscaro-in-left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' })
            }
          ),
          justifyContent: 'center',
          zIndex: 6100,
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4)'
        }}>
          <div style={{ display: 'flex', flexDirection: orientation === 'horizontal' ? 'row' : 'column', gap: '8px' }}>
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
                  background: (activeNote?.content?.background || 'dots') === p.id ? 'var(--accent-color)' : 'transparent',
                  color: (activeNote?.content?.background || 'dots') === p.id ? 'white' : 'var(--text-primary)',
                  border: '1px solid var(--border-color)', borderRadius: '10px',
                  padding: '6px 12px', fontSize: '0.85rem', cursor: 'pointer'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {paperPattern !== 'blank' && (
            <>
              <div style={{ width: orientation === 'horizontal' ? '1px' : '80%', height: orientation === 'horizontal' ? '20px' : '1px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '2px' }}>
                {[
                  { label: 'P', value: 25, title: 'Baixo' },
                  { label: 'M', value: 45, title: 'Médio' },
                  { label: 'G', value: 80, title: 'Grande' }
                ].map((stage) => {
                  const isSelected = (activeNote?.content?.backgroundSize || 45) === stage.value;
                  return (
                    <button
                      key={stage.value}
                      onClick={() => activeNoteId && updateNoteBackgroundSize(activeNoteId, stage.value)}
                      title={stage.title}
                      style={{
                        padding: '4px 10px',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        background: isSelected ? 'var(--accent-gradient)' : 'transparent',
                        color: isSelected ? 'white' : 'rgba(255,255,255,0.5)',
                        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        minWidth: '28px'
                      }}
                    >
                      {stage.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Menu de Caneta (Exclusivo) */}
      {!isDragging && (activeTool === 'pen' || activeTool === 'highlighter') && !showPaperMenu && !showShapeMenu && !showAddInMenu && (
        <div className="glass-extreme" style={{
          padding: '8px 14px', borderRadius: '18px',
          display: 'flex',
          flexDirection: orientation === 'horizontal' ? 'row' : 'column',
          alignItems: 'center', gap: '12px',
          whiteSpace: 'nowrap',
          pointerEvents: 'auto',
          position: 'absolute',
          opacity: isDragging ? 0.4 : 1,
          ...(orientation === 'horizontal'
            ? {
              left: '50%', transform: 'translateX(-50%)',
              ...(isTopSide ? { top: 'calc(100% + 16px)', animation: 'moscaro-in-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' } : { bottom: 'calc(100% + 16px)', animation: 'moscaro-in-down 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' })
            }
            : {
              top: '50%', transform: 'translateY(-50%)',
              ...(isLeftSide ? { left: 'calc(100% + 16px)', animation: 'moscaro-in-right 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' } : { right: 'calc(100% + 16px)', animation: 'moscaro-in-left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' })
            }
          ),
          zIndex: 6100,
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4)'
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
            {/* Caneta Dinâmica Moscaro (Fixa) */}
            <button
              onClick={() => {
                // Sincronização Imediata: A cor é definida baseada no tema ATUAL
                // Isso garante que a caneta já saia com a cor correta, evitando o flicker
                const currentAutoColor = isDarkMode ? '#f8fafc' : '#0f172a';
                setPenConfig({ color: currentAutoColor, width: penConfig.width, isDynamic: true });
                setActiveTool('pen');
              }}
              title="Caneta Dinâmica Moscaro (Contraste Adaptativo)"
              className="liquid-item"
              style={{
                width: '26px', height: '26px', borderRadius: '50%',
                background: penConfig.isDynamic ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
                margin: '2px',
                color: penConfig.isDynamic ? 'white' : 'var(--text-primary)',
                boxShadow: penConfig.isDynamic ? '0 4px 12px var(--accent-color-glow)' : 'none',
                transform: penConfig.isDynamic ? 'scale(1.1)' : 'scale(1)'
              }}
            >
              <Icons.DynamicPen />
            </button>

            <div style={{ width: orientation === 'horizontal' ? '1px' : '16px', height: orientation === 'horizontal' ? '16px' : '1px', background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />

            {toolPresets.filter(p => p.type === 'pen').map(p => (
              <ColorDot
                key={p.id}
                color={p.color}
                width={p.width}
                selected={!penConfig.isDynamic && penConfig.color === p.color && penConfig.width === p.width}
                onClick={() => onSelectPreset(p)}
                onRemove={() => onRemovePreset(p.id)}
                onEdit={(newColor) => onUpdatePreset(p.id, { color: newColor })}
              />
            ))}
            {!penConfig.isDynamic && (
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
            )}
          </div>
          {!penConfig.isDynamic && (
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
          )}

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

      <div
        ref={mainBarRef}
        className="glass-extreme" style={{
          position: 'relative',
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
          overflow: 'hidden'
        }}>
        {/* Handle - Always visible, position managed by flexDirection */}
        <div className="drag-handle liquid-item" style={{
          padding: '8px', cursor: 'grab',
          color: isDragging ? 'var(--accent-color)' : 'var(--text-primary)',
          opacity: isDragging ? 1 : 0.6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          borderRadius: '50%',
          transition: 'all 0.3s ease'
        }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => !isDragging && (e.currentTarget.style.opacity = '0.6')}
        >
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

            <ToolbarButton toolId="cursor" icon={Icons.Cursor} label="Cursor" isActive={activeTool === 'cursor'} onClick={() => { setActiveTool('cursor'); closeAllSubMenus(); }} />
            <ToolbarButton toolId="ai-lasso" icon={Icons.AI} label="AI" isActive={activeTool === 'ai-lasso'} onClick={() => { setActiveTool('ai-lasso'); closeAllSubMenus(); }} />

            <div style={{ width: orientation === 'horizontal' ? '1px' : '12px', height: orientation === 'horizontal' ? '12px' : '1px', background: 'var(--border-color)', margin: '0 4px', opacity: 0.5 }} />

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <button
                ref={plusBtnRef}
                onClick={() => toggleSubMenu('plus')}
                className={`liquid-button glass-extreme ${showAddInMenu ? 'active' : ''}`}
                style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: showAddInMenu ? 'var(--accent-gradient)' : 'var(--glass-surface)',
                  border: 'none', color: showAddInMenu ? 'white' : 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transform: showAddInMenu ? 'rotate(135deg)' : 'rotate(0deg)',
                  opacity: showAddInMenu ? 1 : 0.7
                }}
                onMouseEnter={(e) => { if (!showAddInMenu) { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.opacity = '1'; } }}
                onMouseLeave={(e) => { if (!showAddInMenu) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '0.7'; } }}
              >
                <Icons.Plus />
              </button>
            </div>

            <div style={{ width: orientation === 'horizontal' ? '1px' : '12px', height: orientation === 'horizontal' ? '12px' : '1px', background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

            <ToolbarButton toolId="pen" icon={Icons.Pen} label="Caneta" isActive={activeTool === 'pen'} onClick={() => { setActiveTool('pen'); setPenType('pen'); closeAllSubMenus(); }} />
            <ToolbarButton toolId="highlighter" icon={Icons.Highlighter} label="Marca-texto" isActive={activeTool === 'highlighter'} onClick={() => { setActiveTool('highlighter'); setPenType('highlighter'); closeAllSubMenus(); }} />
            <ToolbarButton toolId="eraser" icon={Icons.Eraser} label="Borracha" isActive={activeTool === 'eraser'} onClick={() => { setActiveTool('eraser'); closeAllSubMenus(); }} />

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