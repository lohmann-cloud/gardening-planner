import { planInventory, AutoPlantBed, AutoPlantItem } from './auto-plant';
import { plantPositions } from './plant-grid';

const plant = (id: string, spacingCm: number) =>
  ({ id, name: id, spacingCm, rowSpacingCm: spacingCm });

const emptyBed = (id: string, cols: number, rows: number): AutoPlantBed =>
  ({ id, cols, rows, occupied: new Set<string>() });

describe('auto-plant', () => {
  it('places everything at full spacing when it fits', () => {
    const beds = [emptyBed('b', 20, 20)]; // 1m x 1m
    const items: AutoPlantItem[] = [{ plant: plant('tomato', 30), quantity: 4 }];
    const res = planInventory(beds, items, 0.5);
    expect(res.spacingFactor).toBe(1);
    expect(res.unplaced).toEqual([]);
    const placed = res.zones.reduce((n, z) => n + z.plantCount, 0);
    expect(placed).toBeGreaterThanOrEqual(4);
    expect(res.zones.every((z) => z.bedId === 'b')).toBe(true);
  });

  it('densifies within the allowed minimum when needed', () => {
    const beds = [emptyBed('b', 20, 20)]; // fits 9 at 30cm full spacing
    const items: AutoPlantItem[] = [{ plant: plant('tomato', 30), quantity: 16 }];
    const res = planInventory(beds, items, 0.5);
    expect(res.spacingFactor).toBeLessThan(1);
    expect(res.spacingFactor).toBeGreaterThanOrEqual(0.5);
  });

  it('reports overflow when even the minimum spacing is not enough', () => {
    const beds = [emptyBed('b', 6, 6)]; // tiny
    const items: AutoPlantItem[] = [{ plant: plant('tomato', 30), quantity: 100 }];
    const res = planInventory(beds, items, 0.5);
    const placed = res.zones.reduce((n, z) => n + z.plantCount, 0);
    expect(placed).toBeLessThan(100);
    expect(res.unplaced.reduce((n, u) => n + u.count, 0)).toBe(100 - placed);
  });

  it('never targets occupied cells', () => {
    const occupied = new Set<string>();
    for (let r = 0; r < 20; r++) for (let c = 0; c < 10; c++) occupied.add(`${c},${r}`); // left half full
    const beds: AutoPlantBed[] = [{ id: 'b', cols: 20, rows: 20, occupied }];
    const items: AutoPlantItem[] = [{ plant: plant('tomato', 30), quantity: 4 }];
    const res = planInventory(beds, items, 1);
    expect(res.zones.every((z) => z.minCol >= 10)).toBe(true);
  });

  it('keeps a species in a single zone when one rect suffices', () => {
    const beds = [emptyBed('b', 40, 40)];
    const items: AutoPlantItem[] = [{ plant: plant('tomato', 30), quantity: 4 }];
    const res = planInventory(beds, items, 1);
    expect(res.zones.length).toBe(1);
  });

  it('places multiple species (each contiguous) and keeps every zone in bounds', () => {
    const beds = [emptyBed('b', 60, 60)];
    const items: AutoPlantItem[] = [
      { plant: plant('tomato', 30), quantity: 4 },
      { plant: plant('radish', 10), quantity: 9 },
    ];
    const res = planInventory(beds, items, 0.5);
    expect(res.unplaced).toEqual([]);
    const ids = new Set(res.zones.map((z) => z.plantId));
    expect(ids.has('tomato')).toBe(true);
    expect(ids.has('radish')).toBe(true);
    for (const z of res.zones) {
      expect(z.minCol).toBeGreaterThanOrEqual(0);
      expect(z.minRow).toBeGreaterThanOrEqual(0);
      expect(z.maxCol).toBeLessThanOrEqual(59);
      expect(z.maxRow).toBeLessThanOrEqual(59);
    }
  });

  it('returns everything as unplaced when there are no beds', () => {
    const items: AutoPlantItem[] = [{ plant: plant('tomato', 30), quantity: 5 }];
    const res = planInventory([], items, 0.5);
    expect(res.zones).toEqual([]);
    expect(res.unplaced).toEqual([{ plantId: 'tomato', plantName: 'tomato', count: 5 }]);
  });

  it('produces no zones and no overflow when there is nothing to plant', () => {
    const beds = [emptyBed('b', 20, 20)];
    const res = planInventory(beds, [], 0.5);
    expect(res.zones).toEqual([]);
    expect(res.unplaced).toEqual([]);
  });

  it('consumes exactly the plants each zone renders (no clipped/phantom counts)', () => {
    const beds = [emptyBed('b', 20, 20)];
    const items: AutoPlantItem[] = [{ plant: plant('tomato', 30), quantity: 3 }];
    const res = planInventory(beds, items, 0.5);
    const rendered = res.zones.reduce(
      (n, z) => n + plantPositions(z.minCol, z.minRow, z.maxCol, z.maxRow, 20, 20, 30, 30, z.spacingFactor).length,
      0,
    );
    const consumed = res.zones.reduce((n, z) => n + z.plantCount, 0);
    expect(consumed).toBe(rendered);
  });
});
