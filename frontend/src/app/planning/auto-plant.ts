import { plantPositions, CELL_CM } from './plant-grid';

export interface AutoPlantPlant {
  id: string;
  name: string;
  spacingCm: number;
  rowSpacingCm: number;
}
export interface AutoPlantBed {
  id: string;
  cols: number;
  rows: number;
  occupied: Set<string>; // "col,row"
}
export interface AutoPlantItem {
  plant: AutoPlantPlant;
  quantity: number;
}
export interface AutoPlantZone {
  bedId: string;
  plantId: string;
  minCol: number;
  minRow: number;
  maxCol: number;
  maxRow: number;
  spacingFactor: number;
  plantCount: number;
}
export interface AutoPlantResult {
  zones: AutoPlantZone[];
  spacingFactor: number;
  unplaced: { plantId: string; plantName: string; count: number }[];
}

interface Rect { bedId: string; cols: number; rows: number; col: number; row: number; w: number; h: number; }

/** Decompose a bed's free cells into disjoint rectangles, largest first. */
function freeRectangles(bed: AutoPlantBed): Rect[] {
  const occ: boolean[][] = [];
  for (let r = 0; r < bed.rows; r++) {
    occ[r] = [];
    for (let c = 0; c < bed.cols; c++) occ[r][c] = bed.occupied.has(`${c},${r}`);
  }
  const rects: Rect[] = [];
  for (;;) {
    const best = largestEmptyRect(occ, bed.rows, bed.cols);
    if (!best || best.w === 0 || best.h === 0) break;
    rects.push({ bedId: bed.id, cols: bed.cols, rows: bed.rows, col: best.c, row: best.r, w: best.w, h: best.h });
    for (let r = best.r; r < best.r + best.h; r++)
      for (let c = best.c; c < best.c + best.w; c++) occ[r][c] = true;
  }
  return rects;
}

/** Largest all-free axis-aligned rectangle (maximal-rectangle histogram DP). */
function largestEmptyRect(occ: boolean[][], rows: number, cols: number) {
  const height = new Array<number>(cols).fill(0);
  let best: { area: number; r: number; c: number; h: number; w: number } | null = null;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) height[c] = occ[r][c] ? 0 : height[c] + 1;
    const stack: number[] = [];
    for (let c = 0; c <= cols; c++) {
      const h = c === cols ? 0 : height[c];
      while (stack.length && height[stack[stack.length - 1]] >= h) {
        const top = stack.pop()!;
        const hh = height[top];
        const left = stack.length ? stack[stack.length - 1] + 1 : 0;
        const w = c - left;
        const area = hh * w;
        if (hh > 0 && w > 0 && (!best || area > best.area)) {
          best = { area, r: r - hh + 1, c: left, h: hh, w };
        }
      }
      stack.push(c);
    }
  }
  return best;
}

function rectCount(rect: Rect, p: AutoPlantPlant, f: number, w: number, h: number): number {
  return plantPositions(rect.col, rect.row, rect.col + w - 1, rect.row + h - 1, rect.cols, rect.rows, p.spacingCm, p.rowSpacingCm, f).length;
}

/** Split a rect after carving a top-left sub-rect (w x h). Right strip + bottom strip. */
function guillotine(rect: Rect, w: number, h: number): Rect[] {
  const out: Rect[] = [];
  if (rect.w - w > 0) out.push({ ...rect, col: rect.col + w, w: rect.w - w, h });
  if (rect.h - h > 0) out.push({ ...rect, row: rect.row + h, h: rect.h - h });
  return out;
}

function packAtFactor(allRects: Rect[], items: AutoPlantItem[], f: number) {
  const pool: Rect[] = allRects.map((r) => ({ ...r }));
  const zones: AutoPlantZone[] = [];
  const unplaced: AutoPlantResult['unplaced'] = [];
  const blockArea = (it: AutoPlantItem) =>
    it.quantity * Math.max(1, Math.round((it.plant.spacingCm * f) / CELL_CM)) * Math.max(1, Math.round((it.plant.rowSpacingCm * f) / CELL_CM));
  const sorted = [...items].sort((a, b) => blockArea(b) - blockArea(a));

  for (const item of sorted) {
    const p = item.plant;
    const sCol = Math.max(1, Math.round((p.spacingCm * f) / CELL_CM));
    const sRow = Math.max(1, Math.round((p.rowSpacingCm * f) / CELL_CM));
    let remaining = item.quantity;

    while (remaining > 0) {
      // Pick the pool rect with the most capacity for this plant.
      let bi = -1;
      let bestCap = 0;
      for (let i = 0; i < pool.length; i++) {
        const cap = Math.floor(pool[i].w / sCol) * Math.floor(pool[i].h / sRow);
        if (cap > bestCap) { bestCap = cap; bi = i; }
      }
      if (bi < 0 || bestCap === 0) break; // nothing can hold even one plant

      const rect = pool[bi];
      const bCols = Math.floor(rect.w / sCol);
      const bRows = Math.floor(rect.h / sRow);
      let useCols = bCols;
      let useRows = bRows;
      if (remaining < bCols * bRows) {
        useCols = Math.min(bCols, Math.max(1, Math.ceil(Math.sqrt(remaining))));
        useRows = Math.min(bRows, Math.ceil(remaining / useCols));
        // Re-fit useCols now that useRows is clamped to the available rows.
        useCols = Math.min(bCols, Math.ceil(remaining / useRows));
      }
      const subW = useCols * sCol;
      const subH = useRows * sRow;
      const count = rectCount(rect, p, f, subW, subH);
      pool.splice(bi, 1, ...guillotine(rect, subW, subH));
      if (count <= 0) continue; // degenerate sub-rect; rect was consumed, try the rest

      zones.push({
        bedId: rect.bedId, plantId: p.id,
        minCol: rect.col, minRow: rect.row, maxCol: rect.col + subW - 1, maxRow: rect.row + subH - 1,
        spacingFactor: f, plantCount: Math.min(count, remaining),
      });
      remaining -= Math.min(count, remaining);
    }

    if (remaining > 0) unplaced.push({ plantId: p.id, plantName: p.name, count: remaining });
  }
  return { zones, unplaced };
}

/**
 * Pack the selected stock into the beds' free space. Uses the largest spacing
 * factor in [minSpacingFactor, 1] that fits everything; if none fits, uses the
 * minimum and reports the overflow.
 */
export function planInventory(
  beds: AutoPlantBed[], items: AutoPlantItem[], minSpacingFactor: number,
): AutoPlantResult {
  const live = items.filter((i) => i.quantity > 0);
  const rects = beds.flatMap((b) => freeRectangles(b));
  if (!live.length || !rects.length) {
    return { zones: [], spacingFactor: 1, unplaced: live.map((i) => ({ plantId: i.plant.id, plantName: i.plant.name, count: i.quantity })) };
  }
  // Spacing factors to try: 1.0 down to the minimum in 0.05 steps, with the
  // exact minimum guaranteed as the final fallback step.
  const factors: number[] = [];
  for (let f = 1; f > minSpacingFactor + 1e-9; f -= 0.05) factors.push(Math.round(f * 100) / 100);
  factors.push(Math.round(minSpacingFactor * 100) / 100);

  let last: ReturnType<typeof packAtFactor> | null = null;
  let lastFactor = factors[factors.length - 1];
  for (const fr of factors) {
    const attempt = packAtFactor(rects, live, fr);
    if (!attempt.unplaced.length) return { zones: attempt.zones, spacingFactor: fr, unplaced: [] };
    last = attempt;
    lastFactor = fr;
  }
  return { zones: last!.zones, spacingFactor: lastFactor, unplaced: last!.unplaced };
}
