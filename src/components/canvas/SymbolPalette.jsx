import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { STEMService, STEM_SYMBOLS } from '../../services/STEMService';
import { X, GripHorizontal, Tags, Calculator, ChevronDown, ChevronRight, Search as SearchIcon } from 'lucide-react';

const SymbolPalette = ({ isOpen, onClose, onInsert, theme = 'dark' }) => {
  const [activeTab, setActiveTab] = useState('Greek');
  const [insertMode, setInsertMode] = useState('symbol'); 
  const [pos, setPos] = useState({ x: window.innerWidth - 350, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const [constSearch, setConstSearch] = useState('');
  const [expandedCats, setExpandedCats] = useState({});
  const [expandedSubs, setExpandedSubs] = useState({});
  
  const dragStartOffset = useRef({ x: 0, y: 0 });
  const paletteRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPos({ x: Math.min(window.innerWidth - 350, pos.x), y: Math.max(100, pos.y) });
    }
  }, [isOpen]);

  const handleMouseDown = (e) => {
    if (e.target.closest('.drag-handle')) {
      setIsDragging(true);
      dragStartOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setPos({ x: e.clientX - dragStartOffset.current.x, y: e.clientY - dragStartOffset.current.y });
      }
    };
    const handleMouseUp = () => setIsDragging(false);
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const constantsTree = useMemo(() => {
    return STEMService.getConstantsHierarchy(constSearch);
  }, [constSearch]);

  // Automatically expand categories if searching
  useEffect(() => {
    if (constSearch) {
      const cats = Object.keys(constantsTree);
      const newExp = {};
      cats.forEach(c => newExp[c] = true);
      setExpandedCats(newExp);
    }
  }, [constSearch, constantsTree]);

  if (!isOpen) return null;

  const categories = [...Object.keys(STEM_SYMBOLS), 'Constants'];

  const toggleCat = (cat) => setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));
  const toggleSub = (sub) => setExpandedSubs(prev => ({ ...prev, [sub]: !prev[sub] }));

  return ReactDOM.createPortal(
    <div
      ref={paletteRef}
      className="symbol-palette glass-extreme animate-in fade-in zoom-in-95 duration-200"
      style={{
        position: 'fixed', left: pos.x, top: pos.y, width: '340px', maxHeight: '550px',
        zIndex: 20000, display: 'flex', flexDirection: 'column', borderRadius: '24px',
        overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.15)', background: 'rgba(15,15,20,0.85)',
        backdropFilter: 'blur(32px) saturate(180%)', boxShadow: '0 40px 100px rgba(0,0,0,0.5)', pointerEvents: 'auto'
      }}
    >
      {/* DRAG HANDLE */}
      <div className="drag-handle flex items-center justify-between px-5 py-4 bg-white/5 border-b border-white/5 cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2">
          <GripHorizontal size={14} className="opacity-40" />
          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Biblioteca STEM</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors opacity-40 hover:opacity-100"><X size={14} /></button>
      </div>

      {/* TABS */}
      <div className="flex gap-1 p-2 overflow-x-auto scrollbar-hide border-b border-white/5 bg-black/20">
        {categories.map(cat => (
          <button
            key={cat} onClick={() => setActiveTab(cat)}
            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === cat ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-white/20 hover:text-white/60'}`}
          >
            {cat === 'LogicSets' ? 'Lógica' : (cat === 'Constants' ? 'Constantes' : cat)}
          </button>
        ))}
      </div>

      {/* SEARCH & MODE (Constants Only) */}
      {activeTab === 'Constants' && (
        <div className="p-3 space-y-3 bg-black/20 border-b border-white/5 animate-in slide-in-from-top-2">
           <div className="flex bg-white/5 rounded-xl border border-white/10 items-center px-3 py-2 gap-2 focus-within:border-indigo-500/50 transition-all">
              <SearchIcon size={12} className="opacity-20" />
              <input value={constSearch} onChange={e => setConstSearch(e.target.value)} placeholder="Pesquisar na biblioteca..." className="bg-transparent border-none outline-none text-[10px] text-white flex-1 font-bold placeholder:text-white/10" />
           </div>
           <div className="flex gap-2">
              <button onClick={() => setInsertMode('symbol')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${insertMode === 'symbol' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-white/20'}`}><Tags size={10}/> Símbolo</button>
              <button onClick={() => setInsertMode('value')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${insertMode === 'value' ? 'bg-amber-500 text-white' : 'bg-white/5 text-white/20'}`}><Calculator size={10}/> Valor</button>
           </div>
        </div>
      )}

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-black/5">
        {activeTab === 'Constants' ? (
          <div className="space-y-3">
             {Object.entries(constantsTree).map(([catName, subs]) => (
               <div key={catName} className="rounded-2xl border border-white/5 overflow-hidden bg-white/2">
                  <button onClick={() => toggleCat(catName)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-all">
                     <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{catName}</span>
                     {expandedCats[catName] ? <ChevronDown size={14} className="opacity-40" /> : <ChevronRight size={14} className="opacity-40" />}
                  </button>
                  {expandedCats[catName] && (
                    <div className="px-3 pb-3 space-y-2 animate-in slide-in-from-top-2">
                       {Object.entries(subs).map(([subName, items]) => (
                         <div key={subName} className="rounded-xl border border-white/5 bg-black/20 overflow-hidden">
                            <button onClick={() => toggleSub(`${catName}-${subName}`)} className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-all">
                               <span className="text-[9px] font-black uppercase tracking-widest text-white/40">{subName}</span>
                               {expandedSubs[`${catName}-${subName}`] ? <ChevronDown size={10} className="opacity-20" /> : <ChevronRight size={10} className="opacity-20" />}
                            </button>
                            {expandedSubs[`${catName}-${subName}`] && (
                              <div className="p-2 grid grid-cols-2 gap-2 animate-in fade-in">
                                 {items.map(item => (
                                   <button 
                                      key={item.n} 
                                      onClick={() => onInsert(insertMode === 'symbol' ? item.s : item.v)}
                                      className="flex flex-col p-3 rounded-lg bg-white/5 border border-white/5 hover:border-indigo-500/40 hover:bg-indigo-500/10 transition-all text-left group"
                                   >
                                      <span className="text-xl font-math text-indigo-300 group-hover:scale-110 transition-transform">{item.l}</span>
                                      <span className="text-[7px] opacity-30 uppercase font-black tracking-tighter truncate mt-1">{item.n}</span>
                                   </button>
                                 ))}
                              </div>
                            )}
                         </div>
                       ))}
                    </div>
                  )}
               </div>
             ))}
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {STEM_SYMBOLS[activeTab].map((sym, idx) => (
              <button 
                key={idx} onClick={() => onInsert(sym.cmd)}
                className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-white/10 active:scale-95 transition-all group border border-transparent hover:border-white/10" title={sym.cmd}
              >
                <span className="text-2xl font-math text-white group-hover:scale-110 transition-transform">{sym.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-5 py-3 bg-black/40 border-t border-white/5">
        <p className="text-[8px] opacity-20 text-center uppercase font-black tracking-[0.2em] italic">Clique para inserir no cursor</p>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
        .font-math { font-family: 'STIX Two Math', 'Cambria Math', serif; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>,
    document.body
  );
};

export default SymbolPalette;
