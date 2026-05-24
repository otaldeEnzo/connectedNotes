import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { MathService, math } from '../../services/MathService';
import { InlineMath } from 'react-katex';
import { 
  Plus, 
  Trash2, 
  Play, 
  Share2, 
  ChevronRight, 
  Sparkles, 
  FileText,
  Layers
} from 'lucide-react';

const MatrixWorkspace = ({ canvasPan, canvasScale }) => {
  // list of dynamic matrices
  const [matrices, setMatrices] = useState([
    { id: 'A', name: 'Matriz A', rows: 2, cols: 2, data: [['1', '2'], ['3', '4']] },
    { id: 'B', name: 'Matriz B', rows: 2, cols: 2, data: [['0', '1'], ['2', '3']] }
  ]);

  // Tab state: 0 = Expressions, 1 = Systems, 2 = Decompositions, 3 = Vector Space
  const [activeTab, setActiveTab] = useState(0);

  // TAB 0: EXPRESSIONS
  const [operation, setOperation] = useState('A * B');
  
  // TAB 1: SYSTEMS Ax = b OR MANUAL EQUATIONS
  const [systemInputMode, setSystemInputMode] = useState('matrix'); // 'matrix' | 'equations'
  const [systemA, setSystemA] = useState('A');
  const [systemB, setSystemB] = useState(['5', '11']);
  const [equationsText, setEquationsText] = useState("x + y = 5\n2x - y = 1");

  // TAB 2: DECOMPOSITIONS
  const [decompositionMatrix, setDecompositionMatrix] = useState('A');
  const [decompositionType, setDecompositionType] = useState('lu');

  // TAB 3: VECTOR SPACE
  const [vectorSpaceMatrix, setVectorSpaceMatrix] = useState('A');

  // HISTORY PANEL
  const [history, setHistory] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Global Output States
  const [result, setResult] = useState(null); // { latex: '', raw: null, isError: false, type: '', params: {} }
  const [steps, setSteps] = useState([]); // Array of { label: '', matrix: [], latex: '' }
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  const inputRef = useRef(null);

  // Sync systems B vector size with selected matrix A rows
  const matrixARows = useMemo(() => {
    const m = matrices.find(x => x.id === systemA);
    return m ? m.rows : 2;
  }, [matrices, systemA]);

  useEffect(() => {
    setSystemB(prev => {
      const diff = matrixARows - prev.length;
      if (diff > 0) {
        return [...prev, ...Array(diff).fill('0')];
      } else if (diff < 0) {
        return prev.slice(0, matrixARows);
      }
      return prev;
    });
  }, [matrixARows]);

  // Insert operators/letters at current cursor position (Tab 0)
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

  const renderLabelWithMath = useCallback((label) => {
    if (!label) return null;
    const parts = label.split('$');
    return parts.map((part, idx) => {
      if (idx % 2 === 1) {
        return <InlineMath key={idx} math={part} />;
      }
      return <span key={idx}>{part}</span>;
    });
  }, []);

  const labelToLaTeX = useCallback((label) => {
    if (!label) return '';
    const parts = label.split('$');
    return parts.map((part, idx) => {
      if (idx % 2 === 1) {
        return ` ${part} `;
      }
      if (part.trim() === '') return '';
      return `\\text{${part}}`;
    }).join('');
  }, []);

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
    if (matrices.length >= 10) return;
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

  // Parse and evaluate matrix cell values
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
          return trimmed;
        }
      })
    );
  };

  // History Helper
  const addToHistory = (item) => {
    setHistory(prev => {
      const filtered = prev.filter(x => x.description !== item.description || x.activeTab !== item.activeTab);
      return [
        {
          id: 'hist_' + Math.random().toString(36).substring(2, 7) + '_' + Date.now(),
          ...item
        },
        ...filtered
      ].slice(0, 30);
    });
  };

  // ----------------------------------------------------
  // CORE CALCULATION HANDLERS
  // ----------------------------------------------------

  // TAB 0: Free Expressions Evaluator
  const handleEvaluate = (e, opToEval = operation) => {
    setSteps([]);
    const currentOp = typeof opToEval === 'string' ? opToEval : operation;
    if (!currentOp || currentOp.trim() === '') {
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
      const rrefMatch = currentOp.trim().match(/^rref\(([A-Z])\)$/i);
      if (rrefMatch) {
        const matId = rrefMatch[1].toUpperCase();
        const mat = matrices.find(m => m.id === matId);
        if (!mat) throw new Error(`Matriz ${matId} não encontrada`);
        
        const evalMat = getEvaluatedMatrix(mat);
        const rrefSteps = MathService.computeRREFSteps(evalMat);
        setSteps(rrefSteps);

        if (rrefSteps.length > 0) {
          const finalRREF = rrefSteps[rrefSteps.length - 1].matrix;
          setResult({
            latex: MathService.matrixToLaTeX(finalRREF),
            raw: finalRREF,
            isError: false,
            type: 'expression',
            params: { operation: currentOp }
          });
        } else {
          setResult({ latex: '\\text{Sem etapas para escalonar.}', isError: true });
        }
        
        addToHistory({
          activeTab: 0,
          tabName: 'Expressões',
          description: currentOp,
          params: { operation: currentOp }
        });
        return;
      }

      // Standard evaluation via mathjs
      const evalResult = math.evaluate(currentOp, scope);
      if (evalResult === undefined || evalResult === null) {
        throw new Error("Resultado nulo ou indefinido.");
      }

      // Check eigenvalues
      if (evalResult && evalResult.values && evalResult.eigenvectors) {
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
          isError: false,
          type: 'expression',
          params: { operation: currentOp }
        });

        addToHistory({
          activeTab: 0,
          tabName: 'Expressões',
          description: currentOp,
          params: { operation: currentOp }
        });
        return;
      }

      // Format matrix result
      if ((evalResult && evalResult.isMatrix) || Array.isArray(evalResult)) {
        setResult({
          latex: MathService.matrixToLaTeX(evalResult),
          raw: evalResult,
          isError: false,
          type: 'expression',
          params: { operation: currentOp }
        });
      } else {
        // Scalar value result
        const scalarTex = typeof evalResult === 'number' ? Number(evalResult.toFixed(4)) : MathService.toLaTeX(evalResult);
        setResult({
          latex: String(scalarTex),
          raw: evalResult,
          isError: false,
          type: 'expression',
          params: { operation: currentOp }
        });

        // Determinant steps
        const detMatch = currentOp.trim().match(/^det\(([A-Z])\)$/i);
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

      addToHistory({
        activeTab: 0,
        tabName: 'Expressões',
        description: currentOp,
        params: { operation: currentOp }
      });
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
      const a = mat[0][0], b = mat[0][1], d = mat[1][0], e = mat[1][1];
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

  // TAB 1: Linear Systems Solver
  const handleSolveSystem = (e, aId = systemA, bVec = systemB, mode = systemInputMode, eqText = equationsText) => {
    setSteps([]);

    if (mode === 'equations') {
      if (!eqText || eqText.trim() === '') {
        setResult({ latex: '\\text{Erro: Nenhuma equação fornecida.}', isError: true });
        return;
      }

      try {
        const lines = eqText.split('\n');
        const parsed = MathService.parseLinearEquations(lines);
        const res = MathService.solveLinearSystem(parsed.A, parsed.b);

        let solutionTex = res.solutionTex;
        parsed.variables.forEach((v, idx) => {
          const regex = new RegExp(`x_{${idx + 1}}`, 'g');
          solutionTex = solutionTex.replace(regex, v);
        });

        setResult({
          latex: solutionTex,
          raw: res,
          isError: res.status === 'none',
          type: 'system_equations',
          params: { systemInputMode: 'equations', equationsText: eqText }
        });
        setSteps(res.steps || []);

        addToHistory({
          activeTab: 1,
          tabName: 'Sistemas Ax=b',
          description: `Equações: ${lines.filter(l => l.trim()).join('; ')}`,
          params: { systemInputMode: 'equations', equationsText: eqText }
        });
      } catch (err) {
        setResult({
          latex: `\\text{Erro: } \\text{${err.message || MathService.getFriendlyError(err)}}`,
          raw: null,
          isError: true
        });
      }
      return;
    }

    const mat = matrices.find(m => m.id === aId);
    if (!mat) {
      setResult({ latex: '\\text{Erro: Matriz A não encontrada.}', isError: true });
      return;
    }

    try {
      const res = MathService.solveLinearSystem(mat.data, bVec);
      setResult({
        latex: res.solutionTex,
        raw: res,
        isError: res.status === 'none',
        type: 'system',
        params: { systemInputMode: 'matrix', systemA: aId, systemB: [...bVec] }
      });
      setSteps(res.steps || []);

      addToHistory({
        activeTab: 1,
        tabName: 'Sistemas Ax=b',
        description: `Matriz ${aId} x = [${bVec.join(', ')}]`,
        params: { systemInputMode: 'matrix', systemA: aId, systemB: [...bVec] }
      });
    } catch (err) {
      setResult({
        latex: `\\text{Erro: } \\text{${MathService.getFriendlyError(err)}}`,
        raw: null,
        isError: true
      });
    }
  };

  // TAB 2: Matrix Decompositions
  const handleDecompose = (e, matId = decompositionMatrix, decType = decompositionType) => {
    setSteps([]);
    const mat = matrices.find(m => m.id === matId);
    if (!mat) {
      setResult({ latex: '\\text{Erro: Matriz não encontrada.}', isError: true });
      return;
    }

    try {
      if (decType === 'lu') {
        const res = MathService.decomposeLU(mat.data);
        const pTex = MathService.matrixToLaTeX(res.P);
        const lTex = MathService.matrixToLaTeX(res.L);
        const uTex = MathService.matrixToLaTeX(res.U);
        
        const latex = `\\begin{aligned} 
          &\\mathbf{P^T L U = A} \\\\[6pt] 
          &P^T = ${pTex} \\\\[4pt] 
          &L = ${lTex} \\\\[4pt] 
          &U = ${uTex} 
        \\end{aligned}`;
        
        setResult({
          latex,
          raw: res,
          isError: false,
          type: 'decomposition_lu',
          params: { decompositionMatrix: matId, decompositionType: decType }
        });
        
        setSteps([
          { label: 'Matriz Permutação P^T (Linhas Trocadas)', matrix: res.P },
          { label: 'Matriz Triangular Inferior L', matrix: res.L },
          { label: 'Matriz Triangular Superior U', matrix: res.U }
        ]);
      } else if (decType === 'qr') {
        const res = MathService.decomposeQR(mat.data);
        const qTex = MathService.matrixToLaTeX(res.Q);
        const rTex = MathService.matrixToLaTeX(res.R);
        
        const latex = `\\begin{aligned} 
          &\\mathbf{Q R = A} \\\\[6pt] 
          &Q = ${qTex} \\\\[4pt] 
          &R = ${rTex} 
        \\end{aligned}`;
        
        setResult({
          latex,
          raw: res,
          isError: false,
          type: 'decomposition_qr',
          params: { decompositionMatrix: matId, decompositionType: decType }
        });
        
        setSteps([
          { label: 'Matriz Ortogonal Q (colunas ortonormais)', matrix: res.Q },
          { label: 'Matriz Triangular Superior R', matrix: res.R }
        ]);
      } else if (decType === 'cholesky') {
        const res = MathService.decomposeCholesky(mat.data);
        const lTex = MathService.matrixToLaTeX(res.L);
        
        const latex = `\\begin{aligned} 
          &\\mathbf{L L^T = A} \\\\[6pt] 
          &L = ${lTex} 
        \\end{aligned}`;
        
        setResult({
          latex,
          raw: res,
          isError: false,
          type: 'decomposition_cholesky',
          params: { decompositionMatrix: matId, decompositionType: decType }
        });
        
        setSteps([
          { label: 'Matriz Triangular Inferior L', matrix: res.L }
        ]);
      }

      addToHistory({
        activeTab: 2,
        tabName: 'Fatorações',
        description: `${decType.toUpperCase()}(Matriz ${matId})`,
        params: { decompositionMatrix: matId, decompositionType: decType }
      });
    } catch (err) {
      setResult({
        latex: `\\text{Erro: } \\text{${err.message || MathService.getFriendlyError(err)}}`,
        raw: null,
        isError: true
      });
    }
  };

  // TAB 3: Vector Space Properties
  const handleAnalyzeSpace = (e, matId = vectorSpaceMatrix) => {
    setSteps([]);
    const mat = matrices.find(m => m.id === matId);
    if (!mat) {
      setResult({ latex: '\\text{Erro: Matriz não encontrada.}', isError: true });
      return;
    }

    try {
      const res = MathService.analyzeVectorSpace(mat.data);
      
      let imgTex = '\\emptyset';
      if (res.colSpaceBasis.length > 0) {
        imgTex = '\\text{span}\\left\\{ ' + res.colSpaceBasis.map(v => MathService.matrixToLaTeX(v)).join(', ') + ' \\right\\}';
      }
      
      let nucTex = '\\left\\{ \\mathbf{0} \\right\\}';
      if (res.nullSpaceBasis.length > 0) {
        nucTex = '\\text{span}\\left\\{ ' + res.nullSpaceBasis.map(v => MathService.matrixToLaTeX(v)).join(', ') + ' \\right\\}';
      }
      
      const latex = `\\begin{aligned} 
        &\\text{Posto (Rank) } k = ${res.rank} \\\\[6pt] 
        &\\text{Nulidade (Nullity) } d = ${res.nullity} \\\\[6pt] 
        &\\text{Base da Imagem Col}(A): \\\\[4pt] &\\quad ${imgTex} \\\\[8pt] 
        &\\text{Base do Núcleo Nul}(A): \\\\[4pt] &\\quad ${nucTex}
      \\end{aligned}`;
      
      setResult({
        latex,
        raw: res,
        isError: false,
        type: 'vector_space',
        params: { vectorSpaceMatrix: matId }
      });
      
      setSteps([
        { label: 'Forma RREF da Matriz A', matrix: res.augmentedRREF },
        { label: 'Dimensão do Espaço Imagem', latex: `\\text{dim}(\\text{Col}(A)) = ${res.rank}` },
        { label: 'Dimensão do Núcleo', latex: `\\text{dim}(\\text{Nul}(A)) = ${res.nullity}` }
      ]);

      addToHistory({
        activeTab: 3,
        tabName: 'Espaço Vetorial',
        description: `Espaço Vetorial(Matriz ${matId})`,
        params: { vectorSpaceMatrix: matId }
      });
    } catch (err) {
      setResult({
        latex: `\\text{Erro: } \\text{${MathService.getFriendlyError(err)}}`,
        raw: null,
        isError: true
      });
    }
  };

  // Replay history loaders
  const handleLoadHistoryItem = (item) => {
    setActiveTab(item.activeTab);
    if (item.activeTab === 0) {
      setOperation(item.params.operation);
      setTimeout(() => handleEvaluate(null, item.params.operation), 0);
    } else if (item.activeTab === 1) {
      if (item.params.systemInputMode === 'equations') {
        setSystemInputMode('equations');
        setEquationsText(item.params.equationsText);
        setTimeout(() => handleSolveSystem(null, null, null, 'equations', item.params.equationsText), 0);
      } else {
        setSystemInputMode('matrix');
        setSystemA(item.params.systemA);
        setSystemB(item.params.systemB);
        setTimeout(() => handleSolveSystem(null, item.params.systemA, item.params.systemB, 'matrix'), 0);
      }
    } else if (item.activeTab === 2) {
      setDecompositionMatrix(item.params.decompositionMatrix);
      setDecompositionType(item.params.decompositionType);
      setTimeout(() => handleDecompose(null, item.params.decompositionMatrix, item.params.decompositionType), 0);
    } else if (item.activeTab === 3) {
      setVectorSpaceMatrix(item.params.vectorSpaceMatrix);
      setTimeout(() => handleAnalyzeSpace(null, item.params.vectorSpaceMatrix), 0);
    }
  };

  const handleUpdateSystemBCell = (idx, val) => {
    setSystemB(prev => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  // ----------------------------------------------------
  // EXPORT TO NOTE: Spawns connected flowchart blocks
  // ----------------------------------------------------
  const handleExportNote = (withSteps = false) => {
    if (!result) return;
    setIsExportDropdownOpen(false);

    const zoom = canvasScale || 1;
    const pan = canvasPan || { x: 0, y: 0 };
    
    const centerX = (-pan.x + (window.innerWidth / 2)) / zoom;
    const centerY = (-pan.y + (window.innerHeight / 2)) / zoom;

    const newMathBlocks = [];
    const newConnections = [];

    const generateUID = () => 'mat_' + Math.random().toString(36).substring(2, 7) + '_' + Date.now();

    if (withSteps && steps.length > 0) {
      // 1. Bloco 1 (top): O sistema e suas soluções (ou Operação e Resultado)
      const systemId = generateUID();
      let systemContent = '';

      if (result.type === 'system') {
        const mat = matrices.find(m => m.id === result.params.systemA);
        const aTex = MathService.matrixToLaTeX(getEvaluatedMatrix(mat));
        const bTex = MathService.matrixToLaTeX(result.params.systemB.map(x => [x]));
        systemContent = `\\mathbf{\\text{Sistema: } Ax = b} \\\\[8pt] 
          A = ${aTex}, \\quad b = ${bTex} \\\\[8pt] 
          \\mathbf{\\text{Solução:}} \\\\[6pt] ${result.latex}`;
      } else if (result.type === 'system_equations') {
        const lines = result.params.equationsText.split('\n').filter(l => l.trim());
        const equationsLaTeX = lines.map(l => l.trim()).join(' \\\\ ');
        systemContent = `\\mathbf{\\text{Sistema de Equações:}} \\\\[8pt] 
          \\begin{cases} ${equationsLaTeX} \\end{cases} \\\\[12pt] 
          \\mathbf{\\text{Solução:}} \\\\[6pt] ${result.latex}`;
      } else if (result.type && result.type.startsWith('decomposition')) {
        const mat = matrices.find(m => m.id === result.params.decompositionMatrix);
        const aTex = MathService.matrixToLaTeX(getEvaluatedMatrix(mat));
        systemContent = `\\mathbf{\\text{Fatoração da Matriz } ${result.params.decompositionMatrix}:} \\\\[8pt] 
          A = ${aTex} \\\\[8pt] 
          ${result.latex}`;
      } else if (result.type === 'vector_space') {
        const mat = matrices.find(m => m.id === result.params.vectorSpaceMatrix);
        const aTex = MathService.matrixToLaTeX(getEvaluatedMatrix(mat));
        systemContent = `\\mathbf{\\text{Espaço Vetorial da Matriz } ${result.params.vectorSpaceMatrix}:} \\\\[8pt] 
          A = ${aTex} \\\\[8pt] 
          ${result.latex}`;
      } else {
        let inputMatricesLaTeX = '';
        matrices.forEach(m => {
          if (operation.includes(m.id)) {
            inputMatricesLaTeX += `${m.id} = ${MathService.matrixToLaTeX(getEvaluatedMatrix(m))} \\quad `;
          }
        });
        systemContent = `${inputMatricesLaTeX}\\\\[10pt] \\mathbf{\\text{Cálculo: } ${operation} =} \\\\[8pt] ${result.latex}`;
      }

      newMathBlocks.push({
        id: systemId,
        x: centerX - 120,
        y: centerY - 180,
        content: systemContent,
        fixedSize: false,
        color: '#22c55e'
      });

      // 2. Bloco 2 (bottom): Todas as etapas de resolução agrupadas em um único bloco
      const stepsId = generateUID();
      let stepsContent = `\\mathbf{\\text{Resolução Passo a Passo:}} \\\\[12pt] `;

      steps.forEach((step, idx) => {
        const stepLaTeX = labelToLaTeX(step.label);
        const matrixLaTeX = step.latex ? step.latex : MathService.matrixToLaTeX(step.matrix);
        stepsContent += `\\mathbf{\\text{Etapa } ${idx + 1}: } ${stepLaTeX} \\\\[6pt] ${matrixLaTeX}`;
        if (idx < steps.length - 1) {
          stepsContent += ` \\\\[8pt] \\rule{150pt}{0.3pt} \\\\[10pt] `;
        }
      });

      newMathBlocks.push({
        id: stepsId,
        x: centerX - 120,
        y: centerY + 140,
        content: stepsContent,
        fixedSize: false,
        color: '#6366f1'
      });

      // 3. Conexão entre Bloco 1 e Bloco 2
      newConnections.push({
        id: generateUID(),
        fromId: systemId,
        fromSide: 'bottom',
        toId: stepsId,
        toSide: 'top',
        color: '#6366f1',
        lineStyle: 'solid'
      });
    } else {
      // 2. Simple Export (Result Only)
      const resId = generateUID();
      let content = '';

      if (result.type === 'system') {
        const mat = matrices.find(m => m.id === result.params.systemA);
        const aTex = MathService.matrixToLaTeX(getEvaluatedMatrix(mat));
        const bTex = MathService.matrixToLaTeX(result.params.systemB.map(x => [x]));
        content = `\\mathbf{\\text{Sistema: } Ax = b} \\\\[8pt] 
          A = ${aTex}, \\quad b = ${bTex} \\\\[8pt] 
          \\mathbf{\\text{Solução:}} \\\\[6pt] ${result.latex}`;
      } else if (result.type === 'system_equations') {
        const lines = result.params.equationsText.split('\n').filter(l => l.trim());
        const equationsLaTeX = lines.map(l => l.trim()).join(' \\\\ ');
        content = `\\mathbf{\\text{Sistema de Equações:}} \\\\[8pt] 
          \\begin{cases} ${equationsLaTeX} \\end{cases} \\\\[12pt] 
          \\mathbf{\\text{Solução:}} \\\\[6pt] ${result.latex}`;
      } else if (result.type && result.type.startsWith('decomposition')) {
        const mat = matrices.find(m => m.id === result.params.decompositionMatrix);
        const aTex = MathService.matrixToLaTeX(getEvaluatedMatrix(mat));
        content = `\\mathbf{\\text{Fatoração da Matriz } ${result.params.decompositionMatrix}:} \\\\[8pt] 
          A = ${aTex} \\\\[8pt] 
          ${result.latex}`;
      } else if (result.type === 'vector_space') {
        const mat = matrices.find(m => m.id === result.params.vectorSpaceMatrix);
        const aTex = MathService.matrixToLaTeX(getEvaluatedMatrix(mat));
        content = `\\mathbf{\\text{Espaço Vetorial da Matriz } ${result.params.vectorSpaceMatrix}:} \\\\[8pt] 
          A = ${aTex} \\\\[8pt] 
          ${result.latex}`;
      } else {
        let inputMatricesLaTeX = '';
        matrices.forEach(m => {
          if (operation.includes(m.id)) {
            inputMatricesLaTeX += `${m.id} = ${MathService.matrixToLaTeX(getEvaluatedMatrix(m))} \\quad `;
          }
        });
        content = `${inputMatricesLaTeX}\\\\[10pt] \\mathbf{\\text{Cálculo: } ${operation} =} \\\\[8pt] ${result.latex}`;
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

  // ----------------------------------------------------
  // TAB COMPONENT RENDER HELPERS
  // ----------------------------------------------------

  const renderTabExpressions = () => {
    return (
      <div className="flex flex-col gap-3 h-full justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center shrink-0">
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Executar Operação</span>
            <span className="text-[9px] font-bold text-white/20">Múltiplos operandos (ex: A * B + C)</span>
          </div>

          <div className="flex gap-3 items-center">
            <input
              ref={inputRef}
              type="text"
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
              placeholder="Digite a fórmula (ex: A * B)"
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
    );
  };

  const renderTabSystems = () => {
    return (
      <div className="flex flex-col gap-3 h-full justify-between">
        <div className="flex flex-col gap-3 flex-1 min-h-0 justify-center">
          <div className="flex justify-between items-center shrink-0">
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Sistemas Lineares</span>
            
            {/* INPUT MODE TOGGLE */}
            <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-0.5 shrink-0">
              <button
                onClick={() => setSystemInputMode('matrix')}
                className={`h-6 px-2.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${systemInputMode === 'matrix' ? 'bg-indigo-500 text-white' : 'bg-transparent text-white/40 hover:text-white'}`}
              >
                Matrizes
              </button>
              <button
                onClick={() => setSystemInputMode('equations')}
                className={`h-6 px-2.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${systemInputMode === 'equations' ? 'bg-indigo-500 text-white' : 'bg-transparent text-white/40 hover:text-white'}`}
              >
                Equações
              </button>
            </div>
          </div>

          {systemInputMode === 'equations' ? (
            <div className="flex flex-col gap-1.5 flex-1 min-h-0 justify-center py-1">
              <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Digitar Equações (Uma por linha)</span>
              <textarea
                value={equationsText}
                onChange={(e) => setEquationsText(e.target.value)}
                placeholder="ex:&#10;x + y = 5&#10;2x - y = 1"
                className="w-full h-[95px] bg-white/5 border border-white/10 rounded-2xl p-3 text-xs text-white font-mono placeholder-white/25 focus:border-indigo-500/50 outline-none resize-none transition-all"
              />
            </div>
          ) : (
            <div className="flex gap-4 items-center flex-1 min-h-0 py-2 justify-center">
              {/* MATRIX A SELECT */}
              <div className="flex flex-col gap-1.5 shrink-0">
                <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Matriz A</span>
                <select
                  value={systemA}
                  onChange={(e) => setSystemA(e.target.value)}
                  className="h-9 w-24 bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-wider rounded-xl px-2.5 outline-none focus:border-indigo-500"
                >
                  {matrices.map(m => (
                    <option key={m.id} value={m.id} className="bg-[#121214] text-white">Matriz {m.id}</option>
                  ))}
                </select>
              </div>

              <span className="text-sm font-black text-white/30 font-mono">×</span>

              {/* VECTOR x DISPLAY */}
              <div className="flex flex-col gap-1.5 items-center shrink-0">
                <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Vetor x</span>
                <div className="h-[90px] w-12 bg-white/[0.01] border border-white/5 rounded-xl flex flex-col justify-center items-center gap-1">
                  {Array.from({ length: matrixARows }, (_, i) => `x${i+1}`).map(xi => (
                    <div key={xi} className="text-[9px] text-white/30 font-black font-mono">{xi}</div>
                  ))}
                </div>
              </div>

              <span className="text-sm font-black text-white/30 font-mono">=</span>

              {/* VECTOR b DYNAMIC GRID */}
              <div className="flex flex-col gap-1.5 items-start min-w-0">
                <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Vetor b</span>
                
                <div className="flex items-stretch w-24 h-[90px] px-1 relative shrink-0">
                  <div className="w-2.5 border-l-2 border-t-2 border-b-2 border-white/40 rounded-l-lg mr-1 shrink-0" />
                  <div className="flex-1 flex flex-col justify-center gap-1 overflow-auto custom-scrollbar">
                    {systemB.map((val, idx) => (
                      <input
                        key={idx}
                        type="text"
                        value={val}
                        onChange={(e) => handleUpdateSystemBCell(idx, e.target.value)}
                        className="w-full h-6 bg-transparent border-none outline-none text-center text-xs font-semibold text-white focus:text-indigo-400 placeholder-white/10"
                        placeholder="0"
                      />
                    ))}
                  </div>
                  <div className="w-2.5 border-r-2 border-t-2 border-b-2 border-white/40 rounded-r-lg ml-1 shrink-0" />
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleSolveSystem}
          className="h-10 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-glow-indigo active:scale-95 shrink-0"
        >
          <Play size={12} fill="white" />
          Resolver Sistema
        </button>
      </div>
    );
  };

  const renderTabDecompositions = () => {
    return (
      <div className="flex flex-col gap-3 h-full justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center shrink-0">
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Fatorações Algébricas</span>
            <span className="text-[9px] font-bold text-white/20">Decomposições Lineares</span>
          </div>

          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Matriz</span>
              <select
                value={decompositionMatrix}
                onChange={(e) => setDecompositionMatrix(e.target.value)}
                className="h-9 w-full bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-wider rounded-xl px-2.5 outline-none focus:border-indigo-500"
              >
                {matrices.map(m => (
                  <option key={m.id} value={m.id} className="bg-[#121214] text-white">Matriz {m.id}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Fatoração</span>
              <select
                value={decompositionType}
                onChange={(e) => setDecompositionType(e.target.value)}
                className="h-9 w-full bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-wider rounded-xl px-2.5 outline-none focus:border-indigo-500"
              >
                <option value="lu" className="bg-[#121214] text-white">LU (P^T * L * U)</option>
                <option value="qr" className="bg-[#121214] text-white">QR (Gram-Schmidt)</option>
                <option value="cholesky" className="bg-[#121214] text-white">Cholesky (L * L^T)</option>
              </select>
            </div>
          </div>
        </div>

        <button
          onClick={handleDecompose}
          className="h-10 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-glow-indigo active:scale-95 shrink-0"
        >
          <Sparkles size={12} />
          Decompor Matriz
        </button>
      </div>
    );
  };

  const renderTabVectorSpace = () => {
    return (
      <div className="flex flex-col gap-3 h-full justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center shrink-0">
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Análise de Subespaço</span>
            <span className="text-[9px] font-bold text-white/20">Posto, Nulidade e Bases exatas</span>
          </div>

          <div className="flex flex-col gap-1.5 py-2">
            <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Matriz</span>
            <select
              value={vectorSpaceMatrix}
              onChange={(e) => setVectorSpaceMatrix(e.target.value)}
              className="h-9 w-full bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-wider rounded-xl px-2.5 outline-none focus:border-indigo-500"
            >
              {matrices.map(m => (
                <option key={m.id} value={m.id} className="bg-[#121214] text-white">Matriz {m.id}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleAnalyzeSpace}
          className="h-10 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-glow-indigo active:scale-95 shrink-0"
        >
          <Layers size={12} />
          Analisar Subespaços
        </button>
      </div>
    );
  };

  const renderHistoryPanel = () => {
    return (
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden shrink-0 flex flex-col">
        <button
          onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          className="h-9 px-4 flex justify-between items-center text-white/40 hover:text-white transition-colors"
        >
          <span className="text-[9px] font-black uppercase tracking-widest">Histórico de Operações</span>
          <span className="text-[9px] font-black">{history.length} itens ({isHistoryOpen ? 'Ocultar' : 'Exibir'})</span>
        </button>

        {isHistoryOpen && (
          <div className="border-t border-white/5 p-3 max-h-36 overflow-y-auto flex flex-col gap-1.5 custom-scrollbar bg-black/10">
            {history.length === 0 ? (
              <span className="text-[8px] font-black text-white/20 uppercase text-center py-4">Nenhum cálculo no histórico</span>
            ) : (
              history.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleLoadHistoryItem(item)}
                  className="w-full text-left p-2 rounded-lg bg-white/[0.01] hover:bg-indigo-500/10 border border-white/5 hover:border-indigo-500/20 text-white text-[9px] font-semibold flex justify-between items-center transition-all group"
                >
                  <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-wide">{item.tabName}</span>
                    <span className="text-[10px] font-mono text-white/70 mt-0.5 truncate max-w-[200px]">{item.description}</span>
                  </div>
                  <ChevronRight size={10} className="text-white/20 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))
            )}
          </div>
        )}
      </div>
    );
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
                <div className="w-3 border-l-2 border-t-2 border-b-2 border-white/40 rounded-l-xl mr-2 shrink-0" />
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

      {/* BOTTOM SECTION: TWO COLUMNS (50-50 COCKPIT) */}
      <div className="flex-1 min-h-0 flex gap-6">
        
        {/* LEFT COLUMN: ACTIVE TAB PANEL & HISTORY */}
        <div className="w-1/2 flex flex-col gap-4 min-h-0">
          
          {/* TAB SELECTION BAR */}
          <div className="flex gap-1 bg-white/[0.02] border border-white/5 p-1 rounded-2xl shrink-0">
            {[
              { id: 0, label: 'Expressões' },
              { id: 1, label: 'Sistemas Ax=b' },
              { id: 2, label: 'Fatorações' },
              { id: 3, label: 'Espaço Vetorial' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id);
                  setResult(null);
                  setSteps([]);
                }}
                className={`flex-grow h-8 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-indigo-500 text-white shadow-glow-indigo' : 'bg-transparent text-white/40 hover:text-white hover:bg-white/5'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* TAB CONTENT PANELS */}
          <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-[35px] p-5 flex flex-col min-h-0 justify-between">
            {activeTab === 0 && renderTabExpressions()}
            {activeTab === 1 && renderTabSystems()}
            {activeTab === 2 && renderTabDecompositions()}
            {activeTab === 3 && renderTabVectorSpace()}
          </div>

          {/* COLLAPSIBLE LOCAL HISTORY PANEL */}
          {renderHistoryPanel()}
        </div>

        {/* RIGHT COLUMN: RESOLUTION & RESULTS PANEL */}
        <div className="w-1/2 flex flex-col min-h-0 bg-[#0a0a0c]/60 border border-white/5 rounded-[40px] p-6 overflow-hidden relative shadow-inner-soft">
          
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
                        Passos e Resultado (Blocos Ligados)
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* WORKSPACE SCREEN */}
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-4 mt-4">
            
            {/* RESULT BOX */}
            {result ? (
              <div className={`p-5 rounded-2xl border ${result.isError ? 'bg-red-500/5 border-red-500/20 text-red-400' : 'bg-indigo-500/5 border-indigo-500/20 text-white'} flex flex-col gap-2 shrink-0 animate-in fade-in duration-300`}>
                <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Resultado da Expressão</span>
                <div className="text-xl font-medium overflow-x-auto py-2 custom-scrollbar">
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
                        <span className="text-[10px] font-bold text-white/50 tracking-wide">
                          {renderLabelWithMath(s.label)}
                        </span>
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
    </div>
  );
};

export default MatrixWorkspace;
