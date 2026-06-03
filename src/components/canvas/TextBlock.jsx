import React, { useRef, useEffect, useCallback, useState } from 'react';
import ReactDOM from 'react-dom';
import { queryGemini, isAiFeatureEnabled } from '../../services/AIService';
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

const TextBlock = ({ block, updateBlock, removeBlock, activeTool, isDarkMode, onInteract, saveHistory, isEditing, setEditing, isDragging, canvasScale, canvasPan, apiKey }) => {
    const toolbarRef = useRef(null);
    const cardRef = useRef(null);

    const [selectionCoords, setSelectionCoords] = useState(null);
    const [selectedText, setSelectedText] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const [showAutocompleteLevels, setShowAutocompleteLevels] = useState(false);

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

    const getSelectionCoords = () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return null;
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return null;
        return {
            x: rect.left + rect.width / 2,
            y: rect.top - 55, // 55px above selection
            left: rect.left,
            top: rect.top
        };
    };

    useEffect(() => {
        const handleSelectionChange = () => {
            if (!editor || !isEditing) return;
            const { from, to } = editor.state.selection;
            if (from === to) {
                setSelectionCoords(null);
                setSelectedText("");
                setShowAutocompleteLevels(false);
                return;
            }
            const text = editor.state.doc.textBetween(from, to, " ");
            setSelectedText(text);

            const coords = getSelectionCoords();
            setSelectionCoords(coords);
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }, [editor, isEditing]);

    const handleAiTextAction = async (actionType) => {
        if (!selectedText.trim()) return;
        setAiLoading(true);
        try {
            let prompt = "";
            if (actionType === 'aprimorar') {
                prompt = `Você é um revisor acadêmico especialista em exatas. Melhore a coesão, estilo e precisão científica do parágrafo abaixo, tornando-o mais profissional e bem redigido. Mantenha os termos matemáticos/físicos intactos. Retorne APENAS o texto revisado final, sem aspas, sem explicações adicionais, sem blocos markdown.\n\nTEXTO:\n${selectedText}`;
            } else if (actionType === 'sintetizar') {
                prompt = `Você é um revisor de artigos científicos. Transforme o parágrafo ou conceito abaixo em tópicos limpos, diretos e objetivos (usando tags HTML como <ul> e <li> para formatação direta). Retorne APENAS a lista em HTML final, sem explicações extras, sem markdown.\n\nTEXTO:\n${selectedText}`;
            } else if (actionType === 'latex') {
                prompt = `Você é um tradutor de LaTeX para exatas. Identifique trechos de raciocínio lógico ou fórmulas matemáticas no texto abaixo e converta-os para equações formatadas em LaTeX (usando delimitadores inline $ ou blocos $$ conforme adequado). Mantenha o texto explicativo ao redor, apenas convertendo a matemática. Retorne APENAS o texto formatado final, sem markdown.\n\nTEXTO:\n${selectedText}`;
            } else if (actionType === 'basico') {
                prompt = `Você é um tutor didático e amigável de exatas e geral. Com base na frase/tópico fornecido abaixo: "${selectedText}"\nEscreva uma explicação didática, simples, de nível BÁSICO. Use analogias intuitivas e exemplos cotidianos para facilitar o entendimento. Formate o texto usando parágrafos simples e listas em tópicos se necessário, usando tags HTML diretas (como <p>, <ul>, <li>). Retorne APENAS a explicação final formatada em HTML limpo, sem explicações adicionais, sem aspas, sem blocos markdown.`;
            } else if (actionType === 'intermediario') {
                prompt = `Você é um professor universitário e didático. Com base na frase/tópico fornecido abaixo: "${selectedText}"\nEscreva uma explicação clara e de nível INTERMEDIÁRIO. Apresente conceitos formais, exemplos práticos com resolução passo a passo e use fórmulas formatadas com LaTeX (delimitadores inline $ ou blocos $$ conforme apropriado). Retorne APENAS a explicação final formatada em HTML limpo, sem explicações adicionais, sem aspas, sem blocos markdown.`;
            } else if (actionType === 'avancado') {
                prompt = `Você é um cientista e matemático extremamente rigoroso. Com base na frase/tópico fornecido abaixo: "${selectedText}"\nEscreva uma explicação profunda de nível AVANÇADO. Apresente formalismo matemático rígido, demonstrações detalhadas e equações complexas formatadas em LaTeX (delimitadores inline $ ou blocos $$). Retorne APENAS a explicação final completa formatada em HTML limpo, sem explicações adicionais, sem aspas, sem blocos markdown.`;
            }

            const response = await queryGemini(apiKey, prompt);

            if (response && !response.startsWith('Erro:')) {
                editor.chain().focus().insertContent(response).run();
            } else {
                alert(response || "Erro ao processar requisição de IA.");
            }
        } catch (e) {
            console.error("AI Text Action Error:", e);
            alert("Erro ao conectar ao Gemini: " + e.message);
        } finally {
            setAiLoading(false);
            setSelectionCoords(null);
            setSelectedText("");
            setShowAutocompleteLevels(false);
        }
    };

    useEffect(() => {
        if (editor) {
            editor.setEditable(isEditing);
            if (isEditing) editor.commands.focus();
        }
    }, [isEditing, editor]);

    const handleSingleClick = (e) => {
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

    const toolBtnClass = (isActive) => `
        p-2 rounded-xl transition-all duration-300 flex items-center justify-center 
        ${isActive ? 'bg-accent text-white' : 'hover:bg-black/5 dark:hover:bg-white/10 text-[var(--text-secondary)] opacity-60 hover:opacity-100'}
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
                if (e && !e.target.closest('.block-header')) {
                    e.stopPropagation();
                    if (setEditing) setEditing(true);
                } else {
                    onInteract && onInteract(id, e);
                }
            }}
            onDoubleClick={(e) => {
                if (setEditing) setEditing(true);
            }}
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
                        className="rich-text-toolbar absolute -top-4 left-1/2 -translate-x-1/2 -translate-y-full glass-extreme flex items-center gap-4 px-6 py-4 rounded-[2.5rem] z-[15000] animate-in fade-in slide-in-from-bottom-4 duration-500 whitespace-nowrap w-max"
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
            <div 
                className={`p-6 pb-8 transition-colors duration-500`}
                onClick={(e) => {
                    if (!isEditing) {
                        e.stopPropagation();
                        if (setEditing) setEditing(true);
                    }
                }}
            >
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

            {selectedText && isEditing && isAiFeatureEnabled('textCopilot') && (
                <div
                    className="glass-extreme absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-2xl whitespace-nowrap animate-in fade-in slide-in-from-bottom-2 duration-300 w-max z-[16000]"
                    style={{
                        top: '-65px',
                        pointerEvents: 'auto',
                        background: 'var(--glass-bg-floating)',
                        backdropFilter: 'blur(32px) saturate(180%) brightness(1.2)',
                        WebkitBackdropFilter: 'blur(32px) saturate(180%) brightness(1.2)',
                        border: '1.5px solid rgba(255, 255, 255, 0.25)',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(139, 92, 246, 0.1)',
                        color: 'white'
                    }}
                    onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                >
                    {aiLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 10px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-color)' }}>
                            <span className="ai-pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-color)', animation: 'pulse 1s infinite' }} />
                            <span>Processando com IA...</span>
                        </div>
                    ) : (
                        <>
                            {!showAutocompleteLevels ? (
                                <>
                                    <button onClick={() => handleAiTextAction('aprimorar')} style={{ background: 'transparent', border: 'none', color: '#f8fafc', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, padding: '6px 10px', borderRadius: '8px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px' }}>✨ Aprimorar Escrita</button>
                                    <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.15)' }} />
                                    <button onClick={() => handleAiTextAction('sintetizar')} style={{ background: 'transparent', border: 'none', color: '#f8fafc', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, padding: '6px 10px', borderRadius: '8px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px' }}>📝 Sintetizar Conceito</button>
                                    <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.15)' }} />
                                    <button onClick={() => handleAiTextAction('latex')} style={{ background: 'transparent', border: 'none', color: '#f8fafc', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, padding: '6px 10px', borderRadius: '8px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px' }}>🧮 Traduzir para LaTeX</button>
                                    <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.15)' }} />
                                    <button onClick={() => setShowAutocompleteLevels(true)} style={{ background: 'transparent', border: 'none', color: '#f8fafc', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, padding: '6px 10px', borderRadius: '8px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px' }}>✍️ Autocompletar</button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setShowAutocompleteLevels(false)} style={{ background: 'transparent', border: 'none', color: '#f8fafc', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, padding: '6px 10px', borderRadius: '8px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px' }}>⬅️ Voltar</button>
                                    <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.15)' }} />
                                    <button onClick={() => handleAiTextAction('basico')} style={{ background: 'transparent', border: 'none', color: '#34d399', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, padding: '6px 10px', borderRadius: '8px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px' }}>🟢 Básico</button>
                                    <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.15)' }} />
                                    <button onClick={() => handleAiTextAction('intermediario')} style={{ background: 'transparent', border: 'none', color: '#fbbf24', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, padding: '6px 10px', borderRadius: '8px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px' }}>🟡 Intermediário</button>
                                    <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.15)' }} />
                                    <button onClick={() => handleAiTextAction('avancado')} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, padding: '6px 10px', borderRadius: '8px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px' }}>🔴 Avançado</button>
                                </>
                            )}
                        </>
                    )}
                </div>
            )}
        </BlockWrapper>
    );
};

export default TextBlock;
