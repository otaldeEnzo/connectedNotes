import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNotes } from '../contexts/NotesContext';

const CommandPalette = ({ isOpen, onClose, onExecuteCommand }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [recentCommands, setRecentCommands] = useState([]);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    const { notes, activeNoteId, createNote, deleteNote, selectNote, openTabs } = useNotes();

    // Command Registry
    const commands = useMemo(() => [
        // === NOTAS ===
        {
            id: 'create-note-text',
            label: 'Criar Nova Nota (Texto)',
            category: 'Notas',
            icon: '📝',
            shortcut: 'Ctrl+N',
            keywords: ['criar', 'nova', 'nota', 'texto', 'new', 'note', 'text'],
            action: () => {
                createNote('text');
                onClose();
            }
        },
        {
            id: 'create-note-canvas',
            label: 'Criar Nova Nota (Canvas)',
            category: 'Notas',
            icon: '🎨',
            keywords: ['criar', 'nova', 'nota', 'canvas', 'desenho', 'new', 'note'],
            action: () => {
                createNote('canvas');
                onClose();
            }
        },
        {
            id: 'create-note-mindmap',
            label: 'Criar Nova Nota (Mindmap)',
            category: 'Notas',
            icon: '🧠',
            keywords: ['criar', 'nova', 'nota', 'mindmap', 'mapa', 'mental', 'new', 'note'],
            action: () => {
                createNote('mindmap');
                onClose();
            }
        },
        {
            id: 'create-note-code',
            label: 'Criar Nova Nota (Código)',
            category: 'Notas',
            icon: '💻',
            keywords: ['criar', 'nova', 'nota', 'code', 'codigo', 'new', 'note'],
            action: () => {
                createNote('code');
                onClose();
            }
        },
        {
            id: 'delete-note',
            label: 'Deletar Nota Atual',
            category: 'Notas',
            icon: '🗑️',
            keywords: ['deletar', 'remover', 'excluir', 'delete', 'remove'],
            action: () => {
                if (activeNoteId && window.confirm('Tem certeza que deseja deletar esta nota?')) {
                    deleteNote(activeNoteId);
                    onClose();
                }
            },
            disabled: !activeNoteId
        },

        // === NAVEGAÇÃO ===
        {
            id: 'search-notes',
            label: 'Buscar Notas...',
            category: 'Navegação',
            icon: '🔍',
            shortcut: 'Ctrl+F',
            keywords: ['buscar', 'procurar', 'search', 'find'],
            action: () => {
                onExecuteCommand?.('open-search');
                onClose();
            }
        },
        {
            id: 'close-tab',
            label: 'Fechar Aba Atual',
            category: 'Navegação',
            icon: '✖️',
            shortcut: 'Ctrl+W',
            keywords: ['fechar', 'aba', 'tab', 'close'],
            action: () => {
                onExecuteCommand?.('close-tab');
                onClose();
            },
            disabled: openTabs?.length <= 1
        },

        // === EDIÇÃO ===
        {
            id: 'undo',
            label: 'Desfazer',
            category: 'Edição',
            icon: '↶',
            shortcut: 'Ctrl+Z',
            keywords: ['desfazer', 'undo', 'voltar'],
            action: () => {
                onExecuteCommand?.('undo');
                onClose();
            }
        },
        {
            id: 'redo',
            label: 'Refazer',
            category: 'Edição',
            icon: '↷',
            shortcut: 'Ctrl+Y',
            keywords: ['refazer', 'redo'],
            action: () => {
                onExecuteCommand?.('redo');
                onClose();
            }
        },
        {
            id: 'select-all',
            label: 'Selecionar Tudo',
            category: 'Edição',
            icon: '⬚',
            shortcut: 'Ctrl+A',
            keywords: ['selecionar', 'tudo', 'select', 'all'],
            action: () => {
                onExecuteCommand?.('select-all');
                onClose();
            }
        },
        {
            id: 'duplicate',
            label: 'Duplicar Seleção',
            category: 'Edição',
            icon: '📋',
            shortcut: 'Ctrl+D',
            keywords: ['duplicar', 'copiar', 'duplicate', 'copy'],
            action: () => {
                onExecuteCommand?.('duplicate');
                onClose();
            }
        },

        // === VISUALIZAÇÃO ===
        {
            id: 'toggle-sidebar',
            label: 'Alternar Sidebar',
            category: 'Visualização',
            icon: '📑',
            keywords: ['sidebar', 'barra', 'lateral', 'toggle'],
            action: () => {
                onExecuteCommand?.('toggle-sidebar');
                onClose();
            }
        },
        {
            id: 'toggle-minimap',
            label: 'Alternar Minimapa',
            category: 'Visualização',
            icon: '🗺️',
            keywords: ['minimap', 'minimapa', 'toggle'],
            action: () => {
                onExecuteCommand?.('toggle-minimap');
                onClose();
            }
        },
        {
            id: 'zoom-in',
            label: 'Aumentar Zoom',
            category: 'Visualização',
            icon: '🔍+',
            shortcut: 'Ctrl++',
            keywords: ['zoom', 'aumentar', 'in'],
            action: () => {
                onExecuteCommand?.('zoom-in');
                onClose();
            }
        },
        {
            id: 'zoom-out',
            label: 'Diminuir Zoom',
            category: 'Visualização',
            icon: '🔍-',
            shortcut: 'Ctrl+-',
            keywords: ['zoom', 'diminuir', 'out'],
            action: () => {
                onExecuteCommand?.('zoom-out');
                onClose();
            }
        },
        {
            id: 'zoom-reset',
            label: 'Resetar Zoom',
            category: 'Visualização',
            icon: '🔍',
            shortcut: 'Ctrl+0',
            keywords: ['zoom', 'reset', 'resetar'],
            action: () => {
                onExecuteCommand?.('zoom-reset');
                onClose();
            }
        },
        {
            id: 'toggle-gradient',
            label: 'Alternar Gradiente de Fundo',
            category: 'Visualização',
            icon: '🌈',
            keywords: ['gradiente', 'fundo', 'background', 'gradient', 'toggle'],
            action: () => {
                onExecuteCommand?.('toggle-gradient');
                onClose();
            }
        },
        {
            id: 'open-graph-view',
            label: 'Abrir Graph View',
            category: 'Visualização',
            icon: '🕸️',
            shortcut: 'Ctrl+G',
            keywords: ['graph', 'grafo', 'visualizar', 'conexões', 'network', 'view'],
            action: () => {
                onExecuteCommand?.('open-graph-view');
                onClose();
            }
        },

        // === CONFIGURAÇÕES ===
        {
            id: 'open-settings',
            label: 'Abrir Configurações',
            category: 'Configurações',
            icon: '⚙️',
            keywords: ['configurações', 'settings', 'config', 'abrir'],
            action: () => {
                onExecuteCommand?.('open-settings');
                onClose();
            }
        },
        {
            id: 'export-data',
            label: 'Exportar Dados',
            category: 'Configurações',
            icon: '📤',
            keywords: ['exportar', 'export', 'backup', 'dados'],
            action: () => {
                onExecuteCommand?.('export-data');
                onClose();
            }
        },
        {
            id: 'import-data',
            label: 'Importar Dados',
            category: 'Configurações',
            icon: '📥',
            keywords: ['importar', 'import', 'restore', 'dados'],
            action: () => {
                onExecuteCommand?.('import-data');
                onClose();
            }
        }
    ], [activeNoteId, createNote, deleteNote, openTabs, onClose, onExecuteCommand]);

    // Fuzzy Search
    const filteredCommands = useMemo(() => {
        if (!searchQuery.trim()) {
            // Show recent commands first, then all commands
            const recent = commands.filter(cmd => recentCommands.includes(cmd.id));
            const others = commands.filter(cmd => !recentCommands.includes(cmd.id));
            return [...recent, ...others];
        }

        const query = searchQuery.toLowerCase();
        return commands.filter(cmd => {
            const labelMatch = cmd.label.toLowerCase().includes(query);
            const keywordMatch = cmd.keywords?.some(kw => kw.toLowerCase().includes(query));
            const categoryMatch = cmd.category.toLowerCase().includes(query);
            return labelMatch || keywordMatch || categoryMatch;
        }).sort((a, b) => {
            // Prioritize label matches over keyword matches
            const aLabelMatch = a.label.toLowerCase().includes(query);
            const bLabelMatch = b.label.toLowerCase().includes(query);
            if (aLabelMatch && !bLabelMatch) return -1;
            if (!aLabelMatch && bLabelMatch) return 1;
            return 0;
        });
    }, [searchQuery, commands, recentCommands]);

    // Group by category
    const groupedCommands = useMemo(() => {
        const groups = {};
        filteredCommands.forEach(cmd => {
            if (!groups[cmd.category]) groups[cmd.category] = [];
            groups[cmd.category].push(cmd);
        });
        return groups;
    }, [filteredCommands]);

    // Reset state when opened
    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Keyboard Navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const cmd = filteredCommands[selectedIndex];
                if (cmd && !cmd.disabled) {
                    executeCommand(cmd);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, filteredCommands, onClose]);

    // Auto-scroll selected item into view
    useEffect(() => {
        if (listRef.current) {
            const selectedElement = listRef.current.querySelector('.command-item.selected');
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [selectedIndex]);

    const executeCommand = (cmd) => {
        if (cmd.disabled) return;

        // Add to recent commands
        setRecentCommands(prev => {
            const updated = [cmd.id, ...prev.filter(id => id !== cmd.id)].slice(0, 5);
            localStorage.setItem('recentCommands', JSON.stringify(updated));
            return updated;
        });

        cmd.action();
    };

    // Load recent commands from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('recentCommands');
        if (stored) {
            try {
                setRecentCommands(JSON.parse(stored));
            } catch (e) {
                console.error('Failed to load recent commands', e);
            }
        }
    }, []);

    if (!isOpen) return null;

    let flatIndex = 0;

    return (
        <div className="command-palette-overlay" onClick={onClose}>
            <div className="command-palette" onClick={(e) => e.stopPropagation()}>
                <div className="command-palette-header">
                    <input
                        ref={inputRef}
                        type="text"
                        className="command-palette-input"
                        placeholder="Digite um comando ou busque..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                    />
                </div>

                <div className="command-list" ref={listRef}>
                    {!searchQuery && recentCommands.length > 0 && (
                        <div className="command-category-header">Recentes</div>
                    )}

                    {Object.entries(groupedCommands).map(([category, cmds]) => (
                        <div key={category} className="command-category">
                            {searchQuery && <div className="command-category-header">{category}</div>}
                            {cmds.map((cmd) => {
                                const currentIndex = flatIndex++;
                                const isSelected = currentIndex === selectedIndex;

                                return (
                                    <div
                                        key={cmd.id}
                                        className={`command-item ${isSelected ? 'selected' : ''} ${cmd.disabled ? 'disabled' : ''}`}
                                        onClick={() => !cmd.disabled && executeCommand(cmd)}
                                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                                    >
                                        <span className="command-icon">{cmd.icon}</span>
                                        <span className="command-label">{cmd.label}</span>
                                        {cmd.shortcut && (
                                            <span className="command-shortcut">{cmd.shortcut}</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}

                    {filteredCommands.length === 0 && (
                        <div className="command-empty">
                            Nenhum comando encontrado para "{searchQuery}"
                        </div>
                    )}
                </div>

                <div className="command-palette-footer">
                    <span>↑↓ navegar</span>
                    <span>↵ executar</span>
                    <span>esc fechar</span>
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
