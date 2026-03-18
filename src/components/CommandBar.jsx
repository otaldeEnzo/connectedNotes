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
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 99999,
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '10vh'
        }} onMouseDown={onClose}>
            <div style={{
                width: '600px', maxWidth: '90%', maxHeight: '60vh',
                backgroundColor: '#1e293b', // Force Slate 800 solid color
                boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.1), 0 20px 25px -5px rgba(0, 0, 0, 0.5)', // Brighter border
                border: '1px solid #475569', // Slate 600 border
                borderRadius: '16px',
                overflow: 'hidden', display: 'flex', flexDirection: 'column'
            }} onMouseDown={e => e.stopPropagation()}>

                {/* Header / Input */}
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleListKeyDown}
                        placeholder="Pesquisar notas, conteúdo ou tags (Ctrl+F)..."
                        style={{
                            flex: 1, background: 'transparent', border: 'none', outline: 'none',
                            fontSize: '18px', color: 'var(--text-primary)'
                        }}
                    />
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>Esc</div>
                </div>

                {/* Results List */}
                <div style={{ overflowY: 'auto', padding: '8px' }}>
                    {results.length === 0 && query.trim() !== '' && (
                        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            Nenhuma nota encontrada.
                        </div>
                    )}
                    {results.length === 0 && query.trim() === '' && (
                        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            Digite para pesquisar...
                        </div>
                    )}

                    {results.map((item, index) => (
                        <div
                            key={item.id}
                            onMouseEnter={() => setSelectedIndex(index)}
                            onClick={() => handleSelect(item.id)}
                            style={{
                                padding: '12px 16px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                backgroundColor: index === selectedIndex ? 'var(--accent-color)' : 'transparent',
                                color: index === selectedIndex ? 'white' : 'var(--text-primary)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div style={{ fontWeight: 500 }}>{item.title}</div>
                                {item.matchType !== 'Title' && (
                                    <div style={{ fontSize: '12px', opacity: 0.8, display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <span style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: 'bold' }}>{item.matchType}</span>
                                        <span>&bull;</span>
                                        <span>"{item.snippet}"</span>
                                    </div>
                                )}
                            </div>
                            <div style={{ fontSize: '12px', opacity: 0.6 }}>{item.type}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CommandBar;
