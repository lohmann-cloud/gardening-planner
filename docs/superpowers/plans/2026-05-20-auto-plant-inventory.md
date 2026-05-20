# Auto-Plant Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a two-step "distribute my stock" action that packs selected inventory plants into the free space of the current garden's beds, densifying only within a user-set spacing limit, and reports what fit.

**Architecture:** Frontend-only. Two pure modules — `plant-grid.ts` (grid spot positioning, extracted from the bed planner so both share it) and `auto-plant.ts` (the packer) — plus a button + modal in the garden layout that calls the existing `addPlantingZone` endpoint per produced zone. The backend is unchanged; inventory is consumed per zone by the existing `plantCount` mechanism.

**Tech Stack:** Angular 21 (standalone, signals), TypeScript, Vitest + jsdom (`ng test`).

> **Commands:** node is via nvm. Prefix every `npx`/`npm` command with:
> `export PATH="/home/lohmann/.nvm/versions/node/v24.15.0/bin:$PATH"`
> Run the unit suite with `npx ng test --watch=false` (vitest, headless). Build with `npm run build`.

---

## File Structure

- Create `frontend/src/app/planning/plant-grid.ts` — pure spot positioning (`plantPositions`, `CELL_CM`).
- Create `frontend/src/app/planning/plant-grid.spec.ts` — unit tests.
- Create `frontend/src/app/planning/auto-plant.ts` — pure packer (`planInventory` + helpers + types).
- Create `frontend/src/app/planning/auto-plant.spec.ts` — unit tests.
- Modify `frontend/src/app/bed-planner/bed-planner.ts` — delegate positioning to `plant-grid` (no behaviour change).
- Modify `frontend/src/app/garden-layout/garden-layout.ts` — button handler, modal state, run logic.
- Modify `frontend/src/app/garden-layout/garden-layout.html` — toolbar button + modal markup.
- Modify `frontend/src/app/app.spec.ts` — fix the stale scaffold assertion (Task 0).

---

## Task 0: Make the existing test suite green

The scaffold test asserts the old Angular welcome `<h1>` that no longer exists (the root template is just `<router-outlet />`). Fix it so TDD red/green is meaningful.

**Files:**
- Modify: `frontend/src/app/app.spec.ts`

- [ ] **Step 1: Replace the stale title test**

Replace the whole file with:

```ts
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter } from '@angular/router';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the suite**

Run: `export PATH="/home/lohmann/.nvm/versions/node/v24.15.0/bin:$PATH" && cd frontend && npx ng test --watch=false`
Expected: all tests pass (1 file, 1 test).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/app.spec.ts
git commit -m "test: fix stale root component spec"
```

---

## Task 1: Extract shared `plant-grid` positioning

Move the bed planner's private `computePositionsInArea`/`computeGrid` into a pure module so the auto-planter computes identical spot counts.

**Files:**
- Create: `frontend/src/app/planning/plant-grid.ts`
- Test: `frontend/src/app/planning/plant-grid.spec.ts`
- Modify: `frontend/src/app/bed-planner/bed-planner.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/planning/plant-grid.spec.ts`:

```ts
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export PATH="/home/lohmann/.nvm/versions/node/v24.15.0/bin:$PATH" && cd frontend && npx ng test --watch=false`
Expected: FAIL — cannot resolve `./plant-grid`.

- [ ] **Step 3: Write the module**

Create `frontend/src/app/planning/plant-grid.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `export PATH="/home/lohmann/.nvm/versions/node/v24.15.0/bin:$PATH" && cd frontend && npx ng test --watch=false`
Expected: PASS.

- [ ] **Step 5: Refactor the bed planner to use it**

In `frontend/src/app/bed-planner/bed-planner.ts`:

Add the import after the existing `plant-utils` import:

```ts
import { plantPositions } from '../planning/plant-grid';
```

Replace the private `computePositionsInArea` method **and** the entire private `computeGrid` method with this single method (delete `computeGrid` completely):

```ts
  private computePositionsInArea(minCol: number, minRow: number, maxCol: number, maxRow: number, plant: Plant, factor = this.spacingFactor()): { col: number; row: number }[] {
    return plantPositions(
      minCol, minRow, maxCol, maxRow,
      this.cols(), this.rows(),
      plant.spacingCm, plant.rowSpacingCm ?? plant.spacingCm, factor,
    );
  }
```

- [ ] **Step 6: Verify the build (bed planner unchanged in behaviour)**

Run: `export PATH="/home/lohmann/.nvm/versions/node/v24.15.0/bin:$PATH" && cd frontend && npm run build 2>&1 | grep -cE '✘|ERROR'`
Expected: `0`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/planning/plant-grid.ts frontend/src/app/planning/plant-grid.spec.ts frontend/src/app/bed-planner/bed-planner.ts
git commit -m "refactor: extract shared plant-grid positioning"
```

---

## Task 2: The `auto-plant` packer

Pure logic: free-rectangle decomposition + first-fit-decreasing packing + spacing-factor selection.

**Files:**
- Create: `frontend/src/app/planning/auto-plant.ts`
- Test: `frontend/src/app/planning/auto-plant.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/app/planning/auto-plant.spec.ts`:

```ts
import { planInventory, AutoPlantBed, AutoPlantItem } from './auto-plant';

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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `export PATH="/home/lohmann/.nvm/versions/node/v24.15.0/bin:$PATH" && cd frontend && npx ng test --watch=false`
Expected: FAIL — cannot resolve `./auto-plant`.

- [ ] **Step 3: Write the module**

Create `frontend/src/app/planning/auto-plant.ts`:

```ts
import { plantPositions, CELL_CM } from './plant-grid';

export interface AutoPlantPlant {
  id: string;
  name: string;
  spacingCm: number;
  rowSpacingCm: number;
}
export interface AutoPlantBed {
  id: string;
  cols: number;
  rows: number;
  occupied: Set<string>; // "col,row"
}
export interface AutoPlantItem {
  plant: AutoPlantPlant;
  quantity: number;
}
export interface AutoPlantZone {
  bedId: string;
  plantId: string;
  minCol: number;
  minRow: number;
  maxCol: number;
  maxRow: number;
  spacingFactor: number;
  plantCount: number;
}
export interface AutoPlantResult {
  zones: AutoPlantZone[];
  spacingFactor: number;
  unplaced: { plantId: string; plantName: string; count: number }[];
}

interface Rect { bedId: string; cols: number; rows: number; col: number; row: number; w: number; h: number; }

/** Decompose a bed's free cells into disjoint rectangles, largest first. */
function freeRectangles(bed: AutoPlantBed): Rect[] {
  const occ: boolean[][] = [];
  for (let r = 0; r < bed.rows; r++) {
    occ[r] = [];
    for (let c = 0; c < bed.cols; c++) occ[r][c] = bed.occupied.has(`${c},${r}`);
  }
  const rects: Rect[] = [];
  for (;;) {
    const best = largestEmptyRect(occ, bed.rows, bed.cols);
    if (!best || best.w === 0 || best.h === 0) break;
    rects.push({ bedId: bed.id, cols: bed.cols, rows: bed.rows, col: best.c, row: best.r, w: best.w, h: best.h });
    for (let r = best.r; r < best.r + best.h; r++)
      for (let c = best.c; c < best.c + best.w; c++) occ[r][c] = true;
  }
  return rects;
}

/** Largest all-free axis-aligned rectangle (maximal-rectangle histogram DP). */
function largestEmptyRect(occ: boolean[][], rows: number, cols: number) {
  const height = new Array<number>(cols).fill(0);
  let best: { area: number; r: number; c: number; h: number; w: number } | null = null;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) height[c] = occ[r][c] ? 0 : height[c] + 1;
    const stack: number[] = [];
    for (let c = 0; c <= cols; c++) {
      const h = c === cols ? 0 : height[c];
      while (stack.length && height[stack[stack.length - 1]] >= h) {
        const top = stack.pop()!;
        const hh = height[top];
        const left = stack.length ? stack[stack.length - 1] + 1 : 0;
        const w = c - left;
        const area = hh * w;
        if (hh > 0 && w > 0 && (!best || area > best.area)) {
          best = { area, r: r - hh + 1, c: left, h: hh, w };
        }
      }
      stack.push(c);
    }
  }
  return best;
}

function rectCount(rect: Rect, p: AutoPlantPlant, f: number, w: number, h: number): number {
  return plantPositions(rect.col, rect.row, rect.col + w - 1, rect.row + h - 1, rect.cols, rect.rows, p.spacingCm, p.rowSpacingCm, f).length;
}

/** Split a rect after carving a top-left sub-rect (w x h). Right strip + bottom strip. */
function guillotine(rect: Rect, w: number, h: number): Rect[] {
  const out: Rect[] = [];
  if (rect.w - w > 0) out.push({ ...rect, col: rect.col + w, w: rect.w - w, h });
  if (rect.h - h > 0) out.push({ ...rect, row: rect.row + h, h: rect.h - h });
  return out;
}

function packAtFactor(allRects: Rect[], items: AutoPlantItem[], f: number) {
  const pool: Rect[] = allRects.map((r) => ({ ...r }));
  const zones: AutoPlantZone[] = [];
  const unplaced: AutoPlantResult['unplaced'] = [];
  const blockArea = (it: AutoPlantItem) =>
    it.quantity * Math.max(1, Math.round((it.plant.spacingCm * f) / CELL_CM)) * Math.max(1, Math.round((it.plant.rowSpacingCm * f) / CELL_CM));
  const sorted = [...items].sort((a, b) => blockArea(b) - blockArea(a));

  for (const item of sorted) {
    const p = item.plant;
    const sCol = Math.max(1, Math.round((p.spacingCm * f) / CELL_CM));
    const sRow = Math.max(1, Math.round((p.rowSpacingCm * f) / CELL_CM));
    let remaining = item.quantity;

    while (remaining > 0) {
      // Pick the pool rect with the most capacity for this plant.
      let bi = -1;
      let bestCap = 0;
      for (let i = 0; i < pool.length; i++) {
        const cap = Math.floor(pool[i].w / sCol) * Math.floor(pool[i].h / sRow);
        if (cap > bestCap) { bestCap = cap; bi = i; }
      }
      if (bi < 0 || bestCap === 0) break; // nothing can hold even one plant

      const rect = pool[bi];
      const bCols = Math.floor(rect.w / sCol);
      const bRows = Math.floor(rect.h / sRow);
      let useCols = bCols;
      let useRows = bRows;
      if (remaining < bCols * bRows) {
        useCols = Math.min(bCols, Math.max(1, Math.ceil(Math.sqrt(remaining))));
        useRows = Math.min(bRows, Math.ceil(remaining / useCols));
        useCols = Math.min(bCols, Math.ceil(remaining / useRows));
      }
      const subW = useCols * sCol;
      const subH = useRows * sRow;
      const count = rectCount(rect, p, f, subW, subH);
      pool.splice(bi, 1, ...guillotine(rect, subW, subH));
      if (count <= 0) continue; // degenerate sub-rect; rect was consumed, try the rest

      zones.push({
        bedId: rect.bedId, plantId: p.id,
        minCol: rect.col, minRow: rect.row, maxCol: rect.col + subW - 1, maxRow: rect.row + subH - 1,
        spacingFactor: f, plantCount: Math.min(count, remaining),
      });
      remaining -= count;
    }

    if (remaining > 0) unplaced.push({ plantId: p.id, plantName: p.name, count: remaining });
  }
  return { zones, unplaced };
}

/**
 * Pack the selected stock into the beds' free space. Uses the largest spacing
 * factor in [minSpacingFactor, 1] that fits everything; if none fits, uses the
 * minimum and reports the overflow.
 */
export function planInventory(
  beds: AutoPlantBed[], items: AutoPlantItem[], minSpacingFactor: number,
): AutoPlantResult {
  const live = items.filter((i) => i.quantity > 0);
  const rects = beds.flatMap((b) => freeRectangles(b));
  if (!live.length || !rects.length) {
    return { zones: [], spacingFactor: 1, unplaced: live.map((i) => ({ plantId: i.plant.id, plantName: i.plant.name, count: i.quantity })) };
  }
  let last = packAtFactor(rects, live, minSpacingFactor);
  for (let f = 1; f >= minSpacingFactor - 1e-9; f -= 0.05) {
    const fr = Math.round(f * 100) / 100;
    const attempt = packAtFactor(rects, live, fr);
    if (!attempt.unplaced.length) return { zones: attempt.zones, spacingFactor: fr, unplaced: [] };
    last = attempt;
  }
  return { zones: last.zones, spacingFactor: Math.round(minSpacingFactor * 100) / 100, unplaced: last.unplaced };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `export PATH="/home/lohmann/.nvm/versions/node/v24.15.0/bin:$PATH" && cd frontend && npx ng test --watch=false`
Expected: PASS (all auto-plant + plant-grid + app tests green).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/planning/auto-plant.ts frontend/src/app/planning/auto-plant.spec.ts
git commit -m "feat: auto-plant packer (pure)"
```

---

## Task 3: Garden-layout button, modal and run

Wire the packer to the UI: a toolbar button opens a modal (species checkboxes + minimum-spacing slider); running it loads each bed's plan, plans the layout, creates the zones via `addPlantingZone`, reloads, and shows the result.

**Files:**
- Modify: `frontend/src/app/garden-layout/garden-layout.ts`
- Modify: `frontend/src/app/garden-layout/garden-layout.html`

- [ ] **Step 1: Add imports and state to the component**

In `frontend/src/app/garden-layout/garden-layout.ts`, extend the api import to include the inventory + plant types, and add the planner import. Change the existing api import line:

```ts
import { ApiService, Garden, GardenBed, Membership, Obstacle, Plant, InventoryItem } from '../services/api.service';
```

Add after the `plant-utils` import:

```ts
import { planInventory, AutoPlantBed, AutoPlantItem, AutoPlantResult } from '../planning/auto-plant';
```

Add these signals next to the other `signal(...)` fields in the class (e.g. after `toolbarOpen`):

```ts
  protected readonly autoPlantOpen = signal(false);
  protected readonly autoPlantItems = signal<{ item: InventoryItem; plant: Plant; selected: boolean }[]>([]);
  protected readonly minSpacingPct = signal(100);
  protected readonly autoPlantBusy = signal(false);
  protected readonly autoPlantResult = signal<AutoPlantResult | null>(null);
```

- [ ] **Step 2: Add the component methods**

Add these methods to the class (e.g. just before `bedFill`):

```ts
  protected openAutoPlant() {
    this.autoPlantResult.set(null);
    this.minSpacingPct.set(100);
    this.autoPlantOpen.set(true);
    this.toolbarOpen.set(false);
    forkJoin({ inv: this.api.getInventory(), plants: this.api.getPlants() }).subscribe(({ inv, plants }) => {
      const byId = new Map(plants.map((p) => [p.id, p]));
      this.autoPlantItems.set(
        inv.filter((i) => i.quantity > 0 && byId.has(i.plantId))
          .map((item) => ({ item, plant: byId.get(item.plantId)!, selected: true })),
      );
    });
  }

  protected closeAutoPlant() {
    this.autoPlantOpen.set(false);
  }

  protected toggleAutoPlantItem(plantId: string) {
    this.autoPlantItems.update((list) =>
      list.map((e) => (e.item.plantId === plantId ? { ...e, selected: !e.selected } : e)),
    );
  }

  protected onMinSpacingInput(event: Event) {
    this.minSpacingPct.set(+(event.target as HTMLInputElement).value);
  }

  protected hasAutoPlantSelection(): boolean {
    return this.autoPlantItems().some((e) => e.selected);
  }

  protected runAutoPlant() {
    const g = this.garden();
    const chosen = this.autoPlantItems().filter((e) => e.selected);
    if (!g || !chosen.length) return;
    const items: AutoPlantItem[] = chosen.map((e) => ({
      plant: { id: e.plant.id, name: e.plant.name, spacingCm: e.plant.spacingCm, rowSpacingCm: e.plant.rowSpacingCm ?? e.plant.spacingCm },
      quantity: e.item.quantity,
    }));
    if (!g.beds.length) {
      this.autoPlantResult.set(planInventory([], items, this.minSpacingPct() / 100));
      return;
    }
    this.autoPlantBusy.set(true);
    const year = new Date().getFullYear();
    forkJoin(g.beds.map((b) => this.api.getPlantingPlan(g.id, b.id, year))).subscribe((plans) => {
      const beds: AutoPlantBed[] = g.beds.map((b, i) => {
        const cols = Math.floor((b.widthM * 100) / 5);
        const rows = Math.floor((b.lengthM * 100) / 5);
        const occupied = new Set<string>();
        for (const z of plans[i].zones)
          for (let r = z.minRow; r <= z.maxRow; r++)
            for (let c = z.minCol; c <= z.maxCol; c++) occupied.add(`${c},${r}`);
        for (const cell of plans[i].cells) occupied.add(`${cell.col},${cell.row}`);
        return { id: b.id, cols, rows, occupied };
      });
      const result = planInventory(beds, items, this.minSpacingPct() / 100);
      if (!result.zones.length) {
        this.autoPlantBusy.set(false);
        this.autoPlantResult.set(result);
        return;
      }
      forkJoin(
        result.zones.map((z) => this.api.addPlantingZone(g.id, z.bedId, year, {
          plantId: z.plantId, minCol: z.minCol, minRow: z.minRow, maxCol: z.maxCol, maxRow: z.maxRow,
          spacingFactor: z.spacingFactor, plantCount: z.plantCount,
        })),
      ).subscribe(() => {
        this.autoPlantBusy.set(false);
        this.autoPlantResult.set(result);
        this.loadGarden(g.id);
      });
    });
  }

  protected autoPlantPlacedCount(): number {
    return (this.autoPlantResult()?.zones ?? []).reduce((n, z) => n + z.plantCount, 0);
  }
```

- [ ] **Step 3: Add the toolbar button**

In `frontend/src/app/garden-layout/garden-layout.html`, immediately after the opening `<aside ...>` tag of the toolbar (before the `<h3 ...>Werkzeuge</h3>`), add:

```html
        <button type="button"
                class="btn btn-primary btn-sm w-full mb-3"
                (click)="openAutoPlant()">
          🌱 Bestand verteilen
        </button>
```

- [ ] **Step 4: Add the modal**

In `frontend/src/app/garden-layout/garden-layout.html`, add this block immediately before the existing `@if (editingGarden()) {` modal block:

```html
    @if (autoPlantOpen()) {
      <div class="modal-backdrop fixed inset-0 z-50 bg-cream-900/45 backdrop-blur-sm flex items-center justify-center p-4"
           (click)="closeAutoPlant()">
        <div class="modal surface w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
             (click)="$event.stopPropagation()">
          <h2 class="text-xl font-bold text-leaf-800 m-0 mb-1">Bestand verteilen</h2>
          <p class="text-sm text-cream-500 m-0 mb-4">Verteilt den gewählten Bestand auf den freien Platz der Beete.</p>

          @if (autoPlantResult(); as res) {
            <div class="rounded-lg bg-leaf-50 border border-leaf-200 px-4 py-3 mb-4">
              <p class="m-0 text-sm text-leaf-800">
                <strong>{{ autoPlantPlacedCount() }}</strong> Pflanzen verteilt
                bei <strong>{{ res.spacingFactor * 100 | number:'1.0-0' }}%</strong> des empfohlenen Abstands.
              </p>
            </div>
            @if (res.unplaced.length) {
              <div class="rounded-lg bg-clay-50 border border-clay-200 px-4 py-3 mb-4">
                <p class="m-0 text-sm text-clay-700 font-semibold mb-1">Kein Platz mehr für:</p>
                <ul class="m-0 pl-4 text-sm text-clay-700">
                  @for (u of res.unplaced; track u.plantId) {
                    <li>{{ u.plantName }}: {{ u.count }}</li>
                  }
                </ul>
              </div>
            }
            <div class="flex justify-end">
              <button class="btn btn-primary btn-sm" type="button" (click)="closeAutoPlant()">Fertig</button>
            </div>
          } @else {
            @if (autoPlantItems().length) {
              <div class="space-y-1.5 mb-4 max-h-56 overflow-y-auto">
                @for (e of autoPlantItems(); track e.item.plantId) {
                  <label class="flex items-center gap-3 px-3 py-2 rounded-lg border border-cream-200 cursor-pointer hover:bg-cream-50">
                    <input type="checkbox" [checked]="e.selected" (change)="toggleAutoPlantItem(e.item.plantId)" />
                    <span class="text-lg">{{ e.item.plantIconEmoji ?? '🌱' }}</span>
                    <span class="flex-1 text-sm font-medium text-cream-800">{{ e.plant.name }}</span>
                    <span class="text-xs text-cream-500">{{ e.item.quantity }} Stück</span>
                  </label>
                }
              </div>

              <label class="block mb-5">
                <div class="flex justify-between text-sm text-cream-700 mb-1">
                  <span>Minimaler Pflanzabstand</span>
                  <span class="font-bold text-leaf-700">{{ minSpacingPct() }}%</span>
                </div>
                <input type="range" min="50" max="100" step="5"
                       [value]="minSpacingPct()" (input)="onMinSpacingInput($event)"
                       class="w-full cursor-pointer" style="accent-color: var(--color-leaf-600);" />
                <span class="block text-xs text-cream-400 mt-1">Wie weit der empfohlene Abstand maximal unterschritten werden darf.</span>
              </label>

              <div class="flex items-center gap-2 justify-end">
                <button class="btn btn-secondary btn-sm" type="button" (click)="closeAutoPlant()">Abbrechen</button>
                <button class="btn btn-primary btn-sm" type="button"
                        (click)="runAutoPlant()"
                        [disabled]="!hasAutoPlantSelection() || autoPlantBusy()">
                  {{ autoPlantBusy() ? '…' : 'Pflanzen' }}
                </button>
              </div>
            } @else {
              <p class="text-sm text-cream-500 m-0 mb-4">Kein Bestand vorhanden. Lege zuerst Pflanzen in deinem Bestand an.</p>
              <div class="flex justify-end">
                <button class="btn btn-secondary btn-sm" type="button" (click)="closeAutoPlant()">Schließen</button>
              </div>
            }
          }
        </div>
      </div>
    }
```

- [ ] **Step 5: Verify the build**

Run: `export PATH="/home/lohmann/.nvm/versions/node/v24.15.0/bin:$PATH" && cd frontend && npm run build 2>&1 | grep -cE '✘|ERROR'`
Expected: `0`.

- [ ] **Step 6: Run the unit suite (regression)**

Run: `export PATH="/home/lohmann/.nvm/versions/node/v24.15.0/bin:$PATH" && cd frontend && npx ng test --watch=false`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/garden-layout/garden-layout.ts frontend/src/app/garden-layout/garden-layout.html
git commit -m "feat: auto-plant inventory button + modal in garden layout"
```

---

## Final verification

- [ ] Build is clean: `npm run build` → 0 errors.
- [ ] Unit suite green: `npx ng test --watch=false`.
- [ ] Manual check (optional, needs the running app + login): open a garden with stock, click "Bestand verteilen", select species, set min spacing, plant; confirm zones appear only in free space and the result message shows the achieved spacing %, and inventory drops accordingly.

## Notes / known limitations

- `DecimalPipe` is already imported by the garden-layout component (used elsewhere), so `| number:'1.0-0'` in the modal needs no new import. Verify it is in the component `imports` array; if not, add `DecimalPipe`.
- Zone creation is multiple `addPlantingZone` calls via `forkJoin` (not atomic). Acceptable for this tool.
- A species' final block may render a couple of plants more than its remaining stock; the existing per-zone inventory logic routes that surplus onto the shopping list, which is acceptable.
