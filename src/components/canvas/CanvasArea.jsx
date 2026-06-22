import React, { forwardRef, useState, useEffect, useLayoutEffect, useRef, useCallback, useImperativeHandle, memo } from 'react';
import { Stage, Layer, Line, Path, Rect, Circle, Group } from 'react-konva';
import { queryGemini, isAiFeatureEnabled } from '../../services/AIService';
import { MathService } from '../../services/MathService';
import { useNotes } from '../../contexts/NotesContext';
import { ExportService } from '../../services/ExportService';
import { Sigma, Zap } from 'lucide-react';
import AIPanel from '../AIPanel';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useShallow } from 'zustand/react/shallow';
import { simplifyPoints } from '../../utils/simplify';

import TextBlock from './TextBlock';
import ImageBlock from './ImageBlock';
import { StorageService } from '../../services/StorageService';
import CodeBlock from './CodeBlock';
import MathBlock from './MathBlock';
import LinearTransformBlock from './LinearTransformBlock';
import TaylorVisualizer from './visualizers/TaylorVisualizer';
import VectorFieldVisualizer from './visualizers/VectorFieldVisualizer';
import PhasePortraitVisualizer from './visualizers/PhasePortraitVisualizer';
import ConformalVisualizer from './visualizers/ConformalVisualizer';
import FourierVisualizer from './visualizers/FourierVisualizer';
import GGBBlock from './GGBBlock';
import MermaidBlock from './MermaidBlock';
import MindmapBlock from './MindmapBlock';
import PDFBlock from './PDFBlock';
import TableBlock from './TableBlock';
import MathRecognitionService from '../../services/MathRecognitionService';
import {
  transformShapePoints,
  recognizeViaGoogle,
  fitGeometry,
  generateFittedPoints,
  generateLiveShapePoints
} from '../../services/ShapeRecognitionService';
import SelectionGroupOverlay from './SelectionGroupOverlay';
import SelectionToolbar from './SelectionToolbar';
import ConnectionLayer from './ConnectionLayer';
import BlockHandles from './BlockHandles';
import MiniMap from './MiniMap';
import ScientificOmnibar from './ScientificOmnibar';
import { STEMService } from '../../services/STEMService';
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

// Helper to reliably stringify canvas content for comparisons (independent of key order)
const sortedStringify = (obj) => {
  return JSON.stringify(obj);
};

const compressImageBase64 = (base64Str, maxWidth = 1000, quality = 0.6) => {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith('data:image/')) {
      resolve(base64Str);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    img.onerror = () => {
      resolve(base64Str);
    };
    img.src = base64Str;
  });
};

// Helper to isolate only the canvas properties to avoid mismatch on other document-specific properties
const extractCanvasContent = (content) => {
  if (!content) return {};
  return {
    strokes: content.strokes || [],
    textBlocks: content.textBlocks || [],
    imageBlocks: content.imageBlocks || [],
    codeBlocks: content.codeBlocks || [],
    mathBlocks: content.mathBlocks || [],
    ggbBlocks: content.ggbBlocks || [],
    mermaidBlocks: content.mermaidBlocks || [],
    mindmapBlocks: content.mindmapBlocks || [],
    pdfBlocks: content.pdfBlocks || [],
    tableBlocks: content.tableBlocks || [],
    connections: content.connections || [],
  };
};

// Helper to calculate intersections (t in [0, 1]) between segment p1->p2 and a circle at C with radius R
const getSegmentCircleIntersections = (p1, p2, C, R) => {
  const vx = p2.x - p1.x;
  const vy = p2.y - p1.y;
  const dx = p1.x - C.x;
  const dy = p1.y - C.y;

  const a = vx * vx + vy * vy;
  if (a === 0) return [];

  const b = 2 * (vx * dx + vy * dy);
  const c = dx * dx + dy * dy - R * R;

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return [];

  const tVals = [];
  const sqrtDisc = Math.sqrt(discriminant);
  
  const t1 = (-b - sqrtDisc) / (2 * a);
  if (t1 >= 0 && t1 <= 1) tVals.push(t1);

  const t2 = (-b + sqrtDisc) / (2 * a);
  if (t2 >= 0 && t2 <= 1) tVals.push(t2);

  return tVals.sort((x, y) => x - y);
};

const sliceStroke = (stroke, eraserPt, eraserRadius) => {
  const points = stroke.points;
  if (!points || points.length === 0) return [];
  if (points.length === 1) {
    const dist = Math.hypot(points[0].x - eraserPt.x, points[0].y - eraserPt.y);
    return dist > eraserRadius ? [stroke] : [];
  }

  const segments = [];
  let currentSegment = [];

  const addPoint = (pt) => {
    if (currentSegment.length > 0) {
      const last = currentSegment[currentSegment.length - 1];
      if (Math.hypot(last.x - pt.x, last.y - pt.y) < 0.01) return;
    }
    currentSegment.push(pt);
  };

  const closeSegment = () => {
    if (currentSegment.length >= 2) {
      segments.push(currentSegment);
    }
    currentSegment = [];
  };

  let p1 = points[0];
  let p1Inside = Math.hypot(p1.x - eraserPt.x, p1.y - eraserPt.y) <= eraserRadius;

  if (!p1Inside) {
    addPoint(p1);
  }

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    
    const d1 = Math.hypot(p1.x - eraserPt.x, p1.y - eraserPt.y);
    const d2 = Math.hypot(p2.x - eraserPt.x, p2.y - eraserPt.y);
    
    const p1In = d1 <= eraserRadius;
    const p2In = d2 <= eraserRadius;

    const intersections = getSegmentCircleIntersections(p1, p2, eraserPt, eraserRadius);

    if (p1In && p2In) {
      // Both inside: do nothing
    } else if (!p1In && !p2In) {
      if (intersections.length === 2) {
        const t1 = intersections[0];
        const t2 = intersections[1];
        
        const pt1 = {
          x: p1.x + t1 * (p2.x - p1.x),
          y: p1.y + t1 * (p2.y - p1.y),
          pressure: p1.pressure !== undefined ? p1.pressure : 0.5
        };
        const pt2 = {
          x: p1.x + t2 * (p2.x - p1.x),
          y: p1.y + t2 * (p2.y - p1.y),
          pressure: p2.pressure !== undefined ? p2.pressure : 0.5
        };

        addPoint(pt1);
        closeSegment();
        addPoint(pt2);
        addPoint(p2);
      } else {
        addPoint(p2);
      }
    } else if (!p1In && p2In) {
      const t = intersections[0];
      if (t !== undefined) {
        const pt = {
          x: p1.x + t * (p2.x - p1.x),
          y: p1.y + t * (p2.y - p1.y),
          pressure: p1.pressure !== undefined ? p1.pressure : 0.5
        };
        addPoint(pt);
      }
      closeSegment();
    } else if (p1In && !p2In) {
      const t = intersections[0];
      if (t !== undefined) {
        const pt = {
          x: p1.x + t * (p2.x - p1.x),
          y: p1.y + t * (p2.y - p1.y),
          pressure: p2.pressure !== undefined ? p2.pressure : 0.5
        };
        addPoint(pt);
      }
      addPoint(p2);
    }
  }

  if (currentSegment.length >= 2) {
    segments.push(currentSegment);
  }

  return segments.map(seg => ({
    ...stroke,
    id: generateId(),
    points: seg,
    isNeatShape: false, // Split perfected shapes become open lines
    shapeType: undefined,
    isOpen: true
  }));
};

// --- Optimized Sub-Component ---
const MemoizedStroke = React.memo(({ stroke, isSelected, isDarkMode }) => {
  const strokeSmoothingEnabled = useCanvasStore(state => state.strokeSmoothingEnabled);
  const isHighlighter = stroke.type === 'highlighter';
  const shapeRef = React.useRef(null);
  const baseColor = React.useMemo(() => resolveColor(stroke.color, isDarkMode), [stroke.color, isDarkMode]);
  const highlightColor = '#6366f1';

  const pathData = React.useMemo(() => {
    if (stroke.isNeatShape) {
      return { d: getNeatPathData(stroke.points, stroke.shapeType, stroke.isOpen), isArrow: stroke.shapeType === 'arrow' };
    }

    const strokeSmoothing = strokeSmoothingEnabled ? (stroke.smoothing !== undefined ? stroke.smoothing : 0.5) : 0;
    const options = isHighlighter
      ? { size: stroke.width, thinning: 0, smoothing: strokeSmoothing, streamline: strokeSmoothing }
      : { size: stroke.width, thinning: 0.5, smoothing: strokeSmoothing, streamline: strokeSmoothing };

    return { d: getSvgPathFromStroke(stroke.points, options), isArrow: false };
  }, [stroke.points, stroke.width, stroke.isNeatShape, stroke.shapeType, stroke.isOpen, isHighlighter, stroke.smoothing, strokeSmoothingEnabled]);

  React.useEffect(() => {
    if (shapeRef.current) {
      // We removed shapeRef.current.cache() to maintain full vector resolution on zoom.
      // Konva will now re-render from paths on each frame, ensuring sharpness.
      shapeRef.current.getLayer()?.batchDraw();
    }
  }, [pathData, baseColor]);

  const commonProps = {
    ref: shapeRef,
    data: pathData.d,
    opacity: isHighlighter ? 0.5 : 1,
    listening: false
  };

  const selectionGlow = isSelected && (
    <Path
      {...commonProps}
      fill={stroke.isNeatShape ? 'transparent' : highlightColor}
      stroke={highlightColor}
      strokeWidth={stroke.isNeatShape ? stroke.width + 6 : 8}
      opacity={0.5}
      lineCap="round"
      lineJoin="round"
      dash={[4, 4]}
    />
  );

  if (stroke.isNeatShape) {
    return (
      <Group>
        {selectionGlow}
        <Path
          {...commonProps}
          stroke={baseColor}
          strokeWidth={stroke.width}
          lineCap="round"
          lineJoin="round"
        />
      </Group>
    );
  }

  return (
    <Group>
      {selectionGlow}
      <Path
        {...commonProps}
        fill={baseColor}
      />
    </Group>
  );
});

const TILE_SIZE = 1500; // Define dimensions for spatial grid caching tiles

const StrokeTile = memo(({ tileKey, strokes, isDarkMode, selectedStrokeIds }) => {
  const unselectedStrokes = strokes.filter(s => !selectedStrokeIds.includes(s.id));

  if (unselectedStrokes.length === 0) return null;

  return (
    <Group>
      {unselectedStrokes.map(s => (
        <MemoizedStroke
          key={s.id}
          stroke={s}
          isSelected={false}
          isDarkMode={isDarkMode}
        />
      ))}
    </Group>
  );
});

// --- Componente Principal ---
const CanvasArea = forwardRef(({
  note: propNote, updateContent: propUpdateContent, activeTool, isDarkMode, pdfToImport, onPdfImported,
  penType, apiKey, scale,
  penConfig, highlighterConfig,
  panOffset: position, setAiPanel, onMoveView, isMiniMapEnabled, setActiveTool,
  onOpenSettings, activeForcedShape, setActiveForcedShape, setExportStatus, isShadow
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
  const dragRafRef = useRef(null);
  const nextDragPosRef = useRef(null);
  const interactionInitialBlocksRef = useRef([]);
  const interactionInitialBoundsRef = useRef(null);

  // [OPTIMIZATION] Imperative Drawing Refs
  const activeStrokePathRef = useRef(null);
  const activeStrokePointsRef = useRef([]);
  const activeStrokeConfigRef = useRef({ width: 5 });
  const rafRef = useRef(null);
  const hasUpdatesRef = useRef(false);
  const cachedContainerRect = useRef(null); // Cache getBoundingClientRect to avoid layout thrashing

  // [FASE 3 OPTIMIZATION] Konva Cache & Baking for static strokes Group
  const strokesGroupRef = useRef(null);
  const selectedStrokesGroupRef = useRef(null);

  // [PERF] Imperative DOM refs for zero-React-render transform updates
  const konvaLayerRefs = useRef([]);  // Array of Konva Layer refs
  const infiniteCanvasRef = useRef(null);  // The .infinite-canvas div
  const glassBlocksLayerRef = useRef(null);  // The .glass-blocks-layer div
  const positionRef = useRef(position);  // Track current position for imperative access
  const scaleRef = useRef(scale);  // Track current scale for imperative access
  const selectionRectRef = useRef(null); // { startX, startY, currentX, currentY } for selection rectangle coordinates
  const selectionRectKonvaRef = useRef(null); // Reference to Konva Rect element for selection box rendering

  // Keep refs in sync with props, and reset glass layer compensating transform
  // CRITICAL: useLayoutEffect runs synchronously BEFORE the browser paints.
  // useEffect ran AFTER paint, causing 1 frame where blocks had BOTH the new React position
  // AND the old delta CSS transform on the container = double-offset flicker.
  useLayoutEffect(() => {
    positionRef.current = position;
    scaleRef.current = scale;
    // When React re-renders with final position/scale, blocks reposition correctly,
    // so reset the compensating CSS transform on the glass layer
    if (glassBlocksLayerRef.current) {
      glassBlocksLayerRef.current.style.transform = 'translateZ(0)';
    }
  }, [position, scale]);



  const penPointerRef = useRef(null);
  const eraserCircleRef = useRef(null);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [stageSize, setStageSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  const [patternImage, setPatternImage] = useState(null);
  const [patternImageUrl, setPatternImageUrl] = useState('');
  const paperPattern = activeNote?.content?.background || 'dots';
  const backgroundSize = activeNote?.content?.backgroundSize || 40;

  useEffect(() => {
    const canvas = document.createElement('canvas');
    const size = Math.round(paperPattern === 'dots' ? (backgroundSize === 40 ? 24 : backgroundSize * 0.6) : backgroundSize);
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
    setPatternImageUrl(canvas.toDataURL());
  }, [paperPattern, backgroundSize, isDarkMode]);
  useEffect(() => {
    const handleGlobalShortcuts = (e) => {
      // Global shortcuts were here
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, []);

  // Handle container resizing (e.g. devtools toggle, sidebar toggle, window resizing)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setStageSize({ width, height });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);


  // Estados Unificados via Zustand (Fase 1 Otimização)
  const strokes = useCanvasStore(useShallow(state => Object.values(state.strokes)));
  const textBlocks = useCanvasStore(useShallow(state => Object.values(state.textBlocks)));
  const imageBlocks = useCanvasStore(useShallow(state => Object.values(state.imageBlocks)));
  const codeBlocks = useCanvasStore(useShallow(state => Object.values(state.codeBlocks)));
  const mathBlocks = useCanvasStore(useShallow(state => Object.values(state.mathBlocks)));
  const ggbBlocks = useCanvasStore(useShallow(state => Object.values(state.ggbBlocks)));
  const mermaidBlocks = useCanvasStore(useShallow(state => Object.values(state.mermaidBlocks)));
  const mindmapBlocks = useCanvasStore(useShallow(state => Object.values(state.mindmapBlocks)));
  const pdfBlocks = useCanvasStore(useShallow(state => Object.values(state.pdfBlocks)));
  const tableBlocks = useCanvasStore(useShallow(state => Object.values(state.tableBlocks)));
  const connections = useCanvasStore(useShallow(state => Object.values(state.connections)));

  const setStrokes = useCanvasStore(state => state.setStrokes);
  const setTextBlocks = useCanvasStore(state => state.setTextBlocks);
  const setImageBlocks = useCanvasStore(state => state.setImageBlocks);
  const setCodeBlocks = useCanvasStore(state => state.setCodeBlocks);
  const setMathBlocks = useCanvasStore(state => state.setMathBlocks);
  const setGgbBlocks = useCanvasStore(state => state.setGgbBlocks);
  const setMermaidBlocks = useCanvasStore(state => state.setMermaidBlocks);
  const setMindmapBlocks = useCanvasStore(state => state.setMindmapBlocks);
  const setPdfBlocks = useCanvasStore(state => state.setPdfBlocks);
  const setTableBlocks = useCanvasStore(state => state.setTableBlocks);
  const setConnections = useCanvasStore(state => state.setConnections);

  const selectedIds = useCanvasStore(state => state.selectedIds);
  const setSelectedIds = useCanvasStore(state => state.setSelectedIds);
  const selectedStrokeIds = useCanvasStore(state => state.selectedStrokeIds);
  const setSelectedStrokeIds = useCanvasStore(state => state.setSelectedStrokeIds);
  const selectedConnectionIds = useCanvasStore(state => state.selectedConnectionIds);
  const setSelectedConnectionIds = useCanvasStore(state => state.setSelectedConnectionIds);

  const lastSelectedStrokeIdsRef = useRef(selectedStrokeIds);

  useEffect(() => {
    selectedStrokesGroupRef.current?.getLayer()?.batchDraw();
  }, [selectedStrokeIds]);

  const groupedTiles = React.useMemo(() => {
    const tiles = {};
    strokes.forEach(s => {
      if ((s.zIndex || 0) >= 100) return;
      const bounds = getStrokeBounds(s.points);
      if (!bounds) return;
      const tileX = Math.floor((bounds.x + bounds.width / 2) / TILE_SIZE);
      const tileY = Math.floor((bounds.y + bounds.height / 2) / TILE_SIZE);
      const key = `${tileX},${tileY}`;
      if (!tiles[key]) tiles[key] = [];
      tiles[key].push(s);
    });
    return tiles;
  }, [strokes]);

  const isDrawing = useCanvasStore(state => state.isDrawing);
  const setIsDrawing = useCanvasStore(state => state.setIsDrawing);
  const isErasing = useCanvasStore(state => state.isErasing);
  const setIsErasing = useCanvasStore(state => state.setIsErasing);
  const isDraggingSelection = useCanvasStore(state => state.isDraggingSelection);
  const setIsDraggingSelection = useCanvasStore(state => state.setIsDraggingSelection);

  const editingBlockId = useCanvasStore(state => state.editingBlockId);
  const setEditingBlockId = useCanvasStore(state => state.setEditingBlockId);
  const hoveredBlockId = useCanvasStore(state => state.hoveredBlockId);
  const setHoveredBlockId = useCanvasStore(state => state.setHoveredBlockId);
  const connectingState = useCanvasStore(state => state.connectingState);
  const setConnectingState = useCanvasStore(state => state.setConnectingState);
  const eraserCursorPos = useCanvasStore(state => state.eraserCursorPos);
  const setEraserCursorPos = useCanvasStore(state => state.setEraserCursorPos);

  const loadNoteData = useCanvasStore(state => state.loadNoteData);
  const eraserType = useCanvasStore(state => state.eraserType);
  const eraserSize = useCanvasStore(state => state.eraserSize);
  const strokeSmoothing = useCanvasStore(state => state.strokeSmoothing);
  const strokeSmoothingEnabled = useCanvasStore(state => state.strokeSmoothingEnabled);

  // Estados Gestuais locais temporários (Preservados locais para evitar poluição global)
  const [currentStroke, setCurrentStroke] = useState(null);
  const [ghostShape, setGhostShape] = useState(null);
  const [postSnapManipulation, setPostSnapManipulation] = useState(null);
  const [isNoteLoaded, setIsNoteLoaded] = useState(false);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  // [OPTIMIZATION] Unified Render Loop - capped to last N points for consistent perf
  const performRender = useCallback(() => {
    if (activeStrokePathRef.current && hasUpdatesRef.current) {
      const width = activeStrokeConfigRef.current.width;
      const currentSmoothing = strokeSmoothingEnabled ? strokeSmoothing : 0;
      const allPts = activeStrokePointsRef.current;
      // [PERF] Only feed last 200 points to getStroke during live drawing.
      // This keeps frame time constant regardless of stroke length.
      // The full stroke is used on pointerUp for final render.
      const svgData = getSvgPathFromStroke(allPts, {
        size: width,
        thinning: 0.6,
        smoothing: currentSmoothing,
        streamline: currentSmoothing,
        simulatePressure: false
      });
      activeStrokePathRef.current.setData(svgData);
      activeStrokePathRef.current.getLayer()?.batchDraw();
      hasUpdatesRef.current = false;
    }
    rafRef.current = requestAnimationFrame(performRender);
  }, [strokeSmoothing, strokeSmoothingEnabled]);

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

    if (!patternImageUrl) return { backgroundColor: 'transparent' };

    return {
      backgroundImage: `url(${patternImageUrl})`,
      backgroundRepeat: 'repeat'
    };
  };

  // [HYBRID EXPORT] SVG injection support for background captures
  const prepareExport = useCallback(() => {
    const canvasEl = containerRef.current?.querySelector('.infinite-canvas');
    if (!canvasEl) return null;

    // 1. Compute content bounds
    const allBlocks = [...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks, ...pdfBlocks, ...tableBlocks];
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
      const resolvedColorHex = resolveColor(s.color, isDarkMode);
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
  // Handled by NoteWorkspace via useImperativeHandle / shadow renderer.

  const saveToHistory = useCallback(() => saveNoteHistory(activeNoteId), [saveNoteHistory, activeNoteId]);

  useEffect(() => {
    setSelectedIds([]);
    setSelectedStrokeIds([]);
    selectionRectRef.current = null;
    if (selectionRectKonvaRef.current) {
      selectionRectKonvaRef.current.setAttrs({ visible: false });
      selectionRectKonvaRef.current.getLayer()?.batchDraw();
    }
    setIsDraggingSelection(false);
    setEditingBlockId(null);
  }, [activeTool]);

  const currentAttributes = () => {
    if (activeTool === 'highlighter') return { color: highlighterConfig.color, width: highlighterConfig.width, type: 'highlighter' };
    return { color: penConfig.color, width: penConfig.width, type: 'pen', isDynamic: penConfig.isDynamic };
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
      } else if (type === 'ggb') {
        const selectedGGB = ggbBlocks.find(b => selectedIds.includes(b.id));
        if (selectedGGB) {
          setGgbBlocks(prev => prev.map(b => b.id === selectedGGB.id ? { ...b, ...content } : b));
        } else {
          setGgbBlocks(prev => [...prev, { id: newId, x: blockX, y: blockY, width: 600, height: 450, ...content }]);
        }
      } else if (type === 'LATEX' || type === 'math') {
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
        ...mindmapBlocks,
        ...pdfBlocks,
        ...tableBlocks
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
    finalizeExport,

    // [PERF] Imperative transform — updates DOM directly, bypassing React render cycle
    applyTransform: (newPan, newScale) => {
      positionRef.current = newPan;
      scaleRef.current = newScale;

      // 1. Update all Konva layers directly via their native API
      konvaLayerRefs.current.forEach(layer => {
        if (layer) {
          layer.x(newPan.x);
          layer.y(newPan.y);
          layer.scaleX(newScale);
          layer.scaleY(newScale);
          layer.batchDraw();
        }
      });

      // 2. Update the CSS-transformed infinite-canvas div
      if (infiniteCanvasRef.current) {
        infiniteCanvasRef.current.style.transform = `translate(${newPan.x}px, ${newPan.y}px) scale(${newScale})`;
      }

      // 3. Update glass blocks layer — each block computes its own screen position from canvasScale/canvasPan props,
      //    but during imperative motion we update them via CSS transform on the container instead
      if (glassBlocksLayerRef.current) {
        // During imperative motion, we apply a delta transform to the glass layer
        // The blocks are positioned based on the React-committed position/scale, so we need to
        // compute the delta from the last React-committed values and apply it as a CSS offset
        const reactPan = { x: position.x, y: position.y };  // Last React-committed values
        const reactScale = scale;
        const dx = newPan.x - reactPan.x;
        const dy = newPan.y - reactPan.y;
        const ds = newScale / reactScale;

        // Apply a compensating transform: translate by delta, scale around origin
        // This works because blocks are already positioned at screenX/screenY based on reactPan/reactScale
        glassBlocksLayerRef.current.style.transform = `translateZ(0) translate(${dx}px, ${dy}px) scale(${ds})`;
        glassBlocksLayerRef.current.style.transformOrigin = '0 0';
      }
    }
  };

  useImperativeHandle(ref, () => imperativeHandle, [position, scale, textBlocks, imageBlocks, codeBlocks, mathBlocks, ggbBlocks, connections, strokes, saveToHistory]);

  const removeAnyBlock = useCallback((id) => {
    setTextBlocks(prev => prev.filter(b => String(b.id) !== String(id)));
    setImageBlocks(prev => prev.filter(b => String(b.id) !== String(id)));
    setCodeBlocks(prev => prev.filter(b => String(b.id) !== String(id)));
    setMathBlocks(prev => prev.filter(b => String(b.id) !== String(id)));
    setGgbBlocks(prev => prev.filter(b => String(b.id) !== String(id)));
    setMermaidBlocks(prev => prev.filter(b => String(b.id) !== String(id)));
    setMindmapBlocks(prev => prev.filter(b => String(b.id) !== String(id)));
    setPdfBlocks(prev => prev.filter(b => String(b.id) !== String(id)));
    setTableBlocks(prev => prev.filter(b => String(b.id) !== String(id)));
  }, []);

  const updateAnyBlock = useCallback((type, id, newData) => {
    if (newData.isDeleted) {
      removeAnyBlock(id);
      return;
    }
    if (type === 'text') setTextBlocks(prev => prev.map(b => String(b.id) === String(id) ? { ...b, ...newData } : b));
    if (type === 'code') setCodeBlocks(prev => prev.map(b => String(b.id) === String(id) ? { ...b, ...newData } : b));
    if (type === 'math') setMathBlocks(prev => prev.map(b => String(b.id) === String(id) ? { ...b, ...newData } : b));
    if (type === 'image') setImageBlocks(prev => prev.map(b => String(b.id) === String(id) ? { ...b, ...newData } : b));
    if (type === 'ggb') setGgbBlocks(prev => prev.map(b => String(b.id) === String(id) ? { ...b, ...newData } : b));
    if (type === 'mermaid') setMermaidBlocks(prev => prev.map(b => String(b.id) === String(id) ? { ...b, ...newData } : b));
    if (type === 'mindmap') setMindmapBlocks(prev => prev.map(b => String(b.id) === String(id) ? { ...b, ...newData } : b));
    if (type === 'pdf') setPdfBlocks(prev => prev.map(b => String(b.id) === String(id) ? { ...b, ...newData } : b));
    if (type === 'table') setTableBlocks(prev => prev.map(b => String(b.id) === String(id) ? { ...b, ...newData } : b));
  }, [removeAnyBlock]);

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
    dup(textBlocks, setTextBlocks); dup(imageBlocks, setImageBlocks); dup(codeBlocks, setCodeBlocks); dup(mathBlocks, setMathBlocks); dup(ggbBlocks, setGgbBlocks); dup(mermaidBlocks, setMermaidBlocks); dup(mindmapBlocks, setMindmapBlocks); dup(pdfBlocks, setPdfBlocks); dup(tableBlocks, setTableBlocks);
    if (selectedStrokeIds.length > 0) {
      setStrokes(prev => {
        const items = prev.filter(s => selectedStrokeIds.includes(s.id));
        const n = items.map(s => ({ ...s, id: Date.now() + Math.random(), points: s.points.map(p => ({ x: p.x + offset, y: p.y + offset })) }));
        n.forEach(x => newStrokeIds.push(x.id)); return [...prev, ...n];
      });
    }
    setTimeout(() => { setSelectedIds(newIds); setSelectedStrokeIds(newStrokeIds); }, 50);
  }, [selectedIds, selectedStrokeIds, saveToHistory, textBlocks, imageBlocks, codeBlocks, mathBlocks, ggbBlocks, mermaidBlocks, mindmapBlocks, tableBlocks, strokes]);

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
    
    const latexSteps = safe.map(s => {
      const label = s?.label || 'Passo';
      const expr = s?.expr || '';
      
      const hyphenIdx = expr.indexOf(' - ');
      if (hyphenIdx !== -1) {
        const desc = expr.substring(0, hyphenIdx).trim();
        const math = expr.substring(hyphenIdx + 3).trim();
        return `\\text{${label}: ${desc}} \\quad ${math}`;
      } else {
        const looksLikeTextOnly = /^[a-zA-Z\s\.,!\?áéíóúãõçâêôÀÉÍÓÚÂÊÔÇ]+$/.test(expr);
        if (looksLikeTextOnly) {
          return `\\text{${label}: ${expr}}`;
        } else {
          return `\\text{${label}: } ${expr}`;
        }
      }
    });

    const content = `\\mathbf{\\text{PASSOS DE RESOLUÇÃO:}}\\\\[12pt]` + latexSteps.join('\\\\[12pt]');
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
  const isResizingRef = useRef(false); // true when resize is active, blocks drag logic in handlePointerMove

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
          setPdfBlocks(prev => prev.filter(b => !selectedIds.includes(b.id)));
          setTableBlocks(prev => prev.filter(b => !selectedIds.includes(b.id)));
          setStrokes(prev => prev.filter(s => !selectedStrokeIds.includes(s.id)));
          setConnections(prev => prev.filter(c => !selectedConnectionIds.includes(c.id)));
          setSelectedIds([]); setSelectedStrokeIds([]); setSelectedConnectionIds([]);
        }
        return;
      }
      if (isCtrl && (e.key === 'd' || e.key === 'D')) { e.preventDefault(); duplicateSelection(); }
      if (isCtrl && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setSelectedIds([...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks, ...pdfBlocks, ...tableBlocks].map(b => b.id));
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
        pdf: pdfBlocks.filter(b => selectedIds.includes(b.id)),
        table: tableBlocks.filter(b => selectedIds.includes(b.id)),
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
      setPdfBlocks(prev => prev.filter(b => !selectedIds.includes(b.id)));
      setTableBlocks(prev => prev.filter(b => !selectedIds.includes(b.id)));
      setStrokes(prev => prev.filter(s => !selectedStrokeIds.includes(s.id)));

      setSelectedIds([]);
      setSelectedStrokeIds([]);
    };

    const handlePaste = async (e) => {
      if (['TEXTAREA', 'INPUT'].includes(document.activeElement.tagName)) return;

      const pt = screenToCanvas(lastMousePosRef.current.x, lastMousePosRef.current.y);
      const textData = e.clipboardData.getData('text');
      if (textData) {
        try {
          const parsed = JSON.parse(textData);
          if (parsed?.app === 'connected-notes' && parsed?.data) {
            e.preventDefault(); saveToHistory();
            const { text, image, code, math, ggb, mermaid, mindmap, table, strokes: pstStrokes } = parsed.data;

            // Calculate bounds to center at cursor
            const allNodes = [...(text || []), ...(image || []), ...(code || []), ...(math || []), ...(ggb || []), ...(mermaid || []), ...(mindmap || []), ...(table || [])];
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
            if (table) setTableBlocks(p => [...p, ...table.map(b => {
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
            const file = items[i].getAsFile();
            if (file) {
              try {
                const mediaUrl = await StorageService.saveMediaFile(file);
                saveToHistory();
                setImageBlocks(p => [...p, { id: generateId(), x: pt.x - 150, y: pt.y - 150, width: 300, height: 300, src: mediaUrl, extractedText: '' }]);
              } catch (e) { console.error("Error saving media:", e); }
            }
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

    const handleDrop = async (e) => {
      e.preventDefault();
      const pt = screenToCanvas(e.clientX, e.clientY);
      const files = e.dataTransfer.files;

      if (files && files.length > 0) {
        saveToHistory();
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.type.startsWith('image/')) {
            try {
              const mediaUrl = await StorageService.saveMediaFile(file);
              setImageBlocks(p => [...p, {
                id: generateId(),
                x: pt.x - 150 + (i * 20),
                y: pt.y - 150 + (i * 20),
                width: 300,
                height: 300,
                src: mediaUrl,
                extractedText: ''
              }]);
            } catch (e) { console.error("Error saving dropped media:", e); }
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

  // Carrega Nota (Unificado) - Only triggers on NOTE SWITCH or UNDO/REDO
  // CRITICAL: This must NOT trigger from remote sync overwriting content,
  // otherwise the user's local edits get wiped out.
  useEffect(() => {
    if (activeNote) {
      // Case 1: User switched to a different note → full reload
      if (activeNote.id !== lastLoadedNoteId.current) {
        const content = extractCanvasContent(activeNote.content);
        const contentJson = sortedStringify(content);
        setIsNoteLoaded(false);
        loadNoteData(content);
        lastLoadedNoteId.current = activeNote.id;
        lastSavedJson.current = contentJson;
        setIsNoteLoaded(true);
        return;
      }

      // Case 2: Same note, but content changed (undo/redo from NotesContext)
      // Only reload if the content is actually different from what we last saved
      const content = extractCanvasContent(activeNote.content);
      const contentJson = sortedStringify(content);
      if (contentJson !== lastSavedJson.current) {
        setIsNoteLoaded(false);
        loadNoteData(content);
        lastSavedJson.current = contentJson;
        setIsNoteLoaded(true);
      }
    }
  }, [activeNote?.id, activeNote?.content, loadNoteData]);

  // Salva Nota (Unificado) - Optimized to avoid stuttering during interaction
  useEffect(() => {
    // SUSPEND auto-save while dragging to prevent stuttering and re-render cycles
    // CRITICAL SAFETY CHECK: Only save if the note is loaded, matched, and content actually changed
    if (activeNoteId && isNoteLoaded && !isDraggingSelection && activeNoteId === lastLoadedNoteId.current) {
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
        pdfBlocks: pdfBlocks,
        tableBlocks: tableBlocks,
        connections
      };

      const contentJson = sortedStringify(content);

      // Evita loops infinitos e gravações redundantes se o conteúdo for idêntico
      if (contentJson === lastSavedJson.current) {
        return;
      }

      const timer = setTimeout(() => {
        lastSavedJson.current = contentJson;
        if (propUpdateContent) {
          propUpdateContent(content);
        } else {
          updateNoteContent(activeNoteId, content);
        }
      }, 1500); // Debounce de 1.5s para otimizar o salvamento no Google Drive
      return () => {
        clearTimeout(timer);
        // Force immediate save of pending changes when switching pages or unmounting
        if (lastSavedJson.current !== contentJson) {
          lastSavedJson.current = contentJson;
          if (propUpdateContent) {
            propUpdateContent(content);
          } else {
            updateNoteContent(activeNoteId, content);
          }
        }
      };
    }
  }, [strokes, textBlocks, imageBlocks, codeBlocks, mathBlocks, ggbBlocks, mermaidBlocks, mindmapBlocks, pdfBlocks, tableBlocks, connections, activeNoteId, isNoteLoaded, isDraggingSelection, propUpdateContent]);

  // PDF & Image Handlers
  const importPdfAt = useCallback(async (file, startX, startY) => {
    if (!file || !window.pdfjsLib) return;
    setIsLoadingPdf(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const pdfDataUrl = ev.target.result;
          const pdf = await window.pdfjsLib.getDocument(new Uint8Array(await file.arrayBuffer())).promise;
          const firstPage = await pdf.getPage(1);
          const vp = firstPage.getViewport({ scale: 1.0 });
          let dw = vp.width, dh = vp.height;
          if (dw > 800) { dh *= (800 / dw); dw = 800; }

          const mediaUrl = await StorageService.saveMediaFile(file);
          const pdfBlock = {
            id: generateId(),
            type: 'pdf',
            fileName: file.name,
            x: startX,
            y: startY,
            pdfRaw: mediaUrl,
            totalPages: pdf.numPages,
            width: dw,
            height: dh + 120,
            zIndex: 51,
            color: 'rose'
          };

          saveToHistory();
          setPdfBlocks(p => [...p, pdfBlock]);
        } catch (innerErr) {
          console.error("Erro ao analisar páginas do PDF:", innerErr);
          alert("Erro ao ler o documento PDF.");
        } finally {
          setIsLoadingPdf(false);
          onPdfImported?.();
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error("Erro PDF:", e);
      alert("Erro ao importar PDF.");
      setIsLoadingPdf(false);
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

  const allB = [...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks, ...pdfBlocks, ...tableBlocks];
  const groupBounds = getGroupBounds(
    allB.filter(b => selectedIds.includes(b.id)),
    strokes.filter(s => selectedStrokeIds.includes(s.id)),
    connections.filter(c => selectedConnectionIds.includes(c.id)),
    allB
  );
  const handleGroupMove = (dx, dy) => {
    if (!interactionInitialBoundsRef.current) return;
    const sdx = dx / scale;
    const sdy = dy / scale;

    const up = b => {
      if (!selectedIds.includes(b.id)) return b;
      const initial = interactionInitialBlocksRef.current.find(ib => ib.id === b.id);
      if (!initial) return b;

      let nx = initial.x + sdx;
      let ny = initial.y + sdy;

      // Clamping to 0,0
      return { ...b, x: Math.max(0, nx), y: Math.max(0, ny) };
    };

    setTextBlocks(p => p.map(up));
    setImageBlocks(p => p.map(up));
    setCodeBlocks(p => p.map(up));
    setMathBlocks(p => p.map(up));
    setGgbBlocks(p => p.map(up));
    setMermaidBlocks(p => p.map(up));
    setMindmapBlocks(p => p.map(up));
    setPdfBlocks(p => p.map(up));

    setStrokes(p => p.map(s => {
      if (!selectedStrokeIds.includes(s.id)) return s;
      const initial = interactionInitialBlocksRef.current.find(is => is.id === s.id);
      if (!initial) return s;
      return { ...s, points: initial.points.map(pt => ({ x: pt.x + sdx, y: pt.y + sdy })) };
    }));
  };

  const handleGroupResize = (dx, dy, type = 'corner') => {
    // CRITICAL FIX: Use the stable initial bounds captured at the start of the drag
    // to prevent the "drifting bounds" feedback loop that breaks resizing.
    const bounds = interactionInitialBoundsRef.current || groupBounds;
    if (!bounds) return;

    // Screen deltas normalized by scale
    const cdx = dx / scale;
    const cdy = dy / scale;

    const startW = bounds.width;
    const startH = bounds.height;
    const originX = bounds.x;
    const originY = bounds.y;

    let scaleX = 1, scaleY = 1;

    if (type === 'right') {
      const newWidth = Math.max(20, startW + cdx);
      scaleX = newWidth / startW;
      scaleY = 1;
    } else if (type === 'bottom') {
      scaleX = 1;
      const newHeight = Math.max(20, startH + cdy);
      scaleY = newHeight / startH;
    } else if (type === 'corner') {
      const newWidth = Math.max(20, startW + cdx);
      const newHeight = Math.max(20, startH + cdy);
      scaleX = newWidth / startW;
      scaleY = newHeight / startH;
    }

    if (!isFinite(scaleX) || scaleX <= 0 || !isFinite(scaleY) || scaleY <= 0) return;

    const scaleBlock = b => {
      if (!selectedIds.includes(b.id)) return b;
      const initial = interactionInitialBlocksRef.current.find(ib => ib.id === b.id);
      if (!initial) return b;

      const newWidth = initial.width * scaleX;
      const newHeight = initial.height * scaleY;

      const relativeX = initial.x - originX;
      const relativeY = initial.y - originY;

      return {
        ...b,
        fixedSize: true,
        x: Math.max(0, originX + (relativeX * scaleX)),
        y: Math.max(0, originY + (relativeY * scaleY)),
        width: newWidth,
        height: newHeight,
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
    setPdfBlocks(prev => prev.map(scaleBlock));
    setTableBlocks(prev => prev.map(scaleBlock));
    setStrokes(prev => prev.map(s => {
      if (!selectedStrokeIds.includes(s.id)) return s;
      const initial = interactionInitialBlocksRef.current.find(is => is.id === s.id);
      if (!initial) return s;
      return { ...s, points: initial.points.map(p => ({ x: originX + (p.x - originX) * scaleX, y: originY + (p.y - originY) * scaleY })) };
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

    const selectedBlocks = [...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks, ...pdfBlocks, ...tableBlocks]
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

    const block = [...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks, ...pdfBlocks, ...tableBlocks].find(b => String(b.id) === String(id));
    if (!block) return;

    const isHeaderClick = e?.target?.closest('.block-header');

    // Check if clicking with matching tool to trigger direct edit
    const isMatchingTool = (activeTool === 'text' && textBlocks.some(b => b.id === id)) ||
      (activeTool === 'math' && mathBlocks.some(b => b.id === id)) ||
      (activeTool === 'code' && codeBlocks.some(b => b.id === id)) ||
      (activeTool === 'ggb' && ggbBlocks.some(b => b.id === id)) ||
      (['mermaid', 'mindmap'].includes(activeTool) && (mermaidBlocks.some(b => b.id === id) || mindmapBlocks.some(b => b.id === id))) ||
      (activeTool === 'table' && tableBlocks.some(b => b.id === id));

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
          const groupIds = [...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks, ...pdfBlocks, ...tableBlocks]
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

  const getBlockEffectiveZIndex = (b) => {
    if (selectedIds.includes(b.id) && isDraggingSelection) return 1001;
    if (editingBlockId === b.id) return 1000;
    return b.zIndex || 50;
  };

  const findTopBlockAtPoint = (blocksList, pt, padding = 0) => {
    const matchingBlocks = blocksList.filter(b => isPointInBlock(b, pt, padding));
    if (matchingBlocks.length === 0) return null;
    if (matchingBlocks.length === 1) return matchingBlocks[0];

    return [...matchingBlocks].sort((a, b) => {
      const zA = getBlockEffectiveZIndex(a);
      const zB = getBlockEffectiveZIndex(b);
      if (zA !== zB) return zB - zA;

      const idxA = blocksList.indexOf(a);
      const idxB = blocksList.indexOf(b);
      return idxB - idxA;
    })[0];
  };

  const handlePointerDown = (e) => {
    // --- Event Delegation for Blocks ---
    const dragHandle = e.target.closest('[data-drag-handle="true"]');
    if (dragHandle) {
      const blockId = e.target.closest('[data-block-id]')?.getAttribute('data-block-id');
      if (blockId) {
        handleBlockInteract(blockId, e);
        return;
      }
    }

    const isOverPDF = e.target.closest('.pdf-block-wrapper');
    if (window.isOverInteractiveBlock && !isOverPDF) {
      return;
    }

    if (editingBlockId) {
      const isInternalClick = e.target.closest('.block-wrapper, .rich-text-toolbar, .ProseMirror, .ProseMirror-container, .block-content, .ggb-container, .ggb-drag-handle, .modebar, .legend, .connector-handle');
      if (['TEXTAREA', 'INPUT', 'BUTTON'].includes(e.target.tagName) || isInternalClick) {
        return;
      }
      setEditingBlockId(null);
      // Wait a frame to prevent immediate re-creation if tool is active
      setTimeout(() => { }, 0);
    }
    if (e.button !== 0 && e.pointerType !== 'pen') return;

    // Se estivermos com uma ferramenta de bloco, verifique se clicamos em um bloco existente
    if (['text', 'code', 'math', 'ggb', 'mermaid', 'mindmap', 'pdf', 'table'].includes(activeTool)) {
      const allBlocks = [...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks, ...pdfBlocks, ...tableBlocks];
      const pt = screenToCanvas(e.clientX, e.clientY);
      const clickedBlock = findTopBlockAtPoint(allBlocks, pt);

      if (clickedBlock) {
        handleBlockInteract(clickedBlock.id, e);
        return;
      }
    }

    activePointerId.current = e.pointerId; lastPointerPos.current = { x: e.clientX, y: e.clientY };
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      e.preventDefault();
    }
    const pt = screenToCanvas(e.clientX, e.clientY);

    const isEraserAction = (activeTool === 'eraser') || (e.pointerType === 'pen' && (e.buttons & 32));
    const isPenSelection = e.pointerType === 'pen' && (e.buttons & 2);

    if (isEraserAction) {
      e.preventDefault();
      setIsErasing(true);
      saveToHistory();
      const radius = eraserSize / scale;
      if (eraserType === 'vector') {
        setStrokes(prevStrokes => {
          let updated = [];
          prevStrokes.forEach(s => {
            if (isStrokeClicked(s, pt, radius)) {
              const sliced = sliceStroke(s, pt, radius);
              updated.push(...sliced);
            } else {
              updated.push(s);
            }
          });
          return updated;
        });
      } else {
        setStrokes(p => p.filter(s => !isStrokeClicked(s, pt, radius)));
      }
      containerRef.current?.setPointerCapture(e.pointerId);
      return;
    }

    if (isPenSelection) {
      e.preventDefault();
      if (selectedIds.length > 0) setSelectedIds([]);
      if (selectedStrokeIds.length > 0) setSelectedStrokeIds([]);
      if (selectedConnectionIds.length > 0) setSelectedConnectionIds([]);
      selectionRectRef.current = { startX: pt.x, startY: pt.y, currentX: pt.x, currentY: pt.y };
      if (selectionRectKonvaRef.current) {
        selectionRectKonvaRef.current.setAttrs({
          x: pt.x,
          y: pt.y,
          width: 0,
          height: 0,
          visible: true
        });
        selectionRectKonvaRef.current.getLayer()?.batchDraw();
      }
      containerRef.current?.setPointerCapture(e.pointerId);
      return;
    }

    // Pan detection (Space or Middle Mouse)
    if (e.button === 1 || (activeTool === 'cursor' && e.altKey)) {
      setIsPanning(true);
      return;
    }

    if (activeTool === 'cursor' || activeTool === 'ai-lasso') {
      const allB = [...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks, ...pdfBlocks, ...tableBlocks];
      const pt = screenToCanvas(e.clientX, e.clientY);
      const clickedBlock = findTopBlockAtPoint(allB, pt);
      if (clickedBlock && activeTool === 'cursor') {
        const newSel = selectedIds.includes(clickedBlock.id) ? selectedIds : [clickedBlock.id];
        if (!selectedIds.includes(clickedBlock.id)) {
          setSelectedIds([clickedBlock.id]);
          if (selectedStrokeIds.length > 0) setSelectedStrokeIds([]);
          if (selectedConnectionIds.length > 0) setSelectedConnectionIds([]);
        }
        startDrag(e, newSel, []);
        containerRef.current?.setPointerCapture(e.pointerId); return;
      }

      const sid = strokes.find(s => isStrokeClicked(s, pt, 10 / scale))?.id;
      if (sid && activeTool === 'cursor') {
        const newStrokeSel = selectedStrokeIds.includes(sid) ? selectedStrokeIds : [sid];
        if (!selectedStrokeIds.includes(sid)) {
          setSelectedStrokeIds([sid]);
          if (selectedIds.length > 0) setSelectedIds([]);
          if (selectedConnectionIds.length > 0) setSelectedConnectionIds([]);
        }
        startDrag(e, [], newStrokeSel);
        containerRef.current?.setPointerCapture(e.pointerId); return;
      }

      const cid = connections.find(c => {
        const start = getAnchorPointById(c.fromId, c.fromSide, allB);
        const end = getAnchorPointById(c.toId, c.toSide, allB);
        return start && end && isConnectionInRect(c, start, end, { startX: pt.x, startY: pt.y, currentX: pt.x + 1, currentY: pt.y + 1 });
      })?.id;
      if (cid && activeTool === 'cursor') {
        setSelectedConnectionIds(prev => e.shiftKey ? (prev.includes(cid) ? prev.filter(x => x !== cid) : [...prev, cid]) : [cid]);
        if (selectedIds.length > 0) setSelectedIds([]);
        if (selectedStrokeIds.length > 0) setSelectedStrokeIds([]);
        return;
      }

      if (selectedIds.length > 0) setSelectedIds([]);
      if (selectedStrokeIds.length > 0) setSelectedStrokeIds([]);
      if (selectedConnectionIds.length > 0) setSelectedConnectionIds([]);
      selectionRectRef.current = { startX: pt.x, startY: pt.y, currentX: pt.x, currentY: pt.y };
      if (selectionRectKonvaRef.current) {
        selectionRectKonvaRef.current.setAttrs({
          x: pt.x,
          y: pt.y,
          width: 0,
          height: 0,
          visible: true
        });
        selectionRectKonvaRef.current.getLayer()?.batchDraw();
      }
      containerRef.current?.setPointerCapture(e.pointerId); return;
    }
    // ... (drawing logic remains as is for now)
    if (['pen', 'highlighter'].includes(activeTool)) {
      e.preventDefault();
      setIsDrawing(true); const attrs = currentAttributes(); const ipt = { x: pt.x, y: pt.y, pressure: e.pressure };
      activeStrokePointsRef.current = [ipt];
      // Cache container rect once at stroke start to avoid layout thrashing during move
      cachedContainerRect.current = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };

      if (activeForcedShape) {
        // [LIVE SHAPE] Start parametric shape instead of freehand
        setCurrentStroke({
          id: generateId(),
          points: [ipt],
          color: attrs.isDynamic ? 'var(--text-primary)' : attrs.color,
          width: attrs.width / scale,
          type: attrs.type,
          isNeatShape: true,
          isLiveShape: true,
          shapeType: activeForcedShape,
          startPt: ipt,
          smoothing: strokeSmoothing
        });
      } else {
        activeStrokeConfigRef.current = { width: attrs.width / scale }; hasUpdatesRef.current = true;
        setCurrentStroke({
          id: generateId(),
          points: [ipt],
          color: attrs.isDynamic ? 'var(--text-primary)' : attrs.color,
          width: attrs.width / scale,
          type: attrs.type,
          isNeatShape: e.shiftKey,
          isShiftLine: e.shiftKey,
          startPt: ipt,
          smoothing: strokeSmoothing
        });
      }
      containerRef.current?.setPointerCapture(e.pointerId); return;
    }
    if (['text', 'code', 'math', 'ggb', 'mermaid', 'mindmap', 'table'].includes(activeTool)) {
      const nid = generateId(); saveToHistory();
      if (activeTool === 'text') setTextBlocks(p => [...p, { id: nid, x: pt.x, y: pt.y, content: '', width: 350, fixedSize: false }]);
      if (activeTool === 'code') setCodeBlocks(p => [...p, { id: nid, x: pt.x, y: pt.y, content: 'Code...', width: 450, height: 350 }]);
      if (activeTool === 'math') setMathBlocks(p => [...p, { id: nid, x: pt.x, y: pt.y, content: 'E=mc^2', fixedSize: false }]);
      if (activeTool === 'ggb') setGgbBlocks(p => [...p, { id: nid, x: pt.x, y: pt.y, expression: null, width: 400, height: 350 }]);
      if (activeTool === 'mermaid') setMermaidBlocks(p => [...p, { id: nid, type: 'mermaid', x: pt.x, y: pt.y, code: 'graph TD;\nA-->B;\nA-->C;\nB-->D;\nC-->D;', width: 300, height: 200 }]);
      if (activeTool === 'mindmap') setMindmapBlocks(p => [...p, { id: nid, type: 'mindmap', x: pt.x, y: pt.y, width: 400, height: 300, content: null }]);
      if (activeTool === 'table') setTableBlocks(p => [...p, { id: nid, type: 'table', x: pt.x, y: pt.y, rowsCount: 3, colsCount: 3, cells: {}, width: 500, height: 300 }]);
      if (!['mermaid', 'mindmap', 'table'].includes(activeTool)) {
        setEditingBlockId(nid);
      }
      setActiveTool('cursor'); // Reset tool after placement
    }
  };

  const handlePointerMove = (e) => {
    // [FIX] Wacom tablets sometimes change pointerId mid-stroke or drop pointerup. 
    // If it's a pen, it's the only pen, so always adopt its new ID.
    if (e.pointerType === 'pen' && activePointerId.current !== e.pointerId) {
      activePointerId.current = e.pointerId;
    }
    if (activePointerId.current !== null && e.pointerId !== activePointerId.current) return;
    if (activePointerId.current !== null && (e.pointerType === 'touch' || e.pointerType === 'pen')) {
      e.preventDefault();
    }
    const pt = screenToCanvas(e.clientX, e.clientY);
    if (['pen', 'highlighter'].includes(activeTool)) {
      if (penPointerRef.current) {
        penPointerRef.current.style.left = `${e.clientX}px`;
        penPointerRef.current.style.top = `${e.clientY}px`;
      }
    }

    // [PRO CONNECTORS] Hover detection for handles
    if (activeTool === 'cursor' && !isDrawing && !isDraggingSelection && !selectionRectRef.current) {
      const allB = [...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks, ...pdfBlocks, ...tableBlocks];
      const hBlock = findTopBlockAtPoint(allB, pt, 20); // Padding de 20px para manter as alças ativas
      if (hBlock?.id !== hoveredBlockId) setHoveredBlockId(hBlock?.id || null);
    } else if (hoveredBlockId) {
      setHoveredBlockId(null);
    }

    const isEraserActive = activeTool === 'eraser' || (e.pointerType === 'pen' && (e.buttons & 32));
    if (isEraserActive) {
      if (eraserCircleRef.current) {
        eraserCircleRef.current.position({ x: pt.x, y: pt.y });
        eraserCircleRef.current.visible(true);
        eraserCircleRef.current.getLayer()?.batchDraw();
      }
    } else {
      if (eraserCircleRef.current && eraserCircleRef.current.visible()) {
        eraserCircleRef.current.visible(false);
        eraserCircleRef.current.getLayer()?.batchDraw();
      }
    }
    if (connectingState) {
      const blocks = [...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks, ...pdfBlocks, ...tableBlocks];
      let snap = null;
      let minDist = 30; // Snap threshold
      for (const b of blocks) {
        if (b.id === connectingState.fromId) continue;
        ['top', 'bottom', 'left', 'right'].forEach(side => {
          const ap = getAnchorPointById(b.id, side, blocks, hoveredBlockId);
          if (ap) {
            const d = Math.hypot(ap.x - pt.x, ap.y - pt.y);
            if (d < minDist) {
              minDist = d;
              snap = { x: ap.x, y: ap.y, targetId: b.id, targetSide: side };
            }
          }
        });
      }

      if (snap) {
        setConnectingState(p => ({ ...p, tempX: snap.x, tempY: snap.y, targetId: snap.targetId, targetSide: snap.targetSide }));
      } else {
        setConnectingState(p => ({ ...p, tempX: pt.x, tempY: pt.y, targetId: null, targetSide: null }));
      }
    }

    if (isErasing) {
      const radius = eraserSize / scale;
      if (eraserType === 'vector') {
        setStrokes(prevStrokes => {
          let updated = [];
          prevStrokes.forEach(s => {
            if (isStrokeClicked(s, pt, radius)) {
              const sliced = sliceStroke(s, pt, radius);
              updated.push(...sliced);
            } else {
              updated.push(s);
            }
          });
          return updated;
        });
      } else {
        setStrokes(p => p.filter(s => !isStrokeClicked(s, pt, radius)));
      }
      return;
    }
    if (selectionRectRef.current) {
      const rectVal = selectionRectRef.current;
      rectVal.currentX = pt.x;
      rectVal.currentY = pt.y;

      if (selectionRectKonvaRef.current) {
        const rx = Math.min(rectVal.startX, rectVal.currentX);
        const ry = Math.min(rectVal.startY, rectVal.currentY);
        const rw = Math.abs(rectVal.currentX - rectVal.startX);
        const rh = Math.abs(rectVal.currentY - rectVal.startY);
        selectionRectKonvaRef.current.setAttrs({
          x: rx,
          y: ry,
          width: rw,
          height: rh,
          visible: true
        });
        selectionRectKonvaRef.current.getLayer()?.batchDraw();
      }
      return;
    }
    if (isDraggingSelection && dragStartRef.current && !isResizingRef.current) {
      nextDragPosRef.current = { x: e.clientX, y: e.clientY };

      if (!dragRafRef.current) {
        dragRafRef.current = requestAnimationFrame(() => {
          if (!nextDragPosRef.current || !dragStartRef.current) {
            dragRafRef.current = null;
            return;
          }

          const screenDx = nextDragPosRef.current.x - dragStartRef.current.mouse.x;
          const screenDy = nextDragPosRef.current.y - dragStartRef.current.mouse.y;

          // 1. Move Selection Overlay DOM element directly
          const overlay = containerRef.current?.querySelector('.selection-overlay-container');
          if (overlay) {
            overlay.style.transform = `translate3d(${screenDx}px, ${screenDy}px, 0) scale(${scale})`;
          }

          // 2. Move Dragged Blocks DOM elements directly
          selectedIds.forEach(id => {
            const blockEl = containerRef.current?.querySelector(`[data-block-id="${id}"]`);
            const start = dragStartRef.current?.blocks[id];
            if (blockEl && start) {
              const initialScreenX = position.x + start.x * scale;
              const initialScreenY = position.y + start.y * scale;
              const currentScreenX = initialScreenX + screenDx;
              const currentScreenY = initialScreenY + screenDy;
              blockEl.style.transform = `translate3d(${currentScreenX}px, ${currentScreenY}px, 0) scale(${scale * 1.02})`;
            }
          });

          // 3. Move Selected Strokes Konva Group directly
          if (selectedStrokesGroupRef.current) {
            selectedStrokesGroupRef.current.x(screenDx / scale);
            selectedStrokesGroupRef.current.y(screenDy / scale);
            selectedStrokesGroupRef.current.getLayer()?.batchDraw();
          }

          dragRafRef.current = null;
        });
      }
      return;
    }
    if (isDrawing && currentStroke) {
      // [LIVE SHAPE] or [SHIFT LINE] Real-time parametric update
      const isShiftLine = currentStroke.isShiftLine && !activeForcedShape;
      if (currentStroke.isLiveShape || isShiftLine) {
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
              stroke: resolveColor(currentStroke.color, isDarkMode),
              strokeWidth: currentStroke.width
            });
            activeStrokePathRef.current.getLayer()?.batchDraw();
          }
        }
        return;
      }

      const dist = Math.hypot(e.clientX - lastPointerPos.current.x, e.clientY - lastPointerPos.current.y);
      const MOVE_THRESHOLD = 14; // Stability buffer (raised to avoid false shape snaps during writing)

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
          const transformedPoints = transformShapePoints(postSnapManipulation.originalShape, scaleFactor, rotationDelta);
          if (transformedPoints) {
            setCurrentStroke(prev => ({ ...prev, points: transformedPoints }));
            // Synchronize the imperative path for real-time manipulation feedback
            if (activeStrokePathRef.current) {
              const d = getNeatPathData(transformedPoints, currentStroke.shapeType, currentStroke.isOpen);
              activeStrokePathRef.current.setAttrs({
                data: d,
                fill: 'transparent',
                stroke: resolveColor(currentStroke.color, isDarkMode),
                strokeWidth: currentStroke.width
              });
              activeStrokePathRef.current.getLayer()?.batchDraw();
            }
          }
        }
        return;
      }

      // [SHAPE PRO] Stillness Detection for Snapping
      if (dist > MOVE_THRESHOLD) {
        lastPointerPos.current = { x: e.clientX, y: e.clientY };
        if (snapTimer.current) { clearTimeout(snapTimer.current); snapTimer.current = null; }
        if (ghostTimer.current) { clearTimeout(ghostTimer.current); ghostTimer.current = null; }
        if (ghostShape) setGhostShape(null);
      } else if (activeStrokePointsRef.current.length > 40 && !currentStroke.isNeatShape) {
        // Ghost Preview Timer (500ms hold)
        if (!ghostTimer.current && !ghostShape) {
          ghostTimer.current = setTimeout(async () => {
            if (activePointerId.current === null) return;
            try {
              const type = activeForcedShape || await recognizeViaGoogle(activeStrokePointsRef.current);
              if (type) {
                const shape = fitGeometry(type, activeStrokePointsRef.current);
                if (shape) {
                  const neat = generateFittedPoints(shape);
                  if (neat) setGhostShape({ points: neat, type: shape.type });
                }
              }
            } catch (e) {
              console.error(e);
            }
          }, 800);
        }
        // Final Snap Timer (600ms hold)
        if (!snapTimer.current) {
          snapTimer.current = setTimeout(async () => {
            if (activePointerId.current === null) return;
            try {
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
                        stroke: resolveColor(currentStroke.color, isDarkMode),
                        strokeWidth: currentStroke.width / scale
                      });
                      activeStrokePathRef.current.getLayer()?.batchDraw();
                    }

                    if (window.navigator.vibrate) window.navigator.vibrate(20);
                  }
                }
              }
            } catch (e) {
              console.error(e);
            }
            snapTimer.current = null;
          }, 1200);
        }
      }

      // Use cached rect (set at pointerDown) to avoid layout thrashing on every move
      const r = cachedContainerRect.current || containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
      const currentPts = activeStrokePointsRef.current;
      let lastPt = currentPts.length > 0 ? currentPts[currentPts.length - 1] : null;
      const ptsToPush = [];

      // Pen input is high-DPI; use smaller decimation for smoother curves
      const isPenInput = e.pointerType === 'pen';
      const DECIMATE_SQ = isPenInput ? 0.64 : 2.25; // 0.8px for pen, 1.5px for mouse

      const addPt = (evX, evY, pressure) => {
        const nx = (evX - r.left - position.x) / scale;
        const ny = (evY - r.top - position.y) / scale;
        if (!lastPt) {
          const newPt = { x: nx, y: ny, pressure: pressure !== undefined ? pressure : 0.5 };
          ptsToPush.push(newPt);
          lastPt = newPt;
        } else {
          const distSq = (nx - lastPt.x) ** 2 + (ny - lastPt.y) ** 2;
          if (distSq > DECIMATE_SQ) {
            const newPt = { x: nx, y: ny, pressure: pressure !== undefined ? pressure : 0.5 };
            ptsToPush.push(newPt);
            lastPt = newPt;
          }
        }
      };

      // Process coalesced events for sub-frame accuracy
      if (e.getCoalescedEvents) {
        const coalesced = e.getCoalescedEvents();
        for (let i = 0; i < coalesced.length; i++) {
          addPt(coalesced[i].clientX, coalesced[i].clientY, coalesced[i].pressure);
        }
      } else {
        addPt(e.clientX, e.clientY, e.pressure);
      }

      if (ptsToPush.length > 0) {
        activeStrokePointsRef.current.push(...ptsToPush);
        hasUpdatesRef.current = true;
      }
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
      // [FASE 3] Ramer-Douglas-Peucker (RDP) Simplification (Tuned to 0.15 for high precision)
      const simplifiedPts = currentStroke.isNeatShape ? fpts : simplifyPoints(fpts, 0.15);
      const fstroke = { ...currentStroke, points: simplifiedPts };
      setStrokes(p => p.find(s => s.id === fstroke.id) ? p : [...p, fstroke]);
      setCurrentStroke(null); activeStrokePointsRef.current = [];
    }
    if (selectionRectRef.current) {
      const rectVal = selectionRectRef.current;
      const selRect = {
        startX: rectVal.startX,
        startY: rectVal.startY,
        currentX: rectVal.currentX,
        currentY: rectVal.currentY
      };

      const nIds = [], nSIds = [], nCIds = [];
      const allB = [...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks, ...pdfBlocks, ...tableBlocks];
      allB.forEach(b => { if (isBlockIntersecting(b, selRect)) nIds.push(b.id); });
      strokes.forEach(s => { if (isStrokeInRect(s, selRect)) nSIds.push(s.id); });
      connections.forEach(c => {
        const start = getAnchorPointById(c.fromId, c.fromSide, allB);
        const end = getAnchorPointById(c.toId, c.toSide, allB);
        if (start && end && isConnectionInRect(c, start, end, selRect)) nCIds.push(c.id);
      });

      if (selectionRectKonvaRef.current) {
        selectionRectKonvaRef.current.setAttrs({ visible: false });
        selectionRectKonvaRef.current.getLayer()?.batchDraw();
      }
      selectionRectRef.current = null;
      if (activeTool === 'ai-lasso') {
        // For AI Lasso, we clear the active selection immediately so it doesn't get stuck in selection mode or trigger visual glitches
        setSelectedIds([]); setSelectedStrokeIds([]); setSelectedConnectionIds([]);
      } else {
        setSelectedIds(nIds); setSelectedStrokeIds(nSIds); setSelectedConnectionIds(nCIds);
      }

      // AI Lasso analysis trigger
      if (activeTool === 'ai-lasso') {
        // Open the AI Panel instantly with a loading context
        const initialContext = {
          id: generateId(),
          text: "Analisando a área selecionada com Inteligência Artificial...",
          images: [],
          isSelection: true,
          isPlaceholder: true,
          sourceBlockId: null
        };
        if (setAiPanel) {
          setAiPanel({
            visible: true,
            context: initialContext
          });
        }

        (async () => {
          let combinedText = "";
          let strokeImage = null;
          
          // 1. Extract text from selected blocks
          const selectedBlocks = allB.filter(b => nIds.includes(b.id));
          selectedBlocks.forEach(b => {
            if (b.type === 'text' && b.content) {
              const tempDiv = document.createElement("div");
              tempDiv.innerHTML = b.content;
              combinedText += tempDiv.innerText + "\n";
            } else if (b.type === 'math' && b.latex) {
              combinedText += `Fórmula: $$${b.latex}$$\n`;
            } else if (b.type === 'code' && b.code) {
              combinedText += `Código (${b.language}):\n\`\`\`${b.language}\n${b.code}\n\`\`\`\n`;
            }
          });

          // 2. OCR of selected drawings/handwriting
          const selectedStrokes = strokes.filter(s => nSIds.includes(s.id));
          if (selectedStrokes.length > 0) {
            try {
              // Convert selected strokes to a base64 image so Gemini can read handwritten text directly
              strokeImage = await MathRecognitionService.strokesToBase64(selectedStrokes);
            } catch (err) {
              console.warn("Lasso strokes to image failed:", err);
            }

            if (apiKey && isAiFeatureEnabled('handwritingOCR')) {
              try {
                const latex = await MathRecognitionService.recognizeExpression(selectedStrokes, apiKey);
                if (latex && latex !== "?") {
                  combinedText += `Escrita Manual (LaTeX reconhecido): $$${latex}$$\n`;
                }
              } catch (err) {
                console.warn("Lasso OCR failed:", err);
              }
            } else if (!apiKey) {
              combinedText += `(Caligrafia não processada por OCR - configure sua Chave de API Gemini para OCR completo)\n`;
            }
          }

          if (!combinedText.trim() && !strokeImage) {
            combinedText = "Nenhum texto, fórmula ou caligrafia legível foi identificada na área circulada com o Lasso. Escreva fórmulas mais nítidas ou digite suas dúvidas aqui!";
          }

          // Update the context with the fully compiled selection content and images
          if (setAiPanel) {
            setAiPanel({
              visible: true,
              context: {
                id: initialContext.id,
                text: combinedText,
                images: strokeImage ? [{ src: strokeImage }] : [],
                isSelection: true,
                sourceBlockId: null
              }
            });
          }
        })();
      }
    }
    if (isDraggingSelection && dragStartRef.current) {
      // Use the last captured drag position if available, as pointerup clientX/Y can be zero or invalid in captured states
      const hasMoved = nextDragPosRef.current !== null;
      const lastX = hasMoved ? nextDragPosRef.current.x : dragStartRef.current.mouse.x;
      const lastY = hasMoved ? nextDragPosRef.current.y : dragStartRef.current.mouse.y;

      const finalScreenDx = lastX - dragStartRef.current.mouse.x;
      const finalScreenDy = lastY - dragStartRef.current.mouse.y;

      const dx = finalScreenDx / scale;
      const dy = finalScreenDy / scale;

      // 1. Reset temporary imperative transforms in DOM immediately to prevent offset double-application
      const overlay = containerRef.current?.querySelector('.selection-overlay-container');
      if (overlay) {
        overlay.style.transform = '';
      }

      selectedIds.forEach(id => {
        const blockEl = containerRef.current?.querySelector(`[data-block-id="${id}"]`);
        if (blockEl) {
          blockEl.style.transform = '';
        }
      });

      if (dx !== 0 || dy !== 0) {
        const moveBlock = b => {
          const start = dragStartRef.current.blocks[b.id];
          if (!start) return b;
          return { ...b, x: Math.max(0, start.x + dx), y: Math.max(0, start.y + dy) };
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
        setPdfBlocks(prev => prev.map(moveBlock));
        setTableBlocks(prev => prev.map(moveBlock));
        setStrokes(prev => prev.map(moveStroke));
      }

      // Reset temporary imperative positions in Konva
      if (selectedStrokesGroupRef.current) {
        selectedStrokesGroupRef.current.x(0);
        selectedStrokesGroupRef.current.y(0);
        selectedStrokesGroupRef.current.getLayer()?.batchDraw();
      }

      dragStartRef.current = null;
      nextDragPosRef.current = null;
    }

    if (isDraggingSelection || isDrawing) saveToHistory();
    setIsDrawing(false); setIsErasing(false); setIsDraggingSelection(false);
    if (penPointerRef.current) {
      penPointerRef.current.style.left = '-9999px';
      penPointerRef.current.style.top = '-9999px';
    }
    if (connectingState?.targetId) {
      handleCompleteConnection(e, connectingState.targetId, connectingState.targetSide);
    }
    setConnectingState(null);
  };

  const handleStartConnection = (e, bid, side) => {
    e.stopPropagation();
    const pt = screenToCanvas(e.clientX, e.clientY);
    setConnectingState({ fromId: bid, fromSide: side, tempX: pt.x, tempY: pt.y });
    activePointerId.current = e.pointerId;
    containerRef.current?.setPointerCapture(e.pointerId);
  };
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

  const handleColorChange = (color) => {
    saveToHistory();
    const update = b => (selectedIds.includes(b.id) || (b.groupId && allB.filter(x => selectedIds.includes(x.id)).some(x => x.groupId === b.groupId))) ? { ...b, color } : b;
    setTextBlocks(p => p.map(update));
    setImageBlocks(p => p.map(update));
    setCodeBlocks(p => p.map(update));
    setMathBlocks(p => p.map(update));
    setGgbBlocks(p => p.map(update));
    setMermaidBlocks(p => p.map(update));
    setMindmapBlocks(p => p.map(update));
    setStrokes(p => p.map(s => selectedStrokeIds.includes(s.id) ? { ...s, color } : s));
    setConnections(p => p.map(c => selectedConnectionIds.includes(c.id) ? { ...c, color } : c));
  };
  const handleStyleChange = (style) => {
    saveToHistory();
    setConnections(p => p.map(c => selectedConnectionIds.includes(c.id) ? { ...c, ...style } : c));
    setStrokes(p => p.map(s => selectedStrokeIds.includes(s.id) ? { ...s, ...style } : s));
  };

  if (!activeNote) return <div className="loading">Carregando...</div>;

  return (
    <div className={`canvas-viewport ${isPanning ? 'is-panning' : ''}`} ref={containerRef} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onContextMenu={e => e.preventDefault()} style={{
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      cursor: isErasing ? 'cell' : (['pen', 'highlighter'].includes(activeTool) ? (isDrawing ? 'none' : 'crosshair') : 'default'),
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
        .is-panning .glass-card {
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }
        .canvas-viewport[style*="cursor: none"] * {
          cursor: none !important;
        }
      `}</style>
      <Stage width={stageSize.width} height={stageSize.height} style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, pointerEvents: 'all', touchAction: 'none' }}>
        {/* Background Layer */}
        <Layer ref={el => { konvaLayerRefs.current[0] = el; }} x={position.x} y={position.y} scaleX={scale} scaleY={scale} listening={false}>
          {patternImage && paperPattern !== 'blank' && (
            <Rect
              x={-25000}
              y={-25000}
              width={50000}
              height={50000}
              fillPatternImage={patternImage}
              fillPatternRepeat="repeat"
              fillPatternX={0}
              fillPatternY={0}
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
        <Layer ref={el => { konvaLayerRefs.current[1] = el; }} x={position.x} y={position.y} scaleX={scale} scaleY={scale}>
          {/* Spatial Grid cached Tiles for inactive/unselected strokes */}
          {Object.entries(groupedTiles).map(([key, tileStrokes]) => (
            <StrokeTile
              key={key}
              tileKey={key}
              strokes={tileStrokes}
              scale={scale}
              isDarkMode={isDarkMode}
              selectedStrokeIds={selectedStrokeIds}
            />
          ))}

          {/* Renderização dinâmica apenas para traços ativos/selecionados (para contorno de seleção interativo) */}
          <Group ref={selectedStrokesGroupRef}>
            {strokes.filter(s => (s.zIndex || 0) < 100 && selectedStrokeIds.includes(s.id)).map(s => (
              <MemoizedStroke
                key={s.id}
                stroke={s}
                isSelected={true}
                isDarkMode={isDarkMode}
              />
            ))}
          </Group>

          <ConnectionLayer connections={connections} allBlocks={[...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks, ...pdfBlocks, ...tableBlocks]} tempConnection={connectingState} selectedIds={selectedConnectionIds} scale={scale} isDarkMode={isDarkMode} hoveredId={hoveredBlockId} onSelect={(id, shift) => setSelectedConnectionIds(prev => shift ? (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]) : [id])} />
        </Layer>
        <Layer ref={el => { konvaLayerRefs.current[2] = el; }} x={position.x} y={position.y} scaleX={scale} scaleY={scale} listening={false}>
          {currentStroke && (
            <Path
              ref={activeStrokePathRef}
              data=""
              fill={currentStroke.isNeatShape ? 'transparent' : resolveColor(currentStroke.color, isDarkMode)}
              stroke={currentStroke.isNeatShape ? resolveColor(currentStroke.color, isDarkMode) : (currentStroke.type === 'highlighter' ? resolveColor(currentStroke.color, isDarkMode) : null)}
              strokeWidth={currentStroke.isNeatShape ? currentStroke.width : 0}
              opacity={currentStroke.type === 'highlighter' ? 0.5 : 1}
              perfectDrawEnabled={false}
              shadowForStrokeEnabled={false}
              hitStrokeWidth={0}
            />
          )}
          {ghostShape && <Path data={getNeatPathData(ghostShape.points, ghostShape.type, ['arrow', 'line'].includes(ghostShape.type))} stroke="#6366f1" strokeWidth={2 / scale} dash={[5, 5]} opacity={0.5} />}
          <Rect
            ref={selectionRectKonvaRef}
            visible={false}
            fill={activeTool === 'ai-lasso' ? "rgba(20, 184, 166, 0.08)" : "rgba(99, 102, 241, 0.05)"}
            stroke={activeTool === 'ai-lasso' ? "#14b8a6" : "#6366f1"}
            strokeWidth={activeTool === 'ai-lasso' ? 1.5 / scale : 1 / scale}
            dash={[4, 4]}
          />
          <Circle
            ref={eraserCircleRef}
            visible={false}
            x={0}
            y={0}
            radius={eraserSize / scale}
            stroke="#6366f1"
            strokeWidth={1 / scale}
            dash={[3, 3]}
            listening={false}
          />
        </Layer>
      </Stage>

      {/* ====== LAYER 2a: Background + SVG strokes (transformed) ====== */}
      <div ref={infiniteCanvasRef} className="infinite-canvas" style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, transformOrigin: '0 0', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: 50000, height: 50000, pointerEvents: 'none', ...getBackgroundStyle() }} />

        {/* GGBBlock moved to glass-blocks-layer for correct viewport culling */}

        {/* SVG Overlay Stage for Top-Layer Strokes (zIndex >= 100) */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 90 }}>
          {strokes.filter(s => (s.zIndex || 0) >= 100).map(s => {
            const isHighlighter = s.type === 'highlighter';
            const color = selectedStrokeIds.includes(s.id) ? '#6366f1' : resolveColor(s.color, isDarkMode);
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
      <div ref={glassBlocksLayerRef} className="glass-blocks-layer" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10000, isolation: 'isolate', transform: 'translateZ(0)', transformOrigin: '0 0' }}>
        {imageBlocks.map(b => <ImageBlock key={b.id} block={b} activeTool={activeTool} updateBlock={(id, d) => updateAnyBlock('image', id, d)} onInteract={handleBlockInteract} removeBlock={removeAnyBlock} isDragging={selectedIds.includes(b.id) && isDraggingSelection} canvasScale={scale} canvasPan={position} />)}
        {ggbBlocks.map(b => <GGBBlock key={b.id} block={b} activeTool={activeTool} isDarkMode={isDarkMode} updateBlock={(id, d) => updateAnyBlock('ggb', id, d)} removeBlock={removeAnyBlock} onInteract={handleBlockInteract} isEditing={editingBlockId === b.id} setEditing={v => setEditingBlockId(v ? b.id : null)} isDragging={selectedIds.includes(b.id) && isDraggingSelection} canvasScale={scale} canvasPan={position} isShadow={isShadow} />)}
        {codeBlocks.map(b => <CodeBlock key={b.id} block={b} activeTool={activeTool} isDarkMode={isDarkMode} updateBlock={(id, d) => updateAnyBlock('code', id, d)} removeBlock={removeAnyBlock} onInteract={handleBlockInteract} saveHistory={saveToHistory} isEditing={editingBlockId === b.id} setEditing={v => setEditingBlockId(v ? b.id : null)} isDragging={selectedIds.includes(b.id) && isDraggingSelection} canvasScale={scale} canvasPan={position} />)}
        {textBlocks.map(b => <TextBlock key={b.id} block={b} apiKey={apiKey} activeTool={activeTool} isDarkMode={isDarkMode} updateBlock={(id, d) => updateAnyBlock('text', id, d)} removeBlock={removeAnyBlock} onInteract={handleBlockInteract} saveHistory={saveToHistory} isEditing={editingBlockId === b.id} setEditing={v => setEditingBlockId(v ? b.id : null)} isDragging={selectedIds.includes(b.id) && isDraggingSelection} canvasScale={scale} canvasPan={position} />)}
        {mathBlocks.map(b => {
          if (b.type === 'linear_transform') {
            return (
              <LinearTransformBlock
                key={b.id}
                block={b}
                updateBlock={(id, d) => updateAnyBlock('math', id, d)}
                isDarkMode={isDarkMode}
                onInteract={handleBlockInteract}
                isDragging={selectedIds.includes(b.id) && isDraggingSelection}
                canvasScale={scale}
                canvasPan={position}
              />
            );
          }
          if (b.type === 'taylor_plot') {
            return (
              <TaylorVisualizer
                key={b.id}
                block={b}
                updateBlock={(id, d) => updateAnyBlock('math', id, d)}
                isDarkMode={isDarkMode}
                onInteract={handleBlockInteract}
                isDragging={selectedIds.includes(b.id) && isDraggingSelection}
                canvasScale={scale}
                canvasPan={position}
              />
            );
          }
          if (b.type === 'vector_field') {
            return (
              <VectorFieldVisualizer
                key={b.id}
                block={b}
                updateBlock={(id, d) => updateAnyBlock('math', id, d)}
                isDarkMode={isDarkMode}
                onInteract={handleBlockInteract}
                isDragging={selectedIds.includes(b.id) && isDraggingSelection}
                canvasScale={scale}
                canvasPan={position}
              />
            );
          }
          if (b.type === 'phase_portrait') {
            return (
              <PhasePortraitVisualizer
                key={b.id}
                block={b}
                updateBlock={(id, d) => updateAnyBlock('math', id, d)}
                isDarkMode={isDarkMode}
                onInteract={handleBlockInteract}
                isDragging={selectedIds.includes(b.id) && isDraggingSelection}
                canvasScale={scale}
                canvasPan={position}
              />
            );
          }
          if (b.type === 'conformal_map') {
            return (
              <ConformalVisualizer
                key={b.id}
                block={b}
                updateBlock={(id, d) => updateAnyBlock('math', id, d)}
                isDarkMode={isDarkMode}
                onInteract={handleBlockInteract}
                isDragging={selectedIds.includes(b.id) && isDraggingSelection}
                canvasScale={scale}
                canvasPan={position}
              />
            );
          }
          if (b.type === 'fourier_synthesis') {
            return (
              <FourierVisualizer
                key={b.id}
                block={b}
                updateBlock={(id, d) => updateAnyBlock('math', id, d)}
                isDarkMode={isDarkMode}
                onInteract={handleBlockInteract}
                isDragging={selectedIds.includes(b.id) && isDraggingSelection}
                canvasScale={scale}
                canvasPan={position}
              />
            );
          }
          return (
            <MathBlock key={b.id} block={b} apiKey={apiKey} activeTool={activeTool} isDarkMode={isDarkMode} updateBlock={(id, d) => updateAnyBlock('math', id, d)} removeBlock={removeAnyBlock} onInteract={handleBlockInteract} saveHistory={saveToHistory} isEditing={editingBlockId === b.id} setEditing={v => setEditingBlockId(v ? b.id : null)} onPlot={e => handleMathPlot(b, e)} onSolve={r => handleMathSolve(b, r)} onSteps={s => handleMathSteps(b, s)} isDragging={selectedIds.includes(b.id) && isDraggingSelection} canvasScale={scale} canvasPan={position} />
          );
        })}
        {mermaidBlocks.map(b => <MermaidBlock key={b.id} block={b} activeTool={activeTool} isDarkMode={isDarkMode} updateBlock={(id, d) => updateAnyBlock('mermaid', id, d)} removeBlock={removeAnyBlock} onInteract={handleBlockInteract} isEditing={editingBlockId === b.id} setEditing={v => setEditingBlockId(v ? b.id : null)} isDragging={selectedIds.includes(b.id) && isDraggingSelection} canvasScale={scale} canvasPan={position} isShadow={isShadow} />)}
        {mindmapBlocks.map(b => <MindmapBlock key={b.id} block={b} activeTool={activeTool} isDarkMode={isDarkMode} updateBlock={(id, d) => updateAnyBlock('mindmap', id, d)} removeBlock={removeAnyBlock} onInteract={handleBlockInteract} isEditing={editingBlockId === b.id} setEditing={v => setEditingBlockId(v ? b.id : null)} isDragging={selectedIds.includes(b.id) && isDraggingSelection} canvasScale={scale} canvasPan={position} isShadow={isShadow} />)}
        {pdfBlocks.map(b => <PDFBlock key={b.id} block={b} activeTool={activeTool} isDarkMode={isDarkMode} updateBlock={(id, d) => updateAnyBlock('pdf', id, d)} removeBlock={removeAnyBlock} onInteract={handleBlockInteract} isDragging={selectedIds.includes(b.id) && isDraggingSelection} canvasScale={scale} canvasPan={position} />)}
        {tableBlocks.map(b => <TableBlock key={b.id} block={b} apiKey={apiKey} activeTool={activeTool} isDarkMode={isDarkMode} updateBlock={(id, d) => updateAnyBlock('table', id, d)} removeBlock={removeAnyBlock} onInteract={handleBlockInteract} isEditing={editingBlockId === b.id} setEditing={v => setEditingBlockId(v ? b.id : null)} isDragging={selectedIds.includes(b.id) && isDraggingSelection} canvasScale={scale} canvasPan={position} />)}

        {[...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks, ...pdfBlocks, ...tableBlocks].map(b => (
          <BlockHandles
            key={b.id}
            block={b}
            type={b.type === 'table' ? 'table' : (['linear_transform', 'taylor_plot', 'vector_field', 'phase_portrait', 'conformal_map', 'fourier_synthesis'].includes(b.type) ? 'math' : b.type === 'pdf' ? 'pdf' : (b.src ? 'image' : (b.expression ? 'ggb' : (b.code ? 'mermaid' : (b.content?.root ? 'mindmap' : (typeof b.content === 'string' && b.content.includes('\\') ? 'math' : 'text'))))))}
            scale={scale}
            // Separate connection handles and resizing logic:
            // Connection dots are suppressed if block is selected to avoid overlap with groups selection
            isHovered={hoveredBlockId === b.id}
            connectingState={connectingState}
            onStartConnection={handleStartConnection}
            onCompleteConnection={handleCompleteConnection}
            canvasScale={scale}
            canvasPan={position}
          />
        ))}
        <SelectionGroupOverlay
          bounds={groupBounds}
          onStartDrag={(e) => startDrag(e, selectedIds, selectedStrokeIds)}
          onResize={handleGroupResize}
          onStartInteraction={(isResize) => {
            if (isResize) isResizingRef.current = true;
            setIsDraggingSelection(true);
            interactionInitialBoundsRef.current = groupBounds;

            // Capture initial state of all selected items for stable relative manipulation
            interactionInitialBlocksRef.current = [
              ...[...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks, ...pdfBlocks, ...tableBlocks].filter(b => selectedIds.includes(b.id)).map(b => ({
                id: b.id,
                x: b.x,
                y: b.y,
                width: getBlockDimensions(b).width,
                height: getBlockDimensions(b).height
              })),
              ...strokes.filter(s => selectedStrokeIds.includes(s.id)).map(s => ({ id: s.id, points: [...s.points] }))
            ];
          }}
          onEndInteraction={() => {
            isResizingRef.current = false;
            setIsDraggingSelection(false);
            interactionInitialBoundsRef.current = null;
            saveToHistory();
          }}
          onDoubleClick={handleGroupDoubleClick}
          isLocked={isSelectedLocked}
          activeTool={activeTool}
          canvasScale={scale}
          canvasPan={position}
          isFreeformOnly={selectedConnectionIds.length > 0 && selectedIds.length === 0 && selectedStrokeIds.length === 0}
        />
      </div>

      {groupBounds && (selectedIds.length > 0 || selectedStrokeIds.length > 0 || selectedConnectionIds.length > 0) && (
        <SelectionToolbar
          bounds={groupBounds}
          scale={scale}
          position={position}
          viewportWidth={stageSize.width}
          onGroup={handleGroup}
          onLock={handleLock}
          onBringToFront={handleBringToFront}
          onSendToBack={handleSendToBack}
          isGrouped={isSelectedGrouped}
          isLocked={isSelectedLocked}
          onColorChange={handleColorChange}
          onStyleChange={handleStyleChange}
          onConvertToMath={handleInkToMath}
          isConverting={isMathConverting}
          selectionTypes={[
            ...allB.filter(b => selectedIds.includes(b.id)).map(b => b.type || (b.src ? 'image' : 'text')),
            ...strokes.filter(s => selectedStrokeIds.includes(s.id)).map(() => 'stroke'),
            ...selectedConnectionIds.map(() => 'connection')
          ]}
        />
      )}

      {isMiniMapEnabled && (
        <MiniMap
          blocks={[...textBlocks, ...imageBlocks, ...codeBlocks, ...mathBlocks, ...ggbBlocks, ...mermaidBlocks, ...mindmapBlocks, ...pdfBlocks, ...tableBlocks]}
          strokes={strokes}
          panOffset={position}
          scale={scale}
          viewportWidth={stageSize.width}
          viewportHeight={stageSize.height}
          onMoveView={onMoveView}
          activeNoteType={activeNote.type}
        />
      )}

      {/* Stylus/Pen Floating Dot Pointer */}
      {['pen', 'highlighter'].includes(activeTool) && (() => {
        const attrs = currentAttributes();
        const diameter = Math.max(6, Math.min(60, attrs.width * scale));
        const colorVal = attrs.isDynamic ? (isDarkMode ? '#ffffff' : '#000000') : resolveColor(attrs.color, isDarkMode);
        return (
          <div
            ref={penPointerRef}
            style={{
              position: 'fixed',
              left: -9999,
              top: -9999,
              width: `${diameter}px`,
              height: `${diameter}px`,
              borderRadius: '50%',
              backgroundColor: colorVal,
              opacity: attrs.type === 'highlighter' ? 0.6 : 0.9,
              border: `1.5px solid ${isDarkMode ? '#ffffff' : '#000000'}`,
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.35), 0 0 0 1.5px rgba(255, 255, 255, 0.4) inset',
              pointerEvents: 'none',
              transform: 'translate(-50%, -50%)',
              zIndex: 999999,
              transition: 'width 0.05s ease, height 0.05s ease, background-color 0.1s ease',
            }}
          />
        );
      })()}

    </div>
  );
});

export default CanvasArea;
