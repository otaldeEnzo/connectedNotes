import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { generateId } from '../utils/id';
import { StorageService } from '../services/StorageService';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Dados Iniciais (Reset de Fábrica)
const INITIAL_DATA = {
  'root': {
    id: 'root',
    title: 'As Minhas Notas',
    type: 'folder',
    children: ['note-1'],
    collapsed: false,
    content: {},
    tags: []
  },
  'note-1': {
    id: 'note-1',
    title: 'Bem-vindo ao ConnectedNotes',
    type: 'canvas',
    content: {
      strokes: [],
      textBlocks: [{ id: 1, x: 200, y: 200, content: 'Comece a desenhar ou digitar aqui!' }],
      imageBlocks: [],
      mathBlocks: [],
      codeBlocks: []
    },
    children: [],
    collapsed: false,
    tags: ['tutorial', 'welcome']
  }
};

const NotesContext = createContext({});

export const NotesProvider = ({ children }) => {
  const [notes, setNotes] = useState(INITIAL_DATA);
  const [activeNoteId, setActiveNoteId] = useState('root');
  const [openTabs, setOpenTabs] = useState(['root']);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeAuth, setActiveAuth] = useState(auth);

  // Escuta as mudanças globais de configuração do Firebase
  useEffect(() => {
    const handleConfigChange = (e) => {
      setActiveAuth(e.detail.auth);
    };
    window.addEventListener('firebase-config-changed', handleConfigChange);
    return () => window.removeEventListener('firebase-config-changed', handleConfigChange);
  }, []);

  // Escuta as mudanças de autenticação do Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(activeAuth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, [activeAuth]);

  // 1. Inicialização Híbrida Assíncrona via StorageService
  useEffect(() => {
    const initAndLoad = async () => {
      try {
        await StorageService.initialize();
        const wsData = await StorageService.loadWorkspace();
        
        if (wsData && typeof wsData === 'object' && wsData['root']) {
          // Filtro de conectividade (reachable set) para limpar notas órfãs
          const reachableIds = new Set(['root']);
          const traverse = (id) => {
            const note = wsData[id];
            if (note && note.children) {
              note.children.forEach(childId => {
                if (!reachableIds.has(childId) && wsData[childId]) {
                  reachableIds.add(childId);
                  traverse(childId);
                }
              });
            }
          };
          traverse('root');

          // Limpa do workspace carregado qualquer nota não alcançável a partir do 'root'
          const cleanedWsData = {};
          Object.keys(wsData).forEach(key => {
            if (reachableIds.has(key)) {
              cleanedWsData[key] = wsData[key];
            } else {
              console.warn(`Nota órfã detectada e limpa no carregamento: ${wsData[key]?.title || key}`);
            }
          });

          // Garante que apenas filhos que realmente existem continuem referenciados
          Object.keys(cleanedWsData).forEach(key => {
            if (cleanedWsData[key].children) {
              cleanedWsData[key].children = cleanedWsData[key].children.filter(childId => cleanedWsData[childId]);
            }
          });

          setNotes(cleanedWsData);
          
          // Restaurar nota ativa segura
          const savedActive = localStorage.getItem('connected-notes-active-note');
          if (savedActive && cleanedWsData[savedActive]) {
            setActiveNoteId(savedActive);
          } else {
            setActiveNoteId(cleanedWsData['note-1'] ? 'note-1' : 'root');
          }

          // Restaurar abas abertas seguras
          const savedTabs = localStorage.getItem('connected-notes-tabs');
          if (savedTabs) {
            try {
              const parsed = JSON.parse(savedTabs);
              const validTabs = parsed.filter(id => cleanedWsData[id]);
              if (validTabs.length > 0) {
                setOpenTabs(validTabs);
              } else {
                setOpenTabs(cleanedWsData['note-1'] ? ['note-1'] : ['root']);
              }
            } catch (e) {
              setOpenTabs(cleanedWsData['note-1'] ? ['note-1'] : ['root']);
            }
          } else {
            setOpenTabs(cleanedWsData['note-1'] ? ['note-1'] : ['root']);
          }
        } else {
          // Se não houver dados, mantém INITIAL_DATA e persiste
          if (StorageService.getActiveProviders().indexeddb) {
            localStorage.setItem('connected-notes-data', JSON.stringify(INITIAL_DATA));
          }
          setActiveNoteId('note-1');
          setOpenTabs(['note-1']);
        }
      } catch (err) {
        console.error("Erro na inicialização híbrida do armazenamento:", err);
      } finally {
        setLoading(false);
      }
    };
    initAndLoad();
  }, [currentUser]);

  // Persistir nota ativa
  useEffect(() => {
    localStorage.setItem('connected-notes-active-note', activeNoteId);
  }, [activeNoteId]);

  // Persistir abas no localStorage
  useEffect(() => {
    try {
      localStorage.setItem('connected-notes-tabs', JSON.stringify(openTabs));
    } catch (e) {
      console.error('Erro ao salvar abas:', e);
    }
  }, [openTabs]);

  // Histórico de abas fechadas (para Ctrl+Shift+T)
  const [closedTabsHistory, setClosedTabsHistory] = useState([]);

  // 1.5. Estado de Histórico por Nota
  const [historyPerNote, setHistoryPerNote] = useState({});

  const saveNoteHistory = useCallback((noteId) => {
    if (!noteId || !notes[noteId]) return;

    setHistoryPerNote(prev => {
      const noteHistory = prev[noteId] || { stack: [], index: -1 };
      const currentContent = JSON.stringify(notes[noteId].content);

      // Se o conteúdo for igual ao último no stack, não salva
      if (noteHistory.stack.length > 0 && noteHistory.stack[noteHistory.index] === currentContent) {
        return prev;
      }

      const newStack = noteHistory.stack.slice(0, noteHistory.index + 1);
      newStack.push(currentContent);

      // Limita a 50 entradas
      if (newStack.length > 50) newStack.shift();

      return {
        ...prev,
        [noteId]: {
          stack: newStack,
          index: newStack.length - 1
        }
      };
    });
  }, [notes]);

  const undo = useCallback((noteId) => {
    const noteHistory = historyPerNote[noteId];
    if (!noteHistory || noteHistory.index <= 0) return;

    const newIndex = noteHistory.index - 1;
    const previousContent = JSON.parse(noteHistory.stack[newIndex]);

    setNotes(prev => ({
      ...prev,
      [noteId]: { ...prev[noteId], content: previousContent }
    }));

    setHistoryPerNote(prev => ({
      ...prev,
      [noteId]: { ...prev[noteId], index: newIndex }
    }));
  }, [historyPerNote]);

  const redo = useCallback((noteId) => {
    const noteHistory = historyPerNote[noteId];
    if (!noteHistory || noteHistory.index >= noteHistory.stack.length - 1) return;

    const newIndex = noteHistory.index + 1;
    const nextContent = JSON.parse(noteHistory.stack[newIndex]);

    setNotes(prev => ({
      ...prev,
      [noteId]: { ...prev[noteId], content: nextContent }
    }));

    setHistoryPerNote(prev => ({
      ...prev,
      [noteId]: { ...prev[noteId], index: newIndex }
    }));
  }, [historyPerNote]);

  // 2. Auto-Correção: Se a nota ativa deixar de existir, volta para uma segura
  useEffect(() => {
    if (!notes[activeNoteId]) {
      const safeId = notes['root'] ? 'root' : Object.keys(notes)[0];
      if (safeId) setActiveNoteId(safeId);
      else setNotes(INITIAL_DATA); // Caso extremo: tudo apagado
    }
  }, [notes, activeNoteId]);

  // Persistência
  useEffect(() => {
    if (loading || !StorageService.getActiveProviders().indexeddb) return;
    try {
      localStorage.setItem('connected-notes-data', JSON.stringify(notes));
    } catch (e) {
      console.error("Erro ao salvar no LocalStorage", e);
    }
  }, [notes, loading]);

  // Sincronização em tempo real de notas individuais do Firebase
  useEffect(() => {
    if (loading || !activeNoteId || !StorageService.getActiveProviders().firebase || !currentUser) return;

    const unsubscribe = StorageService.onNoteSync(activeNoteId, (remoteNote) => {
      setNotes(prev => {
        const localNote = prev[activeNoteId];
        if (!localNote) return prev;
        
        // Evita loop se for igual
        if (JSON.stringify(localNote.content) === JSON.stringify(remoteNote.content) &&
            localNote.title === remoteNote.title &&
            JSON.stringify(localNote.tags) === JSON.stringify(remoteNote.tags)) {
          return prev;
        }

        return {
          ...prev,
          [activeNoteId]: {
            ...localNote,
            ...remoteNote
          }
        };
      });
    });

    return () => unsubscribe();
  }, [activeNoteId, loading, currentUser]);

  // Sincronização em tempo real da árvore de notas (workspace) do Firebase
  useEffect(() => {
    if (loading || !StorageService.getActiveProviders().firebase || !currentUser) return;

    const unsubscribe = StorageService.onWorkspaceSync((remoteWorkspace) => {
      setNotes(prev => {
        // Evita loop se for igual
        if (JSON.stringify(Object.keys(prev)) === JSON.stringify(Object.keys(remoteWorkspace))) {
          // Também compara os filhos da raiz e collapseds
          let identical = true;
          for (const key of Object.keys(prev)) {
            if (JSON.stringify(prev[key]?.children) !== JSON.stringify(remoteWorkspace[key]?.children) ||
                prev[key]?.collapsed !== remoteWorkspace[key]?.collapsed ||
                prev[key]?.title !== remoteWorkspace[key]?.title) {
              identical = false;
              break;
            }
          }
          if (identical) return prev;
        }

        // Faz o merge das notas remotas preservando conteúdos locais não salvos ainda se houver
        const merged = { ...prev };
        for (const key of Object.keys(remoteWorkspace)) {
          merged[key] = {
            ...(prev[key] || {}),
            ...remoteWorkspace[key]
          };
        }
        
        // Remove notas locais que foram excluídas na nuvem
        for (const key of Object.keys(prev)) {
          if (!remoteWorkspace[key]) {
            delete merged[key];
          }
        }

        return merged;
      });
    });

    return () => unsubscribe();
  }, [loading, currentUser]);

  const selectNote = useCallback((id, openInNewTab = false) => {
    if (!notes || !notes[id]) return;

    // Standard tab functionality: Always add to tabs if not already open (acting like a browser)
    setOpenTabs(prev => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
    setActiveNoteId(id);
  }, [notes]);

  // Funções de gerenciamento de abas
  const openTab = (noteId) => {
    if (!notes[noteId]) return;
    if (openTabs.includes(noteId)) {
      // Se já está aberta, apenas ativa
      setActiveNoteId(noteId);
    } else {
      // Abre nova aba e ativa
      setOpenTabs(prev => [...prev, noteId]);
      setActiveNoteId(noteId);
    }
  };

  const closeTab = (noteId) => {
    const tabIndex = openTabs.indexOf(noteId);
    if (tabIndex === -1) return;

    // Salvar no histórico de abas fechadas (máx 20)
    setClosedTabsHistory(prev => {
      const newHistory = [noteId, ...prev.filter(id => id !== noteId)];
      return newHistory.slice(0, 20);
    });

    const newTabs = openTabs.filter(id => id !== noteId);
    setOpenTabs(newTabs);

    // Se fechou a aba ativa, ativa a próxima (ou anterior, ou nenhuma)
    if (activeNoteId === noteId && newTabs.length > 0) {
      const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
      setActiveNoteId(newTabs[newActiveIndex]);
    } else if (newTabs.length === 0) {
      // Se não há mais abas, abre a raiz
      setOpenTabs(['root']);
      setActiveNoteId('root');
    }
  };

  // Restaurar última aba fechada
  const restoreTab = () => {
    if (closedTabsHistory.length === 0) return;

    // Encontrar primeira aba do histórico que ainda existe
    const tabToRestore = closedTabsHistory.find(id => notes[id]);
    if (!tabToRestore) {
      setClosedTabsHistory([]);
      return;
    }

    // Remover do histórico
    setClosedTabsHistory(prev => prev.filter(id => id !== tabToRestore));

    // Abrir a aba
    if (!openTabs.includes(tabToRestore)) {
      setOpenTabs(prev => [...prev, tabToRestore]);
    }
    setActiveNoteId(tabToRestore);
  };

  const closeOtherTabs = (noteId) => {
    setOpenTabs([noteId]);
    setActiveNoteId(noteId);
  };

  const closeTabsToRight = (noteId) => {
    const index = openTabs.indexOf(noteId);
    if (index === -1) return;
    const newTabs = openTabs.slice(0, index + 1);
    setOpenTabs(newTabs);
    if (!newTabs.includes(activeNoteId)) {
      setActiveNoteId(noteId);
    }
  };

  const reorderTabs = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    setOpenTabs(prev => {
      const newTabs = [...prev];
      const [moved] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, moved);
      return newTabs;
    });
  };

  const toggleCollapse = useCallback((id) => {
    setNotes(prev => {
      if (!prev?.[id]) return prev;
      return { ...prev, [id]: { ...prev[id], collapsed: !prev[id].collapsed } };
    });
  }, []);

  // Helper para salvar pasta e seus filhos recursivamente (necessário para Local Vault renames/moves)
  const saveNoteRecursively = useCallback(async (noteId, noteData, notesState) => {
    await StorageService.saveNote(noteId, noteData, notesState);
    if (noteData.type === 'folder' && noteData.children) {
      for (const childId of noteData.children) {
        const childData = notesState[childId];
        if (childData) {
          await saveNoteRecursively(childId, childData, notesState);
        }
      }
    }
  }, []);

  // --- FUNÇÃO BLINDADA (CORREÇÃO DE CRASH) ---
  const updateNoteContent = useCallback((id, newContent) => {
    if (!id) return;

    setNotes(prev => {
      if (!prev?.[id]) return prev;

      try {
        const currentNote = prev[id];
        const currentContent = currentNote.content || {};
        const updatedNote = {
          ...currentNote,
          content: { ...currentContent, ...newContent },
          updatedAt: Date.now()
        };
        const newState = {
          ...prev,
          [id]: updatedNote
        };

        // Salva nota no StorageService
        StorageService.saveNote(id, updatedNote, newState);

        return newState;
      } catch (err) {
        console.error("Erro ao atualizar nota:", err);
        return prev;
      }
    });
  }, []);

  const addNote = useCallback((parentId, type = 'canvas') => {
    const newId = generateId(type === 'folder' ? 'folder' : 'note');

    let initialContent = {};
    if (type === 'canvas') {
      initialContent = { strokes: [], textBlocks: [], imageBlocks: [], mathBlocks: [], codeBlocks: [] };
    } else if (type === 'text') {
      initialContent = { markdown: '' };
    } else if (type === 'code') {
      initialContent = { code: '// Digite seu código aqui\n', language: 'javascript' };
    } else if (type === 'mermaid') {
      initialContent = { code: 'graph TD\n  A[Início] --> B(Processo)' };
    } else if (type === 'mindmap') {
      initialContent = { root: { id: 'm-root', text: 'Tópico Central', x: 800, y: 450, children: [] } };
    }

    const now = Date.now();
    const newNote = {
      id: newId,
      title: type === 'folder' ? 'Nova Pasta' : 'Nova Nota',
      type: type,
      content: initialContent,
      children: [],
      collapsed: false,
      createdAt: now,
      updatedAt: now
    };

    setNotes(prev => {
      if (!prev?.[parentId]) return prev;
      const newState = {
        ...prev,
        [newId]: newNote,
        [parentId]: {
          ...prev[parentId],
          children: [...(prev[parentId].children || []), newId],
          collapsed: false
        }
      };

      // Salva nota nova e atualiza o pai no armazenamento
      StorageService.saveNote(newId, newNote, newState);
      StorageService.saveNote(parentId, newState[parentId], newState);

      return newState;
    });
    if (type !== 'folder') {
      setOpenTabs(prev => [...prev, newId]);
      setActiveNoteId(newId);
    }
  }, []);

  const deleteNote = useCallback((noteId) => {
    if (noteId === 'root') return;

    let idsToDelete = [];

    setNotes(prev => {
      if (!prev) return prev;
      const newState = { ...prev };

      const parentId = Object.keys(newState).find(key =>
        newState[key]?.children?.includes(noteId)
      );

      if (parentId && newState[parentId]) {
        newState[parentId] = {
          ...newState[parentId],
          children: (newState[parentId].children || []).filter(id => id !== noteId)
        };
      }

      // Função recursiva para coletar descendentes
      const getDescendantIds = (id) => {
        const ids = [];
        const note = newState[id];
        if (note && note.children) {
          for (const childId of note.children) {
            ids.push(childId);
            ids.push(...getDescendantIds(childId));
          }
        }
        return ids;
      };

      idsToDelete = [noteId, ...getDescendantIds(noteId)];

      // Sincroniza exclusão de cada item fisicamente e deleta do estado
      idsToDelete.forEach(id => {
        const targetNote = newState[id];
        if (targetNote) {
          StorageService.deleteNote(id, targetNote, newState);
        }
        delete newState[id];
      });

      if (parentId && newState[parentId]) {
        StorageService.saveNote(parentId, newState[parentId], newState);
      }

      return newState;
    });

    // Filtra abas abertas e atualiza nota ativa
    setOpenTabs(prev => {
      const nextTabs = prev.filter(tabId => !idsToDelete.includes(tabId));
      return nextTabs.length > 0 ? nextTabs : ['root'];
    });

    setActiveNoteId(prev => idsToDelete.includes(prev) ? 'root' : prev);
  }, []);

  // --- Move (Drag & Drop) ---
  const moveNote = useCallback((movedId, targetId, position = 'inside') => {
    if (!movedId || !targetId || movedId === targetId) return;
    if (movedId === 'root') return;

    setNotes(prev => {
      const findParent = (id, state) => {
        if (id === 'root') return null;
        return Object.keys(state).find(key => state[key]?.children?.includes(id));
      };

      const buildPath = (id) => {
        const path = [];
        let cur = id;
        while (cur && cur !== 'root') {
          path.push(cur);
          cur = findParent(cur, prev);
        }
        return path;
      };

      if (buildPath(targetId).includes(movedId)) {
        return prev;
      }

      const newState = { ...prev };
      const oldParentId = findParent(movedId, newState);

      if (!oldParentId) return prev;

      newState[oldParentId] = {
        ...newState[oldParentId],
        children: (newState[oldParentId].children || []).filter(id => id !== movedId)
      };

      let newParentId;
      if (position === 'inside') {
        newParentId = targetId;
        if (newState[targetId]) {
          newState[targetId] = {
            ...newState[targetId],
            children: [...(newState[targetId].children || []), movedId],
            collapsed: false
          };
        }
      } else {
        newParentId = findParent(targetId, newState);
        if (newParentId) {
          const siblings = [...(newState[newParentId].children || [])];
          const targetIndex = siblings.indexOf(targetId);
          const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
          siblings.splice(insertIndex, 0, movedId);
          newState[newParentId] = { ...newState[newParentId], children: siblings };
        }
      }

      // Sincroniza movimentação de pasta/arquivo físico no StorageService
      const handleMoveSync = async () => {
        if (StorageService.getActiveProviders().local_vault) {
          // Deleta caminho antigo fisicamente
          await StorageService.deleteNote(movedId, prev[movedId], prev);
          // Recria no caminho novo com filhos recursivamente
          await saveNoteRecursively(movedId, newState[movedId], newState);
        }
        
        // Salva as estruturas de diretórios atualizadas em todos os provedores ativos (nuvem, indexeddb, disk)
        await StorageService.saveNote(oldParentId, newState[oldParentId], newState);
        if (newParentId) {
          await StorageService.saveNote(newParentId, newState[newParentId], newState);
        }
      };
      handleMoveSync();

      return newState;
    });
  }, [saveNoteRecursively]);

  const updateNoteTitle = useCallback((id, newTitle) => {
    if (!id) return;
    setNotes(prev => {
      if (!prev?.[id]) return prev;
      
      const oldNote = prev[id];
      const updatedNote = { ...oldNote, title: newTitle, updatedAt: Date.now() };
      const newState = { ...prev, [id]: updatedNote };

      const handleRenameSync = async () => {
        if (StorageService.getActiveProviders().local_vault) {
          // Exclui caminho antigo fisicamente
          await StorageService.deleteNote(id, oldNote, prev);
          // Salva no caminho novo recursivamente
          await saveNoteRecursively(id, updatedNote, newState);
        } else {
          await StorageService.saveNote(id, updatedNote, newState);
        }
      };
      handleRenameSync();

      return newState;
    });
  }, [saveNoteRecursively]);

  const updateNoteTags = useCallback((id, newTags) => {
    if (!id) return;
    setNotes(prev => {
      if (!prev?.[id]) return prev;
      const updatedNote = { ...prev[id], tags: Array.isArray(newTags) ? newTags : [], updatedAt: Date.now() };
      const newState = {
        ...prev,
        [id]: updatedNote
      };

      StorageService.saveNote(id, updatedNote, newState);

      return newState;
    });
  }, []);

  const deleteTagGlobally = (tagToDelete) => {
    setNotes(prev => {
      const updatedNotes = { ...prev };
      Object.keys(updatedNotes).forEach(id => {
        if (updatedNotes[id].tags && Array.isArray(updatedNotes[id].tags)) {
          updatedNotes[id] = {
            ...updatedNotes[id],
            tags: updatedNotes[id].tags.filter(t => t !== tagToDelete)
          };
        }
      });
      return updatedNotes;
    });
  };

  // --- Funções de Background ---
  const updateNoteBackground = (id, background) => {
    if (!id) return;
    setNotes(prev => {
      if (!prev?.[id]) return prev;
      return {
        ...prev,
        [id]: {
          ...prev[id],
          content: { ...prev[id]?.content, background }
        }
      };
    });
  };

  const updateNoteBackgroundSize = (id, size) => {
    if (!id) return;
    setNotes(prev => {
      if (!prev?.[id]) return prev;
      return {
        ...prev,
        [id]: {
          ...prev[id],
          content: { ...prev[id]?.content, backgroundSize: size }
        }
      };
    });
  };

  // Obter todas as tags únicas
  const allTags = React.useMemo(() => {
    const tags = new Set();
    Object.values(notes).forEach(note => {
      if (note.tags && Array.isArray(note.tags)) {
        note.tags.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [notes]);

  const [defaultBackground, setDefaultBackground] = useState('dots');

  const activeNote = (notes && notes[activeNoteId]) ? notes[activeNoteId] : null;

  const [filterTag, setFilterTag] = useState(null);

  const contextValue = React.useMemo(() => ({
    notes, activeNoteId, selectNote, toggleCollapse, updateNoteContent,
    addNote, deleteNote, updateNoteTitle, updateNoteTags, allTags,
    filterTag, setFilterTag, activeNote, moveNote, updateNoteBackground,
    updateNoteBackgroundSize,
    saveNoteHistory, undo, redo, defaultBackground, setDefaultBackground,
    openTabs, openTab, closeTab, closeOtherTabs, closeTabsToRight,
    reorderTabs, restoreTab, deleteTagGlobally
  }), [
    notes, activeNoteId, selectNote, toggleCollapse, updateNoteContent,
    addNote, deleteNote, updateNoteTitle, updateNoteTags, allTags,
    filterTag, activeNote, moveNote, updateNoteBackground,
    updateNoteBackgroundSize,
    saveNoteHistory, undo, redo, defaultBackground,
    openTabs, openTab, closeTab, closeOtherTabs, closeTabsToRight,
    reorderTabs, restoreTab, deleteTagGlobally
  ]);

  if (loading) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'var(--bg-color)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '24px', zIndex: 9999,
        color: 'var(--text-primary)'
      }}>
        <div className="dynamic-bg" style={{ pointerEvents: 'none' }}>
          <div className="blob blob-violet" />
          <div className="blob blob-cyan" />
          <div className="blob blob-fuchsia" />
          <div className="noise-overlay" />
        </div>
        <div className="glass-extreme" style={{
          padding: '40px 60px', borderRadius: '24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px',
          border: '1px solid rgba(255,255,255,0.15)',
          background: 'var(--glass-bg-floating)',
          boxShadow: 'var(--glass-shadow), 0 20px 50px rgba(0,0,0,0.3)',
          textAlign: 'center'
        }}>
          <div className="loading-spinner" style={{
            width: '50px', height: '50px', borderRadius: '50%',
            border: '4px solid rgba(255,255,255,0.1)',
            borderTop: '4px solid var(--accent-color)',
            animation: 'spin 1s linear infinite',
            boxShadow: '0 0 15px var(--accent-glow)',
            boxSizing: 'border-box'
          }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Iniciando ConnectedNotes</h3>
            <p style={{ margin: '6px 0 0', fontSize: '0.85rem', opacity: 0.6 }}>Carregando seu espaço de trabalho híbrido...</p>
          </div>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <NotesContext.Provider value={contextValue}>
      {children}
    </NotesContext.Provider>
  );
};

export const useNotes = () => useContext(NotesContext);