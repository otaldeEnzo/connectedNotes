import React from 'react';

const SelectionToolbar = ({ bounds, scale = 1, position = { x: 0, y: 0 }, viewportWidth = 1000, onGroup, onUngroup, onLock, onUnlock, onBringToFront, onSendToBack, isGrouped, isLocked, onColorChange, onStyleChange, onConvertToMath, isConverting, selectionTypes = [] }) => {
    const hasOnlyPDF = selectionTypes.length > 0 && selectionTypes.every(t => t === 'pdf');
    const hasPDF = selectionTypes.includes('pdf');
    const hasStroke = selectionTypes.includes('stroke');
    const hasConnection = selectionTypes.includes('connection');
    const hasDrawing = hasStroke || hasConnection;
    const hasImage = selectionTypes.includes('image');
    const hasOnlyImage = selectionTypes.length > 0 && selectionTypes.every(t => t === 'image');
    const hasBlock = selectionTypes.some(t => ['text', 'code', 'math', 'ggb', 'mermaid', 'mindmap', 'image'].includes(t));
    if (!bounds || (bounds.width === 0 && bounds.height === 0)) return null;

    // Convert World Bounds to Screen Bounds
    const screenX = bounds.x * scale + position.x;
    const screenY = bounds.y * scale + position.y;
    const screenW = bounds.width * scale;
    const screenH = bounds.height * scale;

    // Se estiver muito perto do topo (y < 60), joga a barra para baixo do objeto
    const isNearTop = screenY < 60;
    const topPos = isNearTop ? (screenY + screenH + 10) : (screenY - 45);

    // [POLISH] Constrain to viewport so it doesn't clip off-screen
    const constrainedX = Math.max(180, Math.min(viewportWidth - 180, screenX + (screenW / 2)));

    const style = {
        position: 'absolute', 
        left: constrainedX, 
        top: topPos, 
        transform: 'translateX(-50%)',
        display: 'flex', 
        gap: '4px', 
        padding: '8px', 
        borderRadius: '2.5rem', 
        zIndex: 50000, // Top of everything
        pointerEvents: 'auto',
        background: 'var(--glass-bg-floating)', 
        backdropFilter: 'blur(32px) saturate(180%) brightness(1.2)',
        WebkitBackdropFilter: 'blur(32px) saturate(180%) brightness(1.2)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: 'var(--glass-shadow), 0 10px 30px rgba(0,0,0,0.1)'
    };
    const btnStyle = { border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', color: 'var(--text-primary)', transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)' };

    return (
        <div className="selection-toolbar glass-extreme animate-in fade-in slide-in-from-bottom-2 duration-300" style={style} onMouseDown={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
            {(onGroup || onUngroup) && (
                <button className="liquid-item" style={btnStyle} onClick={isGrouped ? onUngroup : onGroup} title={isGrouped ? "Desagrupar (Ctrl+G)" : "Agrupar (Ctrl+G)"}>
                    {isGrouped ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                        : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>}
                </button>
            )}

            {(onLock || onUnlock) && (
                <>
                    <div style={{ width: '1px', background: 'var(--border-color)', margin: '0 2px', opacity: 0.5 }} />
                    <button className="liquid-item" style={btnStyle} onClick={isLocked ? onUnlock : onLock} title={isLocked ? "Desbloquear" : "Bloquear"}>
                        {isLocked ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>}
                    </button>
                </>
            )}

            {(onBringToFront || onSendToBack) && (
                <>
                    <div style={{ width: '1px', background: 'var(--border-color)', margin: '0 2px', opacity: 0.5 }} />
                    {onBringToFront && (
                        <button className="liquid-item" style={btnStyle} onClick={onBringToFront} title="Trazer para Frente">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15" /><path d="M12 9v14" /><path d="M4 4h16" /></svg>
                        </button>
                    )}
                    {onSendToBack && (
                        <button className="liquid-item" style={btnStyle} onClick={onSendToBack} title="Enviar para Trás">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /><path d="M12 15V1" /><path d="M20 20H4" /></svg>
                        </button>
                    )}
                </>
            )}

            {/* Color Picker Section */}
            {onColorChange && !hasOnlyPDF && !hasOnlyImage && (
                <>
                    <div style={{ width: '1px', background: 'var(--border-color)', margin: '0 2px', opacity: 0.5 }} />
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {['#000000', '#64748b', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'].map(c => (
                            <button
                                key={c}
                                onMouseDown={(e) => { e.stopPropagation(); onColorChange(c); }}
                                style={{
                                    width: 16, height: 16, borderRadius: '50%',
                                    backgroundColor: c,
                                    border: '1px solid rgba(0,0,0,0.1)',
                                    cursor: 'pointer',
                                    padding: 0
                                }}
                                title={c}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* Style & Marker Section */}
            {onStyleChange && hasDrawing && (
                <>
                    <div style={{ width: '1px', background: 'var(--border-color)', margin: '0 2px', opacity: 0.5 }} />

                    {/* Line Style: Solid / Dashed / Dotted */}
                    <button className="liquid-item" style={btnStyle} onClick={() => onStyleChange({ lineStyle: 'solid' })} title="Linha Sólida">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="2" y1="12" x2="22" y2="12" /></svg>
                    </button>
                    <button className="liquid-item" style={btnStyle} onClick={() => onStyleChange({ lineStyle: 'dashed' })} title="Linha Tracejada">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="2" y1="12" x2="6" y2="12" /><line x1="10" y1="12" x2="14" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /></svg>
                    </button>

                    <div style={{ width: '1px', background: 'var(--border-color)', margin: '0 2px', opacity: 0.2 }} />

                    {/* End Marker: None / Arrow / Circle / Diamond */}
                    <button className="liquid-item" style={btnStyle} onClick={() => onStyleChange({ endMarker: 'none' })} title="Sem Ponta">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="12" x2="20" y2="12" /></svg>
                    </button>
                    <button className="liquid-item" style={btnStyle} onClick={() => onStyleChange({ endMarker: 'arrow' })} title="Seta">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /><path d="M15 8l4 4-4 4" /></svg>
                    </button>
                    <button className="liquid-item" style={btnStyle} onClick={() => onStyleChange({ endMarker: 'circle' })} title="Círculo">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="12" x2="16" y2="12" /><circle cx="19" cy="12" r="3" /></svg>
                    </button>
                </>
            )}

            {onConvertToMath && hasStroke && !hasPDF && (
                <>
                    <div style={{ width: '1px', background: 'var(--border-color)', margin: '0 2px', opacity: 0.5 }} />
                    <button
                        className="liquid-item"
                        style={{
                            ...btnStyle,
                            color: isConverting ? '#94a3b8' : '#f59e0b',
                            gap: '4px',
                            fontWeight: 'bold',
                            opacity: isConverting ? 0.6 : 1,
                            cursor: isConverting ? 'wait' : 'pointer'
                        }}
                        onClick={!isConverting ? onConvertToMath : undefined}
                        title={isConverting ? "Convertendo..." : "Assistente Matemático (Converter desenho)"}
                        disabled={isConverting}
                    >
                        {isConverting ? (
                            <svg className="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 7V4H6l7 8-7 8h12v-3" /></svg>
                        )}
                        <span style={{ fontSize: '0.7rem' }}>{isConverting ? '...' : 'Math'}</span>
                    </button>
                    {isConverting && (
                        <style>{`
                            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                            .spin { animation: spin 1s linear infinite; }
                        `}</style>
                    )}
                </>
            )}
        </div>
    );
};
export default SelectionToolbar;
