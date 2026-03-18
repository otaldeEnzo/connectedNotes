import React from 'react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup'; // HTML
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/themes/prism-tomorrow.css'; // Dark Theme

const CodeEditor = ({ note, updateContent, setAiPanel, activeTool, setActiveTool }) => {

    // Auto-insert graph template when "Code" tool is selected
    React.useEffect(() => {
        if (activeTool === 'code' && setActiveTool) {
            const graphTemplate = `
// Plotly Graph Template
const data = [{
  x: [1, 2, 3, 4],
  y: [10, 15, 13, 17],
  type: 'scatter',
  mode: 'lines+markers',
  marker: {color: '#6366f1'}
}];

const layout = {
  title: 'My Data Graph',
  template: 'plotly_dark' 
};
`;
            const currentCode = note.content.code || '';
            updateContent({ code: currentCode + graphTemplate });

            // Reset tool
            setActiveTool('cursor');
        }
    }, [activeTool, setActiveTool, note.content.code, updateContent]);

    const highlightCode = (code) => {
        const lang = note.content.language || 'javascript';
        const grammar = languages[lang] || languages.clike || languages.markup;
        return highlight(code, grammar, lang);
    };

    return (
        <div className="glass-panel" style={{
            margin: '24px',
            height: 'calc(100% - 48px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: '24px',
            background: '#1d1f21', // Matching syntax theme bg usually
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
        }}>
            <div style={{
                padding: '12px 24px',
                background: 'rgba(0,0,0,0.2)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
                <span style={{ color: '#10b981', fontWeight: '600', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                    {note.title}.{
                        {
                            javascript: 'js',
                            python: 'py',
                            cpp: 'cpp',
                            html: 'html',
                            css: 'css',
                            java: 'java',
                            csharp: 'cs',
                            sql: 'sql'
                        }[note.content.language || 'javascript'] || 'txt'
                    }
                </span>
                <select
                    value={note.content.language || 'javascript'}
                    onChange={(e) => updateContent({ language: e.target.value })}
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#94a3b8',
                        fontSize: '0.75rem',
                        padding: '2px 8px'
                    }}
                >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="cpp">C++</option>
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                    <option value="java">Java</option>
                    <option value="csharp">C#</option>
                    <option value="sql">SQL</option>
                </select>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
            >
                <Editor
                    value={note.content.code || ''}
                    onValueChange={code => updateContent({ code })}
                    highlight={highlightCode}
                    padding={10}
                    style={{
                        fontFamily: '"Fira Code", "Courier New", monospace',
                        fontSize: 14,
                        minHeight: '100%',
                        outline: 'none',
                        border: 'none'
                    }}
                    textareaClassName="nodrag"
                />
            </div>
        </div>
    );
};

export default CodeEditor;
