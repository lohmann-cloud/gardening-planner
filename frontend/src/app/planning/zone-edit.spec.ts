import { describe, it, expect } from 'vitest';
import { ZoneCells, moveZone, resizeZoneEdge, zonesOverlap } from './zone-edit';

const z = (minCol: number, minRow: number, maxCol: number, maxRow: number): ZoneCells =>
  ({ minCol, minRow, maxCol, maxRow });

describe('moveZone', () => {
  it('verschiebt um den Zell-Versatz', () => {
    expect(moveZone(z(1, 1, 2, 3), 2, -1, 10, 10)).toEqual(z(3, 0, 4, 2));
  });
  it('klammert an die linke/obere Kante (0)', () => {
    expect(moveZone(z(0, 0, 2, 2), -5, -5, 10, 10)).toEqual(z(0, 0, 2, 2));
  });
  it('klammert an die rechte/untere Kante (cols-1/rows-1)', () => {
    // Zone 3 breit (cols 0..2) in 5-Spalten-Beet: max Versatz schiebt auf 2..4
    expect(moveZone(z(0, 0, 2, 0), 99, 99, 5, 4)).toEqual(z(2, 3, 4, 3));
  });
});

describe('resizeZoneEdge', () => {
  it('zieht die rechte Kante nach außen', () => {
    expect(resizeZoneEdge(z(1, 1, 2, 2), 'right', 4, 10, 10)).toEqual(z(1, 1, 4, 2));
  });
  it('verhindert ein Umklappen der Kante (min. 1 Zelle breit)', () => {
    expect(resizeZoneEdge(z(2, 1, 4, 2), 'left', 9, 10, 10)).toEqual(z(4, 1, 4, 2));
  });
  it('klammert an die Beet-Grenzen', () => {
    expect(resizeZoneEdge(z(1, 1, 2, 2), 'bottom', 99, 10, 6)).toEqual(z(1, 1, 2, 5));
  });
});

describe('zonesOverlap', () => {
  it('erkennt Überlappung', () => {
    expect(zonesOverlap(z(0, 0, 2, 2), z(2, 2, 4, 4))).toBe(true);
  });
  it('getrennte Zonen überlappen nicht', () => {
    expect(zonesOverlap(z(0, 0, 2, 2), z(3, 0, 5, 2))).toBe(false);
  });
});
