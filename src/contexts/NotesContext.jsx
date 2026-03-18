import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { generateId } from '../utils/id';

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
  // 1. Inicialização Segura com Validação de Schema
  const [notes, setNotes] = useState(() => {
    try {
      const saved = localStorage.getItem('connected-notes-data');
      if (!saved) return INITIAL_DATA;

      const parsed = JSON.parse(saved);

      // Validação: Se não for objeto ou não tiver a raiz, considera corrompido
      if (!parsed || typeof parsed !== 'object' || !parsed['root']) {
        console.warn("Dados corrompidos detectados. Restaurando padrão.");
        return INITIAL_DATA;
      }
      return parsed;
    } catch (e) {
      console.error("Erro fatal ao carregar notas:", e);
      return INITIAL_DATA;
    }
  });

  // Garante que iniciamos com uma nota válida
  const [activeNoteId, setActiveNoteId] = useState(() => {
    const saved = localStorage.getItem('connected-notes-active-note');
    if (saved && notes[saved]) return saved;
    // Se tivermos a note-1 (padrão), usamos ela, senão a raiz
    return notes['note-1'] ? 'note-1' : 'root';
  });

  // Persistir nota ativa
  useEffect(() => {
    localStorage.setItem('connected-notes-active-note', activeNoteId);
  }, [activeNoteId]);

  // Estado de abas abertas
  const [openTabs, setOpenTabs] = useState(() => {
    try {
      const saved = localStorage.getItem('connected-notes-tabs');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Filtra abas de notas que ainda existem
        return parsed.filter(id => notes[id]);
      }
    } catch (e) {
      console.error('Erro ao carregar abas:', e);
    }
    // Default: aba inicial com a nota ativa
    return notes['note-1'] ? ['note-1'] : ['root'];
  });

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
    try {
      localStorage.setItem('connected-notes-data', JSON.stringify(notes));
    } catch (e) {
      console.error("Erro ao salvar no LocalStorage", e);
    }
  }, [notes]);

  const selectNote = useCallback((id, openInNewTab = false) => {
    if (!notes || !notes[id]) return;

    if (openInNewTab) {
      // Ctrl+click: Abrir em nova aba se não existir
      setOpenTabs(prev => {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      });
      setActiveNoteId(id);
    } else {
      // Clique normal: Ativar se já estiver aberta ou substituir a aba atual
      setOpenTabs(prev => {
        if (prev.includes(id)) return prev;
        
        // Se não está aberta, substituímos a aba que estava ativa pela nova
        const activeIndex = prev.indexOf(activeNoteId);
        const newTabs = [...prev];
        if (activeIndex !== -1) {
          newTabs[activeIndex] = id;
        } else {
          newTabs.push(id);
        }
        return newTabs;
      });
      
      // Sempre ativamos o ID, independente da aba já estar lá ou não
      setActiveNoteId(id);
    }
  }, [notes, activeNoteId]);

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

  // --- FUNÇÃO BLINDADA (CORREÇÃO DE CRASH) ---
  const updateNoteContent = useCallback((id, newContent) => {
    if (!id) return;

    setNotes(prev => {
      if (!prev?.[id]) return prev;

      try {
        const currentNote = prev[id];
        const currentContent = currentNote.content || {};

        return {
          ...prev,
          [id]: {
            ...currentNote,
            content: { ...currentContent, ...newContent }
          }
        };
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
      initialContent = { markdown: '# Nova Nota\nComece a escrever...' };
    } else if (type === 'code') {
      initialContent = { code: '// Digite seu código aqui\n', language: 'javascript' };
    } else if (type === 'mermaid') {
      initialContent = { code: 'graph TD\n  A[Início] --> B(Processo)' };
    } else if (type === 'mindmap') {
      initialContent = { root: { id: 'm-root', text: 'Tópico Central', x: 800, y: 450, children: [] } };
    }

    const newNote = {
      id: newId,
      title: type === 'folder' ? 'Nova Pasta' : 'Nova Nota',
      type: type,
      content: initialContent,
      children: [],
      collapsed: false
    };

    setNotes(prev => {
      if (!prev?.[parentId]) return prev;
      return {
        ...prev,
        [newId]: newNote,
        [parentId]: {
          ...prev[parentId],
          children: [...(prev[parentId].children || []), newId],
          collapsed: false
        }
      };
    });
    if (type !== 'folder') {
      setOpenTabs(prev => [...prev, newId]);
      setActiveNoteId(newId);
    }
  }, []);

  const deleteNote = useCallback((noteId) => {
    if (noteId === 'root') return;

    setNotes(prev => {
      if (!prev) return prev;
      const newState = { ...prev };

      const parentId = Object.keys(newState).find(key =>
        newState[key]?.children?.includes(noteId)
      );

      if (parentId && newState[parentId]) {
        newState[parentId] = {
          ...newState[parentId],
          children: newState[parentId].children.filter(id => id !== noteId)
        };
      }

      delete newState[noteId];
      return newState;
    });

    setActiveNoteId(prev => (prev === noteId ? 'root' : prev));
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

      if (position === 'inside') {
        if (newState[targetId]) {
          newState[targetId] = {
            ...newState[targetId],
            children: [...(newState[targetId].children || []), movedId],
            collapsed: false
          };
        }
      } else {
        const newParentId = findParent(targetId, newState);
        if (newParentId) {
          const siblings = [...(newState[newParentId].children || [])];
          const targetIndex = siblings.indexOf(targetId);
          const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
          siblings.splice(insertIndex, 0, movedId);
          newState[newParentId] = { ...newState[newParentId], children: siblings };
        }
      }
      return newState;
    });
  }, []);

  const updateNoteTitle = (id, newTitle) => {
    setNotes(prev => {
      if (!prev?.[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], title: newTitle }
      };
    });
  };

  const updateNoteTags = (id, newTags) => {
    setNotes(prev => {
      if (!prev?.[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], tags: Array.isArray(newTags) ? newTags : [] }
      };
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
    saveNoteHistory, undo, redo, defaultBackground, setDefaultBackground,
    openTabs, openTab, closeTab, closeOtherTabs, closeTabsToRight,
    reorderTabs, restoreTab
  }), [
    notes, activeNoteId, selectNote, toggleCollapse, updateNoteContent,
    addNote, deleteNote, updateNoteTitle, updateNoteTags, allTags,
    filterTag, activeNote, moveNote, updateNoteBackground,
    saveNoteHistory, undo, redo, defaultBackground,
    openTabs, openTab, closeTab, closeOtherTabs, closeTabsToRight,
    reorderTabs, restoreTab
  ]);

  return (
    <NotesContext.Provider value={contextValue}>
      {children}
    </NotesContext.Provider>
  );
};

export const useNotes = () => useContext(NotesContext);