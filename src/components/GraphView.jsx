import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    MarkerType,
    ReactFlowProvider,
    useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useNotes } from '../contexts/NotesContext';
import { LayoutGrid, RefreshCw, Hash, Search, ChevronDown, Check } from 'lucide-react';
import NoteNode from './graph/NoteNode';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, forceX, forceY } from 'd3-force';

const nodeTypes = {
    noteNode: NoteNode,
};

// Sub-component to access useReactFlow hook
const GraphFlowContent = ({
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onNodeClick,
    onNodeMouseEnter,
    onNodeMouseLeave,
    searchQuery,
    selectedTags,
    onNodeDragStart,
    onNodeDrag,
    onNodeDragStop
}) => {
    const { fitView } = useReactFlow();
    const { activeNoteId } = useNotes();
    const lastFocusKey = useRef('');
    const hasFocusedActive = useRef(false);

    // Initial focus on active note
    useEffect(() => {
        if (!searchQuery && selectedTags.length === 0 && activeNoteId && !hasFocusedActive.current) {
            const activeNode = nodes.find(n => n.id === activeNoteId.toString());
            if (activeNode) {
                fitView({ nodes: [activeNode], duration: 1000, padding: 0.8, maxZoom: 1 });
                hasFocusedActive.current = true;
            }
        }
    }, [activeNoteId, nodes, fitView, searchQuery, selectedTags]);

    // Effect to focus on search results or selected tags
    useEffect(() => {
        const hasSearch = searchQuery && searchQuery.length >= 2;
        const hasTags = selectedTags.length > 0;

        if (hasSearch || hasTags) {
            const focusKey = `${searchQuery}-${selectedTags.slice().sort().join(',')}`;
            if (focusKey !== lastFocusKey.current) {
                lastFocusKey.current = focusKey;
                const visibleNodes = nodes.filter(n => !n.data.isDimmed);
                if (visibleNodes.length > 0) {
                    const nodeCount = visibleNodes.length;
                    // Dynamic padding: tighter zoom for fewer nodes
                    const padding = nodeCount <= 3 ? 0.3 : (nodeCount <= 10 ? 0.4 : 0.5);
                    const maxZoom = nodeCount <= 5 ? 1.2 : 0.8;

                    if (nodeCount <= 50) {
                        fitView({ nodes: visibleNodes, duration: 800, padding, maxZoom });
                    }
                }
            }
        } else if (lastFocusKey.current !== '') {
            lastFocusKey.current = '';
        }
    }, [searchQuery, selectedTags, nodes, fitView]);

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onNodeMouseEnter={onNodeMouseEnter}
            onNodeMouseLeave={onNodeMouseLeave}
            onNodeDragStart={onNodeDragStart}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={nodeTypes}
            minZoom={0.05}
            maxZoom={2}
            onlyRenderVisibleElements={true}
            panOnScroll={false}
            zoomOnPinch={true}
            elementsSelectable={true}
            panOnDrag={[2]} // Right-click panning
            selectionOnDrag={true} // Left-click selection
            selectionMode="partial"
            translateExtent={undefined}
            onContextMenu={(e) => e.preventDefault()}
        >
            <Background color="#6366f1" gap={16} />
            <MiniMap
                position="top-right"
                nodeColor={(node) => {
                    if (node.data.isActive) return '#6366f1';
                    switch (node.data.type) {
                        case 'text': return '#6366f1';
                        case 'canvas': return '#ec4899';
                        case 'mindmap': return '#8b5cf6';
                        case 'code': return '#10b981';
                        case 'folder': return '#f59e0b';
                        default: return '#64748b';
                    }
                }}
                maskColor="rgba(0, 0, 0, 0.4)"
            />
            <Controls position="bottom-right" />
        </ReactFlow>
    );
};

const GraphView = ({ isOpen, onClose }) => {
    const {
        notes,
        activeNoteId,
        selectNote,
        addNote,
        deleteNote,
        updateNoteTitle
    } = useNotes();

    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [selectedTags, setSelectedTags] = useState([]);
    const [showTagsDropdown, setShowTagsDropdown] = useState(false);
    const [hoveredNodeId, setHoveredNodeId] = useState(null);
    const dropdownRef = useRef(null);

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // Store manual positions to persist moves without loops
    const nodePositionsRef = useRef({});

    // Simulation Ref
    const simulationRef = useRef(null);

    // Sync state positions to ref for persistence
    useEffect(() => {
        const positions = {};
        nodes.forEach(n => {
            positions[n.id] = n.position;
        });
        nodePositionsRef.current = { ...nodePositionsRef.current, ...positions };
    }, [nodes]);

    // Normalize
    const normalize = (val) => (val || '').toString().trim().toLowerCase();

    // Handlers
    const onAddChild = useCallback((parentId) => addNote(parentId), [addNote]);
    const onDelete = useCallback((id) => {
        if (window.confirm('Tem certeza que deseja excluir esta nota?')) deleteNote(id);
    }, [deleteNote]);
    const onRename = useCallback((id, newTitle) => updateNoteTitle(id, newTitle), [updateNoteTitle]);
    const onNodeClick = useCallback((event, node) => {
        selectNote(node.id);
        onClose();
    }, [selectNote, onClose]);
    const onNodeMouseEnter = useCallback((event, node) => setHoveredNodeId(node.id), []);
    const onNodeMouseLeave = useCallback(() => setHoveredNodeId(null), []);

    // Unique Tags
    const allUniqueTags = useMemo(() => {
        const tagSet = new Set();
        Object.values(notes || {}).forEach(n => {
            (n.tags || []).forEach(t => {
                const nt = normalize(t);
                if (nt) tagSet.add(nt);
            });
        });
        return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
    }, [notes]);

    // --- FORCE-DIRECTED LAYOUT & CLUSTERING ---

    // Updated Palette (Vibrant & Distinct)
    const CLUSTER_COLORS = [
        '#6366f1', // Indigo
        '#10b981', // Emerald
        '#f59e0b', // Amber
        '#ec4899', // Pink
        '#3b82f6', // Blue
        '#8b5cf6', // Violet
        '#f43f5e', // Rose
        '#14b8a6', // Teal
        '#ef4444', // Red
        '#84cc16'  // Lime
    ];

    const getClusterColor = (index) => CLUSTER_COLORS[index % CLUSTER_COLORS.length];

    const computeLayout = useCallback(() => {
        const notesArray = notes ? Object.values(notes) : [];

        // Visibility Check
        const isNoteVisible = (note) => {
            if (searchQuery.startsWith('#')) {
                const tagSearch = normalize(searchQuery.slice(1));
                if (!tagSearch) return true;
                return (note.tags || []).map(normalize).some(t => t.includes(tagSearch));
            }
            if (searchQuery && !normalize(note.title).includes(normalize(searchQuery))) return false;
            if (filterType !== 'all' && note.type !== filterType) return false;
            if (selectedTags.length > 0) {
                const noteTags = (note.tags || []).map(normalize);
                if (!selectedTags.some(t => noteTags.includes(normalize(t)))) return false;
            }
            return true;
        };

        const visibleNotes = notesArray.filter(isNoteVisible);
        const visibleIds = new Set(visibleNotes.map(n => n.id.toString()));

        // --- MIND MAP HIERARCHY ANALYSIS ---
        const treeInfo = {};
        const roots = visibleNotes.filter(n => {
            const parentId = Object.keys(notes).find(key => notes[key]?.children?.includes(n.id));
            return !parentId || !visibleIds.has(parentId.toString());
        });

        // Pass 1: Recursive Leaf Count (Subtree Size)
        const calculateSubtreeSize = (id) => {
            const children = (notes[id]?.children || []).filter(cid => visibleIds.has(cid.toString()));
            if (children.length === 0) {
                treeInfo[id] = { size: 1 };
                return 1;
            }
            const size = children.reduce((acc, cid) => acc + calculateSubtreeSize(cid), 0);
            treeInfo[id] = { size };
            return size;
        };

        const totalRootSize = roots.reduce((acc, r) => acc + calculateSubtreeSize(r.id), 0);
        const verticalGap = 180; // Space between leaves

        // Pass 2: Recursive Position Assignment (Left-to-Right)
        const nodePositions = {};
        const assignPositions = (id, depth, startY) => {
            const size = treeInfo[id].size;
            const currentY = startY + (size * verticalGap) / 2;
            const currentX = depth * 450;

            nodePositions[id] = { x: currentX, y: currentY - (totalRootSize * verticalGap) / 2, depth };

            let nextY = startY;
            const children = (notes[id]?.children || []).filter(cid => visibleIds.has(cid.toString()));
            children.forEach(cid => {
                assignPositions(cid, depth + 1, nextY);
                nextY += treeInfo[cid].size * verticalGap;
            });
        };

        let currentRootStartIter = 0;
        roots.forEach(r => {
            assignPositions(r.id, 0, currentRootStartIter);
            currentRootStartIter += treeInfo[r.id].size * verticalGap;
        });

        // Create neighbors mapping and deduplicate edges
        const adjacency = {};
        visibleNotes.forEach(n => adjacency[n.id] = []);
        const edgeMap = new Map();

        const addEdge = (source, target, isHierarchy) => {
            if (!source || !target) return;
            const key = [source, target].sort().join('-');
            if (edgeMap.has(key)) {
                if (isHierarchy) edgeMap.get(key).isHierarchy = true;
                return;
            }
            edgeMap.set(key, { source, target, isHierarchy });
            adjacency[source].push(target);
            adjacency[target].push(source);
        };

        // 1. Tag Edges (Cross-links)
        visibleNotes.forEach((note1, i) => {
            visibleNotes.forEach((note2, j) => {
                if (i >= j) return;
                const tags1 = (note1.tags || []).map(normalize);
                const tags2 = (note2.tags || []).map(normalize);
                const sharedTags = tags1.filter(t => tags2.includes(t));
                if (sharedTags.length > 0) {
                    addEdge(note1.id, note2.id, false);
                }
            });
        });

        // 2. Hierarchy Edges (Primary Expansion)
        visibleNotes.forEach(note => {
            const parentId = Object.keys(notes).find(key => notes[key]?.children?.includes(note.id));
            if (parentId && visibleIds.has(parentId.toString())) {
                addEdge(parentId, note.id, true);
            }
        });

        const tempEdges = Array.from(edgeMap.values());

        // Detect Clusters (for coloring)
        const visited = new Set();
        const clusters = {};
        let clusterCount = 0;

        visibleNotes.forEach(note => {
            if (!visited.has(note.id)) {
                const q = [note.id];
                visited.add(note.id);
                clusters[note.id] = clusterCount;
                while (q.length > 0) {
                    const curr = q.shift();
                    const neighbors = adjacency[curr] || [];
                    neighbors.forEach(nid => {
                        if (!visited.has(nid)) {
                            visited.add(nid);
                            clusters[nid] = clusterCount;
                            q.push(nid);
                        }
                    });
                }
                clusterCount++;
            }
        });

        // --- POSITION APPLICATION ---
        const d3Nodes = visibleNotes.map(n => {
            const pos = nodePositions[n.id] || { x: 0, y: 0, depth: 0 };
            const savedPos = nodePositionsRef.current[n.id.toString()];

            return {
                id: n.id.toString(),
                x: savedPos ? savedPos.x : pos.x,
                y: savedPos ? savedPos.y : pos.y,
                fx: savedPos ? savedPos.x : pos.x, // Force pinned in Mind Map style
                fy: savedPos ? savedPos.y : pos.y,
                depth: pos.depth,
                ...n
            };
        });

        const d3Links = tempEdges.map(e => ({
            source: e.source.toString(),
            target: e.target.toString(),
            isHierarchy: e.isHierarchy
        }));

        if (simulationRef.current) simulationRef.current.stop();

        // MIND MAP STABILIZATION (Minimal physics)
        const simulation = forceSimulation(d3Nodes)
            .force("link", forceLink(d3Links).id(d => d.id).distance(d => d.isHierarchy ? 350 : 600).strength(d => d.isHierarchy ? 1 : 0.1))
            .force("collide", forceCollide().radius(140).iterations(3))
            .stop();

        simulation.tick(10); // Just a tiny nudge if needed
        simulationRef.current = simulation;

        // Apply
        const updatedNodes = d3Nodes.map(n => {
            const clusterId = clusters[n.id] || 0;
            const branchColor = getClusterColor(clusterId);
            const connectionCount = (adjacency[n.id] || []).length;

            // PRE-CALCULATE VISIBILITY (Fixes Zoom Reset Race Condition)
            const noteTags = (n.tags || []).map(normalize);
            const isTagHighlighted = selectedTags.length > 0 && selectedTags.some(t => noteTags.includes(normalize(t)));
            const isSearchHighlighted = searchQuery.startsWith('#') && noteTags.some(t => t.includes(normalize(searchQuery.slice(1))));
            const isHighlighted = !!(isTagHighlighted || isSearchHighlighted);
            const isDimmed = (selectedTags.length > 0 && !isTagHighlighted) || (searchQuery.startsWith('#') && !isSearchHighlighted);

            return {
                id: n.id.toString(),
                type: 'noteNode',
                position: { x: n.x, y: n.y },
                data: {
                    title: n.title || 'Sem título',
                    type: n.type || 'text',
                    tags: n.tags || [],
                    isActive: n.id === activeNoteId,
                    connectionCount,
                    branchColor,
                    isHighlighted,
                    isDimmed,
                    scale: 0.9 + Math.min(connectionCount, 10) * 0.05,
                    onAddChild, onDelete, onRename
                },
            };
        });

        const updatedEdges = d3Links.map(e => {
            const sourceId = e.source.id || e.source;
            const targetId = e.target.id || e.target;
            const sourceNode = d3Nodes.find(n => n.id === sourceId.toString());
            const targetNode = d3Nodes.find(n => n.id === targetId.toString());
            const sourceCluster = clusters[sourceNode?.id];
            const targetCluster = clusters[targetNode?.id];

            // ORGANIC SMART ROUTING (Bezier)
            // Calculate relative angle to pick the best handle for a natural curve
            const dx = (targetNode?.x || 0) - (sourceNode?.x || 0);
            const dy = (targetNode?.y || 0) - (sourceNode?.y || 0);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI; // -180 to 180

            const isHierarchy = e.isHierarchy;
            let sourceHandle = 'right-s';
            let targetHandle = 'left';

            // Sector-based handle selection - Refined for straighter hierarchy lines
            if (isHierarchy) {
                // If target is to the right of source, use Right-s -> Left
                if (dx > 0) {
                    sourceHandle = 'right-s'; targetHandle = 'left';
                } else {
                    sourceHandle = 'left-s'; targetHandle = 'right';
                }
            } else {
                if (angle > -45 && angle <= 45) {
                    sourceHandle = 'right-s'; targetHandle = 'left';
                } else if (angle > 45 && angle <= 135) {
                    sourceHandle = 'bottom-s'; targetHandle = 'top';
                } else if (angle > 135 || angle <= -135) {
                    sourceHandle = 'left-s'; targetHandle = 'right';
                } else {
                    sourceHandle = 'top-s'; targetHandle = 'bottom';
                }
            }

            const edgeColor = (sourceCluster === targetCluster) ? getClusterColor(sourceCluster) : 'var(--graph-edge-tag)';

            return {
                id: `edge-${sourceId}-${targetId}`,
                source: sourceId.toString(),
                target: targetId.toString(),
                sourceHandle,
                targetHandle,
                type: 'default', // Bezier for smooth flow
                animated: !isHierarchy,
                style: {
                    stroke: edgeColor,
                    strokeWidth: isHierarchy ? 1.5 : 1,
                    opacity: isHierarchy ? 0.6 : 0.3,
                    zIndex: -1
                },
                markerEnd: {
                    type: MarkerType.Arrow,
                    width: isHierarchy ? 8 : 6,
                    height: isHierarchy ? 8 : 6,
                    color: edgeColor
                }
            };
        });

        setNodes(updatedNodes);
        setEdges(updatedEdges);

    }, [notes, activeNoteId, searchQuery, filterType, selectedTags, onAddChild, onDelete, onRename, setNodes, setEdges]);

    // Initial load and updates when data changes
    useEffect(() => {
        if (isOpen) computeLayout();
        return () => {
            if (simulationRef.current) simulationRef.current.stop();
        };
    }, [isOpen, computeLayout]);

    const handleResetLayout = () => {
        nodePositionsRef.current = {};
        computeLayout(); // Re-run
    };

    // --- DRAG HANDLERS ---
    const onNodeDragStart = (event, node) => { }; // Static
    const onNodeDrag = (event, node) => { };
    const onNodeDragStop = (event, node) => {
        nodePositionsRef.current[node.id] = node.position;
    };

    // 3. Dynamic Highlighting (Hover Only)
    useEffect(() => {
        if (!hoveredNodeId) {
            // Restore opacity for all edges when nothing is hovered
            setEdges(eds => eds.map(edge => ({
                ...edge,
                animated: false,
                style: { ...edge.style, opacity: 0.6, strokeWidth: edge.isHierarchy ? 1.5 : 1 },
                markerEnd: { ...edge.markerEnd, color: edge.style.stroke }
            })));
            return;
        }

        setNodes(nds => nds.map(node => {
            const isHoverHighlighted = hoveredNodeId === node.id || edges.some(e => (e.source === node.id && e.target === hoveredNodeId) || (e.target === node.id && e.source === hoveredNodeId));
            if (node.data.isHoverHighlighted === isHoverHighlighted) return node;

            return {
                ...node,
                data: { ...node.data, isHoverHighlighted }
            };
        }));

        setEdges(eds => eds.map(edge => {
            const isRelatedToHover = edge.source === hoveredNodeId || edge.target === hoveredNodeId;
            if (!isRelatedToHover) return { ...edge, style: { ...edge.style, opacity: 0.1 }, animated: false };

            return {
                ...edge,
                animated: true,
                style: {
                    ...edge.style,
                    stroke: 'var(--accent-color)',
                    strokeWidth: 4,
                    opacity: 1
                },
                markerEnd: {
                    ...edge.markerEnd,
                    color: 'var(--accent-color)'
                }
            };
        }));
    }, [hoveredNodeId, edges.length]);

    const toggleTag = (tag) => {
        setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setShowTagsDropdown(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!isOpen) return null;

    return (
        <ReactFlowProvider>
            <div 
                className="graph-view-overlay" 
                onClick={onClose}
                style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    backdropFilter: 'none' // Remove duplicate blur to focus on container blur
                }}
            >
                <div 
                    className="graph-view-container glass-extreme" 
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        background: 'var(--glass-bg)',
                        backdropFilter: 'blur(var(--glass-blur)) saturate(200%) brightness(1.1)',
                        WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(200%) brightness(1.1)',
                        border: '1px solid var(--glass-border)',
                        borderTopColor: 'var(--glass-border-top)',
                        borderLeftColor: 'var(--glass-border-left)',
                        boxShadow: 'var(--glass-shadow)'
                    }}
                >
                    <div className="graph-view-header" style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-color)' }}>
                        <div className="graph-view-title">
                            <h2 style={{ color: 'var(--text-primary)' }}>🕸️ Graph View</h2>
                            <span className="graph-view-subtitle" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>{nodes.length} notas • {edges.length} conexões</span>
                        </div>
                        <div className="graph-view-actions">
                            <button className="graph-view-action-btn liquid-button" onClick={handleResetLayout} title="Resetar Layout (Física)" style={{ background: 'var(--glass-bg-hover)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}>
                                <RefreshCw size={18} />
                            </button>
                            <button className="graph-view-close liquid-button" onClick={onClose} style={{ background: 'var(--glass-bg-hover)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}>✕</button>
                        </div>
                    </div>

                    <div className="graph-view-controls-bar" style={{ background: 'rgba(255, 255, 255, 0.01)', borderBottom: '1px solid var(--border-color)' }}>
                        <div className="graph-controls-group search" style={{ background: 'var(--glass-bg-hover)', border: '1px solid var(--glass-border)' }}>
                            <Search className="control-icon" size={16} style={{ color: 'var(--accent-color)' }} />
                            <input
                                type="text"
                                className="graph-view-search-input"
                                placeholder="Buscar título ou #tag..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ color: 'var(--text-primary)' }}
                            />
                        </div>

                        <div className="graph-controls-group tags" ref={dropdownRef}>
                            <button className={`graph-control-btn liquid-button ${selectedTags.length > 0 ? 'active' : ''}`} onClick={() => setShowTagsDropdown(!showTagsDropdown)} style={{ background: 'var(--glass-bg-hover)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}>
                                <Hash size={16} />
                                <span>Tags {selectedTags.length > 0 && `(${selectedTags.length})`}</span>
                                <ChevronDown size={14} className={showTagsDropdown ? 'rotate' : ''} />
                            </button>
                            {showTagsDropdown && (
                                <div className="graph-tags-dropdown glass-extreme" style={{ background: 'var(--glass-bg-floating)', backdropFilter: 'blur(32px)' }}>
                                    {allUniqueTags.length > 0 ? (
                                        allUniqueTags.map(tag => (
                                            <div key={tag} className={`tag-dropdown-item liquid-item ${selectedTags.includes(tag) ? 'selected' : ''}`} onClick={() => toggleTag(tag)} style={{ color: 'var(--text-primary)' }}>
                                                <div className="tag-checkbox" style={{ borderColor: 'var(--glass-border)' }}>{selectedTags.includes(tag) && <Check size={12} />}</div>
                                                <span>#{tag}</span>
                                            </div>
                                        ))
                                    ) : <div className="tag-dropdown-empty" style={{ color: 'var(--text-secondary)' }}>Nenhuma tag cadastrada</div>}
                                </div>
                            )}
                        </div>

                        <div className="graph-controls-group type">
                            <LayoutGrid className="control-icon" size={16} style={{ color: 'var(--accent-color)' }} />
                            <select className="graph-view-type-select" value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ background: 'var(--glass-bg-hover)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}>
                                <option value="all">Todos os Tipos</option>
                                <option value="text">📝 Texto</option>
                                <option value="canvas">🎨 Canvas</option>
                                <option value="mindmap">🧠 Mindmap</option>
                                <option value="code">💻 Código</option>
                                <option value="folder">📁 Pastas</option>
                            </select>
                        </div>
                    </div>

                    <div className="graph-view-canvas">
                        <GraphFlowContent
                            nodes={nodes} edges={edges}
                            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                            onNodeClick={onNodeClick} onNodeMouseEnter={onNodeMouseEnter} onNodeMouseLeave={onNodeMouseLeave}
                            onNodeDragStart={onNodeDragStart}
                            onNodeDrag={onNodeDrag}
                            onNodeDragStop={onNodeDragStop}
                            searchQuery={searchQuery} selectedTags={selectedTags}
                        />
                    </div>

                    <div className="graph-view-footer-legend" style={{ background: 'rgba(255, 255, 255, 0.02)', borderTop: '1px solid var(--border-color)' }}>
                        <div className="legend-dots">
                            <div className="legend-item" style={{ color: 'var(--text-primary)' }}><span className="dot text"></span> Texto</div>
                            <div className="legend-item" style={{ color: 'var(--text-primary)' }}><span className="dot canvas"></span> Canvas</div>
                            <div className="legend-item" style={{ color: 'var(--text-primary)' }}><span className="dot mindmap"></span> Mindmap</div>
                            <div className="legend-item" style={{ color: 'var(--text-primary)' }}><span className="dot code"></span> Código</div>
                            <div className="legend-item" style={{ color: 'var(--text-primary)' }}><span className="dot folder"></span> Pastas</div>
                        </div>
                        <div className="legend-info" style={{ color: 'var(--text-secondary)' }}>
                            Arraste para fixar • Layout Híbrido • Duplo clique para abrir
                        </div>
                    </div>
                </div>
            </div>
        </ReactFlowProvider>
    );
};

export default GraphView;
