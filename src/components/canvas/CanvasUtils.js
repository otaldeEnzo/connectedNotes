import { getStroke } from 'perfect-freehand';

export const resolveColor = (color) => {
    if (!color) return '#000000';
    if (color.startsWith('var')) {
        try {
            const temp = document.createElement('div');
            temp.style.color = color;
            temp.style.display = 'none';
            document.body.appendChild(temp);
            const resolved = window.getComputedStyle(temp).color;
            document.body.removeChild(temp);
            return resolved;
        } catch (e) { return '#000000'; }
    }
    return color;
};

// Helper: Convert perfect-freehand points to SVG path
const getSvgPathFromStrokePoints = (points) => {
    const len = points.length;
    if (len < 4) return ``;
    let a = points[0];
    let b = points[1];
    const c = points[2];
    let result = `M ${a[0].toFixed(2)},${a[1].toFixed(2)} Q ${b[0].toFixed(2)},${b[1].toFixed(2)} ${((b[0] + c[0]) / 2).toFixed(2)},${((b[1] + c[1]) / 2).toFixed(2)} `;
    for (let i = 2; i < len - 1; i++) {
        a = points[i];
        b = points[i + 1];
        result += `T ${((a[0] + b[0]) / 2).toFixed(2)},${((a[1] + b[1]) / 2).toFixed(2)} `;
    }
    result += `T ${points[len - 1][0].toFixed(2)},${points[len - 1][1].toFixed(2)} Z`;
    return result;
};

export const getSvgPathFromStroke = (points, options = {}) => {
    if (!points || points.length === 0) return '';

    // For very short strokes (dots), ensure visibility
    if (points.length < 2) {
        // Create a synthetic small stroke
        const p = points[0];
        points = [p, { ...p, x: p.x + 0.1, y: p.y + 0.1 }];
    }

    const inputPoints = points.map(p => [p.x, p.y, p.pressure !== undefined ? p.pressure : 0.5]);

    const stroke = getStroke(inputPoints, {
        size: options.size || 5, // Default size if not provided
        thinning: 0.5,
        smoothing: 0.45, // Reduced slightly for better fidelity
        streamline: 0.45, // Reduced slightly for less lag
        simulatePressure: points[0].pressure === undefined, // Simulate if no pressure data
        ...options
    });

    return getSvgPathFromStrokePoints(stroke);
};

/**
 * Generates a clean SVG path string for perfected shapes (lines, arrows, polygons)
 */
export const getNeatPathData = (points, shapeType, isOpen = false) => {
    if (!points || points.length === 0) return '';

    if (shapeType === 'arrow' && points.length >= 4) {
        const len = points.length;
        const shaftPts = points.slice(0, len - 3);
        const [h1, p2, h2] = points.slice(len - 3);
        const shaftD = shaftPts.reduce((acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`), '');
        const headD = `M ${h1.x} ${h1.y} L ${p2.x} ${p2.y} L ${h2.x} ${h2.y}`;
        return shaftD + ' ' + headD;
    }

    return points.reduce((acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`), '') + (isOpen ? '' : ' Z');
};

export const getBlockDimensions = (block) => {
    // 1. Prioridade para dimensões medidas em tempo real
    if (block.measuredWidth && block.measuredHeight) {
        return { width: block.measuredWidth, height: block.measuredHeight };
    }

    // 2. Dimensões explícitas (manuais)
    if (block.width && block.height) {
        return { width: block.width, height: block.height };
    }

    // 3. Estimativas para blocos sem dimensões (ex: criação inicial)
    if (block.type === 'text' || (typeof block.content === 'string' && block.content.startsWith('<'))) {
        const contentLen = block.content ? block.content.length : 0;
        const estWidth = Math.max(30, contentLen * 9 + 24);
        const estHeight = Math.max(30, (block.content.split('\n').length * 20) + 56);
        return { width: estWidth, height: estHeight };
    }

    if (block.type === 'math' || (typeof block.content === 'string' && block.content.includes('\\'))) {
        return { width: 100, height: 60 };
    }

    if (block.type === 'mermaid' || block.code) {
        return { width: block.width || 300, height: block.height || 200 };
    }

    if (block.type === 'mindmap' || block.content?.root) {
        return { width: block.width || 400, height: block.height || 300 };
    }

    return {
        width: block.width || (block.src ? 300 : 200),
        height: block.height || (block.src ? 300 : 100)
    };
};

export const getEffectiveMathDimensions = (block, isExpanded) => {
    const { width: baseW, height: baseH } = getBlockDimensions(block);

    if (!isExpanded) return { width: baseW, height: baseH, xOffset: 0, yOffset: 0 };

    const effW = Math.max(baseW, 220);
    const effH = Math.max(baseH, 40);
    return {
        width: effW,
        height: effH,
        xOffset: (effW - baseW) / 2,
        yOffset: (effH - baseH) / 2
    };
};

export const getStrokeBounds = (points) => {
    if (!points || points.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(p => {
        if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y;
    });
    if (minX === Infinity) return null;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY, right: maxX, bottom: maxY };
};

export const getConnectionBounds = (connection, allBlocks) => {
    const start = getAnchorPointById(connection.fromId, connection.fromSide, allBlocks);
    const end = getAnchorPointById(connection.toId, connection.toSide, allBlocks);
    if (!start || !end) return null;

    const dist = Math.hypot(end.x - start.x, end.y - start.y);
    const controlDist = Math.max(dist * 0.5, 50);

    let cp1 = { x: start.x, y: start.y };
    let cp2 = { x: end.x, y: end.y };

    if (connection.fromSide === 'top') cp1.y -= controlDist;
    if (connection.fromSide === 'bottom') cp1.y += controlDist;
    if (connection.fromSide === 'left') cp1.x -= controlDist;
    if (connection.fromSide === 'right') cp1.x += controlDist;

    if (connection.toSide === 'top') cp2.y -= controlDist;
    if (connection.toSide === 'bottom') cp2.y += controlDist;
    if (connection.toSide === 'left') cp2.x -= controlDist;
    if (connection.toSide === 'right') cp2.x += controlDist;

    const points = [start, end, cp1, cp2];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(p => {
        if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y;
    });

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY, right: maxX, bottom: maxY };
};

export const getGroupBounds = (blocks = [], strokes = [], connections = [], allBlocks = []) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let hasItems = false;
    blocks.forEach(b => {
        if (!b) return;
        hasItems = true;
        const { width, height } = getBlockDimensions(b);
        let bx = b.x; let by = b.y;
        if (bx < minX) minX = bx; if (by < minY) minY = by;
        if (bx + width > maxX) maxX = bx + width; if (by + height > maxY) maxY = by + height;
    });
    strokes.forEach(s => {
        if (!s || !s.points) return;
        const b = getStrokeBounds(s.points);
        if (b) { hasItems = true; if (b.x < minX) minX = b.x; if (b.y < minY) minY = b.y; if (b.right > maxX) maxX = b.right; if (b.bottom > maxY) maxY = b.bottom; }
    });
    connections.forEach(conn => {
        const b = getConnectionBounds(conn, allBlocks);
        if (b) {
            hasItems = true;
            if (b.x < minX) minX = b.x; if (b.y < minY) minY = b.y;
            if (b.right > maxX) maxX = b.right; if (b.bottom > maxY) maxY = b.bottom;
        }
    });
    if (!hasItems) return null;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

export const isBlockIntersecting = (block, rect) => {
    let bx = block.x; let by = block.y;
    const { width: bw, height: bh } = getBlockDimensions(block);
    const rx = Math.min(rect.startX, rect.currentX);
    const ry = Math.min(rect.startY, rect.currentY);
    const rw = Math.abs(rect.currentX - rect.startX) || 1;
    const rh = Math.abs(rect.currentY - rect.startY) || 1;
    return (bx < rx + rw && bx + bw > rx && by < ry + rh && by + bh > ry);
};

export const isPointInBlock = (block, point, padding = 0) => {
    const { width, height } = getBlockDimensions(block);
    return point.x >= block.x - padding && point.x <= block.x + width + padding &&
        point.y >= block.y - padding && point.y <= block.y + height + padding;
};

export const isStrokeInRect = (stroke, rect) => {
    const rx = Math.min(rect.startX, rect.currentX);
    const ry = Math.min(rect.startY, rect.currentY);
    const rw = Math.abs(rect.currentX - rect.startX) || 1;
    const rh = Math.abs(rect.currentY - rect.startY) || 1;
    const b = getStrokeBounds(stroke.points);
    if (!b) return false;
    if (b.right < rx || b.x > rx + rw || b.bottom < ry || b.y > ry + rh) return false;
    return stroke.points.some(p => p.x >= rx && p.x <= rx + rw && p.y >= ry && p.y <= ry + rh);
};

export const cropImageFromBlock = (block, rect) => {
    return new Promise((resolve) => {
        if (!block.src) { resolve(null); return; }
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const rx = Math.min(rect.startX, rect.currentX);
            const ry = Math.min(rect.startY, rect.currentY);
            const rw = Math.abs(rect.currentX - rect.startX) || 1;
            const rh = Math.abs(rect.currentY - rect.startY) || 1;
            const bx = block.x; const by = block.y;
            const { width: bw, height: bh } = getBlockDimensions(block);
            const intersectX = Math.max(rx, bx); const intersectY = Math.max(ry, by);
            const intersectW = Math.min(rx + rw, bx + bw) - intersectX;
            const intersectH = Math.min(ry + rh, by + bh) - intersectY;
            if (intersectW <= 0 || intersectH <= 0) { resolve(null); return; }
            const canvas = document.createElement('canvas');
            canvas.width = intersectW; canvas.height = intersectH;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, bx - intersectX, by - intersectY, bw, bh);
            resolve({ src: canvas.toDataURL('image/png') });
        };
        img.onerror = () => resolve(null);
        img.src = block.src;
    });
};

export const convertStrokesToImage = (strokes) => {
    if (!strokes || strokes.length === 0) return null;
    const bounds = getGroupBounds([], strokes);
    if (!bounds) return null;
    const canvas = document.createElement('canvas');
    canvas.width = bounds.width + 40; canvas.height = bounds.height + 40;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(-bounds.x + 20, -bounds.y + 20); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    strokes.forEach(s => {
        if (s.points.length < 2) return;
        ctx.beginPath(); ctx.lineWidth = s.width || 3; ctx.strokeStyle = resolveColor(s.color);
        ctx.moveTo(s.points[0].x, s.points[0].y);
        for (let i = 1; i < s.points.length - 1; i++) { const p0 = s.points[i]; const p1 = s.points[i + 1]; const midX = (p0.x + p1.x) / 2; const midY = (p0.y + p1.y) / 2; ctx.quadraticCurveTo(p0.x, p0.y, midX, midY); }
        ctx.lineTo(s.points[s.points.length - 1].x, s.points[s.points.length - 1].y); ctx.stroke();
    });
    return canvas.toDataURL('image/png');
};

export const pointToSegmentDistance = (x, y, x1, y1, x2, y2) => { const A = x - x1; const B = y - y1; const C = x2 - x1; const D = y2 - y1; const dot = A * C + B * D; const lenSq = C * C + D * D; let param = -1; if (lenSq !== 0) param = dot / lenSq; let xx, yy; if (param < 0) { xx = x1; yy = y1; } else if (param > 1) { xx = x2; yy = y2; } else { xx = x1 + param * C; yy = y1 + param * D; } const dx = x - xx; const dy = y - yy; return Math.sqrt(dx * dx + dy * dy); };
export const isStrokeClicked = (stroke, point, threshold = 10) => { for (let i = 0; i < stroke.points.length - 1; i++) { const p1 = stroke.points[i]; const p2 = stroke.points[i + 1]; if (pointToSegmentDistance(point.x, point.y, p1.x, p1.y, p2.x, p2.y) < threshold) return true; } if (stroke.points.length === 1) { const p = stroke.points[0]; if (Math.hypot(p.x - point.x, p.y - point.y) < threshold) return true; } return false; };
export const isConnectionInRect = (connection, start, end, rect) => {
    // 1. Calculate Control Points (same logic as ConnectionLayer)
    const dist = Math.hypot(end.x - start.x, end.y - start.y);
    const controlDist = Math.max(dist * 0.5, 50);

    let cp1 = { x: start.x, y: start.y };
    let cp2 = { x: end.x, y: end.y };

    if (connection.fromSide === 'top') cp1.y -= controlDist;
    if (connection.fromSide === 'bottom') cp1.y += controlDist;
    if (connection.fromSide === 'left') cp1.x -= controlDist;
    if (connection.fromSide === 'right') cp1.x += controlDist;

    if (connection.toSide === 'top') cp2.y -= controlDist;
    if (connection.toSide === 'bottom') cp2.y += controlDist;
    if (connection.toSide === 'left') cp2.x -= controlDist;
    if (connection.toSide === 'right') cp2.x += controlDist;

    // 2. Check Bounding Box of Hull (Start, End, CP1, CP2)
    const points = [start, end, cp1, cp2];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(p => {
        if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y;
    });

    const rx = Math.min(rect.startX, rect.currentX);
    const ry = Math.min(rect.startY, rect.currentY);
    const rw = Math.abs(rect.currentX - rect.startX) || 1;
    const rh = Math.abs(rect.currentY - rect.startY) || 1;

    // Bounding Box Intersection
    return (minX < rx + rw && maxX > rx && minY < ry + rh && maxY > ry);
};

export const getAnchorPointById = (id, side, allBlocks, hoveredId) => {
    const b = allBlocks.find(x => x.id === id);
    if (!b) return null;

    // Use common logic for all blocks - this now includes measured dimensions
    const isMath = b.type === 'math' || (typeof b.content === 'string' && b.content.includes('\\'));
    const { width, height, xOffset, yOffset } = getEffectiveMathDimensions(b, isMath && (id === hoveredId));

    const x = (b.x || 0) - xOffset;
    const y = (b.y || 0) - yOffset;
    const w = width || 0;
    const h = height || 0;

    if (side === 'top') return { x: x + w / 2, y: y };
    if (side === 'bottom') return { x: x + w / 2, y: y + h };
    if (side === 'left') return { x: x, y: y + h / 2 };
    if (side === 'right') return { x: x + w, y: y + h / 2 };
    return { x: x + w / 2, y: y + h / 2 };
};

import { generateId } from '../../utils/id';
export { generateId };
