import React, { useEffect } from 'react';
import BlockWrapper from './BlockWrapper';

const ImageBlock = ({ block, activeTool, updateBlock, onInteract, removeBlock, isDragging, isDarkMode, canvasScale, canvasPan }) => {
    const cardRef = React.useRef(null);
    const dotColor = block.color === 'cyan' ? '#06b6d4' : (block.color === 'blue' ? '#3b82f6' : '#06b6d4');
    const [resolvedSrc, setResolvedSrc] = React.useState(block.src?.startsWith('media://') ? null : block.src);

    useEffect(() => {
        if (block.src && block.src.startsWith('media://')) {
            import('../../services/StorageService').then(({ StorageService }) => {
                StorageService.loadMediaFile(block.src).then(url => {
                    setResolvedSrc(url);
                });
            });
        } else {
            setResolvedSrc(block.src);
        }
    }, [block.src]);

    // Dynamically adjust block dimensions to match the image's natural aspect ratio on mount
    useEffect(() => {
        if (block.src && updateBlock && !block.aspectRatioAdjusted) {
            const img = new Image();
            img.onload = () => {
                const naturalWidth = img.naturalWidth;
                const naturalHeight = img.naturalHeight;
                if (naturalWidth && naturalHeight) {
                    const currentWidth = block.width || 350;
                    const calculatedHeight = Math.round((naturalHeight / naturalWidth) * currentWidth);
                    
                    // Total block height includes the header (approx 56px)
                    const totalHeight = calculatedHeight + 56;

                    updateBlock(block.id, {
                        width: currentWidth,
                        height: totalHeight,
                        aspectRatioAdjusted: true
                    });
                }
            };
            img.src = resolvedSrc;
        }
    }, [resolvedSrc, block.id, block.width, updateBlock, block.aspectRatioAdjusted]);

    return (
        <BlockWrapper
            ref={cardRef}
            block={block}
            title="Imagem"
            color={dotColor}
            isDragging={isDragging}
            isDarkMode={isDarkMode}
            onClose={removeBlock}
            onInteract={onInteract}
            onRename={(id, name) => updateBlock && updateBlock(id, { customTitle: name })}
            updateBlock={updateBlock}
            canvasScale={canvasScale}
            canvasPan={canvasPan}
            className="image-block-wrapper"
            style={{ width: block.width || 350, height: block.height || 'auto' }}
        >
            <div
                style={{ width: '100%', height: '100%', cursor: activeTool === 'eraser' ? 'cell' : 'default', overflow: 'hidden' }}
            >
                <img 
                    src={resolvedSrc} 
                    alt="Content" 
                    style={{ 
                        width: '100%', 
                        height: 'calc(100% - 4px)', 
                        pointerEvents: 'none', 
                        display: 'block', 
                        objectFit: 'fill', 
                        borderRadius: '0px 0px 2.3rem 2.3rem' 
                    }} 
                />
            </div>
        </BlockWrapper>
    );
};

export default ImageBlock;
