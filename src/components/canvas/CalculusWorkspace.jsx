import React, { useState, useRef, useCallback } from 'react';
import { MathService } from '../../services/MathService';
import { useCanvasStore } from '../../store/useCanvasStore';
import { InlineMath } from 'react-katex';
import { Play, Sparkles, Share2, FileText, ChevronRight } from 'lucide-react';

const CalculusWorkspace = ({ canvasPan, canvasScale }) => {
  const [activeTab, setActiveTab] = useState(0); // 0: Derivada, 1: Integral, 2: Limite
  
  // Inputs
  const [derivExpr, setDerivExpr] = useState('x^2 + sin(x)');
  const [derivVar, setDerivVar] = useState('x');

  const [integExpr, setIntegExpr] = useState('3*x^2 - exp(x)');
  const [integVar, setIntegVar] = useState('x');

  const [limitExpr, setLimitExpr] = useState('sin(x)/x');
  const [limitTo, setLimitTo] = useState('0');
  const [limitVar, setLimitVar] = useState('x');

  // Outputs
  const [result, setResult] = useState(null); // { result, steps: Array<{label, latex}> }
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  const handleSolve = () => {
    setResult(null);
    try {
      let res;
      if (activeTab === 0) {
        res = MathService.solveDerivativeSteps(derivExpr, derivVar);
      } else if (activeTab === 1) {
        res = MathService.solveIntegralSteps(integExpr, integVar);
      } else if (activeTab === 2) {
        res = MathService.solveLimitSteps(limitExpr, limitTo, limitVar);
      }
      setResult(res);
    } catch (err) {
      setResult({
        isError: true,
        latex: `\\text{Erro: ${err.message}}`,
        steps: []
      });
    }
  };

  const handleExportNote = (withSteps = false) => {
    if (!result) return;
    setIsExportDropdownOpen(false);

    const zoom = canvasScale || 1;
    const pan = canvasPan || { x: 0, y: 0 };
    
    const centerX = (-pan.x + (window.innerWidth / 2)) / zoom;
    const centerY = (-pan.y + (window.innerHeight / 2)) / zoom;

    const newMathBlocks = [];
    const newConnections = [];

    const generateUID = () => 'calc_' + Math.random().toString(36).substring(2, 7) + '_' + Date.now();

    if (withSteps && result.steps.length > 0) {
      // 1. Block 1 (top): Expression and final result
      const topId = generateUID();
      let topContent = '';
      if (activeTab === 0) {
        topContent = `\\mathbf{\\text{Diferenciação:}} \\\\[8pt] 
          \\frac{d}{d${derivVar}}\\left(${derivExpr}\\right) \\\\[8pt] 
          \\mathbf{\\text{Resultado:}} \\\\[6pt] ${result.result}`;
      } else if (activeTab === 1) {
        topContent = `\\mathbf{\\text{Integração:}} \\\\[8pt] 
          \\int \\left(${integExpr}\\right) d${integVar} \\\\[8pt] 
          \\mathbf{\\text{Resultado:}} \\\\[6pt] ${result.result}`;
      } else {
        topContent = `\\mathbf{\\text{Limite:}} \\\\[8pt] 
          \\lim_{${limitVar} \\to ${limitTo}}\\left(${limitExpr}\\right) \\\\[8pt] 
          \\mathbf{\\text{Resultado:}} \\\\[6pt] ${result.result}`;
      }

      newMathBlocks.push({
        id: topId,
        x: centerX - 120,
        y: centerY - 180,
        content: topContent,
        fixedSize: false,
        color: '#22c55e' // Highlighted green for solution
      });

      // 2. Block 2 (bottom): Step-by-step resolution steps
      const stepsId = generateUID();
      let stepsContent = `\\mathbf{\\text{Etapas de Resolução (Cálculo Símbolico):}} \\\\[12pt] `;

      result.steps.forEach((step, idx) => {
        stepsContent += `\\mathbf{\\text{Passo } ${idx + 1}: } \\text{${step.label}} \\\\[6pt] ${step.latex}`;
        if (idx < result.steps.length - 1) {
          stepsContent += ` \\\\[8pt] \\rule{160pt}{0.3pt} \\\\[10pt] `;
        }
      });

      newMathBlocks.push({
        id: stepsId,
        x: centerX - 120,
        y: centerY + 140,
        content: stepsContent,
        fixedSize: false,
        color: '#6366f1' // Indigo
      });

      // 3. Arrow Connection
      newConnections.push({
        id: generateUID(),
        fromId: topId,
        fromSide: 'bottom',
        toId: stepsId,
        toSide: 'top',
        color: '#6366f1',
        lineStyle: 'solid'
      });
    } else {
      // Simple Export (Result Only)
      const resId = generateUID();
      let content = '';

      if (activeTab === 0) {
        content = `\\frac{d}{d${derivVar}}\\left(${derivExpr}\\right) = ${result.result}`;
      } else if (activeTab === 1) {
        content = `\\int \\left(${integExpr}\\right) d${integVar} = ${result.result}`;
      } else {
        content = `\\lim_{${limitVar} \\to ${limitTo}}\\left(${limitExpr}\\right) = ${result.result}`;
      }

      newMathBlocks.push({
        id: resId,
        x: centerX - 120,
        y: centerY - 60,
        content,
        fixedSize: false,
        color: '#6366f1'
      });
    }

    // Add to Zustand Store
    const setMathBlocks = useCanvasStore.getState().setMathBlocks;
    const setConnections = useCanvasStore.getState().setConnections;

    setMathBlocks(prev => [...prev, ...newMathBlocks]);
    setConnections(prev => [...prev, ...newConnections]);
  };

  return (
    <div className="flex-1 flex gap-6 h-full select-none" onPointerDown={e => e.stopPropagation()}>
      
      {/* LEFT COLUMN: ACTIVE TAB PANEL */}
      <div className="w-1/2 flex flex-col gap-4 min-h-0">
        
        {/* TABS SELECTOR */}
        <div className="flex gap-1 bg-white/[0.02] border border-white/5 p-1 rounded-2xl shrink-0">
          {[
            { id: 0, label: 'Derivada' },
            { id: 1, label: 'Integral' },
            { id: 2, label: 'Limite' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setResult(null); }}
              className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === tab.id ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-white/30 hover:text-white/60'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* CONTROLS AREA */}
        <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-[35px] p-6 flex flex-col justify-between overflow-y-auto custom-scrollbar">
          
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                {activeTab === 0 ? 'Diferenciação Simbólica' : activeTab === 1 ? 'Integração Simbólica' : 'Limites de Funções'}
              </span>
              <p className="text-[8px] uppercase tracking-wider text-white/20 font-bold">Defina a expressão matemática didática</p>
            </div>

            {/* TAB 0: DERIVATIVES */}
            {activeTab === 0 && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                <div className="flex flex-col gap-2">
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Expressão f(x)</span>
                  <input
                    type="text"
                    value={derivExpr}
                    onChange={(e) => setDerivExpr(e.target.value)}
                    className="bg-black/45 border border-white/5 rounded-xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-indigo-500/40 w-full"
                    placeholder="Ex: x^2 + sin(x)"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Variável de Diferenciação</span>
                  <input
                    type="text"
                    value={derivVar}
                    onChange={(e) => setDerivVar(e.target.value)}
                    className="w-20 bg-black/45 border border-white/5 rounded-xl px-4 py-3 text-center text-xs text-white font-mono outline-none focus:border-indigo-500/40"
                    placeholder="x"
                  />
                </div>
              </div>
            )}

            {/* TAB 1: INTEGRALS */}
            {activeTab === 1 && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                <div className="flex flex-col gap-2">
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Função Integranda f(x)</span>
                  <input
                    type="text"
                    value={integExpr}
                    onChange={(e) => setIntegExpr(e.target.value)}
                    className="bg-black/45 border border-white/5 rounded-xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-indigo-500/40 w-full"
                    placeholder="Ex: 3*x^2 - exp(x)"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Variável de Integração</span>
                  <input
                    type="text"
                    value={integVar}
                    onChange={(e) => setIntegVar(e.target.value)}
                    className="w-20 bg-black/45 border border-white/5 rounded-xl px-4 py-3 text-center text-xs text-white font-mono outline-none focus:border-indigo-500/40"
                    placeholder="x"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: LIMITS */}
            {activeTab === 2 && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                <div className="flex flex-col gap-2">
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Função f(x)</span>
                  <input
                    type="text"
                    value={limitExpr}
                    onChange={(e) => setLimitExpr(e.target.value)}
                    className="bg-black/45 border border-white/5 rounded-xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-indigo-500/40 w-full"
                    placeholder="Ex: sin(x)/x"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Variável</span>
                    <input
                      type="text"
                      value={limitVar}
                      onChange={(e) => setLimitVar(e.target.value)}
                      className="bg-black/45 border border-white/5 rounded-xl px-4 py-3 text-center text-xs text-white font-mono outline-none focus:border-indigo-500/40 w-full"
                      placeholder="x"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Ponto de Aproximação x0</span>
                    <input
                      type="text"
                      value={limitTo}
                      onChange={(e) => setLimitTo(e.target.value)}
                      className="bg-black/45 border border-white/5 rounded-xl px-4 py-3 text-center text-xs text-white font-mono outline-none focus:border-indigo-500/40 w-full"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleSolve}
            className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all shadow-glow-indigo active:scale-98 mt-6 shrink-0"
          >
            <Play size={14} fill="white" />
            Calcular Passo a Passo
          </button>
        </div>
      </div>

      {/* RIGHT COLUMN: RESOLUTION & RESULTS PANEL */}
      <div className="w-1/2 flex flex-col min-h-0 bg-[#0a0a0c]/60 border border-white/5 rounded-[40px] p-6 overflow-hidden relative shadow-inner-soft">
        
        {/* PANEL HEADER */}
        <div className="flex justify-between items-center shrink-0 border-b border-white/5 pb-2">
          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Painel de Resolução</span>
          
          {result && !result.isError && (
            <div className="relative">
              <button
                onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                className="h-8 px-3 rounded-xl bg-white text-black hover:bg-indigo-50 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-md active:scale-95 animate-pulse"
              >
                <Share2 size={12} />
                Add à Nota
              </button>

              {/* EXPORT DROPDOWN */}
              {isExportDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-[#16161a] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 p-2 flex flex-col gap-1.5 animate-in zoom-in-95 duration-200">
                  <button
                    onClick={() => handleExportNote(false)}
                    className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-xl text-white text-[10px] font-bold flex items-center gap-2 transition-colors"
                  >
                    <FileText size={12} className="text-indigo-400" />
                    Apenas Resultado
                  </button>
                  {result.steps.length > 0 && (
                    <button
                      onClick={() => handleExportNote(true)}
                      className="w-full text-left px-3 py-2 hover:bg-indigo-500/10 rounded-xl text-indigo-300 text-[10px] font-bold flex items-center gap-2 transition-colors border border-indigo-500/10"
                    >
                      <Sparkles size={12} className="text-indigo-400 animate-pulse" />
                      Passos e Resultado (Blocos Ligados)
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RESOLUTION ZONE */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-4 mt-4">
          {result ? (
            <div className="flex flex-col gap-5 animate-in fade-in duration-300">
              
              {/* FINAL RESULT BOX */}
              <div className={`p-5 rounded-2xl border ${result.isError ? 'bg-red-500/5 border-red-500/20 text-red-400' : 'bg-indigo-500/5 border-indigo-500/20 text-white'} flex flex-col gap-2 shrink-0`}>
                <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Resultado Final</span>
                <div className="text-xl font-medium overflow-x-auto py-2 custom-scrollbar">
                  <InlineMath math={result.isError ? result.latex : result.result} />
                </div>
              </div>

              {/* Resolution steps list */}
              {result.steps && result.steps.length > 0 && (
                <div className="flex flex-col gap-4">
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Demonstração das Etapas</span>
                  
                  {result.steps.map((step, idx) => (
                    <div key={idx} className="flex gap-4 items-stretch group/step">
                      {/* Line connector */}
                      <div className="flex flex-col items-center gap-1.5 shrink-0">
                        <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 text-white/50 text-[9px] font-black flex items-center justify-center group-hover/step:border-indigo-500/50 group-hover/step:text-indigo-400 transition-colors">
                          {idx + 1}
                        </div>
                        {idx < result.steps.length - 1 && <div className="w-[1.5px] bg-white/5 flex-1" />}
                      </div>

                      {/* Step content */}
                      <div className="flex-1 pb-4">
                        <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-indigo-500/10 hover:bg-white/[0.02] flex flex-col gap-3 transition-all duration-300">
                          <span className="text-[9px] font-black text-white/60 uppercase tracking-wide leading-relaxed">{step.label}</span>
                          <div className="text-sm overflow-x-auto py-1 custom-scrollbar text-indigo-200">
                            <InlineMath math={step.latex} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          ) : (
            <div className="h-full flex flex-col justify-center items-center opacity-20 py-20">
              <Sparkles size={48} className="mb-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.5em]">Pronto para Resolver</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default CalculusWorkspace;
