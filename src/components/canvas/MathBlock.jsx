import React, { useRef, useEffect, useState } from 'react';
import { MathService } from '../../services/MathService';
import { quickMathAction } from '../../services/AIService';
import BlockWrapper from './BlockWrapper';
import { Zap, ListChecks, BarChart3, Loader2 } from 'lucide-react';

const MathBlock = ({ block, updateBlock, removeBlock, activeTool, isDarkMode, onInteract, saveHistory, isEditing, setEditing, onPlot, onSolve, onSteps, apiKey, isDragging, canvasScale, canvasPan }) => {
    const containerRef = useRef(null);
    const cardRef = useRef(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const renderMath = () => {
            if (!isEditing && containerRef.current && window.katex) {
                try {
                    const cleanContent = (block.content || '\\dots').replace(/\$\$/g, '').trim();
                    window.katex.render(cleanContent, containerRef.current, {
                        throwOnError: false,
                        displayMode: false,
                        output: 'html'
                    });
                } catch (e) {
                    console.error("Katex Error:", e);
                    containerRef.current.innerText = "Erro LaTeX";
                }
            }
        };
        renderMath();
        const timer = setTimeout(renderMath, 50);
        return () => clearTimeout(timer);
    }, [block.content, isEditing]);


    const handleSolve = async () => {
        if (!apiKey) return alert("Configure a API Key para resolver.");
        setIsProcessing(true);
        try {
            const res = await quickMathAction(apiKey, 'solve', block.content);
            if (onSolve && res) onSolve(res);
        } catch (e) {
            console.error("Solve Error:", e);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSteps = async () => {
        if (!apiKey) return alert("Configure a API Key para ver os passos.");
        setIsProcessing(true);
        try {
            const res = await quickMathAction(apiKey, 'steps', block.content);
            if (!res || typeof res !== 'string') throw new Error("Resposta inválida da IA.");
            const lines = res.split('\n').filter(l => l.trim());
            const stepsArray = lines.map(line => {
                const parts = line.split(':');
                if (parts.length > 1) return { label: parts[0].trim(), expr: parts.slice(1).join(':').trim() };
                return { label: 'Passo', expr: line.trim() };
            });
            if (onSteps) onSteps(stepsArray);
        } catch (e) {
            console.error("Steps Error:", e);
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePlotRequest = () => {
        if (!onPlot) return;
        const mathExpr = MathService.latexToMathJS(block.content);
        onPlot(mathExpr);
    };

    const handleContentClick = (e) => {
        if (!e.target.closest('.block-header')) {
            e.stopPropagation();
            // Pequeno delay para garantir que o onPointerDown global do canvas já executou
            setTimeout(() => setEditing(true), 10);
        }
    };

    const dotColor = block.color === 'amber' ? '#f59e0b' : (block.color === 'cyan' ? '#06b6d4' : '#f59e0b');

    // Refactored Header Actions with Tailwind
    const headerActions = (
        <div className="flex items-center gap-1">
            <button
                disabled={isProcessing}
                onClick={handleSolve}
                className="p-1.5 rounded-lg bg-[var(--glass-surface)] text-[var(--text-primary)] opacity-50 hover:opacity-100 hover:text-white active:scale-95 transition-all duration-300 disabled:opacity-50 liquid-button"
                title="Resolver com AI"
            >
                {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
            </button>
            <button
                disabled={isProcessing}
                onClick={handleSteps}
                className="p-1.5 rounded-lg bg-[var(--glass-surface)] text-[var(--text-primary)] opacity-50 hover:opacity-100 hover:text-white active:scale-95 transition-all duration-300 disabled:opacity-50 liquid-button"
                title="Ver Passos"
            >
                {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <ListChecks size={12} />}
            </button>
            <button
                onClick={handlePlotRequest}
                className="p-1.5 rounded-lg bg-[var(--glass-surface)] text-[var(--text-primary)] opacity-50 hover:opacity-100 hover:text-white active:scale-95 transition-all duration-300 liquid-button"
                title="Plotar Gráfico"
            >
                <BarChart3 size={12} />
            </button>
        </div>
    );

    return (
        <BlockWrapper
            ref={cardRef}
            block={block}
            title="Expressão LaTeX"
            color={dotColor}
            isEditing={isEditing}
            isDragging={isDragging}
            isDarkMode={isDarkMode}
            onClose={removeBlock}
            onInteract={(id, e) => {
                if (e.target.closest('.block-header')) {
                    onInteract && onInteract(id, e);
                } else {
                    handleContentClick(e);
                }
            }}
            onRename={(id, name) => updateBlock(id, { customTitle: name })}
            updateBlock={updateBlock}
            headerActions={headerActions}
            canvasScale={canvasScale}
            canvasPan={canvasPan}
            className="max-w-[800px]"
        >
            <div className="flex items-center justify-center p-8 min-h-[100px] overflow-hidden">
                {isEditing ?
                    <textarea
                        autoFocus
                        className="no-interact bg-transparent border-none text-[var(--text-primary)] text-xl font-mono text-center outline-none resize-none w-full animate-in zoom-in-95 duration-300 pointer-events-auto"
                        value={block.content}
                        onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                        onBlur={() => { setEditing(false); if (saveHistory) saveHistory(); }}
                        onPointerDown={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                        onClick={e => e.stopPropagation()}
                        placeholder="Ex: E = mc^2"
                        rows={2}
                    />
                    :
                    <div
                        ref={containerRef}
                        onClick={handleContentClick}
                        className="text-[var(--text-primary)] text-3xl font-light text-center w-full animate-in fade-in zoom-in-95 duration-300 cursor-text hover:scale-[1.02] transition-transform"
                    />
                }
            </div>

            {/* KaTeX Support - Keep font sizes consistent */}
            <style>{`.katex { font-size: 1.2em !important; color: var(--text-primary) !important; }`}</style>
        </BlockWrapper>
    );
};

export default MathBlock;
