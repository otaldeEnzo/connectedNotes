import React, { createContext, useState, useContext, useEffect } from 'react';

// Dados Iniciais (Reset de Fábrica)
const INITIAL_DATA = {
  'root': {
    id: 'root',
    title: 'As Minhas Notas',
    type: 'folder',
    children: ['note-1'],
    collapsed: false,
    content: {} // Garante que root também tenha content vazio
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
    collapsed: false
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
      // Se tivermos a note-1 (padrão), usamos ela, senão a raiz
      return notes['note-1'] ? 'note-1' : 'root'; 
  });

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

  const selectNote = (id) => {
    if (notes && notes[id]) setActiveNoteId(id);
  };

  const toggleCollapse = (id) => {
    setNotes(prev => {
      if (!prev?.[id]) return prev;
      return { ...prev, [id]: { ...prev[id], collapsed: !prev[id].collapsed } };
    });
  };

  // --- FUNÇÃO BLINDADA (CORREÇÃO DE CRASH) ---
  const updateNoteContent = (id, newContent) => {
    if (!id) return;
    
    setNotes(prev => {
      // Verificação defensiva com Optional Chaining
      // Se prev[id] for undefined, prev?.[id] retorna undefined e entra no if
      if (!prev?.[id]) return prev;

      try {
        const currentNote = prev[id];
        // Garante que content é um objeto, mesmo que esteja undefined no banco
        const currentContent = currentNote.content || {};

        return {
          ...prev,
          [id]: { 
            ...currentNote, 
            content: { ...currentContent, ...newContent } 
          }
        };
      } catch (err) {
        console.error("Erro ao atualizar nota (ignorado para evitar crash):", err);
        return prev;
      }
    });
  };

  const addNote = (parentId, type = 'canvas') => {
    const newId = `note-${Date.now()}`;
    const newNote = {
      id: newId,
      title: 'Nova Nota',
      type: type,
      content: { strokes: [], textBlocks: [], imageBlocks: [], mathBlocks: [], codeBlocks: [] },
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
    setActiveNoteId(newId);
  };

  const deleteNote = (noteId) => {
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

    if (activeNoteId === noteId) {
      setActiveNoteId('root');
    }
  };

  const updateNoteTitle = (id, newTitle) => {
    setNotes(prev => {
      if (!prev?.[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], title: newTitle }
      };
    });
  };

  const activeNote = (notes && notes[activeNoteId]) ? notes[activeNoteId] : null;

  return (
    <NotesContext.Provider value={{ 
      notes, 
      activeNoteId, 
      selectNote, 
      toggleCollapse,
      updateNoteContent,
      addNote,
      deleteNote,
      updateNoteTitle,
      activeNote
    }}>
      {children}
    </NotesContext.Provider>
  );
};

export const useNotes = () => useContext(NotesContext);