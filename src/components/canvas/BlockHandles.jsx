import React from 'react';
import { getEffectiveMathDimensions } from './CanvasUtils';

const BlockHandles = ({ block, type, onStartConnection, onCompleteConnection, isHovered, scale, canvasScale, canvasPan, connectingState }) => {
    const [showDots, setShowDots] = React.useState(false);

    React.useEffect(() => {
        if (isHovered || connectingState) {
            setShowDots(true);
        } else {
            setShowDots(false);
        }
    }, [isHovered, !!connectingState]);

    const activeVisible = showDots || !!connectingState;

    const isMath = type === 'math' || block.type === 'math';
    const { width: w, height: h, xOffset, yOffset } = getEffectiveMathDimensions(block, isMath && isHovered);

    const s = canvasScale ?? 1;
    const px = canvasPan?.x ?? 0;
    const py = canvasPan?.y ?? 0;

    const handleStyle = {
        position: 'absolute',
        width: '14px',
        height: '14px',
        borderRadius: '50%',
        background: 'white',
        border: '1.5px solid var(--accent-color)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        cursor: 'crosshair',
        zIndex: 200,
        pointerEvents: activeVisible ? 'auto' : 'none',
        opacity: activeVisible ? 1 : 0,
        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
    };

    const handleHoverProps = {
        onMouseEnter: (e) => {
            e.target.style.transform = e.target.style.transform.replace(/scale\([\d.]+\)/, '') + ' scale(1.3)';
            e.target.style.boxShadow = '0 0 15px var(--accent-glow)';
        },
        onMouseLeave: (e) => {
            e.target.style.transform = e.target.style.transform.replace(/ scale\([\d.]+\)/, '') + ' scale(1)';
            e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        }
    };

    // Wrapper must match block size and pos
    return (
        <div className="block-handles-wrapper" style={{
            position: 'absolute',
            left: px + (block.x - xOffset) * s,
            top: py + (block.y - yOffset) * s,
            transform: `scale(${s})`,
            transformOrigin: '0 0',
            width: w,
            height: h,
            pointerEvents: 'none',
            zIndex: 200
        }}>
            {/* Top */}
            {type !== 'pdf' && (
                <div className="connector-handle"
                    data-block-id={block.id} data-side="top"
                    onPointerDown={(e) => onStartConnection(e, block.id, 'top')}
                    onPointerUp={(e) => onCompleteConnection && onCompleteConnection(e, block.id, 'top')}
                    {...handleHoverProps}
                    style={{ ...handleStyle, top: -22, left: '50%', transform: 'translateX(-50%)' }} />
            )}
            {/* Bottom */}
            {type !== 'pdf' && (
                <div className="connector-handle"
                    data-block-id={block.id} data-side="bottom"
                    onPointerDown={(e) => onStartConnection(e, block.id, 'bottom')}
                    onPointerUp={(e) => onCompleteConnection && onCompleteConnection(e, block.id, 'bottom')}
                    {...handleHoverProps}
                    style={{ ...handleStyle, bottom: -22, left: '50%', transform: 'translateX(-50%)' }} />
            )}
            {/* Left */}
            {type !== 'pdf' && (
                <div className="connector-handle"
                    data-block-id={block.id} data-side="left"
                    onPointerDown={(e) => onStartConnection(e, block.id, 'left')}
                    onPointerUp={(e) => onCompleteConnection && onCompleteConnection(e, block.id, 'left')}
                    {...handleHoverProps}
                    style={{ ...handleStyle, top: '50%', left: -22, transform: 'translateY(-50%)' }} />
            )}
            {/* Right */}
            {type !== 'pdf' && (
                <div className="connector-handle"
                    data-block-id={block.id} data-side="right"
                    onPointerDown={(e) => onStartConnection(e, block.id, 'right')}
                    onPointerUp={(e) => onCompleteConnection && onCompleteConnection(e, block.id, 'right')}
                    {...handleHoverProps}
                    style={{ ...handleStyle, top: '50%', right: -22, transform: 'translateY(-50%)' }} />
            )}
        </div>
    );
};

export default BlockHandles;
