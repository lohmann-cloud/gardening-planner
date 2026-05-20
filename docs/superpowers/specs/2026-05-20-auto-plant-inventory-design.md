# Auto-Plant Inventory — Design

**Date:** 2026-05-20
**Status:** Approved (pending spec review)

## Goal

A two-step action in the garden layout that distributes a chosen set of the
user's plant stock across the **free space** of the current garden's beds,
keeping each species in as few contiguous blocks as possible. The user
pre-authorises how far the recommended spacing may be undercut; the tool packs
no tighter than necessary within that limit and reports the result.

## Decisions (locked)

- **Target:** the currently opened garden, current year. Trigger lives in the
  garden-layout page.
- **Existing plantings:** untouched. Only **free space** is filled.
- **Two-step flow:** the user (1) selects which stocked species to plant and
  sets a *minimum spacing* (max densification), then (2) runs it and sees a
  result. No mid-flow confirmation dialog.
- **Amount per species:** the full on-hand `quantity` (the shopping list /
  `toBuy` is ignored). No per-species quantity tuning in the MVP.
- **Overflow:** if some plants do not fit even at the allowed minimum spacing,
  plant the part that fits and report the remainder (do not abort).
- **No backend changes.** Reuse `POST .../zones` (`addPlantingZone`), which
  already consumes inventory per zone via `plantCount`.

## Architecture

Frontend-only. Two new pure modules plus garden-layout integration.

### `plant-grid.ts` (pure, extracted + shared)
The spot-positioning logic currently private in `bed-planner.ts`
(`computePositionsInArea` / `computeGrid`) moves into a shared pure module:

```
plantPositions(minCol, minRow, maxCol, maxRow, bedCols, bedRows,
               spacingCm, rowSpacingCm, factor, cellCm=5): {col,row}[]
```

`bed-planner.ts` is refactored to use it (no behaviour change). Auto-plant uses
the same function so a created zone's `plantCount` exactly matches the spots the
bed planner will render, and so packing capacity tests use the real geometry.

### `auto-plant.ts` (pure)
The planner. No Angular/HTTP dependencies — fully unit-testable.

```
interface AutoPlantBed { id; cols; rows; occupied: Set<"c,r">; }
interface AutoPlantItem { plant: Plant; quantity: number; }
interface AutoPlantZone { bedId; plantId; minCol; minRow; maxCol; maxRow;
                          spacingFactor; plantCount; }
interface AutoPlantResult { zones: AutoPlantZone[]; spacingFactor: number;
                            unplaced: { plantId; plantName; count }[]; }

planInventory(beds: AutoPlantBed[], items: AutoPlantItem[],
              minSpacingFactor: number): AutoPlantResult
```

### Garden-layout integration
- A button **"🌱 Bestand verteilen"** in the toolbar panel (disabled when stock
  is empty).
- A **modal** (same pattern as the existing "Garten bearbeiten" modal, mobile
  friendly) with: species checkboxes (default all checked, showing icon + name
  + quantity), a **minimum-spacing slider** (50–100 % of recommended, default
  100 %), and a "Pflanzen" button.
- On run: load each bed's plan for the year + the full plant catalogue, build
  `AutoPlantBed[]` + `AutoPlantItem[]`, call `planInventory`, create the zones,
  reload, show the result.

## Algorithm

### 1. Free rectangles per bed (spacing-independent, computed once)
- Bed grid is `cols × rows` cells (`cols = floor(widthM*100/5)`, likewise rows).
- `occupied` = union of every existing zone's full rectangle
  (`minCol..maxCol × minRow..maxRow`) **and** every existing individual cell.
- Decompose the free cells into disjoint rectangles by repeatedly extracting the
  **largest empty axis-aligned rectangle** (maximal-rectangle histogram DP),
  carving it out, until no usable free cells remain. Large-first extraction
  yields big contiguous rectangles — ideal for keeping species together.

### 2. Capacity
`capacity(rect, plant, f) = plantPositions(rect, bed, plant, f).length` — the
real geometry, so packing matches rendering.

### 3. Packing at a fixed spacing factor `f`
- For each selected species compute its per-plant block (`spacingCells ×
  rowSpacingCells` at `f`) and total demand = `quantity`.
- Sort species by total area descending (First-Fit-Decreasing).
- For each species, while quantity remains:
  - Prefer the **smallest free rect whose capacity ≥ remaining** (best fit) so
    the whole species stays in one block; otherwise take the free rect with the
    **largest capacity** and fill it (species splits across a few zones).
  - Allocate a sub-rectangle sized to the plants placed, emit an
    `AutoPlantZone` with `plantCount = capacity of that sub-rect`, and
    guillotine-split the remaining free space back into the pool.
  - If no free rect remains, the rest of that species is **unplaced**.

### 4. Spacing-factor selection
- Free-rect geometry is independent of `f`, so compute it once, then re-run
  step 3 for `f` from `1.0` down to `minSpacingFactor` in 0.05 steps.
- Use the **largest `f`** with zero unplaced (don't pack tighter than needed).
- If none is overflow-free, use `minSpacingFactor` and return its best-effort
  zones plus the `unplaced` list.

## UX flow & states

1. Toolbar button → modal opens (Stage 1).
2. Stage 1: checkboxes + min-spacing slider + "Pflanzen".
3. Run → `addPlantingZone` per zone (`forkJoin`), then reload garden + plans.
4. Stage 2 (result): "Gepflanzt bei **X %** des empfohlenen Abstands — N
   Pflanzen verteilt." If `unplaced` is non-empty, list species + counts that
   had no room. Close button.
5. Empty stock → button disabled.
6. Nothing selected → "Pflanzen" disabled.

## Edge cases

- A species with a free rect too small for even one plant at min spacing →
  fully unplaced, reported.
- Bed smaller than one plant block → contributes no usable free rect.
- Re-running after a partial plant: the just-created zones are now "occupied",
  so a second run fills only what is still free (idempotent-ish, non-destructive).
- Inventory is per-user; planting in this garden consumes it for all gardens.

## Out of scope

- Crop-rotation / companion-planting / family or nutrient-demand rules.
- Per-species quantity tuning; planting the shopping list (`toBuy`).
- Cross-garden distribution; atomic bulk persistence (multiple `addPlantingZone`
  calls, not transactional).

## Testing

`plant-grid.ts` and `auto-plant.ts` are pure → unit tests via the existing
Jasmine setup:
- `plant-grid`: spot counts for a few bed/spacing combinations; margin clamping.
- `auto-plant`: everything fits at f=1; densifies only as needed; respects
  `minSpacingFactor`; avoids occupied cells; reports overflow; keeps a species
  contiguous when a single rect suffices.
