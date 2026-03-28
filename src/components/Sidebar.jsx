import React, { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNotes } from '../contexts/NotesContext';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Ícones SVG Inline
const SidebarIcons = {
  Plus: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  Folder: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
  File: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>,
  Text: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  Code: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>,
  Canvas: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="M4.93 4.93l1.41 1.41"></path><path d="M17.66 17.66l1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="M6.34 17.66l-1.41 1.41"></path><path d="M19.07 4.93l-1.41 1.41"></path></svg>,
  Mermaid: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><path d="M10 10l4 4"></path></svg>,
  Mindmap: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M12 9V5"></path><path d="M12 19v-4"></path><path d="M15 12h4"></path><path d="M5 12h4"></path></svg>,
  ChevronRight: () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>,
  ChevronDown: () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>,
  X: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  Settings: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
  Sun: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>,
  Moon: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>,
  Download: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
};

const TreeNode = ({ nodeId, level = 0 }) => {
  const { notes, activeNoteId, selectNote, toggleCollapse, addNote, deleteNote, updateNoteTitle, filterTag } = useNotes();
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);

  const note = notes[nodeId];

  const matchesFilter = useCallback((id) => {
    if (!filterTag) return true;
    const n = notes[id];
    if (!n) return false;
    if (n.tags && n.tags.includes(filterTag)) return true;
    if (n.children) {
      return n.children.some(childId => matchesFilter(childId));
    }
    return false;
  }, [notes, filterTag]);

  const shouldShow = matchesFilter(nodeId);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver
  } = useSortable({
    id: nodeId,
    disabled: isEditing || !shouldShow,
    data: {
      title: note?.title,
      type: note?.type,
      level: level
    }
  });

  if (!note || !shouldShow) return null;

  const hasChildren = note.children && note.children.length > 0;
  const isSelected = activeNoteId === nodeId;

  const startEditing = (e) => {
    e.stopPropagation();
    setEditTitle(note.title);
    setIsEditing(true);
  };

  const saveTitle = () => {
    if (editTitle.trim()) updateNoteTitle(nodeId, editTitle);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') saveTitle();
    if (e.key === 'Escape') setIsEditing(false);
  };

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div>
      <div
        ref={setNodeRef}
        className={`tree-item liquid-item flex items-center relative my-1 mx-2 rounded-xl transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] text-[0.875rem] py-2.5 pr-3 border ${isSelected ? 'active font-semibold text-[var(--accent-color)] border-[rgba(99,102,241,0.2)] bg-[var(--accent-color-transparent)]' : 'font-medium text-[var(--text-primary)] border-transparent'} ${isHovered && !isSelected ? 'bg-white/5' : ''} ${isDragging ? 'cursor-grabbing opacity-30 z-[1000]' : (isEditing ? 'cursor-text z-10 opacity-100' : 'cursor-pointer z-10 opacity-100')} ${isOver && !isDragging ? 'drop-target' : ''}`}
        {...attributes}
        {...listeners}
        style={{
          ...style,
          paddingLeft: `${level * 16 + 14}px`,
          transition: isDragging ? 'none' : transition,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onDoubleClick={startEditing}
        onClick={(e) => selectNote(nodeId, e.ctrlKey || e.metaKey)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (window.showNoteContextMenu) {
            window.showNoteContextMenu(e.clientX, e.clientY, note);
          }
        }}
      >
        {/* Highlight for dropping inside (any note) */}
        {isOver && !isDragging && (
          <div className="absolute inset-0 border-2 border-[var(--accent-color)] rounded-[10px] bg-[var(--accent-color-transparent)] pointer-events-none z-10" />
        )}

        <div className="flex items-center flex-1 min-w-0 h-full relative z-20">
          {/* Expander / Drag Handle */}
          <span
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapse(nodeId);
            }}
            className="mr-1.5 w-4 text-center opacity-60 cursor-grab flex items-center justify-center pointer-events-auto"
          >
            {hasChildren ? (
              note.collapsed ? <SidebarIcons.ChevronRight /> : <SidebarIcons.ChevronDown />
            ) : (
              <span className="text-[14px] opacity-40">•</span>
            )}
          </span>

          {/* Icon based on type */}
          <span className="mr-2 opacity-70 flex">
            {note.type === 'folder' && <SidebarIcons.Folder />}
            {note.type === 'canvas' && <SidebarIcons.Canvas />}
            {note.type === 'text' && <SidebarIcons.Text />}
            {note.type === 'code' && <SidebarIcons.Code />}
            {note.type === 'mermaid' && <SidebarIcons.Mermaid />}
            {note.type === 'mindmap' && <SidebarIcons.Mindmap />}
          </span>

          {/* Title */}
          {isEditing ? (
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 border border-[var(--accent-color)] rounded bg-[var(--bg-color)] text-[var(--text-primary)] text-[0.9rem] px-1.5 py-0.5 outline-none cursor-text"
            />
          ) : (
            <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis select-none">
              {note.title}
            </span>
          )}
        </div>

        {/* Actions */}
        {isHovered && !isEditing && (
          <div className="flex gap-1 ml-2 relative z-30" onPointerDown={(e) => e.stopPropagation()}>
            <button
              title="Novo item"
              className={`liquid-button p-0.5 bg-transparent border-none cursor-pointer ${showAddMenu ? 'text-[var(--accent-color)]' : 'text-[var(--text-primary)] opacity-40 hover:opacity-100'}`}
              onClick={(e) => { e.stopPropagation(); setShowAddMenu(!showAddMenu); }}
            >
              <SidebarIcons.Plus />
            </button>

            {showAddMenu && (
              <div
                className="glass-panel absolute top-[calc(100%+4px)] right-0 w-[160px] p-1.5 z-[1000] rounded-[10px] border border-[var(--glass-border)] shadow-glass flex flex-col gap-0.5"
                onMouseLeave={() => setShowAddMenu(false)}
              >
                {[
                  { type: 'text', label: 'Texto', icon: SidebarIcons.Text },
                  { type: 'code', label: 'Código', icon: SidebarIcons.Code },
                  { type: 'canvas', label: 'Canvas', icon: SidebarIcons.Canvas },
                  { type: 'mermaid', label: 'Diagrama', icon: SidebarIcons.Mermaid },
                  { type: 'mindmap', label: 'Mapa Mental', icon: SidebarIcons.Mindmap },
                  { type: 'folder', label: 'Pasta', icon: SidebarIcons.Folder },
                ].map(opt => (
                  <button
                    key={opt.type}
                    className="liquid-item py-1.5 px-2.5 border-none bg-transparent hover:bg-white/10 text-[var(--text-primary)] text-[0.8rem] cursor-pointer flex items-center gap-2 rounded-md text-left transition-colors"
                    onClick={(e) => { e.stopPropagation(); addNote(nodeId, opt.type); setShowAddMenu(false); }}
                  >
                    <span className="opacity-70"><opt.icon /></span> {opt.label}
                  </button>
                ))}
              </div>
            )}

            {nodeId !== 'root' && (
              <button
                title="Excluir"
                className="liquid-button p-0.5 bg-transparent border-none cursor-pointer text-[var(--text-primary)] opacity-40 hover:text-red-500 hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); if (confirm('Excluir?')) deleteNote(nodeId); }}
              >
                <SidebarIcons.Trash />
              </button>
            )}
          </div>
        )}
      </div>

      {hasChildren && !note.collapsed && (
        <div className="tree-children">
          <SortableContext items={note.children} strategy={verticalListSortingStrategy}>
            {note.children.map(childId => (
              <TreeNode key={childId} nodeId={childId} level={level + 1} />
            ))}
          </SortableContext>
        </div>
      )}
    </div>
  );
};

const RootDropTarget = ({ isDragging }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: 'root-bottom',
  });

  if (!isDragging) return null;

  return (
    <div
      ref={setNodeRef}
      className={`h-[40px] m-[10px_12px] border-2 border-dashed rounded-[10px] flex items-center justify-center text-[0.8rem] transition-all duration-200 pointer-events-auto ${isOver ? 'border-[var(--accent-color)] bg-[rgba(99,102,241,0.05)] text-[var(--accent-color)]' : 'border-white/10 bg-transparent text-[var(--text-secondary)]'}`}
    >
      Mover para o topo
    </div>
  );
};

const Sidebar = ({ onOpenSearch, onToggleTheme, onOpenSettings, isDarkMode, onToggleSidebar }) => {
  const { notes, addNote, moveNote, allTags, filterTag, setFilterTag, activeNoteId, activeNote } = useNotes();
  const [activeDragItem, setActiveDragItem] = useState(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [addMenuPos, setAddMenuPos] = useState({ top: 0, left: 0 });
  const rootNote = notes['root'];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, 
      },
    })
  );

  const handleDragStart = (event) => {
    setActiveDragItem(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over, delta } = event;
    setActiveDragItem(null);

    if (over) {
      if (over.id === 'root-bottom') {
        moveNote(active.id, 'root', 'inside');
        return;
      }

      if (active.id !== over.id) {
        const overRect = event.over?.rect;
        const activeRect = event.active.rect.current.translated;
        const deltaX = event.delta?.x || 0;

        if (overRect && activeRect) {
          const relativeY = (activeRect.top + activeRect.height / 2) - overRect.top;
          
          // Se o usuário moveu significativamente para a direita (>20px), ele quer aninhar
          const wantsToNest = deltaX > 20;
          
          const threshold = overRect.height * 0.35; // 35% da altura como margem para reordenar

          if (wantsToNest) {
            moveNote(active.id, over.id, 'inside');
          } else if (relativeY < threshold) {
            moveNote(active.id, over.id, 'before');
          } else if (relativeY > overRect.height - threshold) {
            moveNote(active.id, over.id, 'after');
          } else {
            moveNote(active.id, over.id, 'inside');
          }
        } else {
          moveNote(active.id, over.id, 'inside');
        }
      }
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
      <div className="h-full flex flex-col overflow-hidden">

        {/* Header */}
        <div className="pt-5 px-5 pb-3 border-b border-white/10">
          <div className="flex justify-between items-center mb-3 relative">
            <div className="flex items-center gap-4">
              <button
                onClick={onToggleSidebar}
                className="liquid-button p-2.5 rounded-xl bg-white/5 border border-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer flex items-center justify-center lg:hidden"
                title="Recolher Sidebar"
              >
                <SidebarIcons.X />
              </button>
              <h2 className="text-[1.1rem] font-bold text-[var(--text-primary)]">Notas</h2>
            </div>

            <div className="relative">
              <button
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setAddMenuPos({ top: rect.bottom + 8, left: rect.left });
                  setShowAddMenu(!showAddMenu);
                }}
                className="liquid-button bg-[var(--accent-gradient)] border-none rounded-xl px-4 py-2 cursor-pointer text-[0.85rem] flex items-center gap-2 font-bold shadow-[0_8px_20px_-4px var(--accent-glow)] transition-all hover:scale-105 hover:brightness-110 active:scale-95 text-white"
              >
                <SidebarIcons.Plus /> Nova
              </button>

              {showAddMenu && createPortal(
                <>
                  <div 
                    onClick={() => setShowAddMenu(false)} 
                    style={{ position: 'fixed', inset: 0, zIndex: 999998 }} 
                  />
                  <div 
                    className="glass-extreme w-[200px] p-2 z-[999999] rounded-xl border border-[var(--glass-border)] shadow-glass flex flex-col gap-1.5"
                    style={{
                      position: 'fixed',
                      top: addMenuPos.top,
                      left: addMenuPos.left,
                      background: 'var(--glass-bg-floating)',
                      backdropFilter: 'blur(32px) saturate(180%) brightness(1.1)',
                      animation: 'fadeIn 0.2s ease-out'
                    }}
                  >
                    {[
                      { type: 'text', label: 'Nota de Texto', icon: SidebarIcons.Text },
                      { type: 'code', label: 'Nota de Código', icon: SidebarIcons.Code },
                      { type: 'canvas', label: 'Canvas Infinito', icon: SidebarIcons.Canvas },
                      { type: 'mermaid', label: 'Diagrama Mermaid', icon: SidebarIcons.Mermaid },
                      { type: 'mindmap', label: 'Mapa Mental', icon: SidebarIcons.Mindmap },
                      { type: 'folder', label: 'Nova Pasta', icon: SidebarIcons.Folder },
                    ].map(opt => (
                      <button
                        key={opt.type}
                        className="liquid-item flex py-2.5 px-3 border-none bg-transparent hover:bg-white/10 text-[var(--text-primary)] text-[0.85rem] cursor-pointer items-center gap-3 rounded-lg text-left transition-all"
                        onClick={() => { addNote('root', opt.type); setShowAddMenu(false); }}
                      >
                        <span className="opacity-80 flex items-center justify-center scale-110 text-[var(--accent-color)]"><opt.icon /></span>
                        <span className="font-medium">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </>,
                document.body
              )}
            </div>
          </div>
          <input
            type="text"
            placeholder="Pesquisar (Ctrl+F)..."
            readOnly
            onClick={onOpenSearch}
            onFocus={(e) => { e.target.blur(); onOpenSearch(); }}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--glass-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-primary)] placeholder:opacity-40 outline-none text-[0.85rem] backdrop-blur-[10px] hover:border-[var(--accent-color)] transition-colors"
          />
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto pt-2 pr-1">
          <SortableContext items={rootNote?.children || []} strategy={verticalListSortingStrategy}>
            {rootNote && rootNote.children.map(childId => (
              <TreeNode key={childId} nodeId={childId} level={0} />
            ))}
          </SortableContext>
          <RootDropTarget isDragging={!!activeDragItem} />
          {rootNote && rootNote.children.length === 0 && (
            <div className="p-5 text-center text-[var(--text-secondary)] text-[0.8rem]">
              Vazio.
            </div>
          )}
        </div>

        {/* Tags Section */}
        <div className="max-h-[150px] border-t border-[var(--glass-border)] p-3 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-[0.7rem] font-bold uppercase text-[var(--text-secondary)] tracking-[0.05em]">
              Tags
            </span>
            {filterTag && (
              <button
                className="liquid-button bg-transparent border-none text-[var(--accent-color)] cursor-pointer text-[0.7rem]"
                onClick={() => setFilterTag(null)}
              >
                Limpar
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 overflow-y-auto">
            {allTags.length === 0 && (
              <span className="text-[0.75rem] text-[var(--text-secondary)] italic">Nenhuma tag</span>
            )}
            {allTags.map(tag => (
              <button
                key={tag}
                className={`liquid-button px-3 py-1 rounded-full text-[0.7rem] font-bold cursor-pointer border transition-all ${filterTag === tag ? 'bg-[var(--accent-color)] text-white border-[var(--accent-color)] shadow-[0_4px_12px_var(--accent-glow)]' : 'bg-[var(--glass-surface)] text-[var(--text-primary)] border-[var(--border-color)] hover:border-[var(--accent-color)] hover:bg-[var(--glass-surface-focus)] opacity-80'}`}
                onClick={() => setFilterTag(filterTag === tag ? null : tag)}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="py-2.5 px-3 border-t border-[var(--glass-border)] flex gap-2 justify-center bg-[var(--glass-surface)]">
          <button
            title="Exportar Nota (PNG)"
            className="liquid-button flex-1 p-2 rounded-[10px] bg-transparent border border-[var(--border-color)] text-[var(--text-primary)] opacity-60 hover:opacity-100 flex items-center justify-center cursor-pointer hover:bg-[var(--glass-surface-focus)] transition-all"
            onClick={() => {
              if (activeNoteId && activeNote) {
                window.dispatchEvent(new CustomEvent('triggerExport', {
                  detail: { noteId: activeNoteId, format: 'png', note: activeNote }
                }));
              }
            }}
          >
            <SidebarIcons.Download />
          </button>
          <button
            title="Alternar Tema"
            className="liquid-button flex-1 p-2 rounded-[10px] bg-transparent border border-[var(--border-color)] text-[var(--text-primary)] opacity-60 hover:opacity-100 flex items-center justify-center cursor-pointer hover:bg-[var(--glass-surface-focus)] transition-all"
            onClick={onToggleTheme}
          >
            {isDarkMode ? <SidebarIcons.Sun /> : <SidebarIcons.Moon />}
          </button>
          <button
            title="Configurações"
            className="liquid-button flex-1 p-2 rounded-[10px] bg-transparent border border-[var(--border-color)] text-[var(--text-primary)] opacity-60 hover:opacity-100 flex items-center justify-center cursor-pointer hover:bg-[var(--glass-surface-focus)] transition-all"
            onClick={onOpenSettings}
          >
            <SidebarIcons.Settings />
          </button>
        </div>

        {/* Status Bar */}
        <div className="py-2 px-3 border-t border-[var(--glass-border)] text-[0.65rem] text-[var(--text-secondary)] flex justify-between opacity-60">
          <span>v0.2.0 Beta</span>
          <span title="Sync">🟢 Local</span>
        </div>
      </div>

      <DragOverlay>
        {activeDragItem ? (
          <div className="p-2 bg-[var(--bg-color)] border border-[var(--accent-color)] rounded-md shadow-[0_5px_15px_rgba(0,0,0,0.2)] bg-opacity-90 w-[200px]">
            📄 {notes[activeDragItem]?.title || 'Nota'}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default Sidebar;