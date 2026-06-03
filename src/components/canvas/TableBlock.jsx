import React, { useState, useRef, useEffect } from 'react';
import BlockWrapper from './BlockWrapper';
import { Plus, Minus, Check, Trash2, Keyboard, Loader2, Sparkles, FileSpreadsheet } from 'lucide-react';
import { queryGemini, isAiFeatureEnabled } from '../../services/AIService';

const evaluateFormula = (formulaStr, rowValues) => {
  let expr = formulaStr.trim();
  if (expr.startsWith('=')) expr = expr.slice(1);
  if (!expr) return '';
  
  // Replace A..Z with values
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i); // 'A', 'B'...
    const val = parseFloat(rowValues[i]) || 0;
    // Replace whole word letters to avoid replacing letters inside math functions like sin, cos
    const regex = new RegExp(`\\b${letter}\\b`, 'gi');
    expr = expr.replace(regex, val);
  }
  
  // Replace standard math functions with Math.xxx
  const mathFunctions = ['sin', 'cos', 'tan', 'sqrt', 'pow', 'abs', 'exp', 'log', 'PI', 'E'];
  mathFunctions.forEach(fn => {
    const regex = new RegExp(`\\b${fn}\\b`, 'gi');
    expr = expr.replace(regex, `Math.${fn.toUpperCase()}`);
  });

  try {
    const result = new Function(`return ${expr}`)();
    return typeof result === 'number' && !isNaN(result) ? Number(result.toFixed(4)).toString() : '';
  } catch (e) {
    return 'Erro';
  }
};

const TableBlock = ({
  block,
  apiKey,
  activeTool,
  isDarkMode,
  updateBlock,
  removeBlock,
  onInteract,
  isEditing,
  setEditing,
  isDragging,
  canvasScale,
  canvasPan
}) => {
  const rows = block.rowsCount || 3;
  const cols = block.colsCount || 3;
  const cells = block.cells || {};

  const [activeInkCell, setActiveInkCell] = useState(null); // { r, c }
  const [drawingStrokes, setDrawingStrokes] = useState([]); // Array of strokes for the active cell
  const [currentStroke, setCurrentStroke] = useState(null); // Current active stroke
  const [isRecognizing, setIsRecognizing] = useState(false);

  const isDrawingRef = useRef(false);
  const ocrTimeoutRef = useRef(null);
  const activeCellStrokesRef = useRef([]); // Stable ref for strokes during delayed OCR

  // Keep cell strokes ref in sync
  useEffect(() => {
    activeCellStrokesRef.current = drawingStrokes;
  }, [drawingStrokes]);

  // Clean up OCR timeout on unmount
  useEffect(() => {
    return () => {
      if (ocrTimeoutRef.current) clearTimeout(ocrTimeoutRef.current);
    };
  }, []);

  const handleCellChange = (r, c, val) => {
    const updatedCells = { ...cells, [`${r}-${c}`]: val };
    
    // Re-evaluate column formulas for this row
    const formulas = block.formulas || {};
    if (Object.keys(formulas).length > 0) {
      const rowValues = [];
      for (let colIdx = 0; colIdx < cols; colIdx++) {
        rowValues.push(colIdx === c ? val : (cells[`${r}-${colIdx}`] || '0'));
      }
      
      Object.entries(formulas).forEach(([cIdx, formula]) => {
        const targetCol = parseInt(cIdx);
        if (formula.trim()) {
          const evaluated = evaluateFormula(formula, rowValues);
          updatedCells[`${r}-${targetCol}`] = evaluated;
        }
      });
    }

    updateBlock(block.id, { cells: updatedCells });
  };

  const handleFormulaChange = (colIdx, val) => {
    const updatedFormulas = { ...(block.formulas || {}), [colIdx]: val };
    
    // Auto-evaluate the formulas for all rows
    const updatedCells = { ...cells };
    const currentFormulas = updatedFormulas;
    
    for (let r = 0; r < rows; r++) {
      const rowValues = [];
      for (let c = 0; c < cols; c++) {
        rowValues.push(cells[`${r}-${c}`] || '0');
      }
      
      Object.entries(currentFormulas).forEach(([cIdx, formula]) => {
        const c = parseInt(cIdx);
        if (formula.trim()) {
          const evaluated = evaluateFormula(formula, rowValues);
          updatedCells[`${r}-${c}`] = evaluated;
        }
      });
    }

    updateBlock(block.id, { formulas: updatedFormulas, cells: updatedCells });
  };

  const handleAiAutofill = async (e) => {
    e.stopPropagation();
    if (!isAiFeatureEnabled('mathSolver')) {
      alert("O recurso de IA para preenchimento semântico está desativado nas suas configurações de privacidade.");
      return;
    }
    setIsRecognizing(true);
    try {
      const tableData = [];
      for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
          row.push(cells[`${r}-${c}`] || '');
        }
        tableData.push(row);
      }

      const prompt = `Você é um assistente de preenchimento semântico de tabelas.
Analise a tabela abaixo, identifique o padrão de dados das colunas/linhas, e preencha as células vazias coerentemente de acordo com a sequência ou lógica existente.

TABELA ATUAL:
${JSON.stringify(tableData, null, 2)}

INSTRUÇÕES:
- Retorne a tabela COMPLETA em formato JSON contendo a matriz de strings bidimensional correspondente às células.
- NÃO adicione explicações, comentários ou markdown. Retorne APENAS o JSON puro no formato:
[
  ["valor00", "valor01", ...],
  ["valor10", "valor11", ...],
  ...
]`;

      const response = await queryGemini(apiKey, prompt);
      let cleanJson = response
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const updatedCells = { ...cells };
        parsed.forEach((row, r) => {
          if (r < rows && Array.isArray(row)) {
            row.forEach((val, c) => {
              if (c < cols && val !== undefined) {
                updatedCells[`${r}-${c}`] = val;
              }
            });
          }
        });
        updateBlock(block.id, { cells: updatedCells });
      }
    } catch (err) {
      console.error("Semantic Autofill error:", err);
      alert("Erro ao realizar autopreenchimento por IA: " + err.message);
    } finally {
      setIsRecognizing(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAiFeatureEnabled('handwritingOCR')) {
      alert("O recurso de OCR de imagem foi desativado nas suas configurações de privacidade e IA.");
      return;
    }

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        setIsRecognizing(true);
        try {
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              const base64Image = event.target.result;
              
              const prompt = `Você é um extrator de tabelas especialista.
Analise a imagem da tabela fornecida e extraia toda a estrutura e dados das células.
Converta para uma matriz bidimensional em JSON.

INSTRUÇÕES:
- Identifique a quantidade correta de linhas e colunas.
- Retorne APENAS o JSON puro contendo a matriz de strings bidimensional correspondente às células, sem markdown, sem explicações.
[
  ["valor00", "valor01", ...],
  ["valor10", "valor11", ...],
  ...
]`;
              const response = await queryGemini(apiKey, prompt, [{ src: base64Image }]);
              let cleanJson = response
                .replace(/^```json\s*/i, '')
                .replace(/^```\s*/i, '')
                .replace(/\s*```$/i, '')
                .trim();

              const parsed = JSON.parse(cleanJson);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const newRows = parsed.length;
                const newCols = Math.max(...parsed.map(row => Array.isArray(row) ? row.length : 0));
                
                const updatedCells = {};
                parsed.forEach((row, r) => {
                  if (Array.isArray(row)) {
                    row.forEach((val, c) => {
                      updatedCells[`${r}-${c}`] = val || '';
                    });
                  }
                });
                
                updateBlock(block.id, {
                  rowsCount: newRows,
                  colsCount: newCols,
                  cells: updatedCells
                });
              }
            } catch (err) {
              console.error("Image Table OCR Import error:", err);
              alert("Erro ao extrair dados da tabela na imagem: " + err.message);
            } finally {
              setIsRecognizing(false);
            }
          };
          reader.onerror = () => {
            setIsRecognizing(false);
            alert("Erro ao ler o arquivo de imagem.");
          };
          reader.readAsDataURL(file);
        } catch (err) {
          console.error("Reader setup error:", err);
          setIsRecognizing(false);
        }
      }
    }
  };

  const handleAddRow = (e) => {
    e.stopPropagation();
    updateBlock(block.id, { rowsCount: rows + 1 });
  };

  const handleRemoveRow = (e) => {
    e.stopPropagation();
    if (rows > 1) {
      const updatedCells = { ...cells };
      for (let c = 0; c < cols; c++) {
        delete updatedCells[`${rows - 1}-${c}`];
      }
      updateBlock(block.id, { rowsCount: rows - 1, cells: updatedCells });
    }
  };

  const handleAddCol = (e) => {
    e.stopPropagation();
    updateBlock(block.id, { colsCount: cols + 1 });
  };

  const handleRemoveCol = (e) => {
    e.stopPropagation();
    if (cols > 1) {
      const updatedCells = { ...cells };
      for (let r = 0; r < rows; r++) {
        delete updatedCells[`${r}-${cols - 1}`];
      }
      updateBlock(block.id, { colsCount: cols - 1, cells: updatedCells });
    }
  };

  // Google Handwriting Recognition API
  const performOCR = async (strokes) => {
    if (!strokes || strokes.length === 0) return '';
    const x = [];
    const y = [];
    const t = [];
    let timeOffset = 0;
    strokes.forEach(stroke => {
      x.push(stroke.map(p => Math.round(p.x)));
      y.push(stroke.map(p => Math.round(p.y)));
      t.push(stroke.map((_, i) => timeOffset + i * 10));
      timeOffset += stroke.length * 10 + 100;
    });

    const requestBody = {
      input_type: 0,
      requests: [{
        language: 'pt-BR',
        writing_guide: { width: 300, height: 150 },
        ink: x.map((_, i) => [x[i], y[i], t[i]])
      }]
    };

    try {
      const response = await fetch('https://inputtools.google.com/request?ime=handwriting&app=autodraw&dbg=1&cs=1&oe=UTF-8', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data && data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1]) {
        return data[1][0][1][0] || '';
      }
    } catch (err) {
      console.error('Handwriting Recognition Error:', err);
    }
    return '';
  };

  // Helper to calculate relative coordinates inside the cell
  const getRelativeCoords = (e, container) => {
    const rect = container.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  // Pointer drawing handlers on each cell container
  const handleCellPointerDown = (e, r, c) => {
    const isPen = e.pointerType === 'pen';
    const isPenTool = activeTool === 'pen' || activeTool === 'highlighter';

    // If using a stylus/pen, OR currently in Pen mode, trigger native ink mode automatically
    if (isPen || isPenTool) {
      e.stopPropagation();
      e.preventDefault();
      setEditing(true);

      // Cancel any pending OCR trigger to allow adding new strokes
      if (ocrTimeoutRef.current) {
        clearTimeout(ocrTimeoutRef.current);
        ocrTimeoutRef.current = null;
      }

      // If switching cell, commit current strokes first
      if (activeInkCell && (activeInkCell.r !== r || activeInkCell.c !== c)) {
        commitInkDirectly(activeInkCell.r, activeInkCell.c, activeCellStrokesRef.current);
      }

      setActiveInkCell({ r, c });
      isDrawingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);

      const coords = getRelativeCoords(e, e.currentTarget);
      setCurrentStroke([coords]);
    }
  };

  const handleCellPointerMove = (e, r, c) => {
    if (!isDrawingRef.current || !activeInkCell) return;
    if (activeInkCell.r !== r || activeInkCell.c !== c) return;

    e.stopPropagation();
    const coords = getRelativeCoords(e, e.currentTarget);
    setCurrentStroke(prev => prev ? [...prev, coords] : [coords]);
  };

  const handleCellPointerUp = (e, r, c) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    e.stopPropagation();
    e.currentTarget.releasePointerCapture(e.pointerId);

    let finalStrokes = drawingStrokes;
    if (currentStroke && currentStroke.length > 0) {
      finalStrokes = [...drawingStrokes, currentStroke];
      setDrawingStrokes(finalStrokes);
      setCurrentStroke(null);
    }

    // Auto-commit writing after 1.2 seconds of stillness
    ocrTimeoutRef.current = setTimeout(() => {
      commitInkDirectly(r, c, finalStrokes);
    }, 1200);
  };

  const commitInkDirectly = async (r, c, strokesToCommit) => {
    if (!strokesToCommit || strokesToCommit.length === 0) {
      setActiveInkCell(null);
      return;
    }
    setIsRecognizing(true);
    const result = await performOCR(strokesToCommit);
    if (result) {
      handleCellChange(r, c, (cells[`${r}-${c}`] || '') + result);
    }
    setDrawingStrokes([]);
    setIsRecognizing(false);
    setActiveInkCell(null);
  };

  const handleManualCommit = (e, r, c) => {
    e.stopPropagation();
    if (ocrTimeoutRef.current) clearTimeout(ocrTimeoutRef.current);
    commitInkDirectly(r, c, drawingStrokes);
  };

  const handleClearInk = (e) => {
    e.stopPropagation();
    if (ocrTimeoutRef.current) clearTimeout(ocrTimeoutRef.current);
    setDrawingStrokes([]);
    setCurrentStroke(null);
  };

  const headerActions = (
    <div className="flex items-center gap-1 bg-black/10 dark:bg-white/5 rounded-xl p-1 no-interact">
      <button
        onClick={handleAddRow}
        className="p-1 hover:bg-black/15 dark:hover:bg-white/10 rounded-lg text-[var(--text-primary)] transition"
        title="Adicionar Linha"
      >
        <Plus size={12} />
      </button>
      <button
        onClick={handleRemoveRow}
        className="p-1 hover:bg-black/15 dark:hover:bg-white/10 rounded-lg text-[var(--text-primary)] transition"
        title="Remover Linha"
      >
        <Minus size={12} />
      </button>
      <div className="w-[1px] h-3 bg-[var(--text-secondary)] opacity-20 mx-0.5" />
      <button
        onClick={handleAddCol}
        className="p-1 hover:bg-black/15 dark:hover:bg-white/10 rounded-lg text-[var(--text-primary)] transition"
        title="Adicionar Coluna"
      >
        <Plus size={12} className="rotate-90" />
      </button>
      <button
        onClick={handleRemoveCol}
        className="p-1 hover:bg-black/15 dark:hover:bg-white/10 rounded-lg text-[var(--text-primary)] transition"
        title="Remover Coluna"
      >
        <Minus size={12} className="rotate-90" />
      </button>
      <div className="w-[1px] h-3 bg-[var(--text-secondary)] opacity-20 mx-0.5" />
      <button
        onClick={handleAiAutofill}
        className="p-1 hover:bg-black/15 dark:hover:bg-white/10 rounded-lg text-emerald-400 hover:text-emerald-300 transition"
        title="Auto-preencher por IA"
      >
        <Sparkles size={12} />
      </button>
    </div>
  );

  return (
    <BlockWrapper
      block={block}
      title="Tabela"
      color="emerald"
      isEditing={isEditing}
      isDragging={isDragging}
      isDarkMode={isDarkMode}
      onClose={removeBlock}
      onInteract={onInteract}
      onDoubleClick={() => setEditing(true)}
      canvasScale={canvasScale}
      canvasPan={canvasPan}
      updateBlock={updateBlock}
      headerActions={headerActions}
    >
      <div 
        className="block-interactivity-isolation w-full flex-1 p-4 flex flex-col min-h-[150px] overflow-hidden"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isEditing && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: '10px', marginBottom: '12px' }}>
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="glass-extreme" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: '0.75rem', opacity: 0.6, fontWeight: 700, color: '#34d399' }}>{String.fromCharCode(65 + c)} =</span>
                <input
                  value={block.formulas?.[c] || ''}
                  onChange={(e) => handleFormulaChange(c, e.target.value)}
                  placeholder="fórmula..."
                  style={{ background: 'transparent', border: 'none', outline: 'none', color: 'white', fontSize: '0.75rem', width: '100%' }}
                />
              </div>
            ))}
          </div>
        )}
        {/* CSS GRID TABLE: immune to HTML row/column height distribution bugs */}
        <div
          className="w-full flex-1 border border-black/10 dark:border-white/10 rounded-[1.5rem] select-text overflow-hidden"
          style={{
            display: 'grid',
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            backgroundColor: 'transparent'
          }}
        >
          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((_, c) => {
              const cellId = `${r}-${c}`;
              const isCellDrawing = activeInkCell && activeInkCell.r === r && activeInkCell.c === c;
              
              const isLastRow = r === rows - 1;
              const isLastCol = c === cols - 1;

              // Build smooth path data for SVG
              const getSvgPath = (stroke) => {
                if (!stroke || stroke.length === 0) return '';
                return stroke.reduce((acc, p, idx) => acc + (idx === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`), '');
              };

              return (
                <div
                  key={`${r}-${c}`}
                  className={`relative p-1 flex items-stretch transition-all ${
                    isCellDrawing ? 'bg-emerald-500/5 ring-1 ring-emerald-500/30 rounded-lg' : ''
                  }`}
                  onPointerDown={(e) => handleCellPointerDown(e, r, c)}
                  onPointerMove={(e) => handleCellPointerMove(e, r, c)}
                  onPointerUp={(e) => handleCellPointerUp(e, r, c)}
                  style={{
                    borderBottom: isLastRow ? 'none' : '1.5px solid var(--glass-border)',
                    borderRight: isLastCol ? 'none' : '1.5px solid var(--glass-border)',
                    touchAction: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  <div className="relative flex items-stretch w-full h-full">
                    <textarea
                      value={cells[cellId] || ''}
                      onChange={(e) => handleCellChange(r, c, e.target.value)}
                      placeholder="..."
                      rows={1}
                      className="w-full h-full bg-transparent border-none outline-none text-[var(--text-primary)] resize-none text-[0.85rem] px-2 py-1 focus:bg-black/5 dark:focus:bg-white/5 rounded transition font-medium"
                      style={{ height: '100%', minHeight: '0' }}
                      onFocus={() => setEditing(true)}
                    />

                    {/* Beautiful Native SVG Ink Overlay */}
                    {(isCellDrawing || isRecognizing) && (
                      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-lg">
                        <svg className="absolute inset-0 w-full h-full">
                          {drawingStrokes.map((stroke, i) => (
                            <path
                              key={i}
                              d={getSvgPath(stroke)}
                              stroke="#10b981"
                              strokeWidth={3}
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          ))}
                          {currentStroke && (
                            <path
                              d={getSvgPath(currentStroke)}
                              stroke="#10b981"
                              strokeWidth={3}
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          )}
                        </svg>

                        {/* Floating control / indicator badge */}
                        <div className="absolute right-1 bottom-1 flex gap-1 items-center bg-black/60 dark:bg-white/10 backdrop-blur px-1.5 py-0.5 rounded-full border border-white/10 scale-90 origin-bottom-right transition animate-in fade-in zoom-in-95 duration-200">
                          {isRecognizing ? (
                            <>
                              <Loader2 size={8} className="animate-spin text-emerald-400" />
                              <span className="text-[7px] text-emerald-400 font-bold select-none">OCR</span>
                            </>
                          ) : (
                            <>
                              <span className="text-[7px] text-emerald-400 font-black animate-pulse select-none">INK</span>
                              <button
                                onClick={(e) => handleClearInk(e)}
                                className="p-0.5 text-rose-400 hover:text-rose-300 pointer-events-auto transition"
                                title="Limpar"
                              >
                                <Trash2 size={8} />
                              </button>
                              <button
                                onClick={(e) => handleManualCommit(e, r, c)}
                                className="p-0.5 text-emerald-400 hover:text-emerald-300 pointer-events-auto transition"
                                title="Inserir Agora"
                              >
                                <Check size={8} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </BlockWrapper>
  );
};

export default TableBlock;
