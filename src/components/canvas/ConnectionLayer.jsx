import React from 'react';
import { Group, Path, Circle } from 'react-konva';
import { resolveColor, getAnchorPointById } from './CanvasUtils';

const ConnectionLayer = ({ connections, allBlocks, tempConnection, scale, onSelect, selectedIds = [], hoveredId }) => {

    const getAnchorPoint = (blockId, side) => {
        return getAnchorPointById(blockId, side, allBlocks, hoveredId);
    };

    const renderMarker = (type, x, y, angle, color) => {
        const size = 6;
        const deg = angle * 180 / Math.PI;
        if (type === 'arrow') {
            return (
                <Path
                    data={`M ${x - size} ${y - size} L ${x + size * 1.5} ${y} L ${x - size} ${y + size} Z`}
                    fill={color}
                    rotation={deg}
                    offsetX={x}
                    offsetY={y}
                    x={x}
                    y={y}
                />
            );
        }
        if (type === 'circle') {
            return <Circle x={x} y={y} radius={size} fill={color} />;
        }
        if (type === 'diamond') {
            return (
                <Path
                    data={`M ${x - size} ${y} L ${x} ${y - size} L ${x + size} ${y} L ${x} ${y + size} Z`}
                    fill={color}
                    rotation={deg}
                    offsetX={x}
                    offsetY={y}
                    x={x}
                    y={y}
                />
            );
        }
        return null;
    };

    const renderConnection = (conn) => {
        const start = getAnchorPoint(conn.fromId, conn.fromSide);
        const end = getAnchorPoint(conn.toId, conn.toSide);

        if (!start || !end || isNaN(start.x) || isNaN(start.y) || isNaN(end.x) || isNaN(end.y)) return null;

        const dist = Math.hypot(end.x - start.x, end.y - start.y);
        const controlDist = Math.max(dist * 0.5, 50);

        let cp1 = { x: start.x, y: start.y };
        let cp2 = { x: end.x, y: end.y };

        if (conn.fromSide === 'top') cp1.y -= controlDist;
        if (conn.fromSide === 'bottom') cp1.y += controlDist;
        if (conn.fromSide === 'left') cp1.x -= controlDist;
        if (conn.fromSide === 'right') cp1.x += controlDist;

        if (conn.toSide === 'top') cp2.y -= controlDist;
        if (conn.toSide === 'bottom') cp2.y += controlDist;
        if (conn.toSide === 'left') cp2.x -= controlDist;
        if (conn.toSide === 'right') cp2.x += controlDist;

        const d = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;
        const angleStart = Math.atan2(cp1.y - start.y, cp1.x - start.x);
        const angleEnd = Math.atan2(end.y - cp2.y, end.x - cp2.x);

        const isSelected = selectedIds.includes(conn.id);
        const baseColor = resolveColor(conn.color || 'var(--text-primary)', document.body.dataset.theme === 'dark');
        const color = baseColor;
        const width = 2; // Base Width

        const strokeDash = conn.lineStyle === 'dashed' ? [8, 6] : (conn.lineStyle === 'dotted' ? [3, 4] : null);

        return (
            <Group
                key={conn.id}
                onClick={(e) => {
                    e.cancelBubble = true;
                    if (onSelect) onSelect(conn.id, e.evt.shiftKey);
                }}
                onTap={(e) => {
                    e.cancelBubble = true;
                    if (onSelect) onSelect(conn.id, e.evt.shiftKey);
                }}
            >
                {/* Destaque de Seleção (Aura/Contorno) */}
                {isSelected && (
                    <Path
                        data={d}
                        stroke="#6366f1"
                        strokeWidth={8 / scale}
                        opacity={0.6}
                        lineCap="round"
                        lineJoin="round"
                        dash={[6, 6]}
                        listening={false}
                    />
                )}

                {/* Hit Area (Invisible, wider) */}
                <Path data={d} stroke="transparent" strokeWidth={15 / scale} fill="transparent" listening={true} />

                {/* Visible Path */}
                <Path data={d} stroke={color} strokeWidth={width / scale} fill="transparent" dash={strokeDash} listening={false} />

                {/* Start Marker (Default: Dot or None) */}
                {conn.startMarker && conn.startMarker !== 'none' ? renderMarker(conn.startMarker, start.x, start.y, angleStart + Math.PI, color) : <Circle x={start.x} y={start.y} radius={3 / scale} fill={color} />}

                {/* End Marker (Default: Arrow) */}
                {renderMarker(conn.endMarker || 'arrow', end.x, end.y, angleEnd, color)}
            </Group>
        );
    };

    const renderTempConnection = () => {
        if (!tempConnection) return null;
        const { fromId, fromSide, tempX, tempY } = tempConnection;
        const start = getAnchorPoint(fromId, fromSide);
        const end = { x: tempX, y: tempY };

        if (!start || !end || isNaN(start.x) || isNaN(start.y) || isNaN(end.x) || isNaN(end.y)) return null;

        const dist = Math.hypot(end.x - start.x, end.y - start.y);
        const controlDist = Math.max(dist * 0.5, 50);

        let cp1 = { x: start.x, y: start.y };
        let cp2 = { x: end.x, y: end.y };

        if (fromSide === 'top') cp1.y -= controlDist;
        if (fromSide === 'bottom') cp1.y += controlDist;
        if (fromSide === 'left') cp1.x -= controlDist;
        if (fromSide === 'right') cp1.x += controlDist;

        const d = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;
        const angle = Math.atan2(end.y - cp2.y, end.x - cp2.x);

        return (
            <Group listening={false}>
                <Path data={d} stroke="#6366f1" strokeWidth={2 / scale} dash={[5, 5]} fill="transparent" />
                {renderMarker('arrow', end.x, end.y, angle, "#6366f1")}
            </Group>
        );
    };

    return (
        <Group>
            {/* Layer 1: Permanent Connections */}
            {connections.map(renderConnection)}

            {/* Layer 2: Temporary Connection */}
            {renderTempConnection()}
        </Group>
    );
};

export default ConnectionLayer;
