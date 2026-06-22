import React, { useState, useEffect, useRef } from 'react';
import CanvasArea from '../canvas/CanvasArea';
import { StorageService } from '../../services/StorageService';

const PDFStudyEditor = ({ 
    note, 
    updateContent, 
    containerRef, 
    setAiPanel, 
    scale, 
    panOffset,
    activeTool,
    setActiveTool,
    penConfig,
    highlighterConfig,
    penType,
    activeForcedShape,
    setActiveForcedShape,
    isDarkMode,
    ref
}) => {
    const [pdfDoc, setPdfDoc] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pdfScale, setPdfScale] = useState(1.0);
    const [fitScale, setFitScale] = useState(1.0);
    const [pdfPan, setPdfPan] = useState({ x: 0, y: 0 });
    const [isPdfPanning, setIsPdfPanning] = useState(false);
    const [lastPdfMousePos, setLastPdfMousePos] = useState({ x: 0, y: 0 });
    const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
    const [currentPdfStroke, setCurrentPdfStroke] = useState(null);
    
    const canvasRef = useRef(null); // Canvas for PDF rendering
    const pdfContainerRef = useRef(null); // Container for left-side camera transforms
    const content = note.content || { pdfUrl: null, pagesData: {} };
    const pdfUrl = content.pdfUrl;

    useEffect(() => {
        if (typeof window !== 'undefined' && window.pdfjsLib && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
    }, []);

    useEffect(() => {
        if (!pdfUrl) return;
        
        let isCurrent = true;
        const loadPdf = async () => {
            try {
                setLoading(true);
                setError(null);
                
                let parameter = pdfUrl;
                
                // If it's a media URL, resolve it
                if (pdfUrl.startsWith('media://')) {
                    parameter = await StorageService.loadMediaFile(pdfUrl);
                } else if (pdfUrl.startsWith('data:')) {
                    // Convert data URL to Uint8Array for pdfjs
                    const arr = pdfUrl.split(',');
                    const bstr = atob(arr[1]);
                    let n = bstr.length;
                    const u8arr = new Uint8Array(n);
                    while (n--) {
                        u8arr[n] = bstr.charCodeAt(n);
                    }
                    parameter = { data: u8arr };
                }

                console.log("[PDFStudyEditor] pdfUrl:", pdfUrl, "parameter:", parameter);
                if (!parameter) {
                    throw new Error("Arquivo PDF não pôde ser carregado (caminho nulo ou inválido)");
                }

                if (!window.pdfjsLib) {
                    throw new Error("Biblioteca PDF.js não carregada");
                }

                const pdf = await window.pdfjsLib.getDocument(parameter).promise;
                if (isCurrent) {
                    setPdfDoc(pdf);
                    setTotalPages(pdf.numPages);
                    setLoading(false);
                }
            } catch (err) {
                console.error("Erro ao carregar PDF:", err);
                if (isCurrent) {
                    setError("Erro ao carregar o PDF");
                    setLoading(false);
                }
            }
        };

        loadPdf();
        return () => { isCurrent = false; };
    }, [pdfUrl]);

    // Automatically fit and center PDF page initially
    useEffect(() => {
        if (!pdfDoc || !pdfContainerRef.current) return;
        
        const centerPdf = async () => {
            try {
                const page = await pdfDoc.getPage(currentPage);
                const container = pdfContainerRef.current;
                const containerWidth = container.clientWidth;
                const containerHeight = container.clientHeight;
                
                const viewport = page.getViewport({ scale: 1.0 });
                const initialScale = Math.min(
                    (containerWidth - 40) / viewport.width,
                    (containerHeight - 40) / viewport.height,
                    1.5
                );
                
                const pageW = viewport.width * initialScale;
                const pageH = viewport.height * initialScale;
                
                setPdfScale(initialScale);
                setFitScale(initialScale);
                setPageSize({ width: viewport.width, height: viewport.height });
                setPdfPan({
                    x: (containerWidth - pageW) / 2,
                    y: (containerHeight - pageH) / 2
                });
            } catch (err) {}
        };
        centerPdf();
    }, [pdfDoc, currentPage]);

    // Handle wheel zoom (Ctrl + Scroll)
    const handlePdfWheel = (e) => {
        if (!pdfContainerRef.current) return;
        
        if (e.ctrlKey) {
            e.preventDefault();
            e.stopPropagation();
            
            const rect = pdfContainerRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const zoomFactor = 1.08;
            const nextScale = e.deltaY < 0 
                ? Math.min(pdfScale * zoomFactor, 6.0) 
                : Math.max(pdfScale / zoomFactor, 0.2);
                
            // Correct zoom centering for transform: translate(x, y) scale(s)
            const newPanX = pdfPan.x + mouseX / nextScale - mouseX / pdfScale;
            const newPanY = pdfPan.y + mouseY / nextScale - mouseY / pdfScale;
            
            setPdfScale(nextScale);
            setPdfPan({ x: newPanX, y: newPanY });
        }
    };

    useEffect(() => {
        const el = pdfContainerRef.current;
        if (el) {
            el.addEventListener('wheel', handlePdfWheel, { passive: false });
            return () => el.removeEventListener('wheel', handlePdfWheel);
        }
    }, [pdfScale, pdfPan]);

    // Mouse handlers for right-click and middle-click pan
    const handlePdfMouseDown = (e) => {
        if (e.button === 1 || e.button === 2) {
            e.preventDefault();
            e.stopPropagation();
            setIsPdfPanning(true);
            setLastPdfMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    const handlePdfMouseMove = (e) => {
        if (!isPdfPanning) return;
        e.preventDefault();
        e.stopPropagation();
        
        // Divide by pdfScale so the movement on screen is exactly 1:1 with the mouse
        const dx = (e.clientX - lastPdfMousePos.x) / pdfScale;
        const dy = (e.clientY - lastPdfMousePos.y) / pdfScale;
        
        setPdfPan(p => ({ x: p.x + dx, y: p.y + dy }));
        setLastPdfMousePos({ x: e.clientX, y: e.clientY });
    };

    const handlePdfMouseUp = (e) => {
        if (isPdfPanning) {
            e.preventDefault();
            e.stopPropagation();
            setIsPdfPanning(false);
        }
    };

    const handlePdfContextMenu = (e) => {
        e.preventDefault();
    };

    // Drawing handlers for the PDF side
    const pdfPageData = content.pdfPagesData?.[currentPage] || { strokes: [] };
    const pdfStrokes = pdfPageData.strokes || [];

    const handleSvgPointerDown = (e) => {
        if (e.button !== 0) return; // Only left click
        if (!['pen', 'highlighter', 'eraser'].includes(activeTool) || !canvasRef.current) return;
        
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / pdfScale;
        const y = (e.clientY - rect.top) / pdfScale;
        
        if (activeTool === 'eraser') {
            eraseStrokeAt(x, y);
        } else {
            const config = activeTool === 'pen' ? penConfig : highlighterConfig;
            const newStroke = {
                id: Date.now().toString(),
                type: activeTool,
                color: config.color,
                width: config.width,
                points: [{ x, y }]
            };
            setCurrentPdfStroke(newStroke);
        }
    };

    const handleSvgPointerMove = (e) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / pdfScale;
        const y = (e.clientY - rect.top) / pdfScale;

        if (currentPdfStroke) {
            setCurrentPdfStroke(prev => ({
                ...prev,
                points: [...prev.points, { x, y }]
            }));
        } else if (activeTool === 'eraser' && e.buttons === 1) {
            eraseStrokeAt(x, y);
        }
    };

    const handleSvgPointerUp = () => {
        if (currentPdfStroke) {
            const updatedStrokes = [...pdfStrokes, currentPdfStroke];
            savePdfStrokes(updatedStrokes);
            setCurrentPdfStroke(null);
        }
    };

    const eraseStrokeAt = (x, y) => {
        const threshold = 15;
        const updated = pdfStrokes.filter(stroke => {
            return !stroke.points.some(p => Math.hypot(p.x - x, p.y - y) < threshold);
        });
        if (updated.length !== pdfStrokes.length) {
            savePdfStrokes(updated);
        }
    };

    const savePdfStrokes = (strokes) => {
        updateContent({
            ...content,
            pdfPagesData: {
                ...content.pdfPagesData,
                [currentPage]: {
                    ...content.pdfPagesData?.[currentPage],
                    strokes
                }
            }
        });
    };

    useEffect(() => {
        if (!pdfDoc || !canvasRef.current) return;
        let isCurrent = true;

        const renderPage = async () => {
            try {
                const page = await pdfDoc.getPage(currentPage);
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                
                const viewport = page.getViewport({ scale: 1.0 });
                const renderScale = 2.0; // Constant high resolution backing scale
                const renderViewport = page.getViewport({ scale: renderScale });
                
                canvas.width = renderViewport.width;
                canvas.height = renderViewport.height;

                // Base CSS size (will be transformed via CSS transform scale)
                canvas.style.width = `${viewport.width}px`;
                canvas.style.height = `${viewport.height}px`;

                await page.render({ canvasContext: context, viewport: renderViewport }).promise;
            } catch (err) {
                console.error("Erro ao renderizar página:", err);
            }
        };

        renderPage();
        return () => { isCurrent = false; };
    }, [pdfDoc, currentPage]);

    const handleImportPdf = async (e) => {
        const file = e.target.files[0];
        if (!file || file.type !== 'application/pdf') return;
        
        try {
            setLoading(true);
            const mediaUrl = await StorageService.saveMediaFile(file);
            updateContent({ ...content, pdfUrl: mediaUrl, pagesData: {} });
            setLoading(false);
        } catch (err) {
            console.error(err);
            setError("Erro ao importar PDF");
            setLoading(false);
        }
    };

    const proxyNote = {
        ...note,
        content: content.pagesData[currentPage] || { strokes: [], textBlocks: [], imageBlocks: [], mathBlocks: [], codeBlocks: [] }
    };

    const proxyUpdateContent = (newContent) => {
        updateContent({
            ...content,
            pagesData: {
                ...content.pagesData,
                [currentPage]: newContent
            }
        });
    };

    if (!pdfUrl) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                <h3>Caderno de Estudo PDF</h3>
                <p>Importe um PDF para começar a estudar e fazer anotações página por página.</p>
                <label className="liquid-btn" style={{ marginTop: '20px', cursor: 'pointer', padding: '10px 20px', borderRadius: '8px', background: 'var(--accent-glow)' }}>
                    Importar PDF
                    <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleImportPdf} />
                </label>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
            {/* Left side: PDF Viewer */}
            <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                borderRight: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                background: 'var(--bg-secondary, rgba(0,0,0,0.2))'
            }}>
                <div 
                    ref={pdfContainerRef}
                    onMouseDown={handlePdfMouseDown}
                    onMouseMove={handlePdfMouseMove}
                    onMouseUp={handlePdfMouseUp}
                    onMouseLeave={handlePdfMouseUp}
                    onContextMenu={handlePdfContextMenu}
                    style={{ 
                        flex: 1, 
                        overflow: 'hidden', 
                        position: 'relative',
                        cursor: isPdfPanning ? 'grabbing' : 'default',
                        userSelect: 'none'
                    }}
                >
                    {loading && !pdfDoc ? (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Carregando PDF...</div>
                    ) : error ? (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b6b' }}>{error}</div>
                    ) : (
                        <div style={{
                            position: 'absolute',
                            transform: `translate(${pdfPan.x}px, ${pdfPan.y}px) scale(${pdfScale})`,
                            transformOrigin: '0 0',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                            borderRadius: '8px',
                            display: 'block',
                            width: pageSize.width ? `${pageSize.width}px` : 'auto',
                            height: pageSize.height ? `${pageSize.height}px` : 'auto'
                        }}>
                            <canvas 
                                ref={canvasRef} 
                                style={{ 
                                    display: 'block',
                                    borderRadius: '8px',
                                    pointerEvents: 'none',
                                    width: '100%',
                                    height: '100%'
                                }} 
                            />
                            {/* SVG drawing layer on top of PDF page */}
                            <svg
                                onPointerDown={handleSvgPointerDown}
                                onPointerMove={handleSvgPointerMove}
                                onPointerUp={handleSvgPointerUp}
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '8px',
                                    pointerEvents: ['pen', 'highlighter', 'eraser'].includes(activeTool) ? 'auto' : 'none',
                                    touchAction: 'none'
                                }}
                            >
                                {pdfStrokes.map(stroke => (
                                    <path
                                        key={stroke.id}
                                        d={"M " + stroke.points.map(p => `${p.x} ${p.y}`).join(" L ")}
                                        fill="none"
                                        stroke={stroke.color}
                                        strokeWidth={stroke.width}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        opacity={stroke.type === 'highlighter' ? 0.4 : 1}
                                    />
                                ))}
                                {currentPdfStroke && (
                                    <path
                                        d={"M " + currentPdfStroke.points.map(p => `${p.x} ${p.y}`).join(" L ")}
                                        fill="none"
                                        stroke={currentPdfStroke.color}
                                        strokeWidth={currentPdfStroke.width}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        opacity={currentPdfStroke.type === 'highlighter' ? 0.4 : 1}
                                    />
                                )}
                            </svg>
                        </div>
                    )}
                </div>

                {/* PDF controls moved to the bottom to prevent overlapping with the top tab bar */}
                <div style={{ 
                    padding: '8px 12px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    borderTop: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                    background: 'rgba(0,0,0,0.1)'
                }}>
                    {/* Compact page navigation styled like PDFBlock */}
                    <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-black/5 dark:bg-white/5 border border-white/5" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage <= 1}
                            style={{ padding: '4px', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', opacity: currentPage <= 1 ? 0.3 : 0.8 }}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>
                        <span style={{ fontSize: '0.7rem', fontWeight: 'bold', opacity: 0.8, minWidth: '40px', textAlign: 'center' }}>
                            {currentPage}/{totalPages || '?'}
                        </span>
                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages}
                            style={{ padding: '4px', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', opacity: currentPage >= totalPages ? 0.3 : 0.8 }}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>
                    </div>

                    {/* Replace PDF Button */}
                    <label 
                        className="liquid-btn" 
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            padding: '4px 8px', 
                            borderRadius: '6px', 
                            fontSize: '0.7rem', 
                            cursor: 'pointer',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }} 
                        title="Substituir PDF"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                        <span>Substituir PDF</span>
                        <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleImportPdf} />
                    </label>

                    {/* PDF Zoom Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button 
                            className="liquid-btn"
                            onClick={() => setPdfScale(s => Math.max(0.4, s - 0.2))}
                            style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem' }}
                            title="Reduzir Zoom"
                        >
                            -
                        </button>
                        <span 
                            onClick={() => setPdfScale(fitScale)}
                            style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.8, minWidth: '40px', textAlign: 'center', cursor: 'pointer' }}
                            title="Resetar Zoom"
                        >
                            {Math.round((pdfScale / fitScale) * 100)}%
                        </span>
                        <button 
                            className="liquid-btn"
                            onClick={() => setPdfScale(s => Math.min(3.0, s + 0.2))}
                            style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem' }}
                            title="Aumentar Zoom"
                        >
                            +
                        </button>
                    </div>
                </div>
            </div>

            {/* Right side: CanvasArea */}
            <div style={{ flex: 1, position: 'relative' }}>
                <CanvasArea
                    key={`canvas_page_${currentPage}`}
                    ref={ref}
                    note={proxyNote}
                    updateContent={proxyUpdateContent}
                    scale={scale}
                    panOffset={panOffset}
                    setAiPanel={setAiPanel}
                    containerRef={containerRef}
                    isMiniMapEnabled={false}
                    activeTool={activeTool}
                    setActiveTool={setActiveTool}
                    penConfig={penConfig}
                    highlighterConfig={highlighterConfig}
                    penType={penType}
                    activeForcedShape={activeForcedShape}
                    setActiveForcedShape={setActiveForcedShape}
                    isDarkMode={isDarkMode}
                />
            </div>
        </div>
    );
};

export default PDFStudyEditor;
