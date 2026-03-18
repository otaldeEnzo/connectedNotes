import React from 'react';

const SelectionGroupOverlay = ({ bounds, onResize, onMove, onStartInteraction, onEndInteraction, onDoubleClick, isLocked, activeTool, canvasScale, canvasPan }) => {
    if (!bounds) return null;

    const s = canvasScale ?? 1;
    const px = canvasPan?.x ?? 0;
    const py = canvasPan?.y ?? 0;

    const handlePointerDown = (e) => {
        if (e.button === 2) return;
        if (isLocked) { e.preventDefault(); e.stopPropagation(); return; }

        // Only stop propagation if we are in cursor/selection mode
        // If the user has a drawing tool (pen/highlighter), we want the events to bubble to CanvasArea
        const isDrawingTool = ['pen', 'highlighter'].includes(activeTool);
        if (isDrawingTool) {
            return; // Bubble to CanvasArea for drawing
        }

        e.stopPropagation(); e.preventDefault();
        if (onStartInteraction) onStartInteraction();
        const startX = e.clientX; const startY = e.clientY;
        let lastX = startX; let lastY = startY;
        const onPointerMove = (ev) => { const dx = ev.clientX - lastX; const dy = ev.clientY - lastY; onMove(dx, dy); lastX = ev.clientX; lastY = ev.clientY; };
        const onPointerUp = () => { window.removeEventListener('pointermove', onPointerMove); window.removeEventListener('pointerup', onPointerUp); if (onEndInteraction) onEndInteraction(); };
        window.addEventListener('pointermove', onPointerMove); window.addEventListener('pointerup', onPointerUp);
    };
    const handleResizeStart = (e, type) => {
        e.stopPropagation(); e.preventDefault();
        if (onStartInteraction) onStartInteraction();
        let lastX = e.clientX;
        let lastY = e.clientY;
        const onPointerMove = (ev) => {
            const dx = ev.clientX - lastX;
            const dy = ev.clientY - lastY;
            onResize(dx, dy, type);
            lastX = ev.clientX;
            lastY = ev.clientY;
        };
        const onPointerUp = () => { window.removeEventListener('pointermove', onPointerMove); window.removeEventListener('pointerup', onPointerUp); if (onEndInteraction) onEndInteraction(); };
        window.addEventListener('pointermove', onPointerMove); window.addEventListener('pointerup', onPointerUp);
    };
    const handleStyle = {
        background: 'white',
        border: '1.5px solid var(--accent-color)',
        borderRadius: '50%',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 1001,
        pointerEvents: 'auto',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
    };

    const handleHoverProps = {
        onMouseEnter: (e) => {
            e.target.style.transform = 'scale(1.3)';
            e.target.style.boxShadow = '0 0 15px var(--accent-glow)';
        },
        onMouseLeave: (e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        }
    };

    return (
        <div onPointerDown={handlePointerDown} onDoubleClick={(e) => { if (onDoubleClick) onDoubleClick(e); }} style={{
            position: 'absolute',
            left: px + (bounds.x - 5) * s,
            top: py + (bounds.y - 5) * s,
            transform: `scale(${s})`,
            transformOrigin: '0 0',
            width: bounds.width + 10,
            height: bounds.height + 10,
            border: isLocked ? '1.5px solid rgba(239, 68, 68, 0.6)' : '1px solid var(--accent-color)',
            borderRadius: '20px',
            backgroundColor: isLocked ? 'rgba(239, 68, 68, 0.05)' : 'rgba(99, 102, 241, 0.03)',
            boxShadow: isLocked ? '0 0 20px rgba(239, 68, 68, 0.15)' : '0 0 25px rgba(99, 102, 241, 0.15), inset 0 0 10px rgba(255, 255, 255, 0.1)',
            cursor: isLocked ? 'default' : 'move',
            zIndex: 1000,
            pointerEvents: 'auto',
        }}>
            {isLocked && (
                <div style={{ position: 'absolute', top: 8, right: 8, color: '#ef4444' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </div>
            )}
            {!isLocked && (
                <>
                    {/* Right Handle - Stretch Width */}
                    <div onPointerDown={(e) => handleResizeStart(e, 'right')} {...handleHoverProps} style={{ ...handleStyle, position: 'absolute', top: '50%', right: -7, width: 14, height: 14, marginTop: -7, cursor: 'ew-resize' }} title="Esticar Horizontalmente" />
                    {/* Bottom Handle - Stretch Height */}
                    <div onPointerDown={(e) => handleResizeStart(e, 'bottom')} {...handleHoverProps} style={{ ...handleStyle, position: 'absolute', bottom: -7, left: '50%', marginLeft: -7, width: 14, height: 14, cursor: 'ns-resize' }} title="Esticar Verticalmente" />
                    {/* Corner Handle - Proportional */}
                    <div onPointerDown={(e) => handleResizeStart(e, 'corner')} {...handleHoverProps} style={{ ...handleStyle, position: 'absolute', bottom: -7, right: -7, width: 14, height: 14, cursor: 'nwse-resize' }} title="Redimensionar (Proporcional)" />
                </>
            )}
        </div>
    );
};
export default SelectionGroupOverlay;
