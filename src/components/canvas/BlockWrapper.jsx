import React, { forwardRef, useState, useRef, useEffect } from "react";
import { X } from "lucide-react";

const BlockWrapper = forwardRef(
  (
    {
      block,
      title,
      color = "#8b5cf6",
      isEditing,
      isDragging,
      isDarkMode,
      onClose,
      onInteract,
      onDoubleClick,
      onRename,
      children,
      headerActions,
      canvasScale,
      canvasPan,
      updateBlock,
      allowOverflow,
      className = "",
      style = {},
      toolbarContent,
    },
    ref,
  ) => {
    const [isRenamingTitle, setIsRenamingTitle] = useState(false);
    const [titleValue, setTitleValue] = useState(block.customTitle || "");
    const titleInputRef = useRef(null);
    const internalRef = useRef(null);
    const cardRef = ref || internalRef;


    useEffect(() => {
      if (isRenamingTitle && titleInputRef.current) {
        titleInputRef.current.focus();
        titleInputRef.current.select();
      }
    }, [isRenamingTitle]);

    const colorShadows = {
      violet: "hover:shadow-[0_20px_50px_rgba(139,92,246,0.3)]",
      cyan: "hover:shadow-[0_20px_50px_rgba(6,182,212,0.3)]",
      fuchsia: "hover:shadow-[0_20px_50px_rgba(217,70,239,0.3)]",
      emerald: "hover:shadow-[0_20px_50px_rgba(16,185,129,0.3)]",
      rose: "hover:shadow-[0_20px_50px_rgba(244,63,94,0.3)]",
      amber: "hover:shadow-[0_20px_50px_rgba(245,158,11,0.3)]",
      blue: "hover:shadow-[0_20px_50px_rgba(59,130,246,0.3)]",
    };

    const shadowTailwind = colorShadows[block.color] || colorShadows["violet"];

    const useFixed = block.fixedSize === true || (block.fixedSize !== false && (block.width || block.height));
    const displayTitle = block.customTitle || title;

    const handleTitleDoubleClick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      setTitleValue(displayTitle);
      setIsRenamingTitle(true);
    };

    const commitRename = () => {
      setIsRenamingTitle(false);
      const newTitle = titleValue.trim();
      if (newTitle && newTitle !== title && onRename) {
        onRename(block.id, newTitle);
      } else if (!newTitle && onRename) {
        onRename(block.id, null);
      }
    };

    const s = canvasScale ?? 1;
    const px = canvasPan?.x ?? 0;
    const py = canvasPan?.y ?? 0;
    const screenX = px + block.x * s;
    const screenY = py + block.y * s;

    const isSelected = isEditing || isDragging;

    // Viewport Culling logic
    const [isVisible, setIsVisible] = useState(true);
    useEffect(() => {
      const checkVisibility = () => {
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;
        const margin = 300; 
        const bWidth = (block.width || 400) * s;
        const bHeight = (block.height || 300) * s;
        const inViewport = (
          screenX + bWidth > -margin &&
          screenX < viewportW + margin &&
          screenY + bHeight > -margin &&
          screenY < viewportH + margin
        );
        setIsVisible(inViewport);
      };
      checkVisibility();
      window.addEventListener('resize', checkVisibility);
      return () => window.removeEventListener('resize', checkVisibility);
    }, [screenX, screenY, block.width, block.height, s]);

    // Report dimensions to canvas
    useEffect(() => {
      const target = cardRef && 'current' in cardRef ? cardRef.current : cardRef;
      if (!target || !updateBlock) return;
      const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          const { width, height } = entry.contentRect;
          // Only update if significantly changed to avoid loops
          if (Math.abs(width - (block.measuredWidth || 0)) > 1 || 
              Math.abs(height - (block.measuredHeight || 0)) > 1) {
            updateBlock(block.id, { measuredWidth: width, measuredHeight: height });
          }
        }
      });
      observer.observe(target);
      return () => observer.disconnect();
    }, [block.id, block.measuredWidth, block.measuredHeight, updateBlock, ref]);

    return (
      <div
        ref={cardRef}
        data-block-id={block.id}
        className={`absolute pointer-events-auto ${isDragging ? "opacity-90 z-[1001]" : ""} ${className}`}
        style={{
          left: screenX,
          top: screenY,
          transform: `scale(${s * (isDragging ? 1.02 : 1)})`,
          transformOrigin: '0 0',
          width: useFixed && block.width ? `${block.width}px` : "auto",
          height: useFixed && block.height ? `${block.height}px` : "auto",
          zIndex: isEditing ? 1000 : isDragging ? 1001 : block.zIndex || 50,
        }}
        onPointerDown={(e) => {
          if (e.target.closest("button") || e.target.closest("input") || e.target.closest(".no-interact")) {
            e.stopPropagation();
            return;
          }

          if (e.target.closest(".block-header")) {
            return; // Delegation handles it
          }

          if (e.target.closest(".block-interactivity-isolation")) {
            e.stopPropagation();
            return;
          }

          if (e.target.closest(".block-content") && isEditing) {
            return;
          }

          e.stopPropagation();
          onInteract && onInteract(block.id, e);
        }}
        onMouseEnter={() => {
          if (block.expression !== undefined || block.code !== undefined || block.type === 'mindmap') {
            window.isOverInteractiveBlock = true;
          }
        }}
        onMouseLeave={() => {
          window.isOverInteractiveBlock = false;
        }}
        onDoubleClick={(e) => {
          if (e.target.closest(".block-header") && !e.target.closest("button")) {
            handleTitleDoubleClick(e);
            return;
          }
          if (onDoubleClick) onDoubleClick(e);
        }}
        onKeyDown={(e) => {
          if (isEditing || isRenamingTitle) e.stopPropagation();
        }}
      >
        {toolbarContent}
        <div 
          className={`glass-extreme w-full h-full flex flex-col rounded-[2.5rem] transition-[box-shadow,border-color,background] duration-300 ${allowOverflow ? '' : 'overflow-hidden'} ${shadowTailwind}`}
          style={{
            background: "var(--glass-bg) !important",
            backdropFilter: isVisible ? `blur(var(--glass-blur)) saturate(200%) brightness(1.1) !important` : 'none',
            WebkitBackdropFilter: isVisible ? `blur(var(--glass-blur)) saturate(200%) brightness(1.1) !important` : 'none',
            border: '1.5px solid var(--glass-border) !important',
            boxShadow: `var(--glass-shadow), 0 0 0 calc(var(--select-opacity, 0) * 2px) var(--accent-color)`,
            "--select-opacity": isSelected ? 1 : 0,
            ...style,
          }}
        >
          {/* Header - Unified Transparent */}
          <div 
            className="block-header flex items-center justify-between px-6 py-4 cursor-grab active:cursor-grabbing"
            data-drag-handle="true"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor]"
                style={{ color: color, backgroundColor: "currentColor" }}
              />
              {isRenamingTitle ? (
                <input
                  ref={titleInputRef}
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setIsRenamingTitle(false);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="bg-transparent border-none border-b border-accent-color text-white/90 text-[0.85rem] font-semibold tracking-tight outline-none px-0.5 min-w-[40px] max-w-[200px]"
                />
              ) : (
                <span className="text-white/80 text-[0.85rem] font-semibold tracking-tight uppercase opacity-60 group-hover:opacity-100 transition-opacity">
                  {displayTitle}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {headerActions}
              <button
                className="p-2 rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-all duration-300 active:scale-90"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose && onClose(block.id);
                }}
                title="Remover"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Content - Tailwind Refactored */}
          <div className="block-content flex-1 overflow-visible relative">
            {children}
          </div>
        </div>
      </div>
    );
  },
);

export default BlockWrapper;
