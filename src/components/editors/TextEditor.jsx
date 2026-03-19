import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Image from '@tiptap/extension-image';
import { FontSize } from '../../extensions/FontSize';
import { Bold, Italic, Underline as UnderlineIcon, List, CheckSquare, AlignLeft, AlignCenter, AlignRight, AlignJustify, Palette, Highlighter, Image as ImageIcon } from 'lucide-react';

const TextEditor = ({ note, updateContent }) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: 'Escreva algo brilhante...',
            }),
            TextStyle,
            FontFamily,
            FontSize,
            Color,
            Highlight.configure({ 
                multicolor: true,
                colors: [
                    'var(--mj-highlight-yellow)', 
                    'var(--mj-highlight-green)', 
                    'var(--mj-highlight-blue)', 
                    'var(--mj-highlight-pink)', 
                    'var(--mj-highlight-accent)'
                ] 
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Subscript,
            Superscript,
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            Image.configure({
                inline: true,
                allowBase64: true,
            }),
        ],
        editorProps: {
            handlePaste: (view, event) => {
                const items = event.clipboardData?.items;
                if (items) {
                    for (let i = 0; i < items.length; i++) {
                        if (items[i].type.indexOf('image') !== -1) {
                            const file = items[i].getAsFile();
                            const reader = new FileReader();
                            reader.onload = (e) => {
                                const sdk = view.state.schema.nodes.image.create({
                                    src: e.target.result,
                                });
                                const transaction = view.state.tr.replaceSelectionWith(sdk);
                                view.dispatch(transaction);
                            };
                            reader.readAsDataURL(file);
                            return true; // handled
                        }
                    }
                }
                return false;
            },
        },
        content: note.content.markdown || '',
        onUpdate: ({ editor }) => {
            updateContent({ markdown: editor.getHTML() });
        },
    });

    // Sync content if note changes externally
    useEffect(() => {
        if (editor && note.content.markdown !== editor.getHTML()) {
            editor.commands.setContent(note.content.markdown || '', false);
        }
    }, [note.content.markdown, editor]);

    const toolbarBtnStyle = {
        background: 'none',
        border: 'none',
        color: 'var(--text-primary)',
        padding: '8px',
        cursor: 'pointer',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s'
    };

    const fontFamilies = [
        { name: 'Inter', value: 'Inter' },
        { name: 'Arial', value: 'Arial' },
        { name: 'Comic Sans', value: 'Comic Sans MS, Comic Sans' },
        { name: 'Courier New', value: 'Courier New' },
        { name: 'Georgia', value: 'Georgia' },
        { name: 'Impact', value: 'Impact' },
        { name: 'Lucida Console', value: 'Lucida Console' },
        { name: 'Tahoma', value: 'Tahoma' },
        { name: 'Times New Roman', value: 'Times New Roman' },
        { name: 'Trebuchet MS', value: 'Trebuchet MS' },
        { name: 'Verdana', value: 'Verdana' },
    ];

    const fontSizes = ['12px', '14px', '16px', '18px', '20px', '24px', '30px', '36px', '48px', '60px', '72px'];

    if (!editor) return null;

    return (
        <div className="glass-panel" style={{
            margin: '24px',
            height: 'calc(100% - 48px)',
            padding: '40px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            overflowY: 'auto',
            borderRadius: '24px',
            backgroundColor: 'var(--canvas-bg-color)',
            position: 'relative'
        }}>
            <input
                type="text"
                value={note.title}
                readOnly
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '2.5rem',
                    fontWeight: '700',
                    outline: 'none',
                    marginBottom: '10px'
                }}
            />
            <div style={{ height: '1px', background: 'var(--border-color)', width: '100%' }} />

            {/* Office Ribbon Toolbar */}
            <div className="glass-panel" style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                padding: '10px',
                background: 'rgba(var(--bg-rgb), 0.5)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                alignItems: 'center',
                sticky: 'top',
                top: 0,
                zIndex: 10
            }}>
                <select
                    onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
                    style={{ background: 'var(--canvas-bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 8px', fontSize: '14px', outline: 'none', width: '140px' }}
                    value={editor.getAttributes('textStyle').fontFamily || 'Inter'}
                >
                    {fontFamilies.map(font => (
                        <option key={font.value} value={font.value}>{font.name}</option>
                    ))}
                </select>

                <select
                    onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
                    style={{ background: 'var(--canvas-bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 8px', fontSize: '14px', outline: 'none', width: '70px' }}
                    value={editor.getAttributes('textStyle').fontSize || '16px'}
                >
                    {fontSizes.map(size => (
                        <option key={size} value={size}>{size}</option>
                    ))}
                </select>

                <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 4px' }} />

                <button onClick={() => editor.chain().focus().toggleBold().run()} style={{ ...toolbarBtnStyle, backgroundColor: editor.isActive('bold') ? 'var(--accent-color-transparent)' : 'transparent' }}>
                    <Bold size={18} />
                </button>
                <button onClick={() => editor.chain().focus().toggleItalic().run()} style={{ ...toolbarBtnStyle, backgroundColor: editor.isActive('italic') ? 'var(--accent-color-transparent)' : 'transparent' }}>
                    <Italic size={18} />
                </button>
                <button onClick={() => editor.chain().focus().toggleUnderline().run()} style={{ ...toolbarBtnStyle, backgroundColor: editor.isActive('underline') ? 'var(--accent-color-transparent)' : 'transparent' }}>
                    <UnderlineIcon size={18} />
                </button>

                <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 4px' }} />

                <button onClick={() => editor.chain().focus().setTextAlign('left').run()} style={{ ...toolbarBtnStyle, backgroundColor: editor.isActive({ textAlign: 'left' }) ? 'var(--accent-color-transparent)' : 'transparent' }}>
                    <AlignLeft size={18} />
                </button>
                <button onClick={() => editor.chain().focus().setTextAlign('center').run()} style={{ ...toolbarBtnStyle, backgroundColor: editor.isActive({ textAlign: 'center' }) ? 'var(--accent-color-transparent)' : 'transparent' }}>
                    <AlignCenter size={18} />
                </button>
                <button onClick={() => editor.chain().focus().setTextAlign('right').run()} style={{ ...toolbarBtnStyle, backgroundColor: editor.isActive({ textAlign: 'right' }) ? 'var(--accent-color-transparent)' : 'transparent' }}>
                    <AlignRight size={18} />
                </button>
                <button onClick={() => editor.chain().focus().setTextAlign('justify').run()} style={{ ...toolbarBtnStyle, backgroundColor: editor.isActive({ textAlign: 'justify' }) ? 'var(--accent-color-transparent)' : 'transparent' }}>
                    <AlignJustify size={18} />
                </button>

                <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 4px' }} />

                <button onClick={() => editor.chain().focus().toggleBulletList().run()} style={{ ...toolbarBtnStyle, backgroundColor: editor.isActive('bulletList') ? 'var(--accent-color-transparent)' : 'transparent' }}>
                    <List size={18} />
                </button>
                <button onClick={() => editor.chain().focus().toggleTaskList().run()} style={{ ...toolbarBtnStyle, backgroundColor: editor.isActive('taskList') ? 'var(--accent-color-transparent)' : 'transparent' }}>
                    <CheckSquare size={18} />
                </button>
                <button
                    onClick={() => {
                        const url = window.prompt('URL da Imagem:');
                        if (url) editor.chain().focus().setImage({ src: url }).run();
                    }}
                    style={toolbarBtnStyle}
                >
                    <ImageIcon size={18} />
                </button>

                <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 4px' }} />

                {/* Colors */}
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <Palette size={16} style={{ color: editor.getAttributes('textStyle').color ? 'var(--accent-color)' : 'var(--text-secondary)' }} />
                    <div style={{ display: 'flex', gap: '2px' }}>
                        {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ffffff', '#000000'].map(c => (
                            <button
                                key={c}
                                onClick={() => editor.chain().focus().setColor(c).run()}
                                title={c}
                                style={{
                                    width: '16px', height: '16px', borderRadius: '50%', background: c,
                                    border: editor.isActive('textStyle', { color: c }) ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                                    padding: 0, cursor: 'pointer',
                                    transform: editor.isActive('textStyle', { color: c }) ? 'scale(1.2)' : 'scale(1)',
                                    transition: 'all 0.2s ease'
                                }}
                            />
                        ))}
                        <button
                            onClick={() => editor.chain().focus().unsetColor().run()}
                            title="Reset Color"
                            style={{
                                width: '16px', height: '16px', borderRadius: '50%', background: 'transparent',
                                border: '1px solid var(--text-secondary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', fontSize: '10px', color: 'var(--text-secondary)'
                            }}
                        >
                            x
                        </button>
                    </div>
                </div>

                <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 4px' }} />

                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <Highlighter size={16} style={{ color: editor.isActive('highlight') ? 'var(--accent-color)' : 'var(--text-secondary)' }} />
                    <div style={{ display: 'flex', gap: '2px' }}>
                        {[
                            'var(--mj-highlight-yellow)',
                            'var(--mj-highlight-green)',
                            'var(--mj-highlight-blue)',
                            'var(--mj-highlight-pink)',
                            'var(--mj-highlight-accent)'
                        ].map(c => (
                            <button
                                key={c}
                                onClick={() => editor.chain().focus().toggleHighlight({ color: c }).run()}
                                title={c}
                                style={{
                                    width: '16px', height: '16px', borderRadius: '4px', background: c,
                                    border: editor.isActive('highlight', { color: c }) ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                                    padding: 0, cursor: 'pointer',
                                    transform: editor.isActive('highlight', { color: c }) ? 'scale(1.2)' : 'scale(1)',
                                    transition: 'all 0.2s ease'
                                }}
                            />
                        ))}
                        <button
                            onClick={() => editor.chain().focus().unsetHighlight().run()}
                            title="Clear Highlight"
                            style={{
                                width: '16px', height: '16px', borderRadius: '4px', background: 'transparent',
                                border: '1px solid var(--text-secondary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', fontSize: '10px', color: 'var(--text-secondary)'
                            }}
                        >
                            x
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                .ProseMirror {
                    outline: none;
                    flex: 1;
                    color: var(--text-primary);
                    font-size: 1.2rem;
                    line-height: 1.7;
                    font-family: 'Inter', sans-serif;
                }
                .ProseMirror p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: var(--text-secondary);
                    opacity: 0.5;
                    pointer-events: none;
                    height: 0;
                }
                .ProseMirror ul, .ProseMirror ol {
                    padding: 0 1.5rem;
                }
                .ProseMirror ul[data-type="taskList"] {
                    list-style: none;
                    padding: 0;
                }
                .ProseMirror ul[data-type="taskList"] li {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.8rem;
                    margin-bottom: 0.5rem;
                }
                .ProseMirror ul[data-type="taskList"] input[type="checkbox"] {
                    margin-top: 0.45rem;
                    width: 1.1rem;
                    height: 1.1rem;
                    cursor: pointer;
                }
                .ProseMirror img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 12px;
                    margin: 10px 0;
                    border: 1px solid var(--border-color);
                }
                .ProseMirror img.ProseMirror-selectednode {
                    outline: 3px solid var(--accent-color);
                }
            `}</style>

            <EditorContent editor={editor} style={{ flex: 1, display: 'flex', flexDirection: 'column' }} />
        </div>
    );
};


export default TextEditor;
