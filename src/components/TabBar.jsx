import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNotes } from '../contexts/NotesContext';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Ícones por tipo de nota
const TypeIcons = {
    canvas: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="M2 2l7.586 7.586" />
            <circle cx="11" cy="11" r="2" />
        </svg>
    ),
    text: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
    ),
    code: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
        </svg>
    ),
    mermaid: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="3" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <circle cx="6" cy="19" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="12" y1="12" x2="6" y2="16" />
            <line x1="12" y1="12" x2="18" y2="16" />
        </svg>
    ),
    mindmap: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v7" />
            <path d="M12 15v7" />
            <path d="M2 12h7" />
            <path d="M15 12h7" />
        </svg>
    ),
    folder: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
    )
};

const ChevronRight = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
);

const ChevronDown = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
);

const SortableTabItem = ({ id, note, isActive, onSelect, onClose, onAuxClick, onRename, onContextMenu }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(note.title);
    const inputRef = useRef(null);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id, disabled: isEditing });

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleDoubleClick = (e) => {
        e.stopPropagation();
        setIsEditing(true);
        setEditTitle(note.title);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            saveRename();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
        }
    };

    const saveRename = () => {
        if (editTitle.trim() && editTitle !== note.title) {
            onRename(id, editTitle.trim());
        }
        setIsEditing(false);
    };

    const handleContextMenu = (e) => {
        e.preventDefault();
        onContextMenu(e, id);
    };

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : 1,
        cursor: isDragging ? 'grabbing' : 'pointer'
    };

    const Icon = TypeIcons[note.type] || TypeIcons.text;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`tab-item liquid-item ${isActive ? 'active' : ''}`}
            onClick={() => onSelect(id)}
            onAuxClick={(e) => onAuxClick(e, id)}
            onContextMenu={handleContextMenu}
            onMouseDown={(e) => {
                if (e.button === 1) e.preventDefault();
            }}
            title={note.title}
            {...attributes}
            {...listeners}
            onDoubleClick={handleDoubleClick}
        >
            <span className="tab-icon">{Icon}</span>
            {isEditing ? (
                <input
                    ref={inputRef}
                    className="tab-title-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={saveRename}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                />
            ) : (
                <span className="tab-title">{note.title}</span>
            )}
            <button
                className="tab-close-btn"
                onClick={(e) => {
                    e.stopPropagation();
                    onClose(e, id);
                }}
                onMouseDown={e => e.stopPropagation()}
                title="Fechar aba"
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>
        </div>
    );
};

const TabContextMenu = ({ x, y, noteId, onClose, onCloseTab, onCloseOthers, onCloseToRight }) => {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, [onClose]);

    return createPortal(
        <div
            ref={menuRef}
            className="tab-context-menu"
            style={{ position: 'fixed', top: y, left: x, zIndex: 10001 }}
            onContextMenu={(e) => e.preventDefault()}
        >
            <div className="tab-context-item liquid-item" onClick={() => { onCloseTab(noteId); onClose(); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                Fechar Aba
            </div>
            <div className="tab-context-item liquid-item" onClick={() => { onCloseOthers(noteId); onClose(); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                Fechar Outras
            </div>
            <div className="tab-context-item liquid-item" onClick={() => { onCloseToRight(noteId); onClose(); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                Fechar à Direita
            </div>
        </div>,
        document.body
    );
};

// TreeNode para o picker - versão simplificada do Sidebar
const PickerTreeNode = ({ nodeId, level, notes, openTabs, onSelect, expandedFolders, onToggleFolder }) => {
    const note = notes[nodeId];
    if (!note) return null;

    const isFolder = note.type === 'folder';
    const hasChildren = note.children && note.children.length > 0;
    const isExpanded = expandedFolders[nodeId] !== false; // Default to expanded
    const isAlreadyOpen = openTabs.includes(nodeId);
    const Icon = TypeIcons[note.type] || TypeIcons.text;

    const handleClick = (e) => {
        e.stopPropagation();
        if (isFolder) {
            onToggleFolder(nodeId);
        } else if (!isAlreadyOpen) {
            onSelect(nodeId);
        }
    };

    return (
        <div className="picker-tree-node">
            <div
                className={`picker-tree-item liquid-item ${isAlreadyOpen ? 'already-open' : ''} ${isFolder ? 'is-folder' : ''}`}
                style={{ paddingLeft: `${level * 16 + 8}px` }}
                onClick={handleClick}
            >
                {/* Chevron para pastas */}
                {isFolder && hasChildren && (
                    <span className="picker-chevron">
                        {isExpanded ? <ChevronDown /> : <ChevronRight />}
                    </span>
                )}
                {isFolder && !hasChildren && <span className="picker-chevron-placeholder" />}

                {/* Ícone */}
                <span className="picker-icon">{Icon}</span>

                {/* Título */}
                <span className="picker-title">{note.title}</span>

                {/* Badge se já está aberto */}
                {isAlreadyOpen && !isFolder && (
                    <span className="picker-badge">aberta</span>
                )}
            </div>

            {/* Children */}
            {isFolder && hasChildren && isExpanded && (
                <div className="picker-tree-children">
                    {note.children.map(childId => (
                        <PickerTreeNode
                            key={childId}
                            nodeId={childId}
                            level={level + 1}
                            notes={notes}
                            openTabs={openTabs}
                            onSelect={onSelect}
                            expandedFolders={expandedFolders}
                            onToggleFolder={onToggleFolder}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const TagPopoverContent = ({ onClose }) => {
    const { activeNote, updateNoteTags } = useNotes();
    const note = activeNote;

    if (!note) return null;

    return (
        <div className="glass-extreme" style={{
            position: 'absolute',
            top: '48px',
            right: '8px',
            width: '260px',
            padding: '16px',
            borderRadius: '16px',
            zIndex: 1000,
            boxShadow: 'var(--glass-shadow)',
            animation: 'slideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}>
            <div style={{ marginBottom: '10px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Tags da Nota
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                {(note.tags || []).length === 0 && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nenhuma tag</span>
                )}
                {(note.tags || []).map(tag => (
                    <div key={tag} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(99, 102, 241, 0.15)',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        color: 'var(--accent-color)'
                    }}>
                        <span>#{tag}</span>
                        <button
                            onClick={() => {
                                const newTags = (note.tags || []).filter(t => t !== tag);
                                updateNoteTags(note.id, newTags);
                            }}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-secondary)',
                                fontSize: '14px',
                                padding: 0,
                                display: 'flex'
                            }}
                        >×</button>
                    </div>
                ))}
            </div>
            <input
                type="text"
                placeholder="Adicionar tag..."
                autoFocus
                style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--canvas-bg-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none'
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                        let tag = e.target.value.trim();
                        if (tag.startsWith('#')) tag = tag.slice(1);
                        if (!note.tags?.includes(tag)) {
                            const newTags = [...(note.tags || []), tag];
                            updateNoteTags(note.id, newTags);
                        }
                        e.target.value = '';
                    }
                    if (e.key === 'Escape') onClose();
                }}
            />
        </div>
    );
};


const TabBar = ({ isMiniMapEnabled, setIsMiniMapEnabled, showTagPopover, setShowTagPopover, isSidebarOpen, onToggleSidebar }) => {
    const {
        notes, openTabs, activeNoteId, selectNote, closeTab,
        reorderTabs, updateNoteTitle, closeOtherTabs, closeTabsToRight
    } = useNotes();
    const [showNotePicker, setShowNotePicker] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const [expandedFolders, setExpandedFolders] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [contextMenu, setContextMenu] = useState(null);
    const buttonRef = useRef(null);
    const searchInputRef = useRef(null);
    const scrollRef = useRef(null);

    const handleWheel = (e) => {
        if (scrollRef.current) {
            e.preventDefault();
            scrollRef.current.scrollLeft += e.deltaY;
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Close menu when clicking outside
    useEffect(() => {
        if (!showNotePicker) return;

        const handleClickOutside = (e) => {
            if (buttonRef.current && buttonRef.current.contains(e.target)) {
                return;
            }
            const menuElement = document.getElementById('tab-picker-portal');
            if (menuElement && menuElement.contains(e.target)) {
                return;
            }
            setShowNotePicker(false);
        };

        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, [showNotePicker]);

    // Auto-focus search input when picker opens
    useEffect(() => {
        if (showNotePicker && searchInputRef.current) {
            setTimeout(() => searchInputRef.current.focus(), 50);
        } else {
            setSearchQuery('');
        }
    }, [showNotePicker]);

    if (!openTabs || openTabs.length === 0) return null;

    const handleCloseTab = (e, noteId) => {
        e.stopPropagation();
        e.preventDefault();
        closeTab(noteId);
    };

    const handleAuxClick = (e, noteId) => {
        if (e.button === 1) {
            e.preventDefault();
            closeTab(noteId);
        }
    };

    const handlePickerClick = (e) => {
        e.stopPropagation();
        e.preventDefault();

        if (!showNotePicker && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const pickerWidth = 280; // Approximate width including padding/borders
            let left = rect.left;

            // Check if it will overflow the right edge
            if (left + pickerWidth > window.innerWidth - 16) {
                left = window.innerWidth - pickerWidth - 16;
            }

            // Ensure it doesn't overflow the left edge either (unlikely but safe)
            if (left < 16) left = 16;

            setMenuPosition({
                top: rect.bottom + 8,
                left: left
            });
        }
        setShowNotePicker(prev => !prev);
    };

    const handleOpenNote = (noteId) => {
        selectNote(noteId, true);
        setShowNotePicker(false);
    };

    const handleToggleFolder = (folderId) => {
        setExpandedFolders(prev => ({
            ...prev,
            [folderId]: prev[folderId] === false ? true : false
        }));
    };

    const handleContextMenu = (e, noteId) => {
        const menuWidth = 200;
        const menuHeight = 160;
        let x = e.clientX;
        let y = e.clientY;

        // Boundary checks for right edge
        if (x + menuWidth > window.innerWidth - 10) {
            x = window.innerWidth - menuWidth - 10;
        }

        // Boundary checks for bottom edge
        if (y + menuHeight > window.innerHeight - 10) {
            y = window.innerHeight - menuHeight - 10;
        }

        setContextMenu({
            x,
            y,
            noteId
        });
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            const oldIndex = openTabs.indexOf(active.id);
            const newIndex = openTabs.indexOf(over.id);
            reorderTabs(oldIndex, newIndex);
        }
    };

    // Filtra árvore baseado na busca
    const filterTree = (nodeId) => {
        const note = notes[nodeId];
        if (!note) return null;

        const matchesQuery = note.title.toLowerCase().includes(searchQuery.toLowerCase());

        if (note.type === 'folder' && note.children) {
            const matchedChildren = note.children.map(filterTree).filter(child => child !== null);
            if (matchedChildren.length > 0 || matchesQuery) {
                return { ...note, matchedChildren };
            }
        } else if (matchesQuery) {
            return note;
        }

        return null;
    };

    const filteredRootChildren = useMemo(() => {
        if (!searchQuery) return notes['root']?.children || [];

        return (notes['root']?.children || [])
            .map(filterTree)
            .filter(node => node !== null)
            .map(node => node.id || node);
    }, [searchQuery, notes]);

    return (
        <div className={`tab-bar glass-extreme ${!isSidebarOpen ? 'sidebar-closed' : ''}`}>
            {/* Sidebar Toggle */}
            <button
                onClick={onToggleSidebar}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    flexShrink: 0
                }}
                title={isSidebarOpen ? 'Fechar Sidebar' : 'Abrir Sidebar'}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                </svg>
            </button>

            <div className="tab-bar-divider" />

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <div
                    ref={scrollRef}
                    className="tab-bar-scroll"
                    onWheel={handleWheel}
                >
                    <SortableContext
                        items={openTabs}
                        strategy={horizontalListSortingStrategy}
                    >
                        {openTabs.map((noteId) => {
                            const note = notes[noteId];
                            if (!note) return null;
                            return (
                                <SortableTabItem
                                    key={noteId}
                                    id={noteId}
                                    note={note}
                                    isActive={noteId === activeNoteId}
                                    onSelect={selectNote}
                                    onClose={handleCloseTab}
                                    onAuxClick={handleAuxClick}
                                    onRename={updateNoteTitle}
                                    onContextMenu={handleContextMenu}
                                />
                            );
                        })}
                    </SortableContext>

                    <button
                        ref={buttonRef}
                        className={`tab-add-btn liquid-button ${showNotePicker ? 'active' : ''}`}
                        onClick={handlePickerClick}
                        title="Abrir nota em nova aba"
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginLeft: '8px',
                            border: '1px dashed var(--glass-border)',
                            background: showNotePicker ? 'var(--accent-color-transparent)' : 'transparent',
                            color: showNotePicker ? 'var(--accent-color)' : 'var(--text-secondary)'
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                    </button>
                </div>
            </DndContext>

            {/* Toolbar integrada na TabBar */}
            <div style={{
                display: 'flex',
                gap: '6px',
                marginLeft: '12px',
                paddingRight: '0',
                alignItems: 'center',
                flexShrink: 0
            }}>
                {/* Tag Button */}
                <div style={{ position: 'relative' }}>
                    <button
                        className="liquid-button"
                        onClick={() => setShowTagPopover(prev => !prev)}
                        style={{
                            background: showTagPopover ? 'var(--accent-color-transparent)' : 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid ' + (showTagPopover ? 'var(--accent-glow)' : 'var(--glass-border)'),
                            borderRadius: '10px',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: showTagPopover ? 'var(--accent-color)' : 'var(--text-secondary)',
                            transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        }}
                        title="Gerenciar Tags"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                        </svg>
                    </button>

                    {showTagPopover && (
                        <TagPopoverContent onClose={() => setShowTagPopover(false)} />
                    )}
                </div>

                {/* Minimap Toggle Button */}
                <button
                    className="liquid-button"
                    onClick={() => setIsMiniMapEnabled(prev => !prev)}
                    style={{
                        background: isMiniMapEnabled ? 'var(--accent-color-transparent)' : 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid ' + (isMiniMapEnabled ? 'var(--accent-glow)' : 'var(--glass-border)'),
                        borderRadius: '10px',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: isMiniMapEnabled ? 'var(--accent-color)' : 'var(--text-secondary)',
                        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                    title={isMiniMapEnabled ? "Ocultar Minimapa" : "Mostrar Minimapa"}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M15 3v18" />
                        <path d={isMiniMapEnabled ? "m10 9-3 3 3 3" : "m7 9 3 3-3 3"} />
                    </svg>
                </button>
            </div>

            {contextMenu && (
                <TabContextMenu
                    {...contextMenu}
                    onClose={() => setContextMenu(null)}
                    onCloseTab={(id) => closeTab(id)}
                    onCloseOthers={closeOtherTabs}
                    onCloseToRight={closeTabsToRight}
                />
            )}

            {showNotePicker && createPortal(
                <div
                    id="tab-picker-portal"
                    className="tab-note-picker"
                    style={{
                        position: 'fixed',
                        top: menuPosition.top,
                        left: menuPosition.left,
                        zIndex: 2147483647
                    }}
                >
                    <div className="tab-note-picker-search">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Buscar nota..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="tab-note-picker-tree">
                        {filteredRootChildren.length > 0 ? (
                            filteredRootChildren.map(childId => (
                                <PickerTreeNode
                                    key={childId}
                                    nodeId={childId}
                                    level={0}
                                    notes={notes}
                                    openTabs={openTabs}
                                    onSelect={handleOpenNote}
                                    expandedFolders={expandedFolders}
                                    onToggleFolder={handleToggleFolder}
                                />
                            ))
                        ) : (
                            <div className="tab-note-picker-empty">
                                Nenhuma nota encontrada
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default TabBar;
