import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import NoteWorkspace from './components/NoteWorkspace';
import FloatingToolbar from './components/FloatingToolbar';
import SettingsModal from './components/SettingsModal';
import ContextMenu from './components/ContextMenu';
import TabBar from './components/TabBar';
import { NotesProvider, useNotes } from './contexts/NotesContext';
import { generateId } from './utils/id';
import './styles/global.css';
import CommandBar from './components/CommandBar';
import CommandPalette from './components/CommandPalette';
import GraphView from './components/GraphView';

function AppContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('connected-notes-sidebar-open');
    return saved === null ? true : saved === 'true';
  });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isGraphViewOpen, setIsGraphViewOpen] = useState(false);
  const [activeTool, setActiveTool] = useState(() => {
    return localStorage.getItem('connected-notes-active-tool') || 'cursor';
  });
  const [pdfToImport, setPdfToImport] = useState(null);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, note }
  const canvasRef = useRef(null);
  const workspaceRef = useRef(null);

  // Tab management from context
  const { openTabs, selectNote, closeTab, activeNoteId, addNote, restoreTab, activeNote } = useNotes();

  // Register global context menu handler
  useEffect(() => {
    window.showNoteContextMenu = (x, y, note) => {
      setContextMenu({ x, y, note });
    };
    return () => { window.showNoteContextMenu = null; };
  }, []);

  // Global Key Listener for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K - Toggle Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
        return;
      }

      // Ctrl+F - Toggle search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
        return;
      }

      // Ctrl+G - Toggle Graph View
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        setIsGraphViewOpen(prev => !prev);
        return;
      }

      // Ctrl+W - Close current tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        if (activeNoteId) closeTab(activeNoteId);
        return;
      }

      // Ctrl+T - New tab (creates new canvas note)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 't') {
        e.preventDefault();
        addNote('root', 'canvas');
        return;
      }

      // Ctrl+Shift+T - Restore closed tab
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        restoreTab();
        return;
      }

      // Ctrl+Tab / Ctrl+Shift+Tab - Navigate tabs
      if ((e.ctrlKey || e.metaKey) && e.key === 'Tab') {
        e.preventDefault();
        if (openTabs.length <= 1) return;
        const currentIndex = openTabs.indexOf(activeNoteId);
        let nextIndex;
        if (e.shiftKey) {
          nextIndex = currentIndex <= 0 ? openTabs.length - 1 : currentIndex - 1;
        } else {
          nextIndex = currentIndex >= openTabs.length - 1 ? 0 : currentIndex + 1;
        }
        selectNote(openTabs[nextIndex]);
        return;
      }

      // Ctrl+1-9 - Jump to specific tab
      if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const tabIndex = parseInt(e.key) - 1;
        if (tabIndex < openTabs.length) {
          selectNote(openTabs[tabIndex]);
        }
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeNoteId, openTabs, selectNote, closeTab, addNote, restoreTab]);

  // ... (rest of effects)



  const [penConfig, setPenConfig] = useState(() => {
    const saved = localStorage.getItem('connected-notes-pen-config');
    return saved ? JSON.parse(saved) : { color: '#1e293b', width: 3 };
  });

  const [highlighterConfig, setHighlighterConfig] = useState(() => {
    const saved = localStorage.getItem('connected-notes-highlighter-config');
    return saved ? JSON.parse(saved) : { color: '#eab308', width: 20 };
  });

  // Keep penType separate as it tracks the "mode" of the pen tool (e.g. if we add different brush types later)
  // For now, it mostly mirrors activeTool but can be useful.
  const [penType, setPenType] = useState(() => {
    return localStorage.getItem('connected-notes-pen-type') || 'pen';
  });

  // Removido paperPattern local, agora vem do contexto/nota
  const [paperPatternLocal, setPaperPatternLocal] = useState('dots'); // Apenas para UI inicial da Toolbar

  // --- Configurações & API ---
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('connected-notes-api-key') || '';
  });

  const [appearance, setAppearance] = useState(() => {
    const saved = localStorage.getItem('connected-notes-appearance-settings');
    return saved ? JSON.parse(saved) : {
      fontSize: 14,
      accentColor: '#6366f1',
      sidebarWidth: 260,
      animationsEnabled: true,
      backgroundGradient: true,
    };
  });

  useEffect(() => {
    localStorage.setItem('connected-notes-api-key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    document.documentElement.style.setProperty('--base-font-size', `${appearance.fontSize}px`);
    document.documentElement.style.setProperty('--sidebar-width', `${appearance.sidebarWidth}px`);
    document.documentElement.style.setProperty('--animation-duration', appearance.animationsEnabled ? '0.2s' : '0s');
    if (appearance.backgroundGradient) {
      document.body.classList.add('gradient-enabled');
    } else {
      document.body.classList.remove('gradient-enabled');
    }
  }, [appearance]);

  // --- UI State (Lifting from NoteWorkspace) ---
  const [isMiniMapEnabled, setIsMiniMapEnabled] = useState(() => {
    const saved = localStorage.getItem('connected-notes-minimap-enabled');
    return saved === null ? true : saved === 'true';
  });
  const [showTagPopover, setShowTagPopover] = useState(false);
  const [activeForcedShape, setActiveForcedShape] = useState(null); // 'triangle', 'rectangle', 'circle', 'ellipse', 'line', 'arrow'

  const sidebarRef = useRef(null);

  // Click away to close sidebar
  useEffect(() => {
    const handleClickOutside = (e) => {
      // If sidebar is open and we click outside sidebar AND outside the toggle buttons (often in TabBar)
      if (isSidebarOpen && sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        // Check if we are clicking a sidebar toggle button (to avoid double toggle)
        if (!e.target.closest('.sidebar-toggle-btn')) {
          setIsSidebarOpen(false);
        }
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [isSidebarOpen]);

  // --- Presets ---
  const [toolPresets, setToolPresets] = useState(() => {
    const saved = localStorage.getItem('connected-notes-tool-presets');
    const defaultPresets = [
      { id: 'def-white', type: 'pen', color: '#ffffff', width: 3 },
      { id: 'def-black', type: 'pen', color: '#000000', width: 3 },
      { id: 'def-red', type: 'pen', color: '#ef4444', width: 3 },
      { id: 'def-green', type: 'pen', color: '#22c55e', width: 3 },
      { id: 'def-blue', type: 'pen', color: '#3b82f6', width: 3 },
      { id: 'h1', type: 'highlighter', color: '#eab308', width: 20 }
    ];

    if (!saved) return defaultPresets;

    try {
      const parsed = JSON.parse(saved);
      // Migration: ensure default colors exist if the user has presets but maybe deleted the defaults
      const hasDefaultWhite = parsed.some(p => p.color === '#ffffff' && p.type === 'pen');
      if (!hasDefaultWhite) {
        // Safe check for startsWith by converting to string
        return [...defaultPresets, ...parsed.filter(p => !String(p.id).startsWith('def-'))];
      }
      return parsed;
    } catch (e) {
      console.error('Error parsing presets:', e);
      return defaultPresets;
    }
  });

  const [recentColors, setRecentColors] = useState(() => {
    const saved = localStorage.getItem('connected-notes-recent-colors');
    return saved ? JSON.parse(saved) : ['#f472b6', '#8b5cf6', '#0ea5e9'];
  });

  const COLOR_IDEAS = [
    { name: 'Pastel', colors: ['#ffb7b2', '#ffdac1', '#e2f0cb', '#b5ead7', '#c7ceea'] },
    { name: 'Terra', colors: ['#4a3728', '#8b4513', '#d2b48c', '#556b2f', '#bc8f8f'] },
    { name: 'Fogo', colors: ['#991b1b', '#dc2626', '#ea580c', '#f59e0b', '#facc15'] },
    { name: 'Oceano', colors: ['#0c4a6e', '#0369a1', '#0284c7', '#0ea5e9', '#38bdf8'] }
  ];

  /* --- Theme State Management --- */
  const [currentTheme, setCurrentTheme] = useState(() => {
    const saved = localStorage.getItem('connected-notes-theme');
    // Migration: Handle old boolean-like values
    if (saved === 'true' || saved === 'dark') return 'dark';
    if (saved === 'false' || saved === 'light') return 'light';
    return saved || 'light';
  });

  const [customThemes, setCustomThemes] = useState(() => {
    const saved = localStorage.getItem('connected-notes-saved-themes');
    return saved ? JSON.parse(saved) : [];
  });

  // Derived boolean for UI logic
  // If standard theme, check list. If custom, check if it's in the array (and assume dark for now, or check luminance later)
  const isStandardDark = ['dark', 'nord', 'gruvbox', 'dracula', 'midnight'].includes(currentTheme);
  const isCustomTheme = !['light', 'dark', 'nord', 'gruvbox', 'dracula', 'midnight'].includes(currentTheme);
  const isDarkMode = isStandardDark || isCustomTheme; // Simplify: Custom themes behave as dark mode for now

  useEffect(() => {
    localStorage.setItem('connected-notes-theme', currentTheme);
    document.body.setAttribute('data-theme', currentTheme);

    // Legacy support: clean up old class if exists
    document.body.classList.remove('dark-mode');

    // Handle Custom Theme Injection
    if (isCustomTheme) {
      const activeCustomTheme = customThemes.find(t => t.id === currentTheme);

      if (activeCustomTheme) {
        const { bg, text, accent } = activeCustomTheme.colors;
        const root = document.documentElement;

        // Helper to convert hex to rgba for opacity
        const hexToRgba = (hex, alpha) => {
          let r = 0, g = 0, b = 0;
          if (!hex) return `rgba(0,0,0,${alpha})`; // Fallback

          if (hex.length === 4) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
          } else if (hex.length === 7) {
            r = parseInt(hex[1] + hex[2], 16);
            g = parseInt(hex[3] + hex[4], 16);
            b = parseInt(hex[5] + hex[6], 16);
          }
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        root.style.setProperty('--bg-color', bg);
        root.style.setProperty('--sidebar-bg', hexToRgba(bg, 0.6));
        root.style.setProperty('--canvas-bg-color', hexToRgba(bg, 0.4));

        root.style.setProperty('--text-primary', text);
        root.style.setProperty('--text-secondary', hexToRgba(text, 0.7));

        root.style.setProperty('--accent-color', accent);
        root.style.setProperty('--accent-glow', hexToRgba(accent, 0.5));

        root.style.setProperty('--border-color', hexToRgba(text, 0.1));
        root.style.setProperty('--glass-bg', hexToRgba(bg, 0.7));

        root.style.setProperty('--bg-gradient', `linear-gradient(135deg, ${bg}, ${hexToRgba(bg, 0.8)})`);

        // Graph View Specifics for Custom Themes
        root.style.setProperty('--graph-edge-tag', hexToRgba(accent, 0.2));
        root.style.setProperty('--graph-edge-hier', hexToRgba(accent, 0.4));
        // Use a slightly more solid version of the theme background for the node itself
        root.style.setProperty('--node-bg', hexToRgba(bg, 1));
      }
    } else {
      // Clean up inline styles if switching back to preset
      const root = document.documentElement;
      [
        '--bg-color', '--sidebar-bg', '--canvas-bg-color',
        '--text-primary', '--text-secondary',
        '--accent-color', '--accent-glow',
        '--border-color', '--glass-bg', '--bg-gradient',
        '--graph-edge-tag', '--graph-edge-hier', '--node-bg'
      ].forEach(prop => root.style.removeProperty(prop));
    }

    // Removal of auto-contrast logic as it interferes with manual color selection
  }, [currentTheme, customThemes, isCustomTheme, isDarkMode]);

  // Persist Custom Themes whenever they change
  useEffect(() => {
    localStorage.setItem('connected-notes-saved-themes', JSON.stringify(customThemes));
  }, [customThemes]);

  // --- Persistence Effects ---
  useEffect(() => { localStorage.setItem('connected-notes-sidebar-open', isSidebarOpen); }, [isSidebarOpen]);
  useEffect(() => { localStorage.setItem('connected-notes-active-tool', activeTool); }, [activeTool]);
  useEffect(() => { localStorage.setItem('connected-notes-minimap-enabled', isMiniMapEnabled); }, [isMiniMapEnabled]);
  useEffect(() => { localStorage.setItem('connected-notes-pen-config', JSON.stringify(penConfig)); }, [penConfig]);
  useEffect(() => { localStorage.setItem('connected-notes-highlighter-config', JSON.stringify(highlighterConfig)); }, [highlighterConfig]);
  useEffect(() => { localStorage.setItem('connected-notes-pen-type', penType); }, [penType]);
  useEffect(() => { localStorage.setItem('connected-notes-tool-presets', JSON.stringify(toolPresets)); }, [toolPresets]);
  useEffect(() => { localStorage.setItem('connected-notes-recent-colors', JSON.stringify(recentColors)); }, [recentColors]);

  const addToRecentColors = (color) => {
    setRecentColors(prev => {
      const inPresets = toolPresets.some(p => p.color.toLowerCase() === color.toLowerCase());
      if (inPresets) return prev;
      const filtered = prev.filter(c => c.toLowerCase() !== color.toLowerCase());
      return [color, ...filtered].slice(0, 10);
    });
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Command Palette Handler
  const handleCommandExecute = (commandId) => {
    switch (commandId) {
      case 'open-search':
        setIsSearchOpen(true);
        break;
      case 'close-tab':
        if (activeNoteId) closeTab(activeNoteId);
        break;
      case 'undo':
        if (canvasRef.current?.undo) canvasRef.current.undo();
        break;
      case 'redo':
        if (canvasRef.current?.redo) canvasRef.current.redo();
        break;
      case 'select-all':
        // This is handled by CanvasArea internally
        break;
      case 'duplicate':
        // This is handled by CanvasArea internally
        break;
      case 'toggle-sidebar':
        toggleSidebar();
        break;
      case 'toggle-minimap':
        setIsMiniMapEnabled(prev => !prev);
        break;
      case 'zoom-in':
      case 'zoom-out':
      case 'zoom-reset':
        // These are handled by NoteWorkspace
        break;
      case 'toggle-gradient':
        const isGradientEnabled = document.body.classList.contains('gradient-enabled');
        if (isGradientEnabled) {
          document.body.classList.remove('gradient-enabled');
          localStorage.setItem('connected-notes-gradient', 'false');
        } else {
          document.body.classList.add('gradient-enabled');
          localStorage.setItem('connected-notes-gradient', 'true');
        }
        break;
      case 'open-settings':
        setIsSettingsOpen(true);
        break;
      case 'open-graph-view':
        setIsGraphViewOpen(true);
        break;
      case 'export-data':
      case 'import-data':
        // These will be handled by SettingsModal
        setIsSettingsOpen(true);
        break;
      default:
        console.log('Command not implemented:', commandId);
    }
  };

  // Toolbar Toggle: Switches between simple Light <-> Dark
  // (Full selection available in Settings)
  const toggleTheme = () => setCurrentTheme(prev => isDarkMode ? 'light' : 'dark');

  const handleImportPDF = (file) => setPdfToImport(file);
  const onPdfImported = () => setPdfToImport(null);

  const addPreset = (forcedType) => {
    const typeToUse = forcedType || activeTool;

    let colorToSave, widthToSave;
    if (typeToUse === 'pen') {
      colorToSave = penConfig.color;
      widthToSave = penConfig.width;
    } else {
      colorToSave = highlighterConfig.color;
      widthToSave = highlighterConfig.width;
    }

    const newPreset = { id: generateId(), type: typeToUse, color: colorToSave, width: widthToSave };

    setToolPresets(prev => {
      const exists = prev.some(p => p.color === colorToSave && p.width === widthToSave && p.type === typeToUse);
      if (exists) return prev;
      return [...prev, newPreset];
    });
  };

  const removePreset = (id) => setToolPresets(prev => prev.filter(p => p.id !== id));

  const updatePreset = (id, newConfig) => {
    setToolPresets(prev => prev.map(p => p.id === id ? { ...p, ...newConfig } : p));
  };

  const selectPreset = (preset) => {
    setPenType(preset.type);
    setActiveTool(preset.type);

    if (preset.type === 'pen') {
      setPenConfig({ color: preset.color, width: preset.width });
    } else if (preset.type === 'highlighter') {
      setHighlighterConfig({ color: preset.color, width: preset.width });
    }
  };

  return (
    <div className="app-container">
      {/* ====== LAYER 1: Dynamic Background ====== */}
      <div className="dynamic-bg">
        <div className="blob blob-violet" />
        <div className="blob blob-cyan" />
        <div className="blob blob-fuchsia" />
        <div className="noise-overlay" />
      </div>

      {/* ====== LAYER 2: Canvas (full-screen) ====== */}
      <div className="canvas-layer">
        <NoteWorkspace
          ref={workspaceRef}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          isDarkMode={isDarkMode}
          pdfToImport={pdfToImport}
          onPdfImported={onPdfImported}
          penConfig={penConfig}
          highlighterConfig={highlighterConfig}
          penType={penType}
          apiKey={apiKey}
          onOpenSettings={() => setIsSettingsOpen(true)}
          canvasRef={canvasRef}
          isMiniMapEnabled={isMiniMapEnabled}
          activeForcedShape={activeForcedShape}
          setActiveForcedShape={setActiveForcedShape}
        />
      </div>

      {/* ====== LAYER 3: Floating UI (pointer-events: none) ====== */}
      <div className="ui-layer">
        {/* Sidebar Pill */}
        <div ref={sidebarRef} className={`sidebar-pill glass-extreme ${isSidebarOpen ? '' : 'closed'}`}>
          <Sidebar
            onOpenSearch={() => setIsSearchOpen(true)}
            onToggleTheme={toggleTheme}
            onOpenSettings={() => setIsSettingsOpen(true)}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Tab Bar Pill */}
        <TabBar
          isMiniMapEnabled={isMiniMapEnabled}
          setIsMiniMapEnabled={setIsMiniMapEnabled}
          showTagPopover={showTagPopover}
          setShowTagPopover={setShowTagPopover}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={toggleSidebar}
        />

        {/* Floating Toolbar Pill — only on canvas notes */}
        {activeNote?.type === 'canvas' && (
          <FloatingToolbar
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={toggleSidebar}
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            isDarkMode={isDarkMode}
            onToggleTheme={toggleTheme}
            onImportPDF={handleImportPDF}
            onOpenSettings={() => setIsSettingsOpen(true)}
            penConfig={penConfig} setPenConfig={setPenConfig}
            highlighterConfig={highlighterConfig} setHighlighterConfig={setHighlighterConfig}
            penType={penType} setPenType={setPenType}
            toolPresets={toolPresets}
            onAddPreset={addPreset}
            onRemovePreset={removePreset}
            onSelectPreset={selectPreset}
            onUpdatePreset={updatePreset}
            sidebarWidth={isSidebarOpen ? appearance.sidebarWidth : 0}
            recentColors={recentColors}
            colorIdeas={COLOR_IDEAS}
            onColorChange={addToRecentColors}
            paperPattern={paperPatternLocal}
            setPaperPattern={setPaperPatternLocal}
            activeForcedShape={activeForcedShape}
            setActiveForcedShape={setActiveForcedShape}
          />
        )}
      </div>

      {/* ====== Global Overlays ====== */}
      <CommandBar isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        setApiKey={setApiKey}
        currentTheme={currentTheme}
        setTheme={setCurrentTheme}
        customThemes={customThemes}
        setCustomThemes={setCustomThemes}
        appearance={appearance}
        setAppearance={setAppearance}
      />

      {
        contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            note={contextMenu.note}
            onClose={() => setContextMenu(null)}
            canvasRef={canvasRef}
            captureNote={workspaceRef.current?.captureNote}
            runExport={workspaceRef.current?.runExport}
          />
        )
      }

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onExecuteCommand={handleCommandExecute}
      />

      <GraphView
        isOpen={isGraphViewOpen}
        onClose={() => setIsGraphViewOpen(false)}
      />
    </div >
  );
}

function App() {
  return (
    <NotesProvider>
      <AppContent />
    </NotesProvider>
  );
}

export default App;