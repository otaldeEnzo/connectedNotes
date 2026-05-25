import React, { useState, useEffect, useRef } from 'react';
import BlockWrapper from '../BlockWrapper';
import { Play, Sliders, RotateCcw } from 'lucide-react';
import { create, all } from 'mathjs';

const math = create(all);

const TaylorVisualizer = ({
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

  // Parameter states in the block/state
  const funcExpr = block.funcExpr || 'sin(x)';
  const x0 = block.x0 !== undefined ? block.x0 : 0;
  const [degree, setDegree] = useState(block.degree || 3);
  const [playDegree, setPlayDegree] = useState(false);

  const blockWidth = block.width || 520;
  const blockHeight = block.height || 540;
  const canvasWidth = blockWidth;
  const canvasHeight = Math.max(150, blockHeight - 200);

  // Animating degree increases
  useEffect(() => {
    let animId;
    if (playDegree) {
      const interval = setInterval(() => {
        setDegree(prev => {
          if (prev >= 15) {
            setPlayDegree(false);
            return 15;
          }
          return prev + 1;
        });
      }, 600);
      return () => clearInterval(interval);
    }
  }, [playDegree]);

  // Compute Taylor terms dynamically
  const taylorCoeffs = React.useMemo(() => {
    const coeffs = [];
    let currentDeriv = math.parse(funcExpr);
    
    // Evaluate order 0
    try {
      coeffs.push(currentDeriv.evaluate({ x: x0 }));
    } catch(e) {
      coeffs.push(0);
    }

    let fact = 1;
    for (let i = 1; i <= 15; i++) {
      try {
        currentDeriv = math.derivative(currentDeriv, 'x');
        const dVal = currentDeriv.evaluate({ x: x0 });
        fact *= i;
        coeffs.push(dVal / fact);
      } catch (err) {
        coeffs.push(0);
      }
    }
    return coeffs;
  }, [funcExpr, x0]);

  // Draw target function f(x) and P_N(x)
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
    const x0_screen = w / 2;
    const y0_screen = h / 2;
    const xScale = 45; // Pixels per unit
    const yScale = 45;

    // Background
    ctx.fillStyle = isDarkMode ? '#0a0a0c' : '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    // Draw axis grid
    ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 1;
    for (let i = -10; i <= 10; i++) {
      // Verticals
      ctx.beginPath();
      ctx.moveTo(x0_screen + i * xScale, 0);
      ctx.lineTo(x0_screen + i * xScale, h);
      ctx.stroke();

      // Horizontals
      ctx.beginPath();
      ctx.moveTo(0, y0_screen - i * yScale);
      ctx.lineTo(w, y0_screen - i * yScale);
      ctx.stroke();
    }

    // Main Axes
    ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y0_screen); ctx.lineTo(w, y0_screen);
    ctx.moveTo(x0_screen, 0); ctx.lineTo(x0_screen, h);
    ctx.stroke();

    // Helper conversion
    const toScreen = (x, y) => ({
      x: x0_screen + x * xScale,
      y: y0_screen - y * yScale
    });

    // 1. Draw Target Function f(x)
    ctx.strokeStyle = '#3b82f6'; // Bright Blue
    ctx.lineWidth = 3;
    ctx.beginPath();
    let started = false;

    const parsedFunc = math.parse(funcExpr);

    for (let screenX = 0; screenX <= w; screenX += 2) {
      const xVal = (screenX - x0_screen) / xScale;
      try {
        const yVal = parsedFunc.evaluate({ x: xVal });
        if (isNaN(yVal) || !isFinite(yVal)) continue;

        const screenPos = toScreen(xVal, yVal);
        if (screenPos.y >= 0 && screenPos.y <= h) {
          if (!started) {
            ctx.moveTo(screenPos.x, screenPos.y);
            started = true;
          } else {
            ctx.lineTo(screenPos.x, screenPos.y);
          }
        }
      } catch (err) {}
    }
    ctx.stroke();

    // 2. Draw Taylor Polynomial P_N(x)
    ctx.strokeStyle = '#10b981'; // Vibrant Emerald
    ctx.lineWidth = 2.5;
    ctx.setLineDash([2, 1]);
    ctx.beginPath();
    started = false;

    for (let screenX = 0; screenX <= w; screenX += 2) {
      const xVal = (screenX - x0_screen) / xScale;
      
      // Calculate P_N(x) = sum_{i=0}^N c_i * (x - x0)^i
      let yVal = 0;
      const dx = xVal - x0;
      for (let i = 0; i <= degree; i++) {
        const termCoeff = taylorCoeffs[i] || 0;
        yVal += termCoeff * Math.pow(dx, i);
      }

      if (isNaN(yVal) || !isFinite(yVal)) continue;

      const screenPos = toScreen(xVal, yVal);
      if (screenPos.y >= -100 && screenPos.y <= h + 100) {
        if (!started) {
          ctx.moveTo(screenPos.x, screenPos.y);
          started = true;
        } else {
          ctx.lineTo(screenPos.x, screenPos.y);
        }
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Draw Center Point x0
    try {
      const y0_val = parsedFunc.evaluate({ x: x0 });
      const centerScreen = toScreen(x0, y0_val);
      ctx.fillStyle = '#ef4444'; // Red center
      ctx.beginPath();
      ctx.arc(centerScreen.x, centerScreen.y, 5, 0, 2 * Math.PI);
      ctx.fill();
    } catch(e) {}

  }, [canvasWidth, canvasHeight, funcExpr, x0, degree, taylorCoeffs, isDarkMode]);

  const dotColor = '#10b981'; // Emerald

  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        onClick={(e) => { e.stopPropagation(); setPlayDegree(!playDegree); }}
        className={`p-2 rounded-xl bg-white/[0.04] border border-white/5 text-[9px] uppercase tracking-wider font-black flex items-center gap-2 active:scale-95 transition-all ${playDegree ? 'text-emerald-400 border-emerald-500/30' : 'text-white/60 hover:text-white'}`}
      >
        <Play size={10} className={playDegree ? 'animate-pulse fill-emerald-400' : ''} />
        Ajuste
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); setDegree(1); setPlayDegree(false); }}
        className="p-2 rounded-xl bg-white/[0.04] border border-white/5 hover:border-emerald-500/30 text-white/60 hover:text-white transition-all active:scale-95"
      >
        <RotateCcw size={10} />
      </button>
    </div>
  );

  return (
    <BlockWrapper
      ref={cardRef}
      block={block}
      title={block.customTitle || `Aproximação de Taylor: ${funcExpr}`}
      color={dotColor}
      isDragging={isDragging}
      isEditing={false}
      isDarkMode={isDarkMode}
      onClose={() => updateBlock && updateBlock(block.id, { isDeleted: true })}
      onInteract={onInteract}
      onRename={(id, name) => updateBlock && updateBlock(id, { customTitle: name })}
      headerActions={headerActions}
      updateBlock={updateBlock}
      canvasScale={canvasScale}
      canvasPan={canvasPan}
    >
      <div className="flex flex-col h-full select-none" onPointerDown={e => e.stopPropagation()}>
        {/* Plot Area */}
        <div className="relative overflow-hidden border-b border-white/5" style={{ height: `${canvasHeight}px` }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
          
          {/* Overlay Legend */}
          <div className="absolute top-4 left-4 bg-[#0a0a0d]/85 backdrop-blur border border-white/5 rounded-2xl p-4 flex flex-col gap-2 shadow-2xl">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded bg-blue-500 shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-wider text-white/50">Alvo f(x) = {funcExpr}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500 shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-wider text-white/50">Polinômio P_{degree}(x)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded bg-red-500 shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-wider text-white/50">Centro x0 = {x0}</span>
            </div>
          </div>
        </div>

        {/* Sliders and controls */}
        <div className="p-5 flex flex-col gap-4 bg-black/15">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-[0.2em]">
              <span className="opacity-40 flex items-center gap-2"><Sliders size={10} /> Grau Polinomial (N)</span>
              <span className="text-emerald-400">Grau {degree}</span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              step="1"
              value={degree}
              onChange={(e) => setDegree(parseInt(e.target.value))}
              className="w-full h-1.5 bg-black/45 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        </div>
      </div>
    </BlockWrapper>
  );
};

export default TaylorVisualizer;
