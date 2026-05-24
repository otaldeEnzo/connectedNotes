import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNotes } from '../contexts/NotesContext';
import CanvasArea from './canvas/CanvasArea';
import TextEditor from './editors/TextEditor';
import CodeEditor from './editors/CodeEditor';
import MermaidEditor from './editors/MermaidEditor';
import MindmapEditor from './editors/MindmapEditor';
import FolderView from './editors/FolderView';
import AIPanel from './AIPanel';
import ScientificOmnibar from './canvas/ScientificOmnibar';
import { ExportService } from '../services/ExportService';

const NoteWorkspace = React.forwardRef(({ canvasRef: externalCanvasRef, isMiniMapEnabled, ...props }, ref) => {
    const { notes, activeNote, activeNoteId, selectNote, updateNoteContent, updateNoteTags } = useNotes();
    const internalCanvasRef = useRef(null);
    const canvasRef = externalCanvasRef || internalCanvasRef;
    const [scale, setScale] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
    const [aiPanel, setAiPanel] = useState({ visible: false, context: null });
    const [exportStatus, setExportStatus] = useState({ isExporting: false, progress: 0, message: '' });
    const [shadowNote, setShadowNote] = useState(null);
    const [isOmnibarOpen, setIsOmnibarOpen] = useState(false);
    const hiddenEditorRef = useRef(null);
    const prevSizeRef = useRef({ width: 0, height: 0 });

    // [PERF] Imperative transform refs — bypass React render cycle during continuous motion
    const scaleRef = useRef(1);
    const panRef = useRef({ x: 0, y: 0 });
    const syncTimerRef = useRef(null);
    const isMovingRef = useRef(false);

    const captureNote = useCallback(async (note, format) => {
        return new Promise((resolve, reject) => {
            // Set shadow note to trigger hidden render
            setShadowNote(note);

            // Wait for mount + Konva initialization
            setTimeout(async () => {
                try {
                    if (hiddenEditorRef.current) {
                        // [HYBRID EXPORT] Prepare SVG layer if supported (Canvas)
                        let exportOptions = { returnResult: true };
                        if (hiddenEditorRef.current.prepareExport) {
                            const prepared = hiddenEditorRef.current.prepareExport();
                            if (prepared) {
                                exportOptions.bounds = prepared.bounds;
                                exportOptions.element = hiddenEditorRef.current.getInfiniteCanvasElement ?
                                    hiddenEditorRef.current.getInfiniteCanvasElement() :
                                    hiddenEditorRef.current.getViewportElement();
                            }
                        }

                        const exportData = hiddenEditorRef.current.getExportData();
                        if (exportData) {
                            const result = await ExportService.exportNote(note, format, {
                                ...exportData,
                                ...exportOptions
                            });

                            // [HYBRID EXPORT] Cleanup
                            if (hiddenEditorRef.current.finalizeExport) {
                                hiddenEditorRef.current.finalizeExport();
                            }

                            resolve(result);
                        } else {
                            reject(new Error("Export data missing from shadow editor"));
                        }
                    } else {
                        reject(new Error("Shadow editor not mounted"));
                    }
                } catch (err) {
                    reject(err);
                } finally {
                    setShadowNote(null);
                }
            }, 2000); // 2s for safety (initialization + render)
        });
    }, []);

    const runExport = useCallback(async (note, format) => {
        setExportStatus({ isExporting: true, progress: 0, message: 'Iniciando exportação...' });
        try {
            if (note.type === 'folder') {
                await ExportService.exportFolder(note, notes, {
                    format: format === 'pdf_digital' ? 'pdf' : format,
                    captureCallback: captureNote,
                    onProgress: (status) => setExportStatus({ isExporting: true, ...status })
                });
            } else {
                // If it's a visual note, use captureNote (shadow renderer)
                if (note.type === 'canvas' || note.type === 'mindmap') {
                    const result = await captureNote(note, format);
                    // Single note capture handles its own download if not returnResult, but captureNote always returnResult
                    // So we might need to handle download here if we want to bypass selectNote
                    if (result) {
                        const fileName = (note.title || 'nota').replace(/[\/\\?%*:|"<>]/g, '-');
                        const url = URL.createObjectURL(result instanceof Blob ? result : ExportService._dataUrlToBlob(result));
                        const ext = format === 'png' ? 'png' : 'pdf';
                        ExportService._download(url, `${fileName}.${ext}`);
                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                    }
                } else {
                    await ExportService.exportNote(note, format, {
                        onProgress: (status) => setExportStatus({ isExporting: true, ...status })
                    });
                }
            }
        } catch (err) {
            console.error('[NoteWorkspace] Export failed:', err);
        } finally {
            setTimeout(() => setExportStatus({ isExporting: false, progress: 0, message: '' }), 1000);
        }
    }, [notes, captureNote]);

    React.useImperativeHandle(ref, () => ({
        captureNote,
        runExport
    }));

    const containerRef = useRef(null);

    // Listen for global shortcuts (Calculadora em qualquer nota) and toolbar toggle events
    useEffect(() => {
        const handleShortcuts = (e) => {
            if (e.altKey && e.code === 'KeyC') {
                e.preventDefault();
                setIsOmnibarOpen(prev => !prev);
            }
        };
        const handleToggleEvent = () => {
            setIsOmnibarOpen(prev => !prev);
        };
        window.addEventListener('keydown', handleShortcuts);
        window.addEventListener('toggleScientificOmnibar', handleToggleEvent);
        return () => {
            window.removeEventListener('keydown', handleShortcuts);
            window.removeEventListener('toggleScientificOmnibar', handleToggleEvent);
        };
    }, []);

    useEffect(() => {
        window.dispatchEvent(new CustomEvent('scientificOmnibarStateChanged', { detail: { isOpen: isOmnibarOpen } }));
    }, [isOmnibarOpen]);

    // Listen for global export triggers (from Sidebar/CommandBar)
    useEffect(() => {
        const handleTriggerExport = (e) => {
            const { note, format } = e.detail;
            if (note) runExport(note, format);
        };
        window.addEventListener('triggerExport', handleTriggerExport);
        return () => window.removeEventListener('triggerExport', handleTriggerExport);
    }, [runExport]);

    const canNav = activeNote?.type === 'canvas' || activeNote?.type === 'mindmap';

    const isOverInteractiveBlock = useCallback(() => {
        return window.isOverInteractiveBlock === true;
    }, []);

    // Reset view on note change
    useEffect(() => {
        setScale(1);
        setPanOffset({ x: 0, y: 0 });
        scaleRef.current = 1;
        panRef.current = { x: 0, y: 0 };
    }, [activeNoteId]);

    // [PERF] Sync React state from refs — called when continuous motion stops
    const syncReactState = useCallback(() => {
        setScale(scaleRef.current);
        setPanOffset({ ...panRef.current });
        isMovingRef.current = false;
    }, []);

    const scheduleSync = useCallback(() => {
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        syncTimerRef.current = setTimeout(syncReactState, 100);
    }, [syncReactState]);

    // [PERF] Apply transform imperatively — bypasses React render completely
    const applyImperativeTransform = useCallback((newPan, newScale) => {
        panRef.current = newPan;
        scaleRef.current = newScale;
        isMovingRef.current = true;

        // Directly update Konva layers and DOM transforms via imperative handle
        if (canvasRef.current?.applyTransform) {
            canvasRef.current.applyTransform(newPan, newScale);
        }

        // Schedule React state sync after motion stops
        scheduleSync();
    }, [scheduleSync, canvasRef]);

    // Listen for container resize to adjust panOffset and keep the viewport centered
    useEffect(() => {
        const container = containerRef.current;
        if (!container || !canNav) return;

        // Initialize previous size
        const rect = container.getBoundingClientRect();
        prevSizeRef.current = { width: rect.width, height: rect.height };

        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;

                const oldWidth = prevSizeRef.current.width;
                const oldHeight = prevSizeRef.current.height;

                if (oldWidth > 0 && oldHeight > 0) {
                    const dx = (width - oldWidth) / 2;
                    const dy = (height - oldHeight) / 2;

                    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
                        const shouldClamp = activeNote?.type === 'canvas';
                        const newX = panRef.current.x + dx;
                        const newY = panRef.current.y + dy;
                        const newPan = {
                            x: shouldClamp ? Math.min(newX, 0) : newX,
                            y: shouldClamp ? Math.min(newY, 0) : newY
                        };

                        applyImperativeTransform(newPan, scaleRef.current);
                        // Discrete resize events require immediate React state sync to prevent layout mismatch
                        setScale(scaleRef.current);
                        setPanOffset({ ...newPan });
                    }
                }

                prevSizeRef.current = { width, height };
            }
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, [canNav, activeNote?.type, applyImperativeTransform]);

    // Simplified Mouse Tracking for Panning
    const handlePointerDown = (e) => {
        if (!canNav) return;

        // Skip if mouse is over an interactive block
        if (isOverInteractiveBlock()) return;

        // Strict Right-Click Pan (User Request)
        if (e.button === 2) {
            setIsPanning(true);
            setLastMousePos({ x: e.clientX, y: e.clientY });
            if (containerRef.current) containerRef.current.setPointerCapture(e.pointerId);
        }
    };

    const handlePointerMove = (e) => {
        if (isPanning) {
            const shouldClamp = activeNote?.type === 'canvas';
            const dx = e.clientX - lastMousePos.x;
            const dy = e.clientY - lastMousePos.y;

            const prev = panRef.current;
            const nextX = prev.x + dx;
            const nextY = prev.y + dy;
            const newPan = {
                x: shouldClamp ? Math.min(nextX, 0) : nextX,
                y: shouldClamp ? Math.min(nextY, 0) : nextY
            };

            applyImperativeTransform(newPan, scaleRef.current);
            setLastMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    const handlePointerUp = (e) => {
        if (isPanning) {
            setIsPanning(false);
            if (containerRef.current) containerRef.current.releasePointerCapture(e.pointerId);
            // Force sync on pointer up
            syncReactState();
        }
    };

    const handleWheel = useCallback((e) => {
        if (!canNav) return;

        // Skip if mouse is over an interactive block - let them handle their own zoom/scroll
        if (isOverInteractiveBlock()) {
            return;
        }

        const shouldClamp = activeNote?.type === 'canvas';
        const currentScale = scaleRef.current;
        const currentPan = panRef.current;

        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const rect = containerRef.current.getBoundingClientRect();

            // Se Shift estiver pressionado, faz o zoom centralizado no CONTEÚDO (Recentralização)
            // Caso contrário, centralizado no MOUSE
            const useContentCenter = e.shiftKey;

            if (useContentCenter && canvasRef.current?.getContentCenter) {
                const center = canvasRef.current.getContentCenter();
                const worldX = center.x;
                const worldY = center.y;

                const focusX = rect.width / 2;
                const focusY = rect.height / 2;

                const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
                const newScale = Math.max(0.1, Math.min(currentScale * zoomFactor, 5));

                const nextX = focusX - worldX * newScale;
                const nextY = focusY - worldY * newScale;

                const newPan = {
                    x: shouldClamp ? Math.min(nextX, 0) : nextX,
                    y: shouldClamp ? Math.min(nextY, 0) : nextY
                };

                applyImperativeTransform(newPan, newScale);
                return;
            }

            let focusX = e.clientX - rect.left;
            let focusY = e.clientY - rect.top;

            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newScale = Math.max(0.1, Math.min(currentScale * zoomFactor, 5));

            const worldX = (focusX - currentPan.x) / currentScale;
            const worldY = (focusY - currentPan.y) / currentScale;

            const nextX = focusX - worldX * newScale;
            const nextY = focusY - worldY * newScale;

            const newPan = {
                x: shouldClamp ? Math.min(nextX, 0) : nextX,
                y: shouldClamp ? Math.min(nextY, 0) : nextY
            };

            applyImperativeTransform(newPan, newScale);
        } else {
            // Scroll normal (Shift+Scroll para horizontal)
            let dx = e.deltaX;
            let dy = e.deltaY;
            if (e.shiftKey && dy !== 0 && dx === 0) {
                dx = dy;
                dy = 0;
            }
            const nextX = currentPan.x - dx;
            const nextY = currentPan.y - dy;
            const newPan = {
                x: shouldClamp ? Math.min(nextX, 0) : nextX,
                y: shouldClamp ? Math.min(nextY, 0) : nextY
            };

            applyImperativeTransform(newPan, currentScale);
        }
    }, [canNav, activeNote?.type, isOverInteractiveBlock, applyImperativeTransform, canvasRef]);

    useEffect(() => {
        const el = containerRef.current;
        if (el) {
            el.addEventListener('wheel', handleWheel, { passive: false });
            return () => el.removeEventListener('wheel', handleWheel);
        }
    }, [handleWheel]);

    const handleContextMenu = (e) => {
        if (canNav) e.preventDefault();
    };

    if (!activeNote) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                Selecione uma nota na barra lateral para começar.
            </div>
        );
    }

    const updateContent = (content) => updateNoteContent(activeNote.id, content);

    const commonProps = {
        ...props,
        activeNote,
        scale: canNav ? scale : 1,
        panOffset: canNav ? panOffset : { x: 0, y: 0 },
        updateContent,
        containerRef,
        setAiPanel,
        setExportStatus
    };

    const renderEditor = () => {
        switch (activeNote.type) {
            case 'canvas':
                return (
                    <CanvasArea
                        {...commonProps}
                        ref={canvasRef}
                        setAiPanel={setAiPanel}
                        onMoveView={(newPan) => {
                            panRef.current = newPan;
                            setPanOffset(newPan);
                        }}
                        isMiniMapEnabled={isMiniMapEnabled}
                    />
                );
            case 'text':
                return <TextEditor note={activeNote} updateContent={updateContent} />;
            case 'code':
                return <CodeEditor note={activeNote} updateContent={updateContent} activeTool={props.activeTool} setActiveTool={props.setActiveTool} />;
            case 'mermaid':
                return <MermaidEditor note={activeNote} updateContent={updateContent} />;
            case 'mindmap':
                return (
                    <MindmapEditor
                        note={activeNote}
                        updateContent={updateContent}
                        scale={scale || 1}
                        panOffset={panOffset || { x: 0, y: 0 }}
                        containerRef={containerRef}
                        setAiPanel={setAiPanel}
                        ref={canvasRef}
                    />
                );
            case 'folder':
                return (
                    <FolderView
                        note={activeNote}
                        notes={notes}
                        onOpenNote={selectNote}
                        setAiPanel={setAiPanel}
                        activeTool={props.activeTool}
                        setExportStatus={setExportStatus}
                        captureNote={captureNote}
                        runExport={runExport}
                    />
                );
            default:
                return <div>Tipo de nota desconhecido: {activeNote.type}</div>;
        }
    };

    return (
        <div
            ref={containerRef}
            className="workspace-container"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onContextMenu={handleContextMenu}
            style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                cursor: isPanning ? 'grabbing' : 'default',
                touchAction: 'none'
            }}
        >



            {renderEditor()}

            {aiPanel.visible && (
                <AIPanel
                    apiKey={props.apiKey}
                    contextData={aiPanel.context}
                    onClose={() => {
                        setAiPanel({ ...aiPanel, visible: false });
                        if (props.setActiveTool) props.setActiveTool('cursor');
                    }}
                    onOpenSettings={props.onOpenSettings}
                    onAddBlock={(type, content, sourceBlockId) => {
                        console.log(`[AddBlock] Type: ${type}, Source: ${sourceBlockId}, Content:`, content);
                        if (activeNote.type === 'canvas' && canvasRef.current) {
                            canvasRef.current.addBlock(type, content, sourceBlockId);
                        } else if (activeNote.type === 'code') {
                            const snippet = (typeof content === 'string') ? content : JSON.stringify(content, null, 2);
                            const newCode = (activeNote.content.code || '') + '\n\n' + snippet;
                            updateNoteContent(activeNote.id, { code: newCode });
                        } else if (activeNote.type === 'text') {
                            const snippet = (typeof content === 'string') ? content : JSON.stringify(content, null, 2);
                            const currentVal = activeNote.content.markdown || activeNote.content.body || '';
                            const newText = currentVal + '<br><br>' + snippet;
                            updateNoteContent(activeNote.id, { markdown: newText });
                        }
                    }}
                    onUpdateNote={(newContent) => {
                        updateNoteContent(activeNote.id, newContent);
                    }}
                />
            )}

            {/* Global Export Progress Overlay (LiquidGlass) */}
            {/* Hidden Rendering Shell for Batch Export */}
            {shadowNote && (
                <div style={{
                    position: 'fixed',
                    left: '-12000px',
                    top: '-12000px',
                    width: '12000px', // Massive workspace for large notes
                    height: '12000px', // Massive workspace for large notes
                    pointerEvents: 'none',
                    opacity: 1, // Opacity: 1 is required for capture
                    zIndex: -1,
                    overflow: 'visible',
                    background: 'var(--canvas-bg-color)'
                }}>
                    {shadowNote.type === 'canvas' ? (
                        <CanvasArea
                            note={shadowNote}
                            ref={hiddenEditorRef}
                            isShadow={true}
                            scale={1}
                            panOffset={{ x: 0, y: 0 }}
                            updateContent={() => { }} // Noop for capture
                        />
                    ) : shadowNote.type === 'mindmap' ? (
                        <MindmapEditor
                            note={shadowNote}
                            ref={hiddenEditorRef}
                            scale={1}
                            panOffset={{ x: 0, y: 0 }}
                            updateContent={() => { }}
                        />
                    ) : null}
                </div>
            )}

            {exportStatus.isExporting && (
                <div className="export-progress-overlay" style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0, 0, 0, 0.45)',
                    backdropFilter: 'blur(32px) saturate(180%) brightness(0.8)',
                    WebkitBackdropFilter: 'blur(32px) saturate(180%) brightness(0.8)',
                    zIndex: 99999,
                    animation: 'workspaceFadeIn 0.3s ease-out'
                }}>
                    <style>{`
                        @keyframes workspaceFadeIn { from { opacity: 0; } to { opacity: 1; } }
                        @keyframes workspaceScaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
                        @keyframes workspaceSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                        @keyframes workspaceShimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
                    `}</style>
                    <div className="progress-card glass-extreme" style={{
                        padding: '2.5rem',
                        borderRadius: '2.5rem',
                        background: 'var(--glass-bg-floating)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: 'var(--glass-shadow), 0 30px 60px rgba(0, 0, 0, 0.6)',
                        textAlign: 'center',
                        width: '380px',
                        color: '#fff',
                        animation: 'workspaceScaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}>
                        <div className="status-header" style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            marginBottom: '1.5rem'
                        }}>
                            <div className="loading-spinner" style={{
                                width: '24px', height: '24px',
                                border: '3px solid rgba(255, 255, 255, 0.1)',
                                borderTopColor: '#6366f1',
                                borderRadius: '50%',
                                animation: 'workspaceSpin 1s linear infinite'
                            }} />
                            <span style={{
                                fontSize: '1.1rem',
                                fontWeight: '600',
                                letterSpacing: '-0.02em'
                            }}>
                                {exportStatus.message || 'Exportando Documento'}
                            </span>
                        </div>

                        <div className="progress-bar-container" style={{
                            height: '10px',
                            width: '100%',
                            background: 'rgba(255, 255, 255, 0.08)',
                            borderRadius: '99px',
                            overflow: 'hidden',
                            marginBottom: '0.8rem',
                            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)'
                        }}>
                            <div className="progress-bar-fill" style={{
                                height: '100%',
                                width: `${Math.max(exportStatus.progress || 0, 2)}%`,
                                background: 'linear-gradient(90deg, #6366f1, #a855f7, #6366f1)',
                                backgroundSize: '200% 100%',
                                boxShadow: '0 0 12px rgba(99, 102, 241, 0.6)',
                                transition: 'width 0.2s linear',
                                borderRadius: '99px',
                                animation: 'workspaceShimmer 2s linear infinite'
                            }} />
                        </div>

                        <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.8rem', marginTop: '8px' }}>
                            {exportStatus.progress}% Concluído
                        </div>
                    </div>
                </div>
            )}

            <ScientificOmnibar
                isOpen={isOmnibarOpen}
                onClose={() => setIsOmnibarOpen(false)}
                canvasPan={panOffset}
                canvasScale={scale}
                onAddBlock={(type, content) => {
                    if (activeNote.type === 'canvas' && canvasRef.current) {
                        canvasRef.current.addBlock(type, content);
                    } else if (activeNote.type === 'code') {
                        const snippet = (typeof content === 'string') ? content : JSON.stringify(content, null, 2);
                        const newCode = (activeNote.content.code || '') + '\n\n' + snippet;
                        updateNoteContent(activeNote.id, { code: newCode });
                    } else if (activeNote.type === 'text') {
                        const snippet = (typeof content === 'string') ? content : JSON.stringify(content, null, 2);
                        const currentVal = activeNote.content.markdown || activeNote.content.body || '';
                        const newText = currentVal + '<br><br>' + snippet;
                        updateNoteContent(activeNote.id, { markdown: newText });
                    }
                }}
                onInsert={(val) => {
                    const snippet = `$$${val}$$`;
                    if (activeNote.type === 'canvas' && canvasRef.current) {
                        canvasRef.current.addBlock('math', val);
                    } else if (activeNote.type === 'code') {
                        const newCode = (activeNote.content.code || '') + '\n' + snippet;
                        updateNoteContent(activeNote.id, { code: newCode });
                    } else if (activeNote.type === 'text') {
                        const currentVal = activeNote.content.markdown || '';
                        const newText = currentVal + '<br>' + snippet;
                        updateNoteContent(activeNote.id, { markdown: newText });
                    }
                    setIsOmnibarOpen(false);
                }}
            />
        </div>
    );
});

export default NoteWorkspace;
