import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import BlockWrapper from './BlockWrapper';
import { Play, RotateCcw, Sliders, Circle, ArrowRight } from 'lucide-react';

const LinearTransformBlock = ({
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

  // Matrix A coefficients (defaulting to a shear matrix if not defined)
  const a = block.matrixA !== undefined ? block.matrixA : 1.5;
  const b = block.matrixB !== undefined ? block.matrixB : 0.8;
  const c = block.matrixC !== undefined ? block.matrixC : 0.3;
  const d = block.matrixD !== undefined ? block.matrixD : 1.2;

  // Visual/control states
  const [warpFactor, setWarpFactor] = useState(1.0);
  const [showUnitCircle, setShowUnitCircle] = useState(true);
  const [customVecX, setCustomVecX] = useState('1.5');
  const [customVecY, setCustomVecY] = useState('1.0');
  const [isWarpAnimating, setIsWarpAnimating] = useState(false);
  const [isVectorAnimating, setIsVectorAnimating] = useState(false);
  const [vectorAnimProgress, setVectorAnimProgress] = useState(1.0);

  const blockWidth = block.width || 520;
  const blockHeight = block.height || 540;
  const canvasWidth = blockWidth;
  const canvasHeight = Math.max(150, blockHeight - 200);

  // Apply linear interpolation of the transformation matrix
  // I + t * (M - I)
  const t = warpFactor;
  const m11 = 1 + t * (a - 1);
  const m12 = t * b;
  const m21 = t * c;
  const m22 = 1 + t * (d - 1);

  // Update coefficients
  const updateCoefficients = useCallback((updates) => {
    if (updateBlock) {
      updateBlock(block.id, updates);
    }
  }, [block.id, updateBlock]);

  // Set grid warp animation
  useEffect(() => {
    let animId;
    if (isWarpAnimating) {
      const startTime = performance.now();
      const duration = 1500; // 1.5s
      const startWarp = warpFactor;
      const targetWarp = warpFactor >= 0.5 ? 0.0 : 1.0;

      const animate = (time) => {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1.0);
        
        // Easing (easeInOutCubic)
        const t = progress < 0.5 
          ? 4 * progress * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        setWarpFactor(startWarp + (targetWarp - startWarp) * t);

        if (progress < 1.0) {
          animId = requestAnimationFrame(animate);
        } else {
          setIsWarpAnimating(false);
          setWarpFactor(targetWarp);
        }
      };
      animId = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animId);
  }, [isWarpAnimating]);

  // Set vector transition animation
  useEffect(() => {
    let animId;
    if (isVectorAnimating) {
      const startTime = performance.now();
      const duration = 1200; // 1.2s
      const animate = (time) => {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1.0);
        // Easing (easeOutCubic)
        const t = 1 - Math.pow(1 - progress, 3);
        setVectorAnimProgress(t);

        if (progress < 1.0) {
          animId = requestAnimationFrame(animate);
        } else {
          setIsVectorAnimating(false);
          setVectorAnimProgress(1.0);
        }
      };
      animId = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animId);
  }, [isVectorAnimating]);

  const triggerWarpAnimation = () => {
    setIsWarpAnimating(true);
  };

  const triggerVectorAnimation = () => {
    setVectorAnimProgress(0.0);
    setIsVectorAnimating(true);
  };

  // Draw the grid system and elements
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI retina screens
    const dpi = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpi;
    canvas.height = canvasHeight * dpi;
    ctx.scale(dpi, dpi);

    const w = canvasWidth;
    const h = canvasHeight;
    const x0 = w / 2;
    const y0 = h / 2;
    const scale = 36; // 36 pixels per unit

    // Clear background
    ctx.fillStyle = isDarkMode ? '#0c0c0f' : '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    // Already interpolated at component level (m11, m12, m21, m22)

    // Help coordinate transformations
    const transform = (x, y) => {
      const tx = m11 * x + m12 * y;
      const ty = m21 * x + m22 * y;
      return { x: tx, y: ty };
    };

    const toScreen = (tx, ty) => {
      return {
        x: x0 + tx * scale,
        y: y0 - ty * scale
      };
    };

    // 1. Draw static grid of reference
    ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)';
    ctx.lineWidth = 1;
    for (let i = -10; i <= 10; i++) {
      if (i === 0) continue;
      // Verticals
      const s1 = toScreen(i, -10);
      const s2 = toScreen(i, 10);
      ctx.beginPath();
      ctx.moveTo(s1.x, s1.y);
      ctx.lineTo(s2.x, s2.y);
      ctx.stroke();

      // Horizontals
      const s3 = toScreen(-10, i);
      const s4 = toScreen(10, i);
      ctx.beginPath();
      ctx.moveTo(s3.x, s3.y);
      ctx.lineTo(s4.x, s4.y);
      ctx.stroke();
    }

    // 2. Draw moving transformed grid
    ctx.strokeStyle = isDarkMode ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.15)';
    ctx.lineWidth = 1.5;
    
    // Draw horizontal grid lines (y constant, x varying)
    for (let y = -6; y <= 6; y++) {
      ctx.beginPath();
      const pStart = transform(-8, y);
      const sStart = toScreen(pStart.x, pStart.y);
      ctx.moveTo(sStart.x, sStart.y);
      
      for (let x = -7; x <= 8; x++) {
        const p = transform(x, y);
        const s = toScreen(p.x, p.y);
        ctx.lineTo(s.x, s.y);
      }
      ctx.stroke();
    }

    // Draw vertical grid lines (x constant, y varying)
    for (let x = -8; x <= 8; x++) {
      ctx.beginPath();
      const pStart = transform(x, -6);
      const sStart = toScreen(pStart.x, pStart.y);
      ctx.moveTo(sStart.x, sStart.y);
      
      for (let y = -5; y <= 6; y++) {
        const p = transform(x, y);
        const s = toScreen(p.x, p.y);
        ctx.lineTo(s.x, s.y);
      }
      ctx.stroke();
    }

    // 3. Draw standard cartesian axis (Identity reference)
    ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y0); ctx.lineTo(w, y0);
    ctx.moveTo(x0, 0); ctx.lineTo(x0, h);
    ctx.stroke();

    // 4. Draw unit circle or deformed ellipse
    if (showUnitCircle) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      
      // Draw reference circle
      ctx.beginPath();
      ctx.arc(x0, y0, scale, 0, 2 * Math.PI);
      ctx.stroke();
      
      ctx.setLineDash([]);
      
      // Draw transformed ellipse
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const initial = transform(1, 0);
      const sInitial = toScreen(initial.x, initial.y);
      ctx.moveTo(sInitial.x, sInitial.y);
      
      const steps = 80;
      for (let i = 1; i <= steps; i++) {
        const angle = (i / steps) * 2 * Math.PI;
        const cx = Math.cos(angle);
        const cy = Math.sin(angle);
        const p = transform(cx, cy);
        const s = toScreen(p.x, p.y);
        ctx.lineTo(s.x, s.y);
      }
      ctx.stroke();
    }

    // Arrow drawing helper
    const drawArrow = (from, to, color, thickness = 3) => {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = thickness;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();

      // Arrow head calculations
      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      ctx.beginPath();
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(to.x - 10 * Math.cos(angle - Math.PI / 6), to.y - 10 * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(to.x - 10 * Math.cos(angle + Math.PI / 6), to.y - 10 * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    };

    // 5. Draw primary basis vectors i_hat and j_hat
    const origin = toScreen(0, 0);
    
    // i_hat transformed: (m11, m21)
    const iHatPos = toScreen(m11, m21);
    drawArrow(origin, iHatPos, '#f43f5e', 4.5); // vibrant coral/rose
    
    // j_hat transformed: (m12, m22)
    const jHatPos = toScreen(m12, m22);
    drawArrow(origin, jHatPos, '#06b6d4', 4.5); // cian/teal

    // Text labels for basis vectors
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText("i'", iHatPos.x + 8, iHatPos.y - 4);

    ctx.fillStyle = '#06b6d4';
    ctx.fillText("j'", jHatPos.x + 8, jHatPos.y - 4);

    // 6. Draw Custom Vector if valid
    const vecX = parseFloat(customVecX);
    const vecY = parseFloat(customVecY);
    if (!isNaN(vecX) && !isNaN(vecY)) {
      const u = { x: vecX, y: vecY };
      
      // Calculate current animated vector position
      // Linear interpolate between original u and transformed M*u
      const uTrans = transform(u.x, u.y);
      
      const interpX = u.x + vectorAnimProgress * (uTrans.x - u.x);
      const interpY = u.y + vectorAnimProgress * (uTrans.y - u.y);
      
      const sCustom = toScreen(interpX, interpY);
      
      // Draw reference original vector in gray dotted
      if (vectorAnimProgress < 1.0) {
        ctx.setLineDash([3, 3]);
        const sOriginal = toScreen(u.x, u.y);
        drawArrow(origin, sOriginal, 'rgba(255,255,255,0.3)', 2);
        ctx.setLineDash([]);
      }
      
      // Draw actual custom vector
      drawArrow(origin, sCustom, '#8b5cf6', 4); // intense violet
      
      ctx.fillStyle = '#a78bfa';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText("u'", sCustom.x + 10, sCustom.y - 4);
    }
  }, [
    canvasWidth,
    canvasHeight,
    warpFactor,
    showUnitCircle,
    customVecX,
    customVecY,
    vectorAnimProgress,
    a, b, c, d,
    isDarkMode
  ]);

  const dotColor = '#8b5cf6'; // Violet

  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        onClick={(e) => { e.stopPropagation(); triggerWarpAnimation(); }}
        className="p-2 rounded-xl bg-white/[0.04] border border-white/5 hover:border-indigo-500/30 text-white/60 hover:text-white transition-all flex items-center gap-2 active:scale-95 text-[9px] uppercase font-black tracking-wider"
        title="Animar Deformação da Grade"
      >
        <Play size={10} className={isWarpAnimating ? 'animate-spin text-indigo-400' : ''} />
        Warp
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); setWarpFactor(warpFactor > 0.5 ? 0.0 : 1.0); }}
        className="p-2 rounded-xl bg-white/[0.04] border border-white/5 hover:border-indigo-500/30 text-white/60 hover:text-white transition-all active:scale-95"
        title="Resetar / Aplicar"
      >
        <RotateCcw size={10} />
      </button>
    </div>
  );

  return (
    <BlockWrapper
      ref={cardRef}
      block={block}
      title={block.customTitle || "Transformações Lineares"}
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
        {/* Visual Canvas Area */}
        <div className="relative overflow-hidden border-b border-white/5" style={{ height: `${canvasHeight}px` }}>
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              cursor: 'crosshair'
            }}
          />
          {/* Unit Vector Legend overlay */}
          <div className="absolute top-4 left-4 bg-[#0a0a0d]/80 backdrop-blur border border-white/5 rounded-2xl p-4 flex flex-col gap-2 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded bg-[#f43f5e] shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-wider text-white/50">Base î' = ({m11.toFixed(1)}, {m21.toFixed(1)})</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded bg-[#06b6d4] shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-wider text-white/50">Base ĵ' = ({m12.toFixed(1)}, {m22.toFixed(1)})</span>
            </div>
          </div>
        </div>

        {/* Dynamic Controls Grid */}
        <div className="p-5 flex flex-col gap-5 bg-black/15">
          {/* Row 1: Matrix elements and grid warp slider */}
          <div className="grid grid-cols-12 gap-5 items-center">
            {/* 2x2 Matrix Controls */}
            <div className="col-span-6 flex flex-col gap-2">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Transformação M</span>
              <div className="relative inline-flex items-center">
                {/* Visual Math Bracket Left */}
                <div className="w-2.5 border-l-2 border-y-2 border-indigo-500/40 rounded-l-lg h-20 shrink-0" />
                
                <div className="grid grid-cols-2 gap-2 p-2 w-full">
                  <input
                    type="number"
                    value={a}
                    step="0.1"
                    onChange={(e) => updateCoefficients({ matrixA: parseFloat(e.target.value) || 0 })}
                    className="bg-black/45 border border-white/5 rounded-lg py-2.5 text-center text-[10px] font-mono font-bold text-rose-400 focus:border-rose-500/40 outline-none w-full"
                    title="a"
                  />
                  <input
                    type="number"
                    value={b}
                    step="0.1"
                    onChange={(e) => updateCoefficients({ matrixB: parseFloat(e.target.value) || 0 })}
                    className="bg-black/45 border border-white/5 rounded-lg py-2.5 text-center text-[10px] font-mono font-bold text-cyan-400 focus:border-cyan-500/40 outline-none w-full"
                    title="b"
                  />
                  <input
                    type="number"
                    value={c}
                    step="0.1"
                    onChange={(e) => updateCoefficients({ matrixC: parseFloat(e.target.value) || 0 })}
                    className="bg-black/45 border border-white/5 rounded-lg py-2.5 text-center text-[10px] font-mono font-bold text-rose-400 focus:border-rose-500/40 outline-none w-full"
                    title="c"
                  />
                  <input
                    type="number"
                    value={d}
                    step="0.1"
                    onChange={(e) => updateCoefficients({ matrixD: parseFloat(e.target.value) || 0 })}
                    className="bg-black/45 border border-white/5 rounded-lg py-2.5 text-center text-[10px] font-mono font-bold text-cyan-400 focus:border-cyan-500/40 outline-none w-full"
                    title="d"
                  />
                </div>

                {/* Visual Math Bracket Right */}
                <div className="w-2.5 border-r-2 border-y-2 border-indigo-500/40 rounded-r-lg h-20 shrink-0" />
              </div>
            </div>

            {/* Warp Slider and Toggle */}
            <div className="col-span-6 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-[0.2em]">
                  <span className="opacity-40 flex items-center gap-2"><Sliders size={10} /> Deformação</span>
                  <span className="text-indigo-400">{(warpFactor * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.01"
                  value={warpFactor}
                  onChange={(e) => setWarpFactor(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-black/45 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Show Unit Circle Switch */}
              <button
                onClick={() => setShowUnitCircle(!showUnitCircle)}
                className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all active:scale-98 ${showUnitCircle ? 'bg-pink-500/10 border-pink-500/25 text-pink-400' : 'bg-black/25 border-white/5 text-white/30'}`}
              >
                <Circle size={14} className={showUnitCircle ? 'fill-pink-400/20' : ''} />
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-wider">Círculo Unitário</span>
                  <span className="text-[7px] opacity-60 uppercase font-bold mt-0.5">Ver deformação e autovalores</span>
                </div>
              </button>
            </div>
          </div>

          {/* Row 2: Custom vector input and action */}
          <div className="flex items-center gap-4 bg-black/25 border border-white/5 rounded-2xl p-4">
            <div className="flex flex-col gap-2 shrink-0">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Mapear Vetor u</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customVecX}
                  onChange={e => setCustomVecX(e.target.value)}
                  className="w-12 bg-black/45 border border-white/5 rounded-lg py-1.5 text-center text-[10px] font-mono font-black text-violet-300 outline-none"
                  placeholder="X"
                />
                <span className="text-white/20 text-[10px] font-black">,</span>
                <input
                  type="text"
                  value={customVecY}
                  onChange={e => setCustomVecY(e.target.value)}
                  className="w-12 bg-black/45 border border-white/5 rounded-lg py-1.5 text-center text-[10px] font-mono font-black text-violet-300 outline-none"
                  placeholder="Y"
                />
              </div>
            </div>

            <div className="w-[1px] h-10 bg-white/5" />

            <button
              onClick={triggerVectorAnimation}
              className="flex-1 flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-97 text-white text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-violet-600/25"
            >
              <span>Aplicar u' = M u</span>
              <ArrowRight size={12} className={isVectorAnimating ? 'animate-pulse' : ''} />
            </button>
          </div>
        </div>
      </div>
    </BlockWrapper>
  );
};

export default LinearTransformBlock;
