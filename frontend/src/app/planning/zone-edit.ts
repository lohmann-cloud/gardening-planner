/** A planting zone as inclusive cell bounds within a bed grid. */
export interface ZoneCells {
  minCol: number;
  minRow: number;
  maxCol: number;
  maxRow: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Shift the whole zone by (dCol,dRow) cells, clamped so it stays inside cols×rows. */
export function moveZone(zone: ZoneCells, dCol: number, dRow: number, cols: number, rows: number): ZoneCells {
  const w = zone.maxCol - zone.minCol;
  const h = zone.maxRow - zone.minRow;
  const minCol = clamp(zone.minCol + dCol, 0, cols - 1 - w);
  const minRow = clamp(zone.minRow + dRow, 0, rows - 1 - h);
  return { minCol, minRow, maxCol: minCol + w, maxRow: minRow + h };
}

export type ZoneEdge = 'left' | 'right' | 'top' | 'bottom';

/** Drag one edge to a new cell index, keeping ≥1 cell and staying inside the grid. */
export function resizeZoneEdge(zone: ZoneCells, edge: ZoneEdge, toCell: number, cols: number, rows: number): ZoneCells {
  const r = { ...zone };
  switch (edge) {
    case 'left':   r.minCol = clamp(Math.min(toCell, r.maxCol), 0, r.maxCol); break;
    case 'right':  r.maxCol = clamp(Math.max(toCell, r.minCol), r.minCol, cols - 1); break;
    case 'top':    r.minRow = clamp(Math.min(toCell, r.maxRow), 0, r.maxRow); break;
    case 'bottom': r.maxRow = clamp(Math.max(toCell, r.minRow), r.minRow, rows - 1); break;
  }
  return r;
}

/** Inclusive-bounds rectangle overlap on the cell grid. */
export function zonesOverlap(a: ZoneCells, b: ZoneCells): boolean {
  return a.minCol <= b.maxCol && a.maxCol >= b.minCol && a.minRow <= b.maxRow && a.maxRow >= b.minRow;
}
