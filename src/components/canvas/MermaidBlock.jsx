import React, { useState, useEffect, useRef, memo } from 'react';
import mermaid from 'mermaid';
import BlockWrapper from './BlockWrapper';
import { Settings, Save, AlertCircle, Maximize2 } from 'lucide-react';

const MermaidBlock = memo(({ block, activeTool, isDarkMode, updateBlock, removeBlock, onInteract, isEditing, setEditing, isDragging, canvasScale, canvasPan }) => {
    const [code, setCode] = useState(block.code || 'graph TD;\nA-->B;\nA-->C;\nB-->D;\nC-->D;');
    const [svgContent, setSvgContent] = useState('');
    const [error, setError] = useState(null);
    const cardRef = useRef(null);
    const renderRef = useRef(null);

    // Pan and Zoom State
    const [transform, setTransform] = useState(block.transform || { x: 0, y: 0, scale: 1 });
    const isPanning = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: isDarkMode ? 'dark' : 'default',
            securityLevel: 'loose',
            fontFamily: 'Plus Jakarta Sans, sans-serif'
        });
    }, [isDarkMode]);

    useEffect(() => {
        const renderDiagram = async () => {
            if (!code) return;
            try {
                const id = `mermaid-${block.id.toString().replace(/[^a-zA-Z0-9]/g, '')}`;
                const { svg } = await mermaid.render(id, code);
                setSvgContent(svg);
                setError(null);
            } catch (err) {
                setError(err.message);
                setSvgContent('');
            }
        };
        const timer = setTimeout(renderDiagram, 500);
        return () => clearTimeout(timer);
    }, [code, block.id, isDarkMode]);


    const handleSave = () => {
        if (setEditing) setEditing(false);
        updateBlock(block.id, { code });
    };

    const onPointerDown = (e) => {
        if (isEditing) return;
        e.stopPropagation(); e.preventDefault();
        isPanning.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e) => {
        if (!isPanning.current) return;
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e) => {
        if (isPanning.current) {
            isPanning.current = false;
            try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) { }
            updateBlock(block.id, { transform });
        }
    };

    const onWheel = (e) => {
        if (isEditing) return;
        e.stopPropagation();
        const zoomSpeed = 0.001;
        const delta = -e.deltaY;
        const newScale = Math.min(Math.max(transform.scale + delta * zoomSpeed, 0.1), 5);
        setTransform(prev => ({ ...prev, scale: newScale }));
        clearTimeout(window.mermaidZoomTimer);
        window.mermaidZoomTimer = setTimeout(() => {
            updateBlock(block.id, { transform: { ...transform, scale: newScale } });
        }, 500);
    };

    const dotColor = block.color === 'emerald' ? '#10b981' : (block.color === 'cyan' ? '#06b6d4' : '#10b981');

    // Refactored Header Actions with Tailwind
    const headerActions = (
        <div className="flex items-center gap-1.5 mr-1">
            <button
                onClick={(e) => { e.stopPropagation(); if (setEditing) setEditing(!isEditing); if (isEditing) handleSave(); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 duration-300
                    ${isEditing 
                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
                        : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 dark:bg-white/5'
                    }`}
            >
                {isEditing ? <Save size={12} className="shrink-0" /> : <Settings size={12} className="shrink-0" />}
                {isEditing ? 'Salvar' : 'Config'}
            </button>
            {!isEditing && (
                <button
                    onClick={(e) => { e.stopPropagation(); setTransform({ x: 0, y: 0, scale: 1 }); }}
                    className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all duration-300 active:scale-90"
                    title="Resetar Visualização"
                >
                    <Maximize2 size={12} />
                </button>
            )}
        </div>
    );

    return (
        <BlockWrapper
            ref={cardRef}
            block={block}
            title="Diagrama Mermaid"
            color={dotColor}
            isDragging={isDragging}
            isDarkMode={isDarkMode}
            onClose={removeBlock}
            onInteract={onInteract}
            onDoubleClick={() => setEditing && setEditing(true)}
            isEditing={isEditing}
            updateBlock={updateBlock}
            canvasScale={canvasScale}
            canvasPan={canvasPan}
            headerActions={headerActions}
            className="min-w-[400px] min-h-[300px]"
        >
            <div className="flex flex-col w-full h-full min-h-[200px] overflow-hidden">
                {isEditing ? (
                    <div className="flex-1 w-full h-full relative p-4 animate-in slide-in-from-top-4 duration-500" onPointerDown={e => e.stopPropagation()}>
                        <textarea
                            autoFocus
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            onKeyDown={e => e.stopPropagation()}
                            className="w-full h-full bg-transparent text-emerald-400/90 font-mono text-sm leading-relaxed p-4 rounded-2xl outline-none focus:ring-1 focus:ring-emerald-500/30 resize-none scrollbar-hide"
                            placeholder="graph TD; ..."
                        />
                    </div>
                ) : (
                    <div
                        className="flex-1 w-full h-full relative block-interactivity-isolation cursor-grab active:cursor-grabbing group/mermaid overflow-hidden select-none"
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onWheel={onWheel}
                    >
                        {error ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
                                <AlertCircle size={32} className="text-rose-500 opacity-50" />
                                <div className="text-rose-400/80 text-xs font-semibold uppercase tracking-widest text-center">
                                    Erro na Sintaxe do Diagrama
                                </div>
                            </div>
                        ) : (
                            <div
                                ref={renderRef}
                                dangerouslySetInnerHTML={{ __html: svgContent }}
                                className={`w-full h-full flex items-center justify-center transition-transform duration-300 ease-out`}
                                style={{
                                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                                    transition: isPanning.current ? 'none' : 'transform 0.1s ease-out'
                                }}
                            />
                        )}
                        
                        {/* Interactive Hint */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-white/60 font-medium pointer-events-none tracking-tight">
                            Scroll Zoom • Drag Pan
                        </div>
                    </div>
                )}
            </div>
            
            {/* SVG Styles - Refined for Transparent/Glass Feel */}
            <style>{`.mermaid svg { background: transparent !important; max-width: 100% !important; height: auto !important; overflow: visible !important; } .mermaid .edgePath path { stroke: rgba(255, 255, 255, 0.4) !important; stroke-width: 1.5px !important; } .mermaid .node rect, .mermaid .node circle, .mermaid .node polygon { fill: rgba(255, 255, 255, 0.05) !important; stroke: rgba(255, 255, 255, 0.2) !important; } .mermaid text { fill: rgba(255, 255, 255, 0.8) !important; font-family: 'Plus Jakarta Sans', sans-serif !important; }`}</style>
        </BlockWrapper>
    );
});

export default MermaidBlock;
