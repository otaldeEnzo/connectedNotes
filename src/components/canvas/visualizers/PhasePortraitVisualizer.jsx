import React, { useState, useEffect, useRef } from 'react';
import BlockWrapper from '../BlockWrapper';
import { Play, RotateCcw } from 'lucide-react';
import { create, all } from 'mathjs';

const math = create(all);

const PhasePortraitVisualizer = ({
  block,
  updateBlock,
  isDarkMode,
  onInteract,
  isDragging,
  canvasScale,
  canvasPan
}) => {
  const cardRef = useRef(null);
  const canvasRef = useRef(null);

  // States
  const [exprP, setExprP] = useState(block.exprP || 'y');
  const [exprQ, setExprQ] = useState(block.exprQ || '-x - 0.2*y'); // Damped pendulum linear approximation
  const [trajectories, setTrajectories] = useState([]); // List of starting points clicked by the user

  const blockWidth = block.width || 520;
  const blockHeight = block.height || 540;
  const canvasWidth = blockWidth;
  const canvasHeight = Math.max(150, blockHeight - 200);

  const saveExpression = () => {
    if (updateBlock) {
      updateBlock(block.id, { exprP, exprQ });
    }
  };

  const clearTrajectories = () => {
    setTrajectories([]);
  };

  // Canvas Drawing & Interaction Hook
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpi = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpi;
    canvas.height = canvasHeight * dpi;
    ctx.scale(dpi, dpi);

    const w = canvasWidth;
    const h = canvasHeight;
    const x0 = w / 2;
    const y0 = h / 2;
    const scale = 36; // 36 pixels per unit

    let compiledP, compiledQ;
    try {
      compiledP = math.compile(exprP);
      compiledQ = math.compile(exprQ);
    } catch(e) {
      compiledP = math.compile('y');
      compiledQ = math.compile('-x - 0.2*y');
    }

    const evaluateSystem = (x, y) => {
      try {
        const dx = compiledP.evaluate({ x, y });
        const dy = compiledQ.evaluate({ x, y });
        return { dx, dy };
      } catch(e) {
        return { dx: 0, dy: 0 };
      }
    };

    const toScreen = (tx, ty) => ({
      x: x0 + tx * scale,
      y: y0 - ty * scale
    });

    const fromScreen = (sx, sy) => ({
      x: (sx - x0) / scale,
      y: (y0 - sy) / scale
    });

    // 1. Clear background
    ctx.fillStyle = isDarkMode ? '#0c0c0f' : '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    // 2. Draw axes grid
    ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
    ctx.lineWidth = 1;
    for (let i = -10; i <= 10; i++) {
      ctx.beginPath(); ctx.moveTo(x0 + i * scale, 0); ctx.lineTo(x0 + i * scale, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, y0 - i * scale); ctx.lineTo(w, y0 - i * scale); ctx.stroke();
    }

    ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y0); ctx.lineTo(w, y0);
    ctx.moveTo(x0, 0); ctx.lineTo(x0, h);
    ctx.stroke();

    // 3. Draw EDO Direction Field (direction markers)
    ctx.strokeStyle = isDarkMode ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.25)';
    ctx.lineWidth = 1;
    const gridStep = 1.0;
    for (let gx = -6; gx <= 6; gx += gridStep) {
      for (let gy = -4; gy <= 4; gy += gridStep) {
        const { dx, dy } = evaluateSystem(gx, gy);
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) continue;

        const sPos = toScreen(gx, gy);
        const markerLen = 10;
        
        // Direction normalized components
        const nx = (dx / len) * markerLen;
        const ny = -(dy / len) * markerLen; // Flip Y

        // Draw suttle pointer line
        ctx.beginPath();
        ctx.moveTo(sPos.x - nx/2, sPos.y - ny/2);
        ctx.lineTo(sPos.x + nx/2, sPos.y + ny/2);
        ctx.stroke();

        // Draw small dot on direction arrow head
        ctx.fillStyle = isDarkMode ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.45)';
        ctx.beginPath();
        ctx.arc(sPos.x + nx/2, sPos.y + ny/2, 1.5, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    // 4. Draw Trajectories using RK4 integration from clicked starting points
    ctx.lineWidth = 2.5;
    
    trajectories.forEach((startPt, idx) => {
      // Color variety for each trajectory
      const colors = ['#f43f5e', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6'];
      ctx.strokeStyle = colors[idx % colors.length];

      ctx.beginPath();
      let cx = startPt.x;
      let cy = startPt.y;
      const sStart = toScreen(cx, cy);
      ctx.moveTo(sStart.x, sStart.y);

      // Runge-Kutta 4 Integration Loop (150 steps forward)
      const h_step = 0.05;
      for (let step = 0; step < 180; step++) {
        // RK4 components
        // k1
        const k1 = evaluateSystem(cx, cy);
        
        // k2
        const k2 = evaluateSystem(cx + 0.5 * h_step * k1.dx, cy + 0.5 * h_step * k1.dy);
        
        // k3
        const k3 = evaluateSystem(cx + 0.5 * h_step * k2.dx, cy + 0.5 * h_step * k2.dy);
        
        // k4
        const k4 = evaluateSystem(cx + h_step * k3.dx, cy + h_step * k3.dy);

        // Next point
        cx += (h_step / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx);
        cy += (h_step / 6) * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy);

        if (isNaN(cx) || isNaN(cy) || Math.abs(cx) > 15 || Math.abs(cy) > 15) break;

        const sPos = toScreen(cx, cy);
        ctx.lineTo(sPos.x, sPos.y);
      }
      ctx.stroke();

      // Highlight starting point with an active ring
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = colors[idx % colors.length];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sStart.x, sStart.y, 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    });

  }, [canvasWidth, canvasHeight, exprP, exprQ, trajectories, isDarkMode]);

  // Click on canvas to spawn a new trajectory curve
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const x0 = canvasWidth / 2;
    const y0 = canvasHeight / 2;
    const scale = 36;

    const xVal = (sx - x0) / scale;
    const yVal = (y0 - sy) / scale;

    setTrajectories(prev => [...prev, { x: xVal, y: yVal }].slice(-5)); // Hold max 5 trajectories
  };

  const dotColor = '#f43f5e'; // Vibrant Rose

  return (
    <BlockWrapper
      ref={cardRef}
      block={block}
      title={block.customTitle || `Retrato de Fase: x' = ${exprP}, y' = ${exprQ}`}
      color={dotColor}
      isDragging={isDragging}
      isEditing={false}
      isDarkMode={isDarkMode}
      onClose={() => updateBlock && updateBlock(block.id, { isDeleted: true })}
      onInteract={onInteract}
      onRename={(id, name) => updateBlock && updateBlock(id, { customTitle: name })}
      headerActions={
        <button
          onClick={(e) => { e.stopPropagation(); clearTrajectories(); }}
          className="p-2 rounded-xl bg-white/[0.04] border border-white/5 hover:border-rose-500/30 text-white/60 hover:text-white transition-all active:scale-95 flex items-center gap-1 text-[9px] uppercase font-black tracking-wider"
        >
          <RotateCcw size={10} />
          Limpar
        </button>
      }
      updateBlock={updateBlock}
      canvasScale={canvasScale}
      canvasPan={canvasPan}
    >
      <div className="flex flex-col h-full select-none" onPointerDown={e => e.stopPropagation()}>
        {/* Canvas plotting direction grid and click integration */}
        <div className="relative overflow-hidden border-b border-white/5" style={{ height: `${canvasHeight}px` }}>
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              cursor: 'crosshair'
            }}
          />
          <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur rounded-xl px-3 py-1.5 border border-white/5">
            <span className="text-[7px] text-white/45 font-black uppercase tracking-widest leading-none">Clique em qualquer ponto do plano para disparar a trajetória RK4</span>
          </div>
        </div>

        {/* Dynamic Controls Grid */}
        <div className="p-5 flex flex-col gap-4 bg-black/15">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">EDO x' = P(x, y)</span>
              <input
                type="text"
                value={exprP}
                onChange={e => setExprP(e.target.value)}
                onBlur={saveExpression}
                className="bg-black/45 border border-white/5 rounded-xl px-4 py-2.5 text-[11px] font-mono font-bold text-rose-300 outline-none w-full"
                placeholder="y"
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">EDO y' = Q(x, y)</span>
              <input
                type="text"
                value={exprQ}
                onChange={e => setExprQ(e.target.value)}
                onBlur={saveExpression}
                className="bg-black/45 border border-white/5 rounded-xl px-4 py-2.5 text-[11px] font-mono font-bold text-rose-300 outline-none w-full"
                placeholder="-x - 0.2*y"
              />
            </div>
          </div>
        </div>
      </div>
    </BlockWrapper>
  );
};

export default PhasePortraitVisualizer;
