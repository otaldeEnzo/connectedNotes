import React, { useState, useEffect, useRef } from 'react';
import BlockWrapper from '../BlockWrapper';
import { Play, RotateCcw, Sliders } from 'lucide-react';

const FourierVisualizer = ({
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
  const [waveType, setWaveType] = useState(block.waveType || 'square'); // 'square', 'sawtooth', 'triangle'
  const [harmonics, setHarmonics] = useState(block.harmonics || 4);
  const [isPlaying, setIsPlaying] = useState(false);

  const blockWidth = block.width || 520;
  const blockHeight = block.height || 540;
  const canvasWidth = blockWidth;
  const canvasHeight = Math.max(150, blockHeight - 200);

  // Trigger continuous animation of wave motion/scrolling
  useEffect(() => {
    let animId;
    let t = 0;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const dpi = window.devicePixelRatio || 1;
      canvas.width = canvasWidth * dpi;
      canvas.height = canvasHeight * dpi;
      ctx.scale(dpi, dpi);

      const w = canvasWidth;
      const h = canvasHeight;
      const x0 = 80;
      const y0 = h / 2;
      const yScale = 40; // Amplitude scale in pixels
      const xScale = 1.2;  // Scrolling speed scale

      // Background
      ctx.fillStyle = isDarkMode ? '#0c0c0f' : '#f8fafc';
      ctx.fillRect(0, 0, w, h);

      // Draw baseline axis
      ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y0); ctx.lineTo(w, y0);
      ctx.moveTo(x0, 0); ctx.lineTo(x0, h);
      ctx.stroke();

      // Formula helpers for harmonics
      // n represents the term index (1, 2, 3...)
      const getHarmonicAmp = (n) => {
        if (waveType === 'square') {
          // Only odd terms
          if (n % 2 === 0) return 0;
          return 1.2 / n; // 4/pi * 1/n approx
        } else if (waveType === 'sawtooth') {
          // All terms, alternating signs
          return 0.8 * (Math.pow(-1, n + 1) / n);
        } else {
          // Triangle: Only odd terms, quadratic decay
          if (n % 2 === 0) return 0;
          return 1.4 * (Math.pow(-1, (n - 1) / 2) / (n * n));
        }
      };

      // 1. Draw individual harmonics in thin translucent cyan
      if (harmonics <= 8) {
        ctx.lineWidth = 0.8;
        for (let n = 1; n <= harmonics; n++) {
          const amp = getHarmonicAmp(n);
          if (amp === 0) continue;

          ctx.strokeStyle = `hsla(180, 70%, 50%, 0.18)`;
          ctx.beginPath();
          let started = false;

          for (let screenX = x0; screenX <= w; screenX += 2) {
            const rad = ((screenX - x0) * 0.05) - t;
            const val = amp * Math.sin(n * rad);
            const screenY = y0 - val * yScale;

            if (!started) {
              ctx.moveTo(screenX, screenY);
              started = true;
            } else {
              ctx.lineTo(screenX, screenY);
            }
          }
          ctx.stroke();
        }
      }

      // 2. Draw Cumulative Fourier Sum (Vibrant Yellow/Orange)
      ctx.strokeStyle = '#f59e0b'; // Amber/Orange
      ctx.lineWidth = 3;
      ctx.beginPath();
      let started = false;

      for (let screenX = x0; screenX <= w; screenX += 2) {
        let fourierVal = 0;
        const rad = ((screenX - x0) * 0.05) - t;

        for (let n = 1; n <= harmonics; n++) {
          const amp = getHarmonicAmp(n);
          if (amp === 0) continue;
          
          if (waveType === 'triangle') {
            fourierVal += amp * Math.cos(n * rad);
          } else {
            fourierVal += amp * Math.sin(n * rad);
          }
        }

        const screenY = y0 - fourierVal * yScale;
        if (!started) {
          ctx.moveTo(screenX, screenY);
          started = true;
        } else {
          ctx.lineTo(screenX, screenY);
        }
      }
      ctx.stroke();

      // 3. Draw "Harmonic Circles Vector Chain" on the left
      // This visualizes how rotating phasors sum up to the final amplitude
      let cx = x0 - 45;
      let cy = y0;
      ctx.lineWidth = 0.8;

      for (let n = 1; n <= harmonics; n++) {
        const amp = getHarmonicAmp(n);
        if (amp === 0) continue;

        const rad = -t;
        const phase = waveType === 'triangle' ? Math.cos(n * rad) : Math.sin(n * rad);
        const nextX = cx + (waveType === 'triangle' ? amp * Math.cos(n * rad) : amp * Math.sin(n * rad)) * yScale;
        const nextY = cy - (waveType === 'triangle' ? amp * Math.sin(n * rad) : amp * Math.cos(n * rad)) * yScale;

        // Draw phasor circle
        ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
        ctx.beginPath();
        ctx.arc(cx, cy, Math.abs(amp) * yScale, 0, 2 * Math.PI);
        ctx.stroke();

        // Draw phasor line
        ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(nextX, nextY);
        ctx.stroke();

        cx = nextX;
        cy = nextY;
      }

      // Draw indicator dot at phasor end
      ctx.fillStyle = '#ef4444'; // Red point
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
      ctx.fill();

      // Draw thin dotted line connecting phasor end to the wave scrolling start
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x0, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Increment phase time if playing
      if (isPlaying) {
        t += 0.05;
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [canvasWidth, canvasHeight, waveType, harmonics, isPlaying, isDarkMode]);

  const dotColor = '#f59e0b'; // Amber

  return (
    <BlockWrapper
      ref={cardRef}
      block={block}
      title={block.customTitle || `Síntese de Fourier: Onda ${waveType === 'square' ? 'Quadrada' : waveType === 'sawtooth' ? 'Dente de Serra' : 'Triangular'}`}
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
            onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
            className={`p-2 rounded-xl border text-[9px] uppercase tracking-wider font-black active:scale-95 transition-all ${isPlaying ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-white/[0.04] border-white/5 text-white/50'}`}
          >
            <Play size={10} className={isPlaying ? 'animate-pulse fill-amber-400' : ''} />
            Animação
          </button>
        </div>
      }
      updateBlock={updateBlock}
      canvasScale={canvasScale}
      canvasPan={canvasPan}
    >
      <div className="flex flex-col h-full select-none" onPointerDown={e => e.stopPropagation()}>
        {/* Canvas Display */}
        <div className="relative overflow-hidden border-b border-white/5" style={{ height: `${canvasHeight}px` }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>

        {/* Dynamic Controls Grid */}
        <div className="p-5 flex flex-col gap-5 bg-black/15">
          <div className="grid grid-cols-12 gap-5 items-center">
            {/* Wave Selector */}
            <div className="col-span-6 flex flex-col gap-2">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Tipo de Onda Alvo</span>
              <select
                value={waveType}
                onChange={e => { setWaveType(e.target.value); if (updateBlock) updateBlock(block.id, { waveType: e.target.value }); }}
                className="bg-black/45 border border-white/5 rounded-xl px-4 py-2 text-[10px] font-bold text-amber-300 outline-none w-full"
              >
                <option value="square">Onda Quadrada</option>
                <option value="sawtooth">Onda Dente de Serra</option>
                <option value="triangle">Onda Triangular</option>
              </select>
            </div>

            {/* Terms Slider */}
            <div className="col-span-6 flex flex-col gap-2">
              <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-[0.2em]">
                <span className="opacity-40 flex items-center gap-2"><Sliders size={10} /> Harmônicas (N)</span>
                <span className="text-amber-400">N = {harmonics}</span>
              </div>
              <input
                type="range"
                min="1"
                max="80"
                step="1"
                value={harmonics}
                onChange={(e) => setHarmonics(parseInt(e.target.value))}
                className="w-full h-1.5 bg-black/45 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>
        </div>
      </div>
    </BlockWrapper>
  );
};

export default FourierVisualizer;
