import React, { forwardRef, useState, useEffect, useRef, useCallback, useImperativeHandle, memo } from 'react';
import { Stage, Layer, Line, Path, Rect, Circle } from 'react-konva';
import { queryGemini } from '../../services/AIService';
import { MathService } from '../../services/MathService';
import { useNotes } from '../../contexts/NotesContext';
import { ExportService } from '../../services/ExportService';
import AIPanel from '../AIPanel';

import TextBlock from './TextBlock';
import ImageBlock from './ImageBlock';
import CodeBlock from './CodeBlock';
import MathBlock from './MathBlock';
import GGBBlock from './GGBBlock';
import MermaidBlock from './MermaidBlock';
import MindmapBlock from './MindmapBlock';
import MathRecognitionService from '../../services/MathRecognitionService';
import { transformShapePoints } from '../../services/ShapeRecognitionService';
import SelectionGroupOverlay from './SelectionGroupOverlay';
import SelectionToolbar from './SelectionToolbar';
import ConnectionLayer from './ConnectionLayer';
import BlockHandles from './BlockHandles';
import MiniMap from './MiniMap';
import {
  resolveColor,
  getSvgPathFromStroke,
  getBlockDimensions,
  getStrokeBounds,
  getGroupBounds,
  isBlockIntersecting,
  isStrokeInRect,
  cropImageFromBlock,
  convertStrokesToImage,
  pointToSegmentDistance,
  isStrokeClicked,
  getNeatPathData,
  isPointInBlock,
  isConnectionInRect,
  getAnchorPointById,
  generateId
} from './CanvasUtils';

// --- Optimized Sub-Component ---
const MemoizedStroke = React.memo(({ stroke, isSelected }) => {
  const isHighlighter = stroke.type === 'highlighter';
  const color = isSelected ? '#6366f1' : stroke.color;
  const shapeRef = React.useRef(null);

  const pathData = React.useMemo(() => {
    if (stroke.isNeatShape) {
      return { d: getNeatPathData(stroke.points, stroke.shapeType, stroke.isOpen), isArrow: stroke.shapeType === 'arrow' };
    }

    const options = isHighlighter
      ? { size: stroke.width, thinning: 0, smoothing: 0.5, streamline: 0.5 }
      : { size: stroke.width, thinning: 0.5, smoothing: 0.5, streamline: 0.5 };

    return { d: getSvgPathFromStroke(stroke.points, options), isArrow: false };
  }, [stroke.points, stroke.width, stroke.isNeatShape, stroke.shapeType, stroke.isOpen, isHighlighter]);

  React.useEffect(() => {
    if (shapeRef.current) {
      shapeRef.current.cache();
      shapeRef.current.getLayer()?.batchDraw();
    }
  }, [pathData, color]);

  const commonProps = {
    ref: shapeRef,
    data: pathData.d,
    opacity: isHighlighter ? 0.5 : 1,
    listening: false,
    zIndex: stroke.zIndex || 0
  };

  if (stroke.isNeatShape) {
    return (
      <Path
        {...commonProps}
        stroke={color}
        strokeWidth={stroke.width}
        lineCap="round"
        lineJoin="round"
      />
    );
  }

  return (
    <Path
      {...commonProps}
      fill={color}
    />
  );
}, (prev, next) => {
  return prev.stroke.id === next.stroke.id &&
    prev.isSelected === next.isSelected &&
    prev.stroke.points === next.stroke.points &&
    prev.stroke.color === next.stroke.color &&
    prev.stroke.zIndex === next.stroke.zIndex;
});

// --- Componente Principal ---
const CanvasArea = forwardRef(({
  note: propNote, activeTool, isDarkMode, pdfToImport, onPdfImported,
  penType, apiKey, scale,
  penConfig, highlighterConfig,
  panOffset: position, setAiPanel, onMoveView, isMiniMapEnabled, setActiveTool,
  onOpenSettings, activeForcedShape, setActiveForcedShape, setExportStatus
}, ref) => {
  const { activeNote: globalActiveNote, activeNoteId, updateNoteContent, updateNoteBackground, saveNoteHistory, undo, redo } = useNotes();
  const activeNote = propNote || globalActiveNote;
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const activePointerId = useRef(null);
  const snapTimer = useRef(null);
  const ghostTimer = useRef(null);
  const pendingSnapId = useRef(0);
  const lastPointerPos = useRef({ x: 0, y: 0 });
  const lastSavedJson = useRef('');
  const lastLoadedNoteId = useRef(null);

  // [OPTIMIZATION] Imperative Drawing Refs
  const activeStrokePathRef = useRef(null);
  const activeStrokePointsRef = useRef([]);
  const activeStrokeConfigRef = useRef({ width: 5 });
  const rafRef = useRef(null);
  const hasUpdatesRef = useRef(false);


  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [stageSize, setStageSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  const [patternImage, setPatternImage] = useState(null);
  const paperPattern = activeNote?.content?.background || 'dots';
  const backgroundSize = activeNote?.content?.backgroundSize || 40;

  useEffect(() => {
    const canvas = document.createElement('canvas');
    const size = paperPattern === 'dots' ? (backgroundSize === 40 ? 24 : backgroundSize * 0.6) : backgroundSize;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const dotColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';

    if (paperPattern === 'lines') {
      const strongLineColor = isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
      ctx.strokeStyle = strongLineColor;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(size, 0);
      ctx.stroke();
    } else if (paperPattern === 'grid') {
      const strongLineColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
      ctx.strokeStyle = strongLineColor;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(size, 0);
      ctx.moveTo(0, 0);
      ctx.lineTo(0, size);
      ctx.stroke();
    } else if (paperPattern === 'dots') {
      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, 0.75, 0, Math.PI * 2);
      ctx.fill();
    }

    setPatternImage(canvas);
  }, [paperPattern, backgroundSize, isDarkMode]);
  useEffect(() => {
    const handleResize = () => setStageSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Estados Unificados
  const [strokes, setStrokes] = useState([]);
  const [textBlocks, setTextBlocks] = useState([]);
  const [imageBlocks, setImageBlocks] = useState([]);
  const [codeBlocks, setCodeBlocks] = useState([]);
  const [mathBlocks, setMathBlocks] = useState([]);
  const [ggbBlocks, setGgbBlocks] = useState([]);
  const [mermaidBlocks, setMermaidBlocks] = useState([]);
  const [mindmapBlocks, setMindmapBlocks] = useState([]);
  const [connections, setConnections] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [isErasing, setIsErasing] = useState(false);
  const [selectionRect, setSelectionRect] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedStrokeIds, setSelectedStrokeIds] = useState([]);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [connectingState, setConnectingState] = useState(null);
  const [hoveredBlockId, setHoveredBlockId] = useState(null);
  const [selectedConnectionIds, setSelectedConnectionIds] = useState([]);
  const [ghostShape, setGhostShape] = useState(null);
  const [postSnapManipulation, setPostSnapManipulation] = useState(null);
  const [isNoteLoaded, setIsNoteLoaded] = useState(false);
  const [eraserCursorPos, setEraserCursorPos] = useState(null);

  // [OPTIMIZATION] Unified Render Loop
  const performRender = useCallback(() => {
    if (activeStrokePathRef.current && hasUpdatesRef.current) {
      const width = activeStrokeConfigRef.current.width;
      const svgData = getSvgPathFromStroke(activeStrokePointsRef.current, {
        size: width,
        thinning: 0.6,
        smoothing: 0.5,
        streamline: 0.35,
        simulatePressure: false
      });
      activeStrokePathRef.current.setData(svgData);
      activeStrokePathRef.current.getLayer()?.batchDraw();
      hasUpdatesRef.current = false;
    }
    rafRef.current = requestAnimationFrame(performRender);
  }, []);

  // Sync RAF loop with stroke lifecycle
  useEffect(() => {
    if (currentStroke && !currentStroke.isNeatShape) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(performRender);
    } else {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [currentStroke, performRender]);



  const getBackgroundStyle = () => {
    if (paperPattern === 'blank') return { backgroundColor: 'transparent' };

    // Extreme Liquid Glass Notebook Pattern
    if (paperPattern === 'lines') {
      return {
        backgroundImage: `
          linear-gradient(to right, rgba(239, 68, 68, 0.15) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px)
        `,
        backgroundSize: `100% 100%, 100% ${backgroundSize}px`,
        backgroundPosition: '120px 0, 0 0',
        backgroundRepeat: 'no-repeat, repeat',
        backgroundColor: 'transparent'
      };
    }

    if (!patternImage) return { backgroundColor: 'transparent' };

    try {
      return {
        backgroundImage: `url(${patternImage.toDataURL()})`,
        backgroundRepeat: 'repeat'
      };
    } catch (e) {
      return { backgroundColor: 'transparent' };
    }
  };

  // [HYBRID EXPORT] SVG injection support for background captures
  const prepareExport = useCallback(() => {
    const canvasEl = containerRef.current?.querySelector('.infinite-canvas');
    if (!canvasEl) return null;

    // 1. Compute content bounds
    const allBlocks = [...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    allBlocks.forEach(b => {
      const dims = getBlockDimensions(b);
      const bx = b.x || 0, by = b.y || 0;
      if (bx < minX) minX = bx;
      if (by < minY) minY = by;
      if (bx + dims.width > maxX) maxX = bx + dims.width;
      if (by + dims.height > maxY) maxY = b.y + dims.height;
    });

    strokes.forEach(s => {
      const sb = getStrokeBounds(s.points);
      if (!sb) return;
      if (sb.x - s.width < minX) minX = sb.x - s.width;
      if (sb.y - s.width < minY) minY = sb.y - s.width;
      if (sb.right + s.width > maxX) maxX = sb.right + s.width;
      if (sb.bottom + s.width > maxY) maxY = sb.bottom + s.width;
    });

    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 800; maxY = 600; }
    const pad = 40;
    const bounds = {
      minX: minX - pad,
      minY: minY - pad,
      width: (maxX - minX) + pad * 2,
      height: (maxY - minY) + pad * 2
    };

    // 2. Create SVG with absolute coordinate mapping
    const ns = 'http://www.w3.org/2000/svg';
    const tmpSvg = document.createElementNS(ns, 'svg');
    tmpSvg.setAttribute('class', 'export-snapshot-svg');
    // EXTREMELY IMPORTANT: Size the SVG precisely and use viewBox for absolute -> relative mapping
    tmpSvg.setAttribute('width', bounds.width);
    tmpSvg.setAttribute('height', bounds.height);
    tmpSvg.setAttribute('viewBox', `${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`);
    tmpSvg.style.cssText = `position:absolute;top:${bounds.minY}px;left:${bounds.minX}px;pointer-events:none;overflow:visible;z-index:85;`;

    // Render connections
    connections.forEach(conn => {
      const fromBlock = allBlocks.find(b => b.id === conn.fromId);
      const toBlock = allBlocks.find(b => b.id === conn.toId);
      if (!fromBlock || !toBlock) return;

      const start = getAnchorPointById(conn.fromId, conn.fromSide, allBlocks);
      const end = getAnchorPointById(conn.toId, conn.toSide, allBlocks);
      if (!start || !end) return;

      const resolvedColorHex = resolveColor(conn.color || '#888');
      const dist = Math.hypot(end.x - start.x, end.y - start.y);
      const controlDist = Math.max(dist * 0.5, 50);
      let cp1 = { x: start.x, y: start.y }, cp2 = { x: end.x, y: end.y };
      if (conn.fromSide === 'top') cp1.y -= controlDist;
      if (conn.fromSide === 'bottom') cp1.y += controlDist;
      if (conn.fromSide === 'left') cp1.x -= controlDist;
      if (conn.fromSide === 'right') cp1.x += controlDist;
      if (conn.toSide === 'top') cp2.y -= controlDist;
      if (conn.toSide === 'bottom') cp2.y += controlDist;
      if (conn.toSide === 'left') cp2.x -= controlDist;
      if (conn.toSide === 'right') cp2.x += controlDist;

      const pathD = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;
      const connPath = document.createElementNS(ns, 'path');
      connPath.setAttribute('d', pathD);
      connPath.setAttribute('stroke', resolvedColorHex);
      connPath.setAttribute('stroke-width', '2');
      connPath.setAttribute('fill', 'transparent');
      if (conn.lineStyle === 'dashed') connPath.setAttribute('stroke-dasharray', '8 6');
      if (conn.lineStyle === 'dotted') connPath.setAttribute('stroke-dasharray', '3 4');
      tmpSvg.appendChild(connPath);

      const angle = Math.atan2(end.y - cp2.y, end.x - cp2.x);
      const arrowSize = 8;
      const ax1 = end.x - arrowSize * Math.cos(angle - Math.PI / 6), ay1 = end.y - arrowSize * Math.sin(angle - Math.PI / 6);
      const ax2 = end.x - arrowSize * Math.cos(angle + Math.PI / 6), ay2 = end.y - arrowSize * Math.sin(angle + Math.PI / 6);
      const arrowPath = document.createElementNS(ns, 'path');
      arrowPath.setAttribute('d', `M ${ax1} ${ay1} L ${end.x} ${end.y} L ${ax2} ${ay2} Z`);
      arrowPath.setAttribute('fill', resolvedColorHex);
      tmpSvg.appendChild(arrowPath);
    });

    // Render strokes
    strokes.forEach(s => {
      const isHighlighter = s.type === 'highlighter';
      const resolvedColorHex = resolveColor(s.color);
      const path = document.createElementNS(ns, 'path');
      if (s.isNeatShape || s.shapeType) {
        let d;
        if (s.shapeType === 'arrow' && s.points.length >= 4) {
          const pts = s.points, len = pts.length, shaftPts = pts.slice(0, len - 3);
          const [h1, p2, h2] = pts.slice(len - 3);
          const shaftD = shaftPts.reduce((acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`), '');
          const headD = `M ${h1.x} ${h1.y} L ${p2.x} ${p2.y} L ${h2.x} ${h2.y}`;
          d = shaftD + ' ' + headD;
        } else {
          d = s.points.reduce((acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`), '') + (s.isOpen ? '' : ' Z');
        }
        path.setAttribute('d', d);
        path.setAttribute('stroke', resolvedColorHex);
        path.setAttribute('stroke-width', String(s.width));
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
      } else {
        const options = isHighlighter ? { size: s.width, thinning: 0, smoothing: 0.5, streamline: 0.5 } : { size: s.width, thinning: 0.5, smoothing: 0.5, streamline: 0.5 };
        const d = getSvgPathFromStroke(s.points, options);
        path.setAttribute('d', d);
        path.setAttribute('fill', resolvedColorHex);
      }
      if (isHighlighter) path.setAttribute('opacity', '0.5');
      tmpSvg.appendChild(path);
    });

    canvasEl.appendChild(tmpSvg);
    return { bounds, svg: tmpSvg };
  }, [strokes, connections, textBlocks, imageBlocks, codeBlocks, mathBlocks, ggbBlocks, mermaidBlocks, mindmapBlocks]);

  const finalizeExport = useCallback(() => {
    const canvasEl = containerRef.current?.querySelector('.infinite-canvas');
    const tmpSvg = canvasEl?.querySelector('.export-snapshot-svg');
    if (tmpSvg) canvasEl.removeChild(tmpSvg);
  }, []);

  // [HYBRID EXPORT] Snapshot SVG injection
  useEffect(() => {
    const handleExport = async (e) => {
      if (e.detail.noteId !== activeNoteId) return;
      const canvasEl = containerRef.current?.querySelector('.infinite-canvas');
      if (!canvasEl) return;

      const prepared = prepareExport();
      if (!prepared) return;

      const allBlocks = [...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks].map(b => ({
        id: b.id, x: b.x, y: b.y, width: b.width || 250, height: b.height || 200
      }));

      // Include stroke envelopes for smart paging support
      strokes.forEach(s => {
        const sb = getStrokeBounds(s.points);
        if (sb) {
          allBlocks.push({ id: s.id, x: sb.x - s.width, y: sb.y - s.width, width: sb.width + s.width * 2, height: sb.height + s.width * 2 });
        }
      });

      try {
        setExportStatus({ isExporting: true, progress: 0, message: 'Iniciando exportação...' });
        await ExportService.exportCurrentView(
          canvasEl,
          e.detail.format || 'png',
          activeNote?.title || 'Sem Título',
          prepared.bounds,
          null,
          allBlocks,
          (status) => setExportStatus({ isExporting: true, ...status })
        );
      } catch (err) {
        console.error('[CanvasArea] Export failed:', err);
      } finally {
        finalizeExport();
        setTimeout(() => setExportStatus({ isExporting: false, progress: 0, message: '' }), 800);
      }
    };

    window.addEventListener('triggerExport', handleExport);
    return () => window.removeEventListener('triggerExport', handleExport);
  }, [activeNoteId, activeNote, strokes, textBlocks, imageBlocks, codeBlocks, mathBlocks, ggbBlocks, mermaidBlocks, mindmapBlocks, prepareExport, finalizeExport]);

  const saveToHistory = useCallback(() => saveNoteHistory(activeNoteId), [saveNoteHistory, activeNoteId]);

  useEffect(() => {
    setSelectedIds([]);
    setSelectedStrokeIds([]);
    setSelectionRect(null);
    setIsDraggingSelection(false);
    setEditingBlockId(null);
  }, [activeTool]);

  const currentAttributes = () => {
    if (activeTool === 'highlighter') return { color: highlighterConfig.color, width: highlighterConfig.width, type: 'highlighter' };
    return { color: penConfig.color, width: penConfig.width, type: 'pen' };
  };

  const imperativeHandle = {
    addBlock: (type, content, sourceBlockId) => {
      let blockX = (-position.x + (window.innerWidth / 2)) / scale;
      let blockY = (-position.y + (window.innerHeight / 2)) / scale;
      let sourceBlockFound = null;
      if (sourceBlockId) {
        const all = [...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks];
        sourceBlockFound = all.find(b => b.id === sourceBlockId);
        if (sourceBlockFound) {
          blockX = sourceBlockFound.x + (sourceBlockFound.width || 150) + 100;
          blockY = sourceBlockFound.y;
        }
      }
      const newId = generateId();
      if (type === 'PLOT') {
        if (content === "undefined") return;
        setGgbBlocks(prev => [...prev, { id: newId, x: blockX, y: blockY, expression: content, width: 500, height: 400 }]);
      } else if (type === 'LATEX') {
        const safeContent = (content && content !== "undefined") ? content : "\\text{Erro: Conteúdo inválido.}";
        setMathBlocks(prev => [...prev, { id: newId, x: blockX, y: blockY, content: safeContent, fixedSize: false }]);
      }
      if (sourceBlockFound) {
        setConnections(prev => [...prev, { id: generateId(), fromId: sourceBlockFound.id, fromSide: 'right', toId: newId, toSide: 'left', color: type === 'PLOT' ? '#f59e0b' : '#6366f1' }]);
      }
      saveToHistory();
    },
    getContentCenter: () => {
      const blocks = [...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks];
      if (blocks.length === 0 && strokes.length === 0) return { x: 0, y: 0 };
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      blocks.forEach(b => {
        const w = b.width || 200; const h = b.height || 100;
        minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); maxX = Math.max(maxX, b.x + w); maxY = Math.max(maxY, b.y + h);
      });
      strokes.forEach(s => s.points.forEach(p => { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }));
      return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
    },
    getContentBounds: () => {
      const blocks = [...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks];
      if (blocks.length === 0 && strokes.length === 0) return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      blocks.forEach(b => {
        const w = b.width || 200; const h = b.height || 100;
        minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); maxX = Math.max(maxX, b.x + w); maxY = Math.max(maxY, b.y + h);
      });
      strokes.forEach(s => s.points.forEach(p => { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }));
      const padding = 100;
      return { minX: minX - padding, minY: minY - padding, maxX: maxX + padding, maxY: maxY + padding, width: (maxX - minX) + padding * 2, height: (maxY - minY) + padding * 2 };
    },
    getExportData: () => {
      const bounds = imperativeHandle.getContentBounds();

      const allBlocks = [
        ...textBlocks,
        ...imageBlocks,
        ...codeBlocks,
        ...mathBlocks,
        ...ggbBlocks,
        ...mermaidBlocks,
        ...mindmapBlocks
      ].map(b => ({
        id: b.id,
        x: b.x,
        y: b.y,
        width: b.width || 250,
        height: b.height || 200
      }));

      // Include stroke envelopes for smart paging support
      strokes.forEach(s => {
        const sb = getStrokeBounds(s.points);
        if (sb) {
          allBlocks.push({
            id: s.id,
            x: sb.x - s.width,
            y: sb.y - s.width,
            width: sb.width + s.width * 2,
            height: sb.height + s.width * 2
          });
        }
      });

      return {
        element: containerRef.current,
        bounds,
        allBlocks
      };
    },
    getViewportElement: () => containerRef.current,
    getInfiniteCanvasElement: () => containerRef.current?.querySelector('.infinite-canvas'),
    getBackgroundStyle: () => getBackgroundStyle(),
    prepareExport,
    finalizeExport
  };

  useImperativeHandle(ref, () => imperativeHandle, [position, scale, textBlocks, imageBlocks, codeBlocks, mathBlocks, ggbBlocks, connections, strokes, saveToHistory]);

  const updateAnyBlock = useCallback((type, id, newData) => {
    if (type === 'text') setTextBlocks(prev => prev.map(b => b.id === id ? { ...b, ...newData } : b));
    if (type === 'code') setCodeBlocks(prev => prev.map(b => b.id === id ? { ...b, ...newData } : b));
    if (type === 'math') setMathBlocks(prev => prev.map(b => b.id === id ? { ...b, ...newData } : b));
    if (type === 'image') setImageBlocks(prev => prev.map(b => b.id === id ? { ...b, ...newData } : b));
    if (type === 'ggb') setGgbBlocks(prev => prev.map(b => b.id === id ? { ...b, ...newData } : b));
    if (type === 'mermaid') setMermaidBlocks(prev => prev.map(b => b.id === id ? { ...b, ...newData } : b));
    if (type === 'mindmap') setMindmapBlocks(prev => prev.map(b => b.id === id ? { ...b, ...newData } : b));
  }, []);

  const removeAnyBlock = useCallback((id) => {
    setTextBlocks(prev => prev.filter(b => b.id !== id));
    setImageBlocks(prev => prev.filter(b => b.id !== id));
    setCodeBlocks(prev => prev.filter(b => b.id !== id));
    setMathBlocks(prev => prev.filter(b => b.id !== id));
    setGgbBlocks(prev => prev.filter(b => b.id !== id));
    setMermaidBlocks(prev => prev.filter(b => b.id !== id));
    setMindmapBlocks(prev => prev.filter(b => b.id !== id));
  }, []);

  // Seleção Duplicada
  const duplicateSelection = useCallback(() => {
    if (selectedIds.length === 0 && selectedStrokeIds.length === 0) return;
    saveToHistory();
    const offset = 30;
    const newIds = [];
    const newStrokeIds = [];
    const dup = (list, setFn) => setFn(prev => {
      const items = prev.filter(b => selectedIds.includes(b.id));
      const n = items.map(b => ({ ...b, id: Date.now() + Math.random(), x: b.x + offset, y: b.y + offset }));
      n.forEach(x => newIds.push(x.id)); return [...prev, ...n];
    });
    dup(textBlocks, setTextBlocks); dup(imageBlocks, setImageBlocks); dup(codeBlocks, setCodeBlocks); dup(mathBlocks, setMathBlocks); dup(ggbBlocks, setGgbBlocks); dup(mermaidBlocks, setMermaidBlocks); dup(mindmapBlocks, setMindmapBlocks);
    if (selectedStrokeIds.length > 0) {
      setStrokes(prev => {
        const items = prev.filter(s => selectedStrokeIds.includes(s.id));
        const n = items.map(s => ({ ...s, id: Date.now() + Math.random(), points: s.points.map(p => ({ x: p.x + offset, y: p.y + offset })) }));
        n.forEach(x => newStrokeIds.push(x.id)); return [...prev, ...n];
      });
    }
    setTimeout(() => { setSelectedIds(newIds); setSelectedStrokeIds(newStrokeIds); }, 50);
  }, [selectedIds, selectedStrokeIds, saveToHistory, textBlocks, imageBlocks, codeBlocks, mathBlocks, ggbBlocks, mermaidBlocks, mindmapBlocks, strokes]);

  const handleMathPlot = useCallback((block, mathjsExpr) => {
    saveToHistory();
    const newId = Date.now() + Math.random();
    let commands = [];
    if (mathjsExpr.includes('=')) { const parts = mathjsExpr.split('='); commands = [parts[0].trim(), parts[1].trim()]; }
    setGgbBlocks(prev => [...prev, { id: newId, x: block.x + (block.width || 140) + 150, y: block.y, expression: mathjsExpr, commands: commands, width: 500, height: 400 }]);
    setConnections(prev => [...prev, { id: Date.now() + 1, fromId: block.id, fromSide: 'right', toId: newId, toSide: 'left', color: '#f59e0b' }]);
  }, [saveToHistory]);

  const handleMathSolve = useCallback((block, result) => {
    saveToHistory();
    const newId = Date.now() + Math.random();
    const safeResult = (result && result !== "undefined") ? result : "\\text{Erro ao processar resultado.}";
    let displayContent;
    if (typeof safeResult === 'string' && safeResult.startsWith('Erro:')) {
      const errorMsg = safeResult.replace('Erro:', '').trim();
      const words = errorMsg.split(' '); let lines = [], curr = '';
      for (const w of words) { if ((curr + ' ' + w).length > 40) { lines.push(curr.trim()); curr = w; } else curr += ' ' + w; }
      if (curr.trim()) lines.push(curr.trim());
      displayContent = `\\color{red}{\\mathbf{\\text{Erro:}}\\\\[10pt]${lines.map(l => `\\text{${l}}`).join('\\\\[8pt]')}}`;
    } else displayContent = `\\mathbf{\\text{Resultado: }} ${safeResult}`;
    const sourceW = getBlockDimensions(block).width;
    setMathBlocks(prev => [...prev, { id: newId, x: block.x + sourceW + 150, y: block.y, content: displayContent, fixedSize: false, color: safeResult.startsWith && safeResult.startsWith('Erro:') ? '#ef4444' : '#22c55e' }]);
    setConnections(prev => [...prev, { id: Date.now() + 2, fromId: block.id, fromSide: 'right', toId: newId, toSide: 'left', color: '#22c55e' }]);
  }, [saveToHistory]);

  const handleMathSteps = useCallback((block, steps) => {
    saveToHistory();
    const newId = Date.now() + Math.random();
    const safe = (Array.isArray(steps) && steps[0] !== "undefined") ? steps : [{ label: 'Erro', expr: 'Passos não disponíveis.' }];
    const content = `\\mathbf{\\text{PASSOS DE RESOLUÇÃO:}}\\\\[12pt]` + safe.map(s => `\\text{${s?.label || 'Passo'}: } ${s?.expr || '?'}`).join('\\\\[12pt]');
    const sourceH = getBlockDimensions(block).height;
    setMathBlocks(prev => [...prev, { id: newId, x: block.x, y: block.y + sourceH + 150, content, fixedSize: false, color: 'var(--accent-color)' }]);
    setConnections(prev => [...prev, { id: Date.now() + 3, fromId: block.id, fromSide: 'bottom', toId: newId, toSide: 'top', color: 'var(--accent-color)' }]);
  }, [saveToHistory]);

  const [isMathConverting, setIsMathConverting] = useState(false);
  const handleInkToMath = useCallback(async () => {
    if (selectedStrokeIds.length === 0 || !apiKey) return;
    const sel = strokes.filter(s => selectedStrokeIds.includes(s.id));
    if (sel.length === 0) return;
    setIsMathConverting(true);
    try {
      const latex = await MathRecognitionService.recognizeExpression(sel, apiKey);
      if (!latex || latex === "?") { alert("Não reconhecido."); return; }
      saveToHistory();
      const bounds = MathRecognitionService.getStrokesBounds(sel);
      setMathBlocks(prev => [...prev, { id: Date.now() + Math.random(), x: bounds.x, y: bounds.y, content: latex, width: Math.max(bounds.width, 150), height: Math.max(bounds.height, 60) }]);
      setStrokes(prev => prev.filter(s => !selectedStrokeIds.includes(s.id)));
      setSelectedStrokeIds([]);
    } catch (err) { console.error(err); } finally { setIsMathConverting(false); }
  }, [selectedStrokeIds, strokes, saveToHistory, apiKey]);

  // Keyboard & Clipboard & DND Logic
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const dragStartRef = useRef(null); // { mouse: {x,y}, blocks: {id: {x,y}}, strokes: {id: points} }

  useEffect(() => {
    const handleKeyDown = (e) => {
      // When a block is being edited, don't intercept keyboard events
      if (editingBlockId) return;
      // Also check if an input/textarea/contenteditable is focused
      const ae = document.activeElement;
      if (ae && (ae.tagName === 'TEXTAREA' || ae.tagName === 'INPUT' || ae.isContentEditable)) return;

      const isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(activeNoteId); return; }
      if ((isCtrl && e.key === 'y') || (isCtrl && e.shiftKey && e.key === 'z')) { e.preventDefault(); redo(activeNoteId); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length || selectedStrokeIds.length || selectedConnectionIds.length) {
          saveToHistory();
          setTextBlocks(prev => prev.filter(b => !selectedIds.includes(b.id)));
          setImageBlocks(prev => prev.filter(b => !selectedIds.includes(b.id)));
          setCodeBlocks(prev => prev.filter(b => !selectedIds.includes(b.id)));
          setMathBlocks(prev => prev.filter(b => !selectedIds.includes(b.id)));
          setGgbBlocks(prev => prev.filter(b => !selectedIds.includes(b.id)));
          setMermaidBlocks(prev => prev.filter(b => !selectedIds.includes(b.id)));
          setMindmapBlocks(prev => prev.filter(b => !selectedIds.includes(b.id)));
          setStrokes(prev => prev.filter(s => !selectedStrokeIds.includes(s.id)));
          setConnections(prev => prev.filter(c => !selectedConnectionIds.includes(c.id)));
          setSelectedIds([]); setSelectedStrokeIds([]); setSelectedConnectionIds([]);
        }
        return;
      }
      if (isCtrl && (e.key === 'd' || e.key === 'D')) { e.preventDefault(); duplicateSelection(); }
      if (isCtrl && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setSelectedIds([...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks].map(b => b.id));
        setSelectedStrokeIds(strokes.map(s => s.id));
      }
    };
    const handleCopy = (e) => {
      if (selectedIds.length === 0 && selectedStrokeIds.length === 0) return;
      if (['TEXTAREA', 'INPUT'].includes(document.activeElement.tagName)) return;

      const data = {
        text: textBlocks.filter(b => selectedIds.includes(b.id)),
        image: imageBlocks.filter(b => selectedIds.includes(b.id)),
        code: codeBlocks.filter(b => selectedIds.includes(b.id)),
        math: mathBlocks.filter(b => selectedIds.includes(b.id)),
        ggb: ggbBlocks.filter(b => selectedIds.includes(b.id)),
        mermaid: mermaidBlocks.filter(b => selectedIds.includes(b.id)),
        mindmap: mindmapBlocks.filter(b => selectedIds.includes(b.id)),
        strokes: strokes.filter(s => selectedStrokeIds.includes(s.id))
      };

      e.clipboardData.setData('text/plain', JSON.stringify({ app: 'connected-notes', data }));
      e.preventDefault();
    };

    const handleCut = (e) => {
      if (selectedIds.length === 0 && selectedStrokeIds.length === 0) return;
      if (['TEXTAREA', 'INPUT'].includes(document.activeElement.tagName)) return;

      handleCopy(e);
      saveToHistory();

      setTextBlocks(prev => prev.filter(b => !selectedIds.includes(b.id)));
      setImageBlocks(prev => prev.filter(b => !selectedIds.includes(b.id)));
      setCodeBlocks(prev => prev.filter(b => !selectedIds.includes(b.id)));
      setMathBlocks(prev => prev.filter(b => !selectedIds.includes(b.id)));
      setGgbBlocks(prev => prev.filter(b => !selectedIds.includes(b.id)));
      setMermaidBlocks(prev => prev.filter(b => !selectedIds.includes(b.id)));
      setMindmapBlocks(prev => prev.filter(b => !selectedIds.includes(b.id)));
      setStrokes(prev => prev.filter(s => !selectedStrokeIds.includes(s.id)));

      setSelectedIds([]);
      setSelectedStrokeIds([]);
    };

    const handlePaste = (e) => {
      if (['TEXTAREA', 'INPUT'].includes(document.activeElement.tagName)) return;

      const pt = screenToCanvas(lastMousePosRef.current.x, lastMousePosRef.current.y);
      const textData = e.clipboardData.getData('text');
      if (textData) {
        try {
          const parsed = JSON.parse(textData);
          if (parsed?.app === 'connected-notes' && parsed?.data) {
            e.preventDefault(); saveToHistory();
            const { text, image, code, math, ggb, mermaid, mindmap, strokes: pstStrokes } = parsed.data;

            // Calculate bounds to center at cursor
            const allNodes = [...(text || []), ...(image || []), ...(code || []), ...(math || []), ...(ggb || []), ...(mermaid || []), ...(mindmap || [])];
            let minX = Infinity, minY = Infinity;
            allNodes.forEach(b => { minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); });
            pstStrokes?.forEach(s => s.points.forEach(p => { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); }));

            const dx = minX === Infinity ? 0 : pt.x - minX;
            const dy = minY === Infinity ? 0 : pt.y - minY;
            const newIds = [];

            if (text) setTextBlocks(p => [...p, ...text.map(b => {
              const nid = generateId(); newIds.push(nid);
              return { ...b, id: nid, x: b.x + dx, y: b.y + dy };
            })]);
            if (image) setImageBlocks(p => [...p, ...image.map(b => {
              const nid = generateId(); newIds.push(nid);
              return { ...b, id: nid, x: b.x + dx, y: b.y + dy };
            })]);
            if (code) setCodeBlocks(p => [...p, ...code.map(b => {
              const nid = generateId(); newIds.push(nid);
              return { ...b, id: nid, x: b.x + dx, y: b.y + dy };
            })]);
            if (math) setMathBlocks(p => [...p, ...math.map(b => {
              const nid = generateId(); newIds.push(nid);
              return { ...b, id: nid, x: b.x + dx, y: b.y + dy };
            })]);
            if (ggb) setGgbBlocks(p => [...p, ...ggb.map(b => {
              const nid = generateId(); newIds.push(nid);
              return { ...b, id: nid, x: b.x + dx, y: b.y + dy };
            })]);
            if (mermaid) setMermaidBlocks(p => [...p, ...mermaid.map(b => {
              const nid = generateId(); newIds.push(nid);
              return { ...b, id: nid, x: b.x + dx, y: b.y + dy };
            })]);
            if (mindmap) setMindmapBlocks(p => [...p, ...mindmap.map(b => {
              const nid = generateId(); newIds.push(nid);
              return { ...b, id: nid, x: b.x + dx, y: b.y + dy };
            })]);
            if (pstStrokes) setStrokes(p => [...p, ...pstStrokes.map(s => {
              const nid = generateId();
              return { ...s, id: nid, points: s.points.map(pnt => ({ x: pnt.x + dx, y: pnt.y + dy })) };
            })]);

            setTimeout(() => setSelectedIds(newIds), 50);
            return;
          }
        } catch (err) { }

        // Plain text paste as Text Block
        if (!e.defaultPrevented && textData.trim()) {
          saveToHistory();
          setTextBlocks(p => [...p, { id: generateId(), x: pt.x - 100, y: pt.y - 50, content: textData, width: 350, height: null }]);
        }
      }

      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              saveToHistory();
              setImageBlocks(p => [...p, { id: generateId(), x: pt.x - 150, y: pt.y - 150, width: 300, height: 300, src: ev.target.result, extractedText: '' }]);
            };
            reader.readAsDataURL(items[i].getAsFile());
          } else if (items[i].type === 'application/pdf') {
            const file = items[i].getAsFile();
            if (file) importPdfAt(file, pt.x, pt.y);
          }
        }
      }
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e) => {
      e.preventDefault();
      const pt = screenToCanvas(e.clientX, e.clientY);
      const files = e.dataTransfer.files;

      if (files && files.length > 0) {
        saveToHistory();
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              setImageBlocks(p => [...p, {
                id: generateId(),
                x: pt.x - 150 + (i * 20),
                y: pt.y - 150 + (i * 20),
                width: 300,
                height: 300,
                src: ev.target.result,
                extractedText: ''
              }]);
            };
            reader.readAsDataURL(file);
          } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            importPdfAt(file, pt.x + (i * 20), pt.y + (i * 20));
          } else if (file.type === 'text/plain') {
            const reader = new FileReader();
            reader.onload = (ev) => {
              setTextBlocks(p => [...p, {
                id: generateId(),
                x: pt.x - 100 + (i * 20),
                y: pt.y - 50 + (i * 20),
                content: ev.target.result,
                width: 350,
                height: null
              }]);
            };
            reader.readAsText(file);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('copy', handleCopy);
    window.addEventListener('cut', handleCut);
    window.addEventListener('paste', handlePaste);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('cut', handleCut);
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [duplicateSelection, textBlocks, imageBlocks, codeBlocks, mathBlocks, ggbBlocks, mermaidBlocks, mindmapBlocks, strokes, position, scale, saveToHistory, selectedIds, selectedStrokeIds]);

  const handleBringToFront = () => {
    saveToHistory();
    const allItems = [...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks, ...strokes];
    const currentMaxZ = Math.max(...allItems.map(b => b.zIndex || 50), 50);

    // If we are bringing to absolute front (above blocks), use a starting zIndex of 100
    // This allows them to move to the SVG overlay
    const newZ = Math.max(currentMaxZ + 1, 101);

    const up = b => selectedIds.includes(b.id) ? { ...b, zIndex: newZ } : b;
    setTextBlocks(p => p.map(up));
    setImageBlocks(p => p.map(up));
    setCodeBlocks(p => p.map(up));
    setMathBlocks(p => p.map(up));
    setGgbBlocks(p => p.map(up));
    setMermaidBlocks(p => p.map(up));
    setMindmapBlocks(p => p.map(up));

    // For strokes, we physically move them to the end of the array to be on top in Konva
    // AND we set their zIndex high so they move to the HTML/SVG overlay
    if (selectedStrokeIds.length > 0) {
      setStrokes(p => {
        const selected = p.filter(s => selectedStrokeIds.includes(s.id)).map(s => ({ ...s, zIndex: newZ }));
        const unselected = p.filter(s => !selectedStrokeIds.includes(s.id));
        return [...unselected, ...selected];
      });
    }
  };

  const handleSendToBack = () => {
    saveToHistory();
    const allItems = [...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks, ...strokes];
    const minZ = Math.min(...allItems.map(b => b.zIndex || 50), 10);
    const newZ = Math.max(0, minZ - 1);

    const up = b => selectedIds.includes(b.id) ? { ...b, zIndex: newZ } : b;
    setTextBlocks(p => p.map(up));
    setImageBlocks(p => p.map(up));
    setCodeBlocks(p => p.map(up));
    setMathBlocks(p => p.map(up));
    setGgbBlocks(p => p.map(up));
    setMermaidBlocks(p => p.map(up));
    setMindmapBlocks(p => p.map(up));

    // For strokes, we physically move them to the start of the array to be at the bottom in Konva
    if (selectedStrokeIds.length > 0) {
      setStrokes(p => {
        const selected = p.filter(s => selectedStrokeIds.includes(s.id)).map(s => ({ ...s, zIndex: newZ }));
        const unselected = p.filter(s => !selectedStrokeIds.includes(s.id));
        return [...selected, ...unselected];
      });
    }
  };
  const handleGroup = () => { if (selectedIds.length + selectedStrokeIds.length < 2) return; saveToHistory(); const gid = Date.now().toString(); const up = b => (selectedIds.includes(b.id) || selectedStrokeIds.includes(b.id)) ? { ...b, groupId: gid } : b; setTextBlocks(p => p.map(up)); setImageBlocks(p => p.map(up)); setCodeBlocks(p => p.map(up)); setMathBlocks(p => p.map(up)); setGgbBlocks(p => p.map(up)); setMermaidBlocks(p => p.map(up)); setMindmapBlocks(p => p.map(up)); setStrokes(p => p.map(up)); };
  const handleLock = () => { saveToHistory(); const up = b => (selectedIds.includes(b.id) || selectedStrokeIds.includes(b.id)) ? { ...b, locked: true } : b; setTextBlocks(p => p.map(up)); setImageBlocks(p => p.map(up)); setCodeBlocks(p => p.map(up)); setMathBlocks(p => p.map(up)); setGgbBlocks(p => p.map(up)); setMermaidBlocks(p => p.map(up)); setMindmapBlocks(p => p.map(up)); setStrokes(p => p.map(up)); };

  const selectGroup = (id) => { const all = [...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks]; const t = all.find(b => b.id === id); if (t?.groupId) setSelectedIds(all.filter(b => b.groupId === t.groupId).map(b => b.id)); else setSelectedIds([id]); };
  const isSelectedLocked = (selectedIds.length > 0) && [...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks].some(b => selectedIds.includes(b.id) && b.locked);
  const isSelectedGrouped = (selectedIds.length > 0) && [...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks].some(b => selectedIds.includes(b.id) && b.groupId);

  // Carrega Nota (Unificado)
  useEffect(() => {
    setIsNoteLoaded(false);
    if (activeNote) {
      const content = activeNote.content || {};
      setStrokes(content.strokes || []);
      setTextBlocks(content.textBlocks || []);
      setImageBlocks(content.imageBlocks || []);
      setCodeBlocks(content.codeBlocks || []);
      setMathBlocks(content.mathBlocks || []);
      setGgbBlocks(content.ggbBlocks || []);
      setMermaidBlocks(content.mermaidBlocks || []);
      setMindmapBlocks(content.mindmapBlocks || []);
      setConnections(content.connections || []);
      setSelectedIds([]); setSelectedStrokeIds([]); setSelectedConnectionIds([]);
      lastLoadedNoteId.current = activeNote.id;
      lastSavedJson.current = JSON.stringify(content);
      setIsNoteLoaded(true);
    }
  }, [activeNote?.id, activeNote?.content]);

  // Salva Nota (Unificado)
  useEffect(() => {
    if (activeNoteId && isNoteLoaded) {
      const timer = setTimeout(() => {
        // Explicitly check variables to ensure they exist (debugging ReferenceError)
        const safeMermaid = typeof mermaidBlocks !== 'undefined' ? mermaidBlocks : [];
        const safeMindmap = typeof mindmapBlocks !== 'undefined' ? mindmapBlocks : [];

        const content = {
          strokes,
          textBlocks,
          imageBlocks,
          codeBlocks,
          mathBlocks,
          ggbBlocks,
          mermaidBlocks: safeMermaid,
          mindmapBlocks: safeMindmap,
          connections
        };
        lastSavedJson.current = JSON.stringify(content);
        updateNoteContent(activeNoteId, content);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [strokes, textBlocks, imageBlocks, codeBlocks, mathBlocks, ggbBlocks, mermaidBlocks, mindmapBlocks, connections, activeNoteId, isNoteLoaded]);

  // PDF & Image Handlers
  const importPdfAt = useCallback(async (file, startX, startY) => {
    if (!file || !window.pdfjsLib) return;
    setIsLoadingPdf(true);
    try {
      const pdf = await window.pdfjsLib.getDocument(new Uint8Array(await file.arrayBuffer())).promise;
      const imgs = [];
      let cy = startY;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const vp = page.getViewport({ scale: 1.5 });
        const cnv = document.createElement('canvas');
        const ctx = cnv.getContext('2d');
        cnv.height = vp.height;
        cnv.width = vp.width;
        await page.render({ canvasContext: ctx, viewport: vp }).promise;

        let dw = vp.width, dh = vp.height;
        if (dw > 1000) { dh *= (1000 / dw); dw = 1000; }

        imgs.push({
          id: generateId(),
          x: startX,
          y: cy,
          src: cnv.toDataURL('image/png'),
          width: dw,
          height: dh,
          extractedText: '',
          zIndex: 50
        });
        cy += dh + 20;
      }
      saveToHistory();
      setImageBlocks(p => [...p, ...imgs]);
    } catch (e) {
      console.error("Erro PDF:", e);
      alert("Erro ao importar PDF.");
    } finally {
      setIsLoadingPdf(false);
      onPdfImported?.();
    }
  }, [saveToHistory, onPdfImported]);

  useEffect(() => {
    if (pdfToImport) {
      const centerX = (-position.x + (window.innerWidth / 2)) / scale;
      const centerY = (-position.y + (window.innerHeight / 2)) / scale;
      importPdfAt(pdfToImport, centerX - 400, centerY - 300);
    }
  }, [pdfToImport, position, scale, importPdfAt]);

  const screenToCanvas = useCallback((cx, cy) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const r = containerRef.current.getBoundingClientRect();
    return { x: (cx - r.left - position.x) / scale, y: (cy - r.top - position.y) / scale };
  }, [position, scale]);

  const groupBounds = getGroupBounds([...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks].filter(b => selectedIds.includes(b.id)), strokes.filter(s => selectedStrokeIds.includes(s.id)));
  const handleGroupMove = (dx, dy) => {
    if (!groupBounds) return;
    let sdx = dx / scale, sdy = dy / scale;

    // Hard Clamping: Impede movimento além da borda inicial (0,0)
    if (groupBounds.x + sdx < 0) sdx = -groupBounds.x;
    if (groupBounds.y + sdy < 0) sdy = -groupBounds.y;

    if (sdx === 0 && sdy === 0) return;

    const up = b => selectedIds.includes(b.id) ? { ...b, x: b.x + sdx, y: b.y + sdy } : b;
    setTextBlocks(p => p.map(up)); setImageBlocks(p => p.map(up)); setCodeBlocks(p => p.map(up)); setMathBlocks(p => p.map(up)); setGgbBlocks(p => p.map(up)); setMermaidBlocks(p => p.map(up)); setMindmapBlocks(p => p.map(up));
    setStrokes(p => p.map(s => selectedStrokeIds.includes(s.id) ? { ...s, points: s.points.map(pt => ({ x: pt.x + sdx, y: pt.y + sdy })) } : s));
  };

  const handleGroupResize = (dx, dy, type = 'corner') => {
    if (!groupBounds) return;

    // Screen deltas normalized by scale
    const cdx = dx / scale;
    const cdy = dy / scale;

    const startW = groupBounds.width;
    const startH = groupBounds.height;
    const originX = groupBounds.x;
    const originY = groupBounds.y;

    let scaleX = 1, scaleY = 1;

    if (type === 'right') {
      const newWidth = Math.max(20, startW + cdx);
      scaleX = newWidth / startW;
      scaleY = 1;
    } else if (type === 'bottom') {
      scaleX = 1;
      const newHeight = Math.max(20, startH + cdy);
      scaleY = newHeight / startH;
    } else {
      const newWidth = Math.max(20, startW + cdx);
      const s = newWidth / startW;
      scaleX = s; scaleY = s;
    }

    if (!isFinite(scaleX) || scaleX <= 0 || !isFinite(scaleY) || scaleY <= 0) return;

    const scaleBlock = b => {
      if (!selectedIds.includes(b.id)) return b;

      const dims = getBlockDimensions(b);
      const newWidth = dims.width * scaleX;
      const newHeight = dims.height * scaleY;

      const relativeX = b.x - originX;
      const relativeY = b.y - originY;

      return {
        ...b,
        fixedSize: true,
        x: originX + (relativeX * scaleX),
        y: originY + (relativeY * scaleY),
        width: newWidth,
        height: newHeight,
        // Sync measured dimensions so getBlockDimensions returns
        // the correct value on the next frame (prevents stale groupBounds)
        measuredWidth: newWidth,
        measuredHeight: newHeight
      };
    };

    setTextBlocks(prev => prev.map(scaleBlock));
    setImageBlocks(prev => prev.map(scaleBlock));
    setCodeBlocks(prev => prev.map(scaleBlock));
    setMathBlocks(prev => prev.map(scaleBlock));
    setGgbBlocks(prev => prev.map(scaleBlock));
    setMermaidBlocks(prev => prev.map(scaleBlock));
    setMindmapBlocks(prev => prev.map(scaleBlock));
    setStrokes(prev => prev.map(s => {
      if (!selectedStrokeIds.includes(s.id)) return s;
      return { ...s, points: s.points.map(p => ({ x: originX + (p.x - originX) * scaleX, y: originY + (p.y - originY) * scaleY })) };
    }));
  };

  const handleGroupDoubleClick = (e) => {
    // If single item selected, check what's under the overlay
    if (selectedIds.length === 1) {
      const id = selectedIds[0];

      // Peek underneath the overlay to see if the user clicked on a header
      const overlay = e.currentTarget;
      const savedPE = overlay.style.pointerEvents;
      overlay.style.pointerEvents = 'none';
      const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
      overlay.style.pointerEvents = savedPE;

      // If double-clicking on the header, trigger rename instead of edit
      if (elementBelow?.closest('.glass-card-header') && !elementBelow.closest('button')) {
        const headerEl = elementBelow.closest('.glass-card-header');
        if (headerEl) {
          headerEl.dispatchEvent(new MouseEvent('dblclick', {
            bubbles: true, cancelable: true,
            clientX: e.clientX, clientY: e.clientY, view: window
          }));
        }
        return;
      }

      // Otherwise, enter edit mode (e.g. double-click on content area)
      setEditingBlockId(id);
      setSelectedIds([]);
    }
  };

  const startDrag = (e, overridenIds, overridenStrokeIds) => {
    setIsDraggingSelection(true);
    const currentMouse = { x: e.clientX, y: e.clientY };
    setLastMousePos(currentMouse);

    const sIds = overridenIds || selectedIds;
    const sStrokeIds = overridenStrokeIds || selectedStrokeIds;

    // Capture the pointer ID to ensure handlePointerMove doesn't ignore subsequent move events
    activePointerId.current = e.pointerId;
    if (e.pointerId !== undefined && containerRef.current) {
      try { containerRef.current.setPointerCapture(e.pointerId); } catch (err) { }
    }

    const selectedBlocks = [...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks]
      .filter(b => sIds.includes(b.id));

    const selectedStrokes = strokes.filter(s => sStrokeIds.includes(s.id));

    dragStartRef.current = {
      mouse: currentMouse,
      blocks: Object.fromEntries(selectedBlocks.map(b => [b.id, { x: b.x, y: b.y }])),
      strokes: Object.fromEntries(selectedStrokes.map(s => [s.id, s.points.map(p => ({ ...p }))]))
    };
  };

  const handleBlockInteract = (id, e) => {
    e?.stopPropagation();

    const block = [...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks].find(b => b.id === id);
    if (!block) return;

    const isHeaderClick = e?.target?.closest('.glass-card-header');

    // Check if clicking with matching tool to trigger direct edit
    const isMatchingTool = (activeTool === 'text' && textBlocks.some(b => b.id === id)) ||
      (activeTool === 'math' && mathBlocks.some(b => b.id === id)) ||
      (activeTool === 'code' && codeBlocks.some(b => b.id === id)) ||
      (activeTool === 'ggb' && ggbBlocks.some(b => b.id === id)) ||
      (['mermaid', 'mindmap'].includes(activeTool) && (mermaidBlocks.some(b => b.id === id) || mindmapBlocks.some(b => b.id === id)));

    // Only enter edit mode if it's NOT a header click and tool matches
    if (isMatchingTool && activeTool !== 'cursor' && !isHeaderClick) {
      setEditingBlockId(id);
      setSelectedIds([]);
      return;
    }

    // Allow interaction if it's the cursor tool OR if the tool matches the block type OR it's a header click
    const canInteract = activeTool === 'cursor' || isMatchingTool || isHeaderClick;

    if (canInteract) {
      const isShift = e?.shiftKey;
      let newSel = isShift ? [...selectedIds] : [];
      // ... resto da lógica de seleção ...
      if (isShift && selectedIds.includes(id)) {
        newSel = newSel.filter(x => x !== id);
      } else {
        const g = block.groupId;
        if (g) {
          const groupIds = [...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks]
            .filter(b => b.groupId === g)
            .map(b => b.id);
          newSel = [...new Set([...newSel, ...groupIds])];
        } else {
          newSel = isShift ? [...newSel, id] : [id];
        }
      }
      setSelectedIds(newSel);
      setSelectedStrokeIds([]);

      if (e && !isSelectedLocked) {
        // [BLOCK FIX] Skip automatic drag if clicking on the content of interactive blocks (GGB, Mermaid)
        // This allows their internal pan logic (which uses mousemove) to work without moving the whole card.
        const isContentArea = (e.target && e.target.closest('.glass-card-content'));
        const isInteractiveBlock = block.expression !== undefined || block.code !== undefined || block.type === 'mindmap'; // GGB, Mermaid or Mindmap

        if (!(isContentArea && isInteractiveBlock)) {
          startDrag(e, newSel, []);
        }
      }
    }
  };

  const handlePointerDown = (e) => {
    if (window.isOverInteractiveBlock) {
      // Allow internal interaction for GGB, Mermaid, Mindmap
      return;
    }

    if (editingBlockId) {
      if (['TEXTAREA', 'INPUT', 'BUTTON'].includes(e.target.tagName) || e.target.closest('.modebar, .legend, .connector-handle, .ggb-container, .ggb-drag-handle, .infinite-canvas > div, .rich-text-toolbar')) {
        return;
      }
      setEditingBlockId(null);
      return;
    }
    if (e.button !== 0 && e.pointerType !== 'pen') return;

    // Se estivermos com uma ferramenta de bloco, verifique se clicamos em um bloco existente
    if (['text', 'code', 'math', 'ggb', 'mermaid', 'mindmap'].includes(activeTool)) {
      // Encontre se há um bloco sob o clique
      const allBlocks = [...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks];
      const pt = screenToCanvas(e.clientX, e.clientY);
      const clickedBlock = allBlocks.find(b => isPointInBlock(b, pt));

      if (clickedBlock) {
        // Não crie um novo. Apenas interaja com o existente.
        handleBlockInteract(clickedBlock.id, e);
        return;
      }
    }

    activePointerId.current = e.pointerId; lastPointerPos.current = { x: e.clientX, y: e.clientY };
    const pt = screenToCanvas(e.clientX, e.clientY);
    if (activeTool === 'eraser') { setIsErasing(true); saveToHistory(); setStrokes(p => p.filter(s => !isStrokeClicked(s, pt, 15 / scale))); return; }
    if (activeTool === 'cursor' || activeTool === 'ai-lasso') {
      const sid = strokes.find(s => isStrokeClicked(s, pt, 10 / scale))?.id;
      if (sid && activeTool === 'cursor') {
        const newStrokeSel = selectedStrokeIds.includes(sid) ? selectedStrokeIds : [sid];
        if (!selectedStrokeIds.includes(sid)) {
          setSelectedStrokeIds([sid]);
          setSelectedIds([]);
          setSelectedConnectionIds([]);
        }
        startDrag(e, [], newStrokeSel);
        containerRef.current?.setPointerCapture(e.pointerId); return;
      }
      setSelectedIds([]); setSelectedStrokeIds([]); setSelectedConnectionIds([]);
      setSelectionRect({ startX: pt.x, startY: pt.y, currentX: pt.x, currentY: pt.y });
      containerRef.current?.setPointerCapture(e.pointerId); return;
    }
    if (['pen', 'highlighter'].includes(activeTool)) {
      setIsDrawing(true); const attrs = currentAttributes(); const ipt = { x: pt.x, y: pt.y, pressure: e.pressure };
      activeStrokePointsRef.current = [ipt];

      if (activeForcedShape) {
        // [LIVE SHAPE] Start parametric shape instead of freehand
        // Warm up the service for immediate response
        import('../../services/ShapeRecognitionService');
        setCurrentStroke({
          id: generateId(),
          points: [ipt],
          color: attrs.color,
          width: attrs.width / scale,
          type: attrs.type,
          isNeatShape: true,
          isLiveShape: true,
          shapeType: activeForcedShape,
          startPt: ipt
        });
      } else {
        activeStrokeConfigRef.current = { width: attrs.width / scale }; hasUpdatesRef.current = true;
        setCurrentStroke({
          id: generateId(),
          points: [ipt],
          color: attrs.color,
          width: attrs.width / scale,
          type: attrs.type,
          isNeatShape: e.shiftKey,
          isShiftLine: e.shiftKey,
          startPt: ipt
        });
      }
      containerRef.current?.setPointerCapture(e.pointerId); return;
    }
    if (['text', 'code', 'math', 'ggb', 'mermaid', 'mindmap'].includes(activeTool)) {
      const nid = generateId(); saveToHistory();
      if (activeTool === 'text') setTextBlocks(p => [...p, { id: nid, x: pt.x, y: pt.y, content: '', width: 350, fixedSize: false }]);
      if (activeTool === 'code') setCodeBlocks(p => [...p, { id: nid, x: pt.x, y: pt.y, content: 'Code...', width: 450, height: 350 }]);
      if (activeTool === 'math') setMathBlocks(p => [...p, { id: nid, x: pt.x, y: pt.y, content: 'E=mc^2', fixedSize: false }]);
      if (activeTool === 'ggb') setGgbBlocks(p => [...p, { id: nid, x: pt.x, y: pt.y, expression: null, width: 400, height: 350 }]);
      if (activeTool === 'mermaid') setMermaidBlocks(p => [...p, { id: nid, type: 'mermaid', x: pt.x, y: pt.y, code: 'graph TD;\nA-->B;\nA-->C;\nB-->D;\nC-->D;', width: 300, height: 200 }]);
      if (activeTool === 'mindmap') setMindmapBlocks(p => [...p, { id: nid, type: 'mindmap', x: pt.x, y: pt.y, width: 400, height: 300, content: null }]);
      if (!['mermaid', 'mindmap'].includes(activeTool)) {
        setEditingBlockId(nid);
      }
    }
  };

  const handlePointerMove = (e) => {
    if (activePointerId.current !== null && e.pointerId !== activePointerId.current) return;
    const pt = screenToCanvas(e.clientX, e.clientY);
    if (activeTool === 'eraser') { setEraserCursorPos(pt); } else if (eraserCursorPos) { setEraserCursorPos(null); }
    if (connectingState) setConnectingState(p => ({ ...p, tempX: pt.x, tempY: pt.y }));
    if (isErasing) { setStrokes(p => p.filter(s => !isStrokeClicked(s, pt, 15 / scale))); return; }
    if (selectionRect) { setSelectionRect(p => ({ ...p, currentX: pt.x, currentY: pt.y })); return; }
    if (isDraggingSelection && dragStartRef.current) {
      const dx = (e.clientX - dragStartRef.current.mouse.x) / scale;
      const dy = (e.clientY - dragStartRef.current.mouse.y) / scale;

      const moveBlock = b => {
        const start = dragStartRef.current.blocks[b.id];
        if (!start) return b;
        return { ...b, x: start.x + dx, y: start.y + dy };
      };

      const moveStroke = s => {
        const startPoints = dragStartRef.current.strokes[s.id];
        if (!startPoints) return s;
        return { ...s, points: startPoints.map(p => ({ ...p, x: p.x + dx, y: p.y + dy })) };
      };

      setTextBlocks(prev => prev.map(moveBlock));
      setImageBlocks(prev => prev.map(moveBlock));
      setCodeBlocks(prev => prev.map(moveBlock));
      setMathBlocks(prev => prev.map(moveBlock));
      setGgbBlocks(prev => prev.map(moveBlock));
      setMermaidBlocks(prev => prev.map(moveBlock));
      setMindmapBlocks(prev => prev.map(moveBlock));
      setStrokes(prev => prev.map(moveStroke));
      return;
    }
    if (isDrawing && currentStroke) {
      // [LIVE SHAPE] or [SHIFT LINE] Real-time parametric update
      const isShiftLine = currentStroke.isShiftLine && !activeForcedShape;
      if (currentStroke.isLiveShape || isShiftLine) {
        import('../../services/ShapeRecognitionService').then(({ generateLiveShapePoints }) => {
          const sType = currentStroke.isLiveShape ? currentStroke.shapeType : 'line';
          const pts = generateLiveShapePoints(sType, currentStroke.startPt, pt);
          if (pts) {
            setCurrentStroke(prev => ({ ...prev, points: pts, isNeatShape: true }));
            // Immediate imperative update
            if (activeStrokePathRef.current) {
              const isOpen = ['line', 'arrow'].includes(sType);
              const d = getNeatPathData(pts, sType, isOpen);
              activeStrokePathRef.current.setAttrs({
                data: d,
                fill: 'transparent',
                stroke: currentStroke.color,
                strokeWidth: currentStroke.width
              });
              activeStrokePathRef.current.getLayer()?.batchDraw();
            }
          }
        });
        return;
      }

      const dist = Math.hypot(e.clientX - lastPointerPos.current.x, e.clientY - lastPointerPos.current.y);
      const MOVE_THRESHOLD = 8; // Stability buffer

      // [SHAPE PRO] Post-Snap Manipulation (Scale/Rotate)
      if (postSnapManipulation && currentStroke.isNeatShape) {
        const center = postSnapManipulation.center;
        const dx = (e.clientX - position.x) / scale - center.x;
        const dy = (e.clientY - position.y) / scale - center.y;
        const distance = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);

        if (postSnapManipulation.initialDistance === null) {
          setPostSnapManipulation(prev => ({ ...prev, initialDistance: distance, initialAngle: angle }));
        } else {
          const scaleFactor = Math.max(0.1, distance / postSnapManipulation.initialDistance);
          const rotationDelta = angle - postSnapManipulation.initialAngle;
          import('../../services/ShapeRecognitionService').then(({ transformShapePoints }) => {
            const transformedPoints = transformShapePoints(postSnapManipulation.originalShape, scaleFactor, rotationDelta);
            if (transformedPoints) {
              setCurrentStroke(prev => ({ ...prev, points: transformedPoints }));
              // Synchronize the imperative path for real-time manipulation feedback
              if (activeStrokePathRef.current) {
                const d = getNeatPathData(transformedPoints, currentStroke.shapeType, currentStroke.isOpen);
                activeStrokePathRef.current.setAttrs({
                  data: d,
                  fill: 'transparent',
                  stroke: currentStroke.color,
                  strokeWidth: currentStroke.width
                });
                activeStrokePathRef.current.getLayer()?.batchDraw();
              }
            }
          });
        }
        return;
      }

      // [SHAPE PRO] Stillness Detection for Snapping
      if (dist > MOVE_THRESHOLD) {
        lastPointerPos.current = { x: e.clientX, y: e.clientY };
        if (snapTimer.current) { clearTimeout(snapTimer.current); snapTimer.current = null; }
        if (ghostTimer.current) { clearTimeout(ghostTimer.current); ghostTimer.current = null; }
        if (ghostShape) setGhostShape(null);
      } else if (activeStrokePointsRef.current.length > 20 && !currentStroke.isNeatShape) {
        // Ghost Preview Timer (250ms hold)
        if (!ghostTimer.current && !ghostShape) {
          ghostTimer.current = setTimeout(() => {
            import('../../services/ShapeRecognitionService').then(async ({ recognizeViaGoogle, fitGeometry, generateFittedPoints }) => {
              if (activePointerId.current === null) return;
              const type = activeForcedShape || await recognizeViaGoogle(activeStrokePointsRef.current);
              if (type) {
                const shape = fitGeometry(type, activeStrokePointsRef.current);
                if (shape) {
                  const neat = generateFittedPoints(shape);
                  if (neat) setGhostShape({ points: neat, type: shape.type });
                }
              }
            }).catch(e => console.error(e));
          }, 250);
        }
        // Final Snap Timer (600ms hold)
        if (!snapTimer.current) {
          snapTimer.current = setTimeout(() => {
            import('../../services/ShapeRecognitionService').then(async ({ recognizeViaGoogle, fitGeometry, generateFittedPoints }) => {
              if (activePointerId.current === null) return;
              const type = activeForcedShape || await recognizeViaGoogle(activeStrokePointsRef.current);
              if (type) {
                const shape = fitGeometry(type, activeStrokePointsRef.current);
                if (shape) {
                  const neatPoints = generateFittedPoints(shape);
                  if (neatPoints) {
                    setCurrentStroke(prev => ({ ...prev, points: neatPoints, isNeatShape: true, shapeType: shape.type, isOpen: shape.isOpen }));
                    setPostSnapManipulation({ originalShape: shape, center: shape.center, initialDistance: null, initialAngle: null });
                    setGhostShape(null);

                    // [FIX] Update imperative path immediately with neat stroke instead of poly outline
                    if (activeStrokePathRef.current) {
                      const d = getNeatPathData(neatPoints, shape.type, shape.isOpen);
                      activeStrokePathRef.current.setAttrs({
                        data: d,
                        fill: 'transparent',
                        stroke: currentStroke.color,
                        strokeWidth: currentStroke.width / scale
                      });
                      activeStrokePathRef.current.getLayer()?.batchDraw();
                    }

                    if (window.navigator.vibrate) window.navigator.vibrate(20);
                  }
                }
              }
            }).catch(e => console.error(e));
            snapTimer.current = null;
          }, 600);
        }
      }

      const pts = []; const r = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
      if (e.getCoalescedEvents) e.getCoalescedEvents().forEach(ev => pts.push({ x: (ev.clientX - r.left - position.x) / scale, y: (ev.clientY - r.top - position.y) / scale, pressure: ev.pressure }));
      else pts.push({ x: pt.x, y: pt.y, pressure: e.pressure });
      activeStrokePointsRef.current.push(...pts); hasUpdatesRef.current = true;
    }
  };

  const handlePointerUp = (e) => {
    if (e.pointerId === activePointerId.current) activePointerId.current = null;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }

    // [SHAPE PRO] Clear all snap timers
    if (snapTimer.current) { clearTimeout(snapTimer.current); snapTimer.current = null; }
    if (ghostTimer.current) { clearTimeout(ghostTimer.current); ghostTimer.current = null; }
    setGhostShape(null);
    setPostSnapManipulation(null);

    containerRef.current?.releasePointerCapture(e.pointerId);
    if (currentStroke) {
      const fpts = (currentStroke.isNeatShape) ? currentStroke.points : (activeStrokePointsRef.current.length ? activeStrokePointsRef.current : currentStroke.points);
      const fstroke = { ...currentStroke, points: fpts };
      setStrokes(p => p.find(s => s.id === fstroke.id) ? p : [...p, fstroke]);
      setCurrentStroke(null); activeStrokePointsRef.current = [];
    }
    if (selectionRect) {
      const nIds = [], nSIds = [];
      [...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks].forEach(b => { if (isBlockIntersecting(b, selectionRect)) nIds.push(b.id); });
      strokes.forEach(s => { if (isStrokeInRect(s, selectionRect)) nSIds.push(s.id); });
      setSelectedIds(nIds); setSelectedStrokeIds(nSIds); setSelectionRect(null);
    }
    if (isDraggingSelection || isDrawing) saveToHistory();
    setIsDrawing(false); setIsErasing(false); setIsDraggingSelection(false);
    setConnectingState(null);
  };

  const handleStartConnection = (e, bid, side) => { e.stopPropagation(); const pt = screenToCanvas(e.clientX, e.clientY); setConnectingState({ fromId: bid, fromSide: side, tempX: pt.x, tempY: pt.y }); };
  const handleCompleteConnection = (e, tid, tside) => {
    e.stopPropagation();
    if (connectingState) {
      if (connectingState.fromId !== tid) {
        saveToHistory();
        setConnections(p => [...p, { id: Date.now(), fromId: connectingState.fromId, fromSide: connectingState.fromSide, textAlign: 'center', toId: tid, toSide: tside }]);
      }
      setConnectingState(null);
    }
  };

  if (!activeNote) return <div className="loading">Carregando...</div>;

  return (
    <div className="canvas-viewport glass-panel" ref={containerRef} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onContextMenu={e => e.preventDefault()} style={{
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      cursor: isErasing ? 'cell' : (['pen', 'highlighter'].includes(activeTool) ? 'crosshair' : 'default'),
      position: 'relative',
      backgroundColor: 'var(--canvas-bg-color)',
      borderRadius: '16px',
      userSelect: 'none',
      touchAction: 'none'
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
      `}</style>
      <Stage width={stageSize.width} height={stageSize.height} style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, pointerEvents: (isPanning || activeTool === 'cursor') ? 'all' : 'all' }}>
        {/* Background Layer */}
        <Layer x={position.x} y={position.y} scaleX={scale} scaleY={scale} listening={false}>
          {patternImage && paperPattern !== 'blank' && (
            <Rect
              x={-25000}
              y={-25000}
              width={50000}
              height={50000}
              fillPatternImage={patternImage}
              fillPatternRepeat="repeat"
              fillPatternX={0}
              fillPatternY={80} // Offset pattern to align with top margin
            />
          )}

          {/* Margins */}
          {paperPattern !== 'blank' && (
            <>
              {/* Vertical Margin (Left) */}
              <Line
                points={[80, -25000, 80, 25000]}
                stroke={isDarkMode ? 'rgba(255, 0, 0, 0.3)' : 'rgba(255, 0, 0, 0.2)'}
                strokeWidth={1.5 / scale}
              />
              {/* Horizontal Margin (Top) */}
              <Line
                points={[-25000, 80, 25000, 80]}
                stroke={isDarkMode ? 'rgba(255, 0, 0, 0.3)' : 'rgba(255, 0, 0, 0.2)'}
                strokeWidth={1 / scale}
              />
            </>
          )}
        </Layer>
        <Layer x={position.x} y={position.y} scaleX={scale} scaleY={scale}>
          {strokes.filter(s => (s.zIndex || 0) < 100).map(s => <MemoizedStroke key={s.id} stroke={s} isSelected={selectedStrokeIds.includes(s.id)} />)}
          <ConnectionLayer connections={connections} allBlocks={[...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks]} tempConnection={connectingState} selectedIds={selectedConnectionIds} scale={scale} onSelect={(id, shift) => setSelectedConnectionIds(prev => shift ? (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]) : [id])} />
        </Layer>
        <Layer x={position.x} y={position.y} scaleX={scale} scaleY={scale} listening={false}>
          {currentStroke && (
            <Path
              ref={activeStrokePathRef}
              data=""
              fill={currentStroke.isNeatShape ? 'transparent' : currentStroke.color}
              stroke={currentStroke.isNeatShape ? currentStroke.color : (currentStroke.type === 'highlighter' ? currentStroke.color : null)}
              strokeWidth={currentStroke.isNeatShape ? currentStroke.width : 0}
              opacity={currentStroke.type === 'highlighter' ? 0.5 : 1}
              perfectDrawEnabled={false}
              shadowForStrokeEnabled={false}
              hitStrokeWidth={0}
            />
          )}
          {ghostShape && <Path data={getNeatPathData(ghostShape.points, ghostShape.type, ['arrow', 'line'].includes(ghostShape.type))} stroke="#6366f1" strokeWidth={2 / scale} dash={[5, 5]} opacity={0.5} />}
          {selectionRect && (
            <Rect
              x={Math.min(selectionRect.startX, selectionRect.currentX)}
              y={Math.min(selectionRect.startY, selectionRect.currentY)}
              width={Math.abs(selectionRect.currentX - selectionRect.startX)}
              height={Math.abs(selectionRect.currentY - selectionRect.startY)}
              fill="rgba(99, 102, 241, 0.05)"
              stroke="#6366f1"
              strokeWidth={1 / scale}
              dash={[4, 4]}
            />
          )}
          {activeTool === 'eraser' && eraserCursorPos && (
            <Circle
              x={eraserCursorPos.x}
              y={eraserCursorPos.y}
              radius={15 / scale}
              stroke="#6366f1"
              strokeWidth={1 / scale}
              dash={[3, 3]}
            />
          )}
        </Layer>
      </Stage>

      {/* ====== LAYER 2a: Background + SVG strokes (transformed) ====== */}
      <div className="infinite-canvas" style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, transformOrigin: '0 0', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: 50000, height: 50000, pointerEvents: 'none', ...getBackgroundStyle() }} />

        {/* GGBBlock stays here (no backdrop-filter needed, has iframe) */}
        {ggbBlocks.map(b => <GGBBlock key={b.id} block={b} activeTool={activeTool} isDarkMode={isDarkMode} updateBlock={(id, d) => updateAnyBlock('ggb', id, d)} removeBlock={removeAnyBlock} onInteract={handleBlockInteract} isEditing={editingBlockId === b.id} setEditing={v => setEditingBlockId(v ? b.id : null)} isDragging={selectedIds.includes(b.id) && isDraggingSelection} />)}

        {/* SVG Overlay Stage for Top-Layer Strokes (zIndex >= 100) */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 90 }}>
          {strokes.filter(s => (s.zIndex || 0) >= 100).map(s => {
            const isHighlighter = s.type === 'highlighter';
            const color = selectedStrokeIds.includes(s.id) ? '#6366f1' : s.color;
            const options = isHighlighter
              ? { size: s.width, thinning: 0, smoothing: 0.5, streamline: 0.5 }
              : { size: s.width, thinning: 0.5, smoothing: 0.5, streamline: 0.5 };
            const d = getSvgPathFromStroke(s.points, options);

            if (s.isNeatShape) {
              const neatD = s.points.reduce((acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`), '') + (s.isOpen ? '' : ' Z');
              return (
                <path
                  key={s.id}
                  d={neatD}
                  stroke={color}
                  strokeWidth={s.width}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={isHighlighter ? 0.5 : 1}
                />
              );
            }
            return <path key={s.id} d={d} fill={color} opacity={isHighlighter ? 0.5 : 1} />;
          })}
        </svg>
      </div>

      {/* ====== LAYER 2b: Glass blocks (NO parent transform — backdrop-filter works!) ====== */}
      <div className="glass-blocks-layer" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 3 }}>
        {imageBlocks.map(b => <ImageBlock key={b.id} block={b} activeTool={activeTool} updateBlock={(id, d) => updateAnyBlock('image', id, d)} onInteract={handleBlockInteract} removeBlock={removeAnyBlock} isDragging={selectedIds.includes(b.id) && isDraggingSelection} canvasScale={scale} canvasPan={position} />)}
        {codeBlocks.map(b => <CodeBlock key={b.id} block={b} activeTool={activeTool} isDarkMode={isDarkMode} updateBlock={(id, d) => updateAnyBlock('code', id, d)} removeBlock={removeAnyBlock} onInteract={handleBlockInteract} saveHistory={saveToHistory} isEditing={editingBlockId === b.id} setEditing={v => setEditingBlockId(v ? b.id : null)} isDragging={selectedIds.includes(b.id) && isDraggingSelection} canvasScale={scale} canvasPan={position} />)}
        {textBlocks.map(b => <TextBlock key={b.id} block={b} activeTool={activeTool} isDarkMode={isDarkMode} updateBlock={(id, d) => updateAnyBlock('text', id, d)} removeBlock={removeAnyBlock} onInteract={handleBlockInteract} saveHistory={saveToHistory} isEditing={editingBlockId === b.id} setEditing={v => setEditingBlockId(v ? b.id : null)} isDragging={selectedIds.includes(b.id) && isDraggingSelection} canvasScale={scale} canvasPan={position} />)}
        {mathBlocks.map(b => <MathBlock key={b.id} block={b} apiKey={apiKey} activeTool={activeTool} isDarkMode={isDarkMode} updateBlock={(id, d) => updateAnyBlock('math', id, d)} removeBlock={removeAnyBlock} onInteract={handleBlockInteract} saveHistory={saveToHistory} isEditing={editingBlockId === b.id} setEditing={v => setEditingBlockId(v ? b.id : null)} onPlot={e => handleMathPlot(b, e)} onSolve={r => handleMathSolve(b, r)} onSteps={s => handleMathSteps(b, s)} isDragging={selectedIds.includes(b.id) && isDraggingSelection} canvasScale={scale} canvasPan={position} />)}
        {mermaidBlocks.map(b => <MermaidBlock key={b.id} block={b} activeTool={activeTool} isDarkMode={isDarkMode} updateBlock={(id, d) => updateAnyBlock('mermaid', id, d)} removeBlock={removeAnyBlock} onInteract={handleBlockInteract} isEditing={editingBlockId === b.id} setEditing={v => setEditingBlockId(v ? b.id : null)} isDragging={selectedIds.includes(b.id) && isDraggingSelection} canvasScale={scale} canvasPan={position} />)}
        {mindmapBlocks.map(b => <MindmapBlock key={b.id} block={b} activeTool={activeTool} isDarkMode={isDarkMode} updateBlock={(id, d) => updateAnyBlock('mindmap', id, d)} removeBlock={removeAnyBlock} onInteract={handleBlockInteract} isEditing={editingBlockId === b.id} setEditing={v => setEditingBlockId(v ? b.id : null)} isDragging={selectedIds.includes(b.id) && isDraggingSelection} canvasScale={scale} canvasPan={position} />)}

        {[...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks].map(b => <BlockHandles key={b.id} block={b} type={b.src ? 'image' : (b.expression ? 'ggb' : (b.code ? 'mermaid' : (b.content?.root ? 'mindmap' : (b.content?.includes('\\') ? 'math' : 'text'))))} scale={scale} isHovered={hoveredBlockId === b.id || connectingState} onStartConnection={handleStartConnection} onCompleteConnection={handleCompleteConnection} canvasScale={scale} canvasPan={position} />)}
        <SelectionGroupOverlay
          bounds={groupBounds}
          onMove={handleGroupMove}
          onResize={handleGroupResize}
          onStartInteraction={() => setIsDraggingSelection(true)}
          onEndInteraction={() => {
            setIsDraggingSelection(false);
            saveToHistory();
          }}
          onDoubleClick={handleGroupDoubleClick}
          isLocked={isSelectedLocked}
          activeTool={activeTool}
          canvasScale={scale}
          canvasPan={position}
        />
      </div>

      {groupBounds && (selectedIds.length > 0 || selectedStrokeIds.length > 0) && <SelectionToolbar bounds={groupBounds} scale={scale} position={position} viewportWidth={stageSize.width} onGroup={handleGroup} onLock={handleLock} onBringToFront={handleBringToFront} onSendToBack={handleSendToBack} isGrouped={isSelectedGrouped} isLocked={isSelectedLocked} onConvertToMath={handleInkToMath} isConverting={isMathConverting} />}

    </div>
  );
}
);

export default CanvasArea;
