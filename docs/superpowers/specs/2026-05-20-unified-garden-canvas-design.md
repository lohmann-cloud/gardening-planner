# Unified Garden Canvas — Design

**Date:** 2026-05-20
**Status:** Approved (pending spec review)

## Goal

Merge the two separate views — garden layout (placing/editing beds & obstacles)
and bed planner (planting within one bed) — into a **single garden canvas** with
a Miro-style **mode toggle**. The user places/edits beds in one mode and plants
across any bed in the other, without ever leaving the view. The separate bed
planner route is removed.

## Decisions (locked)

- **Replace the bed planner entirely.** Route `gardens/:id/beds/:bedId` and the
  `bed-planner` component are removed; planting happens on the garden canvas.
- **Two modes**, toggled in the header (segmented control): **Beet** (beds &
  obstacles) and **Pflanzen** (planting). **Pan/zoom/touch work in both modes.**
- **Per-bed drawing.** A planting rectangle is clipped to the single bed it
  starts in; one zone belongs to one bed (unchanged data model). Plant in bed
  after bed without switching views.
- **Cell grid on zoom.** In planting mode, a faint per-bed 5 cm grid appears once
  zoomed in past a threshold, to help aim.

## Architecture

Extend the existing, working `garden-layout` SVG canvas rather than rewrite it.
Pull the bed planner's planting capability onto that canvas. Keep the component
manageable by extracting the hard, reusable logic into **pure, unit-tested
modules** and keeping rendering in the SVG.

```
garden-layout (canvas + mode orchestration + viewport/pan/zoom/touch)
├── mode = signal<'beds' | 'plant'>
├── Beet mode  → existing toolbar (select / add bed / add obstacle) + bed editing
└── Plant mode → planting panel + zone drawing + in-bed rendering
        ├── planning/bed-coords.ts      (pure: SVG point ⇄ bed-local cell, rotation-aware)
        ├── planning/bed-zone-views.ts  (pure: per-bed zone → plant spots; uses plant-grid)
        └── planning/plant-grid.ts      (existing pure spot positioning)
```

### `planning/bed-coords.ts` (new, pure)
```
bedCellAtPoint(point{x,y in m}, bed{xM,yM,widthM,lengthM,rotationDeg}, cellCm=5)
    -> { col, row } | null      // inverse-rotates around bed centre; null if outside the bed
cellTopLeftMeters(col, row, bed, cellCm=5) -> { x, y }   // garden-meter coords for rendering inside the bed's rotated <g>
bedColsRows(bed, cellCm=5) -> { cols, rows }
```

### `planning/bed-zone-views.ts` (new, pure — extracted from bed-planner)
```
computeBedZoneViews(zones, bedCols, bedRows)
    -> { zone, spots: {col,row}[] }[]   // plant-grid positions + cumulative cross-zone suppression
```
This is the bed planner's `zoneViews` math, moved to one shared home so rendering
and `plantCount` cannot drift. (Auto-plant's existing reuse of `plant-grid`
stays.)

## Beet mode (≈ today's garden layout)

Unchanged behaviour: the toolbar (Auswählen / Beet hinzufügen / Hindernis
hinzufügen), drag/rotate/edit/delete beds, obstacles, "Garten bearbeiten".
Beds render the current **summary** (fill colour + a few icons). The per-bed
**"Bepflanzen"** button switches to Plant mode and frames that bed.

## Plant mode (the bed-planner capability, on the garden canvas)

- **Panel** replaces the toolbar: Pflanzen/Bestand tabs with search, the spacing
  slider, plant info, the zone legend, "Beet füllen", and the **Bestand
  verteilen** + **Alle entfernen** actions (moved here from Beet mode).
- **Rendering per bed (inside its rotated `<g>`):** each zone as a lightly tinted
  area plus its plant-spot icons, computed by `bed-zone-views` and positioned via
  `bed-coords.cellTopLeftMeters`. A faint 5 cm grid is drawn per bed when
  `zoom ≥ GRID_ZOOM_THRESHOLD`.
- **Drawing:** with a plant selected, press-drag inside a bed. The start point
  picks the bed (`bedCellAtPoint`); the drag is clamped to that bed's cell range;
  a live preview shows the cells/spots; release creates a zone via the existing
  `addPlantingZone` (which consumes inventory). Single tap = one-cell zone.
- **Removing:** via the zone legend entry's × (existing `removePlantingZone`,
  restores inventory). Drawing is blocked on cells already covered by a zone, as
  in the bed planner today — so a press on an occupied cell never conflicts with
  draw vs. delete.
- Mouse and touch both drive drawing, reusing the existing `Ptr` pointer
  abstraction and touch handlers already in `garden-layout`.

## Removal

- Delete `bed-planner/` (component, html, scss) and its route; move its still-used
  pure logic into `bed-zone-views.ts` / `plant-grid.ts`.
- Update navigation: dashboard/garden links no longer point to the bed route;
  "Bepflanzen" switches mode instead.

## Phased implementation (for the plan)

1. **Mode toggle + read-only planting render.** Add the toggle; in Plant mode,
   render existing zones/spots (rotation-aware) via the new pure modules. Bed
   planner still present.
2. **Draw & remove zones** in Plant mode (coordinate mapping, preview, create via
   `addPlantingZone`, delete via `removePlantingZone`) + the zoom grid.
3. **Move the panel** (palette, spacing, inventory, fill, auto-plant, clear-all)
   into Plant mode; **remove** the bed-planner route/component and repoint
   navigation.

Each phase builds, passes tests, and leaves the app working.

## Testing

- `bed-coords.ts`: round-trip point↔cell incl. a rotated bed; outside-bed → null.
- `bed-zone-views.ts`: spot counts and cross-zone suppression for a couple of
  layouts (parity with the old bed-planner behaviour).
- Build + existing unit suite stay green; the canvas interaction itself is
  verified by build + manual check (auth-gated app can't run headless here).

## Out of scope

- Zones spanning multiple beds (per-bed only, by choice).
- A full always-on cell grid (only on zoom, per bed, for performance).
- Companion-planting / rotation rules; quantity tuning (unchanged).
