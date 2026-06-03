import React from 'react';

const SelectionGroupOverlay = ({ bounds, onResize, onStartDrag, onStartInteraction, onEndInteraction, onDoubleClick, isLocked, activeTool, canvasScale, canvasPan, isFreeformOnly }) => {
    if (!bounds) return null;

    const s = canvasScale ?? 1;
    const px = canvasPan?.x ?? 0;
    const py = canvasPan?.y ?? 0;

    const handleResizeStart = (e, type) => {
        e.stopPropagation(); e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        if (onStartInteraction) onStartInteraction(true); // true = resize mode
        
        const onPointerMove = (ev) => {
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;
            onResize(dx, dy, type);
        };
        const onPointerUp = () => { 
            window.removeEventListener('pointermove', onPointerMove); 
            window.removeEventListener('pointerup', onPointerUp); 
            if (onEndInteraction) onEndInteraction(); 
        };
        window.addEventListener('pointermove', onPointerMove); window.addEventListener('pointerup', onPointerUp);
    };
    const handleStyle = {
        background: 'white',
        border: activeTool === 'ai-lasso' ? '1.5px solid #14b8a6' : '1.5px solid var(--accent-color)',
        borderRadius: '50%',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 9005,
        pointerEvents: 'auto',
        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease'
    };

    const handleHoverProps = {
        onMouseEnter: (e) => {
            e.target.style.transform = 'scale(1.4)';
            e.target.style.boxShadow = activeTool === 'ai-lasso' ? '0 0 15px rgba(20, 184, 166, 0.6)' : '0 0 15px var(--accent-glow)';
        },
        onMouseLeave: (e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        }
    };

    const containerPadding = 12;
    const hitAreaSize = 48; // Healthy hit area

    return (
        <div 
            onDoubleClick={(e) => { if (onDoubleClick) onDoubleClick(e); }} 
            className="selection-overlay-container"
            style={{
                position: 'absolute',
                left: px + (bounds.x - containerPadding) * s,
                top: py + (bounds.y - containerPadding) * s,
                transform: `scale(${s})`,
                transformOrigin: '0 0',
                width: bounds.width + (containerPadding * 2),
                height: bounds.height + (containerPadding * 2),
                zIndex: 6000, 
                pointerEvents: 'none', // Crucial to allow clicking into the text editor
            }}
        >
            {/* Movement Backplane (Border only) */}
            {!isLocked && !isFreeformOnly && (
                <div 
                    onPointerDown={(e) => { e.stopPropagation(); if (onStartDrag) onStartDrag(e); }}
                    style={{
                        position: 'absolute',
                        inset: containerPadding - 2, // Precisely on the visual border
                        cursor: 'move',
                        pointerEvents: 'auto',
                        zIndex: 1000,
                        border: activeTool === 'ai-lasso' ? '2px dashed #14b8a6' : '2px dashed var(--accent-color)',
                        borderRadius: '16px',
                        backgroundColor: 'transparent'
                    }}
                />
            )}

            {isLocked && (
                <div style={{ 
                    position: 'absolute', 
                    inset: containerPadding, 
                    border: '2px solid rgba(239, 68, 68, 0.6)', 
                    borderRadius: '16px', 
                    backgroundColor: 'rgba(239, 68, 68, 0.05)',
                    boxShadow: '0 0 20px rgba(239, 68, 68, 0.15)',
                    pointerEvents: 'auto'
                }}>
                    <div style={{ position: 'absolute', top: 12, right: 12, color: '#ef4444' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    </div>
                </div>
            )}

            {!isLocked && !isFreeformOnly && (
                <>
                    {/* Handles aligned perfectly with block edges */}
                    <div 
                        onPointerDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'right'); }} 
                        {...handleHoverProps}
                        style={{ 
                            ...handleStyle, 
                            position: 'absolute', 
                            top: '50%', 
                            right: containerPadding - 7, 
                            width: 14, 
                            height: 14, 
                            marginTop: -7, 
                            cursor: 'ew-resize' 
                        }}
                        title="Esticar Horizontalmente"
                    />

                    <div 
                        onPointerDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'bottom'); }} 
                        {...handleHoverProps}
                        style={{ 
                            ...handleStyle, 
                            position: 'absolute', 
                            bottom: containerPadding - 7, 
                            left: '50%', 
                            marginLeft: -7, 
                            width: 14, 
                            height: 14, 
                            cursor: 'ns-resize' 
                        }}
                        title="Esticar Verticalmente"
                    />

                    <div 
                        onPointerDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'corner'); }} 
                        {...handleHoverProps}
                        style={{ 
                            ...handleStyle, 
                            position: 'absolute', 
                            bottom: containerPadding - 8, 
                            right: containerPadding - 8, 
                            width: 16, 
                            height: 16, 
                            background: activeTool === 'ai-lasso' ? '#14b8a6' : 'var(--accent-color)', 
                            border: '2px solid white', 
                            cursor: 'nwse-resize' 
                        }}
                        title="Redimensionar (Proporcional)"
                    />
                </>
            )}
        </div>
    );
};
export default SelectionGroupOverlay;
