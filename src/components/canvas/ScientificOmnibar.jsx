import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { stemEngine } from '../../services/CalculatorEngine';
import buttonMap from '../../data/button_map.json';
import { ModeRail, DisplayLCD, ScientificButton, GGBPreview, DPad } from './CalculatorUI';
import { X, Maximize2, Layers, Bookmark, Pencil } from 'lucide-react';

// ========== HELPER UTILITIES ==========
const isFunctionPart = (text, idx) => {
  if (idx < 0 || idx >= text.length) return false;
  const c = text[idx];
  // Letters, digits, √, /, or _ belonging to a prefix followed by ( or ^
  if (/[a-zA-Z0-9√/_]/.test(c)) {
    let r = idx; while (r < text.length && /[a-zA-Z0-9√/_]/.test(text[r])) r++;
    return text[r] === '(' || text[r] === '^';
  }
  // Specific numeric function prefixes (like 10 in 10^)
  if (c === '0' && idx > 0 && text[idx - 1] === '1' && text[idx + 1] === '^') return true;
  if (c === '1' && text[idx + 1] === '0' && text[idx + 2] === '^') return true;
  return false;
};

const MemorySidebar = ({ variables, formulas, onToggle, isOpen, onEdit }) => {
  const activeVars = Object.entries(variables).filter(([key, val]) => {
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
        <button onClick={onToggle} className="p-2 hover:bg-white/5 rounded-lg text-white/20 transition-all">
          <X size={14} />
        </button>
      </div>
      
      <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar max-h-[calc(100vh-400px)]">
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
                    <code className="text-xs font-medium text-[#00d2ff] bg-white/[0.01] p-2 rounded-lg border border-white/5 font-mono truncate cursor-pointer hover:bg-white/[0.03]" onClick={() => onEdit(formula)}>
                       {formula.replace(':=' , '=')}
                    </code>
                  </div>
                ) : (
                  <span className="text-base font-semibold text-white/90 tracking-tight">
                    {typeof val === 'number' ? val.toLocaleString('en-US', { maximumFractionDigits: 8 }) : val.toString()}
                  </span>
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

const ScientificOmnibar = ({ isOpen, onClose, onInsert }) => {
  const [calcInput, setCalcInput] = useState('');
  const [calcResult, setCalcResult] = useState('0');
  const [activeMode, setActiveMode] = useState('calculate');
  const [isCtrlActive, setIsCtrlActive] = useState(false);
  const [isAlphaActive, setIsAlphaActive] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isSymbolic, setIsSymbolic] = useState(true);
  const [unitMode, setUnitMode] = useState('deg'); // 'deg' or 'rad'
  const [justOpened, setJustOpened] = useState(false);
  const [isPhysicalCtrl, setIsPhysicalCtrl] = useState(false);
  const [isPhysicalAlt, setIsPhysicalAlt] = useState(false);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [isResultStale, setIsResultStale] = useState(false);
  
  // HISTORY STACKS (Refs to prevent stale closures in event listeners)
  const historyRef = useRef([]);
  const redoStackRef = useRef([]);

  useEffect(() => {
    if (isOpen) {
      setIsCtrlActive(false);
      setIsAlphaActive(false);
      setJustOpened(true);
      const timer = setTimeout(() => setJustOpened(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const keyPressedRef = useRef(false);

  // ZONAL KEY DEFINITIONS
  const SCI_KEYS = [
    'key_frac', 'key_sqrt', 'key_pow', 'key_log', 'key_ln', 'key_neg',
    'key_integral', 'key_sum', 'key_sin', 'key_cos', 'key_tan',
    'key_paren_left', 'key_paren_right', 'key_comma'
  ];

  const NUM_KEYS = [
    'key_7', 'key_8', 'key_9', 'key_del', 'key_ac',
    'key_4', 'key_5', 'key_6', 'key_mul', 'key_div',
    'key_1', 'key_2', 'key_3', 'key_plus', 'key_minus',
    'key_dot', 'key_0', 'key_exp', 'key_ans', 'key_equal'
  ];

  // Refs for stable access in event listeners without re-binding
  const inputRef = useRef(calcInput);
  const cursorRef = useRef(cursorPosition);
  const ctrlRef = useRef(isCtrlActive);
  const alphaRef = useRef(isAlphaActive);
  const symbolicRef = useRef(isSymbolic);
  const unitRef = useRef(unitMode);
  const activeModeRef = useRef(activeMode);
  const allSelectedRef = useRef(isAllSelected);
  const staleRef = useRef(isResultStale);
  const [isMemorySidebarOpen, setIsMemorySidebarOpen] = useState(true);

  useEffect(() => { inputRef.current = calcInput; }, [calcInput]);
  useEffect(() => { cursorRef.current = cursorPosition; }, [cursorPosition]);
  useEffect(() => { ctrlRef.current = isCtrlActive; }, [isCtrlActive]);
  useEffect(() => { alphaRef.current = isAlphaActive; }, [isAlphaActive]);
  useEffect(() => { symbolicRef.current = isSymbolic; }, [isSymbolic]);
  useEffect(() => { unitRef.current = unitMode; }, [unitMode]);
  useEffect(() => { activeModeRef.current = activeMode; }, [activeMode]);
  useEffect(() => { allSelectedRef.current = isAllSelected; }, [isAllSelected]);
  useEffect(() => { staleRef.current = isResultStale; }, [isResultStale]);

  const handleEvaluate = useCallback(() => {
    const evaluation = stemEngine.evaluate(inputRef.current, activeModeRef.current, symbolicRef.current, unitRef.current);
    setCalcResult(evaluation.text);
    setIsResultStale(true); staleRef.current = true;
  }, []);

  const moveCursor = useCallback((direction) => {
    const text = inputRef.current;
    const pos = cursorRef.current;
    let next = pos;

    const isSkippable = (idx) => {
      if (idx <= 0 || idx >= text.length) return false;
      const prev = text[idx - 1];
      const curr = text[idx];
      const isProductive = (c) => /[a-zA-Z0-9√/_]/.test(c);
      const isBracket = (c) => ['(', ')'].includes(c);
      
      // Stop next to a real digit, variable, or a bracket boundary
      if (isProductive(prev) || isProductive(curr) || isBracket(prev) || isBracket(curr)) return false;
      
      // Also don't skip placeholders (spaces between structural boundaries)
      const isStruct = (c) => ['^', '/', ','].includes(c);
      if (curr === ' ' && isStruct(prev) && isStruct(text[idx + 1] || '')) return false;

      // Otherwise, it's a gutter (structural boundary or padding) — we can skip it
      return true;
    };

    if (direction === 'left') {
      next = Math.max(0, pos - 1);
      while (next > 0 && isSkippable(next)) next--;
      if (next > 0 && (text[next-1] === '(' || text[next-1] === '^' || isFunctionPart(text, next-1))) {
        while (next > 0 && (text[next-1] === '(' || text[next-1] === '^' || /[a-zA-Z0-9√/_]/.test(text[next - 1]))) next--;
      }
    } else if (direction === 'right') {
      next = Math.min(text.length, pos + 1);
      while (next < text.length && isSkippable(next)) next++;
      if (next < text.length && (text[next] === '^' || isFunctionPart(text, next))) {
        while (next < text.length && (text[next] === '^' || /[a-zA-Z0-9√/_]/.test(text[next]))) next++;
        if (next < text.length && text[next] === '(') next++;
      }
      if (next < text.length && (text[next] === ')' || text[next] === '(')) {
        next++;
      }
    } else if (direction === 'down' || direction === 'up') {
      const isDown = direction === 'down';
      const separators = ['/', '^', ','];
      let target = -1;
      
      if (isDown) {
        const options = separators.map(s => text.indexOf(s, pos)).filter(i => i !== -1);
        if (options.length > 0) {
          const first = Math.min(...options);
          const nextOpen = text.indexOf('(', first);
          target = nextOpen !== -1 ? nextOpen + 1 : first + 1;
        }
      } else {
        const options = separators.map(s => text.lastIndexOf(s, pos - 1)).filter(i => i !== -1);
        if (options.length > 0) {
          const last = Math.max(...options);
          const prevOpen = text.lastIndexOf('(', last);
          target = prevOpen !== -1 ? prevOpen + 1 : last;
        }
      }
      
      if (target !== -1) next = Math.max(0, Math.min(text.length, target));
    }

    setCursorPosition(next); cursorRef.current = next;
  }, []);

  const pushToHistory = useCallback(() => {
    const nextItem = { text: inputRef.current, pos: cursorRef.current };
    historyRef.current.push(nextItem);
    if (historyRef.current.length > 100) historyRef.current.shift();
    redoStackRef.current = []; // Clear redo stack on new action
  }, []);

  const handleUndo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const last = historyRef.current.pop();
    
    redoStackRef.current.push({ text: inputRef.current, pos: cursorRef.current });
    
    setCalcInput(last.text); inputRef.current = last.text;
    setCursorPosition(last.pos); cursorRef.current = last.pos;
  }, []);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop();
    
    historyRef.current.push({ text: inputRef.current, pos: cursorRef.current });
    
    setCalcInput(next.text); inputRef.current = next.text;
    setCursorPosition(next.pos); cursorRef.current = next.pos;
  }, []);

  const handleInput = useCallback((id, forceMode = null, ignoreCurrentModifiers = false) => {
    if (id === 'key_left') { moveCursor('left'); return; }
    if (id === 'key_right') { moveCursor('right'); return; }
    if (id === 'key_up') { moveCursor('up'); return; }
    if (id === 'key_down') { moveCursor('down'); return; }

    const key = buttonMap.keys[id];
    if (!key) return;

    if (allSelectedRef.current && id !== 'key_left' && id !== 'key_right') {
      setCalcInput(''); inputRef.current = '';
      setCursorPosition(0); cursorRef.current = 0;
      setIsAllSelected(false);
      if (id === 'key_del' || id === 'key_ac') return;
    } else if (allSelectedRef.current) {
      setIsAllSelected(false);
    }

    let command = key.normal;
    const effectiveCtrl = !ignoreCurrentModifiers && (forceMode === 'ctrl' || ctrlRef.current);
    const effectiveAlpha = !ignoreCurrentModifiers && (forceMode === 'alpha' || alphaRef.current);

    if (effectiveCtrl) command = key.shift || key.normal;
    else if (effectiveAlpha) command = key.alpha || key.normal;

    setIsCtrlActive(false);
    setIsAlphaActive(false);

    if (command === 'CTRL') { setIsCtrlActive(true); return; }
    if (command === 'ALT') { setIsAlphaActive(true); return; }

    // --- AUTO-RESET LOGIC ---
    if (staleRef.current && id !== 'key_shift' && id !== 'key_alpha') {
      setIsResultStale(false); staleRef.current = false;
      setCalcResult(null); 
      
      const isOperator = ['+', '-', '*', '/', '^', '=', ','].some(op => command === op) || id.includes('plus') || id.includes('minus') || id.includes('mul') || id.includes('div') || id === 'key_sd';
      
      if (!isOperator && id !== 'key_del' && id !== 'key_ac' && !id.includes('arrow') && id !== 'key_stod') {
        setCalcInput('');
        inputRef.current = '';
        setCursorPosition(0);
        cursorRef.current = 0;
      }
    }

    if (command === 'AC') {
      if (effectiveCtrl) { handleRedo(); return; } // SHIFT + AC = REDO
      pushToHistory(); 
      setCalcInput(''); inputRef.current = '';
      setCalcResult('0');
      setCursorPosition(0); cursorRef.current = 0;
      setIsResultStale(false); staleRef.current = false;
      return;
    }
    if (command === 'DEL') {
      if (effectiveCtrl) { handleUndo(); return; } // SHIFT + DEL = UNDO
      pushToHistory();
      const pos = cursorRef.current;
      const text = inputRef.current;
      if (pos <= 0) return;

      const isStructuralLocal = (t, p) => {
        if (p < 0 || p >= t.length) return false;
        return ['^', '/', ',', '(', ')'].includes(t[p]);
      };

      // 1. Sweep left: skip ALL structural chars AND spaces to find real content
      let contentIdx = pos - 1;
      while (contentIdx >= 0 && (isStructuralLocal(text, contentIdx) || text[contentIdx] === ' ')) {
        contentIdx--;
      }

      if (contentIdx >= 0 && !isFunctionPart(text, contentIdx)) {
        const nextText = text.slice(0, contentIdx) + text.slice(contentIdx + 1);
        setCalcInput(nextText); inputRef.current = nextText;
        setCursorPosition(contentIdx); cursorRef.current = contentIdx;
        return;
      }

      // 2. STRUCTURAL SHIELD & SURGICAL WIPE
      if (pos > 0 && text[pos - 1] === '(') {
        // Check if current brackets are empty
        const closeIdx = ((t, start) => {
          let d = 0;
          for (let i = start; i < t.length; i++) {
            if (t[i] === '(') d++; else if (t[i] === ')') { d--; if (d === 0) return i; }
          }
          return -1;
        })(text, pos - 1);
        
        if (closeIdx !== -1) {
          const innerContent = text.substring(pos, closeIdx).trim();
          if (innerContent === '' || innerContent === ',') {
            
            // --- NEW: Binary Structure Detection (Fraction/Power) ---
            let isBinaryLeft = false, binaryRightEnd = -1;
            let scanRight = closeIdx + 1;
            while(scanRight < text.length && text[scanRight] === ' ') scanRight++;
            if (scanRight < text.length && (text[scanRight] === '/' || text[scanRight] === '^')) {
                scanRight++;
                while(scanRight < text.length && text[scanRight] === ' ') scanRight++;
                if (scanRight < text.length && text[scanRight] === '(') {
                    const rightClose = ((t, start) => { let d=0; for (let i=start;i<t.length;i++) { if(t[i]==='(') d++; else if(t[i]===')') {d--; if(d===0) return i;} } return -1; })(text, scanRight);
                    if (rightClose !== -1) {
                        const rightContent = text.substring(scanRight + 1, rightClose).trim();
                        if (rightContent === '') { isBinaryLeft = true; binaryRightEnd = rightClose; }
                    }
                }
            }

            let isBinaryRight = false, binaryLeftStart = -1;
            let scanLeft = pos - 2;
            while(scanLeft >= 0 && text[scanLeft] === ' ') scanLeft--;
            if (scanLeft >= 0 && (text[scanLeft] === '/' || text[scanLeft] === '^')) {
                scanLeft--;
                while(scanLeft >= 0 && text[scanLeft] === ' ') scanLeft--;
                if (scanLeft >= 0 && text[scanLeft] === ')') {
                    const findOpenBackward = (t, end) => { let d=0; for(let i=end; i>=0; i--){ if(t[i]===')') d++; else if(t[i]==='('){d--; if(d===0) return i;} } return -1; };
                    const leftStart = findOpenBackward(text, scanLeft);
                    if (leftStart !== -1) {
                        const leftContent = text.substring(leftStart + 1, scanLeft).trim();
                        if (leftContent === '') { isBinaryRight = true; binaryLeftStart = leftStart; }
                    }
                }
            }
            
            let wipeStart = pos - 1;
            let wipeEnd = closeIdx;

            if (isBinaryLeft) {
                wipeEnd = binaryRightEnd;
            } else if (isBinaryRight) {
                wipeStart = binaryLeftStart;
            } else {
                // Regular function wipe (e.g., sqrt, log)
                while (wipeStart > 0 && isFunctionPart(text, wipeStart - 1)) wipeStart--;
            }
            
            const nextText = text.slice(0, wipeStart) + text.slice(wipeEnd + 1);
            setCalcInput(nextText); inputRef.current = nextText;
            setCursorPosition(wipeStart); cursorRef.current = wipeStart;
            return;
          }
        }
      }

      if (pos > 0 && isStructuralLocal(text, pos - 1)) {
        const char = text[pos - 1];
        if (char === '/' || char === '^') {
          // If user hits backspace exactly on an orphaned slash or caret
          const nextText = text.slice(0, pos - 1) + text.slice(pos);
          setCalcInput(nextText); inputRef.current = nextText;
          setCursorPosition(pos - 1); cursorRef.current = pos - 1;
          return;
        }
        
        // General shield for parentheses if not part of wipe sequence
        setCursorPosition(pos - 1); cursorRef.current = pos - 1;
        return;
      }

      // 2. Atomic Shell Deletion & Surgical Teleportation
      let parenPos = -1;
      if (text[pos-1] === '(' || text[pos-1] === ')') parenPos = pos - 1;
      else if (text[pos] === '(' || text[pos] === ')') parenPos = pos;
      else {
        let left = pos - 1;
        while (left >= 0 && text[left] !== '(' && text[left] !== ')') left--;
        parenPos = left;
      }

      let isClosed = false;
      if (parenPos >= 0) {
        const c = text[parenPos];
        let matchPos = -1;
        if (c === '(') {
          let d = 1;
          for (let i = parenPos + 1; i < text.length; i++) {
            if (text[i] === '(') d++; else if (text[i] === ')') d--;
            if (d === 0) { matchPos = i; break; }
          }
        } else {
          let d = 1;
          for (let i = parenPos - 1; i >= 0; i--) {
            if (text[i] === ')') d++; else if (text[i] === '(') d--;
            if (d === 0) { matchPos = i; break; }
          }
        }

        if (matchPos !== -1) {
          isClosed = true;
          const start = Math.min(parenPos, matchPos);
          const end = Math.max(parenPos, matchPos);
          const contentStr = text.slice(start + 1, end).replace(/[, ]/g, '').trim();

          let prefixStart = start;
          while (prefixStart > 0 && /[a-zA-Z0-9√/_]/.test(text[prefixStart - 1])) prefixStart--;

          if (contentStr === '') {
            // DELETE ENTIRE EMPTY SHELL
            let totalStart = prefixStart;
            let totalEnd = end;
            if (prefixStart > 0 && (text[prefixStart-1] === '^' || text[prefixStart-1] === '/')) {
              totalStart = prefixStart - 1;
              while (totalStart > 0 && /[a-zA-Z0-9√/_]/.test(text[totalStart-1])) totalStart--;
            }
            const nt = text.slice(0, totalStart) + text.slice(totalEnd + 1);
            setCalcInput(nt); inputRef.current = nt;
            setCursorPosition(totalStart); cursorRef.current = totalStart;
            return;
          } else if (pos <= start + 1 && pos >= prefixStart) {
            // SURGICAL TELEPORT: Only jump if trying to break the hardware (prefix or '(')
            const targetEnd = Math.max(parenPos, matchPos);
            setCursorPosition(targetEnd); cursorRef.current = targetEnd;
            return;
          }
        }
      }

      // 3. Fallback: Only jump if it's a CLOSED hardware part, otherwise let the user DELETE IT
      if ((isStructuralLocal(text, pos - 1) || isFunctionPart(text, pos - 1)) && isClosed) {
        setCursorPosition(pos - 1); cursorRef.current = pos - 1;
        return;
      }

      const nt = text.slice(0, pos - 1) + text.slice(pos);
      setCalcInput(nt); inputRef.current = nt;
      setCursorPosition(pos - 1); cursorRef.current = pos - 1;
      return;
    }
    if (command === '=') { handleEvaluate(); return; }
    if (command === 'stod') {
      const nextSym = !symbolicRef.current;
      setIsSymbolic(nextSym); symbolicRef.current = nextSym;
      const evaluation = stemEngine.evaluate(inputRef.current, activeModeRef.current, nextSym, unitRef.current);
      setCalcResult(evaluation.text);
      return;
    }

    const resolveTemplate = (cmd, text, cursorIdx) => {
      const isStart = cursorIdx === 0 || ['+', '-', '*', '/', '(', ','].includes(text[cursorIdx - 1]) || text[cursorIdx - 1] === ' ';

      // Infix Operators (Fractions, Powers)
      if (cmd === '( )^( )') return isStart ? { insert: '( )^( )', offset: 1 } : { insert: '^( )', offset: 2 };
      if (cmd === '( )/( )') return isStart ? { insert: '( )/( )', offset: 2 } : { insert: '/( )', offset: 2 };
      
      // Hardware placeholders based on parameter markers
      if (cmd === ' * 10^( )') return { insert: cmd, offset: 7 };

      // Normal Function Blocks with internal placeholders
      const firstParen = cmd.indexOf('( ');
      if (firstParen !== -1) return { insert: cmd, offset: firstParen + 1 };
      
      // Open Function Blocks
      if (cmd.endsWith('(')) return { insert: cmd + ' )', offset: cmd.length };

      return { insert: cmd, offset: cmd.length };
    };

    const pos = cursorRef.current;
    const { insert: textToInsert, offset } = resolveTemplate(command, inputRef.current, pos);

    const nextText = inputRef.current.slice(0, pos) + textToInsert + inputRef.current.slice(pos);
    const nextPos = pos + offset;
    pushToHistory();
    setCalcInput(nextText); inputRef.current = nextText;
    setCursorPosition(nextPos); cursorRef.current = nextPos;
  }, [handleEvaluate, isSymbolic, unitMode, pushToHistory]);

  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalKeyDown = (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        if (e.key === 'ArrowLeft') moveCursor('left');
        else if (e.key === 'ArrowRight') moveCursor('right');
        else if (e.key === 'ArrowUp') moveCursor('up');
        else if (e.key === 'ArrowDown') moveCursor('down');
        return;
      }

      if (['Backspace', 'Enter'].includes(e.key)) e.preventDefault();

      if (e.key === 'Control' || e.key === 'Alt') {
        keyPressedRef.current = false;
        return;
      }

      keyPressedRef.current = true;

      const physicalCtrl = e.ctrlKey;
      const physicalAlt = e.altKey;
      const physicalShift = e.shiftKey;

      // 1. UNDO (Ctrl+Z)
      if (physicalCtrl && e.key.toLowerCase() === 'z' && !physicalShift) {
         e.preventDefault();
         handleUndo();
         return;
      }

      // 2. REDO (Ctrl+Y or Ctrl+Shift+Z)
      if (physicalCtrl && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && physicalShift))) {
         e.preventDefault();
         handleRedo();
         return;
      }

      // 3. SELECT ALL (Ctrl+A)
      if (physicalCtrl && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setIsAllSelected(true);
        return;
      }

      const foundKeyId = Object.keys(buttonMap.keys).find(id => buttonMap.keys[id].keyCode === e.code);
      const isMetaKey = foundKeyId && ['key_del', 'key_ac', 'key_equal', 'key_left', 'key_right', 'key_up', 'key_down'].includes(foundKeyId);
      const isNumeric = foundKeyId && ['key_0', 'key_1', 'key_2', 'key_3', 'key_4', 'key_5', 'key_6', 'key_7', 'key_8', 'key_9'].includes(foundKeyId);
      const isLetterKey = foundKeyId && foundKeyId.startsWith('key_') && !isNumeric && !isMetaKey;

      if (foundKeyId) {
        // Physical Highlight Tracking
        if (e.key === 'Control') setIsPhysicalCtrl(true);
        if (e.key === 'Alt') setIsPhysicalAlt(true);

        const isCharacterKey = e.key.length === 1;
        const requiresSpecialLogic = physicalCtrl || physicalAlt || ctrlRef.current || alphaRef.current || (physicalShift && isLetterKey);

        // RULE: Standard typing for any character-producing key without active calculator modifiers
        if (isCharacterKey && !requiresSpecialLogic && !isMetaKey) {
          // Skip to literal fallback
        } else {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          if (isLetterKey) {
            const isFunctionLetter = ['key_sin', 'key_cos', 'key_tan', 'key_log', 'key_ln', 'key_sqrt', 'key_integral', 'key_sum'].includes(foundKeyId);
            if (!isFunctionLetter && (physicalCtrl || ctrlRef.current || physicalAlt || alphaRef.current)) {
              return;
            }
            if (physicalShift && !physicalCtrl && !physicalAlt) {
              handleInput(foundKeyId, null);
              return;
            }
            if (physicalCtrl || ctrlRef.current) {
              handleInput(foundKeyId, 'ctrl');
              return;
            }
            if (physicalAlt || alphaRef.current) {
              handleInput(foundKeyId, 'alpha');
              return;
            }
          }
          const force = (physicalCtrl || ctrlRef.current) ? 'ctrl' : (physicalAlt || alphaRef.current ? 'alpha' : null);
          handleInput(foundKeyId, force);
          return;
        }
      }

      // Block Canvas Shortcuts (Critical for Ctrl+T, Ctrl+C)
      if (physicalCtrl || physicalAlt) {
        if (!['z', 'y', 'a'].includes(e.key.toLowerCase())) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
      }

      // 3. Fallback for raw character typing (everything else)
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (isAllSelected) {
          setCalcInput(e.key); inputRef.current = e.key;
          setCursorPosition(1); cursorRef.current = 1;
          setIsAllSelected(false);
          return;
        }

        const pos = cursorRef.current;
        const nextText = inputRef.current.slice(0, pos) + e.key + inputRef.current.slice(pos);
        const nextPos = pos + 1;
        setCalcInput(nextText); inputRef.current = nextText;
        setCursorPosition(nextPos); cursorRef.current = nextPos;
      }
    };

    const handleGlobalKeyUp = (e) => {
      if (justOpened) return;
      if (e.key === 'Control') setIsPhysicalCtrl(false);
      if (e.key === 'Alt') setIsPhysicalAlt(false);

      if (!keyPressedRef.current) {
        if (e.key === 'Control') setIsCtrlActive(prev => !prev);
        if (e.key === 'Alt') setIsAlphaActive(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
    window.addEventListener('keyup', handleGlobalKeyUp, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
      window.removeEventListener('keyup', handleGlobalKeyUp, { capture: true });
    };
  }, [isOpen, handleInput, justOpened]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="w-full max-w-[1100px] min-h-[850px] bg-[#0d0d0f]/90 backdrop-blur-3xl rounded-[60px] border border-white/5 flex shadow-[0_100px_200px_rgba(0,0,0,1)] overflow-hidden animate-in zoom-in-95 duration-500 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <ModeRail activeMode={activeMode} setMode={setActiveMode} />

        <div className="flex-1 flex flex-col p-12">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse shadow-glow-indigo" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.6em] text-white/30">STEM Pro Workstation</h2>
            </div>
            <button onClick={(e) => { onClose(); e.currentTarget.blur(); }} className="p-4 hover:bg-white/5 rounded-full text-white/40"><X size={20} /></button>
          </div>

          <div className="flex gap-10 h-full">
            <div className={`flex-1 flex flex-col gap-8 transition-all duration-700 ${activeMode === 'graph' ? 'max-w-[500px]' : ''}`}>
              <DisplayLCD expression={calcInput} result={calcResult} isCtrl={isCtrlActive || isPhysicalCtrl} isAlpha={isAlphaActive || isPhysicalAlt} activeMode={activeMode} cursorPosition={cursorPosition} unitMode={unitMode} isSymbolic={isSymbolic} isAllSelected={isAllSelected} />

              {/* KEYPAD ZONAL SYSTEM */}
              <div className="flex flex-col gap-8">
                {/* NAV & META ZONE */}
                <div className="flex justify-between items-center px-4">
                  <div className="flex gap-3">
                    <ScientificButton key="key_shift" id="key_shift" keyData={buttonMap.keys.key_shift} onClick={handleInput} isCtrl={isCtrlActive || isPhysicalCtrl} isAlpha={isAlphaActive || isPhysicalAlt} variant="meta" className="w-24 h-12" />
                    <ScientificButton key="key_alpha" id="key_alpha" keyData={buttonMap.keys.key_alpha} onClick={handleInput} isCtrl={isCtrlActive || isPhysicalCtrl} isAlpha={isAlphaActive || isPhysicalAlt} variant="meta" className="w-24 h-12" />
                    <button
                      onClick={(e) => {
                        const nextUnit = unitMode === 'deg' ? 'rad' : 'deg';
                        setUnitMode(nextUnit);
                        const evaluation = stemEngine.evaluate(calcInput, activeMode, isSymbolic, nextUnit);
                        setCalcResult(evaluation.text);
                        e.currentTarget.blur();
                      }}
                      className="w-24 h-12 rounded-3xl border border-white/5 bg-white/5 text-[10px] font-black transition-all hover:bg-white/10 text-white/40 flex items-center justify-center gap-2"
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${unitMode === 'deg' ? 'bg-[#00d2ff]' : 'bg-[#bd00ff]'}`} />
                      {unitMode.toUpperCase()}
                    </button>
                    <button
                      onClick={(e) => {
                        const nextSym = !isSymbolic;
                        setIsSymbolic(nextSym);
                        const evaluation = stemEngine.evaluate(calcInput, activeMode, nextSym, unitMode);
                        setCalcResult(evaluation.text);
                        e.currentTarget.blur();
                      }}
                      className="w-24 h-12 rounded-3xl border border-white/5 bg-white/5 text-[10px] font-black transition-all hover:bg-white/10 text-white/40 flex items-center justify-center gap-2"
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${isSymbolic ? 'bg-[#10b981]' : 'bg-[#f43f5e]'}`} />
                      {isSymbolic ? "FRACT" : "DEC"}
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <ScientificButton key="key_sd" id="key_sd" keyData={buttonMap.keys.key_sd} onClick={handleInput} isCtrl={isCtrlActive} isAlpha={isAlphaActive} variant="sci" className="w-24 h-12" />
                  </div>
                </div>

                {/* SCIENTIFIC ZONE */}
                <div className="grid grid-cols-6 gap-2">
                  {SCI_KEYS.map(id => buttonMap.keys[id] && (
                    <ScientificButton key={id} id={id} keyData={buttonMap.keys[id]} onClick={handleInput} isCtrl={isCtrlActive} isAlpha={isAlphaActive} variant="sci" />
                  ))}
                </div>

                {/* NUMERIC ZONE */}
                <div className="grid grid-cols-5 gap-3">
                  {NUM_KEYS.map(id => buttonMap.keys[id] && (
                    <ScientificButton key={id} id={id} keyData={buttonMap.keys[id]} onClick={handleInput} isCtrl={isCtrlActive} isAlpha={isAlphaActive} variant="num" className={id === 'key_equal' ? 'bg-indigo-600 border-indigo-400' : (id === 'key_ac' || id === 'key_del' ? 'bg-[#991b1b]/10 border-red-500/20 text-red-500' : '')} />
                  ))}
                </div>
              </div>
            </div>

            {activeMode === 'graph' ? (
              <div className="w-[450px] flex flex-col gap-6 animate-in slide-in-from-right-10 duration-700">
                <GGBPreview expression={calcInput} isVisible={true} />
                <button 
                   onClick={() => onInsert?.({ type: 'ggb', expression: calcInput })} 
                   className="w-full py-8 rounded-[40px] bg-indigo-500 text-white hover:bg-indigo-400 transition-all flex items-center justify-center gap-4 group"
                >
                  <Maximize2 size={24} className="group-hover:scale-110 transition-all" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Inserir no Canvas</p>
                </button>
              </div>
            ) : (
              <MemorySidebar 
                variables={stemEngine.variables} 
                formulas={stemEngine.formulas}
                isOpen={isMemorySidebarOpen}
                onToggle={() => setIsMemorySidebarOpen(false)}
                onEdit={(formula) => {
                  const raw = formula.replace(':=' , '=');
                  setCalcInput(raw);
                  inputRef.current = raw;
                  setCursorPosition(raw.length);
                  cursorRef.current = raw.length;
                }}
              />
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
        </div>
      </div>

      <style>{`
        .shadow-glow-indigo { box-shadow: 0 0 30px rgba(99, 102, 241, 0.4); }
        .shadow-glow-indigo-soft { box-shadow: 0 0 10px rgba(99, 102, 241, 0.2); }
        .drop-shadow-glow-blue { filter: drop-shadow(0 0 5px #3b82f6); }
        .drop-shadow-glow-purple { filter: drop-shadow(0 0 5px #a855f7); }
        .shadow-neumat { box-shadow: 0 4px 10px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.05); }
        .shadow-neumat-inner { box-shadow: inset 0 2px 4px rgba(0,0,0,0.5); }
        .shadow-inner-soft { box-shadow: inset 0 2px 10px rgba(0,0,0,0.3); }
        @keyframes pulse-fast { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .animate-pulse-fast { animation: pulse-fast 0.8s infinite; }
      `}</style>
    </div>,
    document.body
  );
};

export default ScientificOmnibar;
