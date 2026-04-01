import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
  Search, X, Calculator, Beaker, FunctionSquare, Tags, Zap, ChevronRight,
  Info, ArrowRight, MousePointer2, Thermometer, Weight, Hash, Eraser, MoveUp,
  History, Bookmark, Radiation, BookOpen, Layers, Plus, Download, Copy, Check
} from 'lucide-react';
import { create, all } from 'mathjs';
import { STEMService, PERIODIC_TABLE, STEM_SYMBOLS, FORMULA_TEMPLATES } from '../../services/STEMService';

const math = create(all);

const LatexRenderer = ({ formula, className = "" }) => {
  const containerRef = useRef(null);
  useEffect(() => {
    if (containerRef.current && window.katex) {
      try {
        window.katex.render(formula, containerRef.current, {
          throwOnError: false,
          displayMode: true
        });
      } catch (err) {
        containerRef.current.textContent = formula;
      }
    }
  }, [formula]);
  return <div ref={containerRef} className={`math-render-container ${className}`} />;
};

const ScientificOmnibar = ({ isOpen, onClose, onInsert }) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('search');
  const [selectedElement, setSelectedElement] = useState(null);
  const [insertMode, setInsertMode] = useState('symbol');
  const [calcInput, setCalcInput] = useState('');
  const [calcResult, setCalcResult] = useState('');
  const [calcHistory, setCalcHistory] = useState([]);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [calcMode, setCalcMode] = useState('basic'); // basic, graph, matrix, conic, calculus, stats

  // Matrix State
  const [matrixDims, setMatrixDims] = useState({ r: 3, c: 3 });
  const [matrixCells, setMatrixCells] = useState(Array(3).fill(null).map(() => Array(3).fill('')));
  const [matrixRaw, setMatrixRaw] = useState('');
  const [matrixInputMode, setMatrixInputMode] = useState('grid'); // grid, raw

  // Graph State
  const [graphExpr, setGraphExpr] = useState('sin(x)');
  const [graph3D, setGraph3D] = useState(false);
  const [graphZoom, setGraphZoom] = useState(1);

  // Geometry State
  const [geoPoints, setGeoPoints] = useState({ ax: '0', ay: '0', bx: '3', by: '4' });
  const [conicType, setConicType] = useState('ellipse'); // ellipse, parabola, hyperbola
  const [conicParams, setConicParams] = useState({ a: '5', b: '3', h: '0', k: '0' });

  // Calculus & Stats State
  const [calcFn, setCalcFn] = useState('x^2');
  const [calcX0, setCalcX0] = useState('2');
  const [calcRange, setCalcRange] = useState({ a: '0', b: '1' });
  const [statsData, setStatsData] = useState('10, 20, 15, 30, 25');
  
  // STEM PRO (Casio Style) State
  const [mathVars, setMathVars] = useState(() => {
    const saved = localStorage.getItem('scientific-vars');
    return saved ? JSON.parse(saved) : [];
  });
  const [userMacros, setUserMacros] = useState(() => {
    const saved = localStorage.getItem('scientific-macros');
    return saved ? JSON.parse(saved) : [];
  });
  const [symbolicMode, setSymbolicMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showMemory, setShowMemory] = useState(false);

  useEffect(() => {
    localStorage.setItem('scientific-vars', JSON.stringify(mathVars));
  }, [mathVars]);

  useEffect(() => {
    localStorage.setItem('scientific-macros', JSON.stringify(userMacros));
  }, [userMacros]);

  const CASIO_MODES = [
    { id: 'basic', label: 'Cálculo', icon: Calculator, color: 'indigo-500' },
    { id: 'complex', label: 'Complexos', icon: Zap, color: 'purple-500' },
    { id: 'base-n', label: 'Base-N', icon: Hash, color: 'emerald-500' },
    { id: 'matrix', label: 'Matrizes', icon: Layers, color: 'amber-500' },
    { id: 'vector', label: 'Vetores', icon: MoveUp, color: 'blue-500' },
    { id: 'stats', label: 'Estatística', icon: BookOpen, color: 'pink-500' },
    { id: 'dist', label: 'Distribuição', icon: Radiation, color: 'rose-500' },
    { id: 'table', label: 'Tabela', icon: FunctionSquare, color: 'cyan-500' },
    { id: 'equation', label: 'Equação', icon: ChevronRight, color: 'orange-500' },
    { id: 'inequality', label: 'Inequação', icon: Search, color: 'yellow-500' },
    { id: 'ratio', label: 'Razão', icon: Info, color: 'slate-400' },
    { id: 'geometry', label: 'Geometria', icon: MousePointer2, color: 'violet-500' },
  ];

  const [constantCategory, setConstantCategory] = useState('All');
  const [showAddConstant, setShowAddConstant] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const [newConst, setNewConst] = useState({ s: '', l: '', n: '', v: '', u: '', c: 'Física', sc: '' });
  const inputRef = useRef(null);

  // Dragging State
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e) => {
    if (e.target.closest('button') || e.target.closest('input')) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
  };

  const families = [
    { id: 'alkali-metal', label: 'Metais Alcalinos', color: '#f87171' },
    { id: 'alkaline-earth', label: 'Metais Alcalino-Terrosos', color: '#fb923c' },
    { id: 'transition-metal', label: 'Metais de Transição', color: '#60a5fa' },
    { id: 'post-transition', label: 'Metais Pós-Transição', color: '#2dd4bf' },
    { id: 'metalloid', label: 'Semimetais', color: '#facc15' },
    { id: 'non-metal', label: 'Ametais', color: '#4ade80' },
    { id: 'noble-gas', label: 'Gases Nobres', color: '#c084fc' },
    { id: 'lanthanide', label: 'Lantanídeos', color: '#fdba74' },
    { id: 'actinide', label: 'Actinídeos', color: '#f9a8d4' },
  ];

  const getFamilyStyle = (groupId) => {
    const family = families.find(f => f.id === groupId);
    if (!family) return { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', text: 'white' };
    const color = family.color;
    return { bg: `${color}26`, border: `${color}4D`, text: color };
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSearch('');
      setActiveTab('search');
      setShowAddConstant(false);
    }
  }, [isOpen]);

  const searchResults = useMemo(() => {
    if (!search && activeTab === 'search') return { calc: null, constants: [], elements: [], formulas: [], symbols: [] };
    let calc = null;
    try {
      if (search && /[\d+\-*/^().]/.test(search)) {
        const evaluated = math.evaluate(search);
        calc = typeof evaluated === 'number' ? math.format(evaluated, { precision: 10 }) : evaluated.toString();
      }
    } catch (e) { }
    return {
      calc,
      constants: STEMService.searchConstants(search).slice(0, 5),
      elements: STEMService.searchPeriodicTable(search).slice(0, 5),
      formulas: STEMService.searchFormulas(search).slice(0, 5),
      symbols: STEMService.searchSymbols(search)
    };
  }, [search, activeTab]);

  const filteredConstants = useMemo(() => {
    if (constantCategory === 'All') return STEMService.getMergedConstants();
    return STEMService.getMergedConstants().filter(c => c.c === constantCategory);
  }, [constantCategory]);

  const getNextVarName = () => {
    let i = 1;
    while (mathVars.find(v => v.name === `$Var${i}`)) i++;
    return `$Var${i}`;
  };

  const handleSelect = (item) => {
    if (!item) return;
    let val = '';
    if (item.type === 'calc') val = item.value;
    else if (item.type === 'constant') val = insertMode === 'symbol' ? item.s : item.v;
    else if (item.type === 'element') val = insertMode === 'symbol' ? item.symbol : item.atomicMass.toString();
    else if (item.type === 'formula') val = item.formula;
    else if (item.type === 'symbol') val = item.cmd;
    else if (item.type === 'math-block') {
      onInsert({ type: 'math', value: item.value });
      onClose();
      return;
    }
    else if (item.type === 'graph-block') {
      onInsert({ type: 'geogebra', value: item.value });
      onClose();
      return;
    }
    if (val) onInsert(val);
    setTimeout(onClose, 10);
  };

  const onNumpadClick = (val) => {
    if (val === '=') {
      try {
        const res = math.evaluate(calcInput);
        const formattedRes = math.format(res, { precision: 10 });
        setCalcResult(formattedRes);
        setCalcHistory(prev => [{ expression: calcInput, result: formattedRes }, ...prev].slice(0, 20));
      } catch (e) { setCalcResult('Erro'); }
    } else if (val === 'C') {
      setCalcInput(''); setCalcResult('');
    } else if (val === 'back') {
      setCalcInput(prev => prev.slice(0, -1));
    } else { setCalcInput(prev => prev + val); }
  };

  const handleMatrixOperation = (op) => {
    try {
      let matrix;
      if (matrixInputMode === 'grid') {
        matrix = matrixCells.map(row => row.map(cell => math.evaluate(cell || '0')));
      } else {
        matrix = math.evaluate(matrixRaw);
      }

      let result;
      switch (op) {
        case 'det': result = math.det(matrix); break;
        case 'inv': result = math.inv(matrix); break;
        case 'trans': result = math.transpose(matrix); break;
        case 'rank':
          // Simple rank implementation via row echelon or just use mathjs if available
          // mathjs doesn't have a direct rank() in all versions, we'll use size for now 
          // or a more complex approach. For now, let's use det visibility logic.
          result = "Funcionalidade em breve";
          break;
        default: return;
      }

      const formatted = typeof result === 'number' ? math.format(result, { precision: 6 }) : result.toString();
      setCalcResult(formatted);
      if (matrixInputMode === 'grid') setCalcInput(`Operação ${op} em matriz ${matrixDims.r}x${matrixDims.c}`);
    } catch (e) {
      setCalcResult('Erro na Operação');
    }
  };

  const syncMatrixModes = (toMode) => {
    try {
      if (toMode === 'raw') {
        const raw = '[' + matrixCells.map(row => row.join(' ')).join('; ') + ']';
        setMatrixRaw(raw);
      } else {
        // Simple parser for [1 2; 3 4]
        const clean = matrixRaw.replace(/[\[\]]/g, '');
        const rows = clean.split(';').map(r => r.trim().split(/\s+/));
        const newR = rows.length;
        const newC = rows[0].length;
        setMatrixDims({ r: newR, c: newC });
        setMatrixCells(rows);
      }
      setMatrixInputMode(toMode);
    } catch (e) {
      console.warn("Sync failed", e);
      setMatrixInputMode(toMode);
    }
  };

  const geoResults = useMemo(() => {
    try {
      const ax = parseFloat(geoPoints.ax); const ay = parseFloat(geoPoints.ay);
      const bx = parseFloat(geoPoints.bx); const by = parseFloat(geoPoints.by);
      const dist = Math.sqrt(Math.pow(bx - ax, 2) + Math.pow(by - ay, 2));
      const midX = (ax + bx) / 2; const midY = (ay + by) / 2;
      const slope = (bx - ax) !== 0 ? (by - ay) / (bx - ax) : Infinity;
      return { dist: dist.toFixed(4), mid: `(${midX}, ${midY})`, slope: slope.toFixed(4) };
    } catch (e) { return { dist: '--', mid: '--', slope: '--' }; }
  }, [geoPoints]);

  const conicResults = useMemo(() => {
    try {
      const a = parseFloat(conicParams.a); const b = parseFloat(conicParams.b);
      const h = parseFloat(conicParams.h); const k = parseFloat(conicParams.k);
      if (conicType === 'ellipse') {
        const c = Math.sqrt(Math.abs(a * a - b * b));
        const ecc = c / Math.max(a, b);
        return { c: c.toFixed(3), ecc: ecc.toFixed(3), area: (Math.PI * a * b).toFixed(2) };
      } else if (conicType === 'hyperbola') {
        const c = Math.sqrt(a * a + b * b);
        const ecc = c / a;
        return { c: c.toFixed(3), ecc: ecc.toFixed(3), area: 'N/A' };
      } else if (conicType === 'parabola') {
        const p = a / 2;
        return { c: p.toFixed(3), ecc: '1.000', area: 'N/A' };
      }
      return { c: '--', ecc: '--', area: '--' };
    } catch (e) { return { c: '--', ecc: '--', area: '--' }; }
  }, [conicParams, conicType]);

  const calculusResults = useMemo(() => {
    try {
      const f = math.parse(calcFn).compile();
      const x0 = parseFloat(calcX0);
      const h = 0.0001;
      const deriv = (f.evaluate({ x: x0 + h }) - f.evaluate({ x: x0 - h })) / (2 * h);

      // Simpson's Rule
      const a = parseFloat(calcRange.a); const b = parseFloat(calcRange.b);
      const n = 100; const step = (b - a) / n;
      let sum = f.evaluate({ x: a }) + f.evaluate({ x: b });
      for (let i = 1; i < n; i++) {
        const x = a + i * step;
        sum += (i % 2 === 0 ? 2 : 4) * f.evaluate({ x: x });
      }
      const integral = (step / 3) * sum;
      return { deriv: deriv.toFixed(4), integral: integral.toFixed(4) };
    } catch (e) { return { deriv: '--', integral: '--' }; }
  }, [calcFn, calcX0, calcRange]);

  const statsResults = useMemo(() => {
    try {
      const arr = statsData.split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
      if (arr.length === 0) return { mean: '--', sd: '--', reg: '--' };
      const mean = math.mean(arr); const sd = math.std(arr);
      return { mean: mean.toFixed(2), sd: sd.toFixed(2), count: arr.length };
    } catch (e) { return { mean: '--', sd: '--', reg: '--' }; }
  }, [statsData]);

  const handleAddConstant = () => {
    if (!newConst.n) return;
    STEMService.addConstant({ ...newConst });
    setNewConst({ s: '', l: '', n: '', v: '', u: '', c: 'Física', sc: '' });
    setShowAddConstant(false);
  };

  const handleExport = () => {
    STEMService.exportJSON();
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  if (!isOpen) return null;

  const sidebarItems = [
    { id: 'search', icon: Search, label: 'Busca' },
    { id: 'calc', icon: Calculator, label: 'Cálculo' },
    { id: 'elements', icon: Beaker, label: 'Tabela' },
    { id: 'constants', icon: BookOpen, label: 'Constantes' },
    { id: 'formulas', icon: FunctionSquare, label: 'Fórmulas' },
    { id: 'symbols', icon: Tags, label: 'Símbolos' },
  ];

  return ReactDOM.createPortal(
    <div
      className="omnibar-overlay fixed inset-0 flex items-center justify-center pointer-events-auto z-[35000] bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
      onPointerDown={onClose}
    >
      <div
        className={`omnibar-window glass-extreme w-full max-w-[1340px] h-fit min-h-[420px] max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-500 flex shadow-[0_80px_200px_-40px_rgba(0,0,0,1)] text-[#e2e8f0] transition-all duration-500 ease-out`}
        onPointerDown={e => { e.stopPropagation(); handlePointerDown(e); }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ 
          borderRadius: '40px', 
          background: 'rgba(12, 12, 18, 0.98)', 
          border: '1px solid rgba(255,255,255,0.08)',
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'default',
          backdropFilter: 'blur(40px) saturate(180%)'
        }}
      >
        {/* SIDEBAR */}
        <div className="w-[88px] border-r border-white/5 bg-black/40 flex flex-col items-center py-10 gap-8 cursor-grab active:cursor-grabbing">
          <div className="w-14 h-14 rounded-[22px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30 mb-8">
            <Zap size={24} className="text-white fill-white" />
          </div>
          {sidebarItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setShowAddConstant(false); }}
              className={`group relative p-4 rounded-2xl transition-all duration-300 ${activeTab === item.id ? 'bg-white/10 text-white shadow-glow-white' : 'text-white/20 hover:text-white/60 hover:bg-white/5'}`}
            >
              <item.icon size={24} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              {activeTab === item.id && (
                <div className="absolute -left-[2px] top-1/2 -translate-y-1/2 w-[4px] h-10 bg-indigo-500 rounded-r-full" />
              )}
            </button>
          ))}
        </div>

        {/* MAIN BODY */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* HEADER */}
          <div className="flex items-center gap-6 px-8 py-6 border-b border-white/5">
            <div className="flex-1 flex items-center gap-5 bg-white/5 px-8 py-5 rounded-[28px] border border-white/5 focus-within:border-indigo-500/40 focus-within:bg-white/10 transition-all">
              <Search size={24} className="opacity-20" />
              <input
                ref={inputRef}
                type="text"
                placeholder="O que você está procurando hoje?"
                value={activeTab === 'calc' ? calcInput : search}
                onChange={(e) => activeTab === 'calc' ? setCalcInput(e.target.value) : setSearch(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-2xl font-light text-white placeholder:text-white/10"
              />
            </div>

            <div className="flex items-center gap-6">
              <button onClick={onClose} className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-red-500/20 hover:text-red-500 border border-white/5 text-white/20 group transition-all"><X size={24} /></button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            <div className="w-full p-10 flex flex-col relative bg-black/20">

              {/* SEARCH VIEW */}
              {activeTab === 'search' && (
                <div className="space-y-12 animate-in fade-in duration-500">
                  {searchResults.calc && (
                    <div onClick={() => handleSelect({ type: 'calc', value: searchResults.calc })} className="math-card group">
                      <div className="flex items-center gap-10">
                        <div className="w-24 h-24 rounded-[32px] bg-indigo-500 flex items-center justify-center text-white shadow-[0_20px_60px_rgba(99,102,241,0.5)] group-hover:scale-110 transition-all">
                          <Calculator size={44} />
                        </div>
                        <div>
                          <p className="text-xs uppercase font-black text-indigo-400 tracking-[0.3em] mb-2">Resolução Instantânea</p>
                          <p className="text-6xl font-light text-white tracking-widest leading-none">{searchResults.calc}</p>
                        </div>
                      </div>
                      <ArrowRight size={32} className="opacity-10 group-hover:opacity-100 group-hover:translate-x-4 transition-all" />
                    </div>
                  )}
                  {searchResults.constants.length > 0 && (
                    <section>
                      <h3 className="section-title">Constantes</h3>
                      <div className="grid grid-cols-4 gap-4">
                        {searchResults.constants.map((c, idx) => (
                          <div key={`${c.n}-${idx}`} onClick={() => handleSelect({ type: 'constant', ...c })} className="item-card flex flex-col justify-between group p-4 h-32">
                            <div className="flex justify-between items-start">
                              <span className="text-[9px] font-black opacity-30 uppercase tracking-widest">{c.l}</span>
                              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 font-bold flex items-center justify-center text-xs group-hover:bg-indigo-500 group-hover:text-white transition-all">{c.l}</div>
                            </div>
                            <div>
                              <p className="text-sm font-bold truncate">{c.n}</p>
                              <p className="text-[9px] opacity-30 mt-1 font-mono truncate">{c.v}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                  {searchResults.elements.length > 0 && (
                    <section>
                      <h3 className="section-title">Química</h3>
                      <div className="grid grid-cols-2 gap-6">
                        {searchResults.elements.map(el => (
                          <div key={el.symbol} onClick={() => { setActiveTab('elements'); setSelectedElement(el); }} className="item-card flex items-center gap-8">
                            <div className="w-20 h-20 rounded-[28px] bg-black/50 border-2 flex items-center justify-center text-3xl font-black" style={{ borderColor: getFamilyStyle(el.group).border, color: getFamilyStyle(el.group).text }}>{el.symbol}</div>
                            <div className="flex-1">
                              <p className="text-2xl font-bold">{el.name}</p>
                              <p className="text-sm opacity-30 mt-1">Z={el.atomicNumber} • {el.atomicMass} u {el.isRadioactive && '☢️'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                  {searchResults.symbols.length > 0 && (
                    <section>
                      <h3 className="section-title">Símbolos e Operadores</h3>
                      <div className="grid grid-cols-8 gap-4">
                        {searchResults.symbols.map(s => (
                          <div key={s.cmd} onClick={() => handleSelect({ type: 'symbol', ...s })} className="symbol-tile text-4xl h-24 rounded-[32px]">{s.label}</div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}

              {/* CALCULATOR VIEW (STEM PRO CASIO) */}
              {activeTab === 'calc' && (
                <div className="flex-1 flex flex-col max-w-[1100px] mx-auto w-full animate-in slide-in-from-bottom-8 duration-500 overflow-hidden">
                  
                  {/* CASIO MODE SELECTOR BAR */}
                  <div className="flex bg-white/5 p-2 rounded-[32px] border border-white/5 mb-8 w-fit mx-auto gap-2">
                    <button 
                      onClick={() => setIsMenuOpen(true)}
                      className="px-6 py-2.5 rounded-2xl bg-indigo-500 text-white text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 shadow-glow-indigo active:scale-95"
                    >
                      <Zap size={14} />
                      MENU CASIO
                    </button>
                    <button 
                      onClick={() => setShowMemory(!showMemory)}
                      className={`px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${showMemory ? 'bg-white/20 text-white' : 'text-white/30 hover:text-white/50'}`}
                    >
                      <Layers size={14} />
                      MEMÓRIA PRO
                    </button>
                  </div>

                  <div className="flex-1 flex flex-row gap-8 overflow-hidden relative">
                    <div className="flex-1 flex flex-col min-w-0">
                      
                      {/* CASIO MODAL MENU */}
                      {isMenuOpen && (
                        <div className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-3xl p-12 rounded-[48px] animate-in fade-in zoom-in-95 duration-300">
                          <div className="flex justify-between items-center mb-12">
                            <h3 className="text-xs font-black uppercase tracking-[0.5em] text-white/20">Modos de Operação STEM</h3>
                            <button onClick={() => setIsMenuOpen(false)} className="p-4 hover:bg-white/10 rounded-full transition-all"><X size={24} /></button>
                          </div>
                          <div className="grid grid-cols-4 gap-8">
                            {CASIO_MODES.map(m => (
                              <button
                                key={m.id}
                                onClick={() => { setCalcMode(m.id); setIsMenuOpen(false); }}
                                className="group flex flex-col items-center gap-4 p-8 rounded-[40px] bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all active:scale-95"
                              >
                                <div className={`w-20 h-20 rounded-[32px] bg-${m.color}/20 text-${m.color} flex items-center justify-center group-hover:scale-110 transition-all shadow-2xl`}>
                                  <m.icon size={36} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-100">{m.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* MODE CONTENT */}
                      {calcMode === 'basic' && (
                        <div className="flex-1 flex flex-col animate-in fade-in zoom-in-95 duration-300">
                          {/* DISPLAY V.P.A.M. */}
                          <div className="bg-black/60 rounded-[32px] border border-white/5 p-8 mb-6 flex flex-col items-end shadow-[inset_0_4px_30px_rgba(0,0,0,0.8)] relative overflow-hidden group">
                            <div className="absolute top-6 left-8 flex gap-4">
                              <div className={`px-3 py-1 rounded-full text-[8px] font-black tracking-widest border transition-all ${symbolicMode ? 'bg-indigo-500 border-indigo-400 text-white' : 'border-white/10 text-white/20'}`}>SYM</div>
                              <div className="px-3 py-1 rounded-full text-[8px] font-black tracking-widest border border-white/10 text-white/20 uppercase">{calcMode}</div>
                            </div>
                            <div className="text-[9px] opacity-20 uppercase tracking-[0.5em] font-black mb-2">Display Natural • V.P.A.M.</div>
                            <div className="w-full flex flex-col items-end gap-1 mb-2">
                              <div className="text-xs opacity-30 font-mono italic mb-1 truncate w-full text-right">{calcInput || "0"}</div>
                              <LatexRenderer formula={calcInput.replace(/sqrt\((.*?)\)/g, '\\sqrt{$1}').replace(/\//g, '\\div ').replace(/\*/g, '\\times ') || "0"} className="text-4xl font-light tracking-tight text-white !justify-end opacity-90" />
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-3xl font-bold text-indigo-400">{calcResult ? `= ${calcResult}` : ""}</div>
                              {calcResult && (
                                <button 
                                  onClick={() => {
                                    const name = getNextVarName();
                                    try {
                                      setMathVars(prev => [...prev, { id: Date.now(), name, val: math.evaluate(calcInput), type: 'number' }]);
                                    } catch(e) {}
                                  }}
                                  className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all shadow-glow-indigo"
                                >
                                  <Bookmark size={14} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* CASIO KEYPAD */}
                          <div className="grid grid-cols-7 gap-3 min-h-[380px]">
                            <div className="col-span-1 flex flex-col gap-2">
                              <button onClick={() => setSymbolicMode(!symbolicMode)} className={`calc-btn-sc h-full text-[10px] ${symbolicMode ? 'bg-indigo-500 text-white shadow-glow-indigo' : 'text-indigo-400'}`}>SYM</button>
                              <button className="calc-btn-sc h-full bg-white/5 text-white/30 uppercase font-black text-[8px] tracking-widest">OPTN</button>
                              <button onClick={() => onNumpadClick('(')} className="calc-btn-sc h-full bg-white/5 text-indigo-300 text-sm">(</button>
                              <button onClick={() => onNumpadClick(')')} className="calc-btn-sc h-full bg-white/5 text-indigo-300 text-sm">)</button>
                            </div>
                            <div className="col-span-2 grid grid-cols-2 gap-2">
                              {['sin', 'cos', 'tan', 'sqrt', 'log', 'ln', 'asin', 'acos', 'atan', 'pow'].map(fn => (
                                <button key={fn} onClick={() => onNumpadClick(fn + '(')} className="calc-btn-sc text-[9px] font-black uppercase text-indigo-300 hover:bg-indigo-500/20 h-full">
                                  {fn}
                                </button>
                              ))}
                            </div>
                            <div className="col-span-3 grid grid-cols-3 gap-2">
                              {[7, 8, 9, 4, 5, 6, 1, 2, 3, 0, '.', 'ans'].map(n => (
                                <button key={n} onClick={() => onNumpadClick(n.toString())} className="calc-btn-num text-xl h-full">{n}</button>
                              ))}
                              <button onClick={() => onNumpadClick('AC')} className="calc-btn-num bg-red-500/10 text-red-600 font-black text-sm h-full">AC</button>
                              <button onClick={() => onNumpadClick('back')} className="calc-btn-num flex items-center justify-center h-full"><Eraser size={20} /></button>
                              <button onClick={() => onNumpadClick('=')} className="calc-btn-num bg-white text-indigo-950 font-black text-2xl shadow-glow-white h-full">=</button>
                            </div>
                            <div className="col-span-1 flex flex-col gap-3">
                              {['+', '-', '*', '/'].map(op => (
                                <button key={op} onClick={() => onNumpadClick(op)} className="calc-btn-sc h-12 bg-white/5 text-indigo-400 font-bold text-xl">{op.replace('*', '×').replace('/', '÷')}</button>
                              ))}
                              <button 
                                onClick={() => handleSelect({ type: 'math-block', value: calcResult || calcInput })} 
                                className="flex-1 bg-indigo-500/10 hover:bg-indigo-500 rounded-[32px] border border-indigo-500/30 flex items-center justify-center text-indigo-400 hover:text-white transition-all group"
                              >
                                <MoveUp size={32} className="group-hover:-translate-y-2 transition-transform" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {calcMode === 'matrix' && (
                        <div className="flex-1 flex flex-col animate-in fade-in zoom-in-95 duration-300">
                          <div className="grid grid-cols-12 gap-6 h-full">
                            <div className="col-span-4 space-y-4">
                              <div className="bg-white/5 p-6 rounded-[32px] border border-white/5">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-4">Dimensões</h4>
                                <div className="flex items-center gap-3">
                                  <div className="flex-1">
                                    <label className="text-[8px] opacity-30 block mb-1 font-black uppercase">M</label>
                                    <input type="number" value={matrixDims.r} onChange={(e) => setMatrixDims({...matrixDims, r: parseInt(e.target.value) || 1})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xl font-bold" />
                                  </div>
                                  <X size={16} className="opacity-20 mt-4" />
                                  <div className="flex-1">
                                    <label className="text-[8px] opacity-30 block mb-1 font-black uppercase">N</label>
                                    <input type="number" value={matrixDims.c} onChange={(e) => setMatrixDims({...matrixDims, c: parseInt(e.target.value) || 1})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xl font-bold" />
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => handleMatrixOperation('det')} className="calc-btn-sc text-[10px] text-indigo-300">Det(A)</button>
                                <button onClick={() => handleMatrixOperation('inv')} className="calc-btn-sc text-[10px] text-indigo-300">Inv(A)</button>
                                <button onClick={() => handleMatrixOperation('trans')} className="calc-btn-sc text-[10px] text-indigo-300">Transp.</button>
                                <button onClick={() => setMatrixCells(Array(matrixDims.r).fill(null).map(() => Array(matrixDims.c).fill('')))} className="calc-btn-sc text-[10px] text-red-400">Limpar</button>
                              </div>
                            </div>
                            <div className="col-span-8 bg-black/40 rounded-[32px] border border-white/5 p-6 flex flex-col h-full max-h-[400px]">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-6">Editor de Matriz {matrixDims.r}x{matrixDims.c}</h4>
                              <div className="flex-1 grid gap-2 p-2 bg-white/5 rounded-[24px] overflow-hidden" style={{ gridTemplateColumns: `repeat(${matrixDims.c}, minmax(60px, 1fr))` }}>
                                {matrixCells.map((row, i) => row.map((cell, j) => (
                                  <input 
                                    key={`${i}-${j}`} value={cell} 
                                    onChange={(e) => {
                                      const newCells = [...matrixCells];
                                      newCells[i][j] = e.target.value;
                                      setMatrixCells(newCells);
                                    }}
                                    className="w-full h-12 bg-white/5 border border-white/10 rounded-lg text-center text-lg font-bold focus:border-indigo-500 outline-none transition-all"
                                  />
                                )))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* OTHER MODES (STATISTICS, CALCULUS, COMPLEX, BASE-N, VECTOR, DIST, EQUATION, INEQUALITY, RATIO) */}
                      {!['basic', 'matrix'].includes(calcMode) && (
                        <div className="flex-1 grid grid-cols-12 gap-6 animate-in fade-in duration-500 h-full min-h-[380px] overflow-hidden">
                            <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
                               <div className="flex-1 bg-white/5 p-6 rounded-[32px] border border-white/5 flex flex-col">
                                  <div className="flex items-center justify-between mb-4">
                                     <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-400">Parâmetros de Entrada</h4>
                                     <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[8px] font-black uppercase">Modo {calcMode}</div>
                                  </div>
                                  
                                  <div className="flex-1 flex flex-col justify-center gap-4">
                                    {calcMode === 'calculus' && (
                                      <div className="space-y-3">
                                         <div className="space-y-1">
                                            <label className="text-[8px] font-black uppercase opacity-30 ml-2">Função f(x)</label>
                                            <input value={calcFn} onChange={e => setCalcFn(e.target.value)} placeholder="ex: x^2 + sin(x)" className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-lg font-bold focus:border-indigo-500 transition-all outline-none" />
                                         </div>
                                         <div className="grid grid-cols-3 gap-2">
                                            <div className="space-y-1">
                                               <label className="text-[8px] font-black uppercase opacity-30 ml-2">Ponto x₀</label>
                                               <input value={calcX0} onChange={e => setCalcX0(e.target.value)} placeholder="0" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-lg font-bold" />
                                            </div>
                                            <div className="space-y-1">
                                               <label className="text-[8px] font-black uppercase opacity-30 ml-2">Início (a)</label>
                                               <input value={calcRange.a} onChange={e => setCalcRange({...calcRange, a: e.target.value})} placeholder="0" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-lg font-bold" />
                                            </div>
                                            <div className="space-y-1">
                                               <label className="text-[8px] font-black uppercase opacity-30 ml-2">Fim (b)</label>
                                               <input value={calcRange.b} onChange={e => setCalcRange({...calcRange, b: e.target.value})} placeholder="1" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-lg font-bold" />
                                            </div>
                                         </div>
                                      </div>
                                    )}

                                    {calcMode === 'complex' && (
                                      <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="space-y-1">
                                            <label className="text-[8px] font-black uppercase opacity-30 ml-2">Real (a)</label>
                                            <input placeholder="0" className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xl font-bold" />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[8px] font-black uppercase opacity-30 ml-2">Imaginário (b)</label>
                                            <input placeholder="0" className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xl font-bold" />
                                          </div>
                                        </div>
                                        <p className="text-[10px] opacity-40 text-center italic">Representação: a + bi</p>
                                      </div>
                                    )}

                                    {calcMode === 'base-n' && (
                                      <div className="space-y-4">
                                        <input placeholder="Valor de entrada" className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xl font-bold" />
                                        <div className="grid grid-cols-4 gap-2">
                                          {['DEC', 'HEX', 'BIN', 'OCT'].map(b => (
                                            <button key={b} className="py-2 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black hover:bg-indigo-500 transition-all">{b}</button>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {calcMode === 'stats' && (
                                      <div className="space-y-2 h-full flex flex-col">
                                        <label className="text-[8px] font-black uppercase opacity-30 ml-2">Conjunto de Dados (List 1)</label>
                                        <textarea value={statsData} onChange={e => setStatsData(e.target.value)} placeholder="Insira valores separados por vírgula" className="flex-1 w-full min-h-[140px] bg-black/40 border border-white/10 rounded-[28px] p-5 text-sm font-mono focus:border-indigo-500 transition-all outline-none resize-none" />
                                      </div>
                                    )}

                                    {['vector', 'dist', 'equation', 'inequality', 'ratio', 'geometry', 'graph', 'table'].includes(calcMode) && (
                                       <div className="text-center p-10 bg-black/20 rounded-[32px] border border-white/5 border-dashed">
                                          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                                            <Zap size={24} className="opacity-20" />
                                          </div>
                                          <p className="text-[11px] font-bold text-white/40 mb-2 uppercase tracking-widest leading-loose">Dashboard Ativo: {calcMode.toUpperCase()}</p>
                                          <p className="text-[10px] opacity-20 italic">Use o Omnibar para inserção rápida de {calcMode} no canvas.</p>
                                       </div>
                                    )}
                                  </div>
                               </div>
                               <button className="btn-primary-sc !py-6 text-[11px] hover:shadow-glow-indigo transition-all active:scale-95">Executar Análise PRO</button>
                            </div>

                            <div className="col-span-12 lg:col-span-7 bg-black/60 rounded-[40px] border border-white/5 p-8 flex flex-col shadow-[inset_0_4px_40px_rgba(0,0,0,0.5)]">
                               <div className="flex items-center gap-3 mb-8">
                                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                  <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Console de Saída em Tempo Real</h4>
                               </div>

                               <div className="flex-1 flex flex-col justify-center items-center">
                                 {calcMode === 'calculus' ? (
                                    <div className="w-full grid grid-cols-2 gap-4">
                                       <div className="p-8 rounded-[40px] bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                                          <div className="flex items-center gap-3 mb-4 opacity-40 group-hover:opacity-100 transition-opacity">
                                            <ChevronRight size={14} className="text-indigo-400" />
                                            <p className="text-[9px] font-black uppercase tracking-widest">Diferenciação f'(x₀)</p>
                                          </div>
                                          <p className="text-5xl font-black text-white tracking-tighter leading-none">{calculusResults.deriv || '0.0000'}</p>
                                       </div>
                                       <div className="p-8 rounded-[40px] bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                                          <div className="flex items-center gap-3 mb-4 opacity-40 group-hover:opacity-100 transition-opacity">
                                            <Plus size={14} className="text-emerald-400" />
                                            <p className="text-[9px] font-black uppercase tracking-widest">Integração Definida [a,b]</p>
                                          </div>
                                          <p className="text-5xl font-black text-white tracking-tighter leading-none">{calculusResults.integral || '0.0000'}</p>
                                       </div>
                                       <div className="col-span-2 p-8 rounded-[40px] bg-indigo-500/5 border border-indigo-500/20 text-center">
                                          <p className="text-[9px] font-black uppercase tracking-[0.5em] text-indigo-400 mb-2">Resumo da Curva</p>
                                          <div className="flex justify-center gap-10">
                                            <div className="text-center"><p className="text-[8px] opacity-20 uppercase mb-1">Mínimo</p><p className="font-bold text-xs">--</p></div>
                                            <div className="text-center"><p className="text-[8px] opacity-20 uppercase mb-1">Máximo</p><p className="font-bold text-xs">--</p></div>
                                            <div className="text-center"><p className="text-[8px] opacity-20 uppercase mb-1">Raiz</p><p className="font-bold text-xs">--</p></div>
                                          </div>
                                       </div>
                                    </div>
                                 ) : calcMode === 'stats' ? (
                                    <div className="grid grid-cols-3 gap-4 w-full">
                                       <div className="p-6 rounded-[32px] bg-white/5 border border-white/5 text-center group hover:bg-indigo-500/10 transition-all">
                                          <p className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-2">Média (μ)</p>
                                          <p className="text-4xl font-black text-indigo-400 tracking-tighter">{statsResults.mean || '0.00'}</p>
                                       </div>
                                       <div className="p-6 rounded-[32px] bg-white/5 border border-white/5 text-center group hover:bg-indigo-500/10 transition-all">
                                          <p className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-2">Desvio (σ)</p>
                                          <p className="text-4xl font-black text-emerald-400 tracking-tighter">{statsResults.sd || '0.00'}</p>
                                       </div>
                                       <div className="p-6 rounded-[32px] bg-white/5 border border-white/5 text-center group hover:bg-indigo-500/10 transition-all">
                                          <p className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-2">Amostras (n)</p>
                                          <p className="text-4xl font-black text-amber-400 tracking-tighter">{statsResults.count || '0'}</p>
                                       </div>
                                       <div className="col-span-3 p-8 rounded-[40px] bg-white/5 border border-white/5 flex flex-col gap-6">
                                          <div className="flex justify-between items-center"><p className="text-[9px] font-black tracking-widest opacity-20 uppercase">Distribuição de Frequência</p><div className="flex gap-1">{[40, 70, 50, 90, 60, 80].map((h,i)=>(<div key={i} className="w-4 bg-indigo-500/40 rounded-t-sm" style={{height: h*0.4}}/>))}</div></div>
                                          <div className="grid grid-cols-2 gap-10">
                                            <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-[10px] opacity-30 uppercase">Mediana</span><span className="font-mono text-xs">--</span></div>
                                            <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-[10px] opacity-30 uppercase">Variância</span><span className="font-mono text-xs">--</span></div>
                                            <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-[10px] opacity-30 uppercase">Mínimo</span><span className="font-mono text-xs">--</span></div>
                                            <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-[10px] opacity-30 uppercase">Máximo</span><span className="font-mono text-xs">--</span></div>
                                          </div>
                                       </div>
                                    </div>
                                 ) : (
                                    <div className="text-center space-y-6 opacity-20">
                                       <div className="w-24 h-24 rounded-[40px] bg-white/5 flex items-center justify-center mx-auto border-2 border-white/10">
                                          <Beaker size={48} />
                                       </div>
                                       <div>
                                          <p className="text-[11px] font-black uppercase tracking-[0.5em] mb-2">Algoritmo em Standby</p>
                                          <p className="text-[10px] opacity-50 italic">Execute a operação no painel lateral para visualizar resultados.</p>
                                       </div>
                                    </div>
                                  )}
                               </div>
                            </div>
                        </div>
                      )}
                    </div>

                    {/* STEM PRO MEMORY SIDEBAR */}
                    {showMemory && (
                      <div className="w-[300px] border-l border-white/5 bg-white/5 backdrop-blur-2xl p-6 flex flex-col gap-6 animate-in slide-in-from-right-8 duration-500 relative z-10">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Memória PRO</h4>
                          <Bookmark size={14} className="text-indigo-400" />
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                          <div className="space-y-2">
                            <p className="text-[9px] font-bold text-indigo-400/50 uppercase tracking-widest pl-2">Variáveis ({mathVars.length})</p>
                            {mathVars.map(v => (
                              <div key={v.id} onClick={() => setCalcInput(prev => prev + v.name)} className="bg-black/30 border border-white/5 rounded-2xl p-4 group hover:border-indigo-500/30 transition-all cursor-pointer">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-indigo-400 font-bold text-xs">{v.name}</span>
                                  <button onClick={(e) => { e.stopPropagation(); setMathVars(mathVars.filter(mv => mv.id !== v.id)); }} className="opacity-0 group-hover:opacity-30 hover:!opacity-100 transition-all"><X size={12} /></button>
                                </div>
                                <div className="text-[10px] font-mono text-white/40 truncate">{math.format(v.val)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <button onClick={() => setMathVars([])} className="w-full py-4 rounded-2xl border border-red-500/20 text-red-500/40 hover:text-red-500 transition-all text-[9px] font-black uppercase">Limpar Memória</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PERIODIC TABLE VIEW */}
              {activeTab === 'elements' && (
                <div className="flex-1 flex flex-col animate-in fade-in duration-700 min-h-0">
                  <div className="mb-4 flex justify-between items-end">
                    <div>
                      <h2 className="text-3xl font-light mb-1">Tabela Periódica IUPAC</h2>
                      <p className="text-xs opacity-30 uppercase font-black tracking-widest">Dataset Completo • 118 Elementos</p>
                    </div>
                  </div>
                  <div className="flex-1 bg-black/40 rounded-[48px] border border-white/5 p-6 flex flex-col overflow-hidden">
                    <div className="flex-1 grid grid-cols-18 gap-1.5 min-h-0">
                      {PERIODIC_TABLE.map(el => {
                        const style = getFamilyStyle(el.group);
                        const isSelected = selectedElement?.symbol === el.symbol;
                        return (
                          <div
                            key={el.symbol}
                            onClick={() => setSelectedElement(el)}
                            className="relative aspect-square border-2 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-150 hover:z-[100] group hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
                            style={{
                              gridColumn: el.column, gridRow: el.row,
                              backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : style.bg,
                              borderColor: isSelected ? 'rgba(255,255,255,0.8)' : style.border,
                            }}
                          >
                            <div className="absolute top-[3px] left-[5px] text-[8px] font-black opacity-40">{el.atomicNumber}</div>
                            <div className="text-xl font-black" style={{ color: style.text }}>{el.symbol}</div>
                            <div className="hidden group-hover:block absolute -bottom-8 left-1/2 -translate-x-1/2 px-3 py-1 bg-zinc-900 border border-white/20 rounded-xl shadow-2xl text-[10px] font-bold text-white z-[200] whitespace-nowrap">{el.name}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* CONSTANTS VIEW */}
              {activeTab === 'constants' && (
                <div className="flex-1 flex flex-col animate-in fade-in duration-500">
                  <div className="mb-10 flex items-center justify-between">
                    <div>
                      <h2 className="text-4xl font-light mb-2">Biblioteca Hub</h2>
                      <div className="flex items-center gap-4">
                        <p className="text-xs opacity-30 uppercase font-black tracking-widest">{filteredConstants.length} Itens Mapeados</p>
                        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all">
                          {copyFeedback ? <Check size={12} /> : <Copy size={12} />} JSON
                        </button>
                      </div>
                    </div>
                    <div className="flex bg-white/5 p-2 rounded-3xl border border-white/5">
                      {['All', 'Física', 'Química', 'Matemática', 'Astronomia'].map(p => (
                        <button key={p} onClick={() => setConstantCategory(p)} className={`px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${constantCategory === p ? 'bg-indigo-500 text-white shadow-lg' : 'text-white/30 hover:text-white/60'}`}>{p}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[520px]">
                    <div className="grid grid-cols-1 grid-md-cols-2 lg:grid-cols-4 gap-4">
                      {filteredConstants.map((c, idx) => (
                        <div key={`${c.n}-${idx}`} onClick={() => handleSelect({ type: 'constant', ...c })} className="item-card group h-[130px] flex flex-col justify-between p-5">
                          <div className="flex justify-between items-start">
                            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest px-2 py-0.5 bg-white/5 rounded-md">{c.sc || c.c}</span>
                            <span className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-xl font-black group-hover:bg-indigo-500 transition-all">{c.l}</span>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold mb-1 truncate">{c.n}</h4>
                            <p className="text-xs opacity-30 font-mono truncate">{c.v} <span className="text-[10px] text-indigo-300">{c.u}</span></p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* FORMULAS VIEW */}
              {activeTab === 'formulas' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[600px] w-full">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in slide-in-from-bottom-8 duration-500">
                    {FORMULA_TEMPLATES.map(f => (
                      <div key={f.name} onClick={() => handleSelect({ type: 'formula', ...f })} className="formula-premium-card group p-4 border border-white/5 hover:border-indigo-500/40 rounded-[32px] bg-white/5">
                        <div className="flex flex-col gap-4">
                          <div className="w-full bg-black/40 rounded-[24px] border border-white/5 p-4 flex items-center justify-center min-h-[120px] group-hover:bg-black/60 transition-all">
                            <LatexRenderer formula={f.formula} className="scale-75" />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.3em]">{f.category}</span>
                            <h4 className="text-lg font-bold text-white tracking-tight">{f.name}</h4>
                            <p className="text-[10px] opacity-40 italic line-clamp-1">"{f.usage}"</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'symbols' && (
                <div className="space-y-10 animate-in fade-in duration-500 pb-10">
                  {Object.entries(STEM_SYMBOLS).map(([cat, items]) => (
                    <div key={cat}>
                      <h3 className="section-title !mb-6 text-[10px]">{cat}</h3>
                      <div className="grid grid-cols-12 gap-3">
                        {items.map(sym => (
                          <div key={sym.cmd} onClick={() => handleSelect({ type: 'symbol', ...sym })} className="symbol-tile text-2xl h-16 rounded-[20px] transition-all hover:bg-indigo-500 group relative">
                            {sym.label}
                            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-[8px] rounded opacity-0 group-hover:opacity-100 z-50 whitespace-nowrap pointer-events-none border border-white/10 uppercase font-black">{sym.name || sym.cmd}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>

            {/* ELEMENT DETAIL SIDE PANEL */}
            {activeTab === 'elements' && selectedElement && (
              <div className="w-[480px] bg-black/50 border-l border-white/5 p-12 overflow-y-auto custom-scrollbar animate-in slide-in-from-right duration-500 flex flex-col">
                <div className="flex justify-between items-start mb-16">
                  <div className="w-[140px] h-[140px] rounded-[48px] border-4 flex flex-col items-center justify-center gap-1 shadow-2xl" style={{ borderColor: getFamilyStyle(selectedElement.group).border, background: getFamilyStyle(selectedElement.group).bg }}>
                    <span className="text-lg font-black opacity-40 leading-none">{selectedElement.atomicNumber}</span>
                    <span className="text-6xl font-black">{selectedElement.symbol}</span>
                  </div>
                  <button onClick={() => setSelectedElement(null)} className="p-4 hover:bg-white/10 rounded-full transition-all text-white/20 hover:text-white"><X size={32} /></button>
                </div>
                <h2 className="text-7xl font-black mb-4 tracking-tighter leading-[0.85]">{selectedElement.name}</h2>
                <p className="text-indigo-400 font-bold text-sm uppercase tracking-[0.4em] mb-16 flex items-center gap-4">
                  {selectedElement.group.replace('-', ' ')}
                  {selectedElement.isRadioactive && <span className="px-3 py-1 rounded-lg bg-red-500/20 text-red-500 text-[10px] animate-pulse">RADIOATIVO ☢️</span>}
                </p>
                <div className="space-y-12">
                  <div className="stat-row">
                    <Layers size={24} className="text-orange-400" />
                    <div className="flex-1">
                      <p className="label">Distribuição Eletrônica</p>
                      <p className="text-lg font-mono text-white/80 bg-white/5 p-6 rounded-[32px] border border-white/10 mt-4 leading-relaxed tracking-wider">
                        {selectedElement.electronConfig || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-10">
                    <div className="stat-row">
                      <Thermometer size={24} className="text-indigo-400" />
                      <div>
                        <p className="label">Eletronegatividade</p>
                        <p className="value text-4xl">{selectedElement.electronegativity || '--'}</p>
                      </div>
                    </div>
                    <div className="stat-row">
                      <Weight size={24} className="text-indigo-400" />
                      <div>
                        <p className="label">Massa Atômica</p>
                        <p className="value text-4xl">{selectedElement.atomicMass}</p>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleSelect({ type: 'element', ...selectedElement })} className="btn-primary-sc mt-12">Inserir no Documento</button>
                </div>
              </div>
            )}

            {/* CALCULATOR HISTORY PANEL */}
            {activeTab === 'calc' && isHistoryVisible && (
              <div className="w-[380px] bg-black/80 border-l border-white/5 p-12 animate-in slide-in-from-right duration-500 flex flex-col backdrop-blur-3xl">
                <div className="flex justify-between items-center mb-12">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-indigo-400">Histórico</h3>
                  <button onClick={() => setCalcHistory([])} className="p-2 hover:bg-white/5 rounded-lg opacity-20 hover:opacity-100 transition-all"><Eraser size={18} /></button>
                </div>
                <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar">
                  {calcHistory.map((entry, i) => (
                    <div key={i} onClick={() => setCalcInput(entry.expression)} className="group cursor-pointer p-8 rounded-[32px] bg-white/5 border border-white/5 hover:border-indigo-500/40 transition-all hover:bg-white/10">
                      <div className="text-[10px] opacity-30 font-mono mb-3 truncate italic">{entry.expression} =</div>
                      <div className="text-2xl font-bold group-hover:text-indigo-400 transition-colors leading-none">{entry.result}</div>
                    </div>
                  ))}
                  {calcHistory.length === 0 && <div className="h-full flex flex-col items-center justify-center opacity-10 gap-4"><History size={64} /><p className="font-black uppercase tracking-widest text-xs">Vazio</p></div>}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
      <style>{`
        .math-render-container { font-size: 2.8rem !important; color: white !important; width: 100% !important; display: flex !important; justify-content: center !important; }
        .katex-display { margin: 0 !important; width: 100% !important; overflow-x: auto !important; }
        .grid-cols-18 { grid-template-columns: repeat(18, 1fr); }
        .section-title { font-size: 13px; font-weight: 950; text-transform: uppercase; letter-spacing: 0.5em; color: rgba(255,255,255,0.15); margin-bottom: 40px; }
        .math-card { padding: 48px; border-radius: 64px; background: rgba(99,102,241,0.05); border: 2px solid rgba(99,102,241,0.15); display: flex; items-center; justify-content: space-between; cursor: pointer; transition: all 0.4s; }
        .item-card { border-radius: 48px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 32px; transition: all 0.4s; cursor: pointer; }
        .item-card:hover { transform: translateY(-8px); background: rgba(255,255,255,0.06); border-color: rgba(99,102,241,0.4); box-shadow: 0 30px 60px rgba(0,0,0,0.5); }
        .formula-premium-card { border-radius: 72px; background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.03); padding: 16px; transition: all 0.5s; cursor: pointer; }
        .formula-premium-card:hover { background: rgba(255,255,255,0.03); border-color: rgba(99,102,241,0.4); }
        .calc-btn-sc { height: 60px; border-radius: 20px; background: rgba(99,102,241,0.08); font-weight: 950; text-transform: uppercase; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
        .calc-btn-num { height: 75px; border-radius: 24px; background: rgba(255,255,255,0.03); font-weight: 600; transition: all 0.2s; }
        .calc-btn-num:hover { background: rgba(255,255,255,0.08); transform: scale(1.02); }
        .symbol-tile { aspect-square; display: flex; items-center; justify-content: center; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); cursor: pointer; transition: all 0.3s; font-family: 'STIX Two Math', serif; }
        .symbol-tile:hover { background: rgba(99,102,241,0.15); border-color: rgba(99,102,241,0.5); transform: scale(1.15) rotate(5deg); z-index: 10; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
        .label { font-size: 11px; font-weight: 950; text-transform: uppercase; opacity: 0.3; letter-spacing: 0.3em; margin-bottom: 6px; }
        .value { font-size: 40px; font-weight: 800; letter-spacing: -2px; }
        .btn-primary-sc { width: 100%; padding: 24px 0; border-radius: 28px; background: #6366f1; color: white; font-size: 14px; font-weight: 950; text-transform: uppercase; letter-spacing: 0.2em; transition: all 0.3s; box-shadow: 0 20px 50px rgba(99, 102, 241, 0.4); }
        .btn-primary-sc:hover { transform: translateY(-4px); background: #818cf8; box-shadow: 0 30px 70px rgba(99, 102, 241, 0.6); }
        .shadow-glow-indigo { box-shadow: 0 0 20px rgba(99, 102, 241, 0.4); }
      `}</style>
    </div>,
    document.body
  );
};

const GraphPreview = ({ expr, is3D, zoom, isDarkMode }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!is3D) {
      // 2D PLOTTER
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.beginPath();

      const centerX = w / 2;
      const centerY = h / 2;
      const scale = 40 * zoom;

      // Draw axis
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.beginPath(); ctx.moveTo(0, centerY); ctx.lineTo(w, centerY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(centerX, 0); ctx.lineTo(centerX, h); ctx.stroke();

      ctx.strokeStyle = '#6366f1';
      ctx.beginPath();
      let first = true;
      for (let x = -w / 2; x < w / 2; x += 1) {
        try {
          const mathX = x / scale;
          const mathY = math.evaluate(expr.replace(/x/g, `(${mathX})`));
          const screenY = centerY - (mathY * scale);
          if (first) { ctx.moveTo(centerX + x, screenY); first = false; }
          else { ctx.lineTo(centerX + x, screenY); }
        } catch (e) { }
      }
      ctx.stroke();
    } else {
      // 3D WIREFRAME (Simplified perspective)
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
      ctx.lineWidth = 1;
      const scale = 20 * zoom;
      const points = 20;

      for (let i = -points; i <= points; i++) {
        ctx.beginPath();
        for (let j = -points; j <= points; j++) {
          try {
            const x = i / 2;
            const y = j / 2;
            // Simple surface: we evaluate but replace x,y properly
            const z = math.evaluate(expr.replace(/x/g, `(${x})`).replace(/y/g, `(${y})`));

            // Isometric projection
            const px = (i - j) * scale + w / 2;
            const py = (i + j) * scale / 2 - (z * scale) + h / 2;

            if (j === -points) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          } catch (e) { }
        }
        ctx.stroke();
      }
    }
  }, [expr, is3D, zoom]);

  return <canvas ref={canvasRef} width={640} height={480} className="w-full h-full rounded-[40px]" />;
};

export default ScientificOmnibar;
