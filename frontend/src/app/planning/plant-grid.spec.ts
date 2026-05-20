import { plantPositions, CELL_CM } from './plant-grid';

describe('plant-grid', () => {
  it('exposes a 5cm cell', () => {
    expect(CELL_CM).toBe(5);
  });

  it('fills a bed at recommended spacing (30cm in a 1m x 1m bed)', () => {
    // 1m bed = 20 cells; 30cm spacing = 6 cells. Interior packing -> 3 x 3.
    const pos = plantPositions(0, 0, 19, 19, 20, 20, 30, 30, 1);
    expect(pos.length).toBe(9);
  });

  it('packs more plants when spacing is reduced', () => {
    const full = plantPositions(0, 0, 19, 19, 20, 20, 30, 30, 1).length;
    const tight = plantPositions(0, 0, 19, 19, 20, 20, 30, 30, 0.5).length;
    expect(tight).toBeGreaterThan(full);
  });

  it('falls back to one centred plant when the area is tiny', () => {
    const pos = plantPositions(0, 0, 0, 0, 20, 20, 30, 30, 1);
    expect(pos).toEqual([{ col: 0, row: 0 }]);
  });

  it('picks the denser orientation for asymmetric plant spacing', () => {
    // 30x20-cell bed, spacingCm=30 (sCol=6), rowSpacingCm=20 (sRow=4):
    // swapping col/row spacing yields 21 plants vs 16 -> denser wins.
    const pos = plantPositions(0, 0, 29, 19, 30, 20, 30, 20, 1);
    expect(pos.length).toBe(21);
  });
});
