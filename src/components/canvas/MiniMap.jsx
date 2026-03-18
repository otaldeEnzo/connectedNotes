import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';

const MiniMap = ({
    blocks,
    strokes,
    panOffset,
    scale,
    viewportWidth,
    viewportHeight,
    onMoveView,
    activeNoteType
}) => {
    const mapRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    const viewW = viewportWidth / scale;
    const viewH = viewportHeight / scale;
    const viewX = -panOffset.x / scale;
    const viewY = -panOffset.y / scale;

    // 1. Content Bounds
    const content = useMemo(() => {
        if (blocks.length === 0 && strokes.length === 0) {
            return { minX: 0, minY: 0, maxX: 1000, maxY: 1000, w: 1000, h: 1000, cx: 500, cy: 500 };
        }
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        blocks.forEach(b => {
            const w = b.width || 200;
            const h = b.height || 100;
            minX = Math.min(minX, b.x);
            minY = Math.min(minY, b.y);
            maxX = Math.max(maxX, b.x + w);
            maxY = Math.max(maxY, b.y + h);
        });
        strokes.forEach(s => {
            s.points.forEach(p => {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            });
        });

        // IMPORTANTE: Incluir o Viewport nos limites para não "perder" a nota ao scrollar
        minX = Math.min(minX, viewX);
        minY = Math.min(minY, viewY);
        maxX = Math.max(maxX, viewX + viewW);
        maxY = Math.max(maxY, viewY + viewH);

        const w = maxX - minX;
        const h = maxY - minY;
        return {
            minX, minY, maxX, maxY,
            w: Math.max(w, 1000),
            h: Math.max(h, 1000),
            cx: minX + w / 2,
            cy: minY + h / 2
        };
    }, [blocks, strokes, viewX, viewY, viewW, viewH]);

    // 2. Map Layout (VS Code Style: Vertical Strip)
    const MAP_WIDTH = 120;

    // The bounds of the world visible in the minimap strip
    const bounds = useMemo(() => {
        const MAP_ASPECT = MAP_WIDTH / viewportHeight;

        // Alinha o topo (Y) ao Math.min(0, content.minY) para começar do "início".
        const startY = Math.min(0, content.minY) - 200;

        // Define a largura baseada no conteúdo + padding (não usamos mais mapLocalZoom)
        const baseW = (content.maxX - content.minX + 600);
        const baseH = (content.maxY - startY + 400);

        let targetW = baseW;
        let targetH = targetW / MAP_ASPECT;

        // Garante que o conteúdo caiba na altura
        if (targetH < baseH) {
            targetH = baseH;
            targetW = targetH * MAP_ASPECT;
        }

        // Centraliza HORIZONTALMENTE no corpo
        return {
            x: content.cx - targetW / 2,
            y: startY,
            width: targetW,
            height: targetH
        };
    }, [content, viewportHeight]);

    const ratio = MAP_WIDTH / bounds.width;

    const navigateTo = (clientX, clientY) => {
        if (!mapRef.current) return;
        const rect = mapRef.current.getBoundingClientRect();
        const clickX = clientX - rect.left;
        const clickY = clientY - rect.top;

        // Note: clickY is in 0..viewportHeight range
        const worldX = (clickX / ratio) + bounds.x;
        const worldY = (clickY / ratio) + bounds.y;

        const shouldClamp = activeNoteType === 'canvas';

        let nextX = -(worldX * scale) + (viewportWidth / 2);
        let nextY = -(worldY * scale) + (viewportHeight / 2);

        if (shouldClamp) {
            nextX = Math.min(nextX, 0);
            nextY = Math.min(nextY, 0);
        }

        onMoveView({ x: nextX, y: nextY });
    };

    const handlePointerDown = (e) => {
        e.stopPropagation();
        e.preventDefault();
        setIsDragging(true);
        navigateTo(e.clientX, e.clientY);
        if (mapRef.current) mapRef.current.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (!isDragging) return;
        navigateTo(e.clientX, e.clientY);
    };

    const handlePointerUp = (e) => {
        setIsDragging(false);
        if (mapRef.current) mapRef.current.releasePointerCapture(e.pointerId);
    };

    const handleWheel = useCallback((e) => {
        e.stopPropagation();
        e.preventDefault();

        // Em vez de zoom, vamos scrollar o canvas principal
        // Isso faz o minimapa parecer uma extensão do scroll do VS Code
        const dx = e.deltaX;
        const dy = e.deltaY;

        const shouldClamp = activeNoteType === 'canvas';

        onMoveView(prev => ({
            x: shouldClamp ? Math.min(prev.x - dx, 0) : prev.x - dx,
            y: shouldClamp ? Math.min(prev.y - dy, 0) : prev.y - dy
        }));
    }, [onMoveView, activeNoteType]);

    useEffect(() => {
        const el = mapRef.current;
        if (!el) return;

        const onWheel = (e) => {
            handleWheel(e);
        };

        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [handleWheel]);

    return (
        <div
            ref={mapRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                right: 0,
                width: `${MAP_WIDTH}px`,
                background: 'rgba(15, 23, 42, 0.4)',
                backdropFilter: 'blur(4px)',
                borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
                zIndex: 1000,
                cursor: 'pointer',
                userSelect: 'none',
                touchAction: 'none',
                overflow: 'hidden',
                transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(15, 23, 42, 0.6)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(15, 23, 42, 0.4)'}
        >
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                {/* Visual Elements */}
                <div style={{ pointerEvents: 'none', opacity: 0.6 }}>
                    {blocks.map(b => (
                        <div
                            key={b.id}
                            style={{
                                position: 'absolute',
                                left: `${(b.x - bounds.x) * ratio}px`,
                                top: `${(b.y - bounds.y) * ratio}px`,
                                width: `${Math.max(1, (b.width || 200) * ratio)}px`,
                                height: `${Math.max(1, (b.height || 100) * ratio)}px`,
                                background: 'rgba(255, 255, 255, 0.2)',
                                borderRadius: '1px'
                            }}
                        />
                    ))}

                    {strokes.map(s => {
                        let sMinX = s.points[0].x, sMinY = s.points[0].y, sMaxX = s.points[0].x, sMaxY = s.points[0].y;
                        for (let i = 1; i < s.points.length; i++) {
                            const p = s.points[i];
                            if (p.x < sMinX) sMinX = p.x; if (p.x > sMaxX) sMaxX = p.x;
                            if (p.y < sMinY) sMinY = p.y; if (p.y > sMaxY) sMaxY = p.y;
                        }
                        return (
                            <div
                                key={s.id}
                                style={{
                                    position: 'absolute',
                                    left: `${(sMinX - bounds.x) * ratio}px`,
                                    top: `${(sMinY - bounds.y) * ratio}px`,
                                    width: `${Math.max(0.5, (sMaxX - sMinX) * ratio)}px`,
                                    height: `${Math.max(0.5, (sMaxY - sMinY) * ratio)}px`,
                                    background: 'rgba(255, 255, 255, 0.1)',
                                }}
                            />
                        );
                    })}
                </div>

                {/* Viewport Box (The Slider) */}
                <div
                    style={{
                        position: 'absolute',
                        left: `${(viewX - bounds.x) * ratio}px`,
                        top: `${(viewY - bounds.y) * ratio}px`,
                        width: `${viewW * ratio}px`,
                        height: `${viewH * ratio}px`,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
                        pointerEvents: 'none',
                        zIndex: 10
                    }}
                />
            </div>
        </div>
    );
};

export default React.memo(MiniMap);
