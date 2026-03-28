import React, { useEffect, useRef, useState, useCallback, useLayoutEffect, memo } from 'react';
import BlockWrapper from './BlockWrapper';

// Global script loading state to prevent multiple loads
let ggbScriptPromise = null;

const loadGGBScript = () => {
    if (ggbScriptPromise) return ggbScriptPromise;
    if (window.GGBApplet) return Promise.resolve();

    ggbScriptPromise = new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://www.geogebra.org/apps/deployggb.js';
        script.async = true;
        script.onload = resolve;
        document.head.appendChild(script);
    });
    return ggbScriptPromise;
};

const GGBBlock = memo(({ block, updateBlock, isDarkMode, onInteract, activeTool, isDragging, canvasScale, canvasPan, isShadow }) => {
    const containerRef = useRef(null);
    const cardRef = useRef(null);
    const appletRef = useRef(null);
    const ggbApiRef = useRef(null);
    const ggbPanRef = useRef({ isPanning: false });
    const [isLoaded, setIsLoaded] = useState(false);
    const [isCentered, setIsCentered] = useState(false);
    const [showInput, setShowInput] = useState(!block.expression);
    const [inputExpression, setInputExpression] = useState(block.expression ?? '');
    const [currentTitle, setCurrentTitle] = useState(block.expression ? (block.customTitle || `Gráfico de ${block.expression}`) : 'Gráfico GeoGebra');
    const appletId = useRef(`ggb_${block.id.toString().replace(/\./g, '_')}${isShadow ? '_shadow' : ''}`);

    const blockWidth = block.width || 500;
    const blockHeight = block.height || 400;

    // Header is ~42px, input row is ~53px
    const graphHeight = showInput ? Math.max(100, blockHeight - 95) : Math.max(100, blockHeight - 42);

    // [REAL-TIME RESIZE PRO] 
    // This effect runs synchronously after React commits the DOM updates for block.width/height.
    // It's much faster and more reliable than ResizeObserver for tracking user-driven drags.
    useLayoutEffect(() => {
        if (!isLoaded || !ggbApiRef.current) return;

        try {
            const api = ggbApiRef.current;
            const rw = Math.round(blockWidth);
            const rh = Math.round(graphHeight);

            // Directly push dimensions to GeoGebra internal engine
            api.setSize(rw, rh);

            // Only center view if we haven't stabilized yet or if the move is significant
            if (!isCentered) {
                // Sync coordinate system to keep (0,0) in focus initially
                const viewWidth = 20;
                const ratio = rh / rw;
                const halfH = (viewWidth * ratio) / 2;
                api.setCoordSystem(-10, 10, -halfH, halfH);

                api.evalCommand("CenterView((0,0))");
                api.setGridVisible(true);
                api.setAxesVisible(true, true);
                setIsCentered(true);
            }
        } catch (e) {
            console.warn("Sync GGB resize error", e);
        }
    }, [blockWidth, graphHeight, isLoaded, isCentered]);

    // Initialize GeoGebra
    useEffect(() => {
        let mounted = true;

        loadGGBScript().then(() => {
            if (!mounted || appletRef.current || !containerRef.current) return;

            const parameters = {
                "id": appletId.current,
                "appName": "graphing",
                "width": blockWidth,
                "height": graphHeight,
                "showToolBar": false,
                "showAlgebraInput": false,
                "showMenuBar": false,
                "allowStyleBar": false,
                "showZoomButtons": false,
                "enableLabelDrags": false,
                "enableShiftDragZoom": true,
                "enableRightClick": false,
                "errorDialogsActive": false,
                "showFullscreenButton": false,
                "showAlgebraView": false,
                "algebraInputPosition": "algebra",
                "perspective": "G",
                "autoHeight": false,
                "language": "pt",
                "borderColor": "transparent",
                "backgroundColor": "transparent",
                "enableKeyboard": false,
                "showKeyboardOnFocus": false,
                "preventFocus": false,
                "appletOnLoad": (api) => {
                    if (!mounted) return;
                    ggbApiRef.current = api;
                    setIsLoaded(true);
                    console.log("[GGB] Applet loaded. API keys:", Object.keys(api || {}));

                    try {
                        api.setPerspective("G");
                        api.setMode(0); // Move tool
                        api.setGridVisible(true);
                        api.setAxesVisible(true, true);
                    } catch (e) {
                        // Fail silently for perspective errors
                    }

                    setTimeout(() => {
                        if (mounted && ggbApiRef.current) {
                            try { ggbApiRef.current.setSize(Math.round(blockWidth), Math.round(graphHeight)); } catch(e) {}
                        }
                        
                        if (block.commands) {
                            block.commands.forEach(cmd => {
                                try { api.evalCommand(cmd); } catch (e) { }
                            });
                        } else if (block.expression) {
                            try { api.evalCommand(block.expression); } catch (e) { }
                        }
                    }, 100);
                },
                ...block.ggbParameters
            };

            const applet = new window.GGBApplet(parameters, true);
            applet.inject(containerRef.current);
            appletRef.current = applet;
        });

        return () => { mounted = false; };
    }, [block.id]);

    // Apply expression to GeoGebra
    const applyExpression = useCallback(() => {
        if (!ggbApiRef.current || !inputExpression.trim()) return;

        try {
            // Execute the expression - supports multiple expressions separated by newlines
            const expressions = inputExpression.split('\n').filter(e => e.trim());
            expressions.forEach(expr => {
                ggbApiRef.current.evalCommand(expr.trim());
            });

            // Update block data and header title
            const newTitle = `Gráfico de ${inputExpression.trim()}`;
            setCurrentTitle(newTitle);

            if (updateBlock) {
                updateBlock(block.id, {
                    expression: inputExpression,
                    customTitle: newTitle
                });
            }

            setShowInput(false);
        } catch (e) {
            console.error("GGB expression error:", e);
        }
    }, [inputExpression, block.id, updateBlock]);

    // Interaction Handlers (Isolate from Canvas)
    useEffect(() => {
        const el = containerRef.current;
        if (!el || !isLoaded) return;

        // Native event listener stopping propagation during the bubbling phase.
        // This allows GeoGebra's child elements to natively handle pan (left-click) and zoom (wheel)
        // before we stop the event from bubbling up to the global CanvasArea viewport.
        const handleIsolation = (e) => {
            e.stopPropagation();
        };

        el.addEventListener('pointerdown', handleIsolation);
        el.addEventListener('wheel', handleIsolation, { passive: false });
        el.addEventListener('keydown', handleIsolation);

        return () => {
            el.removeEventListener('pointerdown', handleIsolation);
            el.removeEventListener('wheel', handleIsolation);
            el.removeEventListener('keydown', handleIsolation);
        };
    }, [isLoaded]);

    const dotColor = block.color === 'violet' ? '#8b5cf6' : (block.color === 'amber' ? '#f59e0b' : (block.color === 'cyan' ? '#06b6d4' : '#818cf8'));

    // ... rest of headerActions ...
    const headerActions = (
        <button
            className="liquid-button"
            onClick={(e) => { e.stopPropagation(); setShowInput(!showInput); }}
            style={{
                background: 'var(--accent-color-transparent)',
                color: 'var(--accent-color)',
                border: 'none',
                borderRadius: '8px',
                padding: '4px 12px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '600',
                transition: 'all 0.2s ease'
            }}
        >
            {showInput ? 'Ocultar' : 'Editar'}
        </button>
    );

    return (
        <BlockWrapper
            ref={cardRef}
            block={block}
            title={currentTitle}
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
            {showInput && (
                <div style={{ padding: '12px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '8px', alignItems: 'center' }} onPointerDown={e => e.stopPropagation()}>
                    <input
                        type="text"
                        value={inputExpression}
                        onChange={(e) => setInputExpression(e.target.value)}
                        onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') applyExpression();
                        }}
                        placeholder="Ex: f(x) = sin(x) ou x^2 + f(y) = 9"
                        style={{
                            flex: 1, padding: '8px 12px', fontSize: '0.85rem', border: '1px solid var(--glass-border)',
                            borderRadius: '8px', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', outline: 'none'
                        }}
                        onPointerDown={e => e.stopPropagation()}
                    />
                    <button
                        onClick={applyExpression}
                        style={{ padding: '8px 16px', fontSize: '0.85rem', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        Ok
                    </button>
                </div>
            )}

            <div
                ref={containerRef}
                className="ggb-container block-interactivity-isolation"
                onContextMenuCapture={e => e.stopPropagation()}
                style={{
                    width: `${blockWidth}px`,
                    height: `${graphHeight}px`,
                    pointerEvents: 'auto',
                    overflow: 'hidden',
                    position: 'relative',
                    cursor: 'grab'
                }}
            />

            {!isLoaded && (
                <div style={{ position: 'absolute', top: 40, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', zIndex: 10 }}>
                    <div className="spin" style={{ width: 32, height: 32, border: '4px solid var(--accent-color)', borderTopColor: 'transparent', borderRadius: '50%' }} />
                </div>
            )}
        </BlockWrapper>
    );
});

export default GGBBlock;
