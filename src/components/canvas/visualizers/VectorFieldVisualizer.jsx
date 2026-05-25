import React, { useState, useEffect, useRef } from 'react';
import BlockWrapper from '../BlockWrapper';
import { Play, RotateCcw, Sliders } from 'lucide-react';
import { create, all } from 'mathjs';

const math = create(all);

const VectorFieldVisualizer = ({
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
  const [exprP, setExprP] = useState(block.exprP || '-y');
  const [exprQ, setExprQ] = useState(block.exprQ || 'x');
  const [showParticles, setShowParticles] = useState(true);
  const [particles, setParticles] = useState([]);

  const blockWidth = block.width || 520;
  const blockHeight = block.height || 540;
  const canvasWidth = blockWidth;
  const canvasHeight = Math.max(150, blockHeight - 200);

  // Initialize flow particles
  useEffect(() => {
    const pts = [];
    for (let i = 0; i < 80; i++) {
      pts.push({
        x: (Math.random() - 0.5) * 10,
        y: (Math.random() - 0.5) * 10,
        life: Math.random() * 100
      });
    }
    setParticles(pts);
  }, []);

  // Update coefficients on the store
  const saveExpression = () => {
    if (updateBlock) {
      updateBlock(block.id, { exprP, exprQ });
    }
  };

  // Draw and animate particles loop
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
    const scale = 36; // Pixels per unit

    let compiledP, compiledQ;
    try {
      compiledP = math.compile(exprP);
      compiledQ = math.compile(exprQ);
    } catch(e) {
      compiledP = math.compile('-y');
      compiledQ = math.compile('x');
    }

    const evaluateField = (x, y) => {
      try {
        const u = compiledP.evaluate({ x, y });
        const v = compiledQ.evaluate({ x, y });
        return { u, v };
      } catch(e) {
        return { u: 0, v: 0 };
      }
    };

    const toScreen = (tx, ty) => ({
      x: x0 + tx * scale,
      y: y0 - ty * scale
    });

    let animId;

    const render = () => {
      // Clear with suttle decay for particle trails
      ctx.fillStyle = isDarkMode ? 'rgba(12, 12, 15, 0.25)' : 'rgba(248, 250, 252, 0.25)';
      ctx.fillRect(0, 0, w, h);

      // 1. Draw static grid of reference
      ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)';
      ctx.lineWidth = 1;
      for (let i = -10; i <= 10; i++) {
        // Verticals
        ctx.beginPath();
        ctx.moveTo(x0 + i * scale, 0);
        ctx.lineTo(x0 + i * scale, h);
        ctx.stroke();

        // Horizontals
        ctx.beginPath();
        ctx.moveTo(0, y0 - i * scale);
        ctx.lineTo(w, y0 - i * scale);
        ctx.stroke();
      }

      // 2. Draw static vector arrows at grid points
      ctx.lineWidth = 1.2;
      const stepGrid = 1.2;
      for (let gridX = -6; gridX <= 6; gridX += stepGrid) {
        for (let gridY = -4; gridY <= 4; gridY += stepGrid) {
          const { u, v } = evaluateField(gridX, gridY);
          const len = Math.sqrt(u * u + v * v);
          if (len === 0) continue;

          const screenPos = toScreen(gridX, gridY);
          
          // Normalize and scale arrow length
          const arrowLen = Math.min(len * 6, 24);
          const dx = (u / len) * arrowLen;
          const dy = -(v / len) * arrowLen; // Flip Y for canvas coords

          // Color based on velocity
          ctx.strokeStyle = isDarkMode 
            ? `hsla(263, 80%, ${Math.min(40 + len * 8, 80)}%, 0.25)`
            : `hsla(263, 80%, ${Math.min(30 + len * 6, 60)}%, 0.35)`;

          ctx.beginPath();
          ctx.moveTo(screenPos.x, screenPos.y);
          ctx.lineTo(screenPos.x + dx, screenPos.y + dy);
          ctx.stroke();
        }
      }

      // 3. Draw and update flow particles
      if (showParticles) {
        ctx.fillStyle = '#c084fc'; // Purple particles
        particles.forEach(p => {
          const { u, v } = evaluateField(p.x, p.y);
          
          // Limit particle velocity
          const pSpeed = 0.08;
          p.x += u * pSpeed;
          p.y += v * pSpeed;
          p.life -= 0.6;

          // Boundary check or life expiration
          if (Math.abs(p.x) > 8 || Math.abs(p.y) > 6 || p.life <= 0) {
            p.x = (Math.random() - 0.5) * 12;
            p.y = (Math.random() - 0.5) * 10;
            p.life = Math.random() * 100;
          }

          // Render particle
          const sPos = toScreen(p.x, p.y);
          ctx.beginPath();
          ctx.arc(sPos.x, sPos.y, 2, 0, 2 * Math.PI);
          ctx.fill();
        });
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [canvasWidth, canvasHeight, exprP, exprQ, showParticles, particles, isDarkMode]);

  const dotColor = '#a855f7'; // Purple

  return (
    <BlockWrapper
      ref={cardRef}
      block={block}
      title={block.customTitle || `Campo Vetorial: F = (${exprP}, ${exprQ})`}
      color={dotColor}
      isDragging={isDragging}
      isEditing={false}
      isDarkMode={isDarkMode}
      onClose={() => updateBlock && updateBlock(block.id, { isDeleted: true })}
      onInteract={onInteract}
      onRename={(id, name) => updateBlock && updateBlock(id, { customTitle: name })}
      headerActions={
        <button
          onClick={(e) => { e.stopPropagation(); setShowParticles(!showParticles); }}
          className={`p-2 rounded-xl border text-[9px] uppercase tracking-wider font-black active:scale-95 transition-all ${showParticles ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-white/[0.04] border-white/5 text-white/50'}`}
        >
          Partículas
        </button>
      }
      updateBlock={updateBlock}
      canvasScale={canvasScale}
      canvasPan={canvasPan}
    >
      <div className="flex flex-col h-full select-none" onPointerDown={e => e.stopPropagation()}>
        {/* Canvas System */}
        <div className="relative overflow-hidden border-b border-white/5" style={{ height: `${canvasHeight}px` }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>

        {/* Dynamic Controls Grid */}
        <div className="p-5 flex flex-col gap-4 bg-black/15">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Componente P(x, y)</span>
              <input
                type="text"
                value={exprP}
                onChange={e => setExprP(e.target.value)}
                onBlur={saveExpression}
                className="bg-black/45 border border-white/5 rounded-xl px-4 py-2.5 text-[11px] font-mono font-bold text-purple-300 outline-none w-full"
                placeholder="-y"
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Componente Q(x, y)</span>
              <input
                type="text"
                value={exprQ}
                onChange={e => setExprQ(e.target.value)}
                onBlur={saveExpression}
                className="bg-black/45 border border-white/5 rounded-xl px-4 py-2.5 text-[11px] font-mono font-bold text-purple-300 outline-none w-full"
                placeholder="x"
              />
            </div>
          </div>
        </div>
      </div>
    </BlockWrapper>
  );
};

export default VectorFieldVisualizer;
