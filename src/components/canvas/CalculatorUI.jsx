import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Calculator, Zap, Hash, Layers, MoveUp, BookOpen,
  Radiation, FunctionSquare, ChevronRight, Search,
  Eraser, Bookmark, X, ArrowLeft, ArrowRight, Maximize2, LineChart,
  ChevronUp, ChevronDown
} from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';

// LOAD GGB
let ggbScriptPromise = null;
const loadGGBScript = () => {
  if (ggbScriptPromise) return ggbScriptPromise;
  if (window.GGBApplet) return Promise.resolve();
  ggbScriptPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://www.geogebra.org/apps/deployggb.js';
    script.async = true;
    script.onload = resolve;
    document.head.appendChild(script);
  });
  return ggbScriptPromise;
};

export const ModeRail = ({ activeMode, setMode }) => {
  const modes = [
    { id: 'calculate', icon: Calculator, label: 'Cálculo' },
    { id: 'complex', icon: Zap, label: 'Complexos' },
    { id: 'base-n', icon: Hash, label: 'Base-N' },
    { id: 'matrix', icon: Layers, label: 'Matrizes' },
    { id: 'vector', icon: MoveUp, label: 'Vetores' },
    { id: 'stats', icon: BookOpen, label: 'Estatística' },
    { id: 'graph', icon: LineChart, label: 'Gráfico' },
    { id: 'table', icon: FunctionSquare, label: 'Tabela' },
    { id: 'equation', icon: ChevronRight, label: 'Equação' },
    { id: 'spreadsheet', icon: Search, label: 'Planilha' }
  ];

  return (
    <div className="w-14 border-r border-white/5 bg-white/5 backdrop-blur-3xl flex flex-col items-center py-6 gap-6">
      {modes.map(m => (
        <button
          key={m.id}
          onClick={(e) => {
            e.stopPropagation();
            setMode(m.id);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className={`p-3 rounded-2xl transition-all duration-300 group relative pointer-events-auto ${activeMode === m.id ? 'bg-indigo-500 text-white shadow-glow-indigo' : 'text-white/20 hover:text-white/40'
            }`}
        >
          <m.icon size={20} />
          <span className="absolute left-16 bg-black/90 text-[8px] font-black uppercase px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity border border-white/10 pointer-events-none whitespace-nowrap z-50">
            {m.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export const DPad = ({ onAction }) => {
  return (
    <div className="relative w-40 h-40 flex items-center justify-center p-4">
      <div className="absolute inset-2 rounded-full border border-white/5 bg-white/[0.02] shadow-inner-soft" />
      <button
        onClick={(e) => { e.stopPropagation(); onAction('key_up'); }}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-2 p-2 text-white/40 hover:text-white hover:scale-110 transition-all pointer-events-auto"
      >
        <ChevronUp size={24} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onAction('key_left'); }}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute left-2 p-2 text-white/40 hover:text-white hover:scale-110 transition-all pointer-events-auto"
      >
        <ArrowLeft size={24} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onAction('key_right'); }}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute right-2 p-2 text-white/40 hover:text-white hover:scale-110 transition-all pointer-events-auto"
      >
        <ArrowRight size={24} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onAction('key_down'); }}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute bottom-2 p-2 text-white/40 hover:text-white hover:scale-110 transition-all pointer-events-auto"
      >
        <ChevronDown size={24} />
      </button>
      <div className="w-10 h-10 rounded-full bg-indigo-500/10 blur-xl animate-pulse" />
      <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10" />
    </div>
  );
};

export const GGBPreview = ({ expression, isVisible }) => {
  const containerRef = useRef(null);
  const ggbApiRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!isVisible) return;
    let mounted = true;

    loadGGBScript().then(() => {
      if (!mounted || !containerRef.current || ggbApiRef.current) return;

      const parameters = {
        "appName": "graphing",
        "width": 450,
        "height": 450,
        "showToolBar": false,
        "showAlgebraInput": false,
        "showMenuBar": false,
        "showZoomButtons": false,
        "appletOnLoad": (api) => {
          if (!mounted) return;
          ggbApiRef.current = api;
          setIsLoaded(true);
          api.setPerspective("G");
          api.setGridVisible(true);
          api.setAxesVisible(true, true);
        }
      };

      const applet = new window.GGBApplet(parameters, true);
      applet.inject(containerRef.current);
    });

    return () => { mounted = false; };
  }, [isVisible]);

  useEffect(() => {
    if (isLoaded && ggbApiRef.current && expression) {
      const api = ggbApiRef.current;
      try {
        api.evalCommand(expression);
      } catch (e) { }
    }
  }, [expression, isLoaded]);

  if (!isVisible) return null;

  return (
    <div className="w-[450px] h-[450px] rounded-[40px] border border-white/10 bg-black/40 overflow-hidden relative group">
      <div className="absolute inset-0 border border-indigo-500/10 group-hover:border-indigo-500/20 transition-all pointer-events-none z-10" />
      <div ref={containerRef} className="w-full h-full opacity-60 hover:opacity-100 transition-opacity duration-700" />
      {!isLoaded && <div className="absolute inset-0 flex items-center justify-center animate-pulse text-[10px] font-black text-indigo-400">ENGINE LOAD...</div>}
    </div>
  );
};

export const DisplayLCD = ({ expression, result, isCtrl, isAlpha, activeMode, cursorPosition, unitMode = 'deg', isSymbolic = true, isAllSelected = false }) => {
  return (
    <div className="w-full bg-[#0a0a0b]/80 backdrop-blur-2xl rounded-[40px] border border-white/10 p-10 flex flex-col shadow-[0_40px_100px_rgba(0,0,0,0.8),inset_0_2px_20px_rgba(255,255,255,0.05)] relative overflow-hidden group">
      <div className="absolute inset-0 rounded-[40px] border border-indigo-500/10 pointer-events-none group-hover:border-indigo-500/20 transition-all duration-700" />

      <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
        <div className="flex gap-4">
          <span className={`text-[10px] font-black transition-all ${isCtrl ? 'text-[#00d2ff] opacity-100 drop-shadow-[0_0_8px_rgba(0,210,255,0.6)]' : 'opacity-10'}`}>[CTRL]</span>
          <span className={`text-[10px] font-black transition-all ${isAlpha ? 'text-[#bd00ff] opacity-100 drop-shadow-[0_0_8px_rgba(189,0,255,0.6)]' : 'opacity-10'}`}>[ALT]</span>
          <span className="text-[10px] font-black opacity-10 tracking-widest">[D] [M] [MATH]</span>
        </div>
        <div className="flex items-center gap-4">
          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${isSymbolic ? 'text-[#10b981] border-[#10b981]/20 bg-[#10b981]/5' : 'text-[#f43f5e] border-[#f43f5e]/20 bg-[#f43f5e]/5'}`}>
            {isSymbolic ? "FRACT" : "DEC"}
          </span>
          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${unitMode === 'deg' ? 'text-[#00d2ff] border-[#00d2ff]/20 bg-[#00d2ff]/5' : 'text-[#bd00ff] border-[#bd00ff]/20 bg-[#bd00ff]/5'}`}>
            {unitMode.toUpperCase()}
          </span>
          <span className="text-[9px] font-black uppercase tracking-[0.6em] opacity-30 italic">{activeMode}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-end items-end gap-2 pr-4 h-[120px]">
        <div className={`text-white/95 text-4xl font-light tracking-wide min-h-[1.5em] flex items-center relative group/input transition-all duration-300 ${isAllSelected ? 'bg-indigo-500/20 ring-4 ring-indigo-500/10 rounded-xl px-4 py-1' : ''}`}>
          <InlineMath math={(() => {
            const cursor = '\\color{#6366f1}{\\rule[-0.15em]{0.1em}{1.1em}}';
            let rawWithCursor = expression.slice(0, cursorPosition) + '___CURSOR___' + expression.slice(cursorPosition);

            // 1. Protection phase for cursor placeholder (Avoid sanitizing the marker)
            const protectedStr = rawWithCursor.replace('___CURSOR___', 'KURSOR');

            // 2. SECURE SANITIZATION: Escape all LaTeX reserved chars (EXCEPT SPACES)
            // Space escaping was causing empty fields to appear non-empty after sanitization.
            const sanitized = protectedStr.replace(/([#$ %&_{}])/g, (m) => m === ' ' ? ' ' : '\\' + m);

            // 3. Math transformations AFTER sanitization
            // Universal Helper: Injects \Box if the field is empty or contains only the cursor
            const drawBox = (s) => {
              const clean = s.replace('KURSOR', '').replace(/\\/g, '').trim();
              if (clean === '') {
                // Return a Box, but preserve the cursor if it was inside
                return `\\Box{${s.includes('KURSOR') ? 'KURSOR' : ''}}`;
              }
              return s;
            };

            const processLatexCall = (text, funcMatch, replacer) => {
              let result = text;
              let searchIdx = 0;
              let target = funcMatch + '(';
              while ((searchIdx = result.indexOf(target, searchIdx)) !== -1) {
                let start = searchIdx + funcMatch.length;
                let d = 0, end = -1;
                for (let i = start; i < result.length; i++) {
                  if (result[i] === '(') d++;
                  else if (result[i] === ')') {
                    d--;
                    if (d === 0) { end = i; break; }
                  }
                }
                if (end !== -1) {
                  let inner = result.substring(start + 1, end);
                  let args = [], currentArg = '', argD = 0;
                  for (let i = 0; i < inner.length; i++) {
                    if (inner[i] === '(') argD++;
                    else if (inner[i] === ')') argD--;
                    if (inner[i] === ',' && argD === 0) { args.push(currentArg); currentArg = ''; }
                    else { currentArg += inner[i]; }
                  }
                  args.push(currentArg);
                  let replaced = replacer(args);
                  result = result.substring(0, searchIdx) + replaced + result.substring(end + 1);
                  searchIdx += replaced.length;
                } else { searchIdx += target.length; }
              }
              return result;
            };

            const findClosingParen = (text, startIdx) => {
              let d = 0;
              for (let i = startIdx; i < text.length; i++) {
                if (text[i] === '(') d++;
                else if (text[i] === ')') {
                  d--;
                  if (d === 0) return i;
                }
              }
              return -1;
            };

            const findOpeningParen = (text, endIdx) => {
              let d = 0;
              for (let i = endIdx; i >= 0; i--) {
                if (text[i] === ')') d++;
                else if (text[i] === '(') {
                  d--;
                  if (d === 0) return i;
                }
              }
              return -1;
            };

            const processLatexFractions = (text) => {
              let result = text;
              let searchIdx = 0;
              while ((searchIdx = result.indexOf('/', searchIdx)) !== -1) {
                const slashIdx = searchIdx;
                let numEnd = slashIdx - 1;
                let denStart = slashIdx + 1;
                
                // Numerator: Skip spaces and KURSOR
                while (numEnd >= 0) {
                  if (result[numEnd] === ' ') { numEnd--; continue; }
                  if (numEnd >= 5 && result.substring(numEnd - 5, numEnd + 1) === 'KURSOR') { numEnd -= 6; continue; }
                  break;
                }
                
                // Denominator: Skip spaces and KURSOR
                while (denStart < result.length) {
                  if (result[denStart] === ' ') { denStart++; continue; }
                  if (denStart + 5 < result.length && result.substring(denStart, denStart + 6) === 'KURSOR') { denStart += 6; continue; }
                  break;
                }

                let numStart = -1, denEnd = -1;
                if (numEnd >= 0 && result[numEnd] === ')') numStart = findOpeningParen(result, numEnd);
                if (denStart < result.length && result[denStart] === '(') denEnd = findClosingParen(result, denStart);

                if (numStart !== -1 && denStart !== -1 && denEnd !== -1) {
                  // Isolate the true mathematical content (excluding the structural parens)
                  const numContent = result.substring(numStart + 1, numEnd);
                  const denContent = result.substring(denStart + 1, denEnd);
                  
                  // Capture KURSORs that might have been adjacent to the slash
                  const cursorsBeforeSlash = result.substring(numEnd + 1, slashIdx).replaceAll(' ', '').replaceAll(')', '');
                  const cursorsAfterSlash = result.substring(slashIdx + 1, denStart).replaceAll(' ', '').replaceAll('(', '');
                  
                  const replaced = `\\frac{${drawBox(numContent.trim() || cursorsBeforeSlash)}}{${drawBox(denContent.trim() || cursorsAfterSlash)}}`;
                  result = result.substring(0, numStart) + replaced + result.substring(denEnd + 1);
                  searchIdx = numStart + replaced.length;
                } else {
                  searchIdx++;
                }
              }
              return result;
            };

            let processed = sanitized.replace(/\*/g, '\\times ');

            // 1. Process Nested Structural Calls
            processed = processLatexCall(processed, 'integral', (args) => {
              const f = args[0] || ''; const a = args[1] || ''; const b = args[2] || ''; const v = args[3] || 'x';
              if (args.length <= 1) return `\\int ${drawBox(f)} \\, dx`;
              return `\\int_{${drawBox(a)}}^{${drawBox(b)}} ${drawBox(f)} \\, d${drawBox(v)}`;
            });
            processed = processLatexCall(processed, 'diff', (args) => {
              const f = args[0] || ''; const a = args[1] || '';
              if (!a.trim() && !a.includes('KURSOR')) return `\\frac{d}{dx} (${drawBox(f)})`;
              return `\\left. \\frac{d}{dx} (${drawBox(f)}) \\right|_{x=${drawBox(a)}}`;
            });
            processed = processLatexCall(processed, 'sqrt', (args) => `\\sqrt{${drawBox(args[0] || '')}}`);

            // 2. Optimized Power Scanner
            let powerSearch = 0;
            while ((powerSearch = processed.indexOf('^', powerSearch)) !== -1) {
              const caretIdx = powerSearch;
              
              // Find Exponent Start (skip spaces and KURSOR)
              let openScan = caretIdx + 1;
              while (openScan < processed.length) {
                if (processed[openScan] === ' ') { openScan++; continue; }
                if (openScan + 5 < processed.length && processed.substring(openScan, openScan + 6) === 'KURSOR') { openScan += 6; continue; }
                break;
              }

              // Find Base End (skip spaces and KURSOR)
              let baseEnd = caretIdx - 1;
              while (baseEnd >= 0) {
                if (processed[baseEnd] === ' ') { baseEnd--; continue; }
                if (baseEnd >= 5 && processed.substring(baseEnd - 5, baseEnd + 1) === 'KURSOR') { baseEnd -= 6; continue; }
                break;
              }

              // Scan Boundaries
              let openIdx = processed.indexOf('(', openScan);
              if (openIdx === openScan) {
                let closeIdx = findClosingParen(processed, openIdx);
                if (closeIdx !== -1) {
                  let bStart = -1, isParenBase = false, baseContent = "";
                  if (baseEnd >= 0 && processed[baseEnd] === ')') {
                    bStart = findOpeningParen(processed, baseEnd);
                    if (bStart !== -1) {
                      isParenBase = true;
                      baseContent = processed.substring(bStart + 1, baseEnd);
                    }
                  } else {
                    const beforeText = processed.substring(0, baseEnd + 1);
                    const baseMatch = beforeText.match(/([a-zA-Z0-9]+)$/);
                    if (baseMatch) {
                      baseContent = baseMatch[1];
                      bStart = baseEnd - baseContent.length + 1;
                    }
                  }

                  if (bStart !== -1) {
                     const postBaseCursors = processed.substring(baseEnd + 1, caretIdx).replace(/\s/g, '');
                     const postCaretCursors = processed.substring(caretIdx + 1, openIdx).replace(/\s/g, '');
                     const exponentContent = processed.substring(openIdx + 1, closeIdx);
                     
                     const replaced = `{${drawBox(baseContent + postBaseCursors)}}^{${drawBox(postCaretCursors + exponentContent)}}`;
                     processed = processed.substring(0, bStart) + replaced + processed.substring(closeIdx + 1);
                     powerSearch = bStart + replaced.length;
                     continue;
                  }
                }
              }
              powerSearch++;
            }

            // 3. Nested Fraction Scanner
            processed = processLatexFractions(processed);

            let latex = processed
              .replace(/nthRoot\(([^,]*),?([^)]*)\)/g, (match, a, b) => `\\sqrt[${drawBox(b)}]{${drawBox(a)}}`)
              .replace(/log\(([^,]*),?([^)]*)\)/g, (match, x, b) => (!b.trim() && !b.includes('KURSOR')) ? `\\log(${drawBox(x)})` : `\\log_{${drawBox(b)}}(${drawBox(x)})`)
              .replace(/\(\s*(KURSOR)?\s*(.*?)\s*(KURSOR)?\s*\)\s*(KURSOR)?\s*\^\s*(KURSOR)?\s*\(\s*(KURSOR)?\s*(.*?)\s*(KURSOR)?\s*\)/g, (match, k1, p1, k2, k3, k4, k5, p2, k6) => `${drawBox((k1||'') + p1 + (k2||''))}^{${drawBox((k3||'') + (k4||'') + (k5||'') + p2 + (k6||''))}}`)
              .replace(/√(\d+|\w+)/g, '\\sqrt{$1}')
              .replace(/([a-zA-Z√/_]+)(?=\s*\()/g, '\\mathbf{\\color{#00d2ff}{$1}}')
              .replace(/(?<![a-zA-Z\\])\b([a-zA-Z√/_])\b/g, '\\mathbf{\\color{#00d2ff}{$1}}')
              .replace(/\(\s*KURSOR\s*\)/g, 'KURSOR')
              .replace(/\(\s*\)/g, ' ')
              .replace(/(^|\s)[\/\^](\s|$)/g, ' ')
              .replace('KURSOR', cursor);

            return latex || ' ';
          })()} />
        </div>
        <div className="text-white text-3xl sm:text-5xl font-black tracking-tighter leading-none mt-4 drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] flex items-center justify-end">
          {result && (
            <InlineMath math={(() => {
              if (result.isTex) return result.text;
              const str = result.toString();
              if (str.includes('/')) {
                const parts = str.split('/');
                const num = parts[0].trim().replace(/√(\d+|\w+)/g, '\\sqrt{$1}');
                const den = parts[1].trim().replace(/√(\d+|\w+)/g, '\\sqrt{$1}');
                return `\\frac{${num}}{${den}}`;
              }
              return str.replace(/√(\d+|\w+)/g, '\\sqrt{$1}');
            })()} />
          )}
        </div>
      </div>
    </div>
  );
};

export const ScientificButton = ({ id, keyData, onClick, isCtrl, isAlpha, variant = "num", className = "" }) => {
  const { normal, shift, alpha, label, shiftLabel, alphaLabel } = keyData;
  const isNumeric = variant === "num";
  const isScientific = variant === "sci";

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(id);
        e.currentTarget.blur();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className={`relative rounded-3xl border transition-all duration-500 group flex flex-col items-center justify-center shadow-neumat active:shadow-neumat-inner active:scale-95 overflow-hidden ${isNumeric ? 'h-24 bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10' :
        isScientific ? 'h-16 bg-white/[0.015] border-white/[0.03] hover:bg-white/[0.04]' :
          (id === 'key_shift' && isCtrl) ? 'h-16 bg-[#00d2ff]/20 border-[#00d2ff]/40 shadow-[0_0_20px_rgba(0,210,255,0.3)]' :
            (id === 'key_alpha' && isAlpha) ? 'h-16 bg-[#bd00ff]/20 border-[#bd00ff]/40 shadow-[0_0_20px_rgba(189,0,255,0.3)]' :
              'h-16 bg-white/[0.02] border-white/10 hover:bg-white/[0.05]'
        } ${className}`}
    >
      <div className="absolute top-2.5 w-full px-3.5 flex justify-between pointer-events-none">
        <span className={`text-[11px] font-black transition-all duration-300 ${(isCtrl || (id === 'key_shift' && isCtrl)) ? 'text-[#00d2ff] opacity-100 scale-110 drop-shadow-[0_0_8px_rgba(0,210,210,0.6)]' : 'text-[#00d2ff]/60 opacity-60'
          }`}>{shiftLabel || shift}</span>
        <span className={`text-[11px] font-black transition-all duration-300 ${(isAlpha || (id === 'key_alpha' && isAlpha)) ? 'text-[#bd00ff] opacity-100 scale-110 drop-shadow-[0_0_8px_rgba(189,255,189,0.6)]' : 'text-[#bd00ff]/60 opacity-60'
          }`}>{alphaLabel || alpha}</span>
      </div>
      <span className={`font-bold transition-all ${isNumeric ? 'text-lg tracking-widest text-white' :
        'text-[12px] ' + (isCtrl ? 'text-[#3b82f6]/40' : isAlpha ? 'text-[#a855f7]/40' : 'text-white/60')
        }`}>
        {label || normal}
      </span>
      <div className="absolute inset-0 bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
};
