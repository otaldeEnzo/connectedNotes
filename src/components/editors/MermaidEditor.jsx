import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

const MermaidEditor = ({ note, updateContent, setAiPanel }) => {
    const previewRef = useRef(null);

    useEffect(() => {
        mermaid.initialize({ startOnLoad: true, theme: 'dark' });
    }, []);

    useEffect(() => {
        if (previewRef.current && note.content.code) {
            previewRef.current.innerHTML = `<div class="mermaid">${note.content.code}</div>`;
            mermaid.contentLoaded();
        }
    }, [note.content.code]);

    return (
        <div style={{ display: 'flex', height: '100%', gap: '1px', background: 'var(--glass-border)' }}>
            <div style={{ flex: 1, background: 'var(--bg-color)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', fontSize: '0.8rem', fontWeight: 600 }}>
                    Editor Mermaid
                </div>
                <textarea
                    value={note.content.code || ''}
                    onChange={(e) => updateContent({ code: e.target.value })}
                    style={{
                        flex: 1, background: 'transparent', border: 'none', outline: 'none',
                        padding: '20px', color: 'var(--text-primary)', fontFamily: 'monospace',
                        resize: 'none', fontSize: '0.9rem'
                    }}
                />
            </div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', fontSize: '0.8rem', fontWeight: 600 }}>
                    Preview
                </div>
                <div
                    ref={previewRef}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}
                />
            </div>
        </div>
    );
};


export default MermaidEditor;
