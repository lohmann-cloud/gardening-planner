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

/** Inclusive-bounds rectangle overlap on the cell grid. */
export function zonesOverlap(a: ZoneCells, b: ZoneCells): boolean {
  return a.minCol <= b.maxCol && a.maxCol >= b.minCol && a.minRow <= b.maxRow && a.maxRow >= b.minRow;
}
