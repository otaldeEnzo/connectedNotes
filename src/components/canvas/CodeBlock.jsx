import React, { useState, useRef, useCallback, useEffect } from 'react';
import BlockWrapper from './BlockWrapper';

const CodeBlock = ({ block, updateBlock, activeTool, isDarkMode, onInteract, saveHistory, isEditing, setEditing, isDragging, canvasScale, canvasPan }) => {
    const containerRef = useRef(null);
    const appletRef = useRef(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const appletId = useRef(`ggbCodeApplet_${block.id.toString().replace('.', '_')}`);

    const initApplet = useCallback(() => {
        if (!window.GGBApplet || appletRef.current) return;

        const parameters = {
            "id": appletId.current,
            "appName": "graphing",
            "width": block.width || 400,
            "height": (block.height || 450) - 40,
            "showToolBar": false,
            "showAlgebraInput": false,
            "showMenuBar": false,
            "allowStyleBar": false,
            "showZoomButtons": false,
            "enableLabelDrags": false,
            "enableShiftDragZoom": true,
            "errorDialogsActive": false,
            "showFullscreenButton": false,
            "algebraInputPosition": "algebra",
            "showAlgebraView": false,
            "scale": 1,
            "autoHeight": false,
            "language": "pt",
            "borderColor": "transparent",
            "backgroundColor": isDarkMode ? "#0f172a" : "#ffffff",
            "enableKeyboard": false,
            "showKeyboardOnFocus": false,
            "preventFocus": true
        };

        const applet = new window.GGBApplet(parameters, true);
        applet.inject(containerRef.current);
        appletRef.current = applet;

        const checkReady = setInterval(() => {
            const ggbApplet = window[appletId.current] || applet.getAppletObject();
            if (ggbApplet && typeof ggbApplet.evalCommand === 'function') {
                clearInterval(checkReady);
                setIsLoaded(true);

                try {
                    ggbApplet.evalCommand("SetAxesRatio(1, 1)");
                    ggbApplet.evalCommand("SetBackgroundColor('" + (isDarkMode ? "#0f172a" : "#ffffff") + "')");
                    ggbApplet.setVisible("algebra", false);
                } catch (e) {
                    console.warn("GGB Init error", e);
                }

                if (block.content) {
                    const lines = block.content.split('\n').filter(l => l.trim());
                    lines.forEach(cmd => ggbApplet.evalCommand(cmd));
                }
            }
        }, 500);
    }, [block.width, block.height, isDarkMode, block.content]);

    useEffect(() => {
        if (!window.GGBApplet) {
            const script = document.createElement('script');
            script.src = 'https://www.geogebra.org/apps/deployggb.js';
            script.async = true;
            script.onload = initApplet;
            document.head.appendChild(script);
        } else {
            initApplet();
        }
    }, [initApplet]);

    const executeCommands = useCallback(() => {
        const ggbApplet = window[appletId.current] || (appletRef.current ? appletRef.current.getAppletObject() : null);
        if (ggbApplet && typeof ggbApplet.evalCommand === 'function' && block.content) {
            ggbApplet.newConstruction();
            ggbApplet.evalCommand("SetAxesRatio(1, 1)");
            ggbApplet.evalCommand("SetBackgroundColor('" + (isDarkMode ? "#0f172a" : "#ffffff") + "')");
            const lines = block.content.split('\n').filter(l => l.trim());
            lines.forEach(cmd => ggbApplet.evalCommand(cmd));
        }
    }, [block.content, isDarkMode]);

    useEffect(() => {
        if (!isEditing && isLoaded) executeCommands();
    }, [block.content, isEditing, isLoaded, executeCommands]);

    const dotColor = block.color === 'blue' ? '#3b82f6' : (block.color === 'cyan' ? '#06b6d4' : '#3b82f6');

    const headerActions = (
        <button
            className="liquid-button"
            onClick={() => setEditing(!isEditing)}
            style={{ background: 'var(--accent-color-transparent)', color: 'var(--accent-color)', border: 'none', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '600' }}
        >
            {isEditing ? 'Ocultar' : 'Editar'}
        </button>
    );

    return (
        <BlockWrapper
            block={block}
            title="Expressão Matemática"
            color={dotColor}
            isEditing={isEditing}
            isDragging={isDragging}
            isDarkMode={isDarkMode}
            onClose={() => updateBlock && updateBlock(block.id, { isDeleted: true })}
            onInteract={onInteract}
            onRename={(id, name) => updateBlock(id, { customTitle: name })}
            headerActions={headerActions}
            canvasScale={canvasScale}
            canvasPan={canvasPan}
        >
            {isEditing && (
                <div style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }} onMouseDown={e => e.stopPropagation()}>
                    <textarea
                        className="nodrag"
                        value={block.content || ''}
                        onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                        onBlur={() => { executeCommands(); if (saveHistory) saveHistory(); }}
                        style={{
                            width: '100%', height: '100px', background: 'rgba(0,0,0,0.1)', border: '1px solid var(--glass-border)',
                            borderRadius: '8px', color: 'var(--text-primary)', fontFamily: "monospace", fontSize: '13px', padding: '10px', outline: 'none', resize: 'none'
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                        placeholder="Ex: f(x) = x^2 + 2x + 1"
                    />
                </div>
            )}
            <div
                ref={containerRef}
                className="ggb_container"
                style={{
                    width: '100%',
                    height: isEditing ? (block.height || 450) - 180 : '100%',
                    pointerEvents: 'auto',
                    overflow: 'hidden'
                }}
            />
            {!isLoaded && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', zIndex: 10 }}>
                    <div className="spin" style={{ width: 24, height: 24, border: '3px solid var(--accent-color)', borderTopColor: 'transparent', borderRadius: '50%' }} />
                </div>
            )}
        </BlockWrapper>
    );
};

export default CodeBlock;
