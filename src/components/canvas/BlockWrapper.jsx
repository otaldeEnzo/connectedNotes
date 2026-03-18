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
      className = "",
      style = {},
      canvasScale,
      canvasPan,
    },
    ref,
  ) => {
    const [isRenamingTitle, setIsRenamingTitle] = useState(false);
    const [titleValue, setTitleValue] = useState(block.customTitle || "");
    const titleInputRef = useRef(null);

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

    return (
      <div
        ref={ref}
        className={`glass-extreme flex flex-col rounded-[2.5rem] overflow-hidden group select-none ${shadowTailwind} ${isDragging ? "opacity-90 scale-[1.02] z-[1001]" : ""} ${className}`}
        style={{
          position: "absolute",
          left: screenX,
          top: screenY,
          transform: `scale(${s})`,
          transformOrigin: '0 0',
          width: useFixed && block.width ? `${block.width}px` : "auto",
          height: useFixed && block.height ? `${block.height}px` : "auto",
          zIndex: isEditing ? 1000 : isDragging ? 1001 : block.zIndex || 50,
          pointerEvents: "auto",
          transitionProperty: "transform, opacity, box-shadow, background, border-color",
          transitionDuration: "400ms",
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
          ...style,
        }}
        onPointerDown={(e) => {
          if (e.target.closest("button") || e.target.closest("input") || e.target.closest(".no-interact")) {
            e.stopPropagation();
            return;
          }

          if (e.target.closest(".block-header")) {
            e.stopPropagation();
            onInteract && onInteract(block.id, e);
            return;
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
        {/* Header - Tailwind Refactored */}
        <div className="block-header flex items-center justify-between px-6 py-4 cursor-grab active:cursor-grabbing border-b border-white/[0.05]">
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
    );
  },
);

export default BlockWrapper;
