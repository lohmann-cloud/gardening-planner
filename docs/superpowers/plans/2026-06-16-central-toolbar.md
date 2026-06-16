# Zentrale Werkzeugleiste – Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine zentrale, vertikale Icon-Werkzeugleiste am Rand der Zeichenfläche ersetzt den verstreuten Modus-/Werkzeug-Umschalter, mit einem einheitlichen Werkzeug-Schema (Navigieren / Platzieren / Bearbeiten) je Modus, plus neuem Navigieren-Werkzeug, verschiebbaren Hindernissen und bearbeitbaren Pflanzungen.

**Architecture:** Frontend-only Angular-Komponente `garden-layout`. Neue, reine Zell-Geometrie für das Bearbeiten von Pflanzzonen wird nach `src/app/planning/zone-edit.ts` ausgelagert und mit Vitest getestet (Muster wie `bed-coords.ts`). Die Komponente verdrahtet UI/Interaktion (kein Komponenten-Spec, konsistent mit Bestand). Pflanzungs-Änderungen werden ohne Backend-Änderung als „Zone entfernen + neu anlegen" umgesetzt; Hindernisse nutzen das vorhandene `updateObstacle`.

**Tech Stack:** Angular 21 (Signals, standalone, OnPush), Tailwind, Vitest (`@angular/build:unit-test`), RxJS.

**Build/Test-Umgebung:** node liegt unter nvm. Vor jedem npm/test-Befehl:
`export PATH="$(ls -d /home/lohmann/.nvm/versions/node/*/bin | head -1):$PATH"` (cwd: `frontend/`).
- Tests: `npm test -- --run`  · Build: `npm run build`

---

## File Structure

- **Create:** `frontend/src/app/planning/zone-edit.ts` — reine Zell-Geometrie für Pflanzzonen: Verschieben (Versatz + Klammern), Größe ändern (Kante/Ecke), Zonen-Überlappung auf Zellebene.
- **Create:** `frontend/src/app/planning/zone-edit.spec.ts` — Vitest-Tests dazu.
- **Modify:** `frontend/src/app/garden-layout/garden-layout.ts` — Tool-Modell, Navigieren, Obstacle-Drag, Zonen-Auswahl/-Verschieben/-Resize/-Bearbeiten, Touch.
- **Modify:** `frontend/src/app/garden-layout/garden-layout.html` — vertikale Leiste, Entfernen des Header-Umschalters & der Sidebar-Werkzeugknöpfe, Zonen-Hitareas, Selektions-Panel.
- **Modify:** `frontend/src/app/garden-layout/garden-layout.scss` — Stile für die Leiste, Cursor je Werkzeug.

---

## Task 1: Reine Zell-Geometrie für Zonen-Bearbeitung

**Files:**
- Create: `frontend/src/app/planning/zone-edit.ts`
- Test: `frontend/src/app/planning/zone-edit.spec.ts`

- [ ] **Step 1: Failing-Test schreiben** — `frontend/src/app/planning/zone-edit.spec.ts`

```ts
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
```

- [ ] **Step 2: Test ausführen, Fehlschlag prüfen**

Run: `cd frontend && export PATH="$(ls -d /home/lohmann/.nvm/versions/node/*/bin | head -1):$PATH" && npm test -- --run zone-edit`
Expected: FAIL — `zone-edit` Modul/Funktionen nicht gefunden.

- [ ] **Step 3: Implementierung** — `frontend/src/app/planning/zone-edit.ts`

```ts
/** A planting zone as inclusive cell bounds within a bed grid. */
export interface ZoneCells {
  minCol: number;
  minRow: number;
  maxCol: number;
  maxRow: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Shift the whole zone by (dCol,dRow) cells, clamped so it stays inside cols×rows. */
export function moveZone(zone: ZoneCells, dCol: number, dRow: number, cols: number, rows: number): ZoneCells {
  const w = zone.maxCol - zone.minCol;
  const h = zone.maxRow - zone.minRow;
  const minCol = clamp(zone.minCol + dCol, 0, cols - 1 - w);
  const minRow = clamp(zone.minRow + dRow, 0, rows - 1 - h);
  return { minCol, minRow, maxCol: minCol + w, maxRow: minRow + h };
}

export type ZoneEdge = 'left' | 'right' | 'top' | 'bottom';

/** Drag one edge to a new cell index, keeping ≥1 cell and staying inside the grid. */
export function resizeZoneEdge(zone: ZoneCells, edge: ZoneEdge, toCell: number, cols: number, rows: number): ZoneCells {
  const r = { ...zone };
  switch (edge) {
    case 'left':   r.minCol = clamp(Math.min(toCell, r.maxCol), 0, r.maxCol); break;
    case 'right':  r.maxCol = clamp(Math.max(toCell, r.minCol), r.minCol, cols - 1); break;
    case 'top':    r.minRow = clamp(Math.min(toCell, r.maxRow), 0, r.maxRow); break;
    case 'bottom': r.maxRow = clamp(Math.max(toCell, r.minRow), r.minRow, rows - 1); break;
  }
  return r;
}

/** Inclusive-bounds rectangle overlap on the cell grid. */
export function zonesOverlap(a: ZoneCells, b: ZoneCells): boolean {
  return a.minCol <= b.maxCol && a.maxCol >= b.minCol && a.minRow <= b.maxRow && a.maxRow >= b.minRow;
}
```

- [ ] **Step 4: Test ausführen, grün prüfen**

Run: `cd frontend && export PATH="$(ls -d /home/lohmann/.nvm/versions/node/*/bin | head -1):$PATH" && npm test -- --run zone-edit`
Expected: PASS (alle 8 Fälle grün).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/planning/zone-edit.ts frontend/src/app/planning/zone-edit.spec.ts
git commit -m "feat(planning): cell geometry for planting-zone move/resize/overlap"
```

---

## Task 2: Werkzeug-Modell umbauen (Navigieren, einheitliches Schema)

**Files:**
- Modify: `frontend/src/app/garden-layout/garden-layout.ts` (Typ Z.14, Signal Z.41, Handler Z.214–443, enterMode Z.772–776, Touch Z.612–679)

Mapping: altes `'select'` → `'edit'`; neu `'navigate'` (Standard) und `'plant'` (Platzieren im Pflanzen-Modus).

- [ ] **Step 1: Tool-Typ & Default** — Z.14 und Z.41

`type Tool = 'select' | 'bed' | 'obstacle';` → ersetzen durch:
```ts
type Tool = 'navigate' | 'bed' | 'obstacle' | 'plant' | 'edit';
```
`protected readonly tool = signal<Tool>('select');` → `signal<Tool>('navigate');`

- [ ] **Step 2: `enterMode` setzt Standard-Werkzeug** — Z.772–776

```ts
  protected enterMode(m: 'beds' | 'plant') {
    this.mode.set(m);
    this.cancelPlantSelection();
    this.clearSelection();
    this.selectTool('navigate');
  }

  /** Switch the active tool; closes transient state and the mobile drawer. */
  protected selectTool(t: Tool) {
    this.tool.set(t);
    this.cancelPlantSelection();
    if (t !== 'edit') this.clearSelection();
    this.selectedZone.set(null);
    // open the picker drawer only where it's needed
    this.toolbarOpen.set(this.mode() === 'plant' && (t === 'plant' || t === 'edit'));
  }
```
(`selectedZone` wird in Task 5 eingeführt; falls Task 5 noch nicht erledigt, die Zeile `this.selectedZone.set(null);` zunächst weglassen und in Task 5 ergänzen.)

- [ ] **Step 3: Platzieren an `tool==='plant'` koppeln** — `onCanvasMouseDown` Z.216, `onCanvasMove` Z.223, `onCanvasMouseUp` Z.292

Jeweils `if (this.mode() === 'plant')` → `if (this.mode() === 'plant' && this.tool() === 'plant')` für die *Pflanz-Zeichnen*-Pfade:
- Z.216: `if (this.mode() === 'plant' && this.tool() === 'plant') { if (this.plantPointDown(event)) return; }`
- Z.223: `if (this.mode() === 'plant' && this.tool() === 'plant' && this.plantDrawBedId) { this.plantPointMove(event); return; }`
- Z.292: `if (this.mode() === 'plant' && this.tool() === 'plant' && this.plantDrawBedId) { this.plantPointUp(); return; }`

- [ ] **Step 4: `select` → `edit` in Guards** — Z.275, 340, 381, 401, 443; `handleBackgroundClick` Z.338

- `updateGhost` Z.275: `if (this.tool() === 'select' || !this.garden())` → `if ((this.tool() !== 'bed' && this.tool() !== 'obstacle') || !this.garden())`
- `handleBackgroundClick` Z.338–343: Statt `if (this.mode() !== 'beds') return;` und `if (this.tool() === 'select')`:
```ts
  private handleBackgroundClick(event: Ptr) {
    const g = this.garden();
    if (this.tool() === 'navigate' || this.tool() === 'edit') { this.clearSelection(); this.selectedZone.set(null); return; }
    const gh = this.ghost();
    if (!g || !gh) return;
    if (this.tool() === 'bed') { /* unverändert ab Z.347 */ }
    else if (this.tool() === 'obstacle') { /* unverändert ab Z.359 */ }
  }
```
- `startBedDrag` Z.381: `if (this.tool() !== 'select') return;` → `if (this.tool() !== 'edit') return;`
- `selectObstacleCore` Z.401: `if (this.tool() !== 'select') return;` → `if (this.tool() !== 'edit') return;`
- `selectObstacle` Z.443: `if (this.tool() !== 'select') return;` → `if (this.tool() !== 'edit') return;`

- [ ] **Step 5: Navigieren unterdrückt Objekt-Eingriff** — `onBedMouseDown` Z.374, `onObstacleMouseDown` Z.394, `onRotateHandleMouseDown` Z.408

Bedingung `if (this.mode() === 'plant') return;` jeweils ersetzen durch `if (this.tool() !== 'edit') return;`. Dadurch reicht im `navigate`-/Platzier-Werkzeug der Mausdown zum Canvas (Pan) durch, statt ein Objekt zu greifen.

- [ ] **Step 6: Touch an neues Schema anpassen** — Z.618, 633–642, 656, 673

- Z.618: `if (this.mode() === 'plant') {` → `if (this.mode() === 'plant' && this.tool() === 'plant') {`
- Z.633: `} else if (bedG && this.tool() === 'select') {` → `'edit'`
- Z.636: `} else if (obsG && this.tool() === 'select') {` → `'edit'`
- Z.639: `} else if (this.tool() === 'select') {` → `} else if (this.tool() === 'navigate' || this.tool() === 'edit') {`
- Z.656: `if (this.tool() !== 'select' && ...)` → `if ((this.tool() === 'bed' || this.tool() === 'obstacle') && !this.draggedBed() && !this.rotatingBed() && !this.isPanning())`
- Z.673: `if (this.tool() !== 'select' && this.ghost()) {` → `if ((this.tool() === 'bed' || this.tool() === 'obstacle') && this.ghost()) {`

- [ ] **Step 7: Build prüfen**

Run: `cd frontend && export PATH="$(ls -d /home/lohmann/.nvm/versions/node/*/bin | head -1):$PATH" && npm run build`
Expected: Build OK. (Template referenziert noch `tool()==='select'` an Stellen, die in Task 3 ersetzt werden — falls der Build wegen des Typs meckert, Task 3 direkt anschließen und gemeinsam committen.)

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/garden-layout/garden-layout.ts
git commit -m "feat(layout): unified tool model with navigate/edit tools"
```

---

## Task 3: Vertikale Icon-Leiste + Template-Umbau

**Files:**
- Modify: `frontend/src/app/garden-layout/garden-layout.html` (Header Z.12–23, Sidebar-Werkzeuge Z.41–62 + `@switch` Z.66, Canvas Z.206–223)
- Modify: `frontend/src/app/garden-layout/garden-layout.scss`

Icons (mit `title`/`aria-label`, da Icon-only): Modus Beet `🟫`, Modus Pflanzen `🌿`; Navigieren `✋`, Beet `▢`, Hindernis `■`, Pflanzen `🌱`, Bearbeiten `✎`.

- [ ] **Step 1: Header-Umschalter entfernen** — `garden-layout.html` Z.12–23 (der gesamte `<div class="mode-toggle">…</div>`-Block) löschen.

- [ ] **Step 2: Vertikale Leiste in den Canvas-Container einfügen** — direkt nach der öffnenden `<div class="canvas-container" …>` (nach Z.216), vor den `zoom-controls`:

```html
        <div class="tool-rail absolute top-4 left-4 z-10 flex flex-col gap-1 bg-white/95 backdrop-blur border border-cream-200 rounded-xl p-1 shadow-md">
          <!-- Modus -->
          <button class="rail-btn" type="button" [class.active]="mode() === 'beds'"
                  (click)="enterMode('beds')" title="Beet-Modus" aria-label="Beet-Modus">🟫</button>
          <button class="rail-btn" type="button" [class.active]="mode() === 'plant'"
                  (click)="enterMode('plant')" title="Pflanzen-Modus" aria-label="Pflanzen-Modus">🌿</button>
          <div class="rail-divider"></div>
          <!-- Werkzeuge -->
          <button class="rail-btn" type="button" [class.active]="tool() === 'navigate'"
                  (click)="selectTool('navigate')" title="Navigieren" aria-label="Navigieren">✋</button>
          @if (mode() === 'beds') {
            <button class="rail-btn" type="button" [class.active]="tool() === 'bed'"
                    (click)="selectTool('bed')" title="Beet platzieren" aria-label="Beet platzieren">▢</button>
            <button class="rail-btn" type="button" [class.active]="tool() === 'obstacle'"
                    (click)="selectTool('obstacle')" title="Hindernis platzieren" aria-label="Hindernis platzieren">■</button>
          } @else {
            <button class="rail-btn" type="button" [class.active]="tool() === 'plant'"
                    (click)="selectTool('plant')" title="Pflanzen" aria-label="Pflanzen">🌱</button>
          }
          <button class="rail-btn" type="button" [class.active]="tool() === 'edit'"
                  (click)="selectTool('edit')" title="Bearbeiten" aria-label="Bearbeiten">✎</button>
        </div>
```

- [ ] **Step 3: Sidebar-Werkzeugknöpfe entfernen & `@switch` anpassen** — `garden-layout.html`

- Block Z.42–64 (Überschrift „Werkzeuge", die drei `tool-btn`-Buttons und die Trennlinie) löschen.
- `@switch (tool())` Z.66: `@case ('select')` → `@case ('edit')` (Z.85). Die `@case ('bed')`/`@case ('obstacle')`-Formulare bleiben unverändert.

- [ ] **Step 4: Canvas-Klassenbindungen anpassen** — `garden-layout.html` Z.209

`[class.placement-mode]="tool() !== 'select'"` → `[class.placement-mode]="tool() === 'bed' || tool() === 'obstacle'"`
`[class.navigate-mode]="tool() === 'navigate'"` als neue Bindung ergänzen.

- [ ] **Step 5: Rotation-Handle-Bedingung** — `garden-layout.html` Z.353

`@if (mode() === 'beds' && tool() === 'select' && selectedBed()?.id === b.id)` → `@if (mode() === 'beds' && tool() === 'edit' && selectedBed()?.id === b.id)`

- [ ] **Step 6: SCSS für die Leiste** — `garden-layout.scss` anhängen:

```scss
.tool-rail {
  .rail-btn {
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    border-radius: 0.6rem;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: background-color 0.15s, box-shadow 0.15s;
    &:hover { background: var(--color-cream-100, #efe9db); }
    &.active {
      background: #fff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
      outline: 2px solid var(--color-leaf-600, #466838);
    }
  }
  .rail-divider {
    height: 1px;
    margin: 0.15rem 0.3rem;
    background: var(--color-cream-200, #ddd0b5);
  }
}
.canvas-container.navigate-mode { cursor: grab; }
.canvas-container.navigate-mode.is-panning { cursor: grabbing; }
```

- [ ] **Step 7: Build prüfen**

Run: `cd frontend && export PATH="$(ls -d /home/lohmann/.nvm/versions/node/*/bin | head -1):$PATH" && npm run build`
Expected: Build OK, keine Template-Referenz mehr auf `'select'`.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/garden-layout/garden-layout.html frontend/src/app/garden-layout/garden-layout.scss
git commit -m "feat(layout): central vertical tool rail, drop header/sidebar switchers"
```

---

## Task 4: Hindernisse verschieben (im Bearbeiten-Werkzeug)

**Files:**
- Modify: `frontend/src/app/garden-layout/garden-layout.ts` (Drag-State Z.108–111, `selectObstacleCore` Z.400, `onCanvasMove` Z.237, `onCanvasMouseUp` Z.310, `cancelDrag` Z.426, Touch Z.636)
- Modify: `frontend/src/app/garden-layout/garden-layout.html` (Obstacle-`<g>` Z.262–282)

Hindernisse haben keine Rotation → einfache Klammer + Snap an andere Beete/Hindernisse nicht nötig (nur Garten-Grenzen, analog Beet ohne `snapToOtherBeds`).

- [ ] **Step 1: Drag-State für Hindernisse** — nach Z.111 ergänzen:

```ts
  // Obstacle drag
  protected readonly draggedObstacle = signal<Obstacle | null>(null);
  private readonly obsDragOffset = signal<{ dx: number; dy: number } | null>(null);
  protected readonly obsDragPos = signal<{ x: number; y: number } | null>(null);
```

- [ ] **Step 2: Drag in `selectObstacleCore` starten** — `selectObstacleCore` Z.400–406 ersetzen:

```ts
  private selectObstacleCore(obstacle: Obstacle, p?: Ptr) {
    if (this.tool() !== 'edit') return;
    this.selectedObstacle.set(obstacle);
    this.selectedBed.set(null);
    this.editingBed.set(false);
    this.toolbarOpen.set(true);
    if (!p) return;
    const pt = this.svgPoint(p);
    if (!pt) return;
    this.draggedObstacle.set(obstacle);
    this.obsDragOffset.set({ dx: pt.x - obstacle.xM, dy: pt.y - obstacle.yM });
    this.obsDragPos.set({ x: obstacle.xM, y: obstacle.yM });
  }
```
Aufruf in `onObstacleMouseDown` Z.397: `this.selectObstacleCore(obstacle);` → `this.selectObstacleCore(obstacle, event);`
Aufruf im Touch-Pfad Z.638: `if (obs) this.selectObstacleCore(obs);` → `if (obs) this.selectObstacleCore(obs, ptr);`

- [ ] **Step 3: Drag-Bewegung** — in `onCanvasMove` vor dem „Bed drag"-Block (vor Z.238) einfügen:

```ts
    // Obstacle drag
    const draggingObs = this.draggedObstacle();
    if (draggingObs) {
      const pt = this.svgPoint(event);
      if (!pt) return;
      const offset = this.obsDragOffset()!;
      const g = this.garden()!;
      let x = this.snap(pt.x - offset.dx);
      let y = this.snap(pt.y - offset.dy);
      x = Math.max(0, Math.min(x, g.widthM - draggingObs.widthM));
      y = Math.max(0, Math.min(y, g.lengthM - draggingObs.lengthM));
      this.obsDragPos.set({ x, y });
      return;
    }
```

- [ ] **Step 4: Drag-Ende → speichern** — in `onCanvasMouseUp` vor dem „Bed drag end"-Block (vor Z.311) einfügen:

```ts
    // Obstacle drag end
    const obs = this.draggedObstacle();
    const obsPos = this.obsDragPos();
    const gObs = this.garden();
    if (obs && obsPos && gObs) {
      this.draggedObstacle.set(null);
      this.obsDragOffset.set(null);
      this.obsDragPos.set(null);
      if (obsPos.x !== obs.xM || obsPos.y !== obs.yM) {
        this.api.updateObstacle(gObs.id, obs.id, { xM: obsPos.x, yM: obsPos.y }).subscribe((updated) => {
          this.selectedObstacle.set(updated);
          this.loadGarden(gObs.id);
        });
      }
      return;
    }
```

- [ ] **Step 5: `cancelDrag` aufräumen** — in `cancelDrag` (Z.426) ergänzen:

```ts
    this.draggedObstacle.set(null);
    this.obsDragOffset.set(null);
    this.obsDragPos.set(null);
```

- [ ] **Step 6: Template – Live-Position beim Ziehen** — `garden-layout.html` Obstacle-`<rect>` Z.269:

`[attr.x]="o.xM"` → `[attr.x]="draggedObstacle()?.id === o.id ? (obsDragPos()?.x ?? o.xM) : o.xM"`
`[attr.y]="o.yM"` → `[attr.y]="draggedObstacle()?.id === o.id ? (obsDragPos()?.y ?? o.yM) : o.yM"`
Und das `<text>`-Zentrum (Z.276) analog mit der Live-Position berechnen (gleicher Ausdruck `+ o.widthM/2` bzw. `+ o.lengthM/2`).

- [ ] **Step 7: Build + Smoke** — `npm run build` (OK). Manuell: Bearbeiten-Werkzeug → Hindernis lässt sich ziehen und bleibt nach Reload an neuer Stelle.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/garden-layout/garden-layout.ts frontend/src/app/garden-layout/garden-layout.html
git commit -m "feat(layout): drag-move obstacles in edit tool"
```

---

## Task 5: Pflanzungen auswählen, bearbeiten (Abstand) und löschen

**Files:**
- Modify: `frontend/src/app/garden-layout/garden-layout.ts` (neues `selectedZone`-Signal + Helfer; `clearSelection` Z.952)
- Modify: `frontend/src/app/garden-layout/garden-layout.html` (Zonen-Hitarea im Bed-`<g>` Z.308; Sidebar-Panel im Pflanzen-Modus)

Datenquelle: `bedZoneInputs` (Map bedId→ZoneInput[]) und `bedZonesList` (zoneId, plantName, color, count) sind bereits vorhanden (Z.58/66, gefüllt in `loadGarden` Z.897/929).

- [ ] **Step 1: Auswahl-Signal + Helfer** — nach Z.79 (`plantSel`) ergänzen:

```ts
  /** Currently selected existing planting zone (plant mode, edit tool). */
  protected readonly selectedZone = signal<{ bedId: string; zoneId: string } | null>(null);

  protected selectZone(bedId: string, zoneId: string) {
    if (this.tool() !== 'edit' || this.mode() !== 'plant') return;
    this.selectedZone.set({ bedId, zoneId });
    this.toolbarOpen.set(true);
  }

  protected selectedZoneInfo = computed(() => {
    const sel = this.selectedZone();
    if (!sel) return null;
    return this.bedZonesList().find((z) => z.zoneId === sel.zoneId && z.bedId === sel.bedId) ?? null;
  });
```

- [ ] **Step 2: `clearSelection` erweitern** — Z.952–956:

```ts
  private clearSelection() {
    this.selectedBed.set(null);
    this.selectedObstacle.set(null);
    this.editingBed.set(false);
    this.selectedZone.set(null);
  }
```
(Falls in Task 2 Step 2 die `selectedZone`-Zeile in `selectTool` ausgelassen wurde: jetzt ergänzen.)

- [ ] **Step 3: Abstand ändern & Löschen via entfernen+neu** — neue Methoden (z. B. nach `removeZoneById` Z.1188):

```ts
  /** Resolve the ZoneInput for the selected zone (bedZoneInputs and the per-bed
   *  legend share plan order, so match by index within the bed). */
  private selectedZoneInput(): ZoneInput | null {
    const sel = this.selectedZone();
    if (!sel) return null;
    const perBed = this.bedZonesList().filter((l) => l.bedId === sel.bedId);
    const idx = perBed.findIndex((l) => l.zoneId === sel.zoneId);
    return (this.bedZoneInputs().get(sel.bedId) ?? [])[idx] ?? null;
  }

  /** Re-create the selected zone with a new spacing factor (no zone-update API). */
  protected updateSelectedZoneSpacing(pct: number) {
    const sel = this.selectedZone();
    const g = this.garden();
    const z = this.selectedZoneInput();
    const bed = g?.beds.find((b) => b.id === sel?.bedId);
    if (!sel || !g || !z || !bed) return;
    const year = new Date().getFullYear();
    const factor = pct / 100;
    const { cols, rows } = bedColsRows(bed);
    const views = computeBedZoneViews(
      [{ minCol: z.minCol, minRow: z.minRow, maxCol: z.maxCol, maxRow: z.maxRow,
         spacingFactor: factor, spacingCm: z.spacingCm, rowSpacingCm: z.rowSpacingCm }],
      cols, rows);
    const plantCount = views[0]?.spots.length ?? 0;
    this.api.removePlantingZone(g.id, sel.bedId, year, sel.zoneId).subscribe(() => {
      this.api.addPlantingZone(g.id, sel.bedId, year, {
        plantId: z.plant!.id, minCol: z.minCol, minRow: z.minRow, maxCol: z.maxCol, maxRow: z.maxRow,
        spacingFactor: factor, plantCount,
      }).subscribe(() => { this.selectedZone.set(null); this.loadGarden(g.id); });
    });
  }

  protected deleteSelectedZone() {
    const sel = this.selectedZone();
    if (!sel) return;
    this.selectedZone.set(null);
    this.removeZoneById(sel.bedId, sel.zoneId);
  }
```
Hinweis: `ZoneInput` muss `plant` enthalten (wird in `loadGarden` Z.901 gesetzt). Falls das Typ-Interface `ZoneInput` in `bed-zone-views.ts` `plant` nicht führt, dort als optionales Feld ergänzen (`plant?: Plant`) — Build zeigt es an.

- [ ] **Step 4: Zonen anklickbar machen** — `garden-layout.html` Zonen-`<rect>` Z.308–315. Eine **zweite, transparente Hitarea** je Zone im Pflanzen-Modus/Bearbeiten ergänzen (die sichtbaren Rects bleiben `pointer-events="none"`):

```html
                @if (mode() === 'plant' && tool() === 'edit') {
                  @for (zl of zonesForBed(b.id); track zl.zoneId) {
                    <rect [attr.x]="bx + zl.rect.dx" [attr.y]="by + zl.rect.dy"
                          [attr.width]="zl.rect.w" [attr.height]="zl.rect.h"
                          fill="transparent" class="zone-hit"
                          [attr.stroke]="selectedZone()?.zoneId === zl.zoneId ? '#cf6629' : 'transparent'"
                          [attr.stroke-width]="0.04" [attr.stroke-dasharray]="'0.1 0.05'"
                          (mousedown)="$event.stopPropagation(); selectZone(b.id, zl.zoneId)" />
                  }
                }
```
Dazu einen Helfer, der die Zonen-Rechtecke mit ihrer `zoneId` paart — nach `bedZoneRectsFor` (Z.869) ergänzen:
```ts
  protected zonesForBed(bedId: string): { zoneId: string; rect: BedZoneRect }[] {
    const rects = this.bedZoneRects().get(bedId) ?? [];
    const legend = this.bedZonesList().filter((l) => l.bedId === bedId);
    return rects.map((rect, i) => ({ zoneId: legend[i]?.zoneId ?? String(i), rect }));
  }
```

- [ ] **Step 5: Sidebar-Panel für ausgewählte Zone** — `garden-layout.html` im `@if (mode() === 'plant')`-Block (nach Z.129), oben einfügen:

```html
          @if (tool() === 'edit') {
            @if (selectedZoneInfo(); as zi) {
              <div class="space-y-3 mb-3">
                <h4 class="text-base font-bold text-cream-800 m-0">{{ zi.plantName }}</h4>
                <p class="text-sm text-cream-500 m-0">{{ zi.count }} Pflanzen</p>
                <label class="field-label">Abstand
                  <input type="range" min="30" max="100" step="5"
                         (change)="updateSelectedZoneSpacing(+$any($event.target).value)"
                         class="w-full" style="accent-color: var(--color-leaf-600);" />
                </label>
                <button class="btn btn-danger btn-sm w-full" (click)="deleteSelectedZone()">× Löschen</button>
              </div>
            } @else {
              <p class="text-xs text-cream-400 italic m-0 mb-3">Wähle eine Pflanzung im Garten aus.</p>
            }
          }
```

- [ ] **Step 6: Build + Smoke** — `npm run build`. Manuell: Pflanzen-Modus → Bearbeiten → Pflanzung anklicken (Markierung erscheint), Abstand ändern (Anzahl ändert sich), Löschen funktioniert.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/garden-layout/garden-layout.ts frontend/src/app/garden-layout/garden-layout.html
git commit -m "feat(layout): select, re-space and delete existing plantings"
```

---

## Task 6: Pflanzungen verschieben (Drag im Bearbeiten-Werkzeug)

**Files:**
- Modify: `frontend/src/app/garden-layout/garden-layout.ts` (Zonen-Drag-State + Handler, nutzt `moveZone`/`zonesOverlap` aus Task 1)
- Modify: `frontend/src/app/garden-layout/garden-layout.html` (Hitarea-Drag bindet an Move/Up)

Verschieben = Zelle-Versatz auf die Zone anwenden, gegen andere Zonen desselben Beets auf Überlappung prüfen, beim Loslassen entfernen+neu anlegen.

- [ ] **Step 1: Zonen-Drag-State** — nach `selectedZone` (Task 5) ergänzen:

```ts
  private zoneDragStart: { col: number; row: number; zone: ZoneCells; bedId: string } | null = null;
  protected readonly zoneDragOffset = signal<{ dCol: number; dRow: number } | null>(null);
```
Imports oben ergänzen: `import { ZoneCells, moveZone, zonesOverlap } from '../planning/zone-edit';`

- [ ] **Step 2: Drag starten** — `selectZone` (Task 5) um Startpunkt erweitern; neue Methode für den Pointer-Start:

```ts
  protected zonePointDown(bedId: string, zoneId: string, p: Ptr) {
    this.selectZone(bedId, zoneId);
    const bed = this.bedById(bedId);
    const pt = this.svgPoint(p);
    if (!bed || !pt) return;
    const { cols, rows } = bedColsRows(bed);
    const cell = bedCellAtPoint(pt, bed) ?? this.nearestCell(pt, bed, cols, rows);
    const zi = this.selectedZoneInput();
    if (!zi) return;
    this.zoneDragStart = { col: cell.col, row: cell.row, bedId,
      zone: { minCol: zi.minCol, minRow: zi.minRow, maxCol: zi.maxCol, maxRow: zi.maxRow } };
    this.zoneDragOffset.set({ dCol: 0, dRow: 0 });
  }
```

- [ ] **Step 3: Drag-Bewegung** — in `onCanvasMove` am Anfang (vor dem Pflanz-Zeichnen-Pfad) behandeln:

```ts
    if (this.zoneDragStart) {
      const bed = this.bedById(this.zoneDragStart.bedId);
      const pt = this.svgPoint(event);
      if (!bed || !pt) return;
      const { cols, rows } = bedColsRows(bed);
      const cell = bedCellAtPoint(pt, bed) ?? this.nearestCell(pt, bed, cols, rows);
      this.zoneDragOffset.set({ dCol: cell.col - this.zoneDragStart.col, dRow: cell.row - this.zoneDragStart.row });
      return;
    }
```
Der Aufruf der Move-Behandlung muss vor dem `mode==='plant' && tool==='plant'`-Pfad stehen, da hier `tool==='edit'`.

- [ ] **Step 4: Drag-Ende → verschieben (entfernen+neu)** — in `onCanvasMouseUp` am Anfang:

```ts
    if (this.zoneDragStart) {
      const start = this.zoneDragStart;
      const off = this.zoneDragOffset();
      this.zoneDragStart = null;
      this.zoneDragOffset.set(null);
      const g = this.garden();
      const bed = this.bedById(start.bedId);
      if (!g || !bed || !off || (off.dCol === 0 && off.dRow === 0)) return;
      const { cols, rows } = bedColsRows(bed);
      const moved = moveZone(start.zone, off.dCol, off.dRow, cols, rows);
      const perBed = this.bedZonesList().filter((l) => l.bedId === start.bedId);
      const idx = perBed.findIndex((l) => l.zoneId === this.selectedZone()?.zoneId);
      const others = (this.bedZoneInputs().get(start.bedId) ?? []).filter((_, i) => i !== idx);
      if (others.some((o) => zonesOverlap(moved, o))) return; // illegal move: snap back
      const zi = (this.bedZoneInputs().get(start.bedId) ?? [])[idx];
      const zoneId = this.selectedZone()!.zoneId;
      const year = new Date().getFullYear();
      const views = computeBedZoneViews([{ ...moved, spacingFactor: zi.spacingFactor, spacingCm: zi.spacingCm, rowSpacingCm: zi.rowSpacingCm }], cols, rows);
      const plantCount = views[0]?.spots.length ?? 0;
      this.api.removePlantingZone(g.id, start.bedId, year, zoneId).subscribe(() => {
        this.api.addPlantingZone(g.id, start.bedId, year, {
          plantId: zi.plant!.id, minCol: moved.minCol, minRow: moved.minRow, maxCol: moved.maxCol, maxRow: moved.maxRow,
          spacingFactor: zi.spacingFactor, plantCount,
        }).subscribe(() => { this.selectedZone.set(null); this.loadGarden(g.id); });
      });
      return;
    }
```

- [ ] **Step 5: Hitarea bindet Drag** — `garden-layout.html` (Task 5 Step 4): `(mousedown)`-Handler ersetzen durch `(mousedown)="$event.stopPropagation(); zonePointDown(b.id, zl.zoneId, $event)"`. Live-Versatz im sichtbaren/Hit-Rect optional über `zoneDragOffset()` einrechnen (`+ (zoneDragOffset()?.dCol ?? 0) * 0.05` auf `x`, analog `y`) für visuelles Feedback während des Ziehens.

- [ ] **Step 6: `cancelDrag` & Touch** — in `cancelDrag` (Z.426): `this.zoneDragStart = null; this.zoneDragOffset.set(null);` ergänzen. Touch-Start (Z.618-Bereich): im Pflanzen-Modus mit `tool()==='edit'` den Pfad auf `data-zone`-Hitareas wie bei Beeten routen (Element via `el.closest('[data-zone-id]')`; dazu am Hit-`<rect>` `[attr.data-zone-id]="zl.zoneId"` + `[attr.data-zone-bed]="b.id"` ergänzen und `zonePointDown` mit dem Touch-`ptr` aufrufen).

- [ ] **Step 7: Build + Smoke** — `npm run build`. Manuell: Pflanzen → Bearbeiten → Pflanzung an neue Stelle ziehen; überlappt sie eine andere Zone, springt sie zurück; sonst sitzt sie nach Reload neu.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/garden-layout/garden-layout.ts frontend/src/app/garden-layout/garden-layout.html
git commit -m "feat(layout): drag-move existing plantings in edit tool"
```

---

## Task 7: Gesamt-Verifikation

- [ ] **Step 1: Alle Tests grün**

Run: `cd frontend && export PATH="$(ls -d /home/lohmann/.nvm/versions/node/*/bin | head -1):$PATH" && npm test -- --run`
Expected: alle Specs (inkl. `zone-edit`) PASS.

- [ ] **Step 2: Production-Build**

Run: `cd frontend && export PATH="$(ls -d /home/lohmann/.nvm/versions/node/*/bin | head -1):$PATH" && npm run build`
Expected: Build OK, keine Fehler/ungenutzten `select`-Referenzen.

- [ ] **Step 3: Manuelle Smoke-Liste**
  - Leiste sitzt links auf der Zeichenfläche; Modus- und Werkzeug-Icons wechseln korrekt.
  - Navigieren: Ziehen über Beet/Hindernis/Pflanzung schwenkt nur, verschiebt nichts.
  - Beet-Modus: Beet platzieren, Hindernis platzieren, Bearbeiten (Beet & Hindernis verschieben, Eigenschaften, Löschen).
  - Pflanzen-Modus: Pflanzen platzieren (wie bisher), Bearbeiten (Pflanzung auswählen, verschieben, Abstand ändern, löschen).
  - Mobile (schmsales Fenster/Touch): Leiste sichtbar & bedienbar; Pinch-Zoom unverändert.

- [ ] **Step 4: Abschluss** — siehe Execution-Handoff (Merge nach `main` + push, wie vom Nutzer gewünscht).
```
