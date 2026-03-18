import React, { useState, useEffect, useRef, useCallback } from 'react';

// Utilities for color conversion
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

const rgbToHex = (r, g, b) => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

const rgbToHsv = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max === min) {
    h = 0;
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: break;
    }
    h /= 6;
  }
  return { h, s, v };
};

const hsvToRgb = (h, s, v) => {
  let r, g, b;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
    default: break;
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
};

const ColorPicker = ({ color, onChange, onComplete, recentColors, colorIdeas }) => {
  const [hsv, setHsv] = useState(() => {
    const rgb = hexToRgb(color);
    return rgbToHsv(rgb.r, rgb.g, rgb.b);
  });

  // Use a ref to track current hex color to avoid closure staleness in event listeners
  const currentHexRef = useRef(color);
  useEffect(() => {
    currentHexRef.current = color;
  }, [color]);

  const satValRef = useRef(null);
  const hueRef = useRef(null);

  useEffect(() => {
    const rgb = hexToRgb(color);
    const newHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    setHsv(prev => {
      const currentHex = rgbToHex(...Object.values(hsvToRgb(prev.h, prev.s, prev.v)));
      if (currentHex.toLowerCase() !== color.toLowerCase()) {
        return newHsv;
      }
      return prev;
    });
  }, [color]);

  const updateColor = useCallback((newHsv) => {
    setHsv(newHsv);
    const rgb = hsvToRgb(newHsv.h, newHsv.s, newHsv.v);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    onChange(hex);
    currentHexRef.current = hex; // Update ref immediately for sync onComplete
  }, [onChange]);

  const handleSatValMove = (e) => {
    if (!satValRef.current) return;
    const rect = satValRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
    updateColor({ ...hsv, s: x, v: y });
  };

  const handleHueMove = (e) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    updateColor({ ...hsv, h: x });
  };

  const startSatValDrag = (e) => {
    handleSatValMove(e);
    const move = (ev) => handleSatValMove(ev);
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      if (onComplete) onComplete(currentHexRef.current);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const startHueDrag = (e) => {
    handleHueMove(e);
    const move = (ev) => handleHueMove(ev);
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      if (onComplete) onComplete(currentHexRef.current);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const currentRgb = hsvToRgb(hsv.h, hsv.s, hsv.v);

  return (
    <div className="glass-extreme" style={{
      display: 'flex', gap: '16px', padding: '16px', borderRadius: '24px',
      pointerEvents: 'auto', userSelect: 'none',
      color: '#ffffff',
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(var(--glass-blur)) saturate(180%) brightness(1.1)',
      WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(180%) brightness(1.1)',
      border: '1px solid var(--glass-border)',
      borderTop: '1px solid var(--glass-border-top)',
      borderLeft: '1px solid var(--glass-border-left)',
      boxShadow: 'var(--glass-shadow)',
      fontSmoothing: 'antialiased',
      WebkitFontSmoothing: 'antialiased',
      textRendering: 'optimizeLegibility'
    }}>
      {/* Main Picker Column */}
      <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Saturation/Value Area */}
        <div
          ref={satValRef}
          onMouseDown={startSatValDrag}
          style={{
            width: '100%', height: '140px', borderRadius: '12px',
            position: 'relative', cursor: 'crosshair',
            background: `
              linear-gradient(to top, #000, transparent),
              linear-gradient(to right, #fff, transparent),
              hsl(${hsv.h * 360}, 100%, 50%)
            `,
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
          }}
        >
          <div style={{
            position: 'absolute', left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`,
            width: '18px', height: '18px', borderRadius: '50%',
            border: '2.5px solid white', boxShadow: '0 0 8px rgba(0,0,0,0.6)',
            transform: 'translate(-50%, -50%)', pointerEvents: 'none'
          }} />
        </div>

        {/* Controls Row */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '50%',
            backgroundColor: color, border: '2px solid white',
            flexShrink: 0, boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
            transform: 'translateZ(0)'
          }} />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
            {/* Hue Slider */}
            <div
              ref={hueRef}
              onMouseDown={startHueDrag}
              style={{
                width: '100%', height: '12px', borderRadius: '6px',
                position: 'relative', cursor: 'grab',
                background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.05)'
              }}
            >
              <div style={{
                position: 'absolute', left: `${hsv.h * 100}%`, top: '50%',
                width: '16px', height: '16px', borderRadius: '50%',
                backgroundColor: 'white', boxShadow: '0 1px 5px rgba(0,0,0,0.4)',
                transform: 'translate(-50%, -50%)', pointerEvents: 'none',
                border: '1px solid #fff'
              }} />
            </div>

            {/* Hex/RGB Info */}
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', minWidth: 0 }}>
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '6px',
                padding: '4px 10px', fontSize: '11px', color: '#fff',
                fontWeight: '700', letterSpacing: '0.8px', border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.1)'
              }}>
                {color.toUpperCase()}
              </div>
              <div style={{ display: 'flex', gap: '3px', flex: 1 }}>
                {['r', 'g', 'b'].map(k => (
                  <div key={k} style={{
                    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '5px',
                    padding: '3px 0', fontSize: '11px', color: '#fff',
                    flex: 1, textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)',
                    fontWeight: '600'
                  }}>
                    {currentRgb[k]}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side Discovery Column */}
      <div
        className="custom-scrollbar"
        style={{
          width: '190px', display: 'flex', flexDirection: 'column', gap: '16px',
          borderLeft: '1px solid rgba(255,255,255,0.12)', paddingLeft: '16px',
          maxHeight: '210px', overflowY: 'auto',
          transform: 'translateZ(0)'
        }}
      >
        {recentColors.length > 0 && (
          <div>
            <div style={{
              fontSize: '11px', opacity: 1, marginBottom: '10px',
              textTransform: 'uppercase', fontWeight: '900', letterSpacing: '1.5px',
              color: 'var(--accent-color)', textShadow: '0 1px 2px rgba(0,0,0,0.5)'
            }}>Recentes</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {recentColors.map((c, i) => (
                <div
                  key={`${c}-${i}`}
                  onClick={() => {
                    onChange(c);
                  }}
                  onDoubleClick={() => {
                    onChange(c);
                    if (onComplete) onComplete(c);
                  }}
                  className="liquid-item"
                  style={{
                    width: '30px', height: '30px', borderRadius: '10px', background: c, cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.2)', transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => { 
                    e.currentTarget.style.transform = 'translateY(-4px) scale(1.15)'; 
                    e.currentTarget.style.boxShadow = `0 8px 20px ${c}60`;
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.8)'; 
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.transform = 'translateY(0) scale(1)'; 
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; 
                  }}
                >
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 50%)', pointerEvents: 'none' }} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div style={{
            fontSize: '11px', opacity: 1, marginBottom: '10px',
            textTransform: 'uppercase', fontWeight: '900', letterSpacing: '1.5px',
            color: 'var(--accent-color)', textShadow: '0 1px 2px rgba(0,0,0,0.5)'
          }}>Ideias</div>
          {colorIdeas.map(palette => (
            <div key={palette.name} style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', opacity: 1, marginBottom: '8px', fontWeight: '800', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>{palette.name}</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {palette.colors.map(c => (
                  <div
                    key={c}
                    onClick={() => {
                      onChange(c);
                    }}
                    onDoubleClick={() => {
                      onChange(c);
                      if (onComplete) onComplete(c);
                    }}
                    className="liquid-item"
                    style={{
                      width: '26px', height: '26px', borderRadius: '8px', background: c, cursor: 'pointer',
                      border: '1px solid rgba(255,255,255,0.2)', transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => { 
                      e.currentTarget.style.transform = 'translateY(-3px) scale(1.15)'; 
                      e.currentTarget.style.boxShadow = `0 6px 15px ${c}60`;
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.8)'; 
                    }}
                    onMouseLeave={(e) => { 
                      e.currentTarget.style.transform = 'translateY(0) scale(1)'; 
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; 
                    }}
                  >
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)', pointerEvents: 'none' }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ColorPicker;
