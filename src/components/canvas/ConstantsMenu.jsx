import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { STEM_CONSTANTS } from '../../services/STEMService';
import { Search, X, Calculator, Tags } from 'lucide-react';

const ConstantsMenu = ({ isOpen, onClose, onInsert, theme = 'dark' }) => {
  const [search, setSearch] = useState('');
  const [insertMode, setInsertMode] = useState('symbol'); // 'symbol' or 'value'
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const filtered = STEM_CONSTANTS.filter(c => 
    c.n.toLowerCase().includes(search.toLowerCase()) || 
    c.l.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    }
    if (e.key === 'Enter' && filtered.length > 0) {
      const item = filtered[selectedIndex];
      onInsert(insertMode === 'symbol' ? item.symbol : item.value);
      onClose();
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      setInsertMode(prev => prev === 'symbol' ? 'value' : 'symbol');
    }
  };

  useEffect(() => {
    // Scroll selected item into view
    const activeItem = listRef.current?.children[selectedIndex];
    if (activeItem) {
      activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  useEffect(() => {
    const handleGlobalEsc = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleGlobalEsc);
    return () => window.removeEventListener('keydown', handleGlobalEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div 
      className="constants-overlay fixed inset-0 flex items-center justify-center pointer-events-auto z-[30000] bg-black/20"
      onPointerDown={(e) => {
        console.log("STEM-DEBUG: Backdrop Clicked");
        onClose();
      }}
    >
      <div 
        className="constants-menu glass-extreme w-full max-w-lg pointer-events-auto overflow-hidden animate-in fade-in zoom-in-95 duration-300"
        onPointerDown={e => {
            e.stopPropagation();
        }}
        style={{
          borderRadius: '2.5rem',
          background: 'var(--glass-bg-floating)',
          backdropFilter: 'blur(32px) saturate(200%) brightness(1.2)',
          border: '1.5px solid var(--glass-border)',
          boxShadow: 'var(--glass-shadow), 0 30px 60px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '80vh'
        }}
      >
        {/* Search Bar */}
        <div className="flex items-center gap-4 px-8 py-6 border-b border-white/10 bg-black/20">
          <Search size={22} className="opacity-40" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar constante cientifica... (c, Planck, G)"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-xl font-medium text-[var(--text-primary)] placeholder:opacity-40"
          />
          <button 
            onPointerDown={(e) => { 
                console.log("STEM-DEBUG: X Clicked");
                e.stopPropagation(); 
                onClose(); 
            }}
            className="p-2 hover:bg-white/10 rounded-full transition-colors opacity-40 hover:opacity-100 cursor-pointer active:scale-90"
          >
            <X size={20} />
          </button>
        </div>

        {/* Global Toggle Selector (Insert Mode) */}
        <div className="flex items-center justify-between px-8 py-4 bg-white/5 border-b border-white/5">
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Modo de Inserção:</span>
          <div className="flex bg-black/30 p-1 rounded-2xl gap-1">
            <button 
              onClick={() => setInsertMode('symbol')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-bold transition-all ${insertMode === 'symbol' ? 'bg-accent-color text-white' : 'opacity-40 hover:opacity-100'}`}
            >
              <Tags size={12} /> Símbolo (ex: c)
            </button>
            <button 
              onClick={() => setInsertMode('value')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-bold transition-all ${insertMode === 'value' ? 'bg-amber-500 text-white' : 'opacity-40 hover:opacity-100'}`}
            >
              <Calculator size={12} /> Valor (ex: 299.792.458)
            </button>
          </div>
        </div>

        {/* Results List */}
        <div 
          ref={listRef}
          className="flex-1 overflow-y-auto p-4 custom-scrollbar"
        >
          {filtered.length === 0 ? (
            <div className="py-20 text-center opacity-30 italic">Nenhuma constante encontrada</div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={idx}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onInsert(insertMode === 'symbol' ? item.symbol : item.value);
                  onClose();
                }}
                className={`flex items-center justify-between p-6 rounded-3xl transition-all cursor-pointer group ${
                  selectedIndex === idx ? 'bg-white/15 scale-[1.02] shadow-xl' : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-math transition-colors ${selectedIndex === idx ? 'bg-accent-color text-white' : 'bg-black/40 text-accent-color opacity-70'}`}>
                    {item.label.includes('_') ? (
                      <span className="flex items-baseline">
                        {item.label.split('_')[0]}<sub className="text-[0.6em] opacity-80 leading-none">{item.label.split('_')[1]}</sub>
                      </span>
                    ) : item.label}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">{item.name}</h3>
                    <p className="text-sm opacity-50 uppercase tracking-tight font-medium">{item.category} • {item.unit || 'Adimensional'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-mono text-[var(--text-primary)] group-hover:text-accent-color transition-colors">
                    {insertMode === 'symbol' ? item.symbol : item.value}
                  </div>
                  <div className="text-[10px] opacity-30 mt-1">Clique para inserir</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Shortcuts Hint */}
        <div className="px-8 py-4 bg-black/40 border-t border-white/5 flex justify-between">
           <span className="text-[10px] opacity-40">Precisão de computação científica habilitada</span>
           <div className="flex gap-4">
              <span className="text-[10px] opacity-40"><kbd className="bg-white/10 px-1.5 py-0.5 rounded border border-white/10 mx-1">↑↓</kbd> Navegar</span>
              <span className="text-[10px] opacity-40"><kbd className="bg-white/10 px-1.5 py-0.5 rounded border border-white/10 mx-1">Tab</kbd> Trocar Modo</span>
              <span className="text-[10px] opacity-40"><kbd className="bg-white/10 px-1.5 py-0.5 rounded border border-white/10 mx-1">↵</kbd> Confirmar</span>
           </div>
        </div>

        <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .font-math { font-family: 'STIX Two Math', serif; }
        `}</style>
      </div>
    </div>,
    document.body
  );
};

export default ConstantsMenu;
