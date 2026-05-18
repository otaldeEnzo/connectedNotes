import React, { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import ReactDOM from 'react-dom';
import 'mathlive'; // Registers <math-field> custom element
import { stemEngine } from '../../services/CalculatorEngine';
import { MathService } from '../../services/MathService';
import buttonMap from '../../data/button_map.json';
import { ModeRail, ScientificButton, GGBPreview } from './CalculatorUI';
import { X, Atom, Bookmark, Layers, Pencil, Plus, Maximize2, Calculator, Zap, FlaskConical, LineChart, Edit2 } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';
import ConstantsMenu from './ConstantsMenu';

// ========== MOSCARO STYLED MATHFIELD ==========
const ScientificMathField = forwardRef(({ value, onChange, onEnter, isAllSelected, onUndo, onRedo }, ref) => {
  const mfRef = useRef(null);
  const internalValueUpdate = useRef(false);

  useImperativeHandle(ref, () => ({
    insert: (s) => mfRef.current?.insert(s),
    executeCommand: (c) => mfRef.current?.executeCommand(c),
    focus: () => mfRef.current?.focus(),
    setValue: (v) => {
      if (mfRef.current && mfRef.current.value !== v) {
        internalValueUpdate.current = true;
        mfRef.current.value = v;
        internalValueUpdate.current = false;
      }
    },
    get value() {
      return mfRef.current?.value;
    }
  }));

  useEffect(() => {
    const mf = mfRef.current;
    if (!mf) return;

    // Ativar smartFence para balanceamento automático profissional.
    // Removidos os inlineShortcuts para '(', '[' e '{' que causavam inserção duplicada.
    mf.smartFence = true;
    mf.virtualKeyboardMode = 'manual';
    mf.mathModeSpace = '\\ ';

    // Sincronizar valor inicial
    if (value) mf.value = value;

    const handleInput = (e) => {
      if (internalValueUpdate.current) return;
      onChange(mf.value);
    };

    const handleKeydown = (e) => {
      // Custom Undo/Redo logic (Skip cursor movements)
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        onUndo?.();
        return;
      }
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        onRedo?.();
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        onEnter?.();
        return;
      }

      const mf = mfRef.current;
      const isBackspace = e.key === 'Backspace';
      const isDelete = e.key === 'Delete';

      if (isBackspace || isDelete) {
        const sel = mf.selection;
        // Lógica de Deleção Pareada (Parenteses/Colchetes correspondentes)
        if (sel.ranges[0][0] === sel.ranges[0][1]) {
          const offset = sel.ranges[0][0];
          const charBefore = (typeof mf.getValue === 'function') ? mf.getValue(offset - 1, offset) : '';
          const charAfter = (typeof mf.getValue === 'function') ? mf.getValue(offset, offset + 1) : '';

          const isPaired = (charBefore === '(' && charAfter === ')') ||
            (charBefore === '[' && charAfter === ']') ||
            (charBefore === '{' && charAfter === '}');

          if (isBackspace && isPaired) {
            e.preventDefault();
            mf.executeCommand('deleteForward');
            mf.executeCommand('deleteBackward');
            return;
          }
        }

        // Handle 'stuck' structural blocks before native deletion fires
        const val = mf.value;
        if (typeof val === 'string' && val !== '') {
          const sk = val.replace(/\\placeholder{[^{}]*}/g, '').replace(/[\s_{}^()\\\[\]]/g, '').trim().toLowerCase();
          if (['lim', 'int', 'frac', 'sqrt', 'sum', 'diff'].includes(sk)) {
            e.preventDefault();
            mf.value = '';
            onChange?.('');
            return;
          }
        }
        // Let MathLive natively handle the backspace for all standard character deletions.
      }
    };

    mf.addEventListener('input', handleInput);
    mf.addEventListener('keydown', handleKeydown);
    return () => {
      mf.removeEventListener('input', handleInput);
      mf.removeEventListener('keydown', handleKeydown);
    };
  }, []); // Run transition configurations once

  useEffect(() => {
    if (isAllSelected && mfRef.current) {
      mfRef.current.executeCommand('selectAll');
    }
  }, [isAllSelected]);

  return (
    <div className="w-full bg-[#0a0a0b]/60 backdrop-blur-3xl rounded-[40px] border border-white/10 p-5 flex flex-col shadow-[0_40px_100px_rgba(0,0,0,0.8),inset_0_2px_20px_rgba(255,255,255,0.05)] relative overflow-auto group min-h-[80px] max-h-[350px] custom-scrollbar">
      <div className="absolute inset-0 rounded-[40px] border border-indigo-500/10 pointer-events-none group-hover:border-indigo-500/20 transition-all duration-700" />

      {/* MATHFIELD CORE */}
      <math-field
        ref={mfRef}
        style={{
          width: '100%',
          background: 'transparent',
          color: 'white',
          fontSize: '28px',
          border: 'none',
          outline: 'none',
          '--caret-color': '#6366f1',
          '--selection-background': 'rgba(99, 102, 241, 0.3)',
          '--mathfield-background': 'transparent',
          '--mathfield-foreground': '#fff',
          '--mathfield-border': 'none',
          '--mathfield-shadow': 'none',
          '--mathfield-focus-ring': 'none',
        }}
      />
    </div>
  );
});

// ========== HELPER UTILITIES ==========
const isFunctionPart = (text, idx) => {
  if (idx < 0 || !text || idx >= text.length) return false;
  const c = text[idx];
  // Letters, digits, √, /, or _ belonging to a prefix followed by ( or ^
  if (/[a-zA-Z0-9√/_]/.test(c)) {
    let r = idx; while (r < text.length && /[a-zA-Z0-9√/_]/.test(text[r])) r++;
    return text[r] === '(' || text[r] === '^';
  }
  return false;
};

const MemorySidebar = ({ variables = {}, formulas = {}, ans, onToggle, isOpen, onEdit }) => {
  const activeVars = Object.entries(variables || {}).filter(([key, val]) => {
    return val !== 0 || formulas[key];
  });

  if (!isOpen) return null;

  return (
    <div className="w-[300px] border-l border-white/5 bg-white/[0.02] backdrop-blur-3xl p-8 flex flex-col gap-6 animate-in slide-in-from-right duration-500 relative">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded bg-indigo-500/20 flex items-center justify-center">
            <Bookmark size={10} className="text-indigo-400" />
          </div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Workstation Memory</h3>
        </div>
        <button
          onPointerDown={(e) => { e.stopPropagation(); onToggle(); }}
          className="p-4 -m-2 hover:bg-white/10 rounded-full text-white/30 transition-all flex items-center justify-center"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar max-h-[calc(100vh-400px)]">
        {ans && (
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col gap-1 mb-2">
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Última Resposta (ans)</span>
            <div className="text-base font-semibold text-white/90">
              <InlineMath math={stemEngine.ansTex || MathService.toLaTeX(ans.toString())} />
            </div>
          </div>
        )}
        {activeVars.map(([key, val]) => {
          const formula = formulas[key];
          return (
            <div key={key} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-2 group hover:border-indigo-500/30 hover:bg-white/[0.05] transition-all duration-300 relative">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{key}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/40 group-hover:bg-indigo-400 animate-pulse" />
                </div>
                {formula && (
                  <button
                    onClick={() => onEdit(formula)}
                    className="p-1.5 rounded-lg hover:bg-indigo-500/20 text-indigo-400 group-hover:text-indigo-300 transition-all shadow-glow-indigo-soft active:scale-90"
                    title="Editar Função"
                  >
                    <Pencil size={11} className="drop-shadow-glow-blue" />
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-0.5">
                {formula ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-white/20 uppercase tracking-tighter">Fórmula:</span>
                    <div
                      className="text-xs font-medium text-[#00d2ff] bg-white/[0.01] p-2 rounded-lg border border-white/5 cursor-pointer hover:bg-white/[0.03]"
                      onClick={() => onEdit(formula)}
                    >
                      <InlineMath math={MathService.toLaTeX(formula.replace(':=', '='))} />
                    </div>
                  </div>
                ) : (
                  <div className="text-base font-semibold text-white/90">
                    <InlineMath math={typeof val === 'number' ?
                      (Math.abs(val) < 1e-6 || Math.abs(val) > 1e9 ? val.toExponential(4) : val.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 8 }))
                      : MathService.toLaTeX(val.toString())}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {activeVars.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 opacity-20 gap-4">
            <Layers size={32} strokeWidth={1} />
            <p className="text-[10px] font-black uppercase tracking-widest text-center">Memória Vazia</p>
          </div>
        )}
      </div>

      <div className="mt-auto pt-6 border-t border-white/5">
        <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-[9px] text-indigo-300/50 leading-relaxed font-bold italic">
          DICA: Toque na fórmula ou no ícone para carregar a função no editor principal.
        </div>
      </div>
    </div>
  );
};

const ScientificOmnibar = ({ isOpen, onClose, onInsert, onAddBlock }) => {
  const [calcInput, setCalcInput] = useState('');
  const [calcResult, setCalcResult] = useState('0');
  const [activeMode, setActiveMode] = useState('calculate');
  const [graphFunctions, setGraphFunctions] = useState([]); // Array of { id, latex, color, visible }
  const [graphParams, setGraphParams] = useState({}); // { name: value }
  const [animatingParams, setAnimatingParams] = useState({}); // { name: direction }
  const [paramRanges, setParamRanges] = useState({}); // { name: { min: -10, max: 10 } }
  const [tempParamInputs, setTempParamInputs] = useState({}); // { name: string }

  // Animation Loop for Sliders
  useEffect(() => {
    const activeNames = Object.keys(animatingParams);
    if (activeNames.length === 0) return;

    let raf;

    const step = () => {
      setGraphParams(prev => {
        const next = { ...prev };
        activeNames.forEach(name => {
          let val = next[name];
          let dir = animatingParams[name] || 1;
          const range = paramRanges[name] || { min: -10, max: 10 };
          const min = parseFloat(range.min);
          const max = parseFloat(range.max);
          const speed = (max - min) / 400; // Variable speed based on range width
          
          val += dir * speed;
          
          // Bounce at limits
          if (val >= max) {
            val = max;
            setAnimatingParams(curr => ({ ...curr, [name]: -1 }));
          } else if (val <= min) {
            val = min;
            setAnimatingParams(curr => ({ ...curr, [name]: 1 }));
          }
          next[name] = val;
        });
        return next;
      });
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [animatingParams, paramRanges]);
  const [undoStack, setUndoStack] = useState(['']);
  const [redoStack, setRedoStack] = useState([]);
  const [isCtrlActive, setIsCtrlActive] = useState(false);
  const [isAlphaActive, setIsAlphaActive] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isSymbolic, setIsSymbolic] = useState(true);
  const [unitMode, setUnitMode] = useState('deg'); // 'deg' or 'rad'
  const [justOpened, setJustOpened] = useState(false);
  const [isPhysicalCtrl, setIsPhysicalCtrl] = useState(false);
  const [isPhysicalAlt, setIsPhysicalAlt] = useState(false);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [isMemorySidebarOpen, setIsMemorySidebarOpen] = useState(false);
  const [isConstantsMenuOpen, setIsConstantsMenuOpen] = useState(false);
  const [isResultStale, setIsResultStale] = useState(false);
  const [isMatrixDialogOpen, setIsMatrixDialogOpen] = useState(false);
  const [matrixRows, setMatrixRows] = useState(2);
  const [matrixCols, setMatrixCols] = useState(2);
  const [matrixTargetCmd, setMatrixTargetCmd] = useState(null); // null, 'det', 'transpose'
  const [isTableOpen, setIsTableOpen] = useState(false);
  const [tableConfig, setTableConfig] = useState({ min: -5, max: 5, step: 1 });
  const ggbRef = useRef(null);

  // HISTORY STACKS (Refs to prevent stale closures in event listeners)
  const historyRef = useRef([]);
  const redoStackRef = useRef([]);
  const keyPressedRef = useRef(false);
  const isInternalUndo = useRef(false);

  // Snapshot to Note Logic
  // Add Interactive Block to Note
  const handleSnapshot = useCallback(() => {
    console.log("[ScientificOmnibar] Creating interactive GGB block for note...");
    
    // 1. Gather active functions
    const activeFuncs = graphFunctions.filter(f => f.visible);
    if (activeFuncs.length === 0 && Object.keys(graphParams).length === 0) {
      console.warn("[ScientificOmnibar] Nothing to add to note.");
      return;
    }

    // 2. Prepare GGB commands
    const commands = [];
    
    // Add parameters first so functions can depend on them
    Object.entries(graphParams).forEach(([name, val]) => {
      commands.push(`${name} = ${val}`);
    });

    // Add functions
    activeFuncs.forEach((f, idx) => {
      const name = f.ggbName || `f${idx}`;
      const hasExplicitName = f.command.includes('=') || f.command.includes(':');
      const cmd = hasExplicitName ? f.command : `${name}: ${f.command}`;
      commands.push(cmd);
      
      // Add color command
      if (f.color) {
        // GGB setColor uses R, G, B as 0-1 values or name
        // We'll just pass the hex for now if the engine supports it or handle it in GGBBlock
        // Actually, let's just send the basic plot for now
      }
    });

    // 3. Send to note
    if (onAddBlock) {
      const combinedExpression = commands.join('\n');
      console.log("[ScientificOmnibar] Sending GGB block content:", combinedExpression);
      
      onAddBlock('ggb', { 
        expression: combinedExpression,
        customTitle: activeFuncs.length > 0 ? `Gráfico de ${activeFuncs[0].command.split('=')[0]}` : 'Gráfico Dinâmico'
      });
    } else {
      console.error("[ScientificOmnibar] onAddBlock missing!");
    }
  }, [graphFunctions, graphParams, onAddBlock]);

  useEffect(() => {
    if (isOpen) {
      setIsCtrlActive(false);
      setIsAlphaActive(false);
      setJustOpened(true);
      const timer = setTimeout(() => {
        setJustOpened(false);
        if (mathFieldRef.current) {
          mathFieldRef.current.focus();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // ZONAL KEY DEFINITIONS
  const SCI_KEYS = [
    'key_frac', 'key_sqrt', 'key_pow', 'key_log', 'key_ln', 'key_neg',
    'key_integral', 'key_sum', 'key_sin', 'key_cos', 'key_tan',
    'key_paren_left', 'key_paren_right', 'key_comma', 'key_matrix',
    'key_var', 'key_extra'
  ];

  const NUM_KEYS = [
    'key_7', 'key_8', 'key_9', 'key_del', 'key_ac',
    'key_4', 'key_5', 'key_6', 'key_mul', 'key_div',
    'key_1', 'key_2', 'key_3', 'key_plus', 'key_minus',
    'key_dot', 'key_0', 'key_exp', 'key_ans', 'key_equal'
  ];

  const mathFieldRef = useRef(null);
  const lastValue = useRef(0);


  const handleInputChange = useCallback((val) => {
    const isDeletion = val.length < lastValue.current;
    lastValue.current = val.length;

    if (!isInternalUndo.current) {
      setUndoStack(prev => {
        if (prev[prev.length - 1] === val) return prev;
        return [...prev, val].slice(-50);
      });
      setRedoStack([]);
    }

    // Convert Unicode superscripts to LaTeX powers
    let processed = val
      .replace(/²/g, '^{2}')
      .replace(/³/g, '^{3}')
      .replace(/¹/g, '^{1}');

    // Auto-limpeza: Se sobrar apenas o esqueleto vazio de um comando estrutural e for deleção, limpa tudo
    const skeletal = processed.replace(/\\placeholder{[^{}]*}/g, '').replace(/[\s_{}^()\\\[\]]/g, '').trim().toLowerCase();
    const isStuck = isDeletion && ['lim', 'int', 'frac', 'sqrt', 'sum', 'diff'].includes(skeletal);
    if (isStuck) {
      processed = '';
      if (mathFieldRef.current) mathFieldRef.current.setValue('');
      lastValue.current = 0;
    }

    setCalcInput(processed);
    if (processed !== val && mathFieldRef.current) {
      mathFieldRef.current.setValue(processed);
    }

  }, [activeMode, graphFunctions]);

  // GLOBAL PARAMETER DETECTION EFFECT
  useEffect(() => {
    if (activeMode === 'graph') {
      try {
        const allExpressionsToScan = [
          calcInput,
          ...graphFunctions.filter(f => f.visible).map(f => f.latex)
        ];

        const allParams = new Set();

        allExpressionsToScan.forEach(expr => {
          if (!expr || typeof expr !== 'string') return;
          const mathjsExpr = MathService.latexToMathJS(expr);

          let detectionTarget = mathjsExpr;
          if (mathjsExpr.includes('=') && !mathjsExpr.includes('==')) {
            const parts = mathjsExpr.split('=');
            detectionTarget = parts[parts.length - 1]; // Use RHS
          }

          // 1. Remove common functions and words
          // Improved: Ignore letters followed by '(' as they are function names
          const cleaned = detectionTarget
            .replace(/[a-zA-Z]+\(/g, '_')
            .replace(/sin|cos|tan|sen|tg|log|ln|sqrt|exp|pi|ans|preAns|abs|round|lcm|gcd/g, '_');

          // 2. Extract remaining letters
          const vars = cleaned.match(/[a-zA-Z]/g) || [];
          vars.forEach(v => {
            const lowV = v.toLowerCase();
            // Ignore x,y,t (axes) and e,i (constants), and f,g,h (function names)
            if (!['x', 'y', 't', 'e', 'i', 'f', 'g', 'h'].includes(lowV)) {
              allParams.add(v);
            }
          });
        });

        setGraphParams(prev => {
          const next = {};
          Array.from(allParams).forEach(p => {
            // Persist existing value if present, otherwise default to 1
            next[p] = prev[p] !== undefined ? prev[p] : 1;
          });
          return next;
        });
      } catch (err) { }
    }
  }, [calcInput, graphFunctions, activeMode]);

  const addFunctionToGraph = useCallback(() => {
    if (!calcInput) return;
    try {
      const ggbCommand = MathService.latexToMathJS(calcInput);

      // Extract name if explicit (e.g., f(x)=..., a=...)
      let ggbName = null;
      const nameMatch = ggbCommand.match(/^\s*([a-zA-Z0-9_]+)\s*(\(.*\))?\s*[=:]/);
      if (nameMatch) {
        ggbName = nameMatch[1];
      }

      setGraphFunctions(prev => {
        // If we have an explicit name, check for collisions
        if (ggbName) {
          const existingIdx = prev.findIndex(f => f.ggbName === ggbName);
          if (existingIdx !== -1) {
            const next = [...prev];
            next[existingIdx] = { 
              ...next[existingIdx], 
              latex: calcInput, 
              command: ggbCommand,
              visible: true // Re-show if it was hidden
            };
            return next;
          }
        }

        // Otherwise, add as a new function
        const finalName = ggbName || `f${prev.length}`;
        const colors = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#06b6d4', '#8b5cf6'];
        const newFunc = {
          id: Date.now(),
          ggbName: finalName,
          latex: calcInput,
          command: ggbCommand,
          color: colors[prev.length % colors.length],
          visible: true
        };
        return [...prev, newFunc];
      });

      setCalcInput('');
      if (mathFieldRef.current) mathFieldRef.current.setValue('');
    } catch (err) {
      setCalcResult(`\\text{Erro de Formatação: ${err.message}}`);
    }
  }, [calcInput, graphFunctions]);

  const handleUndo = useCallback(() => {
    if (undoStack.length > 1) {
      isInternalUndo.current = true;
      const current = undoStack[undoStack.length - 1];
      const prev = undoStack[undoStack.length - 2];
      setRedoStack(r => [current, ...r]);
      setUndoStack(u => u.slice(0, -1));
      if (mathFieldRef.current) {
        mathFieldRef.current.setValue(prev);
        setCalcInput(prev);
      }
      setTimeout(() => { isInternalUndo.current = false; }, 10);
    }
  }, [undoStack]);

  const handleRedo = useCallback(() => {
    if (redoStack.length > 0) {
      isInternalUndo.current = true;
      const next = redoStack[0];
      setUndoStack(u => [...u, next]);
      setRedoStack(r => r.slice(1));
      if (mathFieldRef.current) {
        mathFieldRef.current.setValue(next);
        setCalcInput(next);
      }
      setTimeout(() => { isInternalUndo.current = false; }, 10);
    }
  }, [redoStack]);

  const handleEvaluate = useCallback(() => {
    // Fallback: search for math-field directly if calcInput seems stale
    let currentInput = calcInput;
    if ((!currentInput || currentInput.trim() === '') && mathFieldRef.current) {
      currentInput = mathFieldRef.current.value || '';
    }

    if (!currentInput || currentInput.trim() === '') return;

    try {
      const mathjsExpr = MathService.latexToMathJS(currentInput);
      if (!mathjsExpr || mathjsExpr.trim() === '') {
        setCalcResult('\\text{Erro: Expressão vazia}');
        return;
      }

      const evaluation = stemEngine.evaluate(mathjsExpr, activeMode, isSymbolic, unitMode);

      // Ensure the result is never just '0' if the engine returned something else
      const finalResult = String(evaluation.text || evaluation.value || '0');
      setCalcResult(finalResult);

      // Auto-plot in Graph mode if we just defined something (f(x)=, a=, etc)
      if (activeMode === 'graph' && finalResult === '\\text{Definido.}') {
        addFunctionToGraph();
      }
    } catch (err) {
      setCalcResult(`\\text{Erro: ${err.message}}`);
    }
  }, [calcInput, activeMode, isSymbolic, unitMode, addFunctionToGraph]);


  const handleInsertConstant = useCallback((val) => {
    if (mathFieldRef.current) {
      mathFieldRef.current.insert(val);
      setTimeout(() => mathFieldRef.current.focus(), 50);
    }
  }, []);

  const handleInsertMatrix = useCallback(() => {
    const rows = Math.min(Math.max(parseInt(matrixRows) || 1, 1), 10);
    const cols = Math.min(Math.max(parseInt(matrixCols) || 1, 1), 10);

    let latex = '\\begin{pmatrix}';
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        latex += ' #? ';
        if (j < cols - 1) latex += ' & ';
      }
      if (i < rows - 1) latex += ' \\\\ ';
    }
    latex += ' \\end{pmatrix}';

    if (matrixTargetCmd === 'det') {
      latex = `\\det\\left(${latex}\\right)`;
    } else if (matrixTargetCmd === 'transpose') {
      latex = `\\left(${latex}\\right)^{T}`;
    }

    if (mathFieldRef.current) {
      mathFieldRef.current.insert(latex);
      setTimeout(() => mathFieldRef.current.focus(), 50);
    }
    setIsMatrixDialogOpen(false);
    setMatrixTargetCmd(null);
  }, [matrixRows, matrixCols, matrixTargetCmd]);

  const handleInput = useCallback((id, forceMode = null) => {
    const key = buttonMap.keys[id];
    if (!key) return;

    let command = key.normal;
    const effectiveCtrl = forceMode === 'ctrl' || isCtrlActive || isPhysicalCtrl;
    const effectiveAlpha = forceMode === 'alpha' || isAlphaActive || isPhysicalAlt;

    if (effectiveCtrl) command = key.shift || key.normal;
    else if (effectiveAlpha) command = key.alpha || key.normal;

    const wasCtrl = isCtrlActive;
    const wasAlpha = isAlphaActive;

    if (command === 'CTRL') {
      setIsCtrlActive(!wasCtrl);
      setIsAlphaActive(false);
      return;
    }
    if (command === 'ALT') {
      setIsAlphaActive(!wasAlpha);
      setIsCtrlActive(false);
      return;
    }

    // Reset active modes for direct command execution
    setIsCtrlActive(false);
    setIsAlphaActive(false);

    const mf = mathFieldRef.current;
    if (!mf) return;

    if (command === 'AC') {
      mf.setValue('');
      setCalcInput('');
      setCalcResult('0');
      mf.focus();
      return;
    }

    if (command === 'undo') {
      handleUndo();
      return;
    }
    if (command === 'redo') {
      handleRedo();
      return;
    }

    if (command === 'DEL') {
      mf.executeCommand('deleteBackward');
      return;
    }

    if (command === 'DRG') {
      const nextUnit = unitMode === 'deg' ? 'rad' : 'deg';
      setUnitMode(nextUnit);
      try {
        const mathjsExpr = MathService.latexToMathJS(calcInput);
        const evaluation = stemEngine.evaluate(mathjsExpr, activeMode, isSymbolic, nextUnit);
        setCalcResult(evaluation.text);
      } catch (err) { }
      return;
    }

    if (command === 'matrix( )') {
      setMatrixTargetCmd(null);
      setIsMatrixDialogOpen(true);
      return;
    }
    if (command === 'det(') {
      setMatrixTargetCmd('det');
      setIsMatrixDialogOpen(true);
      return;
    }
    if (command === 'transpose(') {
      setMatrixTargetCmd('transpose');
      setIsMatrixDialogOpen(true);
      return;
    }

    if (command === 'sto') {
      // For now, let's just insert 'sto ' and let the user pick. 
      // Better: Store current result to a slot or enter a "Store" mode.
      // Simplest for now: Insert '->' LaTeX as a store operator if supported.
      mf.insert('\\rightarrow ');
      return;
    }

    if (command === 'rcl') {
      // Implementation: Open a mini menu of stored variables?
      // For now, let's just insert a placeholder or do nothing.
      return;
    }

    if (command === 'clearVars') {
      stemEngine.clearVariables?.();
      setCalcResult('Memória Limpa');
      return;
    }

    if (command === 'reboot') {
      stemEngine.reset?.();
      setCalcInput('');
      setCalcResult('Sistema Reiniciado');
      mf.setValue('');
      return;
    }

    if (command === 'S↔D') {
      const nextSym = !isSymbolic;
      setIsSymbolic(nextSym);
      try {
        const mathjsExpr = MathService.latexToMathJS(calcInput);
        const evaluation = stemEngine.evaluate(mathjsExpr, activeMode, nextSym, unitMode);
        setCalcResult(evaluation.text);
      } catch (err) { }
      return;
    }

    if (command === '=') {
      handleEvaluate();
      return;
    }

    const mapToLatex = (cmd) => {
      if (cmd === 'Ans') return '\\text{ans}';
      if (cmd === 'preAns') return '\\text{preAns}';
      if (cmd === '( )/( )') return '\\frac{#?}{#?}';
      if (cmd === '( )^( )') return '{#?}^{#?}';
      if (cmd === 'sqrt( )') return '\\sqrt{#?}';
      if (cmd === 'nthRoot( , )') return '\\sqrt[#?]{#?}';
      if (cmd === 'nthRoot( , 3)') return '\\sqrt[3]{#?}';
      if (cmd === '( )⁻¹') return '{#?}^{-1}';
      if (cmd === 'e^( )') return 'e^{#?}';
      if (cmd === '10^( )') return '10^{#?}';
      if (cmd === 'log10( )') return '\\log_{10}(#?)';
      if (cmd === 'log( , )') return '\\log_{#?}(#?)';
      if (cmd === 'ln( )') return '\\ln(#?)';
      if (cmd === 'integral( , , , )') return '\\int_{#?}^{#?} #? \\, dx';
      if (cmd === 'sum(') return '\\sum_{#?}^{#?} #?';
      if (cmd === '∏(') return '\\prod_{#?}^{#?} #?';
      if (cmd === 'diff(') return '\\frac{d}{dx}(#?)';
      if (cmd === 'limit(') return '\\lim_{#? \\rightarrow #?} (#?)';
      if (cmd === 'sin(') return '\\sin(#?)';
      if (cmd === 'cos(') return '\\cos(#?)';
      if (cmd === 'tan(') return '\\tan(#?)';
      if (cmd === 'sinh(') return '\\sinh(#?)';
      if (cmd === 'cosh(') return '\\cosh(#?)';
      if (cmd === 'tanh(') return '\\tanh(#?)';
      if (cmd === 'asin(') return '\\arcsin(#?)';
      if (cmd === 'acos(') return '\\arccos(#?)';
      if (cmd === 'atan(') return '\\arctan(#?)';
      if (id === 'key_mul') return '\\cdot ';
      if (id === 'key_div') return '\\div ';
      if (id === 'key_neg') return '-';
      if (cmd === 'Ans') return '\\text{ans}';
      if (cmd === 'matrix( )') return '\\begin{pmatrix} #? & #? \\\\ #? & #? \\end{pmatrix}';
      if (cmd === 'det(') return '\\det(#?)';
      if (id === 'key_matrix' && effectiveAlpha) return '{#?}^{T}';
      if (cmd === 'rec') return '\\frac{1}{#?}';
      if (cmd === 'mix') return '#?\\frac{#?}{#?}';
      if (cmd === 'solve') return '\\text{solve}(#?, x)';
      if (cmd === 'taylor(') return '\\text{taylor}(#?, x, 0, 5)';
      if (cmd === 'subst(') return '\\text{subst}(#?, x, 0)';
      if (cmd === 'piecewise(') return '\\text{piecewise}(#?)';
      if (cmd === 'f(x)=') return 'f(#?)=';
      if (cmd === 'g(x)=') return 'g(#?)=';
      if (cmd === 'h(x)=') return 'h(#?)=';
      if (cmd === 'pi') return '\\pi ';
      if (cmd === 'e') return 'e';
      if (cmd === 'i') return 'i';
      if (cmd === 'x') return 'x';
      if (cmd === 'y') return 'y';
      if (cmd === 'z') return 'z';
      if (cmd === '%') return '\\%';
      if (cmd === 'Infinity') return '\\infty ';
      if (cmd === 'conj(') return '\\text{conj}(#?)';
      if (cmd === 'arg(') return '\\text{arg}(#?)';
      if (cmd === 'real(') return '\\text{Re}(#?)';
      if (cmd === 'imag(') return '\\text{Im}(#?)';
      if (cmd === 'cross(') return '\\times_{vec}';
      if (cmd === 'dot(') return '\\cdot_{vec}';
      if (cmd === 'norm(') return '\\|#?\\|';
      if (cmd === 'unit(') return '\\hat{#?}';
      if (cmd === 'mean(') return '\\text{media}(#?)';
      if (cmd === 'variance(') return '\\sigma^2(#?)';
      if (cmd === 'combinations( , )') return '{#?}\\text{C}_{#?}';
      if (cmd === 'permutations( , )') return '{#?}\\text{P}_{#?}';
      if (cmd === 'round(') return '\\text{round}(#?)';
      if (cmd === 'lcm(') return '\\text{lcm}(#?)';
      if (cmd === 'rand') return '\\text{rand}';
      if (cmd === 'fact(') return '#?!';

      // Basic mappings
      return cmd.replace(/\( \)/g, '(#?)').replace(/\(/g, '(#?)');
    };

    const latex = mapToLatex(command);
    mf.insert(latex);
    mf.focus();
  }, [handleEvaluate, isCtrlActive, isAlphaActive, isPhysicalCtrl, isPhysicalAlt]);

  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalKeyDown = (e) => {
      // Toggle logic for physical keys
      if (e.key === 'Control') {
        setIsCtrlActive(prev => !prev);
        setIsAlphaActive(false);
        return;
      }
      if (e.key === 'Alt') {
        setIsAlphaActive(prev => !prev);
        setIsCtrlActive(false);
        return;
      }

      if (e.ctrlKey) setIsPhysicalCtrl(true);
      if (e.altKey) setIsPhysicalAlt(true);

      // Allow MathLive and standard inputs to handle their own internal navigation/editing
      const activeTag = document.activeElement?.tagName?.toUpperCase();
      if (activeTag === 'MATH-FIELD' || activeTag === 'INPUT' || activeTag === 'TEXTAREA' || e.target.closest('math-field')) {
        if (e.key === 'Enter' && (activeTag === 'MATH-FIELD' || e.target.closest('math-field'))) {
          e.preventDefault();
          handleEvaluate();
        }
        // In all these cases, we want to STOP the global listener from doing anything with special keys
        // because these elements handle their own Backspace/navigation.
        return;
      }


    };

    const handleGlobalKeyUp = (e) => {
      if (!e.ctrlKey) setIsPhysicalCtrl(false);
      if (!e.altKey) setIsPhysicalAlt(false);
    };

    const handleBlur = () => {
      setIsPhysicalCtrl(false);
      setIsPhysicalAlt(false);
    };

    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
    window.addEventListener('keyup', handleGlobalKeyUp, { capture: true });
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
      window.removeEventListener('keyup', handleGlobalKeyUp, { capture: true });
      window.removeEventListener('blur', handleBlur);
    };
  }, [isOpen, handleEvaluate]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className={`w-full transition-all duration-700 bg-[#0d0d0f]/95 backdrop-blur-3xl rounded-[60px] border border-white/5 flex shadow-[0_100px_200px_rgba(0,0,0,1)] overflow-hidden animate-in zoom-in-95 pointer-events-auto ${activeMode === 'graph' ? 'max-w-[95vw] h-[92vh]' : 'max-w-[1100px] max-h-[90vh]'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <ModeRail activeMode={activeMode} setMode={setActiveMode} />

        <div className="flex-1 flex flex-col h-full overflow-hidden p-6 lg:p-8">
          <div className="flex-none flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse shadow-glow-indigo" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.6em] text-white/30">STEM Pro Workstation</h2>
            </div>

            <div className="flex items-center gap-4">
              <button
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setIsConstantsMenuOpen(true);
                }}
                className="flex items-center gap-3 px-6 py-2 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/30 hover:bg-white/10 transition-all text-white/30 hover:text-indigo-400 group"
              >
                <Atom size={16} className="group-hover:rotate-180 transition-transform duration-700" />
                <span className="text-[10px] font-black uppercase tracking-widest">Constants</span>
              </button>
              <button
                onPointerDown={(e) => { e.stopPropagation(); onClose(); }}
                className="p-4 hover:bg-white/5 rounded-full text-white/40"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className={`flex h-full overflow-hidden transition-all duration-200 ${activeMode === 'graph' ? 'gap-6' : 'gap-10'}`}>
            <div className={`flex flex-col transition-all duration-700 ${(activeMode === 'graph' || isMemorySidebarOpen) ? 'w-[400px] min-w-[400px]' : 'flex-1'}`}>

              {/* SCROLLABLE CONTENT ZONE (LCD + RESULT) */}
              <div className="flex-none overflow-y-auto custom-scrollbar pr-2 mb-4 flex flex-col gap-4">
                <div className="flex flex-col gap-4">
                  <ScientificMathField
                    ref={mathFieldRef}
                    value={calcInput}
                    onChange={handleInputChange}
                    onEnter={handleEvaluate}
                    isAllSelected={isAllSelected}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                  />

                  {/* RESULT DISPLAY (MOSCARO) */}
                  <div className="w-full flex justify-end items-center px-10 py-6 bg-white/[0.03] rounded-[35px] border border-white/10 relative group/result min-h-[85px] shadow-inner-soft">
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] font-black uppercase tracking-[0.3em] text-indigo-400/40 mb-2">LCD Result Output</span>
                      <div className="text-white text-5xl font-medium drop-shadow-[0_0_40px_rgba(99,102,241,0.3)] min-h-[1.2em] flex items-center justify-end">
                        <InlineMath math={String((calcResult && calcResult !== "0") ? calcResult : (calcResult === "0" ? "0" : "\\text{---}"))} />
                      </div>
                    </div>

                    {/* Floating Insert Button */}
                    <button
                      onClick={() => onInsert?.(calcResult)}
                      disabled={!calcResult || calcResult === '0'}
                      className="absolute left-6 opacity-0 group-hover/result:opacity-100 disabled:group-hover/result:opacity-0 transition-all flex items-center gap-3 px-6 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl shadow-indigo-500/40 active:scale-95 z-10"
                    >
                      <Plus size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Inserir na Nota</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* FIXED KEYPAD ZONE */}
              <div className="flex-none flex flex-col gap-4">
                {/* NAV & META ZONE - Unified to fit 400px */}
                <div className="flex gap-2 px-4 justify-between">
                  <ScientificButton key="key_shift" id="key_shift" keyData={buttonMap.keys.key_shift} onClick={handleInput} isCtrl={isCtrlActive || isPhysicalCtrl} isAlpha={isAlphaActive || isPhysicalAlt} variant="meta" className="w-[68px] h-12" />
                  <ScientificButton key="key_alpha" id="key_alpha" keyData={buttonMap.keys.key_alpha} onClick={handleInput} isCtrl={isCtrlActive || isPhysicalCtrl} isAlpha={isAlphaActive || isPhysicalAlt} variant="meta" className="w-[68px] h-12" />
                  <button
                    onClick={(e) => {
                      const nextUnit = unitMode === 'deg' ? 'rad' : 'deg';
                      setUnitMode(nextUnit);
                      try {
                        const mathjsExpr = MathService.latexToMathJS(calcInput);
                        const evaluation = stemEngine.evaluate(mathjsExpr, activeMode, isSymbolic, nextUnit);
                        setCalcResult(evaluation.text);
                      } catch (err) { }
                      e.currentTarget.blur();
                    }}
                    className="w-[68px] h-12 rounded-3xl border border-white/5 bg-white/5 text-[10px] font-black transition-all hover:bg-white/10 text-white/40 flex items-center justify-center gap-1"
                  >
                    <div className={`w-1 h-1 rounded-full ${unitMode === 'deg' ? 'bg-[#00d2ff]' : 'bg-[#bd00ff]'}`} />
                    {unitMode.toUpperCase()}
                  </button>
                  <button
                    onClick={(e) => {
                      const nextSym = !isSymbolic;
                      setIsSymbolic(nextSym);
                      try {
                        const mathjsExpr = MathService.latexToMathJS(calcInput);
                        const evaluation = stemEngine.evaluate(mathjsExpr, activeMode, nextSym, unitMode);
                        setCalcResult(evaluation.text);
                      } catch (err) { }
                      e.currentTarget.blur();
                    }}
                    className="w-[68px] h-12 rounded-3xl border border-white/5 bg-white/5 text-[10px] font-black transition-all hover:bg-white/10 text-white/40 flex items-center justify-center gap-1"
                  >
                    <div className={`w-1 h-1 rounded-full ${isSymbolic ? 'bg-[#10b981]' : 'bg-[#f43f5e]'}`} />
                    {isSymbolic ? "FRACT" : "DEC"}
                  </button>
                  <ScientificButton key="key_sd" id="key_sd" keyData={buttonMap.keys.key_sd} onClick={handleInput} isCtrl={isCtrlActive || isPhysicalCtrl} isAlpha={isAlphaActive || isPhysicalAlt} variant="sci" className="w-[68px] h-12" />
                </div>

                {/* SCIENTIFIC ZONE */}
                <div className="grid grid-cols-6 gap-2">
                  {SCI_KEYS.map(id => buttonMap.keys[id] && (
                    <ScientificButton key={id} id={id} keyData={buttonMap.keys[id]} onClick={handleInput} isCtrl={isCtrlActive || isPhysicalCtrl} isAlpha={isAlphaActive || isPhysicalAlt} variant="sci" />
                  ))}
                </div>

                {/* NUMERIC ZONE */}
                <div className="grid grid-cols-5 gap-2">
                  {NUM_KEYS.map(id => buttonMap.keys[id] && (
                    <ScientificButton key={id} id={id} keyData={buttonMap.keys[id]} onClick={handleInput} isCtrl={isCtrlActive || isPhysicalCtrl} isAlpha={isAlphaActive || isPhysicalAlt} variant="num" className={id === 'key_equal' ? 'bg-indigo-600 border-indigo-400' : (id === 'key_ac' || id === 'key_del' ? 'bg-[#991b1b]/10 border-red-500/20 text-red-500' : '')} />
                  ))}
                </div>
              </div>

              {/* IN GRAPH MODE: Show Function Management here at the bottom of the left column */}
              {activeMode === 'graph' && (
                <div className="flex-1 flex flex-col gap-4 mt-6 pt-6 border-t border-white/5 overflow-hidden">
                  <div className="flex justify-between items-center px-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400">Funções Ativas</h3>
                    {graphFunctions.length > 0 && (
                      <button
                        onClick={() => setGraphFunctions([])}
                        className="text-[8px] font-bold text-red-500/50 hover:text-red-500 uppercase tracking-widest transition-all"
                      >
                        Limpar Tudo
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0 mt-2">
                    <div className="flex flex-col gap-3 px-4 pb-4">
                      {graphFunctions.map(f => (
                        <div key={f.id} className="p-3 bg-white/5 border border-white/5 rounded-3xl flex justify-between items-center group transition-all hover:border-indigo-500/30">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-1.5 h-6 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-[10px] font-medium text-white/80 truncate opacity-90">
                                <InlineMath math={f.latex} />
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {/* EDIT BUTTON */}
                            <button
                              onClick={() => {
                                setCalcInput(f.latex);
                                if (mathFieldRef.current) {
                                  mathFieldRef.current.setValue(f.latex);
                                  setTimeout(() => mathFieldRef.current.focus(), 50);
                                }
                              }}
                              className="p-2 text-white/20 hover:text-indigo-400 hover:bg-white/5 rounded-xl transition-all"
                              title="Editar"
                            >
                              <Edit2 size={12} />
                            </button>
                            {/* TOGGLE VISIBILITY */}
                            <button
                              onClick={() => setGraphFunctions(prev => prev.map(x => x.id === f.id ? { ...x, visible: !x.visible } : x))}
                              className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase transition-all ${f.visible ? 'text-indigo-400 bg-indigo-500/10' : 'text-white/20 bg-white/5 hover:text-white/40'}`}
                            >
                              {f.visible ? 'Ver' : 'Off'}
                            </button>
                            {/* DELETE BUTTON */}
                            <button
                              onClick={() => setGraphFunctions(prev => prev.filter(x => x.id !== f.id))}
                              className="p-2 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {graphFunctions.length === 0 && (
                        <div className="py-12 text-center flex flex-col items-center gap-2 opacity-10">
                          <LineChart size={24} />
                          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Nenhuma Função</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {activeMode === 'graph' ? (
              <div className="flex-1 h-full relative border border-white/5 rounded-[50px] overflow-hidden bg-[#0a0a0c] min-h-[500px] animate-in slide-in-from-right-10 duration-200 shadow-2xl">
                <GGBPreview
                  ref={ggbRef}
                  functions={graphFunctions}
                  params={graphParams}
                  onParamsChange={(name, val) => setGraphParams(prev => ({ ...prev, [name]: val }))}
                  isVisible={true}
                />

                {/* GRAPH ACTION TOOLBAR (TOP RIGHT) */}
                <div className="absolute top-6 right-6 z-[100] flex gap-2 p-2 bg-black/20 backdrop-blur-md rounded-3xl border border-white/10">
                  <button
                    onClick={() => setIsTableOpen(!isTableOpen)}
                    className={`h-10 px-4 rounded-2xl flex items-center gap-2 transition-all border ${isTableOpen ? 'bg-indigo-600 border-indigo-400 text-white shadow-glow-indigo' : 'bg-black/60 border-white/10 text-white hover:bg-black/80'}`}
                  >
                    <Layers size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Tabela</span>
                  </button>
                  <button
                    onClick={handleSnapshot}
                    className="h-10 px-4 rounded-2xl bg-white text-black border border-white flex items-center gap-2 hover:bg-indigo-50 transition-all active:scale-95 shadow-xl"
                  >
                    <Plus size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Add à Nota</span>
                  </button>
                </div>

                {/* TABLE OF VALUES PANEL */}
                {isTableOpen && (
                  <div className="absolute inset-y-6 right-6 w-72 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-[40px] z-50 p-6 flex flex-col gap-4 animate-in slide-in-from-right-4 duration-300 shadow-[0_30px_60px_rgba(0,0,0,0.8)]">
                    <div className="flex justify-between items-center">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Tabela de Valores</h3>
                      <button onClick={() => setIsTableOpen(false)} className="text-white/20 hover:text-white"><X size={16} /></button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 py-2 border-b border-white/5">
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-bold text-white/20 uppercase">Início</span>
                        <input 
                          type="number" 
                          value={tableConfig.min} 
                          onChange={(e) => setTableConfig(prev => ({...prev, min: Number(e.target.value)}))}
                          className="bg-white/5 border-none outline-none rounded-lg p-2 text-white text-[10px] font-bold text-center"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-bold text-white/20 uppercase">Fim</span>
                        <input 
                          type="number" 
                          value={tableConfig.max} 
                          onChange={(e) => setTableConfig(prev => ({...prev, max: Number(e.target.value)}))}
                          className="bg-white/5 border-none outline-none rounded-lg p-2 text-white text-[10px] font-bold text-center"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-bold text-white/20 uppercase">Passo</span>
                        <input 
                          type="number" 
                          step="0.1"
                          value={tableConfig.step} 
                          onChange={(e) => setTableConfig(prev => ({...prev, step: Number(e.target.value)}))}
                          className="bg-white/5 border-none outline-none rounded-lg p-2 text-white text-[10px] font-bold text-center"
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                      <table className="w-full text-[10px]">
                        <thead className="sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-white/10">
                          <tr className="text-white/40 font-black uppercase tracking-widest">
                            <th className="py-2 text-left">X</th>
                            {graphFunctions.filter(f => f.visible).map(f => (
                              <th key={f.id} className="py-2 text-right" style={{color: f.color}}>Y</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {Array.from({ length: Math.floor((tableConfig.max - tableConfig.min) / tableConfig.step) + 1 }).map((_, i) => {
                            const x = tableConfig.min + i * tableConfig.step;
                            return (
                              <tr key={i} className="hover:bg-white/5 transition-colors">
                                <td className="py-2 text-white/60 font-mono">{x.toFixed(1)}</td>
                                {graphFunctions.filter(f => f.visible).map(f => {
                                  const api = ggbRef.current?.getApi();
                                  const ggbName = f.ggbName || `f${graphFunctions.indexOf(f)}`;
                                  const val = api ? api.getValue(`${ggbName}(${x})`) : 0;
                                  return (
                                    <td key={f.id} className="py-2 text-right font-mono tabular-nums font-bold text-white/90">
                                      {val === undefined || isNaN(val) ? '-' : val.toFixed(3)}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* OVERLAY: PARAMETER SLIDERS (WHITE GGB STYLE) */}
                {Object.keys(graphParams).length > 0 && (
                  <div className="absolute top-6 left-6 flex flex-col gap-3 z-50 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex flex-col gap-2 w-[240px]">
                      {Object.entries(graphParams).map(([name, val]) => {
                        const range = paramRanges[name] || { min: -10, max: 10 };
                        return (
                          <div key={name} className="flex bg-[#ffffff] border border-[#d3d3d3] rounded-sm overflow-hidden group/card shadow-sm h-[65px] w-full animate-in slide-in-from-left-4 duration-300">
                            {/* MAIN SIDE: Info & Slider */}
                            <div className="flex-1 p-2 px-4 flex flex-col justify-center gap-1.5 bg-white">
                              {/* Header: Name & Value */}
                              <div className="flex justify-between items-start">
                                <span className="text-[11px] font-mono text-[#2c2c2c] leading-none font-bold flex items-center">
                                  {name} = 
                                  <input 
                                    type="text"
                                    value={tempParamInputs[name] !== undefined ? tempParamInputs[name] : Number(val.toFixed(4))}
                                    onFocus={(e) => {
                                      e.target.select();
                                      setTempParamInputs(prev => ({ ...prev, [name]: val.toString() }));
                                    }}
                                    onChange={(e) => {
                                      const s = e.target.value.replace(',', '.');
                                      setTempParamInputs(prev => ({ ...prev, [name]: s }));
                                      const parsed = parseFloat(s);
                                      if (!isNaN(parsed)) {
                                        setGraphParams(prev => ({ ...prev, [name]: parsed }));
                                      }
                                    }}
                                    onBlur={() => {
                                      setTempParamInputs(prev => {
                                        const next = { ...prev };
                                        delete next[name];
                                        return next;
                                      });
                                    }}
                                    className="ml-1 w-20 bg-transparent border-none outline-none text-indigo-600 font-bold focus:bg-indigo-50/50 rounded-sm px-1 transition-all"
                                  />
                                </span>
                              </div>

                              {/* Slider with Bounds */}
                              <div className="flex items-center gap-2 pr-1">
                                <input
                                  type="text"
                                  className="w-10 text-[10px] text-center border-b border-[#e0e0e0] outline-none text-[#666666] focus:border-black font-normal bg-transparent"
                                  value={range.min}
                                  onChange={(e) => {
                                    const s = e.target.value.replace(',', '.');
                                    setParamRanges(prev => ({ ...prev, [name]: { ...range, min: s } }));
                                  }}
                                />
                                <div className="flex-1 relative flex items-center mx-1">
                                  <input
                                    type="range"
                                    min={range.min}
                                    max={range.max}
                                    step="0.01"
                                    value={val}
                                    onChange={(e) => {
                                      setGraphParams(prev => ({ ...prev, [name]: parseFloat(e.target.value) }));
                                      setAnimatingParams(curr => {
                                        const next = { ...curr };
                                        delete next[name];
                                        return next;
                                      });
                                    }}
                                    className="w-full appearance-none bg-[#cccccc] h-[3px] rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[14px] [&::-webkit-slider-thumb]:h-[14px] [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-full"
                                  />
                                </div>
                                <input
                                  type="text"
                                  className="w-10 text-[10px] text-center border-b border-[#e0e0e0] outline-none text-[#666666] focus:border-black font-normal bg-transparent"
                                  value={range.max}
                                  onChange={(e) => {
                                    const s = e.target.value.replace(',', '.');
                                    setParamRanges(prev => ({ ...prev, [name]: { ...range, max: s } }));
                                  }}
                                />
                                
                                <button 
                                  onClick={() => {
                                    setAnimatingParams(curr => {
                                      if (curr[name]) {
                                        const next = { ...curr };
                                        delete next[name];
                                        return next;
                                      }
                                      return { ...curr, [name]: 1 };
                                    });
                                  }}
                                  className={`ml-1 w-6 h-6 rounded-full border flex items-center justify-center transition-all ${animatingParams[name] ? 'bg-black border-black shadow-lg scale-110' : 'border-gray-300 hover:bg-gray-50'}`}
                                >
                                  {animatingParams[name] ? (
                                    <div className="flex gap-0.5">
                                      <div className="w-0.5 h-2.5 bg-white" />
                                      <div className="w-0.5 h-2.5 bg-white" />
                                    </div>
                                  ) : (
                                    <div className="w-0 h-0 border-t-[3.5px] border-t-transparent border-l-[6px] border-l-gray-600 border-b-[3.5px] border-b-transparent ml-0.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : isMemorySidebarOpen ? (
              <MemorySidebar
                variables={stemEngine.variables}
                formulas={stemEngine.formulas}
                ans={stemEngine.ans}
                isOpen={isMemorySidebarOpen}
                onToggle={() => setIsMemorySidebarOpen(false)}
                onEdit={(formula) => {
                  const raw = formula.replace(':=', '=');
                  setCalcInput(raw);
                  if (mathFieldRef.current) {
                    mathFieldRef.current.setValue(raw);
                    mathFieldRef.current.focus();
                  }
                }}
              />
            ) : (isMemorySidebarOpen || activeMode === 'graph') ? (
              <div className="flex-1 h-full relative flex flex-col justify-center items-center opacity-20">
                {/* Only show this placeholder if ONE of the sidebars is technically active or expected */}
                <Calculator size={48} className="mb-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.5em]">Pronto para Calcular</span>
              </div>
            ) : null}

            {/* ACTION: ADD CURRENT TO GRAPH (Only if in graph mode and right side is graph) */}
            {activeMode === 'graph' && (
              <div className="absolute bottom-6 right-6 z-50">
                <button
                  onClick={addFunctionToGraph}
                  disabled={!calcInput}
                  className="px-10 py-5 rounded-[25px] bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-glow-indigo disabled:opacity-20 disabled:grayscale flex items-center gap-3 active:scale-95"
                >
                  <Plus size={14} />
                  Plotar Expressão
                </button>
              </div>
            )}

            {!isMemorySidebarOpen && activeMode !== 'graph' && (
              <button
                onClick={() => setIsMemorySidebarOpen(true)}
                className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-60 bg-white/[0.02] hover:bg-white/5 border-l border-y border-white/5 hover:border-indigo-500/40 rounded-l-3xl flex flex-col items-center justify-center gap-4 transition-all group z-50"
              >
                <Bookmark size={14} className="text-indigo-400 group-hover:scale-125 transition-all" />
                <span className="[writing-mode:vertical-rl] text-[9px] font-black uppercase tracking-[0.4em] text-white/20 group-hover:text-white/50">Memória</span>
              </button>
            )}
          </div>

          <ConstantsMenu
            isOpen={isConstantsMenuOpen}
            onClose={() => setIsConstantsMenuOpen(false)}
            onInsert={handleInsertConstant}
          />

          {/* MATRIX DIMENSION DIALOG */}
          {isMatrixDialogOpen && (
            <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-2xl flex items-center justify-center p-12 animate-in fade-in zoom-in-95 duration-300" onClick={() => setIsMatrixDialogOpen(false)}>
              <div
                className="bg-[#0d0d0f] border border-white/10 rounded-[50px] p-12 flex flex-col gap-10 shadow-[0_50px_100px_rgba(0,0,0,0.9)] w-[450px] relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col gap-2">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400">
                    {matrixTargetCmd === 'det' ? 'Determinante (Matriz Quadrada)' : 'Configurar Matriz'}
                  </h3>
                  <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Defina as dimensões da grade (Máx 10x10)</p>
                </div>

                <div className="flex gap-8 items-center justify-center py-4">
                  <div className="flex flex-col items-center gap-4">
                    <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Linhas</span>
                    <input
                      type="number"
                      value={matrixRows}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMatrixRows(val);
                        if (matrixTargetCmd === 'det') setMatrixCols(val);
                      }}
                      min="1"
                      max="10"
                      className="w-24 h-24 bg-white/5 border border-white/10 rounded-[30px] text-center text-4xl font-black text-white outline-none focus:border-indigo-500/50 focus:bg-indigo-500/5 transition-all shadow-inner-soft"
                    />
                  </div>
                  <X size={20} className="text-white/10 mt-8" strokeWidth={3} />
                  <div className="flex flex-col items-center gap-4">
                    <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Colunas</span>
                    <input
                      type="number"
                      value={matrixCols}
                      onChange={(e) => setMatrixCols(e.target.value)}
                      disabled={matrixTargetCmd === 'det'}
                      min="1"
                      max="10"
                      className={`w-24 h-24 bg-white/5 border border-white/10 rounded-[30px] text-center text-4xl font-black text-white outline-none transition-all shadow-inner-soft ${matrixTargetCmd === 'det' ? 'opacity-20 cursor-not-allowed' : 'focus:border-indigo-500/50 focus:bg-indigo-500/5'}`}
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setIsMatrixDialogOpen(false)}
                    className="flex-1 py-5 rounded-[25px] bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white/10 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleInsertMatrix}
                    className="flex-3 py-5 px-10 rounded-[25px] bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-glow-indigo active:scale-95"
                  >
                    Confirmar e Inserir
                  </button>
                </div>
              </div>
            </div>
          )}
          <style>{`
          math-field::part(virtual-keyboard-toggle) { display: none; }
          .shadow-glow-indigo { box-shadow: 0 0 30px rgba(99, 102, 241, 0.4); }
          .shadow-glow-indigo-soft { box-shadow: 0 0 10px rgba(99, 102, 241, 0.2); }
          .drop-shadow-glow-blue { filter: drop-shadow(0 0 5px #3b82f6); }
          .drop-shadow-glow-purple { filter: drop-shadow(0 0 5px #a855f7); }
          .shadow-neumat { box-shadow: 0 4px 10px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.05); }
          .shadow-neumat-inner { box-shadow: inset 0 2px 4px rgba(0,0,0,0.5); }
          .shadow-inner-soft { box-shadow: inset 0 2px 10px rgba(0,0,0,0.3); }
          @keyframes pulse-fast { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
          .animate-pulse-fast { animation: pulse-fast 0.8s infinite; }
          .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.4); }
        `}</style>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ScientificOmnibar;

