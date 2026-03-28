import React, { useState, useEffect } from 'react';
import { ExportService } from '../../services/ExportService';

const FolderView = ({ note: folder, notes = {}, onOpenNote, setAiPanel, activeTool, setExportStatus, captureNote, runExport }) => {
    const [selectedIds, setSelectedIds] = useState([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // 1. Hierarquia de notas
    const childNotes = (folder.children || [])
        .map(id => notes[id])
        .filter(n => n !== undefined);

    const handleExportFolder = (format) => {
        setIsMenuOpen(false);
        if (runExport) {
            runExport(folder, format);
        } else {
            if (setExportStatus) setExportStatus({ isExporting: true, progress: 0, message: `Iniciando exportação (${format})...` });
            ExportService.exportFolder(folder, notes, {
                format,
                captureCallback: captureNote,
                onProgress: (status) => {
                    if (setExportStatus) setExportStatus({ isExporting: true, ...status });
                }
            }).finally(() => {
                if (setExportStatus) {
                    setTimeout(() => setExportStatus({ isExporting: false, progress: 0, message: '' }), 800);
                }
            });
        }
    };

    // 2. Ícones Modernos
    const getIcon = (type) => {
        const iconStyle = { width: '32px', height: '32px', strokeWidth: '1.5' };
        switch (type) {
            case 'text': return <svg {...iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>;
            case 'code': return <svg {...iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>;
            case 'mindmap': return <svg {...iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"></circle><path d="M12 9V5"></path><path d="M12 19v-4"></path><path d="M15 12h4"></path><path d="M5 12h4"></path></svg>;
            case 'canvas': return <svg {...iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path></svg>;
            case 'mermaid': return <svg {...iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><path d="M10 10l4 4"></path></svg>;
            case 'folder': return <svg {...iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>;
            case 'pdf': return <svg {...iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path></svg>;
            default: return <svg {...iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path></svg>;
        }
    };

    // 3. Contexto da IA
    useEffect(() => {
        const itemsToSend = selectedIds.length > 0
            ? childNotes.filter(n => selectedIds.includes(n.id))
            : childNotes;

        const contextData = {
            id: folder.id + '-' + selectedIds.join(','),
            type: 'folder_context',
            folderId: folder.id,
            folderName: folder.title,
            selectionCount: selectedIds.length,
            items: itemsToSend.map(n => ({
                id: n.id,
                title: n.title,
                type: n.type,
                preview: n.content?.markdown?.slice(0, 300) || "(sem visualização)"
            }))
        };

        if (setAiPanel) setAiPanel(prev => ({ ...prev, context: contextData }));
    }, [folder.id, childNotes.length, selectedIds, setAiPanel]);

    return (
        <div style={{ flex: 1, padding: '80px 40px 40px 40px', overflowY: 'auto' }}>
            <div style={{ marginBottom: '40px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {folder.title}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                        {childNotes.length} itens nesta coleção
                    </p>
                </div>

                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        style={{
                            background: 'rgba(99, 102, 241, 0.15)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            borderRadius: '8px',
                            padding: '8px 16px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            color: 'var(--accent-color)',
                            fontSize: '14px',
                            fontWeight: '600',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Exportar Pasta
                    </button>

                    {isMenuOpen && (
                        <>
                            <div onClick={() => setIsMenuOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }} />
                            <div className="glass-panel" style={{
                                position: 'absolute', top: '100%', right: 0, marginTop: '8px', minWidth: '220px',
                                background: 'rgba(30, 30, 35, 0.8)', backdropFilter: 'blur(16px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.5)', padding: '8px', zIndex: 101
                            }}>
                                {[
                                    { id: 'md', label: 'Markdown (.md)', icon: '📝' },
                                    { id: 'png', label: 'Imagens (.png)', icon: '🖼️' },
                                    { id: 'pdf', label: 'Documentos (.pdf)', icon: '📕' },
                                    { id: 'json', label: 'Backup (.json)', icon: '📦' },
                                ].map(opt => (
                                    <div
                                        key={opt.id}
                                        onClick={() => handleExportFolder(opt.id)}
                                        style={{ padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', color: '#fff' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <span>{opt.icon}</span>
                                        <span>{opt.label}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                {childNotes.map(note => {
                    const isSelected = selectedIds.includes(note.id);
                    return (
                        <div
                            key={note.id}
                            onClick={(e) => {
                                if (e.ctrlKey || e.metaKey || e.shiftKey) {
                                    e.stopPropagation();
                                    setSelectedIds(prev => prev.includes(note.id) ? prev.filter(id => id !== note.id) : [...prev, note.id]);
                                } else {
                                    if (selectedIds.length > 0) setSelectedIds([]);
                                    else onOpenNote(note.id);
                                }
                            }}
                            className={`glass-panel liquid-item ${isSelected ? 'active' : ''}`}
                            style={{
                                background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                                borderRadius: '16px', padding: '24px', cursor: 'pointer',
                                border: isSelected ? '2px solid var(--accent-color)' : '1px solid rgba(255, 255, 255, 0.1)',
                                backdropFilter: 'blur(10px)', transition: 'all 0.3s ease',
                                display: 'flex', flexDirection: 'column', gap: '12px', height: '160px', position: 'relative'
                            }}
                            onMouseEnter={e => {
                                if (!isSelected) {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                }
                            }}
                            onMouseLeave={e => {
                                if (!isSelected) {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                    e.currentTarget.style.transform = 'none';
                                }
                            }}
                        >
                            <div style={{ color: 'var(--accent-color)' }}>{getIcon(note.type)}</div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {note.title}
                                </h3>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    {new Date(note.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                            {isSelected && <div style={{ position: 'absolute', top: 10, right: 10, color: 'var(--accent-color)' }}>✅</div>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FolderView;
