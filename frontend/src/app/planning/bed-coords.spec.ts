import { bedColsRows, cellTopLeftMeters, bedCellAtPoint, BedRect } from './bed-coords';

// Forward rotation (matches SVG rotate(deg, cx, cy)): parent = R(a)*(p-c)+c
function forward(p: { x: number; y: number }, cx: number, cy: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  const dx = p.x - cx, dy = p.y - cy;
  return { x: cx + dx * Math.cos(a) - dy * Math.sin(a), y: cy + dx * Math.sin(a) + dy * Math.cos(a) };
}

describe('bed-coords', () => {
  const bed: BedRect = { xM: 1, yM: 1, widthM: 1, lengthM: 1, rotationDeg: 0 };

  it('derives cols/rows from bed size at 5cm', () => {
    expect(bedColsRows(bed)).toEqual({ cols: 20, rows: 20 });
  });

  it('maps a point to a cell in an unrotated bed', () => {
    expect(bedCellAtPoint({ x: 1.275, y: 1.275 }, bed)).toEqual({ col: 5, row: 5 });
  });

  it('returns null outside the bed', () => {
    expect(bedCellAtPoint({ x: 0.5, y: 0.5 }, bed)).toBeNull();
    expect(bedCellAtPoint({ x: 5, y: 5 }, bed)).toBeNull();
  });

  it('round-trips through rotation', () => {
    const rbed: BedRect = { xM: 2, yM: 1, widthM: 2, lengthM: 1, rotationDeg: 35 };
    const cx = rbed.xM + rbed.widthM / 2, cy = rbed.yM + rbed.lengthM / 2;
    const tl = cellTopLeftMeters(7, 3, rbed);
    const centre = { x: tl.x + 0.025, y: tl.y + 0.025 };
    const screenPoint = forward(centre, cx, cy, 35);
    expect(bedCellAtPoint(screenPoint, rbed)).toEqual({ col: 7, row: 3 });
  });
});
