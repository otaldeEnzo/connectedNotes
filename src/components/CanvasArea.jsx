import React, { useRef, useEffect } from 'react';

/**
 * Componente de Área de Desenho e Escrita
 * Corrigido: z-index e aplicação de padrões de fundo.
 */
const CanvasArea = ({ 
  activeNote, activePreset, onUpdateNote, localStrokesBuffer, remoteStrokesRef, theme 
}) => {
  const staticCanvasRef = useRef(null);
  const activeCanvasRef = useRef(null);
  const contextRef = useRef(null);
  const activeContextRef = useRef(null);
  const isDrawingRef = useRef(false);
  const pointsRef = useRef([]);

  const toolType = activePreset?.type || 'cursor';

  // Gerador de estilo de fundo baseado no padrão selecionado
  const getBackgroundStyle = () => {
    const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const pattern = activeNote.backgroundPattern || 'grid';
    
    switch (pattern) {
      case 'lined': return { backgroundImage: `linear-gradient(${gridColor} 1px, transparent 1px)`, backgroundSize: '100% 32px' };
      case 'grid': return { backgroundImage: `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`, backgroundSize: '32px 32px' };
      case 'dots': return { backgroundImage: `radial-gradient(${gridColor} 1.5px, transparent 1px)`, backgroundSize: '32px 32px' };
      default: return { backgroundImage: 'none', backgroundColor: theme === 'dark' ? '#0b0f1a' : '#ffffff' };
    }
  };

  function applyStyles(ctx, s) {
    if (!s) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (s.type === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = s.size || 40;
    } else if (s.type === 'highlighter') {
      ctx.globalCompositeOperation = 'multiply';
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.size || 22;
      ctx.globalAlpha = 0.35;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.size || 2.5;
      ctx.globalAlpha = 1;
    }
  }

  function drawCurve(ctx, pts) {
    if (!pts || pts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const midX = (pts[i].x + pts[i + 1].x) / 2;
      const midY = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
    }
    const last = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    ctx.quadraticCurveTo(prev.x, prev.y, last.x, last.y);
    ctx.stroke();
  }

  function renderStatic() {
    const ctx = contextRef.current;
    if (!ctx) return;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const all = [...(remoteStrokesRef.current || []), ...(localStrokesBuffer.current || [])];
    all.forEach(s => {
      applyStyles(ctx, s);
      drawCurve(ctx, s.points);
    });
  }

  const handleDown = (e) => {
    if (toolType === 'cursor') return;
    const rect = activeCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (toolType === 'eraser') {
      isDrawingRef.current = true;
      eraseAt(x, y);
    } else {
      isDrawingRef.current = true;
      pointsRef.current = [{ x, y }];
    }
  };

  const handleMove = (e) => {
    if (!isDrawingRef.current) return;
    const rect = activeCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (toolType === 'eraser') {
      eraseAt(x, y);
    } else {
      pointsRef.current.push({ x, y });
      const ctx = activeContextRef.current;
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      applyStyles(ctx, activePreset);
      drawCurve(ctx, pointsRef.current);
    }
  };

  const handleUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    
    if (toolType !== 'eraser' && pointsRef.current.length > 1) {
      const s = { id: crypto.randomUUID(), points: [...pointsRef.current], ...activePreset };
      localStrokesBuffer.current.push(s);
      renderStatic();
      onUpdateNote(activeNote.id, { strokes: [...(remoteStrokesRef.current || []), s] }, 0);
    }
    pointsRef.current = [];
    activeContextRef.current?.clearRect(0, 0, activeContextRef.current.canvas.width, activeContextRef.current.canvas.height);
  };

  const eraseAt = (x, y) => {
    const threshold = (activePreset?.size || 40) / 2 + 10;
    const all = [...(remoteStrokesRef.current || []), ...(localStrokesBuffer.current || [])];
    const filtered = all.filter(s => !s.points.some(p => Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2) < threshold));
    if (filtered.length !== all.length) {
      localStrokesBuffer.current = filtered;
      onUpdateNote(activeNote.id, { strokes: filtered }, 0);
      renderStatic();
    }
  };

  useEffect(() => {
    const resize = () => {
      const w = 5000, h = 5000;
      [staticCanvasRef.current, activeCanvasRef.current].forEach(c => {
        if(c) {
          c.width = w * 2; c.height = h * 2;
          c.style.width = w + 'px'; c.style.height = h + 'px';
          c.getContext('2d').scale(2, 2);
        }
      });
      contextRef.current = staticCanvasRef.current?.getContext('2d');
      activeContextRef.current = activeCanvasRef.current?.getContext('2d');
      renderStatic();
    };
    resize();
  }, [activeNote?.id, theme]);

  useEffect(() => { renderStatic(); }, [activeNote?.strokes]);

  return (
    <div className="canvas-wrapper hide-scrollbar">
      <div 
        className="canvas-content-area" 
        style={{ ...getBackgroundStyle() }}
      >
        <div className="editor-overlay">
          <input 
            value={activeNote.title} 
            onChange={e => onUpdateNote(activeNote.id, { title: e.target.value }, 500)}
            className="note-title-input" 
            placeholder="Título da Nota" 
          />
          <textarea 
            value={activeNote.content} 
            onChange={e => onUpdateNote(activeNote.id, { content: e.target.value }, 500)}
            className="note-text-area" 
            placeholder="Comece a escrever aqui..." 
          />
        </div>
        
        <canvas ref={staticCanvasRef} className="canvas-layer" />
        <canvas 
          ref={activeCanvasRef} 
          className={`active-canvas-layer ${toolType !== 'cursor' ? 'drawing-active' : ''}`}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
        />
      </div>
    </div>
  );
};

export default CanvasArea;