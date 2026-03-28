import React, { useRef, memo, useEffect, useState } from 'react';
import MindmapEditor from '../editors/MindmapEditor';
import BlockWrapper from './BlockWrapper';
import { PencilLine, CheckCircle, Navigation2 } from 'lucide-react';

const MindmapBlock = memo(({ block, activeTool, isDarkMode, updateBlock, removeBlock, onInteract, isEditing, setEditing, isDragging, canvasScale, canvasPan }) => {
    const cardRef = useRef(null);
    const initialContent = block.content || { root: { id: 'm-root', text: 'Ideia Central', x: 0, y: 0, children: [] } };

    // Pan and Zoom State
    const [transform, setTransform] = useState(block.transform || {
        x: (block.width || 400) / 2,
        y: ((block.height || 300) - 40) / 2,
        scale: 0.6
    });

    const isPanning = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });


    const onPointerDown = (e) => {
        if (isEditing) return;
        e.stopPropagation(); e.preventDefault();
        isPanning.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e) => {
        if (!isPanning.current || isEditing) return;
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
        clearTimeout(window.mindmapZoomTimer);
        window.mindmapZoomTimer = setTimeout(() => {
            updateBlock(block.id, { transform: { ...transform, scale: newScale } });
        }, 500);
    };

    const dotColor = block.color === 'fuchsia' ? '#d946ef' : (block.color === 'rose' ? '#f43f5e' : '#d946ef');

    // Refactored Header Actions with Tailwind
    const headerActions = (
        <div className="flex items-center gap-1.5 mr-1">
            <button
                onClick={(e) => { e.stopPropagation(); if (setEditing) setEditing(!isEditing); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 duration-300 shadow-sm
                    ${isEditing 
                        ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 ring-1 ring-white/10' 
                        : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10 dark:bg-white/5'
                    }`}
            >
                {isEditing ? <CheckCircle size={12} className="shrink-0 text-emerald-400" /> : <PencilLine size={12} className="shrink-0 text-fuchsia-400" />}
                {isEditing ? 'Pronto' : 'Design'}
            </button>
            {!isEditing && (
                <button
                    onClick={(e) => { e.stopPropagation(); setTransform({ x: 200, y: 150, scale: 0.6 }); }}
                    className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all duration-300 active:scale-90"
                    title="Centro"
                >
                    <Navigation2 size={12} className="rotate-45" />
                </button>
            )}
        </div>
    );

    return (
        <BlockWrapper
            ref={cardRef}
            block={block}
            title="Mapa Mental"
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
            className="max-w-[1200px]"
        >
            <div
                className="flex flex-col w-full h-full relative block-interactivity-isolation cursor-grab active:cursor-grabbing group/mindmap overflow-visible select-none animate-in fade-in duration-500"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onWheel={onWheel}
                style={{
                    flex: 1,
                    minHeight: '200px',
                    cursor: isEditing ? 'default' : 'grab'
                }}
            >
                <div 
                    className="transition-transform duration-300 ease-out"
                    style={{
                        transform: isEditing ? 'none' : `scale(${transform.scale})`,
                        transformOrigin: 'center center',
                    }}
                >
                    <MindmapEditor
                        note={{ content: initialContent }}
                        updateContent={(data) => {
                            if (data.root) updateBlock(block.id, { content: { ...initialContent, root: data.root } });
                        }}
                        scale={isEditing ? 1 : transform.scale}
                        panOffset={isEditing ? { x: 200, y: 150 } : { x: transform.x, y: transform.y }}
                        containerRef={cardRef}
                        setAiPanel={() => { }}
                        activeTool={isEditing ? 'cursor' : 'none'}
                    />
                </div>
                
                {/* Control Overlay Hint */}
                {!isEditing && (
                    <div className="absolute top-4 right-4 pointer-events-none transition-all opacity-0 group-hover:opacity-100 flex flex-col items-end gap-1">
                        <span className="text-[10px] font-bold text-white/30 tracking-widest uppercase">Intelligent Mindmap V2</span>
                        <div className="h-[2px] w-8 bg-gradient-to-r from-fuchsia-500/50 to-rose-500/50 rounded-full" />
                    </div>
                )}
            </div>
            
            {/* Mindmap Custom Integration Overlay Styles */}
            <style>{`
                .mindmap-node { filter: drop-shadow(0 4px 12px rgba(0,0,0,0.2)); }
                .mindmap-node:hover { transform: scale(1.05); transition: transform 0.2s ease; }
            `}</style>
        </BlockWrapper>
    );
});

export default MindmapBlock;
