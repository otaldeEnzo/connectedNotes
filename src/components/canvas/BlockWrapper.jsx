import React, { forwardRef, useState, useRef, useEffect, useCallback } from "react";
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
      blue: "hover:shadow-[0_20px_50px_rgba(59,130,246,0.3)]",
      amber: "hover:shadow-[0_20px_50px_rgba(245,158,11,0.3)]",
      rose: "hover:shadow-[0_20px_50px_rgba(244,63,94,0.35)]",
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

    // Viewport Culling logic (Disabled to prevent vanishing blocks on re-render)
    const isVisible = true;

    const measuredDimsRef = useRef({ w: block.measuredWidth, h: block.measuredHeight });
    useEffect(() => {
      measuredDimsRef.current = { w: block.measuredWidth, h: block.measuredHeight };
    }, [block.measuredWidth, block.measuredHeight]);

    // Report dimensions to canvas
    useEffect(() => {
      const target = cardRef && 'current' in cardRef ? cardRef.current : cardRef;
      if (!target || !updateBlock) return;
      const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          const { width, height } = entry.contentRect;
          // Only update if significantly changed to avoid loops
          if (Math.abs(width - (measuredDimsRef.current.w || 0)) > 1 ||
            Math.abs(height - (measuredDimsRef.current.h || 0)) > 1) {
            updateBlock(block.id, { measuredWidth: width, measuredHeight: height });
          }
        }
      });
      observer.observe(target);
      return () => observer.disconnect();
    }, [block.id, updateBlock, cardRef]);

    if (!isVisible && !isSelected) {
      return (
        <div
          ref={cardRef}
          data-block-id={block.id}
          className="absolute opacity-0 pointer-events-none"
          style={{
            width: useFixed && block.width ? `${block.width}px` : `${block.measuredWidth || 400}px`,
            height: useFixed && block.height ? `${block.height}px` : `${block.measuredHeight || 300}px`,
            transform: `translate3d(${screenX}px, ${screenY}px, 0) scale(${s})`,
            transformOrigin: '0 0',
          }}
        />
      );
    }

    return (
      <div
        ref={cardRef}
        data-block-id={block.id}
        className={`absolute pointer-events-auto ${isDragging ? "opacity-90 z-[1001]" : ""} ${className}`}
        style={{
          transform: `translate3d(${screenX}px, ${screenY}px, 0) scale(${s * (isDragging ? 1.02 : 1)})`,
          transformOrigin: '0 0',
          width: block.width ? `${block.width}px` : "auto",
          height: useFixed && block.height ? `${block.height}px` : "auto",
          zIndex: isEditing ? 1000 : isDragging ? 1001 : block.zIndex || 50,
        }}
        onDoubleClick={(e) => {
          if (e.target.closest(".no-interact") || isRenamingTitle) {
            e.stopPropagation();
            return;
          }
          if (e.target.closest(".block-content") && isEditing) {
            e.stopPropagation();
            return;
          }
          if (onDoubleClick) {
            e.stopPropagation();
            onDoubleClick(e);
          }
        }}
        onPointerDown={(e) => {
          if (e.target.closest("button") || e.target.closest("input") || e.target.closest(".no-interact") || isRenamingTitle) {
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
            e.stopPropagation();
            return;
          }

          e.stopPropagation();
          onInteract && onInteract(block.id, e);
        }}
        onMouseEnter={() => {
          if (block.expression !== undefined || block.code !== undefined || block.type === 'mindmap' || block.type === 'math') {
            window.isOverInteractiveBlock = true;
          }
        }}
        onMouseLeave={() => {
          window.isOverInteractiveBlock = false;
        }}
        onKeyDown={(e) => {
          if (isEditing || isRenamingTitle) e.stopPropagation();
        }}
      >
        {toolbarContent}
        <div
          className={`glass-extreme glass-card w-full h-full flex flex-col rounded-[2.5rem] transition-[box-shadow,border-color,background] duration-300 ${allowOverflow ? '' : 'overflow-hidden'} ${shadowTailwind}`}
          style={{
            background: "var(--glass-bg)",
            backdropFilter: `blur(var(--glass-blur)) saturate(250%) brightness(0.95)`,
            WebkitBackdropFilter: `blur(var(--glass-blur)) saturate(250%) brightness(0.95)`,
            border: '1.5px solid var(--glass-border)',
            boxShadow: `var(--glass-shadow), 0 0 0 calc(var(--select-opacity, 0) * 2px) var(--accent-color)`,
            "--select-opacity": isSelected ? 1 : 0,
            ...style,
          }}
        >
          {/* Header - Unified Transparent */}
          <div
            className="block-header flex items-center justify-between px-6 py-4 cursor-grab active:cursor-grabbing"
            data-drag-handle="true"
            onDoubleClick={(e) => {
              if (block.type === 'text' || block.content !== undefined) {
                e.stopPropagation();
                if (onDoubleClick) onDoubleClick(e);
              }
            }}
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
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className="no-interact bg-transparent border-none border-b border-accent-color text-[var(--text-primary)] text-[0.85rem] font-semibold tracking-tight outline-none px-0.5 min-w-[40px] max-w-[200px] pointer-events-auto relative z-[10001]"
                />
              ) : (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTitleDoubleClick(e);
                  }}
                  className="text-[var(--text-primary)] text-[0.85rem] font-semibold tracking-tight uppercase opacity-60 hover:opacity-100 transition-opacity cursor-text no-interact"
                >
                  {displayTitle}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {headerActions}
              <button
                className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[var(--text-secondary)] opacity-40 hover:opacity-100 transition-all duration-300 active:scale-90"
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
          <div className="block-content flex-1 flex flex-col min-h-0 w-full overflow-visible relative">
            {children}
          </div>
        </div>
      </div>
    );
  },
);

export default BlockWrapper;
