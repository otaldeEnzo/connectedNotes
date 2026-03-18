import React, { useState, useEffect, useRef } from 'react';
import { ExportService } from '../services/ExportService';
import { useNotes } from '../contexts/NotesContext';

const ContextMenu = ({ x, y, note, onClose, canvasRef, captureNote, runExport }) => {
    const menuRef = useRef(null);
    const [showExportSubmenu, setShowExportSubmenu] = useState(false);
    const submenuTimeoutRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            if (submenuTimeoutRef.current) clearTimeout(submenuTimeoutRef.current);
        };
    }, [onClose]);

    const handleExport = async (format) => {
        if (!note) return;
        console.log(`[ContextMenu] handleExport: format=${format}, noteId=${note.id}, type=${note.type}`);

        onClose();

        if (runExport) {
            await runExport(note, format);
        } else {
            console.error('[ContextMenu] runExport method not provided');
            // Fallback to legacy direct export if runExport is missing
            await ExportService.exportNote(note, format, {});
        }
    };

    const handleMouseEnterExport = () => {
        if (submenuTimeoutRef.current) clearTimeout(submenuTimeoutRef.current);
        setShowExportSubmenu(true);
    };

    const handleMouseLeaveExport = () => {
        submenuTimeoutRef.current = setTimeout(() => {
            setShowExportSubmenu(false);
        }, 150); // 150ms grace period to cross the gap
    };

    const menuStyle = {
        position: 'fixed',
        left: x,
        top: y,
        borderRadius: '16px',
        padding: '10px',
        minWidth: '220px',
        zIndex: 10000,
        animation: 'slideDown 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    };

    const itemStyle = {
        padding: '10px 14px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '0.85rem',
        color: 'var(--text-primary)',
        transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        borderRadius: '10px',
        fontWeight: 500
    };

    const hoverBg = 'rgba(255,255,255,0.08)';

    return (
        <div ref={menuRef} style={menuStyle} className="glass-panel glass-extreme">
            <div
                style={{ position: 'relative' }}
                onMouseEnter={handleMouseEnterExport}
                onMouseLeave={handleMouseLeaveExport}
            >
                <div
                    style={itemStyle}
                    className="liquid-item"
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = hoverBg;
                        e.currentTarget.style.color = 'var(--accent-color)';
                        e.currentTarget.style.transform = 'scale(1.02) translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = showExportSubmenu ? hoverBg : 'transparent';
                        e.currentTarget.style.color = showExportSubmenu ? 'var(--accent-color)' : 'var(--text-primary)';
                        e.currentTarget.style.transform = showExportSubmenu ? 'scale(1.02) translateX(4px)' : 'scale(1) translateX(0)';
                    }}
                >
                    <span style={{ fontSize: '1.2rem' }}>📤</span>
                    <span style={{ fontWeight: 500 }}>Exportar</span>
                    <span style={{ marginLeft: 'auto', opacity: 0.5 }}>▶</span>
                </div>

                {showExportSubmenu && (
                    <div className="glass-panel glass-extreme" style={{
                        position: 'absolute',
                        left: '100%',
                        top: '-8px',
                        borderRadius: '16px',
                        padding: '10px',
                        minWidth: '220px',
                        marginLeft: '8px',
                        zIndex: 10001,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        animation: 'slideDown 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}>
                        <div
                            style={itemStyle}
                            className="liquid-item"
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = hoverBg;
                                e.currentTarget.style.color = 'var(--accent-color)';
                                e.currentTarget.style.transform = 'scale(1.02) translateX(4px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = 'var(--text-primary)';
                                e.currentTarget.style.transform = 'scale(1) translateX(0)';
                            }}
                            onClick={() => handleExport('png')}
                        >
                            <span style={{ fontSize: '1.2rem' }}>🖼️</span> <span style={{ fontWeight: 500 }}>PNG</span>
                        </div>
                        <div
                            style={itemStyle}
                            className="liquid-item"
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = hoverBg;
                                e.currentTarget.style.color = 'var(--accent-color)';
                                e.currentTarget.style.transform = 'scale(1.02) translateX(4px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = 'var(--text-primary)';
                                e.currentTarget.style.transform = 'scale(1) translateX(0)';
                            }}
                            onClick={() => handleExport('pdf')}
                        >
                            <span style={{ fontSize: '1.2rem' }}>📄</span> <span style={{ fontWeight: 500 }}>PDF (A4)</span>
                        </div>
                        <div
                            style={itemStyle}
                            className="liquid-item"
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = hoverBg;
                                e.currentTarget.style.color = 'var(--accent-color)';
                                e.currentTarget.style.transform = 'scale(1.02) translateX(4px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = 'var(--text-primary)';
                                e.currentTarget.style.transform = 'scale(1) translateX(0)';
                            }}
                            onClick={() => handleExport('pdf_digital')}
                        >
                            <span style={{ fontSize: '1.2rem' }}>📱</span> <span style={{ fontWeight: 500 }}>PDF (Digital/Única)</span>
                        </div>
                        <div
                            style={itemStyle}
                            className="liquid-item"
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = hoverBg;
                                e.currentTarget.style.color = 'var(--accent-color)';
                                e.currentTarget.style.transform = 'scale(1.02) translateX(4px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = 'var(--text-primary)';
                                e.currentTarget.style.transform = 'scale(1) translateX(0)';
                            }}
                            onClick={() => handleExport('md')}
                        >
                            <span style={{ fontSize: '1.2rem' }}>📝</span> <span style={{ fontWeight: 500 }}>Markdown</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContextMenu;
