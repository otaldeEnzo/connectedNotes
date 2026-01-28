import React, { useState } from 'react';
import { useNotes } from '../contexts/NotesContext';

// Ícones SVG Inline para a Sidebar
const SidebarIcons = {
  Plus: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  Folder: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
  File: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
};

const TreeNode = ({ nodeId, level = 0 }) => {
  const { notes, activeNoteId, selectNote, toggleCollapse, addNote, deleteNote, updateNoteTitle } = useNotes();
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');

  const note = notes[nodeId];
  if (!note) return null;

  const hasChildren = note.children && note.children.length > 0;
  const isSelected = activeNoteId === nodeId;

  // Handler para iniciar renomeação
  const startEditing = (e) => {
    e.stopPropagation();
    setEditTitle(note.title);
    setIsEditing(true);
  };

  // Handler para salvar renomeação
  const saveTitle = () => {
    if (editTitle.trim()) {
      updateNoteTitle(nodeId, editTitle);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') saveTitle();
    // Cancela edição no ESC
    if (e.key === 'Escape') setIsEditing(false);
  };

  return (
    <div>
      <div 
        className="tree-item"
        style={{ 
          paddingLeft: `${level * 16 + 12}px`,
          paddingRight: '8px',
          paddingTop: '6px',
          paddingBottom: '6px',
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          fontSize: '0.9rem',
          color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)',
          background: isSelected ? 'rgba(99, 102, 241, 0.1)' : (isHovered ? 'rgba(0,0,0,0.03)' : 'transparent'),
          borderRadius: '6px',
          margin: '1px 8px',
          position: 'relative' // Para posicionar botões absolutos se precisar
        }}
        onClick={() => selectNote(nodeId)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onDoubleClick={startEditing} // Duplo clique para renomear
      >
        {/* Ícone de Expansão/Colapso */}
        <span 
          onClick={(e) => {
            e.stopPropagation();
            toggleCollapse(nodeId);
          }}
          style={{ 
            marginRight: '6px', 
            width: '16px', 
            textAlign: 'center', 
            opacity: 0.6,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          {hasChildren ? (
            note.collapsed ? <span style={{fontSize: '10px'}}>▶</span> : <span style={{fontSize: '10px'}}>▼</span>
          ) : (
            <span style={{fontSize: '14px'}}>•</span>
          )}
        </span>

        {/* Título ou Input de Edição */}
        {isEditing ? (
          <input 
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()} // Permite clicar para mover cursor
            style={{
              flex: 1, // Ocupa o espaço restante corretamente
              minWidth: 0, // Evita overflow no flexbox
              border: '1px solid var(--accent-color)',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '0.9rem',
              background: 'var(--bg-color)', // Usa a cor de fundo do tema
              color: 'var(--text-primary)',  // Usa a cor de texto do tema
              outline: 'none',
              userSelect: 'text', // GARANTE que o texto seja selecionável e visível
              cursor: 'text'
            }}
          />
        ) : (
          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', userSelect: 'none' }}>
            {note.title}
          </span>
        )}

        {/* Botões de Ação (Só aparecem no Hover e não na Raiz) */}
        {isHovered && !isEditing && (
          <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
            {/* Adicionar Filho */}
            <button 
              title="Adicionar sub-nota"
              onClick={(e) => {
                e.stopPropagation();
                addNote(nodeId);
              }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px'
              }}
            >
              <SidebarIcons.Plus />
            </button>
            
            {/* Deletar (Exceto Root) */}
            {nodeId !== 'root' && (
              <button 
                title="Excluir"
                onClick={(e) => {
                  e.stopPropagation();
                  if(confirm('Excluir esta nota?')) deleteNote(nodeId);
                }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px'
                }}
              >
                <SidebarIcons.Trash />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Renderização Recursiva */}
      {hasChildren && !note.collapsed && (
        <div className="tree-children">
          {note.children.map(childId => (
            <TreeNode key={childId} nodeId={childId} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const Sidebar = () => {
  const { notes, addNote } = useNotes();
  const rootNote = notes['root'];

  return (
    <div className="glass-panel" style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      borderRadius: '16px',
      overflow: 'hidden'
    }}>
      {/* Cabeçalho */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ 
            fontSize: '1.1rem', 
            fontWeight: '700', 
            color: 'var(--text-primary)'
          }}>
            Notas
          </h2>
          <button 
            onClick={() => addNote('root')}
            style={{
              background: 'var(--accent-color)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              display: 'flex', alignItems: 'center', gap: '4px'
            }}
          >
            <SidebarIcons.Plus /> Nova
          </button>
        </div>
        
        <input 
          type="text" 
          placeholder="Pesquisar..." 
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid var(--glass-border)',
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--text-primary)',
            outline: 'none',
            fontSize: '0.85rem'
          }}
        />
      </div>

      {/* Árvore Scrollável */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '8px' }}>
        {rootNote && rootNote.children.map(childId => (
          <TreeNode key={childId} nodeId={childId} level={0} />
        ))}
        
        {/* Mensagem se vazio */}
        {rootNote && rootNote.children.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            Nenhuma nota criada.<br/>Clique em "Nova" acima.
          </div>
        )}
      </div>

      {/* Rodapé */}
      <div style={{ 
        padding: '12px', 
        borderTop: '1px solid var(--glass-border)', 
        fontSize: '0.7rem',
        color: 'var(--text-secondary)',
        display: 'flex', 
        justifyContent: 'space-between'
      }}>
        <span>v0.1.0 Alpha</span>
        <span title="Status de Sincronização">🟢 Local</span>
      </div>
    </div>
  );
};

export default Sidebar;