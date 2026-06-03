import React from 'react';
import BlockWrapper from './BlockWrapper';

const PDFPageRenderer = ({ pdfDoc, pageNumber, width, isDarkMode }) => {
    const canvasRef = React.useRef(null);
    const containerRef = React.useRef(null);
    const [isVisible, setIsVisible] = React.useState(false);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                } else {
                    setIsVisible(false);
                }
            });
        }, { rootMargin: '300px' });

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }
        return () => observer.disconnect();
    }, []);

    React.useEffect(() => {
        if (!pdfDoc || !isVisible || !canvasRef.current) return;
        let isCurrent = true;

        const render = async () => {
            try {
                setLoading(true);
                const page = await pdfDoc.getPage(pageNumber);
                const viewport = page.getViewport({ scale: 1.0 });
                const scale = width / viewport.width;
                const scaledViewport = page.getViewport({ scale: scale * 1.5 }); // High definition (1.5x resolution)

                const canvas = canvasRef.current;
                if (!canvas) return;
                canvas.width = scaledViewport.width;
                canvas.height = scaledViewport.height;

                const context = canvas.getContext('2d');
                await page.render({ canvasContext: context, viewport: scaledViewport }).promise;
                if (isCurrent) setLoading(false);
            } catch (e) {
                console.error("Error rendering PDF page in scroll list:", e);
            }
        };

        render();
        return () => { isCurrent = false; };
    }, [pdfDoc, pageNumber, width, isVisible]);

    return (
        <div 
            ref={containerRef} 
            style={{ 
                width: '100%', 
                minHeight: `${width * 1.41}px`, 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                position: 'relative'
            }}
        >
            {isVisible ? (
                <div style={{ width: '100%', position: 'relative' }}>
                    <canvas 
                        ref={canvasRef} 
                        style={{ 
                            width: '100%', 
                            display: 'block',
                            borderRadius: '16px', 
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                            mixBlendMode: isDarkMode ? 'lighten' : 'normal',
                            opacity: loading ? 0.4 : (isDarkMode ? 0.9 : 1),
                            transition: 'opacity 0.2s ease-in-out'
                        }} 
                    />
                    {loading && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)', fontSize: '0.8rem', fontWeight: 600 }}>
                            Processando...
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ opacity: 0.3, fontSize: '0.8rem', fontStyle: 'italic' }}>
                    Página {pageNumber}
                </div>
            )}
        </div>
    );
};

const PageImageRenderer = ({ src, pageNumber, width, isDarkMode }) => {
    const containerRef = React.useRef(null);
    const [isVisible, setIsVisible] = React.useState(false);

    React.useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                } else {
                    setIsVisible(false);
                }
            });
        }, { rootMargin: '300px' });

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }
        return () => observer.disconnect();
    }, []);

    return (
        <div 
            ref={containerRef} 
            style={{ 
                width: '100%', 
                minHeight: `${width * 1.41}px`, 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                position: 'relative'
            }}
        >
            {isVisible ? (
                <img 
                    src={src} 
                    alt={`Página ${pageNumber}`}
                    style={{ 
                        width: '100%', 
                        display: 'block',
                        borderRadius: '16px', 
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                        mixBlendMode: isDarkMode ? 'lighten' : 'normal',
                        opacity: isDarkMode ? 0.9 : 1
                    }} 
                />
            ) : (
                <div style={{ opacity: 0.3, fontSize: '0.8rem', fontStyle: 'italic' }}>
                    Página {pageNumber}
                </div>
            )}
        </div>
    );
};

const PDFBlock = ({ block, activeTool, updateBlock, onInteract, removeBlock, isDragging, isDarkMode, canvasScale, canvasPan }) => {
    const cardRef = React.useRef(null);
    const canvasRef = React.useRef(null);
    const [pdfDoc, setPdfDoc] = React.useState(null);
    const [currentPage, setCurrentPage] = React.useState(0);
    const [viewMode, setViewMode] = React.useState(block.viewMode || 'paged');
    const [totalPages, setTotalPages] = React.useState(block.totalPages || 0);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    const pdfSource = block.pdfUrl || block.pdfRaw;

    React.useEffect(() => {
        // Initialize workerSrc immediately if pdfjsLib is available
        if (typeof window !== 'undefined' && window.pdfjsLib && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
    }, []);

    React.useEffect(() => {
        if (block.pages && Array.isArray(block.pages)) {
            setTotalPages(block.pages.length);
            setLoading(false);
            setError(null);
            return;
        }

        if (!pdfSource) {
            setError("Nenhuma fonte de PDF encontrada (pdfUrl e pdfRaw vazios).");
            setLoading(false);
            return;
        }
        if (!window.pdfjsLib) {
            setError("Biblioteca PDF.js não carregada no window.");
            setLoading(false);
            return;
        }
        
        let isCurrent = true;

        const loadPdf = async () => {
            try {
                setLoading(true);
                setError(null);
                let parameter = pdfSource;
                
                if (typeof pdfSource === 'string' && pdfSource.startsWith('data:')) {
                    const arr = pdfSource.split(',');
                    const bstr = atob(arr[1]);
                    let n = bstr.length;
                    const u8arr = new Uint8Array(n);
                    while (n--) {
                        u8arr[n] = bstr.charCodeAt(n);
                    }
                    parameter = { data: u8arr };
                }
                
                console.log("Iniciando carregamento do PDF pelo PDF.js...", typeof parameter === 'string' ? 'URL' : 'ArrayBuffer');
                const pdf = await window.pdfjsLib.getDocument(parameter).promise;
                
                if (isCurrent) {
                    setPdfDoc(pdf);
                    setTotalPages(pdf.numPages);
                    setLoading(false);
                    if (block.totalPages !== pdf.numPages && updateBlock) {
                        updateBlock(block.id, { totalPages: pdf.numPages });
                    }
                }
            } catch (err) {
                console.error("Error loading PDF document:", err);
                if (isCurrent) {
                    setError(err.message || String(err));
                    setLoading(false);
                }
            }
        };

        loadPdf();
        return () => { isCurrent = false; };
    }, [pdfSource, block.id, block.pages]);

    // Single page rendering hook
    React.useEffect(() => {
        if (!pdfDoc || viewMode !== 'paged' || !canvasRef.current) return;
        let isCurrent = true;

        const renderSinglePage = async () => {
            try {
                const page = await pdfDoc.getPage(currentPage + 1);
                const currentWidth = block.width || 600;
                const contentWidth = currentWidth - 24;

                const viewport = page.getViewport({ scale: 1.0 });
                const scale = contentWidth / viewport.width;
                const scaledViewport = page.getViewport({ scale: scale * 1.5 }); // High quality scaling

                const canvas = canvasRef.current;
                if (!canvas) return;
                canvas.width = scaledViewport.width;
                canvas.height = scaledViewport.height;

                const context = canvas.getContext('2d');
                await page.render({ canvasContext: context, viewport: scaledViewport }).promise;
            } catch (err) {
                console.error("Error rendering single PDF page:", err);
            }
        };

        renderSinglePage();
        return () => { isCurrent = false; };
    }, [pdfDoc, currentPage, viewMode, block.width]);

    const toggleViewMode = (e) => {
        e.stopPropagation();
        const nextMode = viewMode === 'paged' ? 'scroll' : 'paged';
        setViewMode(nextMode);

        if (pdfDoc || (block.pages && Array.isArray(block.pages))) {
            const currentWidth = block.width || 600;
            const contentWidth = currentWidth - 24;
            const gap = 16;
            const paddingVertical = 24; 
            
            let targetHeight;
            if (nextMode === 'scroll') {
                targetHeight = paddingVertical + (totalPages - 1) * gap;
                for (let i = 0; i < totalPages; i++) {
                    targetHeight += (contentWidth * 1.41);
                }
            } else {
                targetHeight = paddingVertical + (contentWidth * 1.41) + 40;
            }

            targetHeight = Math.min(targetHeight, 4000);

            if (updateBlock) {
                updateBlock(block.id, { height: targetHeight, viewMode: nextMode });
            }
        }
    };

    return (
        <BlockWrapper
            ref={cardRef}
            block={block}
            title={`PDF - ${block.fileName || 'Documento'}`}
            color="rose"
            isDragging={isDragging}
            isDarkMode={isDarkMode}
            onClose={removeBlock}
            onInteract={onInteract}
            onRename={(id, name) => updateBlock && updateBlock(id, { customTitle: name })}
            updateBlock={updateBlock}
            canvasScale={canvasScale}
            canvasPan={canvasPan}
            className="pdf-block-wrapper"
            style={{ width: block.width || 600, height: block.height || 800 }}
            headerActions={
                <div className="flex items-center gap-2 mr-2">
                    <button 
                        onClick={toggleViewMode}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-[var(--text-secondary)] transition-all flex items-center justify-center"
                        title={viewMode === 'paged' ? "Mudar para Rolo Contínuo" : "Mudar para Paginação"}
                    >
                        {viewMode === 'paged' ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18"/></svg>
                        ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/></svg>
                        )}
                    </button>

                    {viewMode === 'paged' && totalPages > 1 && (
                        <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-black/5 dark:bg-white/5 border border-white/5">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setCurrentPage(p => Math.max(0, p - 1)); }}
                                disabled={currentPage === 0}
                                className="p-1 hover:bg-white/10 rounded disabled:opacity-30 transition-all"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6"></polyline></svg>
                            </button>
                            <span className="text-[0.65rem] font-bold opacity-60 min-w-[30px] text-center">
                                {currentPage + 1}/{totalPages}
                            </span>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setCurrentPage(p => Math.min(totalPages - 1, p + 1)); }}
                                disabled={currentPage === totalPages - 1}
                                className="p-1 hover:bg-white/10 rounded disabled:opacity-30 transition-all"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </button>
                        </div>
                    )}
                </div>
            }
        >
            <div
                style={{ 
                    width: '100%', 
                    height: '100%', 
                    cursor: activeTool === 'eraser' ? 'cell' : 'default',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '0 12px 12px 12px',
                    boxSizing: 'border-box',
                    overflow: viewMode === 'scroll' ? 'auto' : 'hidden'
                }}
                className="custom-scrollbar"
            >
                {error ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-4 text-center" style={{ gap: '8px', overflowY: 'auto' }}>
                        <div style={{ color: '#f43f5e', fontSize: '0.85rem', fontWeight: 600 }}>
                            ⚠️ Erro ao carregar PDF
                        </div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.8, maxWidth: '100%', overflowWrap: 'anywhere' }}>
                            {error}
                        </div>
                        <div style={{ fontSize: '0.6rem', opacity: 0.5, textAlign: 'left', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '6px', width: '100%', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                            Debug Block Keys: {JSON.stringify(Object.keys(block))}
                            {"\n"}pdfUrl: {block.pdfUrl ? (block.pdfUrl.substring(0, 30) + "...") : "undefined"}
                            {"\n"}pdfRaw: {block.pdfRaw ? (block.pdfRaw.substring(0, 30) + "...") : "undefined"}
                            {"\n"}pages type: {typeof block.pages}
                            {"\n"}pages array: {Array.isArray(block.pages) ? `Yes, length: ${block.pages.length}` : "No"}
                            {"\n"}pages sample: {Array.isArray(block.pages) && block.pages.length > 0 ? (typeof block.pages[0] === 'string' ? block.pages[0].substring(0, 60) + "..." : JSON.stringify(block.pages[0]).substring(0, 60)) : "empty"}
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setError(null);
                                setLoading(true);
                                const currentSource = block.pdfUrl || block.pdfRaw;
                                if (!currentSource) {
                                    setError("Nenhuma fonte de PDF encontrada.");
                                    setLoading(false);
                                }
                            }}
                            style={{
                                marginTop: '4px',
                                padding: '4px 12px',
                                borderRadius: '6px',
                                background: 'rgba(244, 63, 94, 0.2)',
                                border: '1px solid rgba(244, 63, 94, 0.4)',
                                color: '#f43f5e',
                                fontSize: '0.7rem',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            Tentar Novamente
                        </button>
                    </div>
                ) : loading ? (
                    <div className="flex-1 flex items-center justify-center opacity-60 italic text-sm">
                        Carregando documento PDF...
                    </div>
                ) : viewMode === 'paged' ? (
                    <div 
                        className="glass-extreme"
                        style={{ 
                            width: '100%', 
                            height: '100%', 
                            borderRadius: '16px', 
                            overflow: 'hidden',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            background: isDarkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.4)',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}
                    >
                        {block.pages && Array.isArray(block.pages) ? (
                            <img 
                                src={block.pages[currentPage]} 
                                alt={`Página ${currentPage + 1}`}
                                style={{ 
                                    width: '100%', 
                                    height: '100%',
                                    display: 'block', 
                                    objectFit: 'fill', 
                                    mixBlendMode: isDarkMode ? 'lighten' : 'normal',
                                    opacity: isDarkMode ? 0.9 : 1
                                }} 
                            />
                        ) : (
                            <canvas 
                                ref={canvasRef} 
                                style={{ 
                                    width: '100%', 
                                    height: '100%',
                                    display: 'block', 
                                    objectFit: 'fill', 
                                    mixBlendMode: isDarkMode ? 'lighten' : 'normal',
                                    opacity: isDarkMode ? 0.9 : 1
                                }} 
                            />
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '12px 0 24px 0' }}>
                        {block.pages && Array.isArray(block.pages) ? (
                            block.pages.map((pageSrc, idx) => (
                                <PageImageRenderer 
                                    key={idx}
                                    src={pageSrc}
                                    pageNumber={idx + 1}
                                    width={(block.width || 600) - 24}
                                    isDarkMode={isDarkMode}
                                />
                            ))
                        ) : (
                            Array.from({ length: totalPages }, (_, idx) => (
                                <PDFPageRenderer 
                                    key={idx}
                                    pdfDoc={pdfDoc}
                                    pageNumber={idx + 1}
                                    width={(block.width || 600) - 24}
                                    isDarkMode={isDarkMode}
                                />
                            ))
                        )}
                    </div>
                )}
            </div>
        </BlockWrapper>
    );
};

export default PDFBlock;
