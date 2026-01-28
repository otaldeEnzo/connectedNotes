import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNotes } from '../contexts/NotesContext';
import AIPanel from './AIPanel';

// --- Utilitários --- (Mantidos iguais)
const resolveColor = (color) => {
  if (!color) return '#000000';
  if (color.startsWith('var')) {
    try {
      const temp = document.createElement('div');
      temp.style.color = color;
      temp.style.display = 'none';
      document.body.appendChild(temp);
      const resolved = window.getComputedStyle(temp).color;
      document.body.removeChild(temp);
      return resolved;
    } catch(e) { return '#000000'; }
  }
  return color;
};

const getSvgPathFromStroke = (points) => {
  const len = points.length;
  if (len === 0) return '';
  if (len < 2) return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y + 0.1}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < len - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = (p0.x + p1.x) / 2;
    const midY = (p0.y + p1.y) / 2;
    d += ` Q ${p0.x} ${p0.y} ${midX} ${midY}`;
  }
  d += ` L ${points[len - 1].x} ${points[len - 1].y}`;
  return d;
};

// Funções de Dimensão e Bounding Box
const getBlockDimensions = (block) => {
  const contentLen = block.content ? block.content.length : 0;
  const defaultW = Math.max(100, contentLen * 8); 
  const defaultH = 50;
  return {
    width: block.width || (block.src ? 300 : defaultW),
    height: block.height || (block.src ? 300 : defaultH)
  };
};

const getStrokeBounds = (points) => {
  if (!points || points.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  points.forEach(p => {
    if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y;
  });
  if (minX === Infinity) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY, right: maxX, bottom: maxY };
};

const getGroupBounds = (blocks = [], strokes = []) => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let hasItems = false;
  blocks.forEach(b => {
    if (!b) return;
    hasItems = true;
    const { width, height } = getBlockDimensions(b);
    let bx = b.x; let by = b.y;
    if (!b.src && b.type !== 'code' && !b.width) { by = by - height / 2; }
    if (bx < minX) minX = bx; if (by < minY) minY = by;
    if (bx + width > maxX) maxX = bx + width; if (by + height > maxY) maxY = by + height;
  });
  strokes.forEach(s => {
    if (!s || !s.points) return;
    const b = getStrokeBounds(s.points);
    if (b) { hasItems = true; if (b.x < minX) minX = b.x; if (b.y < minY) minY = b.y; if (b.right > maxX) maxX = b.right; if (b.bottom > maxY) maxY = b.bottom; }
  });
  if (!hasItems) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

const isBlockIntersecting = (block, rect) => {
    let bx = block.x; let by = block.y;
    const { width: bw, height: bh } = getBlockDimensions(block);
    if (!block.src && block.type !== 'code' && !block.width) by = by - bh / 2;
    const rx = Math.min(rect.startX, rect.currentX);
    const ry = Math.min(rect.startY, rect.currentY);
    const rw = Math.abs(rect.currentX - rect.startX) || 1;
    const rh = Math.abs(rect.currentY - rect.startY) || 1;
    return (bx < rx + rw && bx + bw > rx && by < ry + rh && by + bh > ry);
};

const isStrokeInRect = (stroke, rect) => {
    const rx = Math.min(rect.startX, rect.currentX);
    const ry = Math.min(rect.startY, rect.currentY);
    const rw = Math.abs(rect.currentX - rect.startX) || 1;
    const rh = Math.abs(rect.currentY - rect.startY) || 1;
    const b = getStrokeBounds(stroke.points);
    if (!b) return false;
    if (b.right < rx || b.x > rx + rw || b.bottom < ry || b.y > ry + rh) return false;
    return stroke.points.some(p => p.x >= rx && p.x <= rx + rw && p.y >= ry && p.y <= ry + rh);
};

const cropImageFromBlock = (block, rect) => {
    return new Promise((resolve) => {
        if (!block.src) { resolve(null); return; }
        const img = new Image();
        img.crossOrigin = "Anonymous"; 
        img.onload = () => {
            const rx = Math.min(rect.startX, rect.currentX);
            const ry = Math.min(rect.startY, rect.currentY);
            const rw = Math.abs(rect.currentX - rect.startX) || 1;
            const rh = Math.abs(rect.currentY - rect.startY) || 1;
            const bx = block.x; const by = block.y;
            const { width: bw, height: bh } = getBlockDimensions(block);
            const intersectX = Math.max(rx, bx); const intersectY = Math.max(ry, by);
            const intersectW = Math.min(rx + rw, bx + bw) - intersectX;
            const intersectH = Math.min(ry + rh, by + bh) - intersectY;
            if (intersectW <= 0 || intersectH <= 0) { resolve(null); return; }
            const canvas = document.createElement('canvas');
            canvas.width = intersectW; canvas.height = intersectH;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, bx - intersectX, by - intersectY, bw, bh);
            resolve({ src: canvas.toDataURL('image/png') });
        };
        img.onerror = () => resolve(null);
        img.src = block.src;
    });
};

const convertStrokesToImage = (strokes) => {
    if (!strokes || strokes.length === 0) return null;
    const bounds = getGroupBounds([], strokes);
    if (!bounds) return null;
    const canvas = document.createElement('canvas');
    canvas.width = bounds.width + 40; canvas.height = bounds.height + 40;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(-bounds.x + 20, -bounds.y + 20); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    strokes.forEach(s => {
        if(s.points.length < 2) return;
        ctx.beginPath(); ctx.lineWidth = s.width || 3; ctx.strokeStyle = resolveColor(s.color);
        ctx.moveTo(s.points[0].x, s.points[0].y);
        for(let i=1; i<s.points.length-1; i++) { const p0 = s.points[i]; const p1 = s.points[i+1]; const midX = (p0.x + p1.x)/2; const midY = (p0.y + p1.y)/2; ctx.quadraticCurveTo(p0.x, p0.y, midX, midY); }
        ctx.lineTo(s.points[s.points.length-1].x, s.points[s.points.length-1].y); ctx.stroke();
    });
    return canvas.toDataURL('image/png');
};

const pointToSegmentDistance = (x, y, x1, y1, x2, y2) => { const A = x - x1; const B = y - y1; const C = x2 - x1; const D = y2 - y1; const dot = A * C + B * D; const lenSq = C * C + D * D; let param = -1; if (lenSq !== 0) param = dot / lenSq; let xx, yy; if (param < 0) { xx = x1; yy = y1; } else if (param > 1) { xx = x2; yy = y2; } else { xx = x1 + param * C; yy = y1 + param * D; } const dx = x - xx; const dy = y - yy; return Math.sqrt(dx * dx + dy * dy); };
const isStrokeClicked = (stroke, point, threshold = 10) => { for (let i = 0; i < stroke.points.length - 1; i++) { const p1 = stroke.points[i]; const p2 = stroke.points[i+1]; if (pointToSegmentDistance(point.x, point.y, p1.x, p1.y, p2.x, p2.y) < threshold) return true; } if (stroke.points.length === 1) { const p = stroke.points[0]; if (Math.hypot(p.x - point.x, p.y - point.y) < threshold) return true; } return false; };

// --- Overlay de Seleção ---
const SelectionGroupOverlay = ({ bounds, onResize, onMove, onEndInteraction }) => {
  if (!bounds) return null;
  const handleMouseDown = (e) => {
    if (e.button === 2) return; 
    e.stopPropagation(); e.preventDefault();
    const startX = e.clientX; const startY = e.clientY;
    let lastX = startX; let lastY = startY;
    const onMouseMove = (ev) => { const dx = ev.clientX - lastX; const dy = ev.clientY - lastY; onMove(dx, dy); lastX = ev.clientX; lastY = ev.clientY; };
    const onMouseUp = () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); if(onEndInteraction) onEndInteraction(); };
    window.addEventListener('mousemove', onMouseMove); window.addEventListener('mouseup', onMouseUp);
  };
  const handleResizeDown = (e) => {
    e.stopPropagation(); e.preventDefault();
    let lastX = e.clientX;
    const onMouseMove = (ev) => { const dx = ev.clientX - lastX; onResize(dx); lastX = ev.clientX; };
    const onMouseUp = () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); if(onEndInteraction) onEndInteraction(); };
    window.addEventListener('mousemove', onMouseMove); window.addEventListener('mouseup', onMouseUp);
  };
  return (
    <div onMouseDown={handleMouseDown} style={{ position: 'absolute', left: bounds.x - 5, top: bounds.y - 5, width: bounds.width + 10, height: bounds.height + 10, border: '1px dashed #6366f1', backgroundColor: 'rgba(99, 102, 241, 0.05)', cursor: 'move', zIndex: 1000, pointerEvents: 'auto' }}>
      <div onMouseDown={handleResizeDown} style={{ position: 'absolute', bottom: -6, right: -6, width: 12, height: 12, background: 'white', border: '1px solid #6366f1', borderRadius: '50%', cursor: 'nwse-resize', zIndex: 1001 }} title="Redimensionar Grupo" />
    </div>
  );
};

// --- Componentes de Bloco Individuais ---
const TextBlock = ({ block, updateBlock, removeBlock, activeTool, isDarkMode, onInteract, saveHistory }) => {
  const textareaRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  useEffect(() => { if (textareaRef.current && block.content === '') textareaRef.current.focus(); }, []);
  
  const handleMouseDown = (e) => {
    if (e.button === 2) return; 
    if (activeTool === 'eraser') return; 
    if (activeTool === 'cursor') { e.stopPropagation(); e.preventDefault(); onInteract(block.id, e); return; }
    if (activeTool === 'pen' || activeTool === 'highlighter') return; 
    e.stopPropagation();
  };

  const handleDoubleClick = (e) => {
     if(activeTool === 'cursor') { e.stopPropagation(); setIsFocused(true); textareaRef.current.focus(); }
  };

  const isEditable = activeTool === 'text' || isFocused;

  return (
    <div style={{ position: 'absolute', left: block.x, top: block.y, transform: 'translate(0, -50%)', zIndex: 50, pointerEvents: 'auto' }} onMouseDown={handleMouseDown} onDoubleClick={handleDoubleClick}>
      <textarea ref={textareaRef} placeholder="Digite..." value={block.content} 
        onChange={(e) => updateBlock(block.id, { content: e.target.value })} 
        onFocus={() => setIsFocused(true)}
        onBlur={() => { setIsFocused(false); if(saveHistory) saveHistory(); }} 
        onMouseDown={(e) => { if (activeTool === 'text' || isFocused) { e.stopPropagation(); } }}
        style={{ width: block.width ? `${block.width}px` : 'auto', height: block.height ? `${block.height}px` : 'auto', background: isFocused ? (isDarkMode ? '#1e293b' : 'rgba(255, 255, 255, 0.95)') : 'transparent', border: isFocused ? '1px solid var(--accent-color)' : '1px solid transparent', borderRadius: '4px', padding: '8px 12px', outline: 'none', fontFamily: 'Inter, sans-serif', fontSize: '16px', color: 'var(--text-primary)', resize: 'none', overflow: 'hidden', minWidth: '50px', whiteSpace: 'pre-wrap', cursor: isEditable ? 'text' : 'default', userSelect: isEditable ? 'text' : 'none', pointerEvents: 'auto' }} 
        rows={!block.height ? Math.max(1, block.content.split('\n').length) : undefined} 
        cols={!block.width ? Math.max(10, block.content.length) : undefined} 
        readOnly={!isEditable} 
      />
    </div>
  );
};

const ImageBlock = ({ block, activeTool, onInteract }) => {
  const handleMouseDown = (e) => {
    if (e.button === 2) return;
    if (activeTool === 'eraser') return;
    if (activeTool === 'cursor') { e.stopPropagation(); onInteract(block.id, e); return; }
  };
  return (
    <div onMouseDown={handleMouseDown} style={{ position: 'absolute', left: block.x, top: block.y, zIndex: 15, userSelect: 'none', width: block.width || 300, cursor: activeTool === 'eraser' ? 'cell' : 'default' }} className="image-block">
      <img src={block.src} alt="Content" style={{ width: '100%', pointerEvents: 'none', display: 'block' }} />
    </div>
  );
};

const MathBlock = ({ block, updateBlock, activeTool, isDarkMode, onInteract, saveHistory }) => {
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef(null);
  useEffect(() => { if (!isEditing && containerRef.current && window.katex) { try { window.katex.render(block.content || '\\dots', containerRef.current, { throwOnError: false, displayMode: true, output: 'html' }); } catch (e) { containerRef.current.innerText = "Erro LaTeX"; } } }, [block.content, isEditing]);
  const handleDoubleClick = () => { if (activeTool !== 'eraser' && activeTool !== 'cursor') setIsEditing(true); };
  const handleBlur = () => { setIsEditing(false); if(saveHistory) saveHistory(); };
  const handleMouseDown = (e) => {
    if (e.button === 2) return;
    if (activeTool === 'eraser') return; 
    if (activeTool === 'cursor') { e.stopPropagation(); onInteract(block.id, e); return; }
    if (activeTool === 'pen') return;
    e.stopPropagation();
  };
  return (
    <div onMouseDown={handleMouseDown} onDoubleClick={handleDoubleClick} style={{ position: 'absolute', left: block.x, top: block.y, transform: 'translate(0, -50%)', zIndex: 55, pointerEvents: 'auto', cursor: activeTool === 'eraser' ? 'cell' : 'default', userSelect: 'none' }}>
      {isEditing ? <textarea autoFocus value={block.content} onChange={(e) => updateBlock(block.id, { content: e.target.value })} onBlur={handleBlur} style={{ background: isDarkMode ? '#1e293b' : 'white', color: isDarkMode ? '#f1f5f9' : '#333', border: '2px solid var(--accent-color)', borderRadius: '8px', padding: '8px', fontFamily: 'monospace', minWidth: '150px', minHeight: '40px', outline: 'none' }} onMouseDown={e => e.stopPropagation()} /> : <div ref={containerRef} style={{ padding: '4px 8px', fontSize: '1.2rem', color: 'var(--text-primary)', transform: `scale(${block.width ? block.width / 100 : 1})`, transformOrigin: 'top left' }} />}
    </div>
  );
};

const CodeBlock = ({ block, updateBlock, activeTool, isDarkMode, onInteract, saveHistory }) => {
  const [output, setOutput] = useState(null); const [showCode, setShowCode] = useState(true); const graphRef = useRef(null); const executionRanRef = useRef(false);
  const executeCode = useCallback(() => { try { const plotDiv = graphRef.current; if (window.Plotly) window.Plotly.purge(plotDiv); const themeColors = { bg: isDarkMode ? '#1e293b' : '#ffffff', font: isDarkMode ? '#f1f5f9' : '#334155', grid: isDarkMode ? '#334155' : '#e2e8f0' }; const ProxiedPlotly = { ...window.Plotly, newPlot: (div, data, layout, config) => { const mergedLayout = { paper_bgcolor: themeColors.bg, plot_bgcolor: themeColors.bg, font: { color: themeColors.font }, xaxis: { gridcolor: themeColors.grid, zerolinecolor: themeColors.grid }, yaxis: { gridcolor: themeColors.grid, zerolinecolor: themeColors.grid }, ...layout }; return window.Plotly.newPlot(div, data, mergedLayout, { responsive: true, ...config }); } }; const run = new Function('Plotly', 'container', 'print', block.content); let logs = []; const print = (msg) => logs.push(String(msg)); run(ProxiedPlotly, plotDiv, print); if (logs.length > 0) setOutput(logs.join('\n')); else setOutput(null); setShowCode(false); executionRanRef.current = true; } catch (err) { SetOutput(`Erro: ${err.message}`); setShowCode(true); } }, [block.content, isDarkMode]);
  useEffect(() => { if (executionRanRef.current && !showCode) executeCode(); }, [isDarkMode, executeCode, showCode]);
  const handleMouseDown = (e) => {
    if (e.button === 2) return;
    if (activeTool === 'eraser') return; 
    if (activeTool === 'cursor') { if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') { e.stopPropagation(); return; } if (e.target.closest('.js-plotly-plot') && !showCode) return; e.stopPropagation(); onInteract(block.id, e); return; } e.stopPropagation();
  };
  return (
    <div onMouseDown={handleMouseDown} style={{ position: 'absolute', left: block.x, top: block.y, zIndex: 55, background: isDarkMode ? (showCode ? '#1e293b' : 'transparent') : (showCode ? '#f8fafc' : 'transparent'), border: showCode ? '1px solid var(--border-color)' : 'none', borderRadius: '8px', boxShadow: showCode ? '0 4px 6px rgba(0,0,0,0.1)' : 'none', padding: showCode ? '10px' : 0, width: block.width || 350, display: 'flex', flexDirection: 'column' }}>
      {showCode && (<> <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 5 }}><span>JS / Plotly</span><button onClick={executeCode} style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer' }}>▶</button></div> <textarea value={block.content || ''} onChange={(e) => updateBlock(block.id, { content: e.target.value })} onBlur={() => { if(saveHistory) saveHistory(); }} style={{ width: '100%', minHeight: '100px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '12px' }} onMouseDown={(e) => e.stopPropagation()} /> </>)}
      {output && <pre style={{ fontSize: '11px', color: '#ef4444', whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.1)', padding: '4px' }}>{output}</pre>}
      <div ref={graphRef} onDoubleClick={() => setShowCode(true)} style={{ width: '100%', height: !showCode ? (block.height || 400) : 0, minHeight: showCode ? 0 : 300 }} onMouseDown={(e) => e.stopPropagation()} />
    </div>
  );
};

// --- Componente Principal ---
const CanvasArea = ({ activeTool, isDarkMode, pdfToImport, onPdfImported, penColor, penWidth, penType, apiKey }) => {
  const { activeNote, activeNoteId, updateNoteContent, updateNoteBackground } = useNotes();
  const containerRef = useRef(null);
  
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  // Estados
  const [strokes, setStrokes] = useState([]);
  const [textBlocks, setTextBlocks] = useState([]);
  const [imageBlocks, setImageBlocks] = useState([]);
  const [codeBlocks, setCodeBlocks] = useState([]);
  const [mathBlocks, setMathBlocks] = useState([]);
  const [paperPattern, setPaperPattern] = useState('dots'); // Estado local para renderização
  
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [isErasing, setIsErasing] = useState(false);
  const [selectionRect, setSelectionRect] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]); 
  const [selectedStrokeIds, setSelectedStrokeIds] = useState([]);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  const [aiPanel, setAiPanel] = useState({ visible: false, context: null });
  const [isNoteLoaded, setIsNoteLoaded] = useState(false);

  // --- Funções de Atualização Definidas no Escopo Principal ---
  const updateAnyBlock = useCallback((type, id, newData) => {
    if (type === 'text') setTextBlocks(prev => prev.map(b => b.id === id ? { ...b, ...newData } : b));
    if (type === 'code') setCodeBlocks(prev => prev.map(b => b.id === id ? { ...b, ...newData } : b));
    if (type === 'math') setMathBlocks(prev => prev.map(b => b.id === id ? { ...b, ...newData } : b));
    if (type === 'image') setImageBlocks(prev => prev.map(b => b.id === id ? { ...b, ...newData } : b));
  }, []);

  const removeAnyBlock = useCallback((id) => {
    setTextBlocks(prev => prev.filter(b => b.id !== id));
    setImageBlocks(prev => prev.filter(b => b.id !== id));
    setCodeBlocks(prev => prev.filter(b => b.id !== id));
    setMathBlocks(prev => prev.filter(b => b.id !== id));
  }, []);

  const saveToHistory = useCallback(() => {
    const snapshot = { strokes, textBlocks, imageBlocks, codeBlocks, mathBlocks };
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(snapshot);
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [strokes, textBlocks, imageBlocks, codeBlocks, mathBlocks, historyIndex]);

  // Carrega Nota
  useEffect(() => {
    setIsNoteLoaded(false);
    if (activeNote) {
      const content = activeNote.content || {};
      setStrokes(content.strokes || []);
      setTextBlocks(content.textBlocks || []);
      setImageBlocks(content.imageBlocks || []);
      setCodeBlocks(content.codeBlocks || []);
      setMathBlocks(content.mathBlocks || []);
      setPaperPattern(content.background || 'dots'); // Carrega o fundo
      
      setSelectedIds([]); setSelectedStrokeIds([]); setHistory([]); setHistoryIndex(-1);
      setIsNoteLoaded(true);
    }
  }, [activeNoteId]); 

  // Salva Nota
  useEffect(() => {
    if (activeNoteId && isNoteLoaded) {
      const timer = setTimeout(() => {
        updateNoteContent(activeNoteId, { strokes, textBlocks, imageBlocks, codeBlocks, mathBlocks });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [strokes, textBlocks, imageBlocks, codeBlocks, mathBlocks, activeNoteId, isNoteLoaded]);

  // Importa PDF
  useEffect(() => { const processPDF = async () => { if (!pdfToImport) return; if (!window.pdfjsLib) { alert("Erro: PDF.js não carregado."); if(onPdfImported) onPdfImported(); return; } setIsLoadingPdf(true); try { const arrayBuffer = await pdfToImport.arrayBuffer(); const loadingTask = window.pdfjsLib.getDocument(new Uint8Array(arrayBuffer)); const pdf = await loadingTask.promise; const newImages = []; let currentY = 100; for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) { const page = await pdf.getPage(pageNum); const viewport = page.getViewport({ scale: 1.5 }); const canvas = document.createElement('canvas'); const context = canvas.getContext('2d'); canvas.height = viewport.height; canvas.width = viewport.width; await page.render({ canvasContext: context, viewport: viewport }).promise; const imgData = canvas.toDataURL('image/png'); 
  let displayWidth = viewport.width; let displayHeight = viewport.height; if (viewport.width > 1000) { const ratio = 1000 / viewport.width; displayWidth = 1000; displayHeight = viewport.height * ratio; } 
  newImages.push({ id: Date.now() + pageNum + Math.random(), x: 100, y: currentY, src: imgData, width: displayWidth, height: displayHeight }); currentY += displayHeight + 20; } 
  saveToHistory(); setImageBlocks(prev => [...prev, ...newImages]); } catch (error) { console.error(error); alert("Erro ao importar PDF."); } finally { setIsLoadingPdf(false); if(onPdfImported) onPdfImported(); } }; processPDF(); }, [pdfToImport]);

  const handleImageUpload = (file, x, y) => { const reader = new FileReader(); reader.onload = (e) => { const img = new Image(); img.onload = () => { const aspectRatio = img.height / img.width; const width = 300; const height = width * aspectRatio; const newImage = { id: Date.now(), x: x || -position.x / scale + 100, y: y || -position.y / scale + 100, src: e.target.result, width: width, height: height }; saveToHistory(); setImageBlocks(prev => [...prev, newImage]); }; img.src = e.target.result; }; reader.readAsDataURL(file); };
  const handlePaste = useCallback((e) => { const items = e.clipboardData.items; for (let i = 0; i < items.length; i++) { if (items[i].type.indexOf('image') !== -1) { handleImageUpload(items[i].getAsFile()); e.preventDefault(); } } }, [position, scale]);
  const handleDrop = (e) => { e.preventDefault(); const files = e.dataTransfer.files; if (files.length > 0 && files[0].type.startsWith('image/')) { const point = screenToCanvas(e.clientX, e.clientY); handleImageUpload(files[0], point.x, point.y); } };
  useEffect(() => { window.addEventListener('paste', handlePaste); return () => window.removeEventListener('paste', handlePaste); }, [handlePaste]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); if (historyIndex > 0) { const newIndex = historyIndex - 1; const state = history[newIndex]; setStrokes(state.strokes); setTextBlocks(state.textBlocks); setImageBlocks(state.imageBlocks); setCodeBlocks(state.codeBlocks); setMathBlocks(state.mathBlocks); setHistoryIndex(newIndex); } }
      if (((e.ctrlKey || e.metaKey) && e.key === 'y') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')) { e.preventDefault(); if (historyIndex < history.length - 1) { const newIndex = historyIndex + 1; const state = history[newIndex]; setStrokes(state.strokes); setTextBlocks(state.textBlocks); setImageBlocks(state.imageBlocks); setCodeBlocks(state.codeBlocks); setMathBlocks(state.mathBlocks); setHistoryIndex(newIndex); } }
      if (e.key === 'Delete' || e.key === 'Backspace') { if (document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'INPUT') return; if (selectedIds.length > 0 || selectedStrokeIds.length > 0) { saveToHistory(); setTextBlocks(prev => prev.filter(b => !selectedIds.includes(b.id))); setImageBlocks(prev => prev.filter(b => !selectedIds.includes(b.id))); setCodeBlocks(prev => prev.filter(b => !selectedIds.includes(b.id))); setMathBlocks(prev => prev.filter(b => !selectedIds.includes(b.id))); setStrokes(prev => prev.filter(s => !selectedStrokeIds.includes(s.id))); setSelectedIds([]); setSelectedStrokeIds([]); } }
    };
    window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, historyIndex, selectedIds, selectedStrokeIds, saveToHistory]);

  const screenToCanvas = useCallback((cx, cy) => { if (!containerRef.current) return { x: 0, y: 0 }; const rect = containerRef.current.getBoundingClientRect(); return { x: (cx - rect.left - position.x) / scale, y: (cy - rect.top - position.y) / scale }; }, [position, scale]);
  
  const groupBounds = getGroupBounds([...(textBlocks||[]), ...(imageBlocks||[]), ...(codeBlocks||[]), ...(mathBlocks||[])].filter(b => selectedIds.includes(b.id)), (strokes||[]).filter(s => selectedStrokeIds.includes(s.id)));

  const handleGroupMove = (dx, dy) => { const scaledDx = dx / scale; const scaledDy = dy / scale; const moveBlock = b => selectedIds.includes(b.id) ? { ...b, x: b.x + scaledDx, y: b.y + scaledDy } : b; setTextBlocks(prev => prev.map(moveBlock)); setImageBlocks(prev => prev.map(moveBlock)); setCodeBlocks(prev => prev.map(moveBlock)); setMathBlocks(prev => prev.map(moveBlock)); setStrokes(prev => prev.map(s => { if (!selectedStrokeIds.includes(s.id)) return s; return { ...s, points: s.points.map(p => ({ x: p.x + scaledDx, y: p.y + scaledDy })) }; })); };
  const handleGroupResize = (dx, startW) => { 
    const scaledDx = dx / scale; const newWidth = Math.max(10, startW + scaledDx); const scaleFactor = newWidth / startW; 
    if (!isFinite(scaleFactor) || scaleFactor === 0) return; 
    const originX = groupBounds.x; const originY = groupBounds.y; 
    const scaleBlock = b => { if (!selectedIds.includes(b.id)) return b; const { width: baseW, height: baseH } = getBlockDimensions(b); const relativeX = b.x - originX; const relativeY = b.y - originY; return { ...b, x: originX + (relativeX * scaleFactor), y: originY + (relativeY * scaleFactor), width: baseW * scaleFactor, height: baseH * scaleFactor }; }; 
    setTextBlocks(prev => prev.map(scaleBlock)); setImageBlocks(prev => prev.map(scaleBlock)); setCodeBlocks(prev => prev.map(scaleBlock)); setMathBlocks(prev => prev.map(scaleBlock)); 
    setStrokes(prev => prev.map(s => { if (!selectedStrokeIds.includes(s.id)) return s; return { ...s, width: Math.max(1, s.width * scaleFactor), points: s.points.map(p => ({ x: originX + (p.x - originX) * scaleFactor, y: originY + (p.y - originY) * scaleFactor })) }; })); 
  };

  const handleBlockInteract = (id, e) => { e.stopPropagation(); e.preventDefault(); if (activeTool === 'cursor') { if (!selectedIds.includes(id)) { setSelectedIds([id]); setSelectedStrokeIds([]); } setIsDraggingSelection(true); setLastMousePos({ x: e.clientX, y: e.clientY }); } };

  const handleMouseDown = (e) => {
    if (e.target.tagName === 'TEXTAREA') return; 
    if (e.button === 2 || e.button === 1 || (e.button === 0 && e.shiftKey && activeTool === 'cursor')) { setIsPanning(true); setLastMousePos({ x: e.clientX, y: e.clientY }); return; }
    const point = screenToCanvas(e.clientX, e.clientY);
    if (activeTool === 'eraser') { setIsErasing(true); saveToHistory(); setStrokes(prev => prev.filter(s => !isStrokeClicked(s, point, 15 / scale))); return; }
    if (activeTool === 'cursor' || activeTool === 'ai-lasso') { 
        const clickedStrokeId = strokes.find(s => isStrokeClicked(s, point, 10 / scale))?.id;
        if (clickedStrokeId && activeTool === 'cursor') { if (!selectedStrokeIds.includes(clickedStrokeId)) { setSelectedStrokeIds([clickedStrokeId]); setSelectedIds([]); } setIsDraggingSelection(true); setLastMousePos({ x: e.clientX, y: e.clientY }); return; }
        setSelectedIds([]); setSelectedStrokeIds([]); setSelectionRect({ startX: point.x, startY: point.y, currentX: point.x, currentY: point.y }); return; 
    }
    if (activeTool === 'pen' || activeTool === 'highlighter') { setIsDrawing(true); setCurrentStroke({ id: Date.now(), points: [point], color: penColor, width: penWidth / scale, type: penType }); return; }
    if (activeTool === 'text') { saveToHistory(); setTextBlocks(prev => [...prev, { id: Date.now(), x: point.x, y: point.y, content: '' }]); }
    if (activeTool === 'code') { saveToHistory(); setCodeBlocks(prev => [...prev, { id: Date.now(), x: point.x, y: point.y, content: 'const data = [{x:[1,2,3], y:[2,6,3], type:\'scatter\'}];\nPlotly.newPlot(container, data);', width: 300, height: 150 }]); }
    if (activeTool === 'math') { saveToHistory(); setMathBlocks(prev => [...prev, { id: Date.now(), x: point.x, y: point.y, content: 'E = mc^2' }]); }
  };

  const handleMouseMove = (e) => {
    if (isPanning) { const dx = e.clientX - lastMousePos.x; const dy = e.clientY - lastMousePos.y; setPosition(prev => ({ x: Math.min(prev.x + dx, 0), y: Math.min(prev.y + dy, 0) })); setLastMousePos({ x: e.clientX, y: e.clientY }); return; }
    const point = screenToCanvas(e.clientX, e.clientY);
    if (isErasing) { setStrokes(prev => prev.filter(s => !isStrokeClicked(s, point, 15 / scale))); return; }
    if (selectionRect) { setSelectionRect(prev => ({ ...prev, currentX: point.x, currentY: point.y })); return; }
    if (isDraggingSelection) {
        const dx = (e.clientX - lastMousePos.x) / scale; const dy = (e.clientY - lastMousePos.y) / scale;
        const moveBlock = (b) => selectedIds.includes(b.id) ? { ...b, x: b.x + dx, y: b.y + dy } : b;
        setTextBlocks(prev => prev.map(moveBlock)); setImageBlocks(prev => prev.map(moveBlock)); setCodeBlocks(prev => prev.map(moveBlock)); setMathBlocks(prev => prev.map(moveBlock));
        setStrokes(prev => prev.map(s => { if (!selectedStrokeIds.includes(s.id)) return s; return { ...s, points: s.points.map(p => ({ x: p.x + dx, y: p.y + dy })) }; }));
        setLastMousePos({ x: e.clientX, y: e.clientY }); return;
    }
    if (isDrawing && currentStroke) { setCurrentStroke(prev => ({ ...prev, points: [...prev.points, point] })); }
  };

  const handleMouseUp = async () => {
    if (isDraggingSelection || isDrawing) saveToHistory();
    setIsPanning(false); setIsDrawing(false); setIsErasing(false); setIsDraggingSelection(false);
    if (selectionRect) {
      const x = Math.min(selectionRect.startX, selectionRect.currentX); const y = Math.min(selectionRect.startY, selectionRect.currentY); const w = Math.abs(selectionRect.currentX - selectionRect.startX); const h = Math.abs(selectionRect.currentY - selectionRect.startY);
      if (activeTool === 'ai-lasso') {
        const capturedText = [...textBlocks, ...mathBlocks, ...codeBlocks].filter(b => isBlockIntersecting(b, selectionRect)).map(b => b.content).join('\n');
        const imagePromises = [...imageBlocks].filter(b => isBlockIntersecting(b, selectionRect)).map(block => cropImageFromBlock(block, selectionRect));
        const results = await Promise.all(imagePromises);
        const capturedImages = results.filter(img => img !== null).map(src => ({ src: src.src }));
        const intersectingStrokes = strokes.filter(s => isStrokeInRect(s, selectionRect));
        if (intersectingStrokes.length > 0) { const strokesImage = convertStrokesToImage(intersectingStrokes); if (strokesImage) capturedImages.push({ src: strokesImage }); }
        setAiPanel({ visible: true, context: { id: Date.now(), text: capturedText, images: capturedImages, isSelection: true } });
      } else {
        const newSelBlocks = []; [...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks].forEach(b => { if (isBlockIntersecting(b, selectionRect)) newSelBlocks.push(b.id); }); setSelectedIds(newSelBlocks);
        const newSelStrokes = []; strokes.forEach(s => { if (isStrokeInRect(s, selectionRect)) newSelStrokes.push(s.id); }); setSelectedStrokeIds(newSelStrokes);
      }
      setSelectionRect(null);
    } else { if (activeTool === 'ai-lasso' && !isPanning && !isDrawing) setAiPanel({ visible: true, context: null }); }
    if (currentStroke) { setStrokes(prev => [...prev, currentStroke]); setCurrentStroke(null); }
  };

  const handleWheel = (e) => { e.preventDefault(); if (e.ctrlKey) { const zoomSensitivity = 0.001; const newScale = Math.min(Math.max(0.1, scale - e.deltaY * zoomSensitivity), 5); setScale(newScale); } else { let dx = e.deltaX; let dy = e.deltaY; if (e.shiftKey && dy !== 0 && dx === 0) { dx = dy; dy = 0; } setPosition(prev => ({ x: Math.min(prev.x - dx, 0), y: Math.min(prev.y - dy, 0) })); } };
  useEffect(() => { const container = containerRef.current; if (!container) return; container.addEventListener('wheel', handleWheel, { passive: false }); return () => container.removeEventListener('wheel', handleWheel); }, [scale]);
  const getBackgroundStyle = () => { const dotColor = isDarkMode ? '#cbd5e1' : '#94a3b8'; switch (paperPattern) { case 'lines': return { backgroundImage: `linear-gradient(to bottom, ${dotColor} 1px, transparent 1px)`, backgroundSize: '100% 40px', backgroundRepeat: 'repeat', backgroundAttachment: 'local' }; case 'grid': return { backgroundImage: `linear-gradient(${dotColor} 1px, transparent 1px), linear-gradient(90deg, ${dotColor} 1px, transparent 1px)`, backgroundSize: '40px 40px', backgroundRepeat: 'repeat', backgroundAttachment: 'local' }; case 'blank': return {}; case 'dots': default: return { backgroundImage: `radial-gradient(${dotColor} 1.5px, transparent 1.5px)`, backgroundSize: '24px 24px', backgroundRepeat: 'repeat', backgroundAttachment: 'local' }; } };

  if (!activeNote) return <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color: 'var(--text-secondary)'}}>Carregando nota...</div>;

  return (
    <div className="canvas-viewport glass-panel" ref={containerRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onContextMenu={(e) => e.preventDefault()} style={{ width: '100%', height: '100%', overflow: 'hidden', cursor: activeTool === 'cursor' || isPanning ? 'grab' : (activeTool === 'eraser' ? 'cell' : 'crosshair'), position: 'relative', backgroundColor: 'var(--canvas-bg-color)', borderRadius: '16px', userSelect: 'none' }} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
      <div className="infinite-canvas" style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, transformOrigin: '0 0', position: 'absolute', top: 0, left: 0, width: 0, height: 0 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: 50000, height: 50000, pointerEvents: 'none', ...getBackgroundStyle() }} />
        {(paperPattern !== 'blank') && <div style={{ position: 'absolute', top: 0, left: 0, width: 50000, height: 80, backgroundColor: 'var(--canvas-bg-color)', borderBottom: `2px solid ${isDarkMode ? '#334155' : 'rgba(239, 68, 68, 0.3)'}`, pointerEvents: 'none', zIndex: 4 }} />}
        {(paperPattern === 'lines' || paperPattern === 'grid') && <div style={{ position: 'absolute', top: 0, left: 80, width: 2, height: 50000, backgroundColor: 'rgba(239, 68, 68, 0.5)', pointerEvents: 'none', zIndex: 5 }} />}

        {(imageBlocks||[]).map(b => <ImageBlock key={b.id} block={b} activeTool={activeTool} onInteract={handleBlockInteract} removeBlock={removeAnyBlock} />)}
        {(codeBlocks||[]).map(b => <CodeBlock key={b.id} block={b} activeTool={activeTool} isDarkMode={isDarkMode} updateBlock={(id, d) => updateAnyBlock('code', id, d)} removeBlock={removeAnyBlock} onInteract={handleBlockInteract} saveHistory={saveToHistory} />)}
        {(textBlocks||[]).map(b => <TextBlock key={b.id} block={b} activeTool={activeTool} isDarkMode={isDarkMode} updateBlock={(id, d) => updateAnyBlock('text', id, d)} removeBlock={removeAnyBlock} onInteract={handleBlockInteract} saveHistory={saveToHistory} />)}
        {(mathBlocks||[]).map(b => <MathBlock key={b.id} block={b} activeTool={activeTool} isDarkMode={isDarkMode} updateBlock={(id, d) => updateAnyBlock('math', id, d)} removeBlock={removeAnyBlock} onInteract={handleBlockInteract} saveHistory={saveToHistory} />)}
        
        <SelectionGroupOverlay bounds={groupBounds} onMove={handleGroupMove} onResize={handleGroupResize} onEndInteraction={saveToHistory} />
        {selectionRect && <div className="selection-box" style={{ left: Math.min(selectionRect.startX, selectionRect.currentX), top: Math.min(selectionRect.startY, selectionRect.currentY), width: Math.abs(selectionRect.currentX - selectionRect.startX), height: Math.abs(selectionRect.currentY - selectionRect.startY), border: activeTool === 'ai-lasso' ? '2px solid #10b981' : '1px dashed #6366f1', backgroundColor: activeTool === 'ai-lasso' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.05)' }} />}
        
        <svg style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none', zIndex: 58 }}>
          {(strokes||[]).filter(s => s.type === 'highlighter').map(stroke => (
            <path key={stroke.id} d={getSvgPathFromStroke(stroke.points)} stroke={selectedStrokeIds.includes(stroke.id) ? '#6366f1' : stroke.color} strokeWidth={stroke.width} fill="none" strokeLinecap="square" strokeLinejoin="round" opacity="0.5" />
          ))}
          {currentStroke && currentStroke.type === 'highlighter' && <path d={getSvgPathFromStroke(currentStroke.points)} stroke={currentStroke.color} strokeWidth={currentStroke.width} fill="none" strokeLinecap="square" strokeLinejoin="round" opacity="0.5" />}
        </svg>

        <svg style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none', zIndex: 60 }}>
          {(strokes||[]).filter(s => s.type !== 'highlighter').map(stroke => (
            <path key={stroke.id} d={getSvgPathFromStroke(stroke.points)} stroke={selectedStrokeIds.includes(stroke.id) ? '#6366f1' : stroke.color} strokeWidth={stroke.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {currentStroke && currentStroke.type !== 'highlighter' && <path d={getSvgPathFromStroke(currentStroke.points)} stroke={currentStroke.color} strokeWidth={currentStroke.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
      </div>

      {aiPanel.visible && (
        <AIPanel 
            apiKey={apiKey} 
            contextData={aiPanel.context}
            onClose={() => setAiPanel({ ...aiPanel, visible: false })}
            onOpenSettings={() => alert("Vá nas configurações da barra para trocar a chave.")}
        />
      )}
    </div>
  );
};

export default CanvasArea;