import { computeBedZoneViews, ZoneInput } from './bed-zone-views';
import { plantPositions } from './plant-grid';

const zone = (over: Partial<ZoneInput> = {}): ZoneInput => ({
  minCol: 0, minRow: 0, maxCol: 19, maxRow: 19, spacingFactor: 1, spacingCm: 30, rowSpacingCm: 30, ...over,
});

describe('bed-zone-views', () => {
  it('a single zone matches plant-grid positions', () => {
    const z = zone();
    const views = computeBedZoneViews([z], 20, 20);
    const direct = plantPositions(0, 0, 19, 19, 20, 20, 30, 30, 1).length;
    expect(views.length).toBe(1);
    expect(views[0].spots.length).toBe(direct);
  });

  it('suppresses spots in a later zone that overlap an earlier one', () => {
    const a = zone({ minCol: 0, minRow: 0, maxCol: 19, maxRow: 9 });
    const b = zone({ minCol: 0, minRow: 8, maxCol: 19, maxRow: 19 });
    const views = computeBedZoneViews([a, b], 20, 20);
    const bAlone = plantPositions(0, 8, 19, 19, 20, 20, 30, 30, 1).length;
    expect(views[1].spots.length).toBeLessThan(bAlone);
  });

  it('keeps the generic zone object on the view', () => {
    const z = { ...zone(), plantId: 'x' };
    const views = computeBedZoneViews([z], 20, 20);
    expect(views[0].zone.plantId).toBe('x');
  });
});
