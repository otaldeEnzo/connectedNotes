import React, { useState, useEffect, useRef } from 'react';
import BlockWrapper from '../BlockWrapper';
import { Play, RotateCcw, Sliders } from 'lucide-react';

const ConformalVisualizer = ({
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

  // Parameter states
  const [funcType, setFuncType] = useState(block.funcType || 'z2'); // 'z2', 'exp', 'sin', 'reciprocal'
  const [morphFactor, setMorphFactor] = useState(1.0);
  const [isAnimating, setIsAnimating] = useState(false);

  const blockWidth = block.width || 520;
  const blockHeight = block.height || 540;
  const canvasWidth = blockWidth;
  const canvasHeight = Math.max(150, blockHeight - 200);

  // Trigger animation loop
  useEffect(() => {
    let animId;
    if (isAnimating) {
      const startTime = performance.now();
      const duration = 2000; // 2s
      const startFactor = morphFactor;
      const targetFactor = morphFactor >= 0.5 ? 0.0 : 1.0;

      const animate = (time) => {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1.0);
        // Easing easeInOutCubic
        const t = progress < 0.5 
          ? 4 * progress * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        setMorphFactor(startFactor + (targetFactor - startFactor) * t);

        if (progress < 1.0) {
          animId = requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
          setMorphFactor(targetFactor);
        }
      };
      animId = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animId);
  }, [isAnimating]);

  const triggerAnimation = () => {
    setIsAnimating(true);
  };

  // Complex Operations helper
  const mapComplex = (x, y) => {
    switch (funcType) {
      case 'z2': // w = z^2 = (x^2 - y^2) + i * (2xy)
        return {
          u: x * x - y * y,
          v: 2 * x * y
        };
      case 'exp': // w = e^z = e^x * cos(y) + i * e^x * sin(y)
        const ex = Math.exp(x * 0.4); // Scale down input range slightly for exponential
        return {
          u: ex * Math.cos(y) * 2,
          v: ex * Math.sin(y) * 2
        };
      case 'sin': // w = sin(z) = sin(x)*cosh(y) + i * cos(x)*sinh(y)
        const cosh = (v) => (Math.exp(v) + Math.exp(-v)) / 2;
        const sinh = (v) => (Math.exp(v) - Math.exp(-v)) / 2;
        return {
          u: Math.sin(x) * cosh(y),
          v: Math.cos(x) * sinh(y)
        };
      case 'reciprocal': // w = 1/z = x / (x^2 + y^2) - i * y / (x^2 + y^2)
        const d = x * x + y * y + 0.1; // Add epsilon to avoid singularity at 0
        return {
          u: (x / d) * 3,
          v: (-y / d) * 3
        };
      default:
        return { u: x, v: y };
    }
  };

  // Draw conformal grid
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

    // Background
    ctx.fillStyle = isDarkMode ? '#0a0a0c' : '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    const toScreen = (tx, ty) => ({
      x: x0 + tx * scale,
      y: y0 - ty * scale
    });

    const transform = (x, y) => {
      const target = mapComplex(x, y);
      // Linear interpolate: (1-t)*z + t*f(z)
      const t = morphFactor;
      return {
        u: (1 - t) * x + t * target.u,
        v: (1 - t) * y + t * target.v
      };
    };

    // Draw grid lines
    ctx.strokeStyle = isDarkMode ? 'rgba(6, 182, 212, 0.25)' : 'rgba(6, 182, 212, 0.35)'; // Cyan
    ctx.lineWidth = 1.5;

    // Horizontal grid lines
    for (let gy = -4; gy <= 4; gy += 0.5) {
      ctx.beginPath();
      let started = false;
      for (let gx = -6; gx <= 6; gx += 0.1) {
        const p = transform(gx, gy);
        const s = toScreen(p.u, p.v);
        
        if (s.x >= -50 && s.x <= w + 50 && s.y >= -50 && s.y <= h + 50) {
          if (!started) {
            ctx.moveTo(s.x, s.y);
            started = true;
          } else {
            ctx.lineTo(s.x, s.y);
          }
        }
      }
      ctx.stroke();
    }

    // Vertical grid lines
    for (let gx = -6; gx <= 6; gx += 0.5) {
      ctx.beginPath();
      let started = false;
      for (let gy = -4; gy <= 4; gy += 0.1) {
        const p = transform(gx, gy);
        const s = toScreen(p.u, p.v);

        if (s.x >= -50 && s.x <= w + 50 && s.y >= -50 && s.y <= h + 50) {
          if (!started) {
            ctx.moveTo(s.x, s.y);
            started = true;
          } else {
            ctx.lineTo(s.x, s.y);
          }
        }
      }
      ctx.stroke();
    }

    // Draw main axes of identity reference in thin gray
    ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y0); ctx.lineTo(w, y0);
    ctx.moveTo(x0, 0); ctx.lineTo(x0, h);
    ctx.stroke();

  }, [canvasWidth, canvasHeight, funcType, morphFactor, isDarkMode]);

  const dotColor = '#06b6d4'; // Cyan

  return (
    <BlockWrapper
      ref={cardRef}
      block={block}
      title={block.customTitle || `Mapeamento Conforme: w = f(z)`}
      color={dotColor}
      isDragging={isDragging}
      isEditing={false}
      isDarkMode={isDarkMode}
      onClose={() => updateBlock && updateBlock(block.id, { isDeleted: true })}
      onInteract={onInteract}
      onRename={(id, name) => updateBlock && updateBlock(id, { customTitle: name })}
      headerActions={
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); triggerAnimation(); }}
            className="p-2 rounded-xl bg-white/[0.04] border border-white/5 hover:border-cyan-500/30 text-white/60 hover:text-white transition-all flex items-center gap-2 active:scale-95 text-[9px] uppercase font-black tracking-wider"
          >
            <Play size={10} className={isAnimating ? 'animate-spin text-cyan-400' : ''} />
            Mapear
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setMorphFactor(morphFactor > 0.5 ? 0.0 : 1.0); }}
            className="p-2 rounded-xl bg-white/[0.04] border border-white/5 hover:border-cyan-500/30 text-white/60 hover:text-white transition-all active:scale-95"
          >
            <RotateCcw size={10} />
          </button>
        </div>
      }
      updateBlock={updateBlock}
      canvasScale={canvasScale}
      canvasPan={canvasPan}
    >
      <div className="flex flex-col h-full select-none" onPointerDown={e => e.stopPropagation()}>
        {/* Plotting Canvas */}
        <div className="relative overflow-hidden border-b border-white/5" style={{ height: `${canvasHeight}px` }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>

        {/* Dynamic Controls Grid */}
        <div className="p-5 flex flex-col gap-5 bg-black/15">
          {/* Function Selector & Warp Slider */}
          <div className="grid grid-cols-12 gap-5 items-center">
            {/* Dropdown selector */}
            <div className="col-span-6 flex flex-col gap-2">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Mapeamento Analítico f(z)</span>
              <select
                value={funcType}
                onChange={e => { setFuncType(e.target.value); if (updateBlock) updateBlock(block.id, { funcType: e.target.value }); }}
                className="bg-black/45 border border-white/5 rounded-xl px-4 py-2 text-[10px] font-bold text-cyan-300 outline-none w-full"
              >
                <option value="z2">w = z² (Quadrática)</option>
                <option value="exp">w = e^z (Exponencial)</option>
                <option value="sin">w = sin(z) (Seno Complexo)</option>
                <option value="reciprocal">w = 1/z (Recíproca)</option>
              </select>
            </div>

            {/* Slider */}
            <div className="col-span-6 flex flex-col gap-2">
              <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-[0.2em]">
                <span className="opacity-40 flex items-center gap-2"><Sliders size={10} /> Deformação</span>
                <span className="text-cyan-400">{(morphFactor * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.0"
                step="0.01"
                value={morphFactor}
                onChange={(e) => setMorphFactor(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-black/45 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </div>
        </div>
      </div>
    </BlockWrapper>
  );
};

export default ConformalVisualizer;
