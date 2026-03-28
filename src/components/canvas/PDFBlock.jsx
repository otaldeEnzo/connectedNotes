import React from 'react';
import BlockWrapper from './BlockWrapper';

const PDFBlock = ({ block, activeTool, updateBlock, onInteract, removeBlock, isDragging, isDarkMode, canvasScale, canvasPan }) => {
    const cardRef = React.useRef(null);
    const [currentPage, setCurrentPage] = React.useState(0);
    const [viewMode, setViewMode] = React.useState(block.viewMode || 'paged'); // 'paged' or 'scroll'
    const totalPages = block.pages ? block.pages.length : 0;

    const toggleViewMode = (e) => {
        e.stopPropagation();
        const nextMode = viewMode === 'paged' ? 'scroll' : 'paged';
        setViewMode(nextMode);

        if (block.pages && block.pages.length > 0) {
            const currentWidth = block.width || 600;
            const contentWidth = currentWidth - 24;
            const gap = 16;
            const paddingVertical = 24; 
            
            let targetHeight;
            if (nextMode === 'scroll') {
                targetHeight = paddingVertical + (block.pages.length - 1) * gap;
                block.pages.forEach(() => {
                    targetHeight += (contentWidth * 1.41);
                });
            } else {
                // No modo paged, queremos apenas a altura de UMA página + padding
                targetHeight = paddingVertical + (contentWidth * 1.41);
            }

            targetHeight = Math.min(targetHeight, 5000);

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
                {viewMode === 'paged' ? (
                    block.pages && block.pages[currentPage] ? (
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
                                background: isDarkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.4)'
                            }}
                        >
                            <img 
                                src={block.pages[currentPage]} 
                                alt={`PDF Page ${currentPage + 1}`} 
                                style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    pointerEvents: 'none', 
                                    display: 'block', 
                                    objectFit: 'contain', 
                                    mixBlendMode: isDarkMode ? 'lighten' : 'normal',
                                    opacity: isDarkMode ? 0.9 : 1
                                }} 
                            />
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center opacity-40 italic text-sm">Página não encontrada</div>
                    )
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '12px 0 24px 0' }}>
                        {block.pages?.map((src, idx) => (
                            <div 
                                key={idx} 
                                className="glass-extreme"
                                style={{ 
                                    width: '100%', 
                                    borderRadius: '16px', 
                                    overflow: 'hidden',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                                    backdropFilter: 'blur(8px)',
                                    WebkitBackdropFilter: 'blur(8px)',
                                    background: isDarkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.4)'
                                }}
                            >
                                <img 
                                    src={src} 
                                    alt={`Page ${idx + 1}`} 
                                    style={{ 
                                        width: '100%', 
                                        display: 'block',
                                        mixBlendMode: isDarkMode ? 'lighten' : 'normal',
                                        opacity: isDarkMode ? 0.9 : 1
                                    }} 
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </BlockWrapper>
    );
};

export default PDFBlock;
