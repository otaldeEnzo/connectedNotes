import React, { useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
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
import { FontSize } from '../../extensions/FontSize';
import { Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import BlockWrapper from './BlockWrapper';

const TextBlock = ({ block, updateBlock, removeBlock, activeTool, isDarkMode, onInteract, saveHistory, isEditing, setEditing, isDragging, canvasScale, canvasPan }) => {
    const toolbarRef = useRef(null);
    const cardRef = useRef(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({ placeholder: 'Digite algo...', }),
            TextStyle, FontFamily, FontSize, Color,
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
            TextAlign.configure({ types: ['heading', 'paragraph'], }),
            Subscript, Superscript,
            TaskList, TaskItem.configure({ nested: true, }),
        ],
        content: block.content || '',
        editable: isEditing,
        onBlur: ({ editor }) => {
            const html = editor.getHTML();
            if (html !== block.content) {
                updateBlock(block.id, { content: html });
                if (saveHistory) saveHistory();
            }
            if (setEditing) setEditing(false);
        },
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            if (html !== block.content) {
                updateBlock(block.id, { content: html });
            }
        }
    });

    useEffect(() => {
        if (editor) {
            editor.setEditable(isEditing);
            if (isEditing) editor.commands.focus();
        }
    }, [isEditing, editor]);

    const handleSingleClick = (e) => {
        // Se clicar em qualquer lugar que não seja o cabeçalho, entra em edição
        if (e && !e.target.closest(".block-header")) {
            e.stopPropagation();
            if (setEditing) setEditing(true);
        }
    };

    const dotColor = block.color === 'violet' ? '#8b5cf6' : (block.color === 'cyan' ? '#06b6d4' : (block.color === 'amber' ? '#f59e0b' : '#8b5cf6'));

    const highlightColors = {
        yellow: 'var(--mj-highlight-yellow)',
        green: 'var(--mj-highlight-green)',
        blue: 'var(--mj-highlight-blue)',
        pink: 'var(--mj-highlight-pink)',
        accent: 'var(--mj-highlight-accent)',
    };

    const fontSizes = ['12px', '14px', '16px', '18px', '20px', '24px', '32px'];

    // Common Tailwind button class for toolbar
    const toolBtnClass = (isActive) => `
        p-2 rounded-xl transition-all duration-300 flex items-center justify-center 
        ${isActive ? 'bg-accent-color text-white' : 'hover:bg-black/5 dark:hover:bg-white/10 text-[var(--text-secondary)] opacity-60 hover:opacity-100'}
        active:scale-95
    `;

    return (
        <BlockWrapper
            ref={cardRef}
            block={block}
            title="Sua Nota"
            color={dotColor}
            isEditing={isEditing}
            isDragging={isDragging}
            isDarkMode={isDarkMode}
            onClose={removeBlock}
            onInteract={(id, e) => {
                if (e.target.closest('.block-header')) {
                    onInteract && onInteract(id, e);
                } else {
                    handleSingleClick(e);
                }
            }}
            onDoubleClick={handleSingleClick}
            onRename={(id, name) => updateBlock(id, { customTitle: name })}
            updateBlock={updateBlock}
            canvasScale={canvasScale}
            canvasPan={canvasPan}
            className="max-w-[1200px]"
            allowOverflow={true}
            toolbarContent={
                editor && isEditing && (
                    <div
                        ref={toolbarRef}
                        className="rich-text-toolbar absolute -top-4 left-1/2 -translate-x-1/2 -translate-y-full glass-extreme flex items-center gap-4 px-6 py-4 rounded-[2.5rem] z-[15000] animate-in fade-in slide-in-from-bottom-4 duration-500 whitespace-nowrap"
                        style={{
                            pointerEvents: 'auto',
                            background: 'var(--glass-bg-floating)',
                            backdropFilter: 'blur(32px) saturate(180%) brightness(1.1)',
                            WebkitBackdropFilter: 'blur(32px) saturate(180%) brightness(1.1)',
                            border: '1.5px solid var(--glass-border)',
                            boxShadow: 'var(--glass-shadow), 0 20px 50px rgba(0,0,0,0.1)'
                        }}
                        onPointerDown={(e) => { e.stopPropagation(); if (e.target.tagName !== 'SELECT') e.preventDefault(); }}
                        onMouseDown={(e) => { e.stopPropagation(); if (e.target.tagName !== 'SELECT') e.preventDefault(); }}
                    >
                        <div className="flex items-center gap-2 pr-4 border-r border-[var(--glass-border)]">
                            <select
                                className="bg-transparent text-[var(--text-secondary)] text-sm font-medium outline-none cursor-pointer p-1 transition-colors"
                                value={editor.getAttributes('textStyle').fontSize || '16px'}
                                onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
                            >
                                {fontSizes.map(size => (
                                    <option key={size} value={size} className="bg-[var(--glass-bg-floating)] text-[var(--text-primary)]">{size}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-1 pr-4 border-r border-white/10">
                            <button className={toolBtnClass(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()}>
                                <Bold size={16} />
                            </button>
                            <button className={toolBtnClass(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()}>
                                <Italic size={16} />
                            </button>
                            <button className={toolBtnClass(editor.isActive('underline'))} onClick={() => editor.chain().focus().toggleUnderline().run()}>
                                <UnderlineIcon size={16} />
                            </button>
                        </div>

                        <div className="flex items-center gap-1 pr-4 border-r border-white/10">
                            <button className={toolBtnClass(editor.isActive({ textAlign: 'left' }))} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
                                <AlignLeft size={16} />
                            </button>
                            <button className={toolBtnClass(editor.isActive({ textAlign: 'center' }))} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
                                <AlignCenter size={16} />
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            {Object.entries(highlightColors).filter(([k]) => k !== 'default').map(([key, color]) => (
                                <button
                                    key={key}
                                    onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
                                    className={`w-6 h-6 rounded-lg transition-all border-2 ${editor.isActive('highlight', { color }) ? 'border-white scale-110' : 'border-transparent hover:scale-105 opacity-60 hover:opacity-100'}`}
                                    style={{ backgroundColor: color }}
                                    title={`Marca-texto ${key}`}
                                />
                            ))}
                        </div>

                        <div className="flex items-center gap-1.5 ml-2">
                            {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', 'var(--text-primary)'].map(c => (
                                <button
                                    key={c}
                                    onClick={() => editor.chain().focus().setColor(c).run()}
                                    className={`w-4 h-4 rounded-full transition-all border ${editor.isActive('textStyle', { color: c }) ? 'ring-2 ring-white scale-125' : 'hover:scale-110 border-white/20'}`}
                                    style={{ background: c }}
                                />
                            ))}
                        </div>
                    </div>
                )
            }
        >
            <div className={`p-6 pb-8 transition-colors duration-500`}>
                <EditorContent
                    editor={editor}
                    className="ProseMirror-container text-[var(--text-primary)]"
                    style={{
                        height: '100%',
                        cursor: isEditing ? 'text' : 'grab',
                        minHeight: '30px',
                        outline: 'none'
                    }}
                />
            </div>

            <style>{`
                .ProseMirror p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: rgba(255, 255, 255, 0.4);
                    pointer-events: none;
                    height: 0;
                }
                .ProseMirror:focus { outline: none; }
                .ProseMirror { font-size: 1.1rem; line-height: 1.6; }
                .ProseMirror ul, .ProseMirror ol { padding-left: 1.5rem; margin: 1rem 0; }
                .ProseMirror li { margin-bottom: 0.5rem; }
            `}</style>
        </BlockWrapper>
    );
};

export default TextBlock;
