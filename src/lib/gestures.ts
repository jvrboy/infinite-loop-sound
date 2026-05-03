// Detect drawn gesture: circle, spiral, line-h, line-v, zigzag, star, smudge.
export type Gesture =
  | { type: "circle"; size: number; cx: number; cy: number }
  | { type: "spiral"; turns: number; direction: "in" | "out" }
  | { type: "line-h"; length: number; y: number }
  | { type: "line-v"; height: number; x: number }
  | { type: "zigzag"; peaks: number }
  | { type: "star"; points: number }
  | { type: "smudge"; coverage: number };

interface Pt { x: number; y: number; }

export function detectGesture(path: Pt[], _w: number, _h: number): Gesture | null {
  if (path.length < 6) return null;

  const xs = path.map((p) => p.x);
  const ys = path.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const dw = maxX - minX, dh = maxY - minY;

  // Path length
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x, dy = path[i].y - path[i - 1].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  const span = Math.max(dw, dh);

  // Closed loop?
  const startEnd = Math.hypot(path[0].x - path[path.length - 1].x, path[0].y - path[path.length - 1].y);
  const closed = startEnd < span * 0.25;

  // Direction changes (zigzag)
  let dirChanges = 0;
  let prevSign = 0;
  for (let i = 1; i < path.length; i++) {
    const dy = path[i].y - path[i - 1].y;
    const sign = Math.sign(dy);
    if (sign !== 0 && sign !== prevSign) { dirChanges++; prevSign = sign; }
  }

  // Aspect ratio
  const aspect = dw / Math.max(1, dh);

  // Smudge: lots of path in small area
  if (total > span * 5 && span < 250) return { type: "smudge", coverage: span / 200 };

  // Circle: closed and roughly square bounding box
  if (closed && aspect > 0.6 && aspect < 1.7) {
    // Spiral if path length is much greater than circumference
    const circ = Math.PI * span;
    if (total > circ * 1.7) {
      return { type: "spiral", turns: total / circ, direction: "in" };
    }
    return { type: "circle", size: span, cx, cy };
  }

  // Star: many sharp turns and closed
  if (closed && dirChanges >= 8) return { type: "star", points: Math.round(dirChanges / 2) };

  // Zigzag
  if (dirChanges >= 6 && aspect > 1.5) return { type: "zigzag", peaks: Math.round(dirChanges / 2) };

  // Line
  if (aspect > 3) return { type: "line-h", length: dw, y: cy };
  if (aspect < 0.33) return { type: "line-v", height: dh, x: cx };

  return { type: "circle", size: span, cx, cy };
}
