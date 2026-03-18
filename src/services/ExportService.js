import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

/**
 * Helper function to parse CSS color strings into RGB values for jsPDF.
 * Supports hex (#rrggbb, #rgb), rgb(), and rgba() formats.
 */
function parseColorToRGB(colorString) {
    if (!colorString) return { r: 26, g: 26, b: 27 }; // Default dark color

    const str = colorString.trim();

    // Hex format: #rrggbb or #rgb
    if (str.startsWith('#')) {
        let hex = str.slice(1);
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        return {
            r: parseInt(hex.substr(0, 2), 16),
            g: parseInt(hex.substr(2, 2), 16),
            b: parseInt(hex.substr(4, 2), 16)
        };
    }

    // rgb() or rgba() format
    const match = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (match) {
        return {
            r: parseInt(match[1]),
            g: parseInt(match[2]),
            b: parseInt(match[3])
        };
    }

    // Fallback to dark color
    return { r: 26, g: 26, b: 27 };
}

/**
 * Service to handle all export logic for the application.
 * Now supports background inclusion, high-fidelity PDF, and Folder Exports (ZIP).
 */
const LANG_EXTENSIONS = {
    javascript: 'js',
    python: 'py',
    cpp: 'cpp',
    c: 'c',
    html: 'html',
    css: 'css',
    java: 'java',
    csharp: 'cs',
    sql: 'sql',
    typescript: 'ts',
    ruby: 'rb',
    go: 'go',
    rust: 'rs',
    php: 'php',
    swift: 'swift',
    kotlin: 'kt',
    lua: 'lua',
    r: 'r',
    bash: 'sh',
    shell: 'sh',
};

export const ExportService = {
    /**
     * Get file extension for a code note's language.
     */
    _getCodeExtension(note) {
        const lang = note?.content?.language || 'javascript';
        return LANG_EXTENSIONS[lang] || 'txt';
    },

    /**
     * Main entry point for exporting a note in a specific format.
     */
    async exportNote(note, format, options = {}) {
        if (!note) return;
        const fileName = note.title || 'nota-exportada';
        const { onProgress } = options;
        console.log(`[ExportService] exportNote: format=${format}, type=${note.type}, title=${fileName}`);

        switch (format?.toLowerCase()) {
            case 'png':
                return await this._handlePngExport(note, fileName, options);
            case 'pdf':
                return await this._handlePdfExport(note, fileName, options);
            case 'md':
            case 'markdown':
                return this._handleMdExport(note, fileName, options);
            default:
                console.error('[ExportService] Formato não suportado:', format);
                return null;
        }
    },

    /**
     * Helper to get common toPng options
     */
    _getPngOptions(bounds, backgroundStyle) {
        const computedStyle = getComputedStyle(document.body);
        const bgColorStr = computedStyle.getPropertyValue('--canvas-bg-color') || '#1a1a1b';

        // Dynamic Resolution Selection
        // Area > 4M pixels (~2000x2000) starts scaling down for performance
        const area = (bounds.width || 1) * (bounds.height || 1);
        let pixelRatio = 3; // Increased base from 2 to 3
        if (area > 4000000) pixelRatio = 2.5;
        if (area > 8000000) pixelRatio = 2;

        // AGGRESSIVE CAPPING: Notes exceeding 25M pixels
        // are capped to prevent huge files. Target ~25M pixels total.
        if (area > 25000000) {
            pixelRatio = Math.sqrt(25000000 / area);
            console.log(`[ExportService] _getPngOptions: Aggressive Scaling Applied (Ratio: ${pixelRatio.toFixed(2)})`);
        }

        console.log(`[ExportService] _getPngOptions: area=${area}, ratio=${pixelRatio}`);

        const style = {
            transform: `translate(${-bounds.minX}px, ${-bounds.minY}px) scale(1)`,
            transformOrigin: '0 0',
            width: bounds.width + 'px',
            height: bounds.height + 'px',
            backgroundColor: bgColorStr
        };

        if (backgroundStyle) {
            Object.assign(style, backgroundStyle);
            style.backgroundAttachment = 'scroll';
            style.backgroundPosition = `${-bounds.minX}px ${-bounds.minY}px`;
        }

        return {
            width: bounds.width,
            height: bounds.height,
            style: { ...style, fontDisplay: 'none' }, // Merged style to avoid overwriting
            backgroundColor: bgColorStr,
            quality: 0.95,
            pixelRatio: pixelRatio,
            skipFonts: true,
            cacheBust: true,
            imagePlaceholder: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
            filter: (node) => {
                const cls = node?.classList;
                if (!cls) return true;
                return !cls.contains('minimap-container') &&
                    !cls.contains('selection-toolbar') &&
                    !cls.contains('block-handle') &&
                    !cls.contains('export-ignore') &&
                    !cls.contains('context-menu') &&
                    !cls.contains('export-exclude');
            }
        };
    },

    async _handlePngExport(note, fileName, options) {
        console.log('[ExportService] _handlePngExport starting...');
        const { onProgress } = options;
        if (!options.element || !options.bounds) {
            console.warn('[ExportService] PNG Export: missing elements/bounds, skipping high-res flow.');
            alert('Elemento ou limites não encontrados para exportação PNG.');
            return;
        }

        try {
            if (onProgress) onProgress({ progress: 10, message: 'Processando elementos...' });
            const pngOptions = this._getPngOptions(options.bounds, options.backgroundStyle);

            if (onProgress) onProgress({ progress: 30, message: 'Capturando imagem...' });
            const dataUrl = await toPng(options.element, pngOptions);

            if (onProgress) onProgress({ progress: 80, message: 'Preparando download...' });

            if (options.returnResult) {
                return dataUrl;
            }

            this._download(dataUrl, `${fileName}.png`);

            if (onProgress) onProgress({ progress: 100, message: 'Sucesso!' });
            console.log('[ExportService] PNG Export successful.');
        } catch (err) {
            console.error('[ExportService] Erro ao exportar PNG:', err);
            if (onProgress) onProgress({ progress: 0, message: 'Erro na exportação' });
        }
    },

    async _handlePdfExport(note, fileName, options) {
        console.log('[ExportService] _handlePdfExport starting...');
        const isCanvas = note?.type === 'canvas' || note?.type === 'mindmap' || (options.element && options.bounds);
        const safeFileName = (fileName || 'nota').replace(/[\/\\?%*:|"<>]/g, '-');
        const { onProgress } = options;

        if (isCanvas) {
            const { element, bounds, backgroundStyle, format, allBlocks } = options;
            if (!element || !bounds) return;

            try {
                const computedStyle = getComputedStyle(document.body);
                const bgColorStr = computedStyle.getPropertyValue('--canvas-bg-color') || '#1a1a1b';
                const textColorStr = computedStyle.getPropertyValue('--text-primary') || '#ffffff';
                const bgColor = parseColorToRGB(bgColorStr);
                const textColor = parseColorToRGB(textColorStr);

                const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();

                // Safe Margins for Professional Layout
                const TOP_MARGIN_MM = 20;
                const BT_MARGIN_MM = 20;
                const usableHeightMm = pageHeight - TOP_MARGIN_MM - BT_MARGIN_MM;

                const pxToMm = (bounds.width || 1) / pageWidth;
                const safePageHeightPx = usableHeightMm * pxToMm;

                if (format === 'pdf_digital') {
                    console.log('[ExportService] PDF Mode: Digital (Single Page)');
                    if (onProgress) onProgress({ progress: 10, message: 'Preparando captura digital...' });

                    const pngOptions = this._getPngOptions(bounds, backgroundStyle);

                    if (onProgress) onProgress({ progress: 20, message: 'Renderizando elementos...' });
                    const dataUrl = await toPng(element, pngOptions);

                    if (onProgress) onProgress({ progress: 80, message: 'Gerando PDF digital...' });
                    const digitalDoc = new jsPDF({
                        orientation: bounds.width > bounds.height ? 'l' : 'p',
                        unit: 'px',
                        format: [bounds.width, bounds.height],
                        compress: true
                    });
                    digitalDoc.setFillColor(bgColor.r, bgColor.g, bgColor.b);
                    digitalDoc.rect(0, 0, bounds.width, bounds.height, 'F');
                    digitalDoc.addImage(dataUrl, 'PNG', 0, 0, bounds.width, bounds.height, undefined, 'FAST');

                    if (onProgress) onProgress({ progress: 100, message: 'Sucesso!' });

                    if (options.returnResult) {
                        return digitalDoc.output('blob');
                    }

                    digitalDoc.save(`${safeFileName}.pdf`);
                    return;
                }

                console.log('[ExportService] PDF Mode: Standard (Piecewise Tiled)');

                let currentYPx = bounds.minY;
                let remainingHeightPx = bounds.height;
                let pageCount = 0;
                let safetyCounter = 100;
                const totalEstimatedPages = Math.ceil(bounds.height / safePageHeightPx);

                // Pre-sort blocks once for efficient paging
                const sortedBlocks = (allBlocks || []).sort((a, b) => (a.y || 0) - (b.y || 0));

                while (remainingHeightPx > 0 && safetyCounter > 0) {
                    safetyCounter--;
                    pageCount++;
                    if (pageCount > 1) doc.addPage();

                    // Step 1: Calculate safe slice height (in PX)
                    let sliceHeightPx = Math.min(safePageHeightPx, remainingHeightPx);

                    // Step 2: Smart break detection
                    if (remainingHeightPx > safePageHeightPx) {
                        const breakLineYPx = currentYPx + safePageHeightPx;

                        // Find the topmost block that intersects the break line
                        // Only consider blocks that start WITHIN the current page view
                        const intersectingBlocks = sortedBlocks.filter(b => {
                            const bTop = b.y || 0;
                            const bHeight = b.height || 0;
                            const bBottom = bTop + bHeight;

                            // Does it cross the boundary?
                            const crossesBoundary = bTop < breakLineYPx && bBottom > breakLineYPx;
                            // Is it mostly in the bottom half of the page? (To avoid wasting TOO much space)
                            const startsInBottomHalf = (bTop - currentYPx) > (safePageHeightPx * 0.4);
                            // Is it small enough that breaking before it makes sense? (if it spans multiple pages, we MUST cut it)
                            const fitsInOnePage = bHeight < (safePageHeightPx * 0.9);

                            return crossesBoundary && startsInBottomHalf && fitsInOnePage;
                        });

                        if (intersectingBlocks.length > 0) {
                            // Break before the TOPMOST intersecting block to be safe
                            const firstBlock = intersectingBlocks[0];
                            sliceHeightPx = (firstBlock.y || 0) - currentYPx - 10; // 10px cushion
                            console.log(`[ExportService] Smart Break triggered by block ${firstBlock.id} at page ${pageCount}`);
                        }
                    }

                    // Progress Heartbeat (Phase 1: Capturing)
                    if (onProgress) {
                        const progressBase = Math.min(Math.round(((pageCount - 1) / totalEstimatedPages) * 100), 90);
                        onProgress({
                            progress: Math.max(progressBase, 5),
                            message: `Capturando pág. ${pageCount} de ${totalEstimatedPages}...`
                        });
                    }

                    // Tiled Capture Style
                    const tileStyle = {
                        transform: `translate(${-bounds.minX}px, ${-currentYPx}px)`,
                        transformOrigin: '0 0',
                        width: bounds.width + 'px',
                        backgroundColor: bgColorStr
                    };
                    if (backgroundStyle) Object.assign(tileStyle, backgroundStyle);

                    // Capture actual tile (limiting width/height to slice area)
                    const tileDataUrl = await toPng(element, {
                        width: bounds.width,
                        height: sliceHeightPx,
                        style: { ...tileStyle, fontDisplay: 'none' },
                        backgroundColor: bgColorStr,
                        pixelRatio: 3.5,
                        skipFonts: true,
                        cacheBust: true
                    });

                    // Progress Heartbeat (Phase 2: Adding to PDF)
                    if (onProgress) {
                        const progressMid = Math.min(Math.round(((pageCount - 0.5) / totalEstimatedPages) * 100), 92);
                        onProgress({
                            progress: progressMid,
                            message: `Injetando pág. ${pageCount}...`
                        });
                    }

                    // Map slice back to MM for jsPDF
                    const mmHeight = sliceHeightPx / pxToMm;

                    // Add background and image to page (Offset by TOP_MARGIN_MM)
                    doc.setFillColor(bgColor.r, bgColor.g, bgColor.b);
                    doc.rect(0, 0, pageWidth, pageHeight, 'F');
                    doc.addImage(tileDataUrl, 'PNG', 0, TOP_MARGIN_MM, pageWidth, mmHeight, undefined, 'FAST');

                    remainingHeightPx -= sliceHeightPx;
                    currentYPx += sliceHeightPx;
                }

                // Step 4: Decorations (Post-processing)
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    this._drawPageDecorations(doc, i, pageCount, note?.title || 'Sem Título', textColor, bgColor);
                }

                if (onProgress) onProgress({ progress: 99, message: 'Finalizando PDF...' });

                if (options.returnResult) {
                    return doc.output('blob');
                }

                doc.save(`${safeFileName}.pdf`);
                if (onProgress) onProgress({ progress: 100, message: 'Sucesso!' });
                console.log('[ExportService] standard PDF successful.');
            } catch (err) {
                console.error('[ExportService] PDF Error:', err);
                alert('Erro ao gerar PDF. Verifique o console.');
                if (onProgress) onProgress({ progress: 0, message: 'Erro no PDF' });
            }
        } else {
            // Text notes (Markdown-based PDF)
            const doc = new jsPDF('p', 'mm', 'a4');
            const computedStyle = getComputedStyle(document.body);
            const bgColorStr = computedStyle.getPropertyValue('--canvas-bg-color') || '#1a1a1b';
            const textColorStr = computedStyle.getPropertyValue('--text-primary') || '#ffffff';
            const bgColor = parseColorToRGB(bgColorStr);
            const textColor = parseColorToRGB(textColorStr);

            doc.setFillColor(bgColor.r, bgColor.g, bgColor.b);
            doc.rect(0, 0, 210, 297, 'F');
            doc.setTextColor(textColor.r, textColor.g, textColor.b);
            doc.setFontSize(20);
            doc.text(note?.title || 'Sem Título', 15, 20);
            doc.setFontSize(12);

            let text = '';
            if (note?.type === 'text') text = note.content?.markdown || '';
            if (note?.type === 'code') text = `\`\`\`${note.content?.language}\n${note.content?.code}\n\`\`\``;

            const splitText = doc.splitTextToSize(text, 180);
            doc.text(splitText, 15, 30);

            if (options.returnResult) {
                return doc.output('blob');
            }

            doc.save(`${fileName}.pdf`);
            console.log('[ExportService] PDF Export successful (Text).');
        }
    },

    _handleMdExport(note, fileName, options = {}) {
        console.log('[ExportService] _handleMdExport starting...');
        const content = this.generateMarkdown(note);

        if (options.returnResult) {
            return content;
        }

        const blob = new Blob([content], { type: 'text/markdown' });
        const dataUrl = URL.createObjectURL(blob);
        this._download(dataUrl, `${fileName}.md`);
        setTimeout(() => URL.revokeObjectURL(dataUrl), 100);
        console.log('[ExportService] Markdown Export successful.');
    },

    generateMarkdown(note) {
        let content = `# ${note.title || 'Sem Título'}\n\n`;

        if (note.type === 'text') {
            content += note.content?.markdown || '';
        } else if (note.type === 'code') {
            content += `\`\`\`${note.content?.language || ''}\n${note.content?.code || ''}\n\`\`\``;
        } else if (note.type === 'mermaid') {
            content += `\`\`\`mermaid\n${note.content?.code || ''}\n\`\`\``;
        } else if (note.type === 'canvas') {
            // Export text blocks
            const textBlocks = note.content?.textBlocks || [];
            const mathBlocks = note.content?.mathBlocks || [];
            const codeBlocks = note.content?.codeBlocks || [];

            textBlocks.forEach(b => content += `## Bloco de Texto\n${b.content}\n\n`);
            mathBlocks.forEach(b => content += `## Fórmula\n$${b.content}$\n\n`);
            codeBlocks.forEach(b => content += `## Código\n\`\`\`${b.language || ''}\n${b.content}\n\`\`\`\n\n`);

            // Export strokes as note
            const strokes = note.content?.strokes || [];
            if (strokes.length > 0) {
                content += `> *Esta nota contém ${strokes.length} desenho(s) à mão livre.*\n\n`;
            }
        } else if (note.type === 'mindmap') {
            const traverse = (node, depth = 0) => {
                let s = '  '.repeat(depth) + '- ' + node.text + '\n';
                (node.children || []).forEach(c => s += traverse(c, depth + 1));
                return s;
            };
            content += traverse(note.content?.root || { text: 'Raiz' });
        }

        // Add tags if present
        if (note.tags && note.tags.length > 0) {
            content += `\n---\n**Tags:** ${note.tags.map(t => '#' + t).join(' ')}\n`;
        }

        return content;
    },

    /**
     * Helper to convert a Data URL (base64) to a Blob for binary storage in ZIP.
     */
    _dataUrlToBlob(dataUrl) {
        try {
            const arr = dataUrl.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            return new Blob([u8arr], { type: mime });
        } catch (err) {
            console.error('[ExportService] Failed to convert DataURL to Blob:', err);
            return null;
        }
    },

    /**
     * Exports a whole folder and its subfolders as a ZIP file.
     * Prioritizes Markdown for text and JSON for complex data.
     */
    async exportFolder(folderNode, allNotes, options = {}) {
        console.log(`[ExportService] exportFolder triggered for: ${folderNode?.title}`);
        if (!folderNode || !allNotes) {
            console.error('[ExportService] exportFolder: folderNode or allNotes is missing', { folderNode, hasNotes: !!allNotes });
            return;
        }

        const zip = new JSZip();
        const { onProgress, format = 'json', captureCallback } = options;
        const visited = new Set();

        // 1. Recursive Count
        let totalItems = 0;
        const countItems = (node) => {
            if (!node || visited.has(node.id)) return;
            visited.add(node.id);

            if (node.children && node.children.length > 0) {
                totalItems += node.children.length;
                node.children.forEach(id => {
                    const child = allNotes && allNotes[id];
                    if (child) countItems(child);
                });
            }
        };
        countItems(folderNode);
        visited.clear(); // Reset for actual processing
        console.log(`[ExportService] Found ${totalItems} items to process.`);

        let processedCount = 0;

        const processFolder = async (node, zipFolder) => {
            if (!node || visited.has(node.id)) return;
            visited.add(node.id);

            if (!node.children || node.children.length === 0) return;

            for (const childId of node.children) {
                const childNote = allNotes[childId];
                if (!childNote) continue;

                processedCount++;
                const progressVal = Math.min(Math.round((processedCount / (totalItems || 1)) * 95), 98);
                if (onProgress) {
                    onProgress({
                        progress: progressVal,
                        message: `Item ${processedCount}/${totalItems}: ${childNote.title || 'nota'}`
                    });
                }

                const safeTitle = (childNote.title || 'nota').replace(/[\/\\?%*:|"<>]/g, '-');

                // A. Export the Item
                if (childNote.type !== 'folder') {
                    try {
                        // CODE NOTES: always export as raw source with proper extension
                        if (childNote.type === 'code') {
                            const ext = this._getCodeExtension(childNote);
                            const rawCode = childNote.content?.code || '';
                            zipFolder.file(`${safeTitle}.${ext}`, rawCode);
                        } else if (format === 'json') {
                            zipFolder.file(`${safeTitle}.json`, this.generateJson(childNote));
                        } else if (format === 'md') {
                            zipFolder.file(`${safeTitle}.md`, this.generateMarkdown(childNote));
                        } else if (format === 'pdf') {
                            if ((childNote.type === 'canvas' || childNote.type === 'mindmap') && captureCallback) {
                                const result = await captureCallback(childNote, 'pdf');
                                if (result) {
                                    zipFolder.file(`${safeTitle}.pdf`, result);
                                } else {
                                    const pdfBlob = await this.exportNote(childNote, 'pdf', { returnResult: true });
                                    if (pdfBlob) zipFolder.file(`${safeTitle}.pdf`, pdfBlob);
                                    else zipFolder.file(`${safeTitle}.md`, this.generateMarkdown(childNote));
                                }
                            } else {
                                const pdfBlob = await this.exportNote(childNote, 'pdf', { returnResult: true });
                                if (pdfBlob) {
                                    zipFolder.file(`${safeTitle}.pdf`, pdfBlob);
                                } else {
                                    zipFolder.file(`${safeTitle}.md`, this.generateMarkdown(childNote));
                                }
                            }
                        } else if (format === 'png') {
                            if ((childNote.type === 'canvas' || childNote.type === 'mindmap') && captureCallback) {
                                const result = await captureCallback(childNote, 'png');
                                if (result) {
                                    const blob = this._dataUrlToBlob(result);
                                    if (blob) zipFolder.file(`${safeTitle}.png`, blob);
                                    else zipFolder.file(`${safeTitle}.md`, this.generateMarkdown(childNote));
                                } else {
                                    zipFolder.file(`${safeTitle}.md`, this.generateMarkdown(childNote));
                                }
                            } else {
                                const pdfBlob = await this.exportNote(childNote, 'pdf', { returnResult: true });
                                if (pdfBlob) {
                                    zipFolder.file(`${safeTitle}.pdf`, pdfBlob);
                                } else {
                                    zipFolder.file(`${safeTitle}.md`, this.generateMarkdown(childNote));
                                }
                            }
                        }
                    } catch (itemErr) {
                        console.error(`[ExportService] Error processing item ${childNote.id}:`, itemErr);
                        zipFolder.file(`${safeTitle}.md`, this.generateMarkdown(childNote));
                    }
                }

                // B. Sub-Hierarchy
                if (childNote.children && childNote.children.length > 0) {
                    const subFolderName = (childNote.title || 'Subpasta').replace(/[\/\\?%*:|"<>]/g, '-');
                    const subFolder = zipFolder.folder(subFolderName);
                    await processFolder(childNote, subFolder);
                }
            }
        };

        try {
            await processFolder(folderNode, zip);
            console.log('[ExportService] All items processed, generating ZIP blob...');

            if (onProgress) onProgress({ progress: 99, message: 'Gerando arquivo comprimido...' });

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            console.log('[ExportService] ZIP blob generated, size:', zipBlob.size);

            const url = URL.createObjectURL(zipBlob);
            const fileName = (folderNode.title || 'Export_ConnectedNotes').replace(/[\/\\?%*:|"<>]/g, '-');

            this._download(url, `${fileName}.zip`);

            if (onProgress) onProgress({ progress: 100, message: 'Exportação concluída!' });
            setTimeout(() => URL.revokeObjectURL(url), 5000);
        } catch (err) {
            console.error('[ExportService] Fatal error during folder export:', err);
            if (onProgress) onProgress({ progress: 0, message: 'Erro na exportação (veja o console)' });
        }
    },

    /**
     * Generates a raw JSON string of the note for backup/deep-storage.
     */
    generateJson(note) {
        return JSON.stringify({
            title: note.title,
            type: note.type,
            content: note.content,
            tags: note.tags || [],
            createdAt: note.createdAt,
            exportDate: new Date().toISOString()
        }, null, 2);
    },

    /**
     * Draws header (Title, Date) and footer (Page numbering) on a PDF page.
     */
    _drawPageDecorations(doc, pageNum, totalPages, title, textColor, bgColor) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 10;
        const TOP_MARGIN_MM = 20;
        const BT_MARGIN_MM = 20;

        // Mask the Header/Footer zones to ensure NO content leaks through
        if (bgColor) {
            doc.setFillColor(bgColor.r, bgColor.g, bgColor.b);
            doc.rect(0, 0, pageWidth, TOP_MARGIN_MM, 'F');
            doc.rect(0, pageHeight - BT_MARGIN_MM, pageWidth, BT_MARGIN_MM, 'F');
        }

        doc.setFontSize(8);
        doc.setTextColor(textColor.r, textColor.g, textColor.b);

        // Header Left: Note Title
        doc.text(title, margin, margin - 3);

        // Header Right: Export Date
        const dateStr = new Date().toLocaleDateString();
        const dateWidth = doc.getTextWidth(dateStr);
        doc.text(dateStr, pageWidth - dateWidth - margin, margin - 3);

        // Footer Center: Page X of Y
        const footerText = `Página ${pageNum} de ${totalPages}`;
        const footerWidth = doc.getTextWidth(footerText);
        doc.text(footerText, (pageWidth / 2) - (footerWidth / 2), pageHeight - 5);

        // Subtle separator line
        doc.setDrawColor(textColor.r, textColor.g, textColor.b);
        doc.setLineWidth(0.05);
        doc.setGState(new doc.GState({ opacity: 0.2 }));
        doc.line(margin, margin - 1, pageWidth - margin, margin - 1);
        doc.setGState(new doc.GState({ opacity: 1.0 }));
    },

    /**
     * Captures the entire visible canvas (DOM + injected SVG) as a PNG or PDF.
     * Used by the hybrid export engine in CanvasArea.
     */
    async exportCurrentView(element, format, title, bounds, backgroundStyle, allBlocks, onProgress) {
        if (!element || !bounds) return;

        const fileName = title || 'nota';
        const options = { element, bounds, backgroundStyle, format, allBlocks, onProgress };

        const fmt = format?.toLowerCase();
        if (fmt === 'pdf' || fmt === 'pdf_digital') {
            await this._handlePdfExport(null, fileName, options);
        } else if (fmt === 'png') {
            await this._handlePngExport(null, fileName, options);
        }
    },

    /**
     * Helper to trigger a browser download.
     */
    _download(url, name) {
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
