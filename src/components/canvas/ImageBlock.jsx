import React from 'react';
import BlockWrapper from './BlockWrapper';

const ImageBlock = ({ block, activeTool, updateBlock, onInteract, removeBlock, isDragging, isDarkMode, canvasScale, canvasPan }) => {
    const cardRef = React.useRef(null);
    const dotColor = block.color === 'cyan' ? '#06b6d4' : (block.color === 'blue' ? '#3b82f6' : '#06b6d4');

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
            style={{ width: block.width || 300, height: block.height || 'auto' }}
        >
            <div
                style={{ width: '100%', height: '100%', cursor: activeTool === 'eraser' ? 'cell' : 'default' }}
            >
                <img src={block.src} alt="Content" style={{ width: '100%', height: '100%', pointerEvents: 'none', display: 'block', objectFit: 'contain', borderRadius: '4px' }} />
            </div>
        </BlockWrapper>
    );
};

export default ImageBlock;
