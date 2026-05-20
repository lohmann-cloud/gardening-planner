# Unified Garden Canvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge bed placement and planting into one garden canvas with a Beet/Pflanzen mode toggle, plant directly into any bed (rotation-aware), and remove the separate bed-planner view.

**Architecture:** Extend the existing `garden-layout` SVG canvas. The hard logic — garden-point↔bed-cell mapping (with rotation) and per-bed zone→spot computation — lives in pure, unit-tested modules (`planning/bed-coords.ts`, `planning/bed-zone-views.ts`) reusing the existing `planning/plant-grid.ts`. Planting renders inside each bed's rotated `<g>`. Built in 3 phases; each phase builds, tests green, app working.

**Tech Stack:** Angular 21 (standalone, signals), TypeScript, Vitest + jsdom (`ng test`), SVG.

> **Commands:** node is via nvm — prefix every npm/npx command with
> `export PATH="/home/lohmann/.nvm/versions/node/v24.15.0/bin:$PATH"`.
> Unit suite: `npx ng test --watch=false`. Build: `npm run build` (clean = `... 2>&1 | grep -cE '✘|ERROR'` → `0`).
> Reference the design at `docs/superpowers/specs/2026-05-20-unified-garden-canvas-design.md`.

---

## File Structure

- Create `frontend/src/app/planning/bed-coords.ts` (+ `.spec.ts`) — point↔cell mapping, rotation-aware. Pure.
- Create `frontend/src/app/planning/bed-zone-views.ts` (+ `.spec.ts`) — per-bed zone→plant-spots with cross-zone suppression. Pure.
- Modify `frontend/src/app/garden-layout/garden-layout.ts` / `.html` / `.scss` — mode toggle, plant rendering, draw interaction, plant panel.
- Modify `frontend/src/app/services/api.service.ts` — none expected (existing endpoints suffice).
- Modify `frontend/src/app/app.routes.ts`, `frontend/src/app/dashboard/dashboard.html` (+ any link to the bed route) — repoint navigation.
- Delete `frontend/src/app/bed-planner/` (component, html, scss) in Phase 3.

---

# Phase 1 — Pure modules + mode toggle + read-only planting render

## Task 1: `bed-coords.ts` — garden point ↔ bed-local cell (rotation-aware)

**Files:**
- Create: `frontend/src/app/planning/bed-coords.ts`
- Test: `frontend/src/app/planning/bed-coords.spec.ts`

- [ ] **Step 1: Write the failing test** — create `frontend/src/app/planning/bed-coords.spec.ts`:

```ts
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
    // cell (5,5) centre = (1 + 5.5*0.05, 1 + 5.5*0.05)
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
    const centre = { x: tl.x + 0.025, y: tl.y + 0.025 }; // cell centre in unrotated frame
    const screenPoint = forward(centre, cx, cy, 35);     // where it renders after rotation
    expect(bedCellAtPoint(screenPoint, rbed)).toEqual({ col: 7, row: 3 });
  });
});
```

- [ ] **Step 2: Run the suite — confirm the new tests FAIL** (cannot resolve `./bed-coords`).
Run: `export PATH="/home/lohmann/.nvm/versions/node/v24.15.0/bin:$PATH" && cd frontend && npx ng test --watch=false`

- [ ] **Step 3: Create `frontend/src/app/planning/bed-coords.ts`:**

```ts
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
```

- [ ] **Step 4: Run the suite — confirm PASS.**

- [ ] **Step 5: Commit:**
```bash
git add frontend/src/app/planning/bed-coords.ts frontend/src/app/planning/bed-coords.spec.ts
git commit -m "feat: bed-coords (garden point <-> bed cell, rotation-aware)"
```

---

## Task 2: `bed-zone-views.ts` — per-bed zone → plant spots

**Files:**
- Create: `frontend/src/app/planning/bed-zone-views.ts`
- Test: `frontend/src/app/planning/bed-zone-views.spec.ts`

- [ ] **Step 1: Write the failing test** — create `frontend/src/app/planning/bed-zone-views.spec.ts`:

```ts
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
    const b = zone({ minCol: 0, minRow: 8, maxCol: 19, maxRow: 19 }); // overlaps rows 8-9
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
```

- [ ] **Step 2: Run the suite — confirm the new tests FAIL.**

- [ ] **Step 3: Create `frontend/src/app/planning/bed-zone-views.ts`:**

```ts
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
```

- [ ] **Step 4: Run the suite — confirm PASS.**

- [ ] **Step 5: Commit:**
```bash
git add frontend/src/app/planning/bed-zone-views.ts frontend/src/app/planning/bed-zone-views.spec.ts
git commit -m "feat: bed-zone-views (per-bed zone spots with suppression)"
```

---

## Task 3: Mode toggle + read-only planting render in the garden canvas

**Files:**
- Modify: `frontend/src/app/garden-layout/garden-layout.ts`
- Modify: `frontend/src/app/garden-layout/garden-layout.html`

**Context:** `garden-layout` already loads `bedPlants` (plants per bed for the summary) in `loadGarden`. Add a parallel map of computed zone views per bed for detailed rendering, a `mode` signal, a header toggle, and SVG rendering of spots inside each bed's `<g>` when `mode()==='plant'`.

- [ ] **Step 1: Add imports + types + state to `garden-layout.ts`.**

Add imports:
```ts
import { bedColsRows, cellTopLeftMeters } from '../planning/bed-coords';
import { computeBedZoneViews, ZoneInput } from '../planning/bed-zone-views';
```
Add a view-model type near the top (after the `Ptr` type):
```ts
interface BedPlantSpot { x: number; y: number; color: string; icon: string; }
```
Add signals next to the other signals (e.g. after `toolbarOpen`):
```ts
  protected readonly mode = signal<'beds' | 'plant'>('beds');
  /** Per bed id: rendered plant spots (garden-metre top-left of each cell, in the bed's unrotated frame). */
  protected readonly bedSpots = signal<Map<string, BedPlantSpot[]>>(new Map());
```

- [ ] **Step 2: Compute and store spots when the garden loads.**

In `loadGarden`, inside the `forkJoin(planRequests).subscribe((plans) => { ... })` callback, after the existing `bedPlants` map is built, also build the spots map. Replace the body of that subscribe with (keeps the existing `bedPlants` logic and adds spots):

```ts
      forkJoin(planRequests).subscribe((plans) => {
        const plantsMap = new Map<string, Plant[]>();
        const spotsMap = new Map<string, BedPlantSpot[]>();
        plans.forEach((plan, i) => {
          const bed = g.beds[i];
          const seen = new Set<string>();
          const plants: Plant[] = [];
          for (const z of plan.zones) {
            if (!seen.has(z.plant.id)) { seen.add(z.plant.id); plants.push(z.plant); }
          }
          for (const c of plan.cells) {
            if (!seen.has(c.plant.id)) { seen.add(c.plant.id); plants.push(c.plant); }
          }
          if (plants.length) plantsMap.set(bed.id, plants);

          const { cols, rows } = bedColsRows(bed);
          const zoneInputs = plan.zones.map((z) => ({
            minCol: z.minCol, minRow: z.minRow, maxCol: z.maxCol, maxRow: z.maxRow,
            spacingFactor: z.spacingFactor ?? 1,
            spacingCm: z.plant.spacingCm, rowSpacingCm: z.plant.rowSpacingCm ?? z.plant.spacingCm,
            plant: z.plant,
          }));
          const views = computeBedZoneViews(zoneInputs, cols, rows);
          const spots: BedPlantSpot[] = [];
          for (const v of views) {
            for (const s of v.spots) {
              const tl = cellTopLeftMeters(s.col, s.row, bed);
              spots.push({ x: tl.x + 0.025, y: tl.y + 0.025, color: plantColor(v.zone.plant), icon: plantIcon(v.zone.plant) });
            }
          }
          if (spots.length) spotsMap.set(bed.id, spots);
        });
        this.bedPlants.set(plantsMap);
        this.bedSpots.set(spotsMap);
      });
```
(`plantColor` and `plantIcon` are already imported in this component.)

- [ ] **Step 3: Add a `bedSpotsFor` accessor** (template helper) near `bedFill`:
```ts
  protected bedSpotsFor(bedId: string): BedPlantSpot[] {
    return this.bedSpots().get(bedId) ?? [];
  }
```

- [ ] **Step 4: Add the header mode toggle in `garden-layout.html`.**

In the `<header ...>`, immediately after the `<div class="flex-1 min-w-0 ...">` title block (before the "Bearbeiten" button), add a segmented control:
```html
      <div class="mode-toggle inline-flex rounded-lg bg-cream-100 p-0.5 gap-0.5 flex-shrink-0">
        <button type="button"
                class="text-xs font-semibold py-1.5 px-3 rounded-md transition-colors"
                [class.bg-white]="mode() === 'beds'" [class.shadow-sm]="mode() === 'beds'"
                [class.text-cream-800]="mode() === 'beds'" [class.text-cream-500]="mode() !== 'beds'"
                (click)="mode.set('beds')">Beet</button>
        <button type="button"
                class="text-xs font-semibold py-1.5 px-3 rounded-md transition-colors"
                [class.bg-white]="mode() === 'plant'" [class.shadow-sm]="mode() === 'plant'"
                [class.text-cream-800]="mode() === 'plant'" [class.text-cream-500]="mode() !== 'plant'"
                (click)="mode.set('plant')">Pflanzen</button>
      </div>
```

- [ ] **Step 5: Render spots inside each bed `<g>` in plant mode.**

In `garden-layout.html`, inside the bed `<g>` (the one with `[attr.data-bed-id]`), after the bed name/icon `<text>` elements and before the rotate-handle `@if`, add:
```html
                @if (mode() === 'plant') {
                  @for (s of bedSpotsFor(b.id); track $index) {
                    <circle [attr.cx]="s.x" [attr.cy]="s.y" r="0.06"
                            [attr.fill]="s.color" stroke="#ffffff" stroke-width="0.012"
                            pointer-events="none" opacity="0.9" />
                  }
                }
```
(Spots are drawn inside the rotated `<g>`, so they rotate with the bed. The summary name/icon text stays; that is acceptable for now and is replaced visually by the spots when planting.)

- [ ] **Step 6: Verify build + suite.**
Run: `export PATH="/home/lohmann/.nvm/versions/node/v24.15.0/bin:$PATH" && cd frontend && npm run build 2>&1 | grep -cE '✘|ERROR'` → `0`
Run: `npx ng test --watch=false` → all pass.

- [ ] **Step 7: Commit:**
```bash
git add frontend/src/app/garden-layout/garden-layout.ts frontend/src/app/garden-layout/garden-layout.html
git commit -m "feat: garden canvas mode toggle + read-only planting render"
```

---

# Phase 2 — Draw & remove zones + zoom grid

## Task 4: Plant selection state + minimal plant picker in plant mode

**Files:**
- Modify: `frontend/src/app/garden-layout/garden-layout.ts`
- Modify: `frontend/src/app/garden-layout/garden-layout.html`

**Context:** Drawing needs a selected plant + spacing factor. This task adds the state and a minimal picker in the toolbar shown only in plant mode. (The full palette — inventory tab, info, legend, auto-plant — arrives in Phase 3.)

- [ ] **Step 1: Add plant state to `garden-layout.ts`.**

Ensure `getPlants` data is available: add a signal and load it in `ngOnInit`.
```ts
  protected readonly plants = signal<Plant[]>([]);
  protected readonly selectedPlant = signal<Plant | null>(null);
  protected readonly plantSpacingFactor = signal(1);
  protected readonly plantSearch = signal('');
  protected readonly filteredPlants = computed(() => {
    const q = this.plantSearch().toLowerCase();
    const all = this.plants();
    return q ? all.filter((p) => p.name.toLowerCase().includes(q) || p.botanicalName?.toLowerCase().includes(q)) : all;
  });
```
In `ngOnInit`, after `this.loadGarden(id);` add:
```ts
    this.api.getPlants().subscribe((p) => this.plants.set(p));
```
Add methods (near the other protected methods):
```ts
  protected selectPlantForPlanting(plant: Plant) {
    this.selectedPlant.set(this.selectedPlant()?.id === plant.id ? null : plant);
  }
  protected onPlantSearch(event: Event) {
    this.plantSearch.set((event.target as HTMLInputElement).value);
  }
  protected onPlantSpacingInput(event: Event) {
    this.plantSpacingFactor.set(+(event.target as HTMLInputElement).value / 100);
  }
```

- [ ] **Step 2: Show the picker in the toolbar in plant mode (`garden-layout.html`).**

Wrap the existing Beet-mode toolbar contents so they only show in beds mode, and add a plant panel for plant mode. Find the toolbar `<aside ...>`; immediately inside it, the current children (the "Bestand verteilen"/"Alle entfernen" buttons, the "Werkzeuge" h3, the tool buttons, and the `@switch (tool())` block) should be wrapped:
```html
        @if (mode() === 'beds') {
          <!-- existing toolbar content stays here unchanged -->
        }
        @if (mode() === 'plant') {
          <input type="text" placeholder="Pflanze suchen…" [value]="plantSearch()" (input)="onPlantSearch($event)" class="field-input mb-2" />
          <div class="space-y-1 max-h-[40vh] overflow-y-auto">
            @for (p of filteredPlants(); track p.id) {
              <button type="button"
                      class="w-full text-left px-3 py-2 rounded-lg border transition-colors"
                      [class.bg-leaf-50]="selectedPlant()?.id === p.id" [class.border-leaf-300]="selectedPlant()?.id === p.id"
                      [class.bg-white]="selectedPlant()?.id !== p.id" [class.border-transparent]="selectedPlant()?.id !== p.id"
                      (click)="selectPlantForPlanting(p)">
                <span class="text-base">{{ p.iconEmoji ?? '🌱' }}</span>
                <span class="font-semibold text-sm ml-2">{{ p.name }}</span>
                <span class="block text-xs text-cream-500">{{ p.spacingCm }}cm</span>
              </button>
            }
          </div>
          @if (selectedPlant(); as sp) {
            <div class="border-t border-cream-200 pt-3 mt-3">
              <div class="flex justify-between text-xs text-cream-600 mb-1">
                <span>Pflanzabstand</span>
                <span class="font-bold text-leaf-700">{{ plantSpacingFactor() * 100 | number:'1.0-0' }}%</span>
              </div>
              <input type="range" min="30" max="100" step="5" [value]="plantSpacingFactor() * 100"
                     (input)="onPlantSpacingInput($event)" class="w-full cursor-pointer" style="accent-color: var(--color-leaf-600);" />
            </div>
          } @else {
            <p class="text-xs text-cream-400 italic mt-2">Wähle eine Pflanze, dann ziehe einen Bereich in einem Beet auf.</p>
          }
        }
```

- [ ] **Step 3: Build + suite green, commit.**
```bash
git add frontend/src/app/garden-layout/garden-layout.ts frontend/src/app/garden-layout/garden-layout.html
git commit -m "feat: plant picker + spacing in plant mode"
```

## Task 5: Draw zones in plant mode (pointer → bed cell → addPlantingZone)

**Files:**
- Modify: `frontend/src/app/garden-layout/garden-layout.ts`
- Modify: `frontend/src/app/garden-layout/garden-layout.html`

**Context:** In plant mode, pressing inside a bed (with a plant selected) starts a selection rectangle clamped to that bed; release creates a zone via `addPlantingZone`. The existing canvas pointer handlers (`onCanvasMouseDown/Move/MouseUp` and the touch handlers calling them) must branch on `mode()`.

- [ ] **Step 1: Add planting-draw state + helpers to `garden-layout.ts`.**

```ts
  // Plant-mode drawing
  private plantDrawBedId: string | null = null;
  protected readonly plantSel = signal<{ bedId: string; minCol: number; minRow: number; maxCol: number; maxRow: number } | null>(null);

  private bedById(id: string | null): GardenBed | undefined {
    return id ? this.garden()?.beds.find((b) => b.id === id) : undefined;
  }
```
Add a method that begins/extends/ends a draw from a garden point. Import `bedCellAtPoint` and `bedColsRows`:
```ts
import { bedColsRows, cellTopLeftMeters, bedCellAtPoint } from '../planning/bed-coords';
```
```ts
  /** Returns true if a draw started on a bed (caller then suppresses panning). */
  private plantPointDown(p: Ptr): boolean {
    if (!this.selectedPlant()) return false;
    const pt = this.svgPoint(p);
    if (!pt) return false;
    for (const bed of this.garden()?.beds ?? []) {
      const cell = bedCellAtPoint(pt, bed);
      if (cell) {
        this.plantDrawBedId = bed.id;
        this.plantSel.set({ bedId: bed.id, minCol: cell.col, minRow: cell.row, maxCol: cell.col, maxRow: cell.row });
        return true;
      }
    }
    return false;
  }

  private plantPointMove(p: Ptr) {
    const sel = this.plantSel();
    const bed = this.bedById(this.plantDrawBedId);
    if (!sel || !bed) return;
    const pt = this.svgPoint(p);
    if (!pt) return;
    const { cols, rows } = bedColsRows(bed);
    // clamp the live corner to this bed even if the finger leaves it
    const cell = bedCellAtPoint(pt, bed) ?? this.nearestCell(pt, bed, cols, rows);
    this.plantSel.set({
      bedId: bed.id,
      minCol: Math.min(sel.minCol, cell.col), minRow: Math.min(sel.minRow, cell.row),
      maxCol: Math.max(sel.minCol, cell.col), maxRow: Math.max(sel.minRow, cell.row),
    });
  }

  private nearestCell(pt: { x: number; y: number }, bed: GardenBed, cols: number, rows: number): { col: number; row: number } {
    const cx = bed.xM + bed.widthM / 2, cy = bed.yM + bed.lengthM / 2;
    const a = ((bed.rotationDeg ?? 0) * Math.PI) / 180;
    const dx = pt.x - cx, dy = pt.y - cy;
    const lx = cx + dx * Math.cos(a) + dy * Math.sin(a);
    const ly = cy - dx * Math.sin(a) + dy * Math.cos(a);
    const col = Math.max(0, Math.min(cols - 1, Math.floor(((lx - bed.xM) * 100) / 5)));
    const row = Math.max(0, Math.min(rows - 1, Math.floor(((ly - bed.yM) * 100) / 5)));
    return { col, row };
  }

  private plantPointUp() {
    const sel = this.plantSel();
    const bed = this.bedById(this.plantDrawBedId);
    const g = this.garden();
    const plant = this.selectedPlant();
    this.plantDrawBedId = null;
    this.plantSel.set(null);
    if (!sel || !bed || !g || !plant) return;
    const { cols, rows } = bedColsRows(bed);
    const zoneInputs = [{
      minCol: sel.minCol, minRow: sel.minRow, maxCol: sel.maxCol, maxRow: sel.maxRow,
      spacingFactor: this.plantSpacingFactor(),
      spacingCm: plant.spacingCm, rowSpacingCm: plant.rowSpacingCm ?? plant.spacingCm,
    }];
    const plantCount = computeBedZoneViews(zoneInputs, cols, rows)[0].spots.length;
    const year = new Date().getFullYear();
    this.api.addPlantingZone(g.id, bed.id, year, {
      plantId: plant.id, minCol: sel.minCol, minRow: sel.minRow, maxCol: sel.maxCol, maxRow: sel.maxRow,
      spacingFactor: this.plantSpacingFactor(), plantCount,
    }).subscribe(() => this.loadGarden(g.id));
  }
```
(Also import `computeBedZoneViews`/`ZoneInput` already added in Task 3.)

- [ ] **Step 2: Route pointer events to planting in plant mode (mouse).**

`onCanvasMouseDown(event: Ptr)` — add at the very top (draw if it lands on a bed, otherwise fall through to panning):
```ts
    if (this.mode() === 'plant') { if (this.plantPointDown(event)) return; }
```
`onCanvasMove(event: Ptr)` — add at the very top:
```ts
    if (this.mode() === 'plant' && this.plantSel()) { this.plantPointMove(event); return; }
```
`onCanvasMouseUp(event: Ptr)` — add at the very top:
```ts
    if (this.mode() === 'plant' && this.plantSel()) { this.plantPointUp(); return; }
```
(When no draw is active, `plantSel()` is null so move/up fall through and panning still works in plant mode.)

- [ ] **Step 2b: Stop bed/obstacle handlers from hijacking the gesture in plant mode.**

The bed `<g>` mousedown calls `onBedMouseDown` which `stopPropagation`s, which would prevent the svg-level `onCanvasMouseDown` from running. Guard the three element handlers so, in plant mode, they do nothing and let the event bubble to the canvas:
- top of `onBedMouseDown(bed, event)`: `if (this.mode() === 'plant') return;` (BEFORE `event.stopPropagation()`)
- top of `onObstacleMouseDown(obstacle, event)`: `if (this.mode() === 'plant') return;` (BEFORE `event.stopPropagation()`)
- top of `onRotateHandleMouseDown(bed, event)`: `if (this.mode() === 'plant') return;` (BEFORE `event.stopPropagation()`)

- [ ] **Step 2c: Route touch to planting in plant mode.**

In `onCanvasTouchStart(event: TouchEvent)`, immediately AFTER the existing two-finger pinch branch and BEFORE the single-touch bed/obstacle hit-testing, add:
```ts
    if (this.mode() === 'plant') {
      const t = event.touches[0];
      this.onCanvasMouseDown({ clientX: t.clientX, clientY: t.clientY, target: t.target, button: 0 });
      event.preventDefault();
      return;
    }
```
The existing `onCanvasTouchMove`/`onCanvasTouchEnd` already delegate to `onCanvasMove`/`onCanvasMouseUp`, which carry the plant short-circuits from Step 2 — so touch drawing and (when no draw is active) touch panning both work.

- [ ] **Step 3: Render the live draw preview (`garden-layout.html`).**

Inside the bed `<g>`, in the `@if (mode() === 'plant')` block added in Task 3, after the spots `@for`, add the selection rectangle for the bed being drawn:
```html
                  @if (plantSel(); as ps) {
                    @if (ps.bedId === b.id) {
                      <rect
                        [attr.x]="b.xM + ps.minCol * 0.05" [attr.y]="b.yM + ps.minRow * 0.05"
                        [attr.width]="(ps.maxCol - ps.minCol + 1) * 0.05" [attr.height]="(ps.maxRow - ps.minRow + 1) * 0.05"
                        fill="rgba(207,102,41,0.25)" stroke="#cf6629" stroke-width="0.02" pointer-events="none" />
                    }
                  }
```

- [ ] **Step 4: Plant-mode cursor.** In `garden-layout.html` on the `canvas-container` div, add `[class.plant-mode]="mode() === 'plant'"`. In `garden-layout.scss` add:
```scss
.canvas-container.plant-mode { cursor: crosshair; }
```

- [ ] **Step 5: Build + suite green; commit.**
```bash
git add frontend/src/app/garden-layout/garden-layout.ts frontend/src/app/garden-layout/garden-layout.html frontend/src/app/garden-layout/garden-layout.scss
git commit -m "feat: draw planting zones across beds in plant mode"
```

## Task 6: Zone removal (legend) + per-bed cell grid on zoom

**Files:**
- Modify: `frontend/src/app/garden-layout/garden-layout.ts`
- Modify: `frontend/src/app/garden-layout/garden-layout.html`

- [ ] **Step 1: Load full zones (for the legend + delete) into state.** In `garden-layout.ts` add:
```ts
  protected readonly bedZonesList = signal<{ bedId: string; bedName: string; zoneId: string; plantName: string; color: string; count: number }[]>([]);
```
In `loadGarden`'s plans subscribe (Task 3, Step 2), while building views, also collect legend rows:
```ts
          // inside plans.forEach, after computing `views`:
          views.forEach((v, idx) => {
            legend.push({ bedId: bed.id, bedName: bed.name, zoneId: plan.zones[idx].id, plantName: v.zone.plant.name, color: plantColor(v.zone.plant), count: v.spots.length });
          });
```
Declare `const legend: ... = []` before the loop and `this.bedZonesList.set(legend)` after. (Add `id` to the zone input mapping is unnecessary — index aligns `views[idx]` with `plan.zones[idx]`.)

- [ ] **Step 2: Remove-zone method.**
```ts
  protected removeZoneById(bedId: string, zoneId: string) {
    const g = this.garden();
    if (!g) return;
    this.api.removePlantingZone(g.id, bedId, new Date().getFullYear(), zoneId).subscribe(() => this.loadGarden(g.id));
  }
```

- [ ] **Step 3: Legend in the plant panel (`garden-layout.html`).** Inside the `@if (mode() === 'plant')` toolbar block (Task 4), after the spacing slider area, add:
```html
          @if (bedZonesList().length) {
            <div class="border-t border-cream-200 pt-3 mt-3">
              <h4 class="text-xs uppercase tracking-[0.12em] text-cream-500 font-semibold m-0 mb-2">Bereiche</h4>
              <div class="space-y-1">
                @for (z of bedZonesList(); track z.zoneId) {
                  <div class="flex items-center gap-2 py-1">
                    <span class="w-3 h-3 rounded flex-shrink-0" [style.background]="z.color"></span>
                    <span class="flex-1 text-xs text-cream-700 truncate">{{ z.plantName }} <small class="text-cream-400">· {{ z.bedName }} ({{ z.count }})</small></span>
                    <button class="text-cream-400 hover:text-red-700 text-base leading-none px-1" title="Bereich entfernen" (click)="removeZoneById(z.bedId, z.zoneId)">×</button>
                  </div>
                }
              </div>
            </div>
          }
```

- [ ] **Step 4: Per-bed 5cm grid on zoom (`garden-layout.ts` + `.html`).**
Add a constant + computed near the top of the class:
```ts
  private readonly GRID_ZOOM_THRESHOLD = 6;
  protected readonly showCellGrid = computed(() => this.mode() === 'plant' && this.zoom() >= this.GRID_ZOOM_THRESHOLD);
```
Add a helper returning grid line offsets (metres) for a bed:
```ts
  protected bedGridLines(bed: GardenBed): { xs: number[]; ys: number[] } {
    const { cols, rows } = bedColsRows(bed);
    const xs: number[] = [];
    const ys: number[] = [];
    for (let c = 1; c < cols; c++) xs.push(bed.xM + c * 0.05);
    for (let r = 1; r < rows; r++) ys.push(bed.yM + r * 0.05);
    return { xs, ys };
  }
```
In the bed `<g>` `@if (mode() === 'plant')` block, before the spots `@for`, add:
```html
                  @if (showCellGrid()) {
                    @let grid = bedGridLines(b);
                    @for (gx of grid.xs; track gx) {
                      <line [attr.x1]="gx" [attr.y1]="b.yM" [attr.x2]="gx" [attr.y2]="b.yM + b.lengthM" stroke="#466838" stroke-width="0.004" opacity="0.25" pointer-events="none" />
                    }
                    @for (gy of grid.ys; track gy) {
                      <line [attr.x1]="b.xM" [attr.y1]="gy" [attr.x2]="b.xM + b.widthM" [attr.y2]="gy" stroke="#466838" stroke-width="0.004" opacity="0.25" pointer-events="none" />
                    }
                  }
```

- [ ] **Step 5: Build + suite green; commit.**
```bash
git add frontend/src/app/garden-layout/garden-layout.ts frontend/src/app/garden-layout/garden-layout.html
git commit -m "feat: zone legend/removal + zoom cell grid in plant mode"
```

---

# Phase 3 — Migrate the full panel + remove the bed planner

## Task 7: Move the rich planting panel (inventory tab, fill bed, auto-plant, clear-all) into plant mode

**Files:**
- Modify: `frontend/src/app/garden-layout/garden-layout.ts`, `garden-layout.html`

**Context:** `garden-layout` already has the auto-plant modal + `clearAllPlantings` (built earlier). This task adds: an inventory tab in the plant panel (drag/click to select, like the bed planner), a "Beet füllen" action for a chosen bed, and moves the "Bestand verteilen"/"Alle entfernen" buttons from the Beet-mode toolbar into the plant panel.

- [ ] **Step 1: Move the auto-plant + clear-all buttons.** In `garden-layout.html`, cut the two buttons (`🌱 Bestand verteilen` and `🗑 Alle Pflanzungen entfernen`) out of the `@if (mode() === 'beds')` toolbar block and paste them at the top of the `@if (mode() === 'plant')` block (above the search input). They already call `openAutoPlant()` / `clearAllPlantings()` — no logic change.

- [ ] **Step 2: Inventory tab in the plant panel.** Add to `garden-layout.ts`:
```ts
  protected readonly inventory = signal<InventoryItem[]>([]);
  protected readonly plantTab = signal<'plants' | 'inventory'>('plants');
  protected readonly inventoryPlants = computed(() => {
    const all = this.plants();
    return this.inventory().filter((i) => i.quantity > 0)
      .map((i) => ({ item: i, plant: all.find((p) => p.id === i.plantId) }))
      .filter((x): x is { item: InventoryItem; plant: Plant } => !!x.plant);
  });
```
Load inventory in `ngOnInit`: `this.api.getInventory().subscribe((inv) => this.inventory.set(inv));` and reload it inside `loadGarden`'s completion as well (so counts refresh after planting). Add a `setPlantTab(tab)` method. In the plant panel template, add a tab switcher (Pflanzen | Bestand) mirroring the bed planner's, and an inventory list whose entries call `selectPlantForPlanting(entry.plant)` and show `entry.item.quantity`. Reference the bed planner's inventory markup in `frontend/src/app/bed-planner/bed-planner.html` (the `sidebarTab === 'inventory'` block) and adapt the click handler to `selectPlantForPlanting`.

- [ ] **Step 3: "Beet füllen".** Add a method that fills the bed currently under selection — simplest: when a plant is selected, show a "Beet füllen" button per selected bed. Use the existing bed selection: add `protected fillBedWithSelected(bed: GardenBed)` that creates a zone spanning the whole bed:
```ts
  protected fillSelectedBed() {
    const g = this.garden(); const bed = this.selectedBed(); const plant = this.selectedPlant();
    if (!g || !bed || !plant) return;
    const { cols, rows } = bedColsRows(bed);
    const plantCount = computeBedZoneViews([{ minCol: 0, minRow: 0, maxCol: cols - 1, maxRow: rows - 1, spacingFactor: this.plantSpacingFactor(), spacingCm: plant.spacingCm, rowSpacingCm: plant.rowSpacingCm ?? plant.spacingCm }], cols, rows)[0].spots.length;
    this.api.addPlantingZone(g.id, bed.id, new Date().getFullYear(), { plantId: plant.id, minCol: 0, minRow: 0, maxCol: cols - 1, maxRow: rows - 1, spacingFactor: this.plantSpacingFactor(), plantCount }).subscribe(() => this.loadGarden(g.id));
  }
```
In plant mode, tapping a bed (no drag) selects it for "Beet füllen": adjust `plantPointDown` so a click without drag movement also sets `this.selectedBed.set(bed)`. Show a "🌿 Beet füllen" button in the plant panel when `selectedBed()` and `selectedPlant()` are both set.

- [ ] **Step 4: Build + suite green; commit.**
```bash
git add frontend/src/app/garden-layout/garden-layout.ts frontend/src/app/garden-layout/garden-layout.html
git commit -m "feat: full planting panel (inventory, fill bed, auto-plant) in plant mode"
```

## Task 8: Remove the bed planner; repoint navigation

**Files:**
- Delete: `frontend/src/app/bed-planner/bed-planner.ts`, `.html`, `.scss`, `.spec.ts` (if any)
- Modify: `frontend/src/app/app.routes.ts`, `frontend/src/app/garden-layout/garden-layout.ts` (`openBedPlanner`), any template linking to the bed route.

- [ ] **Step 1: Repoint "Bepflanzen".** In `garden-layout.ts`, change `openBedPlanner()` to switch mode instead of navigating:
```ts
  protected openBedPlanner() {
    this.selectedBed.set(this.selectedBed());
    this.mode.set('plant');
  }
```
(Keeps the selected bed; the user is now in plant mode on the same canvas.)

- [ ] **Step 2: Remove the route.** In `frontend/src/app/app.routes.ts`, delete the `BedPlannerComponent` import and the `{ path: 'gardens/:id/beds/:bedId', ... }` route entry.

- [ ] **Step 3: Find and remove any remaining references.**
Run: `grep -rn "bed-planner\|BedPlanner\|beds/:bedId\|/beds/" frontend/src/app --include=*.ts --include=*.html | grep -v garden-layout`
Resolve each hit (e.g. dashboard links to the bed route → remove/redirect). There should be none left pointing at the bed route.

- [ ] **Step 4: Delete the component files.**
```bash
git rm frontend/src/app/bed-planner/bed-planner.ts frontend/src/app/bed-planner/bed-planner.html frontend/src/app/bed-planner/bed-planner.scss
```
(If a `bed-planner.spec.ts` exists, remove it too.)

- [ ] **Step 5: Verify nothing else imported it.**
Run: `export PATH="/home/lohmann/.nvm/versions/node/v24.15.0/bin:$PATH" && cd frontend && npm run build 2>&1 | grep -cE '✘|ERROR'` → `0`
Run: `npx ng test --watch=false` → all pass.

- [ ] **Step 6: Commit.**
```bash
git add -A
git commit -m "refactor: remove bed-planner; planting lives on the garden canvas"
```

---

## Final verification

- [ ] `npm run build` → 0 errors; `npx ng test --watch=false` → all green (incl. bed-coords + bed-zone-views specs).
- [ ] `grep -rn "BedPlanner\|beds/:bedId" frontend/src` → no results.
- [ ] Manual (needs running app + login): toggle Beet/Pflanzen; in Beet mode place/move/rotate beds; in Pflanz mode pick a plant, zoom in (grid appears), draw a zone in a bed (clamped to it), see spots; draw in another bed; remove via the legend; auto-plant + clear-all from the panel; inventory drops. Confirm a rotated bed plants correctly.

## Notes / risks

- **Rotation mapping** is the highest-risk piece — `bed-coords` is unit-tested with a rotated round-trip to de-risk it.
- **Performance:** the per-bed cell grid only renders above `GRID_ZOOM_THRESHOLD`; spots are plain circles. Acceptable for realistic gardens.
- **`plantCount` consistency:** drawing computes `plantCount` via `computeBedZoneViews` (same function used for rendering), so consumed inventory matches rendered spots — consistent with the auto-plant fix.
- Keep `garden-layout` from ballooning: if the component grows unwieldy while doing Phase 3, it is reasonable to extract the plant panel into a child component, but only if it stays behaviourally identical.
- **Drawing over an existing zone is allowed** (not blocked as the old bed planner did). Overlapping spots are suppressed at render by `computeBedZoneViews`, so the result stays consistent; this is a deliberate simplification. Removal is via the legend, and deletion never conflicts with drawing, so the old "block on occupied cells" rule is unnecessary here.
