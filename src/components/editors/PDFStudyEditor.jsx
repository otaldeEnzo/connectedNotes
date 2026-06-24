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
    const [pointerPos, setPointerPos] = useState(null);
    const [splitPercentage, setSplitPercentage] = useState(50);
    const [isDraggingSplit, setIsDraggingSplit] = useState(false);
    const [showPagesSidebar, setShowPagesSidebar] = useState(true);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const containerRootRef = useRef(null);

    // Dispatch toolbar boundary event so FloatingToolbar can restrict itself to canvas-only
    useEffect(() => {
        const dispatchBoundary = () => {
            if (!containerRootRef.current) return;
            const rect = containerRootRef.current.getBoundingClientRect();
            const splitPx = rect.left + rect.width * (splitPercentage / 100);
            window.dispatchEvent(new CustomEvent('pdfCanvasBoundaryChanged', { detail: { minX: splitPx } }));
        };
        dispatchBoundary();
        window.addEventListener('resize', dispatchBoundary);
        return () => {
            window.removeEventListener('resize', dispatchBoundary);
            // Clear the restriction on unmount
            window.dispatchEvent(new CustomEvent('pdfCanvasBoundaryChanged', { detail: { minX: 0 } }));
        };
    }, [splitPercentage]);

    const handlePointerDownDivider = (e) => {
        e.preventDefault();
        setIsDraggingSplit(true);
        const container = e.currentTarget.parentElement;
        
        const handlePointerMove = (moveEvent) => {
            const containerRect = container.getBoundingClientRect();
            const relativeX = moveEvent.clientX - containerRect.left;
            let percentage = (relativeX / containerRect.width) * 100;
            if (percentage < 20) percentage = 20;
            if (percentage > 80) percentage = 80;
            setSplitPercentage(percentage);
        };

        const handlePointerUp = () => {
            setIsDraggingSplit(false);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDraggingOver(true);
    };

    const handleDragLeave = () => {
        setIsDraggingOver(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
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
        }
    };
    
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

    // Automatically fit and center PDF page using ResizeObserver for reliable measurements
    useEffect(() => {
        if (!pdfDoc || !pdfContainerRef.current) return;

        let cancelled = false;

        const fitPdfToContainer = async () => {
            if (cancelled) return;
            const container = pdfContainerRef.current;
            if (!container) return;

            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            if (!containerWidth || !containerHeight) return;

            try {
                const page = await pdfDoc.getPage(currentPage);
                if (cancelled) return;

                const viewport = page.getViewport({ scale: 1.0 });

                // Fit to width: PDF fills the full available container width
                const initialScale = containerWidth / viewport.width;
                const pageH = viewport.height * initialScale;

                setPdfScale(initialScale);
                setFitScale(initialScale);
                setPageSize({ width: viewport.width, height: viewport.height });
                setPdfPan({
                    x: 0,
                    y: pageH > containerHeight ? 0 : (containerHeight - pageH) / 2
                });
            } catch (err) {
                console.error('[PDFStudyEditor] fitPdfToContainer error:', err);
            }
        };

        // Use ResizeObserver to detect when the container is properly sized
        const observer = new ResizeObserver(() => {
            fitPdfToContainer();
        });
        observer.observe(pdfContainerRef.current);

        // Also run once immediately (with a small delay for initial layout)
        const timer = setTimeout(fitPdfToContainer, 50);

        return () => {
            cancelled = true;
            observer.disconnect();
            clearTimeout(timer);
        };
    }, [pdfDoc, currentPage, splitPercentage, showPagesSidebar]);


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
        content: {
            strokes: [], textBlocks: [], imageBlocks: [], mathBlocks: [], codeBlocks: [],
            ...(content.pagesData[currentPage] || {}),
            background: content.background,
            backgroundSize: content.backgroundSize
        }
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
            <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: '100%', 
                    width: '100%',
                    background: 'var(--bg-color)',
                    transition: 'all 0.4s ease'
                }}
            >
                <style>{`
                    @keyframes dropzone-pulse {
                        0% { transform: scale(1); box-shadow: 0 20px 60px rgba(0,0,0,0.1); }
                        50% { transform: scale(1.02); box-shadow: 0 30px 80px rgba(99, 102, 241, 0.15); }
                        100% { transform: scale(1); box-shadow: 0 20px 60px rgba(0,0,0,0.1); }
                    }
                    .pdf-dropzone {
                        animation: dropzone-pulse 4s infinite ease-in-out;
                    }
                    .pdf-dropzone:hover {
                        animation: none;
                        transform: scale(1.02) translateY(-4px);
                        box-shadow: 0 30px 80px rgba(99, 102, 241, 0.2);
                    }
                `}</style>
                <div 
                    className="glass-extreme pdf-dropzone"
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '64px',
                        borderRadius: '32px',
                        border: isDraggingOver ? '2px dashed var(--accent-color)' : '1px solid rgba(255, 255, 255, 0.1)',
                        background: isDraggingOver ? 'rgba(99, 102, 241, 0.08)' : 'var(--glass-bg)',
                        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        maxWidth: '560px',
                        width: '90%',
                        textAlign: 'center',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
                    }}
                >
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '16px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '20px'
                    }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="9" y1="15" x2="15" y2="15"></line>
                        </svg>
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                        Caderno de Estudo PDF
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
                        Arraste e solte o seu arquivo PDF aqui ou clique abaixo para importar e iniciar seus estudos.
                    </p>
                    <label 
                        className="liquid-btn" 
                        style={{ 
                            cursor: 'pointer', 
                            padding: '14px 32px', 
                            borderRadius: '16px', 
                            background: 'var(--accent-color)',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '1.05rem',
                            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
                            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                        }}
                    >
                        Selecionar PDF ou Arraste Aqui
                        <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleImportPdf} />
                    </label>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRootRef} style={{ 
            display: 'flex', 
            width: '100%', 
            height: '100%', 
            overflow: 'hidden', 
            position: 'relative',
            padding: '6px',
            gap: '4px',
            boxSizing: 'border-box'
        }}>
            {/* Left side: Pages navigation sidebar + PDF Viewer */}
            <div style={{ 
                width: `calc(${splitPercentage}% - 13px)`, 
                display: 'flex', 
                height: '100%',
                borderRadius: '16px',
                border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
                background: 'var(--bg-secondary, rgba(0,0,0,0.2))',
                overflow: 'hidden',
                position: 'relative',
                boxSizing: 'border-box'
            }}>
                {/* Vertical Sidebar of pages */}
                <div 
                    className="glass-extreme" 
                    style={{
                        width: showPagesSidebar ? '140px' : '0px',
                        opacity: showPagesSidebar ? 1 : 0,
                        transform: showPagesSidebar ? 'translateX(0)' : 'translateX(-20px)',
                        pointerEvents: showPagesSidebar ? 'auto' : 'none',
                        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: showPagesSidebar ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
                        borderLeft: showPagesSidebar ? '1px solid var(--glass-border-left, rgba(255,255,255,0.18))' : 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        height: 'calc(100% - 48px)',
                        marginTop: '24px',
                        marginBottom: '24px',
                        marginLeft: showPagesSidebar ? '24px' : '0px',
                        borderRadius: '24px',
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        padding: showPagesSidebar ? '24px 10px' : '24px 0px',
                        gap: '8px',
                        background: 'var(--glass-bg, rgba(0, 0, 0, 0.25))',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        backdropFilter: 'blur(40px)',
                        boxSizing: 'border-box'
                    }}
                >
                    <div style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em', marginBottom: '8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        Páginas
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '120px' }}>
                        {Array.from({ length: totalPages }, (_, i) => {
                            const pageNum = i + 1;
                            const isCurrent = pageNum === currentPage;
                            const hasNotes = content.pagesData?.[pageNum] && (
                                (content.pagesData[pageNum].strokes && content.pagesData[pageNum].strokes.length > 0) ||
                                (content.pagesData[pageNum].textBlocks && content.pagesData[pageNum].textBlocks.length > 0) ||
                                (content.pagesData[pageNum].imageBlocks && content.pagesData[pageNum].imageBlocks.length > 0)
                            );
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`tree-item liquid-item`}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '10px 12px',
                                        borderRadius: '12px',
                                        border: isCurrent ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid transparent',
                                        background: isCurrent ? 'var(--accent-color-transparent)' : 'transparent',
                                        color: isCurrent ? 'var(--accent-color)' : 'var(--text-primary)',
                                        cursor: 'pointer',
                                        fontSize: '0.825rem',
                                        fontWeight: isCurrent ? '600' : '500',
                                        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                        textAlign: 'left',
                                        whiteSpace: 'nowrap',
                                        width: '100%',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    <span>Pág. {pageNum}</span>
                                    {hasNotes && (
                                        <span title="Esta página tem anotações" style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            background: 'var(--accent-color)',
                                            display: 'inline-block'
                                        }} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* PDF Viewer Container */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>
                    {/* Centered PDF canvas viewport */}
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
                            userSelect: 'none',
                            background: 'transparent'
                        }}
                    >
                        {loading && !pdfDoc ? (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Carregando PDF...</div>
                        ) : error ? (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b6b' }}>{error}</div>
                        ) : (
                            <div 
                                onPointerLeave={() => setPointerPos(null)}
                                onPointerMove={(e) => {
                                    if (!canvasRef.current) return;
                                    const rect = canvasRef.current.getBoundingClientRect();
                                    const x = e.clientX - rect.left;
                                    const y = e.clientY - rect.top;
                                    setPointerPos({ x, y });
                                }}
                                style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    transform: `translate(${pdfPan.x}px, ${pdfPan.y}px) scale(${pdfScale})`,
                                    transformOrigin: '0 0',
                                    display: 'block',
                                    width: pageSize.width ? `${pageSize.width}px` : 'auto',
                                    height: pageSize.height ? `${pageSize.height}px` : 'auto',
                                    cursor: ['pen', 'highlighter', 'eraser'].includes(activeTool) ? 'none' : 'default',
                                    backgroundColor: 'white',
                                    overflow: 'hidden'
                                }}
                            >
                                <canvas 
                                    ref={canvasRef} 
                                    style={{ 
                                        display: 'block',
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

                                {/* Hover Tool Cursor Preview */}
                                {pointerPos && ['pen', 'highlighter', 'eraser'].includes(activeTool) && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: pointerPos.x / pdfScale,
                                            top: pointerPos.y / pdfScale,
                                            width: `${activeTool === 'eraser' ? 30 : (activeTool === 'pen' ? penConfig.width : highlighterConfig.width)}px`,
                                            height: `${activeTool === 'eraser' ? 30 : (activeTool === 'pen' ? penConfig.width : highlighterConfig.width)}px`,
                                            borderRadius: '50%',
                                            border: activeTool === 'eraser' ? '1px solid rgba(255,255,255,0.8)' : 'none',
                                            backgroundColor: activeTool === 'eraser' 
                                                ? 'rgba(255, 255, 255, 0.25)' 
                                                : (activeTool === 'pen' ? penConfig.color : highlighterConfig.color),
                                            opacity: activeTool === 'highlighter' ? 0.4 : (activeTool === 'eraser' ? 0.8 : 0.8),
                                            transform: 'translate(-50%, -50%)',
                                            pointerEvents: 'none',
                                            zIndex: 999999,
                                            boxShadow: activeTool === 'eraser' ? '0 0 4px rgba(0,0,0,0.5)' : 'none'
                                        }}
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {/* Floating glassmorphic navigation and zoom controls */}
                    <div className="glass-extreme" style={{ 
                        position: 'absolute',
                        bottom: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex', 
                        alignItems: 'center',
                        gap: '12px',
                        padding: '6px 12px',
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        zIndex: 20
                    }}>
                        {/* Sidebar toggle button */}
                        <button 
                            onClick={() => setShowPagesSidebar(!showPagesSidebar)}
                            style={{ 
                                padding: '6px', 
                                background: showPagesSidebar ? 'rgba(255, 255, 255, 0.1)' : 'transparent', 
                                border: 'none', 
                                color: 'inherit', 
                                cursor: 'pointer', 
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            title="Alternar Sidebar de Páginas"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                        </button>

                        <div style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.15)' }} />

                        {/* Page Navigation */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage <= 1}
                                style={{ padding: '6px', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', opacity: currentPage <= 1 ? 0.3 : 0.8, display: 'flex', alignItems: 'center' }}
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6"></polyline></svg>
                            </button>
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', opacity: 0.8, minWidth: '45px', textAlign: 'center' }}>
                                {currentPage} / {totalPages || '?'}
                            </span>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage >= totalPages}
                                style={{ padding: '6px', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', opacity: currentPage >= totalPages ? 0.3 : 0.8, display: 'flex', alignItems: 'center' }}
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </button>
                        </div>

                        <div style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.15)' }} />

                        {/* Zoom Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button 
                                onClick={() => setPdfScale(s => Math.max(0.4, s - 0.2))}
                                style={{ padding: '4px 8px', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' }}
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
                                onClick={() => setPdfScale(s => Math.min(3.0, s + 0.2))}
                                style={{ padding: '4px 8px', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' }}
                                title="Aumentar Zoom"
                            >
                                +
                            </button>
                        </div>

                        <div style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.15)' }} />

                        {/* Replace PDF Button */}
                        <label 
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                padding: '6px', 
                                borderRadius: '8px', 
                                cursor: 'pointer',
                                background: 'transparent',
                                color: 'inherit',
                                opacity: 0.8
                            }} 
                            title="Substituir PDF"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                            <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleImportPdf} />
                        </label>
                    </div>
                </div>
            </div>

            {/* Adjustable Splitter Divider */}
            <div 
                style={{ 
                    width: '6px', 
                    cursor: 'col-resize', 
                    background: isDraggingSplit ? 'var(--accent-color)' : 'transparent',
                    transition: isDraggingSplit ? 'none' : 'background 0.2s',
                    zIndex: 30,
                    position: 'relative',
                    borderRadius: '3px',
                    boxShadow: isDraggingSplit ? '0 0 10px var(--accent-color)' : 'none'
                }}
                onPointerDown={handlePointerDownDivider}
            />

            {/* Right side: CanvasArea */}
            <div style={{ 
                width: `calc(${100 - splitPercentage}% - 13px)`, 
                position: 'relative',
                borderRadius: '16px',
                border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
                background: 'var(--bg-secondary, rgba(0,0,0,0.2))',
                overflow: 'hidden',
                boxSizing: 'border-box'
            }}>
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
