import { plantPositions, CELL_CM } from './plant-grid';

export interface ZoneInput {
  minCol: number;
  minRow: number;
  maxCol: number;
  maxRow: number;
  spacingFactor: number;
  spacingCm: number;
  rowSpacingCm: number;
}

export interface BedZoneView<Z extends ZoneInput> {
  zone: Z;
  spots: { col: number; row: number }[];
}

/**
 * For an ordered list of zones in one bed, compute each zone's plant spots,
 * suppressing spots that fall within spacing distance of plants already placed
 * by an earlier zone. Mirrors the bed planner's zoneViews exactly.
 */
export function computeBedZoneViews<Z extends ZoneInput>(zones: Z[], bedCols: number, bedRows: number): BedZoneView<Z>[] {
  const placed: { col: number; row: number; sCells: number; rCells: number }[] = [];
  const views: BedZoneView<Z>[] = [];
  for (const zone of zones) {
    const f = zone.spacingFactor ?? 1;
    const sCells = Math.max(1, Math.round((zone.spacingCm * f) / CELL_CM));
    const rCells = Math.max(1, Math.round((zone.rowSpacingCm * f) / CELL_CM));
    const candidates = plantPositions(zone.minCol, zone.minRow, zone.maxCol, zone.maxRow, bedCols, bedRows, zone.spacingCm, zone.rowSpacingCm, f);
    const spots = candidates.filter(
      (pos) => !placed.some((pl) => {
        const minDx = (sCells + pl.sCells) / 2;
        const minDy = (rCells + pl.rCells) / 2;
        return Math.abs(pos.col - pl.col) < minDx && Math.abs(pos.row - pl.row) < minDy;
      }),
    );
    for (const s of spots) placed.push({ col: s.col, row: s.row, sCells, rCells });
    views.push({ zone, spots });
  }
  return views;
}
