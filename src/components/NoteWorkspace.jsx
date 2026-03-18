import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNotes } from '../contexts/NotesContext';
import CanvasArea from './canvas/CanvasArea';
import TextEditor from './editors/TextEditor';
import CodeEditor from './editors/CodeEditor';
import MermaidEditor from './editors/MermaidEditor';
import MindmapEditor from './editors/MindmapEditor';
import FolderView from './editors/FolderView';
import AIPanel from './AIPanel';
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
    const hiddenEditorRef = useRef(null);

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

            setPanOffset(prev => {
                const nextX = prev.x + dx;
                const nextY = prev.y + dy;

                // Trava no início absoluto da página (0, 0)
                // Isso permite ver a margem visível em 80px e o "gutter"
                return {
                    x: shouldClamp ? Math.min(nextX, 0) : nextX,
                    y: shouldClamp ? Math.min(nextY, 0) : nextY
                };
            });
            setLastMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    const handlePointerUp = (e) => {
        if (isPanning) {
            setIsPanning(false);
            if (containerRef.current) containerRef.current.releasePointerCapture(e.pointerId);
        }
    };

    const handleWheel = useCallback((e) => {
        if (!canNav) return;

        // Skip if mouse is over an interactive block - let them handle their own zoom/scroll
        if (isOverInteractiveBlock()) {
            return;
        }

        const shouldClamp = activeNote?.type === 'canvas';

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
                const newScale = Math.max(0.1, Math.min(scale * zoomFactor, 5));

                const nextX = focusX - worldX * newScale;
                const nextY = focusY - worldY * newScale;

                setPanOffset({
                    x: shouldClamp ? Math.min(nextX, 0) : nextX,
                    y: shouldClamp ? Math.min(nextY, 0) : nextY
                });
                setScale(newScale);
                return;
            }

            let focusX = e.clientX - rect.left;
            let focusY = e.clientY - rect.top;

            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newScale = Math.max(0.1, Math.min(scale * zoomFactor, 5));

            const worldX = (focusX - panOffset.x) / scale;
            const worldY = (focusY - panOffset.y) / scale;

            const nextX = focusX - worldX * newScale;
            const nextY = focusY - worldY * newScale;

            setPanOffset({
                x: shouldClamp ? Math.min(nextX, 0) : nextX,
                y: shouldClamp ? Math.min(nextY, 0) : nextY
            });
            setScale(newScale);
        } else {
            // Scroll normal (Shift+Scroll para horizontal)
            let dx = e.deltaX;
            let dy = e.deltaY;
            if (e.shiftKey && dy !== 0 && dx === 0) {
                dx = dy;
                dy = 0;
            }
            // Clamping no scroll também
            setPanOffset(prev => {
                const nextX = prev.x - dx;
                const nextY = prev.y - dy;
                return {
                    x: shouldClamp ? Math.min(nextX, 0) : nextX,
                    y: shouldClamp ? Math.min(nextY, 0) : nextY
                };
            });
        }
    }, [canNav, activeNote?.type, scale, panOffset, isOverInteractiveBlock]);

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
                        onMoveView={(newPan) => setPanOffset(newPan)}
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
                return <MindmapEditor note={activeNote} {...commonProps} ref={canvasRef} />;
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
                    opacity: 0, // Opacity: 0 is safer than visibility: hidden for capture
                    zIndex: -1,
                    overflow: 'visible'
                }}>
                    {shadowNote.type === 'canvas' ? (
                        <CanvasArea
                            note={shadowNote}
                            ref={hiddenEditorRef}
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
                    background: 'rgba(0, 0, 0, 0.4)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 9999,
                    animation: 'workspaceFadeIn 0.3s ease-out'
                }}>
                    <style>{`
                        @keyframes workspaceFadeIn { from { opacity: 0; } to { opacity: 1; } }
                        @keyframes workspaceSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                        @keyframes workspaceShimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
                    `}</style>
                    <div className="progress-card glass-panel" style={{
                        padding: '2rem',
                        borderRadius: '24px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
                        textAlign: 'center',
                        width: '320px',
                        color: '#fff'
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
        </div>
    );
});

export default NoteWorkspace;
