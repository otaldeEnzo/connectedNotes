import React, { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useNotes } from '../../contexts/NotesContext';
import { generateId } from '../canvas/CanvasUtils';

// Helper Functions
const flattenNodes = (node) => {
    if (!node) return [];
    return [node, ...(node.children || []).flatMap(flattenNodes)];
};

const findAndAction = (nodes, targetId, action, payload) => {
    if (!nodes) return [];
    return nodes.reduce((acc, node) => {
        if (node.id === targetId) {
            if (action === 'delete') return acc; // Skip adding this node (delete)
            if (action === 'update') {
                acc.push({ ...node, ...payload });
                return acc;
            }
            if (action === 'addChild') {
                const newChild = { id: generateId(), text: 'Novo Nó', x: node.x + 200, y: node.y, children: [] };
                acc.push({ ...node, children: [...(node.children || []), newChild] });
                return acc;
            }
        }

        // Recursive step
        const newChildren = node.children ? findAndAction(node.children, targetId, action, payload) : [];
        if (node.id !== targetId) {
            acc.push({ ...node, children: newChildren });
        }
        return acc;
    }, []);
};

const MindmapNode = ({ node, onUpdate, onAddChild, onDelete, isRoot, onDragStart, allNotes, onSelectNote, isSelected, setAiPanel, activeTool }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState(node.text);

    useEffect(() => {
        setText(node.text);
    }, [node.text]);

    const colors = [
        { name: 'Root', value: 'var(--accent-gradient)' },
        { name: 'Blue', value: '#3b82f6' },
        { name: 'Green', value: '#10b981' },
        { name: 'Purple', value: '#8b5cf6' },
        { name: 'Orange', value: '#f59e0b' },
        { name: 'Pink', value: '#ec4899' },
        { name: 'Cyan', value: '#06b6d4' }
    ];

    // Recursive component for Note Linking
    const LinkTreeItem = ({ noteId, depth = 0, onSelect, allNotes }) => {
        const n = allNotes[noteId];
        const [isExpanded, setIsExpanded] = useState(false);

        if (!n) return null;

        const hasChildren = n.children && n.children.length > 0;

        // Render logic: 
        // If it's a folder OR has children, we show the expand arrow.
        // We also allow selecting it if it's not strictly a "folder" type (or maybe we allow linking to folders too?)
        // Assuming we link to any note.

        return (
            <div>
                <div
                    className="menu-item"
                    style={{
                        padding: '6px 8px', marginLeft: depth * 12, marginTop: 2,
                        display: 'flex', alignItems: 'center', gap: '6px',
                        borderRadius: '6px', cursor: 'pointer',
                        background: isExpanded ? 'rgba(255,255,255,0.05)' : 'transparent'
                    }}
                >
                    {/* Expander Arrow */}
                    {hasChildren && (
                        <div
                            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                            style={{
                                cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                opacity: 0.7
                            }}
                        >
                            <span style={{ fontSize: '10px', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
                        </div>
                    )}

                    {/* Selectable Title */}
                    <div
                        onClick={() => onSelect(n.id)}
                        style={{
                            flex: 1, display: 'flex', alignItems: 'center', gap: '6px',
                            overflow: 'hidden'
                        }}
                    >
                        <span style={{ fontSize: '12px' }}>
                            {n.type === 'folder' ? '📁' : '📝'}
                        </span>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.85rem' }}>
                            {n.title}
                        </span>
                    </div>
                </div>

                {isExpanded && hasChildren && (
                    <div>
                        {n.children.map(childId => (
                            <LinkTreeItem key={childId} noteId={childId} depth={depth + 1} onSelect={onSelect} allNotes={allNotes} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const handleBlur = () => {
        setIsEditing(false);
        if (text !== node.text) {
            onUpdate(node.id, { text });
        }
    };

    return (
        <div
            onPointerDown={(e) => {
                if (activeTool === 'ai-lasso') {
                    e.stopPropagation();
                    setAiPanel({ visible: true, context: { text: node.text, id: node.id } });
                    return;
                }
                if (e.button === 0 && !isEditing) {
                    onDragStart(node.id, e);
                }
            }}
            style={{
                position: 'absolute',
                left: node.x,
                top: node.y,
                transform: 'translate(-50%, -50%)',
                zIndex: isEditing ? 100 : (isSelected ? 50 : 1),
                touchAction: 'none'
            }}
        >
            <div className={`glass-panel node-item ${isSelected ? 'selected' : ''} ${(node.color || isRoot) ? 'has-color' : ''}`} style={{
                padding: '12px 24px',
                borderRadius: '16px',
                minWidth: '140px',
                textAlign: 'center',
                position: 'relative',
                color: (isRoot || node.color) ? 'white' : 'var(--text-primary)',
                cursor: isEditing ? 'text' : 'grab',
                background: node.color
                    ? (isSelected ? `${node.color}ff` : node.color)
                    : (isRoot ? 'var(--accent-gradient)' : (isSelected ? 'rgba(59, 130, 246, 0.25)' : null)),
                border: isSelected ? '4px solid var(--accent-color)' : (node.color ? `1px solid ${node.color}88` : '1px solid var(--glass-border)'),
                WebkitFontSmoothing: 'antialiased',
                backdropFilter: (isSelected || node.color || isRoot) ? 'none' : 'blur(12px)'
            }}>
                {isEditing ? (
                    <input
                        autoFocus
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onBlur={handleBlur}
                        onPointerDown={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
                        style={{
                            background: 'transparent', border: 'none', color: 'inherit',
                            textAlign: 'center', width: '100%', outline: 'none', fontSize: 'inherit'
                        }}
                    />
                ) : (
                    <div onDoubleClick={() => setIsEditing(true)} style={{ userSelect: 'none' }}>
                        {node.text}
                        {node.linkedNoteId && (
                            <div
                                onClick={(e) => { e.stopPropagation(); onSelectNote(node.linkedNoteId); }}
                                style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer' }}
                            >
                                🔗 {allNotes[node.linkedNoteId]?.title || 'Nota vinculada'}
                            </div>
                        )}
                    </div>
                )}

                {/* Quick Actions */}
                <div className="node-actions" style={{
                    position: 'absolute', top: '-12px', right: '-12px',
                    display: 'flex', gap: '4px', opacity: 0, transition: 'opacity 0.2s'
                }}>
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => onAddChild(node.id)}
                        style={{
                            width: '24px', height: '24px', borderRadius: '50%', border: 'none',
                            background: 'var(--accent-color)', color: 'white', cursor: 'pointer',
                            fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                        }}
                    >+</button>
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); onUpdate(node.id, { _menu: 'link' }); }}
                        style={{
                            width: '24px', height: '24px', borderRadius: '50%', border: 'none',
                            background: '#fbbf24', color: 'black', cursor: 'pointer',
                            fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                        }}
                    >🔗</button>
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); onUpdate(node.id, { _menu: 'color' }); }}
                        style={{
                            width: '24px', height: '24px', borderRadius: '50%', border: 'none',
                            background: '#94a3b8', color: 'white', cursor: 'pointer',
                            fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                        }}
                    >🎨</button>
                    {!isRoot && (
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => onDelete(node.id)}
                            style={{
                                width: '24px', height: '24px', borderRadius: '50%', border: 'none',
                                background: '#ef4444', color: 'white', cursor: 'pointer',
                                fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                            }}
                        >×</button>
                    )}
                </div>

                {/* Color Selector */}
                {node._activeMenu === 'color' && (
                    <div className="glass-panel"
                        onPointerDown={e => e.stopPropagation()}
                        style={{
                            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
                            display: 'flex', gap: '8px', padding: '8px', marginTop: '8px',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                            backdropFilter: 'none',
                            background: 'var(--bg-color)',
                            opacity: 0.95,
                            borderRadius: '12px'
                        }}>
                        {colors.slice(1).map(c => (
                            <div
                                key={c.value}
                                onClick={(e) => { e.stopPropagation(); onUpdate(node.id, { color: c.value, _menu: null }); }}
                                style={{
                                    width: '20px', height: '20px', borderRadius: '50%', background: c.value,
                                    cursor: 'pointer', border: node.color === c.value ? '2px solid white' : 'none'
                                }}
                            />
                        ))}
                        <div
                            onClick={(e) => { e.stopPropagation(); onUpdate(node.id, { color: null, _menu: null }); }}
                            style={{
                                width: '20px', height: '20px', borderRadius: '50%', background: 'var(--glass-bg)',
                                cursor: 'pointer', border: !node.color ? '2px solid white' : '1px solid var(--glass-border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px'
                            }}
                        >✕</div>
                    </div>
                )}

                {/* Note Link Selector */}
                {node._activeMenu === 'link' && (
                    <div className="glass-panel"
                        onPointerDown={e => e.stopPropagation()}
                        style={{
                            position: 'absolute', top: '100%', left: '0', zIndex: 1000,
                            width: '240px', maxHeight: '300px', overflowY: 'auto', padding: '8px',
                            marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '2px',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                            backdropFilter: 'none',
                            background: 'var(--bg-color)',
                            opacity: 0.95,
                            borderRadius: '12px'
                        }}>
                        <LinkTreeItem
                            noteId="root"
                            allNotes={allNotes}
                            onSelect={(noteId) => {
                                onUpdate(node.id, { linkedNoteId: noteId, _menu: null });
                            }}
                        />
                        {node.linkedNoteId && (
                            <button
                                className="liquid-item"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={() => onUpdate(node.id, { linkedNoteId: null, _menu: null })}
                                style={{
                                    padding: '6px 12px', background: 'rgba(239, 68, 68, 0.1)', border: 'none',
                                    color: '#ef4444', fontSize: '0.8rem', textAlign: 'center',
                                    borderRadius: '6px', cursor: 'pointer', marginTop: '8px', width: '100%'
                                }}
                            >
                                Desvincular Nota
                            </button>
                        )}
                    </div>
                )}

                <style>{`
          .node-item { 
              transition: all 0.2s; 
              transform: translateZ(0);
          }
           /* Default bg handled by css for glass effect, inline can override */
           .node-item:not(.has-color) { background: var(--glass-bg); }

          .node-item:not(.has-color):hover {
              /* Solid Background matching theme */
              background: var(--bg-color) !important; 
              box-shadow: 0 8px 30px rgba(0,0,0,0.15);
              /* No scale to prevent blur */
              transform: translateZ(0);
              z-index: 50;
              opacity: 1; /* Force opaque */
          }
          .node-item.selected {
              transform: scale(1.05) translateZ(0);
              box-shadow: 0 0 0 4px var(--accent-color), 0 10px 40px rgba(59, 130, 246, 0.4);
          }
          .node-item:hover .node-actions { opacity: 1 !important; }
          .menu-item { transition: background 0.2s; }
          .menu-item:hover { background: rgba(255, 255, 255, 0.1) !important; }
        `}</style>
            </div>
        </div>
    );
};

const MindmapEditor = forwardRef(({ note, updateContent, scale, panOffset, containerRef, setAiPanel, activeTool }, ref) => {
    const { notes: allNotes, selectNote, saveNoteHistory, undo, redo, activeNoteId } = useNotes();
    const [draggingNodeId, setDraggingNodeId] = useState(null);
    const [selectedNodeIds, setSelectedNodeIds] = useState([]);
    const [selectionRect, setSelectionRect] = useState(null);
    const [isDraggingSelection, setIsDraggingSelection] = useState(false);
    const [isPressed, setIsPressed] = useState(false);

    // PERF: Local state for positions during drag to avoid context updates on every frame
    const [tempPositions, setTempPositions] = useState({});

    // Refs for drag logic
    const dragStartPosRef = useRef(null);
    const initialPositionsRef = useRef({});
    const rafRef = useRef(null);

    const [activeMenu, setActiveMenu] = useState(null);

    const imperativeHandle = {
        getContentBounds: () => {
            if (!note.content.root) return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
            const nodes = flattenNodes(note.content.root);

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            nodes.forEach(n => {
                minX = Math.min(minX, n.x - 120);
                minY = Math.min(minY, n.y - 40);
                maxX = Math.max(maxX, n.x + 120);
                maxY = Math.max(maxY, n.y + 40);
            });
            const padding = 100;
            return {
                minX: minX - padding,
                minY: minY - padding,
                maxX: maxX + padding,
                maxY: maxY + padding,
                width: (maxX - minX) + padding * 2,
                height: (maxY - minY) + padding * 2
            };
        },
        getExportData: () => {
            const bounds = imperativeHandle.getContentBounds();
            return {
                element: containerRef.current,
                bounds,
                allBlocks: flattenNodes(note.content.root).map(n => ({
                    id: n.id,
                    x: n.x,
                    y: n.y,
                    width: 140,
                    height: 50
                }))
            };
        },
        getInfiniteCanvasElement: () => containerRef.current?.children[0]
    };

    useImperativeHandle(ref, () => imperativeHandle, [note.content.root, containerRef]);

    const handleNodeUpdate = (id, data) => {
        if (data._menu !== undefined) {
            if (data._menu === null) setActiveMenu(null);
            else setActiveMenu({ nodeId: id, type: data._menu });

            const { _menu, ...realData } = data;
            if (Object.keys(realData).length > 0) {
                handleUpdate(id, realData);
            }
        } else {
            handleUpdate(id, data);
        }
    };

    const findAndAction = useCallback((nodes, id, action, payload) => {
        const process = (items) => items.map(node => {
            if (node.id === id) {
                if (action === 'update') return { ...node, ...payload };
                if (action === 'add') return { ...node, children: [...(node.children || []), payload] };
            }
            if (node.children) {
                if (action === 'delete') {
                    const hasChild = node.children.some(c => c.id === id);
                    if (hasChild) return { ...node, children: node.children.filter(c => c.id !== id) };
                }
                return { ...node, children: process(node.children) };
            }
            return node;
        });
        return process(nodes);
    }, []);

    const deleteMultiple = useCallback((nodes, ids) => {
        return nodes.filter(node => !ids.includes(node.id)).map(node => {
            if (node.children) {
                return { ...node, children: deleteMultiple(node.children, ids) };
            }
            return node;
        });
    }, []);

    const handleUpdate = (id, data) => {
        const newRoot = findAndAction([note.content.root], id, 'update', data)[0];
        updateContent({ root: newRoot });
    };

    const findNode = useCallback((root, id) => {
        const search = (node) => {
            if (node.id === id) return node;
            if (node.children) {
                for (const child of node.children) {
                    const found = search(child);
                    if (found) return found;
                }
            }
            return null;
        };
        return search(root);
    }, []);

    const handleAddChild = (parentId) => {
        const branchColors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];
        const parent = findNode(note.content.root, parentId);
        let newColor = parent?.color || null;

        if (parentId === 'm-root') {
            const usedColors = parent.children?.map(c => c.color).filter(Boolean) || [];
            const availableColors = branchColors.filter(c => !usedColors.includes(c));
            newColor = availableColors.length > 0 ? availableColors[0] : branchColors[parent.children?.length % branchColors.length];
        }

        const newNode = {
            id: generateId(),
            text: 'Novo Tópico',
            x: (parent?.x || 0) + 200,
            y: (parent?.y || 0) + (parent?.children?.length || 0) * 80,
            color: newColor,
            children: []
        };
        const newRoot = findAndAction([note.content.root], parentId, 'add', newNode)[0];
        updateContent({ root: newRoot });
    };

    const handleDelete = (id) => {
        saveNoteHistory(activeNoteId);
        const newRoot = findAndAction([note.content.root], id, 'delete', null)[0];
        updateContent({ root: newRoot });
        setSelectedNodeIds(prev => prev.filter(sid => sid !== id));
    };

    const handleDeleteMultiple = (ids) => {
        let targets = ids;
        if (targets.includes('m-root')) targets = targets.filter(id => id !== 'm-root');
        if (targets.length === 0) return;

        saveNoteHistory(activeNoteId);
        const newRoot = deleteMultiple([note.content.root], targets)[0];
        updateContent({ root: newRoot });
        setSelectedNodeIds([]);
    };

    // Keyboard handling
    useEffect(() => {
        const handleKeyDown = (e) => {
            const isCtrl = e.ctrlKey || e.metaKey;
            if (isCtrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(activeNoteId); return; }
            if ((isCtrl && e.key === 'y') || (isCtrl && e.shiftKey && e.key === 'z')) { e.preventDefault(); redo(activeNoteId); return; }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
                if (selectedNodeIds.length > 0) handleDeleteMultiple(selectedNodeIds);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedNodeIds, undo, redo, activeNoteId]);

    const handleDragStart = (id, e) => {
        if (e.button !== 0) return;
        e.stopPropagation();

        const isSelected = selectedNodeIds.includes(id);
        const nodesToCapture = isSelected ? selectedNodeIds : [id];

        const starts = {};
        nodesToCapture.forEach(sid => {
            const node = findNode(note.content.root, sid);
            if (node) starts[sid] = { x: node.x, y: node.y };
        });
        initialPositionsRef.current = starts;
        dragStartPosRef.current = { x: e.clientX, y: e.clientY };

        // NOTE: We do NOT capture pointer here immediately to allow DoubleClick to fire.
        // We will capture it in PointerMove once threshold is passed.

        if (!isSelected) {
            setSelectedNodeIds([id]);
        } else if (e.shiftKey) {
            setSelectedNodeIds(prev => prev.filter(sid => sid !== id));
            dragStartPosRef.current = null;
        }
        setIsPressed(true);
    };

    const handleContainerDown = (e) => {
        if (activeMenu) setActiveMenu(null);
        if (e.button !== 0 || draggingNodeId) return;

        // Allow blur if an input is currently focused
        const isInputFocused = document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
        if (!isInputFocused) {
            e.preventDefault();
        }

        const rect = containerRef.current.getBoundingClientRect();
        const startX = (e.clientX - rect.left - panOffset.x) / scale;
        const startY = (e.clientY - rect.top - panOffset.y) / scale;

        setSelectionRect({ startX, startY, currentX: startX, currentY: startY });
        if (!e.shiftKey) setSelectedNodeIds([]);
        setIsPressed(true);
    };

    const handlePointerMove = useCallback((e) => {
        if (selectionRect) {
            const rect = containerRef.current.getBoundingClientRect();
            const currentX = (e.clientX - rect.left - panOffset.x) / scale;
            const currentY = (e.clientY - rect.top - panOffset.y) / scale;
            setSelectionRect(prev => ({ ...prev, currentX, currentY }));
            return;
        }

        if (!dragStartPosRef.current) return;

        const totalDx = (e.clientX - dragStartPosRef.current.x) / scale;
        const totalDy = (e.clientY - dragStartPosRef.current.y) / scale;

        if (!isDraggingSelection) {
            const dist = Math.sqrt(Math.pow(e.clientX - dragStartPosRef.current.x, 2) + Math.pow(e.clientY - dragStartPosRef.current.y, 2));
            if (dist < 5) return;

            // Threshold passed, start dragging and capture pointer
            setIsDraggingSelection(true);
            setDraggingNodeId('multi');
            if (containerRef.current) containerRef.current.setPointerCapture(e.pointerId);
        }

        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
            // Update Temp Positions locally
            const newTemps = { ...tempPositions };
            Object.entries(initialPositionsRef.current).forEach(([id, pos]) => {
                newTemps[id] = {
                    x: pos.x + totalDx,
                    y: pos.y + totalDy
                };
            });
            setTempPositions(newTemps);
        });
    }, [isDraggingSelection, selectionRect, scale, panOffset, tempPositions]);

    const handlePointerUp = useCallback((e) => {
        if (selectionRect) {
            const x1 = Math.min(selectionRect.startX, selectionRect.currentX);
            const y1 = Math.min(selectionRect.startY, selectionRect.currentY);
            const x2 = Math.max(selectionRect.startX, selectionRect.currentX);
            const y2 = Math.max(selectionRect.startY, selectionRect.currentY);
            // ... (selection logic omitted for brevity, logic remains same)
            const nodesInArea = flattenNodes(note.content.root).filter(node => {
                // Use temp pos if available, otherwise node pos
                const nx = tempPositions[node.id]?.x ?? node.x;
                const ny = tempPositions[node.id]?.y ?? node.y;
                return nx >= x1 && nx <= x2 && ny >= y1 && ny <= y2;
            }).map(n => n.id);

            setSelectedNodeIds(prev => e.shiftKey ? [...new Set([...prev, ...nodesInArea])] : nodesInArea);
            setSelectionRect(null);
        }

        if (dragStartPosRef.current) {
            if (isDraggingSelection && selectedNodeIds.length > 0) {
                saveNoteHistory(activeNoteId);
                // COMMIT positions to context
                let newRoot = { ...note.content.root };
                Object.entries(initialPositionsRef.current).forEach(([id, pos]) => {
                    const totalDx = (e.clientX - dragStartPosRef.current.x) / scale;
                    const totalDy = (e.clientY - dragStartPosRef.current.y) / scale;
                    newRoot = findAndAction([newRoot], id, 'update', {
                        x: Math.round(pos.x + totalDx),
                        y: Math.round(pos.y + totalDy)
                    })[0];
                });
                updateContent({ root: newRoot });
            }

            setDraggingNodeId(null);
            setIsDraggingSelection(false);
            setTempPositions({}); // Clear temps
            dragStartPosRef.current = null;
            if (containerRef.current) {
                try { containerRef.current.releasePointerCapture(e.pointerId); } catch (err) { }
            }
        }
        setIsPressed(false);
    }, [selectionRect, draggingNodeId, isDraggingSelection, selectedNodeIds, note.content.root, activeNoteId, tempPositions, scale]);

    useEffect(() => {
        if (isPressed) {
            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
            return () => {
                window.removeEventListener('pointermove', handlePointerMove);
                window.removeEventListener('pointerup', handlePointerUp);
            };
        }
    }, [isPressed, handlePointerMove, handlePointerUp]);

    const flattenNodes = (node) => {
        let result = [node];
        if (node.children) {
            node.children.forEach(child => result = [...result, ...flattenNodes(child)]);
        }
        return result;
    };

    const renderLines = (node) => {
        if (!node.children) return null;
        return node.children.map(child => {
            const startX = tempPositions[node.id]?.x ?? node.x;
            const startY = tempPositions[node.id]?.y ?? node.y;
            const endX = tempPositions[child.id]?.x ?? child.x;
            const endY = tempPositions[child.id]?.y ?? child.y;

            return (
                <React.Fragment key={`line-${child.id}`}>
                    <line
                        x1={startX}
                        y1={startY}
                        x2={endX}
                        y2={endY}
                        stroke={child.color || 'var(--accent-glow)'}
                        strokeWidth="2"
                        strokeOpacity={child.color ? "0.6" : "0.4"}
                    />
                    {renderLines(child)}
                </React.Fragment>
            );
        });
    };

    if (!note.content.root) return null;
    const finalNodes = flattenNodes(note.content.root).map(n => ({
        ...n,
        // Apply temporary positions if dragging
        x: tempPositions[n.id]?.x ?? n.x,
        y: tempPositions[n.id]?.y ?? n.y,
        _activeMenu: (activeMenu?.nodeId === n.id) ? activeMenu.type : null
    }));

    return (
        <div
            onPointerDown={handleContainerDown}
            style={{
                width: '100%', height: '100%', overflow: 'hidden',
                position: 'relative', background: 'transparent',
                cursor: draggingNodeId ? 'grabbing' : 'default',
                userSelect: (draggingNodeId || selectionRect) ? 'none' : 'auto'
            }}
        >
            <div style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
                transformOrigin: '0 0',
                position: 'absolute', top: 0, left: 0
            }}>
                <svg style={{ position: 'absolute', top: 0, left: 0, width: '50000px', height: '50000px', pointerEvents: 'none', overflow: 'visible' }}>
                    {renderLines(note.content.root)}
                </svg>

                {finalNodes.map(node => (
                    <MindmapNode
                        key={node.id}
                        node={node}
                        onUpdate={handleNodeUpdate}
                        onAddChild={handleAddChild}
                        onDelete={handleDelete}
                        isRoot={node.id === 'm-root'}
                        onDragStart={handleDragStart}
                        allNotes={allNotes}
                        onSelectNote={selectNote}
                        isSelected={selectedNodeIds.includes(node.id)}
                        setAiPanel={setAiPanel}
                        activeTool={activeTool}
                    />
                ))}

                {selectionRect && (
                    <div
                        className="selection-box"
                        style={{
                            position: 'absolute',
                            left: Math.min(selectionRect.startX, selectionRect.currentX),
                            top: Math.min(selectionRect.startY, selectionRect.currentY),
                            width: Math.abs(selectionRect.currentX - selectionRect.startX),
                            height: Math.abs(selectionRect.currentY - selectionRect.startY),
                            border: '1px dashed #6366f1',
                            backgroundColor: 'rgba(99, 102, 241, 0.05)',
                            pointerEvents: 'none'
                        }}
                    />
                )}
            </div>
        </div>
    );
});

export default MindmapEditor;
