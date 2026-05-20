export const CELL_CM = 5;

/**
 * Positions a plant would occupy in a sub-area of a bed, at a given spacing
 * factor, honouring the bed-edge margins. Tries both orientations and keeps
 * the denser one. Pure — identical maths to the bed planner.
 */
export function plantPositions(
  minCol: number, minRow: number, maxCol: number, maxRow: number,
  bedCols: number, bedRows: number,
  spacingCm: number, rowSpacingCm: number, factor: number, cellCm = CELL_CM,
): { col: number; row: number }[] {
  const sCol = Math.max(1, Math.round((spacingCm * factor) / cellCm));
  const sRow = Math.max(1, Math.round((rowSpacingCm * factor) / cellCm));
  const a = grid(minCol, minRow, maxCol, maxRow, sCol, sRow, bedCols, bedRows);
  const b = sCol !== sRow ? grid(minCol, minRow, maxCol, maxRow, sRow, sCol, bedCols, bedRows) : [];
  return a.length >= b.length ? a : b;
}

function grid(
  minCol: number, minRow: number, maxCol: number, maxRow: number,
  colSpacing: number, rowSpacing: number, bedCols: number, bedRows: number,
): { col: number; row: number }[] {
  const halfCol = Math.ceil(colSpacing / 2);
  const halfRow = Math.ceil(rowSpacing / 2);
  const effMinCol = Math.max(minCol, halfCol);
  const effMaxCol = Math.min(maxCol, bedCols - 1 - halfCol);
  const effMinRow = Math.max(minRow, halfRow);
  const effMaxRow = Math.min(maxRow, bedRows - 1 - halfRow);
  if (effMinCol > effMaxCol || effMinRow > effMaxRow) {
    return [{ col: Math.round((minCol + maxCol) / 2), row: Math.round((minRow + maxRow) / 2) }];
  }
  const zoneCols = effMaxCol - effMinCol + 1;
  const zoneRows = effMaxRow - effMinRow + 1;
  const nCols = Math.floor((zoneCols - 1) / colSpacing) + 1;
  const nRows = Math.floor((zoneRows - 1) / rowSpacing) + 1;
  const offsetCol = Math.floor((zoneCols - 1 - (nCols - 1) * colSpacing) / 2);
  const offsetRow = Math.floor((zoneRows - 1 - (nRows - 1) * rowSpacing) / 2);
  const out: { col: number; row: number }[] = [];
  for (let ri = 0; ri < nRows; ri++) {
    for (let ci = 0; ci < nCols; ci++) {
      out.push({ col: effMinCol + offsetCol + ci * colSpacing, row: effMinRow + offsetRow + ri * rowSpacing });
    }
  }
  return out;
}
