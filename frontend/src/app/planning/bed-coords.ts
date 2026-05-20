import { CELL_CM } from './plant-grid';

export interface BedRect {
  xM: number;
  yM: number;
  widthM: number;
  lengthM: number;
  rotationDeg?: number;
}

export function bedColsRows(bed: BedRect, cellCm = CELL_CM): { cols: number; rows: number } {
  return {
    cols: Math.floor((bed.widthM * 100) / cellCm),
    rows: Math.floor((bed.lengthM * 100) / cellCm),
  };
}

/**
 * Top-left corner of a cell in garden metres, in the bed's UNROTATED frame.
 * Render inside the bed's rotated <g> so the rotation is applied automatically.
 */
export function cellTopLeftMeters(col: number, row: number, bed: BedRect, cellCm = CELL_CM): { x: number; y: number } {
  return { x: bed.xM + (col * cellCm) / 100, y: bed.yM + (row * cellCm) / 100 };
}

/**
 * Garden-space point (metres) -> bed-local cell, inverse-rotating around the bed
 * centre (SVG rotate is parent = R(a)(p-c)+c, so the inverse is R(-a)).
 * Returns null if the point is outside the bed.
 */
export function bedCellAtPoint(point: { x: number; y: number }, bed: BedRect, cellCm = CELL_CM): { col: number; row: number } | null {
  const cx = bed.xM + bed.widthM / 2;
  const cy = bed.yM + bed.lengthM / 2;
  const a = ((bed.rotationDeg ?? 0) * Math.PI) / 180;
  const dx = point.x - cx;
  const dy = point.y - cy;
  const lx = cx + dx * Math.cos(a) + dy * Math.sin(a);
  const ly = cy - dx * Math.sin(a) + dy * Math.cos(a);
  const { cols, rows } = bedColsRows(bed, cellCm);
  const col = Math.floor(((lx - bed.xM) * 100) / cellCm);
  const row = Math.floor(((ly - bed.yM) * 100) / cellCm);
  if (col < 0 || row < 0 || col >= cols || row >= rows) return null;
  return { col, row };
}
