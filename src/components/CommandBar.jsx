import React, { useState, useEffect, useRef } from 'react';
import { useNotes } from '../contexts/NotesContext';

const CommandBar = ({ isOpen, onClose }) => {
    const { notes, selectNote } = useNotes();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);

    // Reset query when opened
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            if (inputRef.current) {
                setTimeout(() => inputRef.current.focus(), 50);
            }
        }
    }, [isOpen]);

    // --- Search Logic (Lightweight - No OCR) ---
    const searchNotes = (term) => {
        if (!term.trim()) return [];

        const lowerTerm = term.toLowerCase();
        const terms = lowerTerm.split(/\s+/).filter(t => t.length > 0);
        const hits = [];

        // Helper: Check if all terms exist in text
        const matchesAll = (text) => {
            if (!text) return false;
            const lowerText = text.toLowerCase();
            return terms.every(t => lowerText.includes(t));
        };

        // First pass: Find matches in existing data
        Object.values(notes).forEach(note => {
            if (note.id === 'root') return;

            let matchType = null;
            let snippet = '';

            // Check for 'tag:' prefix
            const tagSpecificQuery = lowerTerm.startsWith('tag:') ? lowerTerm.replace('tag:', '').trim() : null;

            if (tagSpecificQuery) {
                if (note.tags && note.tags.some(t => t.toLowerCase().includes(tagSpecificQuery))) {
                    matchType = 'Tag';
                    snippet = note.tags.map(t => '#' + t).join(', ');
                }
            } else {
                // 1. Tag Match (Check if any token is a tag match)
                const matchedTag = note.tags?.find(tag =>
                    terms.some(term => {
                        const cleanTerm = term.startsWith('#') ? term.slice(1) : term;
                        return tag.toLowerCase() === cleanTerm.toLowerCase(); // Full match priority
                    })
                ) || note.tags?.find(tag =>
                    terms.some(term => {
                        const cleanTerm = term.startsWith('#') ? term.slice(1) : term;
                        return tag.toLowerCase().includes(cleanTerm.toLowerCase()); // Partial match
                    })
                );

                if (matchedTag) {
                    matchType = 'Tag';
                    snippet = note.tags.map(t => '#' + t).join(', ');
                }
                // 2. Title Match
                else if (matchesAll(note.title)) {
                    matchType = 'Title';
                }
                // 3. Content Match
                else {
                    if (note.type === 'text' && matchesAll(note.content.markdown)) {
                        matchType = 'Content';
                        const idx = note.content.markdown.toLowerCase().indexOf(terms[0]);
                        snippet = note.content.markdown.substring(Math.max(0, idx - 10), idx + 30) + '...';
                    }
                    else if (note.type === 'code' && matchesAll(note.content.code)) {
                        matchType = 'Code';
                        const idx = note.content.code.toLowerCase().indexOf(terms[0]);
                        snippet = note.content.code.substring(Math.max(0, idx - 10), idx + 30) + '...';
                    }
                    else if (note.type === 'canvas') {
                        // Text Blocks
                        const textBlock = note.content.textBlocks?.find(tb => matchesAll(tb.content));
                        if (textBlock) {
                            matchType = 'Canvas Text';
                            snippet = textBlock.content.substring(0, 40) + '...';
                        }
                    }
                    else if (note.type === 'mindmap' && note.content.root) {
                        const findInTree = (node) => {
                            if (matchesAll(node.text)) return node.text;
                            if (node.children) {
                                for (let child of node.children) {
                                    const found = findInTree(child);
                                    if (found) return found;
                                }
                            }
                            return null;
                        };
                        const foundText = findInTree(note.content.root);
                        if (foundText) {
                            matchType = 'Mindmap Node';
                            snippet = foundText;
                        }
                    }
                }
            }

            if (matchType) {
                hits.push({ ...note, matchType, snippet });
            }
        });

        return hits.slice(0, 10);
    };

    // --- Keyboard Listeners (Local) ---
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        setResults(searchNotes(query));
        setSelectedIndex(0);
    }, [query, notes]);

    const handleSelect = (noteId) => {
        selectNote(noteId);
        onClose();
    };

    const handleListKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        }
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        }
        else if (e.key === 'Enter') {
            e.preventDefault();
            if (results[selectedIndex]) {
                handleSelect(results[selectedIndex].id);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="command-bar-overlay" 
            onMouseDown={onClose} 
            style={{
                position: 'fixed', 
                inset: 0, 
                zIndex: 99999,
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'flex-start', 
                paddingTop: '10vh',
                background: 'rgba(0, 0, 0, 0.3)',
            }}
        >
            <div 
                className="command-bar-panel" 
                onMouseDown={e => e.stopPropagation()}
                style={{
                    width: '640px', 
                    maxWidth: '90%', 
                    maxHeight: '70vh',
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(var(--glass-blur)) saturate(200%) brightness(1.1)',
                    WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(200%) brightness(1.1)',
                    border: '1px solid var(--glass-border)',
                    borderTopColor: 'var(--glass-border-top)',
                    borderLeftColor: 'var(--glass-border-left)',
                    borderRadius: '24px',
                    boxShadow: 'var(--glass-shadow)',
                    overflow: 'hidden', 
                    display: 'flex', 
                    flexDirection: 'column',
                    animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
            >
                {/* Header / Input */}
                <div style={{ 
                    padding: '20px', 
                    borderBottom: '1px solid var(--border-color)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '14px',
                    background: 'rgba(255, 255, 255, 0.02)'
                }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="2.5" style={{ opacity: 0.8 }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleListKeyDown}
                        placeholder="Pesquisar notas, conteúdo ou tags (Ctrl+F)..."
                        style={{
                            flex: 1, 
                            background: 'transparent', 
                            border: 'none', 
                            outline: 'none',
                            fontSize: '18px', 
                            color: 'var(--text-primary)',
                            fontWeight: '500'
                        }}
                    />
                    <div style={{ 
                        fontSize: '11px', 
                        color: 'var(--text-secondary)', 
                        background: 'var(--glass-bg-hover)', 
                        padding: '4px 8px', 
                        borderRadius: '6px',
                        border: '1px solid var(--glass-border)',
                        fontWeight: '600',
                        letterSpacing: '0.5px'
                    }}>ESC</div>
                </div>

                {/* Results List */}
                <div style={{ 
                    overflowY: 'auto', 
                    padding: '12px',
                    scrollbarWidth: 'none'
                }}>
                    {results.length === 0 && query.trim() !== '' && (
                        <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-secondary)', opacity: 0.7 }}>
                            Nenhuma nota encontrada para "{query}"
                        </div>
                    )}
                    {results.length === 0 && query.trim() === '' && (
                        <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-secondary)', opacity: 0.7 }}>
                            Comece a digitar para encontrar suas conexões...
                        </div>
                    )}

                    {results.map((item, index) => {
                        const isSelected = index === selectedIndex;
                        return (
                            <div
                                key={item.id}
                                onMouseEnter={() => setSelectedIndex(index)}
                                onClick={() => handleSelect(item.id)}
                                style={{
                                    padding: '14px 18px',
                                    borderRadius: '16px',
                                    cursor: 'pointer',
                                    background: isSelected ? 'var(--accent-gradient)' : 'transparent',
                                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                    boxShadow: isSelected ? '0 8px 20px var(--accent-glow)' : 'none',
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    marginBottom: '4px'
                                }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ 
                                        fontWeight: '600', 
                                        color: isSelected ? 'white' : 'var(--text-primary)',
                                        fontSize: '15px'
                                    }}>{item.title}</div>
                                    {item.matchType !== 'Title' && (
                                        <div style={{ 
                                            fontSize: '12px', 
                                            color: isSelected ? 'white' : 'var(--text-secondary)', 
                                            opacity: 0.8, 
                                            display: 'flex', 
                                            gap: '8px', 
                                            alignItems: 'center' 
                                        }}>
                                            <span style={{ 
                                                textTransform: 'uppercase', 
                                                fontSize: '10px', 
                                                fontWeight: '800',
                                                background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--accent-color-transparent)',
                                                color: isSelected ? 'white' : 'var(--accent-color)',
                                                padding: '1px 5px',
                                                borderRadius: '3px'
                                            }}>{item.matchType}</span>
                                            <span>"{item.snippet}"</span>
                                        </div>
                                    )}
                                </div>
                                <div style={{ 
                                    fontSize: '11px', 
                                    color: isSelected ? 'white' : 'var(--text-secondary)',
                                    opacity: 0.6,
                                    textTransform: 'capitalize',
                                    fontWeight: '500'
                                }}>{item.type}</div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer hints */}
                <div style={{
                    padding: '10px 20px',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    gap: '16px',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    opacity: 0.6,
                    justifyContent: 'center',
                    background: 'rgba(255, 255, 255, 0.01)'
                }}>
                    <span>↑↓ navegar</span>
                    <span>↵ abrir</span>
                </div>
            </div>
        </div>
    );
};

export default CommandBar;
