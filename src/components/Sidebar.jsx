import React, { useState } from 'react';
import { Plus, FileText, Trash2, X, ChevronRight, ChevronDown, Folder, CircleDot, Search } from 'lucide-react';

/**
 * Componente Sidebar (Árvore de Notas)
 * Design reformulado: Liquid Glass Flutuante com hierarquia clara.
 */
const Sidebar = ({ 
  notes, activeNoteId, isSidebarOpen, setIsSidebarOpen, 
  onAddNote, onDeleteNote, onSelectNote 
}) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set(['root']));
  const [searchTerm, setSearchTerm] = useState('');

  const toggleNode = (nodeId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) newExpanded.delete(nodeId);
    else newExpanded.add(nodeId);
    setExpandedNodes(newExpanded);
  };

  const buildNoteTree = (parentId = 'root') => {
    return notes
      .filter(n => (n.parentId || 'root') === parentId)
      .filter(n => n.title.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  };

  const NoteTreeItem = ({ note, level = 0 }) => {
    const children = notes.filter(n => n.parentId === note.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedNodes.has(note.id);

    return (
      <div style={{ marginLeft: level === 0 ? 0 : 12 }}>
        <div 
          className={`tree-node ${activeNoteId === note.id ? 'active' : ''}`}
          onClick={() => onSelectNote(note.id)}
        >
          <div 
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-black/5"
            onClick={(e) => { e.stopPropagation(); toggleNode(note.id); }}
            style={{ opacity: hasChildren ? 1 : 0 }}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
          
          <div className="flex items-center gap-3 flex-1 min-w-0 ml-1">
            {hasChildren ? 
              <Folder size={18} className={activeNoteId === note.id ? "text-indigo-500" : "opacity-60"} /> : 
              <FileText size={18} className="opacity-60" />
            }
            <span className="truncate text-sm font-semibold">{note.title || 'Sem título'}</span>
          </div>

          <div className="actions flex gap-1">
            <button 
              onClick={(e) => { e.stopPropagation(); onAddNote(note.id); }} 
              className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-500"
              title="Nova sub-nota"
            >
              <Plus size={14} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }} 
              className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"
              title="Excluir"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        {isExpanded && children.map(child => <NoteTreeItem key={child.id} note={child} level={level + 1} />)}
      </div>
    );
  };

  return (
    <aside className={`sidebar-container liquid-glass ${!isSidebarOpen ? 'sidebar-closed' : ''}`}>
      <div className="sidebar-header flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 text-white">
              <CircleDot size={24} />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-800 dark:text-white">Lumina</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)} 
            className="p-2 hover:bg-black/5 rounded-full text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Busca rápida */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar notas..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-black/5 border-none rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none"
          />
        </div>
      </div>

      <div className="sidebar-content hide-scrollbar">
        <button 
          onClick={() => onAddNote('root')} 
          className="w-full py-3.5 mb-6 bg-indigo-500 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
           <Plus size={20} /> Nova Nota
        </button>
        
        <div className="space-y-1">
          {buildNoteTree('root').length === 0 ? (
            <div className="text-center py-8 opacity-40 italic text-sm">Nenhuma nota encontrada</div>
          ) : (
            buildNoteTree('root').map(rootNote => <NoteTreeItem key={rootNote.id} note={rootNote} />)
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;