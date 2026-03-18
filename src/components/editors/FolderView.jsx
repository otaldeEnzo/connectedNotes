import React, { useState, useEffect } from 'react';
import { ExportService } from '../../services/ExportService';

const FolderView = ({ note: folder, notes = {}, onOpenNote, setAiPanel, activeTool, setExportStatus, captureNote, runExport }) => {
    const [selectedIds, setSelectedIds] = useState([]);

    // 1. Unificar hierarquia: usar folder.children decodificado do NotesContext
    // Filtrar apenas IDs válidos que existem em 'notes'
    const childNotes = (folder.children || [])
        .map(id => notes[id])
        .filter(n => n !== undefined);

    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleExportFolder = (format) => {
        setIsMenuOpen(false);
        if (runExport) {
            runExport(folder, format);
        } else {
            // Fallback legacy (only if runExport is missing)
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

    // 2. Definir ícones por tipo
    const getIcon = (type) => {
        switch (type) {
            case 'text': return '📝';
            case 'code': return '💻';
            case 'mindmap': return '🧠';
            case 'canvas': return '🎨';
            case 'mermaid': return '📊';
            case 'folder': return '📂';
            case 'pdf': return '📕';
            default: return '📄';
        }
    };

    // 3. Atualizar contexto da IA quando a pasta muda ou notas mudam
    useEffect(() => {
        // Se a ferramenta de IA estiver ativa (ou apenas por estar na pasta), 
        // definimos o contexto global.
        // O activeTool === 'ai-lasso' é o gatilho visual, mas o contexto pode estar disponível sempre.

        const itemsToSend = selectedIds.length > 0
            ? childNotes.filter(n => selectedIds.includes(n.id))
            : childNotes;

        const contextData = {
            id: folder.id + '-' + selectedIds.join(','), // Facilita detecção de mudança
            type: 'folder_context',
            folderId: folder.id,
            folderName: folder.title,
            selectionCount: selectedIds.length,
            items: itemsToSend.map(n => ({
                id: n.id,
                title: n.title,
                type: n.type,
                // Um preview curto do conteúdo para a IA ter noção do que se trata
                preview: n.content?.markdown?.slice(0, 300) || n.content?.code?.slice(0, 300) || n.text || "(no preview)"
            }))
        };

        if (setAiPanel) {
            setAiPanel(prev => ({
                ...prev,
                // Só atualiza se o contexto for diferente ou se for null
                context: contextData
            }));
        }

        // Cleanup: opcionalmente limpar ao sair, mas o NoteWorkspace gerencia isso trocando de editor
    }, [folder.id, childNotes.length, setAiPanel, selectedIds]);
    // ^ Dependências: se adicionar nota, atualiza contexto.

    return (
        <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
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
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                            <path d="m6 9 6 6 6-6" />
                        </svg>
                    </button>

                    {isMenuOpen && (
                        <>
                            <div
                                onClick={() => setIsMenuOpen(false)}
                                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}
                            />
                            <div className="glass-panel" style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '8px',
                                minWidth: '220px',
                                background: 'rgba(30, 30, 35, 0.95)',
                                backdropFilter: 'blur(16px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                padding: '8px',
                                zIndex: 101,
                                animation: 'fadeIn 0.2s ease-out'
                            }}>
                                {[
                                    { id: 'md', label: 'Markdown (.md)', icon: '📝', desc: 'Ideal para textos e código' },
                                    { id: 'png', label: 'Imagens (.png)', icon: '🖼️', desc: 'Captura visual fiel' },
                                    { id: 'pdf', label: 'Documentos (.pdf)', icon: '📕', desc: 'Relatório profissional' },
                                    { id: 'json', label: 'Backup (.json)', icon: '📦', desc: 'Dados brutos/Fidelidade total' },
                                ].map(opt => (
                                    <div
                                        key={opt.id}
                                        onClick={() => handleExportFolder(opt.id)}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        style={{
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'background 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px'
                                        }}
                                    >
                                        <span style={{ fontSize: '1.2rem' }}>{opt.icon}</span>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '14px', fontWeight: '500', color: '#fff' }}>{opt.label}</span>
                                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{opt.desc}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {childNotes.length === 0 ? (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    height: '200px', border: '2px dashed var(--border-color)', borderRadius: '20px',
                    color: 'var(--text-secondary)'
                }}>
                    <span style={{ fontSize: '3rem', opacity: 0.3, marginBottom: '20px' }}>📂</span>
                    <p>Esta pasta está vazia.</p>
                    <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Adicione notas pela barra lateral ou peça à IA para criar algo!</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                    {childNotes.map(note => {
                        const isSelected = selectedIds.includes(note.id);
                        return (
                            <div
                                key={note.id}
                                onClick={(e) => {
                                    if (e.ctrlKey || e.metaKey || e.shiftKey) {
                                        e.stopPropagation();
                                        setSelectedIds(prev =>
                                            prev.includes(note.id)
                                                ? prev.filter(id => id !== note.id)
                                                : [...prev, note.id]
                                        );
                                    } else {
                                        if (selectedIds.length > 0) {
                                            // Se houver seleção, clica limpa a seleção (comportamento padrão de explorer)
                                            setSelectedIds([]);
                                        } else {
                                            onOpenNote(note.id);
                                        }
                                    }
                                }}
                                className="liquid-item"
                                style={{
                                    background: isSelected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)',
                                    borderRadius: '16px',
                                    padding: '20px',
                                    cursor: 'pointer',
                                    border: isSelected ? '2px solid #10b981' : '1px solid transparent',
                                    transition: 'all 0.2s',
                                    display: 'flex', flexDirection: 'column', gap: '12px',
                                    height: '140px',
                                    position: 'relative'
                                }}
                                onMouseEnter={e => {
                                    if (!isSelected) {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                        e.currentTarget.style.transform = 'translateY(-4px)';
                                        e.currentTarget.style.borderColor = 'var(--accent-glow)';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!isSelected) {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                        e.currentTarget.style.transform = 'none';
                                        e.currentTarget.style.borderColor = 'transparent';
                                    }
                                }}
                            >
                                <div style={{ fontSize: '2rem' }}>{getIcon(note.type)}</div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {note.title}
                                    </h3>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                        {new Date(note.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                                {isSelected && <div style={{ position: 'absolute', top: 10, right: 10, color: '#10b981' }}>✅</div>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default FolderView;
