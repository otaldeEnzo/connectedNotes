import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { MathService, math } from '../../services/MathService';
import { InlineMath } from 'react-katex';
import { 
  Plus, 
  Trash2, 
  Play, 
  Share2, 
  RefreshCw, 
  ChevronRight, 
  HelpCircle, 
  Check, 
  Sparkles, 
  FileText,
  Layers
} from 'lucide-react';

const MatrixWorkspace = ({ canvasPan, canvasScale }) => {
  // list of dynamic matrices
  const [matrices, setMatrices] = useState([
    { id: 'A', name: 'Matriz A', rows: 2, cols: 2, data: [['1', '2'], ['3', '4']] },
    { id: 'B', name: 'Matriz B', rows: 2, cols: 2, data: [['1', '1'], ['1', '1']] }
  ]);

  const [operation, setOperation] = useState('A * B');
  const [result, setResult] = useState(null); // { latex: '', raw: null, isError: false }
  const [steps, setSteps] = useState([]); // Array of { label: '', matrix: [] }
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  const inputRef = useRef(null);

  const insertTextAtCursor = useCallback((textToInsert, isFunction = false) => {
    const input = inputRef.current;
    if (!input) {
      if (isFunction) {
        const defaultMat = matrices[0]?.id || 'A';
        setOperation(prev => prev + `${textToInsert}(${defaultMat})`);
      } else {
        setOperation(prev => prev + textToInsert);
      }
      return;
    }

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const val = input.value;

    let newText = '';
    let newCursorPos = 0;

    if (isFunction) {
      const selection = val.substring(start, end);
      if (selection) {
        newText = `${textToInsert}(${selection})`;
        newCursorPos = start + newText.length;
      } else {
        const defaultMat = matrices[0]?.id || 'A';
        newText = `${textToInsert}(${defaultMat})`;
        newCursorPos = start + textToInsert.length + 1;
      }
    } else {
      newText = textToInsert;
      newCursorPos = start + textToInsert.length;
    }

    const updatedValue = val.substring(0, start) + newText + val.substring(end);
    setOperation(updatedValue);

    setTimeout(() => {
      input.focus();
      if (isFunction && !val.substring(start, end)) {
        const defaultMat = matrices[0]?.id || 'A';
        input.setSelectionRange(start + textToInsert.length + 1, start + textToInsert.length + 1 + defaultMat.length);
      } else {
        input.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [matrices]);

  // Generate a new matrix ID (C, D, E...)
  const getNextMatrixId = () => {
    const ids = matrices.map(m => m.id);
    for (let i = 0; i < 26; i++) {
      const char = String.fromCharCode(65 + i); // A-Z
      if (!ids.includes(char)) return char;
    }
    return 'M' + (matrices.length + 1);
  };

  // Add a new empty matrix
  const handleAddMatrix = () => {
    if (matrices.length >= 10) return; // Limit to 10 matrices for screen space
    const nextId = getNextMatrixId();
    setMatrices(prev => [
      ...prev,
      {
        id: nextId,
        name: `Matriz ${nextId}`,
        rows: 2,
        cols: 2,
        data: [['0', '0'], ['0', '0']]
      }
    ]);
  };

  // Delete a matrix
  const handleDeleteMatrix = (id) => {
    if (matrices.length <= 1) return;
    setMatrices(prev => prev.filter(m => m.id !== id));
  };

  // Update dimension
  const handleUpdateDimension = (matrixId, type, change) => {
    setMatrices(prev => prev.map(m => {
      if (m.id !== matrixId) return m;
      
      const newRows = type === 'rows' ? Math.min(Math.max(m.rows + change, 1), 10) : m.rows;
      const newCols = type === 'cols' ? Math.min(Math.max(m.cols + change, 1), 10) : m.cols;
      
      // Resize data array
      const newData = Array.from({ length: newRows }, (_, r) => {
        return Array.from({ length: newCols }, (_, c) => {
          if (m.data[r] && m.data[r][c] !== undefined) {
            return m.data[r][c];
          }
          return '0';
        });
      });

      return {
        ...m,
        rows: newRows,
        cols: newCols,
        data: newData
      };
    }));
  };

  // Update cell data
  const handleUpdateCell = (matrixId, r, c, val) => {
    setMatrices(prev => prev.map(m => {
      if (m.id !== matrixId) return m;
      const newData = m.data.map((row, ri) => 
        row.map((cell, ci) => (ri === r && ci === c) ? val : cell)
      );
      return { ...m, data: newData };
    }));
  };

  // Quick operations: Zero, Identity, Random
  const handleQuickFill = (matrixId, type) => {
    setMatrices(prev => prev.map(m => {
      if (m.id !== matrixId) return m;
      const newData = m.data.map((row, ri) => 
        row.map((_, ci) => {
          if (type === 'zero') return '0';
          if (type === 'identity') return ri === ci ? '1' : '0';
          if (type === 'random') return String(Math.floor(Math.random() * 21) - 10); // -10 to 10
          return '0';
        })
      );
      return { ...m, data: newData };
    }));
  };

  // Parse and evaluate matrix cell values (fractions, complex numbers, etc.)
  const getEvaluatedMatrix = (m) => {
    return m.data.map(row => 
      row.map(cell => {
        const trimmed = cell.trim();
        if (trimmed === '') return 0;
        try {
          const res = math.evaluate(trimmed);
          if (typeof res === 'number') return res;
          if (res && res.isComplex) return res;
          if (res && res.isFraction) return res.valueOf();
          return res;
        } catch (e) {
          // Fallback to string if symbolic variable
          return trimmed;
        }
      })
    );
  };

  // Trigger evaluation
  const handleEvaluate = () => {
    setSteps([]);
    if (!operation || operation.trim() === '') {
      setResult({ latex: '\\text{Erro: Operação vazia.}', isError: true });
      return;
    }

    try {
      // Build scope
      const scope = {};
      matrices.forEach(m => {
        scope[m.id] = getEvaluatedMatrix(m);
      });

      // Special custom command check: rref(A)
      const rrefMatch = operation.trim().match(/^rref\(([A-Z])\)$/i);
      if (rrefMatch) {
        const matId = rrefMatch[1].toUpperCase();
        const mat = matrices.find(m => m.id === matId);
        if (!mat) throw new Error(`Matriz ${matId} não encontrada`);
        
        const evalMat = getEvaluatedMatrix(mat);
        // Calculate steps
        const rrefSteps = MathService.computeRREFSteps(evalMat);
        setSteps(rrefSteps);

        if (rrefSteps.length > 0) {
          const finalRREF = rrefSteps[rrefSteps.length - 1].matrix;
          setResult({
            latex: MathService.matrixToLaTeX(finalRREF),
            raw: finalRREF,
            isError: false
          });
        } else {
          setResult({ latex: '\\text{Sem etapas para escalonar.}', isError: true });
        }
        return;
      }

      // Standard evaluation via mathjs
      const evalResult = math.evaluate(operation, scope);

      if (evalResult === undefined || evalResult === null) {
        throw new Error("Resultado nulo ou indefinido.");
      }

      // Check if eigenvalue object eigs(A)
      if (evalResult && evalResult.values && evalResult.eigenvectors) {
        // Format eigenvalues and eigenvectors
        let latex = '\\begin{aligned}';
        evalResult.eigenvectors.forEach((e, idx) => {
          const valTex = typeof e.value === 'number' ? Number(e.value.toFixed(4)) : MathService.toLaTeX(e.value);
          const vecTex = MathService.matrixToLaTeX(e.vector);
          latex += `\\lambda_{${idx + 1}} &= ${valTex}, \\quad v_{${idx + 1}} = ${vecTex} \\\\[8pt]`;
        });
        latex += '\\end{aligned}';
        
        setResult({
          latex,
          raw: evalResult,
          isError: false
        });
        return;
      }

      // Format matrix result
      if ((evalResult && evalResult.isMatrix) || Array.isArray(evalResult)) {
        setResult({
          latex: MathService.matrixToLaTeX(evalResult),
          raw: evalResult,
          isError: false
        });
      } else {
        // Scalar value result
        const scalarTex = typeof evalResult === 'number' ? Number(evalResult.toFixed(4)) : MathService.toLaTeX(evalResult);
        setResult({
          latex: String(scalarTex),
          raw: evalResult,
          isError: false
        });

        // 2x2/3x3 Determinant Step Details
        const detMatch = operation.trim().match(/^det\(([A-Z])\)$/i);
        if (detMatch) {
          const matId = detMatch[1].toUpperCase();
          const mat = matrices.find(m => m.id === matId);
          if (mat) {
            const evalMat = getEvaluatedMatrix(mat);
            const detSteps = getDeterminantSteps(matId, evalMat, evalResult);
            setSteps(detSteps);
          }
        }
      }
    } catch (err) {
      setResult({
        latex: `\\text{Erro: } \\text{${MathService.getFriendlyError(err)}}`,
        raw: null,
        isError: true
      });
    }
  };

  // Generate 2x2/3x3 determinant steps
  const getDeterminantSteps = (name, mat, resultVal) => {
    const r = mat.length;
    const c = mat[0].length;
    if (r !== c) return [];

    if (r === 2) {
      const a = mat[0][0];
      const b = mat[0][1];
      const d = mat[1][0];
      const e = mat[1][1];
      const formula = `a_{11}a_{22} - a_{12}a_{21}`;
      const numbers = `(${a} \\cdot ${e}) - (${b} \\cdot ${d})`;
      return [{
        label: `Determinante 2x2 para a ${name}`,
        matrix: mat,
        latex: `\\det(${name}) = ${formula} = ${numbers} = ${Number(resultVal.toFixed(4))}`
      }];
    }

    if (r === 3) {
      const a11 = mat[0][0], a12 = mat[0][1], a13 = mat[0][2];
      const a21 = mat[1][0], a22 = mat[1][1], a23 = mat[1][2];
      const a31 = mat[2][0], a32 = mat[2][1], a33 = mat[2][2];
      
      const term1 = a11 * a22 * a33;
      const term2 = a12 * a23 * a31;
      const term3 = a13 * a21 * a32;
      const term4 = a13 * a22 * a31;
      const term5 = a11 * a23 * a32;
      const term6 = a12 * a21 * a33;

      const formula = `(a_{11}a_{22}a_{33} + a_{12}a_{23}a_{31} + a_{13}a_{21}a_{32}) - (a_{13}a_{22}a_{31} + a_{11}a_{23}a_{32} + a_{12}a_{21}a_{33})`;
      const numbers = `(${term1} + ${term2} + ${term3}) - (${term4} + ${term5} + ${term6})`;
      
      return [{
        label: `Determinante 3x3 para a ${name} (Regra de Sarrus)`,
        matrix: mat,
        latex: `\\det(${name}) = ${formula} \\\\ = ${numbers} = ${Number(resultVal.toFixed(4))}`
      }];
    }

    return [];
  };

  // EXPORT TO NOTE: Spawns connected flowchart blocks
  const handleExportNote = (withSteps = false) => {
    if (!result) return;
    setIsExportDropdownOpen(false);

    // Zoom/pan offset
    const zoom = canvasScale || 1;
    const pan = canvasPan || { x: 0, y: 0 };
    
    // Screen center in canvas coordinates
    const centerX = (-pan.x + (window.innerWidth / 2)) / zoom;
    const centerY = (-pan.y + (window.innerHeight / 2)) / zoom;

    const newMathBlocks = [];
    const newConnections = [];

    const generateUID = () => 'mat_' + Math.random().toString(36).substring(2, 7) + '_' + Date.now();

    if (withSteps && steps.length > 0) {
      // 1. Export with Steps
      let currentY = centerY - (steps.length * 90);
      let prevId = null;

      steps.forEach((step, idx) => {
        const id = generateUID();
        
        let blockContent = `\\mathbf{\\text{Etapa ${idx + 1}: ${step.label}}}`;
        if (step.latex) {
          blockContent += `\\\\[8pt] ${step.latex}`;
        } else if (step.matrix) {
          blockContent += `\\\\[8pt] ${MathService.matrixToLaTeX(step.matrix)}`;
        }

        newMathBlocks.push({
          id,
          x: centerX - 120, // offset half approximate width
          y: currentY,
          content: blockContent,
          fixedSize: false
        });

        if (prevId) {
          newConnections.push({
            id: generateUID(),
            fromId: prevId,
            fromSide: 'bottom',
            toId: id,
            toSide: 'top',
            color: '#6366f1',
            lineStyle: 'solid'
          });
        }

        prevId = id;
        currentY += 200; // spacer
      });

      // Spawn final result block at the bottom
      const resId = generateUID();
      newMathBlocks.push({
        id: resId,
        x: centerX - 120,
        y: currentY,
        content: `\\mathbf{\\text{Operação: } ${operation}}\\\\[8pt] \\mathbf{\\text{Resultado Final:}}\\\\[8pt] ${result.latex}`,
        fixedSize: false,
        color: '#22c55e' // Highlight final output
      });

      if (prevId) {
        newConnections.push({
          id: generateUID(),
          fromId: prevId,
          fromSide: 'bottom',
          toId: resId,
          toSide: 'top',
          color: '#22c55e',
          lineStyle: 'solid'
        });
      }
    } else {
      // 2. Simple Export (Result Only)
      const resId = generateUID();
      
      // Format individual input matrices used in the operation
      let inputMatricesLaTeX = '';
      matrices.forEach(m => {
        if (operation.includes(m.id)) {
          inputMatricesLaTeX += `${m.id} = ${MathService.matrixToLaTeX(getEvaluatedMatrix(m))} \\quad `;
        }
      });

      const content = `${inputMatricesLaTeX}\\\\[10pt] \\mathbf{\\text{Cálculo: } ${operation} =} \\\\[8pt] ${result.latex}`;

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
    <div className="flex-1 h-full flex flex-col gap-6 overflow-hidden bg-[#0d0d0f]/20 backdrop-blur-md p-6 rounded-[50px] border border-white/5 animate-in slide-in-from-right-10 duration-300">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center shrink-0 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <Sparkles size={16} className="text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base font-black text-white leading-tight uppercase tracking-widest">Espaço de Matrizes</h2>
            <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Console Linear Dinâmico</span>
          </div>
        </div>

        <button
          onClick={handleAddMatrix}
          className="h-10 px-4 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-glow-indigo"
        >
          <Plus size={14} />
          Criar Matriz
        </button>
      </div>

      {/* MATRIX CARDS AREA */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden flex gap-6 pb-2 shrink-0 max-h-[360px] custom-scrollbar">
        {matrices.map(m => (
          <div 
            key={m.id} 
            className="w-80 shrink-0 bg-white/[0.02] border border-white/5 hover:border-indigo-500/20 rounded-[35px] p-5 flex flex-col justify-between transition-all duration-300 relative group/card"
          >
            {/* CARD HEADER */}
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs font-black border border-indigo-500/30">
                  {m.id}
                </span>
                <span className="text-[11px] font-black text-white/70 uppercase tracking-widest">{m.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-white/30 tracking-wider uppercase pr-1">Ordem</span>
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5">
                  <button onClick={() => handleUpdateDimension(m.id, 'rows', -1)} className="w-5 h-5 flex items-center justify-center text-white/40 hover:text-white text-xs font-bold">-</button>
                  <span className="text-[10px] font-bold text-white px-1">{m.rows}</span>
                  <button onClick={() => handleUpdateDimension(m.id, 'rows', 1)} className="w-5 h-5 flex items-center justify-center text-white/40 hover:text-white text-xs font-bold">+</button>
                </div>
                <span className="text-[9px] font-bold text-white/20">×</span>
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5">
                  <button onClick={() => handleUpdateDimension(m.id, 'cols', -1)} className="w-5 h-5 flex items-center justify-center text-white/40 hover:text-white text-xs font-bold">-</button>
                  <span className="text-[10px] font-bold text-white px-1">{m.cols}</span>
                  <button onClick={() => handleUpdateDimension(m.id, 'cols', 1)} className="w-5 h-5 flex items-center justify-center text-white/40 hover:text-white text-xs font-bold">+</button>
                </div>
              </div>
            </div>

            {/* MATRIX BRACKETED INPUT GRID */}
            <div className="flex-1 flex items-center justify-center py-4 select-none">
              <div className="flex items-stretch w-full max-w-[260px] h-[120px] px-1 relative">
                {/* Left curve bracket */}
                <div className="w-3 border-l-2 border-t-2 border-b-2 border-white/40 rounded-l-xl mr-2 shrink-0" />
                
                {/* Scrollable / Flexible Cells grid */}
                <div 
                  className="flex-1 grid gap-x-2 gap-y-1 items-center justify-center content-center overflow-auto pr-1"
                  style={{
                    gridTemplateColumns: `repeat(${m.cols}, minmax(36px, 1fr))`,
                    gridTemplateRows: `repeat(${m.rows}, 30px)`
                  }}
                >
                  {m.data.map((row, r) => 
                    row.map((cell, c) => (
                      <input
                        key={`${r}-${c}`}
                        type="text"
                        value={cell}
                        onChange={(e) => handleUpdateCell(m.id, r, c, e.target.value)}
                        className="w-full h-7 bg-transparent border-none outline-none text-center text-xs font-semibold text-white focus:text-indigo-400 placeholder-white/10 transition-colors"
                        placeholder="0"
                      />
                    ))
                  )}
                </div>

                {/* Right curve bracket */}
                <div className="w-3 border-r-2 border-t-2 border-b-2 border-white/40 rounded-r-xl ml-2 shrink-0" />
              </div>
            </div>

            {/* QUICK FILL TOOLBAR */}
            <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/5 shrink-0">
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleQuickFill(m.id, 'zero')}
                  className="h-6 px-2 rounded-md bg-white/5 hover:bg-white/10 text-white/40 hover:text-white text-[8px] font-black uppercase tracking-widest transition-all"
                >
                  Zerar
                </button>
                {m.rows === m.cols && (
                  <button
                    onClick={() => handleQuickFill(m.id, 'identity')}
                    className="h-6 px-2 rounded-md bg-white/5 hover:bg-white/10 text-white/40 hover:text-white text-[8px] font-black uppercase tracking-widest transition-all"
                  >
                    Identid.
                  </button>
                )}
                <button
                  onClick={() => handleQuickFill(m.id, 'random')}
                  className="h-6 px-2 rounded-md bg-white/5 hover:bg-white/10 text-white/40 hover:text-white text-[8px] font-black uppercase tracking-widest transition-all animate-pulse"
                >
                  Aleat.
                </button>
              </div>

              {matrices.length > 1 && (
                <button
                  onClick={() => handleDeleteMatrix(m.id)}
                  className="w-6 h-6 rounded-md hover:bg-red-500/10 text-white/20 hover:text-red-400 flex items-center justify-center transition-all"
                  title="Excluir Matriz"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* OPERATIONS & COMMAND PANEL */}
      <div className="bg-white/[0.02] border border-white/5 rounded-[35px] p-5 shrink-0">
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Executar Operação</span>
            <span className="text-[9px] font-bold text-white/20">Suporta múltiplos operandos (ex: A * B + C)</span>
          </div>

          <div className="flex gap-3 items-center">
            <input
              ref={inputRef}
              type="text"
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
              placeholder="Digite a fórmula da operação (ex: A * B)"
              className="flex-1 h-12 bg-white/5 border border-white/10 rounded-2xl px-4 text-sm text-white font-mono placeholder-white/25 focus:border-indigo-500/50 outline-none transition-all"
            />
            <button
              onClick={handleEvaluate}
              className="w-12 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-all shadow-glow-indigo active:scale-95 shrink-0"
              title="Calcular"
            >
              <Play size={16} fill="white" />
            </button>
          </div>

          {/* QUICK TOOLBAR OPERATORS */}
          <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-white/5">
            {matrices.map(m => (
              <button 
                key={m.id} 
                onClick={() => insertTextAtCursor(m.id)}
                className="h-7 px-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 text-[9px] font-black transition-all"
              >
                {m.id}
              </button>
            ))}
            <div className="w-[1px] h-7 bg-white/10 mx-1 shrink-0" />
            {['+', '-', '*'].map(op => (
              <button 
                key={op} 
                onClick={() => insertTextAtCursor(` ${op} `)}
                className="h-7 w-7 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white/50 text-[10px] font-black transition-all"
              >
                {op}
              </button>
            ))}
            <div className="w-[1px] h-7 bg-white/10 mx-1 shrink-0" />
            {['det', 'inv', 'transpose', 'trace', 'eigs', 'rref'].map(f => (
              <button 
                key={f} 
                onClick={() => insertTextAtCursor(f, true)}
                className="h-7 px-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white/50 text-[9px] font-mono transition-all"
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RESOLUTION & RESULTS PANEL */}
      <div className="flex-1 min-h-0 bg-[#0a0a0c]/60 border border-white/5 rounded-[40px] p-6 flex flex-col gap-4 overflow-hidden relative shadow-inner-soft">
        
        {/* PANEL TITLE */}
        <div className="flex justify-between items-center shrink-0 border-b border-white/5 pb-2">
          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Painel de Resolução</span>
          
          {result && !result.isError && (
            <div className="relative">
              <button
                onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                className="h-8 px-3 rounded-xl bg-white text-black hover:bg-indigo-50 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Share2 size={12} />
                Add à Nota
              </button>

              {/* DUAL EXPORT POPUP */}
              {isExportDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-[#16161a] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 p-2 flex flex-col gap-1.5 animate-in zoom-in-95 duration-200">
                  <button
                    onClick={() => handleExportNote(false)}
                    className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-xl text-white text-[10px] font-bold flex items-center gap-2 transition-colors"
                  >
                    <FileText size={12} className="text-indigo-400" />
                    Apenas Operação e Resultado
                  </button>
                  {steps.length > 0 && (
                    <button
                      onClick={() => handleExportNote(true)}
                      className="w-full text-left px-3 py-2 hover:bg-indigo-500/10 rounded-xl text-indigo-300 text-[10px] font-bold flex items-center gap-2 transition-colors border border-indigo-500/10"
                    >
                      <Sparkles size={12} className="text-indigo-400 animate-pulse" />
                      Passos + Conectores (Fluxo)
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* WORKSPACE SCREEN */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-4">
          
          {/* RESULT BOX */}
          {result ? (
            <div className={`p-5 rounded-2xl border ${result.isError ? 'bg-red-500/5 border-red-500/20 text-red-400' : 'bg-indigo-500/5 border-indigo-500/20 text-white'} flex flex-col gap-2 shrink-0 animate-in fade-in duration-300`}>
              <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Resultado da Expressão</span>
              <div className="text-2xl font-medium overflow-x-auto py-2 custom-scrollbar">
                <InlineMath math={result.latex} />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-10 gap-4 py-8">
              <Layers size={36} strokeWidth={1} />
              <span className="text-[9px] font-black uppercase tracking-[0.5em]">Aguardando Operação</span>
            </div>
          )}

          {/* STEP-BY-STEP FLOW */}
          {steps.length > 0 && (
            <div className="flex flex-col gap-3 pt-2">
              <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest shrink-0">Etapas de Resolução</span>
              <div className="flex flex-col gap-3 pl-1">
                {steps.map((s, idx) => (
                  <div key={idx} className="flex gap-4 items-start animate-in slide-in-from-left-4 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold flex items-center justify-center border border-indigo-500/30">
                        {idx + 1}
                      </div>
                      {idx < steps.length - 1 && <div className="w-0.5 h-12 bg-white/5 my-1" />}
                    </div>
                    
                    <div className="flex-1 bg-white/[0.01] border border-white/5 p-3.5 rounded-2xl flex flex-col gap-2 overflow-x-auto custom-scrollbar">
                      <span className="text-[9px] font-black text-white/50 uppercase tracking-wide">{s.label}</span>
                      <div className="text-base font-semibold py-1">
                        {s.latex ? (
                          <InlineMath math={s.latex} />
                        ) : (
                          <InlineMath math={MathService.matrixToLaTeX(s.matrix)} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatrixWorkspace;
