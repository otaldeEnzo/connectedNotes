import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  Calculator,
  Zap,
  Hash,
  Layers,
  MoveUp,
  BookOpen,
  Radiation,
  FunctionSquare,
  ChevronRight,
  Search,
  Eraser,
  Bookmark,
  X,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  LineChart,
  ChevronUp,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import "katex/dist/katex.min.css";
import { InlineMath } from "react-katex";

// LOAD GGB
let ggbScriptPromise = null;
const loadGGBScript = () => {
  if (ggbScriptPromise) return ggbScriptPromise;
  if (window.GGBApplet) return Promise.resolve();
  ggbScriptPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://www.geogebra.org/apps/deployggb.js";
    script.async = true;
    script.onload = resolve;
    document.head.appendChild(script);
  });
  return ggbScriptPromise;
};

export const ModeRail = ({ activeMode, setMode }) => {
  const modes = [
    { id: "calculate", icon: Calculator, label: "Cálculo" },
    { id: "complex", icon: Zap, label: "Complexos" },
    { id: "base-n", icon: Hash, label: "Base-N" },
    { id: "matrix", icon: Layers, label: "Matrizes" },
    { id: "vector", icon: MoveUp, label: "Vetores" },
    { id: "stats", icon: BookOpen, label: "Estatística" },
    { id: "graph", icon: LineChart, label: "Gráfico" },
    { id: "table", icon: FunctionSquare, label: "Tabela" },
    { id: "equation", icon: ChevronRight, label: "Equação" },
    { id: "calculus", icon: Sparkles, label: "Passo a Passo" },
    { id: "spreadsheet", icon: Search, label: "Planilha" },
  ];

  return (
    <div className="w-14 border-r border-white/5 bg-white/5 backdrop-blur-3xl flex flex-col items-center py-6 gap-6">
      {modes.map((m) => (
        <button
          key={m.id}
          onClick={(e) => {
            e.stopPropagation();
            setMode(m.id);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className={`p-3 rounded-2xl transition-all duration-300 group relative pointer-events-auto ${
            activeMode === m.id
              ? "bg-indigo-500 text-white shadow-glow-indigo"
              : "text-white/20 hover:text-white/40"
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
        onClick={(e) => {
          e.stopPropagation();
          onAction("key_up");
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-2 p-2 text-white/40 hover:text-white hover:scale-110 transition-all pointer-events-auto"
      >
        <ChevronUp size={24} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAction("key_left");
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute left-2 p-2 text-white/40 hover:text-white hover:scale-110 transition-all pointer-events-auto"
      >
        <ArrowLeft size={24} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAction("key_right");
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute right-2 p-2 text-white/40 hover:text-white hover:scale-110 transition-all pointer-events-auto"
      >
        <ArrowRight size={24} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAction("key_down");
        }}
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

export const GGBPreview = forwardRef(({ functions = [], params = {}, onParamsChange, isVisible }, ref) => {
  const wrapperRef = useRef(null);
  const containerRef = useRef(null);
  const ggbApiRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [traceData, setTraceData] = useState(null); // { x, y, px, py } for Trace Mode

  // Expose API methods to parent
  useImperativeHandle(ref, () => ({
    getSnapshot: (callback) => {
      if (ggbApiRef.current && typeof callback === 'function') {
        ggbApiRef.current.getScreenshotBase64(callback);
      }
    },
    getApi: () => ggbApiRef.current
  }));

  // Sync size from wrapper to GGB API
  const syncSize = useCallback(() => {
    if (!wrapperRef.current || !ggbApiRef.current) return;
    const w = wrapperRef.current.clientWidth;
    const h = wrapperRef.current.clientHeight;
    if (w > 40 && h > 40) {
      try {
        ggbApiRef.current.setSize(Math.floor(w), Math.floor(h));
      } catch (e) {}
    }
  }, []);

  // Initialize GeoGebra
  useEffect(() => {
    if (!isVisible) return;
    let mounted = true;

    const initGGB = () => {
      loadGGBScript()
        .then(() => {
          if (!mounted || !containerRef.current || ggbApiRef.current) return;

          if (!window.GGBApplet) {
            setError("Erro: Motor GGB não encontrado.");
            return;
          }

          // Use actual pixel dimensions from the wrapper
          const w = wrapperRef.current?.clientWidth || 800;
          const h = wrapperRef.current?.clientHeight || 600;

          const parameters = {
            appName: "graphing",
            width: Math.floor(w),
            height: Math.floor(h),
            showToolBar: false,
            showAlgebraInput: false,
            showMenuBar: false,
            showZoomButtons: false,
            enableLabelDrags: false,
            enableShiftDragZoom: true,
            enableRightClick: false,
            allowRescale: true,
            allowUpscale: true,
            showErrorDialogs: false,
            errorDialogsActive: false, // Added redundant key for safety
            borderColor: "transparent",
            language: "pt",
            appletOnLoad: (api) => {
              if (!mounted) return;
              ggbApiRef.current = api;
              setIsLoaded(true);
              
              // Forcefully disable error dialogs via API
              try {
                api.setErrorDialogsActive(false);
              } catch(e) {}
              
              api.setPerspective("G");
              api.setGridVisible(true);
              api.setAxesVisible(true, true);

              // Force correct size after load
              setTimeout(() => {
                syncSize();
              }, 50);
            },
          };

          try {
            const applet = new window.GGBApplet(parameters, true);
            applet.inject(containerRef.current);
          } catch (e) {
            setError(`Erro de injeção: ${e.message}`);
          }
        })
        .catch((err) => {
          setError(`Falha ao carregar script: ${err.message}`);
        });
    };

    const timer = setTimeout(initGGB, 150);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [isVisible, syncSize]);

  // ResizeObserver on WRAPPER (not on GGB container)
  useEffect(() => {
    if (!isLoaded || !wrapperRef.current) return;

    let raf;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(syncSize);
    });

    observer.observe(wrapperRef.current);

    // Also listen to window resize as fallback
    const onWindowResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(syncSize);
    };
    window.addEventListener("resize", onWindowResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onWindowResize);
      cancelAnimationFrame(raf);
    };
  }, [isLoaded, syncSize]);

  // Trace Mode Mouse Handler
  const handleMouseMove = useCallback((e) => {
    if (!isLoaded || !ggbApiRef.current || !wrapperRef.current) return;
    const api = ggbApiRef.current;
    const rect = wrapperRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    
    try {
      const ggbX = api.getRealWorldCoordsX(px);
      const ggbY = api.getRealWorldCoordsY(py);
      setTraceData({ x: ggbX, y: ggbY, px, py });
    } catch(err) {}
  }, [isLoaded]);

  const handleMouseLeave = () => setTraceData(null);

  // ATOMIC SYNC: Params & Functions
  const prevParamsRef = useRef([]);
  const prevNamesRef = useRef([]);
  const prevAnalysisRef = useRef([]); // Track points like Roots, Extrema

  // Bidirectional Sync: GGB -> React (Restore to maintain sync)
  useEffect(() => {
    if (isLoaded && ggbApiRef.current && onParamsChange) {
      const api = ggbApiRef.current;
      const listener = (objName) => {
        if (Object.prototype.hasOwnProperty.call(params, objName)) {
          const newVal = api.getValue(objName);
          if (Math.abs(newVal - params[objName]) > 0.0001) {
            onParamsChange(objName, newVal);
          }
        }
      };
      api.registerUpdateListener(listener);
      return () => {
        try { api.unregisterUpdateListener(listener); } catch(e) {}
      };
    }
  }, [isLoaded, params, onParamsChange]);

  useEffect(() => {
    if (isLoaded && ggbApiRef.current) {
      const api = ggbApiRef.current;
      try {
        const currentParamNames = Object.keys(params);
        const currentFuncNames = functions
          .filter(f => f.visible)
          .map((f, idx) => f.ggbName || `f${idx}`);

        // 0. FREEZE REPAINT to avoid transient errors during sync
        try { api.setRepaint(false); } catch(e) {}

        // 1. DELETE FUNCTIONS FIRST (Release dependencies on params about to be deleted)
        prevNamesRef.current.forEach(name => {
          if (!currentFuncNames.includes(name)) {
            try { api.deleteObject(name); } catch(e) {}
          }
        });
        prevNamesRef.current = currentFuncNames;

        // 2. DELETE PARAMS SECOND
        prevParamsRef.current.forEach(name => {
          if (!currentParamNames.includes(name)) {
            try { api.deleteObject(name); } catch(e) {}
          }
        });
        prevParamsRef.current = currentParamNames;

        // 3. CREATE/UPDATE PARAMS (Must exist before functions that use them)
        Object.entries(params).forEach(([name, val]) => {
          try {
            api.evalCommand(`${name} = ${val}`);
            api.setVisible(name, false);
            api.setLabelVisible(name, false);
          } catch (e) {}
        });

        // 4. CREATE/UPDATE FUNCTIONS & ANALYSIS
        const currentAnalysisNames = [];
        
        functions.forEach((f, idx) => {
          if (!f.visible) return;
          const name = f.ggbName || `f${idx}`;
          const hasExplicitName = f.command.includes('=') || f.command.includes(':');
          const cmd = hasExplicitName ? f.command : `${name}: ${f.command}`;
          
          api.evalCommand(cmd);
          api.setVisible(name, true);
          api.setLabelVisible(name, false);
          
          // ANALYSIS: Roots & Extrema
          try {
            const rootName = `R${idx}`;
            const extName = `E${idx}`;
            api.evalCommand(`${rootName} = Roots[${name}]`);
            api.evalCommand(`${extName} = Extremum[${name}]`);
            
            // Style Analysis Points (Subtle dots)
            [rootName, extName].forEach(p => {
              api.setPointStyle(p, 0); // Dot
              api.setPointSize(p, 3);
              api.setLabelVisible(p, false);
              api.setColor(p, 100, 100, 100); // Grey subtle dots
              currentAnalysisNames.push(p);
            });
          } catch(e) {}
          
          try {
            const r = parseInt(f.color.slice(1, 3), 16);
            const g = parseInt(f.color.slice(3, 5), 16);
            const b = parseInt(f.color.slice(5, 7), 16);
            api.setColor(name, r, g, b);
          } catch(e) {}
        });

        // 4.5 CLEANUP OLD ANALYSIS POINTS
        prevAnalysisRef.current.forEach(name => {
          if (!currentAnalysisNames.includes(name)) {
            try { api.deleteObject(name); } catch(e) {}
          }
        });
        prevAnalysisRef.current = currentAnalysisNames;

        // 5. UNFREEZE REPAINT
        try { api.setRepaint(true); } catch(e) {}
      } catch (err) {
        console.error("GGB Strict Atomic Sync Error:", err);
        try { api.setRepaint(true); } catch(e) {}
      }
    }
  }, [params, functions, isLoaded]);

  if (!isVisible) return null;

  return (
    <div 
      ref={wrapperRef} 
      className="w-full h-full absolute inset-0 group/ggb"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* GeoGebra injection target */}
      <div
        ref={containerRef}
        className={`ggb-fill-container w-full h-full transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
        style={{ position: "absolute", inset: 0 }}
      />

      {/* TRACE MODE OVERLAY */}
      {traceData && isLoaded && (
        <div 
          className="absolute pointer-events-none z-50 flex flex-col gap-1 items-start"
          style={{ left: traceData.px + 15, top: traceData.py - 40 }}
        >
          <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 shadow-2xl">
            <div className="flex items-center gap-1.5 border-r border-white/10 pr-2">
              <span className="text-[8px] font-black text-indigo-400 uppercase">X</span>
              <span className="text-[10px] font-bold text-white tabular-nums">{traceData.x.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-black text-emerald-400 uppercase">Y</span>
              <span className="text-[10px] font-bold text-white tabular-nums">{traceData.y.toFixed(2)}</span>
            </div>
          </div>
          {/* Visual Crosshair */}
          <div className="fixed inset-0 pointer-events-none">
             <div className="absolute bg-white/10" style={{ left: traceData.px, top: 0, width: '1px', height: '100%' }} />
             <div className="absolute bg-white/10" style={{ left: 0, top: traceData.py, width: '100%', height: '1px' }} />
             <div className="absolute w-3 h-3 border border-white/40 rounded-full -translate-x-1/2 -translate-y-1/2" style={{ left: traceData.px, top: traceData.py }} />
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {!isLoaded && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0d0d0f] z-20">
          <div className="w-12 h-12 border-t-2 border-indigo-500 rounded-full animate-spin" />
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] animate-pulse">
            Iniciando Motor Gráfico...
          </span>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-red-500/10 backdrop-blur-md z-20">
          <X size={32} className="text-red-500" />
          <span className="text-[10px] font-black text-red-500 uppercase tracking-widest text-center px-10">
            {error}
          </span>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-500 text-white text-[8px] font-black uppercase rounded-full"
          >
            Recarregar App
          </button>
        </div>
      )}
    </div>
  );
});

export const DisplayLCD = ({
  expression,
  result,
  isCtrl,
  isAlpha,
  activeMode,
  cursorPosition,
  unitMode = "deg",
  isSymbolic = true,
  isAllSelected = false,
}) => {
  return (
    <div className="w-full bg-[#0a0a0b]/80 backdrop-blur-2xl rounded-[40px] border border-white/10 p-10 flex flex-col shadow-[0_40px_100px_rgba(0,0,0,0.8),inset_0_2px_20px_rgba(255,255,255,0.05)] relative overflow-hidden group">
      <div className="absolute inset-0 rounded-[40px] border border-indigo-500/10 pointer-events-none group-hover:border-indigo-500/20 transition-all duration-700" />

      <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
        <div className="flex gap-4">
          <span
            className={`text-[10px] font-black transition-all ${isCtrl ? "text-[#00d2ff] opacity-100 drop-shadow-[0_0_8px_rgba(0,210,255,0.6)]" : "opacity-10"}`}
          >
            [CTRL]
          </span>
          <span
            className={`text-[10px] font-black transition-all ${isAlpha ? "text-[#bd00ff] opacity-100 drop-shadow-[0_0_8px_rgba(189,0,255,0.6)]" : "opacity-10"}`}
          >
            [ALT]
          </span>
          <span className="text-[10px] font-black opacity-10 tracking-widest">
            [D] [M] [MATH]
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span
            className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${isSymbolic ? "text-[#10b981] border-[#10b981]/20 bg-[#10b981]/5" : "text-[#f43f5e] border-[#f43f5e]/20 bg-[#f43f5e]/5"}`}
          >
            {isSymbolic ? "FRACT" : "DEC"}
          </span>
          <span
            className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${unitMode === "deg" ? "text-[#00d2ff] border-[#00d2ff]/20 bg-[#00d2ff]/5" : "text-[#bd00ff] border-[#bd00ff]/20 bg-[#bd00ff]/5"}`}
          >
            {unitMode.toUpperCase()}
          </span>
          <span className="text-[9px] font-black uppercase tracking-[0.6em] opacity-30 italic">
            {activeMode}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-end items-end gap-2 pr-4 h-[120px]">
        <div
          className={`text-white/95 text-4xl font-light tracking-wide min-h-[1.5em] flex items-center relative group/input transition-all duration-300 ${isAllSelected ? "bg-indigo-500/20 ring-4 ring-indigo-500/10 rounded-xl px-4 py-1" : ""}`}
        >
          <InlineMath
            math={(() => {
              const cursor = "\\color{#6366f1}{\\rule[-0.15em]{0.1em}{1.1em}}";
              let rawWithCursor =
                expression.slice(0, cursorPosition) +
                "___CURSOR___" +
                expression.slice(cursorPosition);

              // 1. Protection phase for cursor placeholder (Avoid sanitizing the marker)
              const protectedStr = rawWithCursor.replace(
                "___CURSOR___",
                "KURSOR",
              );

              // 2. SECURE SANITIZATION: Escape all LaTeX reserved chars (EXCEPT SPACES)
              // Space escaping was causing empty fields to appear non-empty after sanitization.
              const sanitized = protectedStr.replace(/([#$ %&_{}])/g, (m) =>
                m === " " ? " " : "\\" + m,
              );

              // 3. Math transformations AFTER sanitization
              // Universal Helper: Injects \Box if the field is empty or contains only the cursor
              const drawBox = (s) => {
                const clean = s.replace("KURSOR", "").replace(/\\/g, "").trim();
                if (clean === "") {
                  // Return a Box, but preserve the cursor if it was inside
                  return `\\Box{${s.includes("KURSOR") ? "KURSOR" : ""}}`;
                }
                return s;
              };

              const processLatexCall = (text, funcMatch, replacer) => {
                let result = text;
                let searchIdx = 0;
                let target = funcMatch + "(";
                while ((searchIdx = result.indexOf(target, searchIdx)) !== -1) {
                  let start = searchIdx + funcMatch.length;
                  let d = 0,
                    end = -1;
                  for (let i = start; i < result.length; i++) {
                    if (result[i] === "(") d++;
                    else if (result[i] === ")") {
                      d--;
                      if (d === 0) {
                        end = i;
                        break;
                      }
                    }
                  }
                  if (end !== -1) {
                    let inner = result.substring(start + 1, end);
                    let args = [],
                      currentArg = "",
                      argD = 0;
                    for (let i = 0; i < inner.length; i++) {
                      if (inner[i] === "(") argD++;
                      else if (inner[i] === ")") argD--;
                      if (inner[i] === "," && argD === 0) {
                        args.push(currentArg);
                        currentArg = "";
                      } else {
                        currentArg += inner[i];
                      }
                    }
                    args.push(currentArg);
                    let replaced = replacer(args);
                    result =
                      result.substring(0, searchIdx) +
                      replaced +
                      result.substring(end + 1);
                    searchIdx += replaced.length;
                  } else {
                    searchIdx += target.length;
                  }
                }
                return result;
              };

              const findClosingParen = (text, startIdx) => {
                let d = 0;
                for (let i = startIdx; i < text.length; i++) {
                  if (text[i] === "(") d++;
                  else if (text[i] === ")") {
                    d--;
                    if (d === 0) return i;
                  }
                }
                return -1;
              };

              const findOpeningParen = (text, endIdx) => {
                let d = 0;
                for (let i = endIdx; i >= 0; i--) {
                  if (text[i] === ")") d++;
                  else if (text[i] === "(") {
                    d--;
                    if (d === 0) return i;
                  }
                }
                return -1;
              };

              const processLatexFractions = (text) => {
                let result = text;
                let searchIdx = 0;
                while ((searchIdx = result.indexOf("/", searchIdx)) !== -1) {
                  const slashIdx = searchIdx;
                  let numEnd = slashIdx - 1;
                  let denStart = slashIdx + 1;

                  // Numerator: Skip spaces and KURSOR
                  while (numEnd >= 0) {
                    if (result[numEnd] === " ") {
                      numEnd--;
                      continue;
                    }
                    if (
                      numEnd >= 5 &&
                      result.substring(numEnd - 5, numEnd + 1) === "KURSOR"
                    ) {
                      numEnd -= 6;
                      continue;
                    }
                    break;
                  }

                  // Denominator: Skip spaces and KURSOR
                  while (denStart < result.length) {
                    if (result[denStart] === " ") {
                      denStart++;
                      continue;
                    }
                    if (
                      denStart + 5 < result.length &&
                      result.substring(denStart, denStart + 6) === "KURSOR"
                    ) {
                      denStart += 6;
                      continue;
                    }
                    break;
                  }

                  let numStart = -1,
                    denEnd = -1;
                  if (numEnd >= 0 && result[numEnd] === ")")
                    numStart = findOpeningParen(result, numEnd);
                  if (denStart < result.length && result[denStart] === "(")
                    denEnd = findClosingParen(result, denStart);

                  if (numStart !== -1 && denStart !== -1 && denEnd !== -1) {
                    // Isolate the true mathematical content (excluding the structural parens)
                    const numContent = result.substring(numStart + 1, numEnd);
                    const denContent = result.substring(denStart + 1, denEnd);

                    // Capture KURSORs that might have been adjacent to the slash
                    const cursorsBeforeSlash = result
                      .substring(numEnd + 1, slashIdx)
                      .replaceAll(" ", "")
                      .replaceAll(")", "");
                    const cursorsAfterSlash = result
                      .substring(slashIdx + 1, denStart)
                      .replaceAll(" ", "")
                      .replaceAll("(", "");

                    const replaced = `\\frac{${drawBox(numContent.trim() || cursorsBeforeSlash)}}{${drawBox(denContent.trim() || cursorsAfterSlash)}}`;
                    result =
                      result.substring(0, numStart) +
                      replaced +
                      result.substring(denEnd + 1);
                    searchIdx = numStart + replaced.length;
                  } else {
                    searchIdx++;
                  }
                }
                return result;
              };

              let processed = sanitized.replace(/\*/g, "\\times ");

              // 1. Process Nested Structural Calls
              processed = processLatexCall(processed, "integral", (args) => {
                const f = args[0] || "";
                const a = args[1] || "";
                const b = args[2] || "";
                const v = args[3] || "x";
                if (args.length <= 1) return `\\int ${drawBox(f)} \\, dx`;
                return `\\int_{${drawBox(a)}}^{${drawBox(b)}} ${drawBox(f)} \\, d${drawBox(v)}`;
              });
              processed = processLatexCall(processed, "diff", (args) => {
                const f = args[0] || "";
                const a = args[1] || "";
                if (!a.trim() && !a.includes("KURSOR"))
                  return `\\frac{d}{dx} (${drawBox(f)})`;
                return `\\left. \\frac{d}{dx} (${drawBox(f)}) \\right|_{x=${drawBox(a)}}`;
              });
              processed = processLatexCall(
                processed,
                "sqrt",
                (args) => `\\sqrt{${drawBox(args[0] || "")}}`,
              );

              // 2. Optimized Power Scanner
              let powerSearch = 0;
              while (
                (powerSearch = processed.indexOf("^", powerSearch)) !== -1
              ) {
                const caretIdx = powerSearch;

                // Find Exponent Start (skip spaces and KURSOR)
                let openScan = caretIdx + 1;
                while (openScan < processed.length) {
                  if (processed[openScan] === " ") {
                    openScan++;
                    continue;
                  }
                  if (
                    openScan + 5 < processed.length &&
                    processed.substring(openScan, openScan + 6) === "KURSOR"
                  ) {
                    openScan += 6;
                    continue;
                  }
                  break;
                }

                // Find Base End (skip spaces and KURSOR)
                let baseEnd = caretIdx - 1;
                while (baseEnd >= 0) {
                  if (processed[baseEnd] === " ") {
                    baseEnd--;
                    continue;
                  }
                  if (
                    baseEnd >= 5 &&
                    processed.substring(baseEnd - 5, baseEnd + 1) === "KURSOR"
                  ) {
                    baseEnd -= 6;
                    continue;
                  }
                  break;
                }

                // Scan Boundaries
                let openIdx = processed.indexOf("(", openScan);
                if (openIdx === openScan) {
                  let closeIdx = findClosingParen(processed, openIdx);
                  if (closeIdx !== -1) {
                    let bStart = -1,
                      isParenBase = false,
                      baseContent = "";
                    if (baseEnd >= 0 && processed[baseEnd] === ")") {
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
                      const postBaseCursors = processed
                        .substring(baseEnd + 1, caretIdx)
                        .replace(/\s/g, "");
                      const postCaretCursors = processed
                        .substring(caretIdx + 1, openIdx)
                        .replace(/\s/g, "");
                      const exponentContent = processed.substring(
                        openIdx + 1,
                        closeIdx,
                      );

                      const replaced = `{${drawBox(baseContent + postBaseCursors)}}^{${drawBox(postCaretCursors + exponentContent)}}`;
                      processed =
                        processed.substring(0, bStart) +
                        replaced +
                        processed.substring(closeIdx + 1);
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
                .replace(
                  /nthRoot\(([^,]*),?([^)]*)\)/g,
                  (match, a, b) => `\\sqrt[${drawBox(b)}]{${drawBox(a)}}`,
                )
                .replace(/log\(([^,]*),?([^)]*)\)/g, (match, x, b) =>
                  !b.trim() && !b.includes("KURSOR")
                    ? `\\log(${drawBox(x)})`
                    : `\\log_{${drawBox(b)}}(${drawBox(x)})`,
                )
                .replace(
                  /\(\s*(KURSOR)?\s*(.*?)\s*(KURSOR)?\s*\)\s*(KURSOR)?\s*\^\s*(KURSOR)?\s*\(\s*(KURSOR)?\s*(.*?)\s*(KURSOR)?\s*\)/g,
                  (match, k1, p1, k2, k3, k4, k5, p2, k6) =>
                    `${drawBox((k1 || "") + p1 + (k2 || ""))}^{${drawBox((k3 || "") + (k4 || "") + (k5 || "") + p2 + (k6 || ""))}}`,
                )
                .replace(/√(\d+|\w+)/g, "\\sqrt{$1}")
                .replace(
                  /([a-zA-Z√/_]+)(?=\s*\()/g,
                  "\\mathbf{\\color{#00d2ff}{$1}}",
                )
                .replace(
                  /(?<![a-zA-Z\\])\b([a-zA-Z√/_])\b/g,
                  "\\mathbf{\\color{#00d2ff}{$1}}",
                )
                .replace(/\(\s*KURSOR\s*\)/g, "KURSOR")
                .replace(/\(\s*\)/g, " ")
                .replace(/(^|\s)[\/\^](\s|$)/g, " ")
                .replace("KURSOR", cursor);

              return latex || " ";
            })()}
          />
        </div>
        <div className="text-white text-3xl sm:text-5xl font-black tracking-tighter leading-none mt-4 drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] flex items-center justify-end">
          {result && (
            <InlineMath
              math={(() => {
                if (result.isTex) return result.text;
                const str = result.toString();
                if (str.includes("/")) {
                  const parts = str.split("/");
                  const num = parts[0]
                    .trim()
                    .replace(/√(\d+|\w+)/g, "\\sqrt{$1}");
                  const den = parts[1]
                    .trim()
                    .replace(/√(\d+|\w+)/g, "\\sqrt{$1}");
                  return `\\frac{${num}}{${den}}`;
                }
                return str.replace(/√(\d+|\w+)/g, "\\sqrt{$1}");
              })()}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export const ScientificButton = ({
  id,
  keyData,
  onClick,
  isCtrl,
  isAlpha,
  variant = "num",
  className = "",
}) => {
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
      className={`relative rounded-3xl border transition-all duration-500 group flex flex-col items-center justify-center shadow-neumat active:shadow-neumat-inner active:scale-95 overflow-hidden ${
        isNumeric
          ? "h-20 bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10"
          : isScientific
            ? "h-14 bg-white/[0.015] border-white/[0.03] hover:bg-white/[0.04]"
            : id === "key_shift" && isCtrl
              ? "h-14 bg-[#00d2ff]/20 border-[#00d2ff]/40 shadow-[0_0_20px_rgba(0,210,255,0.3)]"
              : id === "key_alpha" && isAlpha
                ? "h-14 bg-[#bd00ff]/20 border-[#bd00ff]/40 shadow-[0_0_20px_rgba(189,0,255,0.3)]"
                : "h-14 bg-white/[0.02] border-white/10 hover:bg-white/[0.05]"
      } ${className}`}
    >
      <div className="absolute top-2 w-full px-3 flex justify-between pointer-events-none">
        <span
          className={`text-[10px] font-black transition-all duration-300 ${
            isCtrl || (id === "key_shift" && isCtrl)
              ? "text-[#00d2ff] opacity-100 scale-110 drop-shadow-[0_0_8px_rgba(0,210,210,0.6)]"
              : "text-[#00d2ff]/60 opacity-60"
          }`}
        >
          {shiftLabel || shift}
        </span>
        <span
          className={`text-[10px] font-black transition-all duration-300 ${
            isAlpha || (id === "key_alpha" && isAlpha)
              ? "text-[#bd00ff] opacity-100 scale-110 drop-shadow-[0_0_8px_rgba(189,255,189,0.6)]"
              : "text-[#bd00ff]/60 opacity-60"
          }`}
        >
          {alphaLabel || alpha}
        </span>
      </div>
      <span
        className={`font-bold transition-all ${
          isNumeric
            ? "text-lg tracking-widest text-white"
            : "text-[12px] " +
              (isCtrl
                ? "text-[#3b82f6]/40"
                : isAlpha
                  ? "text-[#a855f7]/40"
                  : "text-white/60")
        }`}
      >
        {label || normal}
      </span>
      <div className="absolute inset-0 bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
};
