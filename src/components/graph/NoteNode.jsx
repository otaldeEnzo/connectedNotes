import React, { memo, useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { FileText, Palette, Brain, Code, Folder, Link2, Plus, Trash2 } from 'lucide-react';

const NoteNode = ({ id, data }) => {
    const {
        title,
        type,
        tags,
        isActive,
        connectionCount,
        scale = 1,
        isHighlighted,
        isDimmed,
        branchColor,
        onAddChild,
        onDelete,
        onRename
    } = data;

    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(title);

    useEffect(() => {
        setEditedTitle(title);
    }, [title]);

    // Icon based on note type
    const getIcon = () => {
        const size = 18;
        switch (type) {
            case 'text': return <FileText size={size} />;
            case 'canvas': return <Palette size={size} />;
            case 'mindmap': return <Brain size={size} />;
            case 'code': return <Code size={size} />;
            case 'folder': return <Folder size={size} />;
            default: return <FileText size={size} />;
        }
    };

    // Color based on note type
    const getColor = () => {
        switch (type) {
            case 'text': return '#6366f1'; // indigo
            case 'canvas': return '#ec4899'; // pink
            case 'mindmap': return '#8b5cf6'; // purple
            case 'code': return '#10b981'; // green
            case 'folder': return '#f59e0b'; // amber
            default: return '#64748b'; // slate
        }
    };

    const typeColor = getColor();
    const groupColor = branchColor || typeColor;

    const handleTitleDoubleClick = (e) => {
        e.stopPropagation();
        setIsEditing(true);
    };

    const handleTitleBlur = () => {
        setIsEditing(false);
        if (editedTitle !== title) {
            onRename?.(id, editedTitle);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleTitleBlur();
        if (e.key === 'Escape') {
            setEditedTitle(title);
            setIsEditing(false);
        }
    };

    return (
        <div
            className={`graph-node ${isActive ? 'active' : ''} ${isHighlighted ? 'highlighted' : ''} ${isDimmed ? 'dimmed' : ''}`}
            style={{
                borderColor: isHighlighted || isActive ? groupColor : (branchColor ? `${groupColor}80` : 'var(--border-color)'),
                boxShadow: isActive ? `0 0 20px ${groupColor}60` : (isHighlighted ? `0 0 15px ${groupColor}40` : (branchColor ? `0 4px 12px ${groupColor}20` : undefined)),
                transform: `scale(${scale}) translateZ(0)`,
                opacity: isDimmed ? 0.3 : 1,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                backfaceVisibility: 'hidden'
            }}
        >
            {/* Action Buttons (Visible on hover via CSS) */}
            <div className="graph-node-actions">
                <button
                    className="graph-node-action-btn add"
                    onClick={(e) => { e.stopPropagation(); onAddChild?.(id); }}
                    title="Adicionar nota filha"
                >
                    <Plus size={14} />
                </button>
                <button
                    className="graph-node-action-btn delete"
                    onClick={(e) => { e.stopPropagation(); onDelete?.(id); }}
                    title="Excluir nota"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            {/* Connection Handles - All Sides for Smart Routing */}
            {/* Top */}
            <Handle type="target" position={Position.Top} id="top" style={{ top: 0, opacity: 0 }} />
            <Handle type="source" position={Position.Top} id="top-s" style={{ top: 0, opacity: 0 }} />

            {/* Bottom */}
            <Handle type="target" position={Position.Bottom} id="bottom" style={{ bottom: 0, opacity: 0 }} />
            <Handle type="source" position={Position.Bottom} id="bottom-s" style={{ bottom: 0, opacity: 0 }} />

            {/* Left */}
            <Handle type="target" position={Position.Left} id="left" style={{ left: 0, opacity: 0 }} />
            <Handle type="source" position={Position.Left} id="left-s" style={{ left: 0, opacity: 0 }} />

            {/* Right */}
            <Handle type="target" position={Position.Right} id="right" style={{ right: 0, opacity: 0 }} />
            <Handle type="source" position={Position.Right} id="right-s" style={{ right: 0, opacity: 0 }} />

            {/* Node Content */}
            <div className="graph-node-header">
                <span className="graph-node-icon" style={{ color: typeColor }}>{getIcon()}</span>
                {isEditing ? (
                    <input
                        autoFocus
                        className="graph-node-title-input"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        onBlur={handleTitleBlur}
                        onKeyDown={handleKeyDown}
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <span
                        className="graph-node-title"
                        onDoubleClick={handleTitleDoubleClick}
                        title="Clique duplo para renomear"
                    >
                        {title || 'Sem título'}
                    </span>
                )}
            </div>

            {/* Tags */}
            {tags && tags.length > 0 && (
                <div className="graph-node-tags">
                    {tags.slice(0, 4).map((tag, idx) => (
                        <span key={idx} className="graph-node-tag">
                            #{tag.toLowerCase()}
                        </span>
                    ))}
                    {tags.length > 4 && (
                        <span className="graph-node-tag-more">+{tags.length - 4}</span>
                    )}
                </div>
            )}

            {/* Connection Count Indicator */}
            {connectionCount > 0 && (
                <div className="graph-node-footer">
                    <span className="graph-node-connections">
                        <Link2 size={12} style={{ marginRight: 4 }} />
                        {connectionCount} {connectionCount === 1 ? 'conexão' : 'conexões'}
                    </span>
                </div>
            )}
        </div>
    );
};

export default memo(NoteNode);
