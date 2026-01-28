import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import CanvasArea from './components/CanvasArea';
import FloatingToolbar from './components/FloatingToolbar';
import SettingsModal from './components/SettingsModal';
import { NotesProvider } from './contexts/NotesContext';
import './styles/global.css';

function AppContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTool, setActiveTool] = useState('cursor');
  const [pdfToImport, setPdfToImport] = useState(null);
  
  // --- Estado da Caneta ---
  const [penColor, setPenColor] = useState('#1e293b');
  const [penWidth, setPenWidth] = useState(3);
  const [penType, setPenType] = useState('pen');

  // Removido paperPattern local, agora vem do contexto/nota
  const [paperPatternLocal, setPaperPatternLocal] = useState('dots'); // Apenas para UI inicial da Toolbar

  // --- Configurações & API ---
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('connected-notes-api-key') || '';
  });

  useEffect(() => {
    localStorage.setItem('connected-notes-api-key', apiKey);
  }, [apiKey]);

  // --- Presets ---
  const [toolPresets, setToolPresets] = useState([
    { id: 'p1', type: 'pen', color: '#1e293b', width: 3 },
    { id: 'p2', type: 'pen', color: '#ef4444', width: 3 },
    { id: 'h1', type: 'highlighter', color: '#eab308', width: 20 }
  ]);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('connected-notes-theme');
    return savedTheme === 'dark';
  });

  useEffect(() => {
    localStorage.setItem('connected-notes-theme', isDarkMode ? 'dark' : 'light');
    
    const defaultColor = isDarkMode ? '#f1f5f9' : '#1e293b';
    const inverseColor = isDarkMode ? '#1e293b' : '#f1f5f9';
    
    if (penColor === inverseColor) setPenColor(defaultColor);

    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const handleImportPDF = (file) => setPdfToImport(file);
  const onPdfImported = () => setPdfToImport(null);

  const addPreset = () => {
    const exists = toolPresets.some(p => p.color === penColor && p.width === penWidth && p.type === penType);
    if (exists) return;
    const newPreset = { id: Date.now(), type: penType, color: penColor, width: penWidth };
    setToolPresets([...toolPresets, newPreset]);
  };

  const removePreset = (id) => setToolPresets(prev => prev.filter(p => p.id !== id));

  const selectPreset = (preset) => {
    setPenType(preset.type);
    setPenColor(preset.color);
    setPenWidth(preset.width);
    setActiveTool(preset.type);
  };

  return (
    <div className="app-container">
      {isSidebarOpen && (
        <div className="sidebar-container">
          <Sidebar />
        </div>
      )}

      <main className="main-content">
        <FloatingToolbar 
          onToggleSidebar={toggleSidebar} 
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
          onImportPDF={handleImportPDF}
          onOpenSettings={() => setIsSettingsOpen(true)}
          // Caneta Props
          penColor={penColor} setPenColor={setPenColor}
          penWidth={penWidth} setPenWidth={setPenWidth}
          penType={penType} setPenType={setPenType}
          // Preset Props
          toolPresets={toolPresets}
          onAddPreset={addPreset}
          onRemovePreset={removePreset}
          onSelectPreset={selectPreset}
          // Papel Props (Passa estado local para feedback visual imediato apenas)
          paperPattern={paperPatternLocal}
          setPaperPattern={setPaperPatternLocal}
        />
        
        <CanvasArea 
          activeTool={activeTool} 
          isDarkMode={isDarkMode}
          pdfToImport={pdfToImport}
          onPdfImported={onPdfImported}
          penColor={penColor}
          penWidth={penWidth}
          penType={penType}
          apiKey={apiKey}
          // O Canvas agora gerencia o papel via Contexto, ignora prop paperPattern
        />

        <SettingsModal 
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          apiKey={apiKey}
          setApiKey={setApiKey}
        />
      </main>
    </div>
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