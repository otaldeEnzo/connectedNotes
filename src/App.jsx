import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { CircleDot, Library, Menu } from 'lucide-react';

import { auth, db, appId, sanitize } from './firebase'; 
import Sidebar from './components/Sidebar';
import FloatingToolbar from './components/FloatingToolbar';
import CanvasArea from './components/CanvasArea';
import './styles/global.css'; 

const DEFAULT_PRESETS = [
  { id: 'select', type: 'cursor', color: '#000000', size: 0, opacity: 1, name: 'Cursor' },
  { id: 'p1', type: 'pen', color: '#1e293b', size: 2.5, opacity: 1, name: 'Caneta 1' },
  { id: 'p2', type: 'pen', color: '#3b82f6', size: 2.5, opacity: 1, name: 'Caneta 2' },
  { id: 'h1', type: 'highlighter', color: '#fde047', size: 22, opacity: 0.35, name: 'Marca-texto' },
  { id: 'e1', type: 'eraser', color: '#ffffff', size: 40, opacity: 1, name: 'Borracha', eraserType: 'stroke' }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [notes, setNotes] = useState([]);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [presets, setPresets] = useState(DEFAULT_PRESETS);
  const [activePresetId, setActivePresetId] = useState('p1');
  const [showConfig, setShowConfig] = useState(null); 
  const [showBgConfig, setShowBgConfig] = useState(false);
  const [theme, setTheme] = useState('light');

  const remoteStrokesRef = useRef([]);
  const activeNoteIdRef = useRef(null);
  const localStrokesBuffer = useRef([]);

  const activeNote = useMemo(() => notes.find(n => n.id === activeNoteId), [notes, activeNoteId]);
  const activePreset = useMemo(() => presets.find(p => p.id === activePresetId) || DEFAULT_PRESETS[1], [presets, activePresetId]);

  const handleSelectNote = (id) => { setActiveNoteId(id); setIsSidebarOpen(false); };
  const toggleTheme = useCallback(() => {
    const nt = theme === 'light' ? 'dark' : 'light';
    setTheme(nt);
    document.body.setAttribute('data-theme', nt);
  }, [theme]);

  // --- HANDLERS DE CONFIGURAÇÃO ---
  const handleConfigChange = (id, field, value) => {
    const updated = presets.map(p => p.id === id ? { ...p, [field]: value } : p);
    setPresets(updated);
    if (user) setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'presets'), { presets: sanitize(updated) });
  };

  const addNewPreset = () => {
    const n = { id: crypto.randomUUID(), type: 'pen', color: '#6366f1', size: 3, opacity: 1 };
    const updated = [...presets, n];
    setPresets(updated);
    setActivePresetId(n.id);
    setShowConfig(n.id);
    if (user) setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'presets'), { presets: sanitize(updated) });
  };

  const deletePreset = (id) => {
    if (id === 'p1' || id === 'e1') return;
    const updated = presets.filter(p => p.id !== id);
    setPresets(updated);
    setActivePresetId('p1');
    setShowConfig(null);
    if (user) setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'presets'), { presets: sanitize(updated) });
  };

  const updateNote = useCallback((id, updates, debounce = 500) => {
    if (!auth.currentUser) return;
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
    updateDoc(doc(db, 'artifacts', appId, 'users', auth.currentUser.uid, 'notes', id), sanitize({ ...updates, lastModified: Date.now() }));
  }, []);

  useEffect(() => {
    const initAuth = async () => { if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token); else await signInAnonymously(auth); };
    initAuth(); onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    setIsSyncing(true);
    const unsub = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'notes'), snap => {
      const rem = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setNotes(rem); setIsSyncing(false);
      if (activeNoteIdRef.current) {
        const f = rem.find(n => n.id === activeNoteIdRef.current);
        if (f) remoteStrokesRef.current = f.strokes || [];
      }
    });
    onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'presets'), d => { if (d.exists()) setPresets(d.data().presets); });
    return () => unsub();
  }, [user]);

  useEffect(() => { activeNoteIdRef.current = activeNoteId; }, [activeNoteId]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-app)]">
      <main className="flex-1 relative flex flex-col overflow-hidden">
        {activeNote && !isSidebarOpen && (
          <button className="top-right-nav-btn liquid-glass" onClick={() => setIsSidebarOpen(true)}>
            <Library size={18} /> <span>Notas</span>
          </button>
        )}

        {activeNote && (
          <FloatingToolbar 
            presets={presets} activePresetId={activePresetId} setActivePresetId={setActivePresetId}
            showConfig={showConfig} setShowConfig={setShowConfig} isSyncing={isSyncing}
            onAddPreset={addNewPreset} onDeletePreset={deletePreset} onConfigChange={handleConfigChange}
            onClearCanvas={() => updateNote(activeNoteId, { strokes: [] }, 0)} 
            onUpdateBackground={(bg) => updateNote(activeNoteId, { backgroundPattern: bg }, 0)}
            showBgConfig={showBgConfig} setShowBgConfig={setShowBgConfig} activeNote={activeNote} 
            theme={theme} toggleTheme={toggleTheme}
          />
        )}
        
        {activeNote ? (
          <CanvasArea 
            activeNote={activeNote} activePreset={activePreset} onUpdateNote={updateNote} 
            localStrokesBuffer={localStrokesBuffer} remoteStrokesRef={remoteStrokesRef} theme={theme} 
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
             {!isSidebarOpen && <button onClick={() => setIsSidebarOpen(true)} className="liquid-glass p-8 rounded-full mb-8 hover:scale-105 transition-transform"><Library size={48} className="text-[var(--accent)]" /></button>}
             <h2 className="text-3xl font-extrabold text-[var(--text-primary)]">connectedNotes</h2>
          </div>
        )}
      </main>

      <Sidebar 
        notes={notes} activeNoteId={activeNoteId} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
        onAddNote={(p) => {
          const id = crypto.randomUUID(); const n = {id, title:'', content:'', parentId:p, backgroundPattern:'grid', createdAt:Date.now()};
          setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'notes', id), n); setActiveNoteId(id); setIsSidebarOpen(false);
        }} onDeleteNote={() => {}} onSelectNote={handleSelectNote}
      />
    </div>
  );
}