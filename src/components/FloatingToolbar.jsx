import React, { useState } from 'react';
import { 
  Trash2, Palette, Plus, RotateCcw, Cloud, 
  MousePointer2, PenTool, Highlighter, Eraser, 
  Grid3X3, Sun, Moon, CircleDot, Pencil, Brush, LayoutGrid
} from 'lucide-react';

/**
 * FloatingToolbar reformulada
 * Adicionado menu de seleção de tipos de caneta ao clicar no botão de adicionar.
 */
const FloatingToolbar = ({
  presets, activePresetId, setActivePresetId,
  showConfig, setShowConfig, isSyncing, onAddPreset, onDeletePreset, 
  onConfigChange, onClearCanvas, onUpdateBackground, showBgConfig, setShowBgConfig, 
  activeNote, theme, toggleTheme
}) => {
  
  const [showAddMenu, setShowAddMenu] = useState(false);

  const getPatternStyle = (pattern) => {
    const c = theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';
    switch (pattern) {
      case 'lined': return { background: `linear-gradient(${c} 1px, transparent 1px)`, backgroundSize: '100% 8px' };
      case 'grid': return { background: `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`, backgroundSize: '8px 8px' };
      case 'dots': return { background: `radial-gradient(${c} 1.5px, transparent 1px)`, backgroundSize: '8px 8px' };
      default: return { background: 'transparent' };
    }
  };

  const toolIcons = {
    pen: <PenTool size={20}/>,
    highlighter: <Highlighter size={20}/>,
    pencil: <Pencil size={20}/>,
    brush: <Brush size={20}/>,
    cursor: <MousePointer2 size={20}/>,
    eraser: <Eraser size={20}/>
  };

  return (
    <div className="floating-toolbar liquid-glass">
      <button onClick={toggleTheme} className="tool-btn" title="Alternar Tema">
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="w-px h-6 bg-[var(--divider)] mx-1"/>

      {presets.map(p => (
        <div key={p.id} className="relative">
          <button 
            onClick={() => { 
              if (activePresetId === p.id && p.type !== 'cursor') setShowConfig(showConfig === p.id ? null : p.id); 
              else { setActivePresetId(p.id); setShowConfig(null); }
            }} 
            className={`tool-btn ${activePresetId === p.id ? 'active' : ''}`}
          >
            {toolIcons[p.type] || <PenTool size={20}/>}
            {p.type !== 'cursor' && p.type !== 'eraser' && (
              <div className="pen-indicator" style={{ background: p.color }} />
            )}
          </button>
          
          {showConfig === p.id && (
            <div className="bg-popover liquid-glass">
              <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">Ajustes</span>
                  {presets.length > 5 && (
                    <button onClick={() => onDeletePreset(p.id)} className="text-red-400 hover:text-red-500"><Trash2 size={14}/></button>
                  )}
              </div>
              {p.type !== 'eraser' && (
                <div className="flex items-center gap-3">
                    <Palette size={16} className="opacity-50" />
                    <input type="color" value={p.color} onChange={e => onConfigChange(p.id, 'color', e.target.value)} style={{flex:1, height:28, border:'none', background:'transparent', cursor:'pointer'}} />
                </div>
              )}
              <div className="flex items-center gap-3">
                 <CircleDot size={16} className="opacity-50" />
                 <input type="range" min="1" max="80" value={p.size} onChange={e => onConfigChange(p.id, 'size', parseInt(e.target.value))} className="w-full" />
              </div>
            </div>
          )}
        </div>
      ))}
      
      <div className="w-px h-6 bg-[var(--divider)] mx-1"/>
      
      {/* Botão de Adicionar - Agora com Menu de Seleção */}
      <div className="relative">
        <button onClick={() => setShowAddMenu(!showAddMenu)} className={`tool-btn text-indigo-500 ${showAddMenu ? 'bg-indigo-50' : ''}`} title="Nova Ferramenta">
          <Plus size={22} />
        </button>
        {showAddMenu && (
          <div className="bg-popover liquid-glass add-tool-menu">
            <div className="tool-option" onClick={() => { onAddPreset('pen'); setShowAddMenu(false); }}>
              <PenTool size={20} className="text-blue-500" />
              <span className="text-[10px] font-bold">Caneta</span>
            </div>
            <div className="tool-option" onClick={() => { onAddPreset('highlighter'); setShowAddMenu(false); }}>
              <Highlighter size={20} className="text-yellow-500" />
              <span className="text-[10px] font-bold">Marca-texto</span>
            </div>
            <div className="tool-option" onClick={() => { onAddPreset('pencil'); setShowAddMenu(false); }}>
              <Pencil size={20} className="text-slate-500" />
              <span className="text-[10px] font-bold">Lápis</span>
            </div>
            <div className="tool-option" onClick={() => { onAddPreset('brush'); setShowAddMenu(false); }}>
              <Brush size={20} className="text-purple-500" />
              <span className="text-[10px] font-bold">Pincel</span>
            </div>
          </div>
        )}
      </div>

      {/* Botão de Fundo */}
      <div className="relative">
        <button onClick={() => setShowBgConfig(!showBgConfig)} className="tool-btn" title="Fundo">
          <Grid3X3 size={20} />
        </button>
        {showBgConfig && (
          <div className="bg-popover liquid-glass" style={{ width: 220, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {['grid', 'lined', 'dots', 'blank'].map(id => (
              <div key={id} onClick={() => { onUpdateBackground(id); setShowBgConfig(false); }} className={`bg-option ${activeNote?.backgroundPattern === id ? 'active' : ''}`}>
                <div className="bg-preview" style={getPatternStyle(id)}></div>
                <span className="text-[10px] font-bold uppercase">{id === 'grid' ? 'Grade' : id === 'lined' ? 'Linhas' : id === 'dots' ? 'Pontos' : 'Branco'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={onClearCanvas} className="tool-btn text-red-400" title="Limpar Tudo"><RotateCcw size={18}/></button>
      
      <div className="ml-2 pl-2 border-l border-[var(--divider)]">
        <Cloud size={16} className={isSyncing ? 'animate-pulse text-indigo-500' : 'text-emerald-500'} />
      </div>
    </div>
  );
};

export default FloatingToolbar;