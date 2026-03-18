/**
 * ShapeRecognitionService.js (V4)
 * High-Precision Recognition via Google Input Tools + Geometric Fitting
 */

const GOOGLE_API_URL = 'https://inputtools.google.com/request?ime=handwriting&app=autodraw&dbg=1&cs=1&oe=UTF-8';

// --- Helpers ---
const getDist = (p1, p2) => Math.hypot(p2.x - p1.x, p2.y - p1.y);
const pathLength = (points) => {
    let len = 0;
    for (let i = 1; i < points.length; i++) len += getDist(points[i - 1], points[i]);
    return len;
};

/**
 * Recognizes a shape using Google's AutoDraw API
 * @param {Array} points - Array of {x, y} points
 * @returns {Promise<string|null>} - Recognized shape type name
 */
export const recognizeViaGoogle = async (points) => {
    if (!points || points.length < 5) return null;

    // Convert points to Google's format: [[x1, x2...], [y1, y2...], [t1, t2...]]
    const x = points.map(p => Math.round(p.x));
    const y = points.map(p => Math.round(p.y));
    const t = points.map((_, i) => i * 10); // Simulated time

    const requestBody = {
        input_type: 0,
        requests: [{
            language: 'autodraw',
            writing_guide: { width: 4000, height: 4000 },
            ink: [[x, y, t]]
        }]
    };

    try {
        const response = await fetch(GOOGLE_API_URL, {
            method: 'POST',
            body: JSON.stringify(requestBody),
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        if (data && data[0] === 'SUCCESS') {
            const suggestions = data[1][0][1]; // Array of strings like ["circle", "sun", "square"...]
            console.log('[ShapePro] API Suggestions:', suggestions);

            // Map suggestions for automatic recognition (Basic Only)
            const autoMapping = {
                'circle': 'circle',
                'oval': 'ellipse',
                'ellipse': 'ellipse',
                'triangle': 'triangle',
                'square': 'rectangle',
                'rectangle': 'rectangle',
                'arrow': 'arrow',
                'line': 'line'
            };

            // Dynamic Closure Check: Geometric shapes (triangle/rect) can have larger gaps than lines/arrows
            const closureDist = Math.hypot(points[0].x - points[points.length - 1].x, points[0].y - points[points.length - 1].y);
            const isStrictlyClosed = closureDist < 25;
            const isLooselyClosed = closureDist < 80; // Allow triangles/rects to have gaps

            for (const s of suggestions) {
                const lower = s.toLowerCase();
                // If stroke is strictly closed, skip linear shapes (arrow, line)
                if (isStrictlyClosed && (lower === 'arrow' || lower === 'line')) continue;

                // Automatic recognition only for basic shapes
                if (autoMapping[lower]) {
                    // Force triangle to be loosely closed at minimum
                    if (autoMapping[lower] === 'triangle' && !isLooselyClosed) continue;
                    return autoMapping[lower];
                }
            }

            // Second pass: fallback for visual/partial matches (Basic only)
            for (const s of suggestions) {
                const lower = s.toLowerCase();
                if (lower.includes('circle') || lower === 'o') return 'circle';
                if (lower.includes('oval') || lower.includes('ellipse')) return 'ellipse';
                if (lower.includes('square') || lower.includes('box') || lower.includes('rect')) return 'rectangle';
                if (isLooselyClosed && (lower.includes('triangle') || lower === 'delta')) return 'triangle';
                if (!isStrictlyClosed && (lower.includes('arrow') || lower.includes('pointer'))) return 'arrow';
                if (!isStrictlyClosed && (lower.includes('line') || lower === 'streak')) return 'line';
            }

            // If stroke is loosely closed but no geometric match, treat as polygon
            if (isLooselyClosed) {
                console.log('[ShapePro] Closed/Loosely closed stroke, no specific match - treating as polygon');
                return 'polygon';
            }

            console.log('[ShapePro] No geometric match found in suggestions:', suggestions.slice(0, 5).join(', '));
        }
    } catch (err) {
        console.error('[ShapePro] API Error:', err);
    }
    return null;
};

import * as geometric from 'geometric';

// --- Geometric Fitting ---

const getCentroid = (points) => {
    const polyArr = points.map(p => [p.x, p.y]);
    const c = geometric.polygonCentroid(polyArr);
    return c ? { x: c[0], y: c[1] } : {
        x: points.reduce((a, b) => a + b.x, 0) / points.length,
        y: points.reduce((a, b) => a + b.y, 0) / points.length
    };
};

const getPCA = (points) => {
    let c = {
        x: points.reduce((a, b) => a + b.x, 0) / points.length,
        y: points.reduce((a, b) => a + b.y, 0) / points.length
    };
    let u20 = 0, u02 = 0, u11 = 0;
    for (const p of points) {
        let dx = p.x - c.x;
        let dy = p.y - c.y;
        u20 += dx * dx;
        u02 += dy * dy;
        u11 += dx * dy;
    }
    return 0.5 * Math.atan2(2 * u11, u20 - u02);
};

const getOBB = (points) => {
    const angle = getPCA(points);
    const cos = Math.cos(-angle), sin = Math.sin(-angle);
    const pivot = {
        x: points.reduce((a, b) => a + b.x, 0) / points.length,
        y: points.reduce((a, b) => a + b.y, 0) / points.length
    };

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
        // Rotate point into aligned space
        const tx = (p.x - pivot.x) * cos - (p.y - pivot.y) * sin;
        const ty = (p.x - pivot.x) * sin + (p.y - pivot.y) * cos;
        minX = Math.min(minX, tx); maxX = Math.max(maxX, tx);
        minY = Math.min(minY, ty); maxY = Math.max(maxY, ty);
    }

    const localCenterX = (minX + maxX) / 2;
    const localCenterY = (minY + maxY) / 2;
    const width = maxX - minX;
    const height = maxY - minY;

    // Rotate local center back to world space
    const centerX = pivot.x + localCenterX * Math.cos(angle) - localCenterY * Math.sin(angle);
    const centerY = pivot.y + localCenterX * Math.sin(angle) + localCenterY * Math.cos(angle);

    return { center: { x: centerX, y: centerY }, width, height, angle };
};

const simplifyPolygon = (points, tolerance = 2.0) => {
    // Douglas-Peucker simplification using a simple distance check for now or just reducing points
    if (points.length <= 2) return points;
    const sqTolerance = tolerance * tolerance;
    let lastPoint = points[0];
    const simplified = [lastPoint];
    for (let i = 1; i < points.length; i++) {
        const point = points[i];
        if (Math.pow(point.x - lastPoint.x, 2) + Math.pow(point.y - lastPoint.y, 2) > sqTolerance) {
            simplified.push(point);
            lastPoint = point;
        }
    }
    return simplified;
};

// V3 Update: Simplify fitGeometry logic to use basic shapes and remove complex polygon fitting for now
// to fix visual glitches and make it extremely robust.
const interpolatePoints = (points, density) => {
    // Linear interpolation between points to create smooth path for renderer
    let pts = [];
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const steps = Math.ceil(dist / density);
        for (let j = 0; j < steps; j++) {
            const t = j / steps;
            pts.push({
                x: p1.x + (p2.x - p1.x) * t,
                y: p1.y + (p2.y - p1.y) * t,
                pressure: 0.5
            });
        }
    }
    pts.push({ ...points[points.length - 1], pressure: 0.5 });
    return pts;
};

/**
 * Fits pure geometric constraints
 * @param {string} type - 'circle', 'rectangle', etc
 * @param {Array} points - drawn points
 * @returns {Object} { type, center, width, height, radius, points, angle }
 */
export const fitGeometry = (type, points) => {
    const obb = getOBB(points);

    // --- 1. Rectangle / Square ---
    if (type === 'rectangle' || type === 'square') {
        const size = (obb.width + obb.height) / 2;
        return {
            type: 'rectangle',
            center: obb.center,
            width: type === 'square' ? size : obb.width,
            height: type === 'square' ? size : obb.height,
            angle: obb.angle,
            isOpen: false
        };
    }

    // --- 2. Circle / Ellipse ---
    if (type === 'circle' || type === 'ellipse') {
        const radius = (obb.width + obb.height) / 4;
        if (type === 'circle') {
            return { type, center: obb.center, radius, width: radius * 2, height: radius * 2, isOpen: false };
        }
        return { type, center: obb.center, width: obb.width, height: obb.height, angle: obb.angle, isOpen: false };
    }

    // --- 3. Triangle (Fitted Hull) ---
    if (type === 'triangle') {
        const polyArr = points.map(p => [p.x, p.y]);
        const hull = geometric.polygonHull(polyArr);
        if (hull && hull.length >= 3) {
            const hullPoints = hull.map(h => ({ x: h[0], y: h[1] }));

            // For TRIANGLES: Find 3 points in hull that maximize the triangle area
            // This is more robust than simple simplification for 3-sided shapes.
            let maxArea = -1;
            let bestVertices = [];

            // Sampling for performance
            const limit = hullPoints.length > 60 ? 60 : hullPoints.length;
            const step = Math.max(1, Math.floor(hullPoints.length / limit));
            const sampled = [];
            for (let i = 0; i < hullPoints.length; i += step) sampled.push(hullPoints[i]);

            for (let i = 0; i < sampled.length; i++) {
                for (let j = i + 1; j < sampled.length; j++) {
                    for (let k = j + 1; k < sampled.length; k++) {
                        const p1 = sampled[i], p2 = sampled[j], p3 = sampled[k];
                        const area = 0.5 * Math.abs(p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y));
                        if (area > maxArea) {
                            maxArea = area;
                            bestVertices = [p1, p2, p3];
                        }
                    }
                }
            }

            if (bestVertices.length === 3) {
                return {
                    type: 'triangle',
                    points: bestVertices,
                    center: obb.center,
                    width: obb.width,
                    height: obb.height,
                    angle: obb.angle,
                    isOpen: false
                };
            }
        }
        // Fallback: 3-sided regular polygon if hull fails
        return { type: 'polygon', sides: 3, center: obb.center, width: obb.width, height: obb.height, angle: obb.angle, isOpen: false };
    }

    // --- 4. Other Geometric Polygons (Diamond, Pentagon, etc.) ---
    if (['diamond', 'pentagon', 'hexagon', 'octagon', 'polygon'].includes(type)) {
        let sides = 5;
        if (type === 'diamond') sides = 4;
        else if (type === 'pentagon') sides = 5;
        else if (type === 'hexagon') sides = 6;
        else if (type === 'octagon') sides = 8;

        return {
            type: type === 'diamond' ? 'diamond' : 'polygon',
            sides: sides,
            // Preserve drawn points ONLY for generic 'polygon' so it's not forced to regular
            ...(type === 'polygon' ? { shapePoints: points } : {}),
            center: obb.center,
            width: obb.width,
            height: obb.height,
            angle: obb.angle,
            isOpen: false
        };
    }

    // --- 5. Open Shapes (Line, Arrow, Cross) ---
    if (type === 'line' || type === 'arrow' || type === 'cross') {
        const angle = getPCA(points);
        const cos = Math.cos(-angle), sin = Math.sin(-angle);
        const pivot = points[0];

        let minT = Infinity, maxT = -Infinity;
        let minP = null, maxP = null;

        for (const p of points) {
            const t = (p.x - pivot.x) * cos - (p.y - pivot.y) * sin;
            if (t < minT) { minT = t; minP = p; }
            if (t > maxT) { maxT = t; maxP = p; }
        }

        if (type === 'arrow') {
            const dMinStart = getDist(minP, points[0]);
            const dMaxStart = getDist(maxP, points[0]);
            const basePoint = dMinStart < dMaxStart ? minP : maxP;
            const tipPoint = dMinStart < dMaxStart ? maxP : minP;
            const dist1ToFirst = Math.hypot(basePoint.x - points[0].x, basePoint.y - points[0].y);
            const dist2ToFirst = Math.hypot(tipPoint.x - points[0].x, tipPoint.y - points[0].y);
            const base = dist1ToFirst < dist2ToFirst ? basePoint : tipPoint;
            const tip = dist1ToFirst < dist2ToFirst ? tipPoint : basePoint;

            return {
                type,
                points: [base, tip],
                isOpen: true,
                center: { x: (base.x + tip.x) / 2, y: (base.y + tip.y) / 2 }
            };
        }

        const p1 = points[0];
        const p2 = points[points.length - 1];
        return {
            type,
            points: [p1, p2],
            isOpen: true,
            center: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
        };
    }

    // Fallback: if API returned something unrecognized, try to detect if it's a closed polygon
    const closedThreshold = 50;
    const isClosedStroke = Math.hypot(points[0].x - points[points.length - 1].x, points[0].y - points[points.length - 1].y) < closedThreshold;

    if (isClosedStroke && points.length >= 10) {
        console.log('[ShapePro] Fallback: Treating as general polygon');
        const polyArr = points.map(p => [p.x, p.y]);
        const hull = geometric.polygonHull(polyArr);
        if (hull && hull.length >= 3) {
            let simplified = simplifyPolygon(hull.map(h => ({ x: h[0], y: h[1] })), 35);
            const perimeterLength = hull.reduce((sum, h, i) => {
                const next = hull[(i + 1) % hull.length];
                return sum + Math.hypot(next[0] - h[0], next[1] - h[1]);
            }, 0);
            const minDist = perimeterLength * 0.1;
            const filtered = [simplified[0]];
            for (let i = 1; i < simplified.length; i++) {
                const prev = filtered[filtered.length - 1];
                const curr = simplified[i];
                if (Math.hypot(curr.x - prev.x, curr.y - prev.y) >= minDist) {
                    filtered.push(curr);
                }
            }
            const sides = Math.max(3, Math.min(12, filtered.length));
            return { type: 'polygon', sides, center: obb.center, width: obb.width, height: obb.height, angle: obb.angle, isOpen: false };
        }
    }

    return null;
};

/**
 * Generates equidistant points for a perfect polygon
 * Used for rendering a sharp SVG path from a geometric shape object
 */
export const generateFittedPoints = (shape) => {
    const { type, center, width, height, radius, points: shapePoints, angle = 0 } = shape;
    const density = 2; // px between points

    const rotate = (p, c, a) => ({
        x: c.x + (p.x * Math.cos(a) - p.y * Math.sin(a)),
        y: c.y + (p.x * Math.sin(a) + p.y * Math.cos(a))
    });

    if (type === 'circle') {
        const perimeter = 2 * Math.PI * radius;
        const steps = Math.ceil(perimeter / density);
        const pts = [];
        for (let i = 0; i <= steps; i++) {
            const t = (i / steps) * 2 * Math.PI;
            pts.push({ x: center.x + Math.cos(t) * radius, y: center.y + Math.sin(t) * radius, pressure: 0.5 });
        }
        return pts;
    }

    if (type === 'rectangle') {
        const hw = width / 2, hh = height / 2;
        const corners = [
            { x: -hw, y: -hh }, { x: hw, y: -hh }, { x: hw, y: hh }, { x: -hw, y: hh }
        ].map(p => rotate(p, center, angle));
        return interpolatePoints([...corners, corners[0]], density);
    }

    if (type === 'diamond') {
        const hw = width / 2, hh = height / 2;
        const corners = [
            { x: 0, y: -hh }, { x: hw, y: 0 }, { x: 0, y: hh }, { x: -hw, y: 0 }
        ].map(p => rotate(p, center, angle));
        return interpolatePoints([...corners, corners[0]], density);
    }


    if (type === 'polygon') {
        // [FIX] Use shapePoints if present (the actual hull/simplified points) instead of generating a regular n-gon
        if (shapePoints && shapePoints.length >= 3) {
            return interpolatePoints([...shapePoints, shapePoints[0]], density);
        }

        // Fallback to Regular polygon if no specific points provided
        const sides = shape.sides || 5;
        const radius = (width + height) / 4;
        const corners = [];
        for (let i = 0; i < sides; i++) {
            const t = (i / sides) * 2 * Math.PI - Math.PI / 2; // Start from top
            corners.push(rotate({ x: radius * Math.cos(t), y: radius * Math.sin(t) }, center, angle));
        }
        return interpolatePoints([...corners, corners[0]], density);
    }

    if (type === 'line' || type === 'triangle' || type === 'bracket') {
        const pts = type === 'triangle' ? [...shapePoints, shapePoints[0]] : shapePoints;
        return interpolatePoints(pts, density);
    }

    if (type === 'arrow') {
        const p1 = shapePoints[0], p2 = shapePoints[1];
        const a = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const shaftLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        // Arrowhead size: ~12% of shaft, minimum 12px, maximum 30px
        const headLen = Math.max(12, Math.min(30, shaftLen * 0.12));
        const h1 = { x: p2.x - headLen * Math.cos(a - Math.PI / 6), y: p2.y - headLen * Math.sin(a - Math.PI / 6) };
        const h2 = { x: p2.x - headLen * Math.cos(a + Math.PI / 6), y: p2.y - headLen * Math.sin(a + Math.PI / 6) };

        // Path: shaft ends at p2, then h1, back to p2, then h2 (proper V shape)
        const shaft = interpolatePoints([p1, p2], density);
        return [
            ...shaft,
            { ...h1, pressure: 0.5 },
            { ...p2, pressure: 0.5 },
            { ...h2, pressure: 0.5 }
        ];
    }

    // Fallback: for types without specific rendering, return original shape points or log warning
    console.warn('[ShapePro] Unhandled shape type in generateFittedPoints:', type);
    return interpolatePoints(shapePoints, density);
};

// V4: Transform existing shape points (for manipulation)
/**
 * transforms raw shape points based on scale and rotation
 */
export const transformShapePoints = (originalShape, scaleFactor, rotationDelta) => {
    // Clone shape to avoid mutating original
    const newShape = { ...originalShape };

    // Apply rotation
    if (newShape.angle !== undefined) {
        newShape.angle = (newShape.angle || 0) + rotationDelta;
    }

    // Apply scale (width, height, radius)
    if (newShape.width) newShape.width = originalShape.width * scaleFactor;
    if (newShape.height) newShape.height = originalShape.height * scaleFactor;
    if (newShape.radius) newShape.radius = originalShape.radius * scaleFactor;

    // V4.1: Generic Point Transformation for any shape defined by points (Arrow, Triangle, Line, Polygon)
    // Support both property names as fitGeometry returns 'points' but we might have set 'shapePoints'
    const pointsToTransform = originalShape.points || originalShape.shapePoints;

    if (pointsToTransform && pointsToTransform.length > 0) {
        // Use the original center as the pivot point for all transformations
        const center = originalShape.center;

        if (center) {
            const transformPoint = (p) => {
                const dx = p.x - center.x;
                const dy = p.y - center.y;
                // Scale from center
                const sx = dx * scaleFactor;
                const sy = dy * scaleFactor;
                // Rotate around center
                const rx = sx * Math.cos(rotationDelta) - sy * Math.sin(rotationDelta);
                const ry = sx * Math.sin(rotationDelta) + sy * Math.cos(rotationDelta);
                return { x: center.x + rx, y: center.y + ry };
            };

            const newPoints = pointsToTransform.map(transformPoint);
            newShape.points = newPoints;
            newShape.shapePoints = newPoints;
        }
    }

    // For polygons with points array (like triangles), scale points relative to center
    if (newShape.type === 'polygon' && originalShape.points) {
        // ... (not fully implemented for generic polygons yet, relying on width/height/angle for now)
    }

    return generateFittedPoints(newShape);
};
/**
 * LIVE SHAPE GENERATION
 * Creates a shape based on a start point (center) and current mouse point (scale/rotation)
 */
export const generateLiveShapePoints = (type, startPt, currentPt) => {
    const dx = currentPt.x - startPt.x;
    const dy = currentPt.y - startPt.y;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    let shapeObj = null;

    if (type === 'circle') {
        shapeObj = { type: 'circle', center: startPt, radius: dist };
    } else if (type === 'rectangle') {
        shapeObj = { type: 'rectangle', center: startPt, width: dist * 2, height: dist * 1.5, angle };
    } else if (type === 'diamond') {
        shapeObj = { type: 'diamond', center: startPt, width: dist * 2, height: dist * 2, angle };
    } else if (type === 'pentagon') {
        shapeObj = { type: 'polygon', sides: 5, center: startPt, width: dist * 2, height: dist * 2, angle: angle + Math.PI / 2 };
    } else if (type === 'triangle') {
        shapeObj = { type: 'polygon', sides: 3, center: startPt, width: dist * 2, height: dist * 2, angle: angle + Math.PI / 2 };
    } else if (type === 'line') {
        shapeObj = { type: 'line', points: [startPt, currentPt], isOpen: true };
    } else if (type === 'arrow') {
        shapeObj = { type: 'arrow', points: [startPt, currentPt], isOpen: true };
    }

    if (!shapeObj) return null;
    return generateFittedPoints(shapeObj);
};
