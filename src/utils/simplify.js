/**
 * Algoritmo Ramer-Douglas-Peucker (RDP) para simplificação de curvas vetoriais.
 * Reduz a quantidade de pontos redundantes mantendo a fidelidade visual.
 * 
 * @param {Array<{x: number, y: number, pressure?: number}>} points - Lista de pontos do traço
 * @param {number} epsilon - Tolerância de simplificação (quanto maior, mais simplificado)
 * @returns {Array<{x: number, y: number, pressure?: number}>}
 */
export function simplifyPoints(points, epsilon = 0.5) {
  if (points.length <= 2) return points;

  let maxSqDist = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const sqDist = getSqSegDist(points[i], points[0], points[end]);
    if (sqDist > maxSqDist) {
      index = i;
      maxSqDist = sqDist;
    }
  }

  if (maxSqDist > epsilon * epsilon) {
    const results1 = simplifyPoints(points.slice(0, index + 1), epsilon);
    const results2 = simplifyPoints(points.slice(index), epsilon);
    return results1.slice(0, results1.length - 1).concat(results2);
  }

  return [points[0], points[end]];
}

// Distância quadrática perpendicular de um ponto a um segmento de reta
function getSqSegDist(p, p1, p2) {
  let x = p1.x;
  let y = p1.y;
  let dx = p2.x - x;
  let dy = p2.y - y;

  if (dx !== 0 || dy !== 0) {
    const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = p2.x;
      y = p2.y;
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = p.x - x;
  dy = p.y - y;

  return dx * dx + dy * dy;
}
