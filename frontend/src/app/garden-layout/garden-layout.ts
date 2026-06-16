import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { forkJoin, from, of, concatMap, toArray, catchError } from 'rxjs';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { form, FormField, min, required } from '@angular/forms/signals';
import { ApiService, Garden, GardenBed, Membership, Obstacle, Plant, InventoryItem } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { plantColor, plantColorLight, plantIcon } from '../plant-utils';
import { planInventory, AutoPlantBed, AutoPlantItem, AutoPlantResult } from '../planning/auto-plant';
import { bedColsRows, cellTopLeftMeters, bedCellAtPoint } from '../planning/bed-coords';
import { computeBedZoneViews, ZoneInput } from '../planning/bed-zone-views';
import { CELL_CM } from '../planning/plant-grid';
import { ZoneCells, ZoneEdge, moveZone, resizeZoneEdge, zonesOverlap } from '../planning/zone-edit';

type Tool = 'navigate' | 'bed' | 'obstacle' | 'plant' | 'edit';

/** Minimal pointer shape shared by MouseEvent and Touch so handlers serve both. */
type Ptr = { clientX: number; clientY: number; target: EventTarget | null; button?: number };

interface BedPlantSpot { x: number; y: number; color: string; icon: string; }
/** A bed's zone geometry plus its plant, kept in plan order alongside the legend. */
interface BedZoneInput extends ZoneInput { plant: Plant; }
/** A planted zone's rectangle, offset from the bed origin in metres. */
interface BedZoneRect { dx: number; dy: number; w: number; h: number; fill: string; stroke: string; }

@Component({
  selector: 'app-garden-layout',
  imports: [FormField, RouterModule, DecimalPipe],
  templateUrl: './garden-layout.html',
  styleUrl: './garden-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GardenLayoutComponent implements OnInit {
  protected readonly Math = Math;

  @ViewChild('gardenSvg') private svgRef!: ElementRef<SVGSVGElement>;

  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly garden = signal<Garden | null>(null);
  protected readonly tool = signal<Tool>('navigate');
  protected readonly toolbarOpen = signal(false);
  protected readonly mode = signal<'beds' | 'plant'>('beds');
  protected readonly plants = signal<Plant[]>([]);
  protected readonly selectedPlant = signal<Plant | null>(null);
  protected readonly plantSpacingFactor = signal(1);
  protected readonly plantSearch = signal('');
  protected readonly filteredPlants = computed(() => {
    const q = this.plantSearch().toLowerCase();
    const all = this.plants();
    return q ? all.filter((p) => p.name.toLowerCase().includes(q) || p.botanicalName?.toLowerCase().includes(q)) : all;
  });
  /** Per bed id: rendered plant spots (garden-metre centre of each spot, in the bed's unrotated frame). */
  protected readonly bedSpots = signal<Map<string, BedPlantSpot[]>>(new Map());
  /** Per bed id: the coloured rectangle of each planted zone (only the planted area, not the whole bed). */
  protected readonly bedZoneRects = signal<Map<string, BedZoneRect[]>>(new Map());
  /** Per bed id: the zone inputs (geometry + spacing) of its existing zones, in plan order. */
  protected readonly bedZoneInputs = signal<Map<string, BedZoneInput[]>>(new Map());
  protected readonly autoPlantOpen = signal(false);
  protected readonly autoPlantItems = signal<{ item: InventoryItem; plant: Plant; selected: boolean }[]>([]);
  protected readonly minSpacingPct = signal(100);
  protected readonly autoPlantBusy = signal(false);
  protected readonly autoPlantResult = signal<AutoPlantResult | null>(null);
  protected readonly autoPlantError = signal<string | null>(null);
  protected readonly clearBusy = signal(false);
  protected readonly bedZonesList = signal<{ bedId: string; bedName: string; zoneId: string; plantName: string; color: string; count: number }[]>([]);
  protected readonly inventory = signal<InventoryItem[]>([]);
  protected readonly plantTab = signal<'plants' | 'inventory'>('plants');
  protected readonly inventoryPlants = computed(() => {
    const all = this.plants();
    return this.inventory().filter((i) => i.quantity > 0)
      .map((i) => ({ item: i, plant: all.find((p) => p.id === i.plantId) }))
      .filter((x): x is { item: InventoryItem; plant: Plant } => !!x.plant);
  });

  // Plant-mode drawing
  private plantDrawBedId: string | null = null;
  private plantAnchorCell: { col: number; row: number } | null = null;
  protected readonly plantSel = signal<{ bedId: string; minCol: number; minRow: number; maxCol: number; maxRow: number } | null>(null);

  // Existing-zone editing (plant mode, edit tool)
  protected readonly selectedZone = signal<{ bedId: string; zoneId: string } | null>(null);
  private zoneDragStart: { col: number; row: number; zone: ZoneCells; bedId: string } | null = null;
  protected readonly zoneDragOffset = signal<{ dCol: number; dRow: number } | null>(null);
  private zoneResizeStart: { edge: ZoneEdge; orig: ZoneCells; bedId: string; zoneId: string } | null = null;
  protected readonly zoneResizeBounds = signal<ZoneCells | null>(null);
  protected readonly selectedZoneInfo = computed(() => {
    const sel = this.selectedZone();
    if (!sel) return null;
    return this.bedZonesList().find((z) => z.zoneId === sel.zoneId && z.bedId === sel.bedId) ?? null;
  });

  protected readonly selectedBed = signal<GardenBed | null>(null);
  protected readonly selectedObstacle = signal<Obstacle | null>(null);
  protected readonly editingBed = signal(false);
  protected readonly editingGarden = signal(false);
  protected readonly memberships = signal<Membership[]>([]);
  protected readonly inviteEmail = signal('');
  protected readonly inviteRole = signal<'COLLABORATOR' | 'VIEWER'>('COLLABORATOR');
  protected readonly inviteError = signal<string | null>(null);
  protected readonly inviteBusy = signal(false);
  protected readonly currentUserId = signal<string | null>(null);
  protected readonly isOwner = computed(() =>
    this.memberships().some((m) => m.role === 'OWNER' && m.userId === this.currentUserId())
  );
  protected readonly ghost = signal<{ x: number; y: number; w: number; h: number; type: string } | null>(null);

  // Viewport: pan in pixels, zoom as scale factor
  protected readonly zoom = signal(1);
  protected readonly panX = signal(0);
  protected readonly panY = signal(0);
  protected readonly isPanning = signal(false);
  protected readonly canvasTransform = computed(
    () => `translate(${this.panX()}px, ${this.panY()}px) scale(${this.zoom()})`
  );
  private panningStart: { clientX: number; clientY: number; panX: number; panY: number } | null = null;
  private panMoved = false;

  // Bed drag
  protected readonly draggedBed = signal<GardenBed | null>(null);
  private readonly dragOffset = signal<{ dx: number; dy: number } | null>(null);
  protected readonly dragPos = signal<{ x: number; y: number } | null>(null);
  private lastValidDragPos = signal<{ x: number; y: number } | null>(null);

  // Obstacle drag
  protected readonly draggedObstacle = signal<Obstacle | null>(null);
  private readonly obsDragOffset = signal<{ dx: number; dy: number } | null>(null);
  protected readonly obsDragPos = signal<{ x: number; y: number } | null>(null);

  // Bed rotation
  protected readonly rotatingBed = signal<GardenBed | null>(null);
  private readonly rotationStartAngle = signal(0);
  private readonly rotationBedStart = signal(0);
  protected readonly rotationAngle = signal(0);

  protected readonly gridLinesX = computed(() => {
    const g = this.garden();
    if (!g) return [];
    const lines: number[] = [];
    for (let x = g.gridResolutionM; x < g.widthM; x += g.gridResolutionM) lines.push(x);
    return lines;
  });

  protected readonly gridLinesY = computed(() => {
    const g = this.garden();
    if (!g) return [];
    const lines: number[] = [];
    for (let y = g.gridResolutionM; y < g.lengthM; y += g.gridResolutionM) lines.push(y);
    return lines;
  });

  /** Cell grid lines per bed, recomputed only when the garden changes (geometry is stable otherwise). */
  protected readonly bedGridLinesMap = computed(() => {
    const g = this.garden();
    const map = new Map<string, { xs: number[]; ys: number[] }>();
    if (g) for (const bed of g.beds) map.set(bed.id, this.computeBedGridLines(bed));
    return map;
  });

  private readonly bedModel = signal({ name: 'Beet', widthM: 2, lengthM: 1 });
  protected readonly bedForm = form(this.bedModel, (path) => {
    required(path.name);
    min(path.widthM, 0.5);
    min(path.lengthM, 0.5);
  });

  private readonly editBedModel = signal({ name: '', xM: 0, yM: 0, widthM: 1, lengthM: 1, rotationDeg: 0 });
  protected readonly editBedForm = form(this.editBedModel, (path) => {
    required(path.name);
    min(path.widthM, 0.5);
    min(path.lengthM, 0.5);
    min(path.xM, 0);
    min(path.yM, 0);
  });

  private readonly editGardenModel = signal({ name: '', description: '', widthM: 0, lengthM: 0 });
  protected readonly editGardenForm = form(this.editGardenModel, (path) => {
    required(path.name);
    min(path.widthM, 1);
    min(path.lengthM, 1);
  });

  private readonly obstacleModel = signal({ label: 'Schuppen', widthM: 2, lengthM: 2 });
  protected readonly obstacleForm = form(this.obstacleModel, (path) => {
    required(path.label);
    min(path.widthM, 0.1);
    min(path.lengthM, 0.1);
  });

  private readonly viewPersistence = effect(() => {
    const key = this.viewStorageKey();
    if (!key) return;
    const payload = { z: this.zoom(), px: this.panX(), py: this.panY() };
    try {
      localStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // localStorage may be unavailable (private mode) — silently ignore
    }
  });

  private viewStorageKey(): string | null {
    const id = this.route.snapshot.paramMap.get('id');
    return id ? `garden.view.${id}` : null;
  }

  private restoreView(): void {
    const key = this.viewStorageKey();
    if (!key) return;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const v = JSON.parse(raw);
      if (typeof v?.z === 'number' && typeof v?.px === 'number' && typeof v?.py === 'number') {
        this.zoom.set(v.z);
        this.panX.set(v.px);
        this.panY.set(v.py);
      }
    } catch {
      // corrupted entry — ignore
    }
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.currentUserId.set(this.auth.user()?.id ?? null);
    this.restoreView();
    this.loadGarden(id);
    this.api.getPlants().subscribe((p) => this.plants.set(p));
  }

  protected onCanvasMouseDown(event: Ptr) {
    if ((event.button ?? 0) !== 0) return;
    if (this.mode() === 'plant' && this.tool() === 'plant') { if (this.plantPointDown(event)) return; }
    this.panMoved = false;
    this.isPanning.set(true);
    this.panningStart = { clientX: event.clientX, clientY: event.clientY, panX: this.panX(), panY: this.panY() };
  }

  protected onCanvasMove(event: Ptr) {
    if (this.mode() === 'plant' && this.tool() === 'plant' && this.plantDrawBedId) { this.plantPointMove(event); return; }

    // Existing-zone resize via edge handle (plant mode, edit tool)
    if (this.zoneResizeStart) {
      const rs = this.zoneResizeStart;
      const bed = this.bedById(rs.bedId);
      const pt = this.svgPoint(event);
      if (!bed || !pt) return;
      const { cols, rows } = bedColsRows(bed);
      const cell = bedCellAtPoint(pt, bed) ?? this.nearestCell(pt, bed, cols, rows);
      const toCell = (rs.edge === 'left' || rs.edge === 'right') ? cell.col : cell.row;
      this.zoneResizeBounds.set(resizeZoneEdge(rs.orig, rs.edge, toCell, cols, rows));
      return;
    }

    // Existing-zone drag (plant mode, edit tool)
    if (this.zoneDragStart) {
      const bed = this.bedById(this.zoneDragStart.bedId);
      const pt = this.svgPoint(event);
      if (!bed || !pt) return;
      const { cols, rows } = bedColsRows(bed);
      const cell = bedCellAtPoint(pt, bed) ?? this.nearestCell(pt, bed, cols, rows);
      this.zoneDragOffset.set({ dCol: cell.col - this.zoneDragStart.col, dRow: cell.row - this.zoneDragStart.row });
      return;
    }

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

    // Rotation
    const rotating = this.rotatingBed();
    if (rotating) {
      const pt = this.svgPoint(event);
      if (!pt) return;
      const cx = rotating.xM + rotating.widthM / 2;
      const cy = rotating.yM + rotating.lengthM / 2;
      const currentAngle = Math.atan2(pt.y - cy, pt.x - cx) * (180 / Math.PI);
      const rawAngle = this.rotationBedStart() + (currentAngle - this.rotationStartAngle());
      this.rotationAngle.set(Math.round(rawAngle / 5) * 5);
      return;
    }

    // Bed drag
    const dragging = this.draggedBed();
    if (dragging) {
      const pt = this.svgPoint(event);
      if (!pt) return;
      const offset = this.dragOffset()!;
      const g = this.garden()!;
      let x = this.snap(pt.x - offset.dx);
      let y = this.snap(pt.y - offset.dy);
      x = Math.max(0, Math.min(x, g.widthM - dragging.widthM));
      y = Math.max(0, Math.min(y, g.lengthM - dragging.lengthM));
      const others = g.beds.filter((b) => b.id !== dragging.id);
      ({ x, y } = this.snapToOtherBeds(x, y, dragging, others));
      if (!this.wouldOverlap(x, y, dragging, others)) {
        this.lastValidDragPos.set({ x, y });
        this.dragPos.set({ x, y });
      } else {
        this.dragPos.set(this.lastValidDragPos() ?? { x, y });
      }
      return;
    }

    // Pan
    if (this.isPanning() && this.panningStart) {
      const dx = event.clientX - this.panningStart.clientX;
      const dy = event.clientY - this.panningStart.clientY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.panMoved = true;
      this.panX.set(this.panningStart.panX + dx);
      this.panY.set(this.panningStart.panY + dy);
      return;
    }

    // Ghost placement preview
    this.updateGhost(event);
  }

  private updateGhost(event: Ptr) {
    if ((this.tool() !== 'bed' && this.tool() !== 'obstacle') || !this.garden()) {
      this.ghost.set(null);
      return;
    }
    const pt = this.svgPoint(event);
    if (!pt) return;
    const w = this.tool() === 'bed' ? this.bedForm.widthM().value() : this.obstacleForm.widthM().value();
    const h = this.tool() === 'bed' ? this.bedForm.lengthM().value() : this.obstacleForm.lengthM().value();
    const g = this.garden()!;
    let x = this.snap(pt.x - w / 2);
    let y = this.snap(pt.y - h / 2);
    x = Math.max(0, Math.min(x, g.widthM - w));
    y = Math.max(0, Math.min(y, g.lengthM - h));
    this.ghost.set({ x, y, w, h, type: this.tool() });
  }

  protected onCanvasMouseUp(event: Ptr) {
    if (this.mode() === 'plant' && this.tool() === 'plant' && this.plantDrawBedId) { this.plantPointUp(); return; }

    // Existing-zone drag end → move via remove + re-add (no zone-update API)
    if (this.zoneDragStart) {
      const start = this.zoneDragStart;
      const off = this.zoneDragOffset();
      const zoneId = this.selectedZone()?.zoneId;
      this.zoneDragStart = null;
      this.zoneDragOffset.set(null);
      const bed = this.bedById(start.bedId);
      if (!bed || !off || !zoneId || (off.dCol === 0 && off.dRow === 0)) return;
      const { cols, rows } = bedColsRows(bed);
      this.commitZoneBounds(start.bedId, zoneId, moveZone(start.zone, off.dCol, off.dRow, cols, rows));
      return;
    }

    // Existing-zone resize end → commit new bounds
    if (this.zoneResizeStart) {
      const rs = this.zoneResizeStart;
      const bounds = this.zoneResizeBounds();
      this.zoneResizeStart = null;
      this.zoneResizeBounds.set(null);
      if (bounds) this.commitZoneBounds(rs.bedId, rs.zoneId, bounds);
      return;
    }

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

    // Rotation end
    const rotating = this.rotatingBed();
    if (rotating) {
      const angle = this.rotationAngle();
      const g = this.garden();
      this.rotatingBed.set(null);
      this.rotationStartAngle.set(0);
      this.rotationBedStart.set(0);
      if (g && angle !== (rotating.rotationDeg ?? 0)) {
        this.api.updateBed(g.id, rotating.id, { rotationDeg: angle }).subscribe((updated) => {
          this.selectedBed.set(updated);
          this.loadGarden(g.id);
        });
      }
      return;
    }

    // Bed drag end
    const bed = this.draggedBed();
    const pos = this.dragPos();
    const g = this.garden();
    if (bed && pos && g) {
      this.draggedBed.set(null);
      this.dragOffset.set(null);
      this.dragPos.set(null);
      if (pos.x !== bed.xM || pos.y !== bed.yM) {
        this.api.updateBed(g.id, bed.id, { name: bed.name, xM: pos.x, yM: pos.y, widthM: bed.widthM, lengthM: bed.lengthM })
          .subscribe((updated) => {
            this.selectedBed.set(updated);
            this.loadGarden(g.id);
          });
      }
      return;
    }

    // Pan end — treat as click if barely moved
    if (this.isPanning()) {
      this.isPanning.set(false);
      this.panningStart = null;
      if (!this.panMoved) this.handleBackgroundClick(event);
      return;
    }
  }

  private handleBackgroundClick(event: Ptr) {
    const g = this.garden();
    if (this.tool() === 'navigate' || this.tool() === 'edit') {
      this.clearSelection();
      this.selectedZone.set(null);
      return;
    }
    const gh = this.ghost();
    if (!g || !gh) return;
    if (this.tool() === 'bed') {
      this.clearSelection();
      this.api.createBed(g.id, {
        name: this.bedForm.name().value(),
        xM: gh.x,
        yM: gh.y,
        widthM: this.bedForm.widthM().value(),
        lengthM: this.bedForm.lengthM().value(),
      }).subscribe(() => {
        this.loadGarden(g.id);
        this.bedForm.name().value.set(`Beet ${(g.beds.length ?? 0) + 2}`);
      });
    } else if (this.tool() === 'obstacle') {
      this.clearSelection();
      this.api.createObstacle(g.id, {
        label: this.obstacleForm.label().value(),
        xM: gh.x,
        yM: gh.y,
        widthM: this.obstacleForm.widthM().value(),
        lengthM: this.obstacleForm.lengthM().value(),
      }).subscribe(() => this.loadGarden(g.id));
    }
  }

  protected toggleToolbar() {
    this.toolbarOpen.update((v) => !v);
  }

  protected onBedMouseDown(bed: GardenBed, event: MouseEvent) {
    if (this.mode() !== 'beds' || this.tool() !== 'edit') return;
    event.stopPropagation();
    this.startBedDrag(bed, event);
  }

  private startBedDrag(bed: GardenBed, p: Ptr) {
    if (this.mode() !== 'beds' || this.tool() !== 'edit') return;
    this.selectedBed.set(bed);
    this.selectedObstacle.set(null);
    this.editingBed.set(false);
    this.toolbarOpen.set(true);
    const pt = this.svgPoint(p);
    if (!pt) return;
    this.draggedBed.set(bed);
    this.dragOffset.set({ dx: pt.x - bed.xM, dy: pt.y - bed.yM });
    this.dragPos.set({ x: bed.xM, y: bed.yM });
    this.lastValidDragPos.set({ x: bed.xM, y: bed.yM });
  }

  protected onObstacleMouseDown(obstacle: Obstacle, event: MouseEvent) {
    if (this.mode() !== 'beds' || this.tool() !== 'edit') return;
    event.stopPropagation();
    this.selectObstacleCore(obstacle, event);
  }

  private selectObstacleCore(obstacle: Obstacle, p?: Ptr) {
    if (this.mode() !== 'beds' || this.tool() !== 'edit') return;
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

  protected onRotateHandleMouseDown(bed: GardenBed, event: MouseEvent) {
    if (this.mode() !== 'beds' || this.tool() !== 'edit') return;
    event.stopPropagation();
    this.startRotate(bed, event);
  }

  private startRotate(bed: GardenBed, p: Ptr) {
    const pt = this.svgPoint(p);
    if (!pt) return;
    const cx = bed.xM + bed.widthM / 2;
    const cy = bed.yM + bed.lengthM / 2;
    const startAngle = Math.atan2(pt.y - cy, pt.x - cx) * (180 / Math.PI);
    this.rotatingBed.set(bed);
    this.rotationStartAngle.set(startAngle);
    this.rotationBedStart.set(bed.rotationDeg ?? 0);
    this.rotationAngle.set(bed.rotationDeg ?? 0);
  }

  protected cancelDrag() {
    this.draggedBed.set(null);
    this.dragOffset.set(null);
    this.dragPos.set(null);
    this.lastValidDragPos.set(null);
    this.rotatingBed.set(null);
    this.rotationStartAngle.set(0);
    this.rotationBedStart.set(0);
    this.draggedObstacle.set(null);
    this.obsDragOffset.set(null);
    this.obsDragPos.set(null);
    this.zoneDragStart = null;
    this.zoneDragOffset.set(null);
    this.zoneResizeStart = null;
    this.zoneResizeBounds.set(null);
    this.isPanning.set(false);
    this.panningStart = null;
    // End any in-progress draw, but KEEP plantSel — a pending selection awaiting
    // confirmation must survive the pointer leaving the canvas (e.g. to reach the bar).
    this.plantDrawBedId = null;
    this.plantAnchorCell = null;
  }

  protected selectObstacle(obstacle: Obstacle) {
    if (this.tool() !== 'edit') return;
    this.selectedObstacle.set(obstacle);
    this.selectedBed.set(null);
    this.editingBed.set(false);
  }

  protected startEditBed() {
    const bed = this.selectedBed();
    if (!bed) return;
    this.editBedModel.set({ name: bed.name, xM: bed.xM, yM: bed.yM, widthM: bed.widthM, lengthM: bed.lengthM, rotationDeg: bed.rotationDeg ?? 0 });
    this.editingBed.set(true);
  }

  protected saveEditBed() {
    const bed = this.selectedBed();
    const g = this.garden();
    if (!bed || !g) return;
    this.api.updateBed(g.id, bed.id, {
      name: this.editBedForm.name().value(),
      xM: this.editBedForm.xM().value(),
      yM: this.editBedForm.yM().value(),
      widthM: this.editBedForm.widthM().value(),
      lengthM: this.editBedForm.lengthM().value(),
      rotationDeg: this.editBedForm.rotationDeg().value(),
    }).subscribe((updated) => {
      this.editingBed.set(false);
      this.selectedBed.set(updated);
      this.loadGarden(g.id);
    });
  }

  protected cancelEditBed() {
    this.editingBed.set(false);
  }

  protected startEditGarden() {
    const g = this.garden();
    if (!g) return;
    this.editGardenModel.set({
      name: g.name,
      description: g.description ?? '',
      widthM: g.widthM,
      lengthM: g.lengthM,
    });
    this.inviteEmail.set('');
    this.inviteError.set(null);
    this.editingGarden.set(true);
    this.api.getMemberships(g.id).subscribe((m) => this.memberships.set(m));
  }

  protected inviteMember() {
    const g = this.garden();
    const email = this.inviteEmail().trim();
    if (!g || !email) return;
    this.inviteError.set(null);
    this.inviteBusy.set(true);
    this.api.inviteMember(g.id, { email, role: this.inviteRole() }).subscribe({
      next: (m) => {
        this.inviteBusy.set(false);
        this.inviteEmail.set('');
        this.memberships.update((list) => {
          const existing = list.findIndex((x) => x.userId === m.userId);
          if (existing >= 0) {
            const copy = [...list];
            copy[existing] = m;
            return copy;
          }
          return [...list, m];
        });
      },
      error: (err) => {
        this.inviteBusy.set(false);
        this.inviteError.set(err?.error?.message ?? 'Diese Person konnte nicht eingeladen werden');
      },
    });
  }

  protected removeMember(m: Membership) {
    const g = this.garden();
    if (!g) return;
    if (!confirm(`${m.name || m.email} aus diesem Garten entfernen?`)) return;
    this.api.removeMember(g.id, m.userId).subscribe(() => {
      this.memberships.update((list) => list.filter((x) => x.userId !== m.userId));
    });
  }

  protected saveEditGarden() {
    const g = this.garden();
    if (!g) return;
    const name = this.editGardenForm.name().value();
    const description = this.editGardenForm.description().value();
    const widthM = this.editGardenForm.widthM().value();
    const lengthM = this.editGardenForm.lengthM().value();
    this.api.updateGarden(g.id, { name, description, widthM, lengthM }).subscribe((updated) => {
      this.editingGarden.set(false);
      this.garden.set({ ...g, ...updated });
    });
  }

  protected cancelEditGarden() {
    this.editingGarden.set(false);
  }

  protected deleteGarden() {
    const g = this.garden();
    if (!g) return;
    if (!confirm(`„${g.name}" löschen? Damit werden auch alle Beete und Pflanzungen entfernt.`)) return;
    this.api.deleteGarden(g.id).subscribe(() => this.router.navigate(['/']));
  }

  protected openBedPlanner() {
    this.mode.set('plant');
    this.toolbarOpen.set(false);
  }

  protected deleteBed(bed: GardenBed) {
    const g = this.garden();
    if (!g) return;
    if (!confirm(`„${bed.name}" löschen? Damit werden auch alle Pflanzungen in diesem Beet entfernt.`)) return;
    this.api.deleteBed(g.id, bed.id).subscribe(() => {
      this.selectedBed.set(null);
      this.editingBed.set(false);
      this.loadGarden(g.id);
    });
  }

  protected deleteObstacle(obstacle: Obstacle) {
    const g = this.garden();
    if (!g) return;
    if (!confirm(`„${obstacle.label}" löschen?`)) return;
    this.api.deleteObstacle(g.id, obstacle.id).subscribe(() => {
      this.selectedObstacle.set(null);
      this.loadGarden(g.id);
    });
  }

  protected zoomIn() { this.applyZoom(1.25); }
  protected zoomOut() { this.applyZoom(1 / 1.25); }
  protected zoomReset() { this.zoom.set(1); this.panX.set(0); this.panY.set(0); }

  private applyZoom(factor: number, mx?: number, my?: number) {
    const container = this.svgRef?.nativeElement?.closest('.canvas-container') as HTMLElement;
    const rect = container?.getBoundingClientRect();
    const cx = mx ?? (rect ? rect.width / 2 : 0);
    const cy = my ?? (rect ? rect.height / 2 : 0);
    const oldZoom = this.zoom();
    const newZoom = Math.max(0.1, Math.min(30, oldZoom * factor));
    this.panX.set(cx - (cx - this.panX()) * newZoom / oldZoom);
    this.panY.set(cy - (cy - this.panY()) * newZoom / oldZoom);
    this.zoom.set(newZoom);
  }

  protected onWheel(event: WheelEvent) {
    event.preventDefault();
    const container = event.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    const oldZoom = this.zoom();
    const newZoom = Math.max(0.1, Math.min(30, oldZoom * factor));
    this.panX.set(mx - (mx - this.panX()) * newZoom / oldZoom);
    this.panY.set(my - (my - this.panY()) * newZoom / oldZoom);
    this.zoom.set(newZoom);
  }

  // ─── Touch: pinch-zoom + pan, plus tap/drag routed through the mouse cores ──
  private pinchStart: { dist: number; midX: number; midY: number; zoom: number; panX: number; panY: number } | null = null;

  protected onCanvasTouchStart(event: TouchEvent) {
    if (event.touches.length === 2) {
      this.beginPinch(event);
      event.preventDefault();
      return;
    }
    if (this.mode() === 'plant' && this.tool() === 'plant') {
      const t = event.touches[0];
      this.onCanvasMouseDown({ clientX: t.clientX, clientY: t.clientY, target: t.target, button: 0 });
      event.preventDefault();
      return;
    }
    if (event.touches.length !== 1) return;
    const t = event.touches[0];
    const el = t.target as Element | null;
    const handle = el?.closest?.('[data-rotate-handle]');
    const bedG = el?.closest?.('[data-bed-id]');
    const obsG = el?.closest?.('[data-obstacle-id]');
    const edgeEl = el?.closest?.('[data-zone-edge]');
    const zoneEl = el?.closest?.('[data-zone-id]');
    const ptr: Ptr = { clientX: t.clientX, clientY: t.clientY, target: t.target, button: 0 };
    if (handle && this.selectedBed()) {
      this.startRotate(this.selectedBed()!, ptr);
    } else if (edgeEl && this.mode() === 'plant' && this.tool() === 'edit') {
      this.zoneEdgeDown(edgeEl.getAttribute('data-zone-bed')!, edgeEl.getAttribute('data-zone-id')!,
        edgeEl.getAttribute('data-zone-edge') as ZoneEdge, ptr);
    } else if (zoneEl && this.mode() === 'plant' && this.tool() === 'edit') {
      this.zonePointDown(zoneEl.getAttribute('data-zone-bed')!, zoneEl.getAttribute('data-zone-id')!, ptr);
    } else if (bedG && this.mode() === 'beds' && this.tool() === 'edit') {
      const bed = this.garden()?.beds.find((b) => b.id === bedG.getAttribute('data-bed-id'));
      if (bed) this.startBedDrag(bed, ptr);
    } else if (obsG && this.mode() === 'beds' && this.tool() === 'edit') {
      const obs = this.garden()?.obstacles.find((o) => o.id === obsG.getAttribute('data-obstacle-id'));
      if (obs) this.selectObstacleCore(obs, ptr);
    } else if (this.tool() === 'navigate' || this.tool() === 'edit') {
      this.onCanvasMouseDown(ptr);
    } else {
      this.updateGhost(ptr);
    }
    event.preventDefault();
  }

  protected onCanvasTouchMove(event: TouchEvent) {
    if (this.pinchStart && event.touches.length === 2) {
      this.updatePinch(event);
      event.preventDefault();
      return;
    }
    if (event.touches.length !== 1) return;
    const t = event.touches[0];
    const ptr: Ptr = { clientX: t.clientX, clientY: t.clientY, target: t.target };
    if ((this.tool() === 'bed' || this.tool() === 'obstacle') && !this.draggedBed() && !this.rotatingBed() && !this.isPanning()) {
      this.updateGhost(ptr);
    } else {
      this.onCanvasMove(ptr);
    }
    event.preventDefault();
  }

  protected onCanvasTouchEnd(event: TouchEvent) {
    if (event.touches.length >= 1) {
      if (event.touches.length === 1) this.pinchStart = null;
      return;
    }
    this.pinchStart = null;
    const t = event.changedTouches[0];
    if (!t) { this.cancelDrag(); return; }
    const ptr: Ptr = { clientX: t.clientX, clientY: t.clientY, target: t.target, button: 0 };
    if ((this.tool() === 'bed' || this.tool() === 'obstacle') && this.ghost()) {
      this.handleBackgroundClick(ptr);
      this.ghost.set(null);
    } else {
      this.onCanvasMouseUp(ptr);
    }
  }

  private beginPinch(event: TouchEvent) {
    const [a, b] = [event.touches[0], event.touches[1]];
    const rect = this.canvasRect();
    this.cancelDrag();
    this.pinchStart = {
      dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
      midX: (a.clientX + b.clientX) / 2 - rect.left,
      midY: (a.clientY + b.clientY) / 2 - rect.top,
      zoom: this.zoom(), panX: this.panX(), panY: this.panY(),
    };
  }

  private updatePinch(event: TouchEvent) {
    const ps = this.pinchStart;
    if (!ps) return;
    const [a, b] = [event.touches[0], event.touches[1]];
    const rect = this.canvasRect();
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const midX = (a.clientX + b.clientX) / 2 - rect.left;
    const midY = (a.clientY + b.clientY) / 2 - rect.top;
    const newZoom = Math.max(0.1, Math.min(30, ps.zoom * (dist / ps.dist)));
    const worldX = (ps.midX - ps.panX) / ps.zoom;
    const worldY = (ps.midY - ps.panY) / ps.zoom;
    this.panX.set(midX - worldX * newZoom);
    this.panY.set(midY - worldY * newZoom);
    this.zoom.set(newZoom);
  }

  private canvasRect(): DOMRect {
    const container = this.svgRef.nativeElement.closest('.canvas-container') as HTMLElement;
    return container.getBoundingClientRect();
  }

  protected clearAllPlantings() {
    const g = this.garden();
    if (!g || !g.beds.length || this.clearBusy()) return;
    if (!confirm('Alle Pflanzungen in diesem Garten für dieses Jahr entfernen? Der Bestand wird dabei zurückgebucht.')) return;
    this.clearBusy.set(true);
    const year = new Date().getFullYear();
    // Sequential: each bed's plan deletion restores inventory (read-modify-write),
    // so parallel deletes would race; 404 (bed without a plan) is ignored.
    from(g.beds).pipe(
      concatMap((b) => this.api.deletePlantingPlan(g.id, b.id, year).pipe(catchError(() => of(null)))),
      toArray(),
    ).subscribe({
      next: () => {
        this.clearBusy.set(false);
        this.loadGarden(g.id);
      },
      error: () => {
        this.clearBusy.set(false);
        this.loadGarden(g.id);
      },
    });
  }

  protected openAutoPlant() {
    this.autoPlantResult.set(null);
    this.autoPlantError.set(null);
    this.autoPlantItems.set([]);
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

  protected selectPlantForPlanting(plant: Plant) {
    this.selectedPlant.set(this.selectedPlant()?.id === plant.id ? null : plant);
    this.toolbarOpen.set(false); // close the drawer so the canvas is reachable (no-op on desktop)
  }

  protected enterMode(m: 'beds' | 'plant') {
    this.mode.set(m);
    this.cancelPlantSelection();
    this.clearSelection();
    this.selectTool('navigate');
  }

  /** Switch the active tool; closes transient state and toggles the mobile drawer. */
  protected selectTool(t: Tool) {
    this.tool.set(t);
    this.cancelPlantSelection();
    if (t !== 'edit') this.clearSelection();
    this.selectedZone.set(null);
    // open the picker/details drawer only where it's needed
    this.toolbarOpen.set(this.mode() === 'plant' && (t === 'plant' || t === 'edit'));
  }

  protected setPlantTab(tab: 'plants' | 'inventory') {
    this.plantTab.set(tab);
  }

  protected onPlantSearch(event: Event) {
    this.plantSearch.set((event.target as HTMLInputElement).value);
  }

  protected onPlantSpacingInput(event: Event) {
    this.plantSpacingFactor.set(+(event.target as HTMLInputElement).value / 100);
  }

  protected readonly hasAutoPlantSelection = computed(() =>
    this.autoPlantItems().some((e) => e.selected),
  );

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
    forkJoin(g.beds.map((b) => this.api.getPlantingPlan(g.id, b.id, year))).subscribe({
      next: (plans) => {
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
      // Create zones sequentially: addZone consumes inventory with a
      // read-modify-write, so parallel calls for the same plant would lose
      // updates. concatMap serialises them like the manual planting flow.
      from(result.zones).pipe(
        concatMap((z) => this.api.addPlantingZone(g.id, z.bedId, year, {
          plantId: z.plantId, minCol: z.minCol, minRow: z.minRow, maxCol: z.maxCol, maxRow: z.maxRow,
          spacingFactor: z.spacingFactor, plantCount: z.plantCount,
        })),
        toArray(),
      ).subscribe({
        next: () => {
          this.autoPlantBusy.set(false);
          this.autoPlantResult.set(result);
          this.loadGarden(g.id);
        },
        error: () => {
          this.autoPlantBusy.set(false);
          this.autoPlantError.set('Beim Verteilen ist ein Fehler aufgetreten. Bitte erneut versuchen.');
          this.loadGarden(g.id);
        },
      });
      },
      error: () => {
        this.autoPlantBusy.set(false);
        this.autoPlantError.set('Beim Verteilen ist ein Fehler aufgetreten. Bitte erneut versuchen.');
        this.loadGarden(g.id);
      },
    });
  }

  protected autoPlantPlacedCount(): number {
    return (this.autoPlantResult()?.zones ?? []).reduce((n, z) => n + z.plantCount, 0);
  }

  /** Beds always render as neutral soil; only the planted zones are coloured. */
  protected bedFill(_bedId: string): string {
    return '#e7e0cf';
  }

  protected bedSpotsFor(bedId: string): BedPlantSpot[] {
    return this.bedSpots().get(bedId) ?? [];
  }

  protected bedZoneRectsFor(bedId: string): BedZoneRect[] {
    return this.bedZoneRects().get(bedId) ?? [];
  }

  protected selectedIcon(): string {
    const p = this.selectedPlant();
    return p ? plantIcon(p) : '🌱';
  }

  protected bedStroke(_bedId: string): string {
    return '#b3a98c';
  }

  private loadGarden(id: string) {
    this.api.getInventory().subscribe((inv) => this.inventory.set(inv));
    const year = new Date().getFullYear();
    this.api.getGarden(id).subscribe((g) => {
      this.garden.set(g);
      if (!g.beds.length) return;
      const planRequests = g.beds.map((b) => this.api.getPlantingPlan(id, b.id, year));
      forkJoin(planRequests).subscribe((plans) => {
        const spotsMap = new Map<string, BedPlantSpot[]>();
        const zoneRectsMap = new Map<string, BedZoneRect[]>();
        const inputsMap = new Map<string, BedZoneInput[]>();
        const legend: { bedId: string; bedName: string; zoneId: string; plantName: string; color: string; count: number }[] = [];
        plans.forEach((plan, i) => {
          const bed = g.beds[i];
          const { cols, rows } = bedColsRows(bed);
          const zoneInputs = plan.zones.map((z) => ({
            minCol: z.minCol, minRow: z.minRow, maxCol: z.maxCol, maxRow: z.maxRow,
            spacingFactor: z.spacingFactor ?? 1,
            spacingCm: z.plant.spacingCm, rowSpacingCm: z.plant.rowSpacingCm ?? z.plant.spacingCm,
            plant: z.plant,
          }));
          inputsMap.set(bed.id, zoneInputs);
          const views = computeBedZoneViews(zoneInputs, cols, rows);
          // Colour the area the plants actually occupy: expand outward from the
          // outer plants by half the configured spacing, clamped to the bed.
          const zoneRects: BedZoneRect[] = views.map((v) => {
            const z = v.zone;
            const factor = z.spacingFactor ?? 1;
            const halfCol = Math.ceil(Math.max(1, Math.round((z.spacingCm * factor) / CELL_CM)) / 2);
            const halfRow = Math.ceil(Math.max(1, Math.round((z.rowSpacingCm * factor) / CELL_CM)) / 2);
            let minC = z.minCol, maxC = z.maxCol, minR = z.minRow, maxR = z.maxRow;
            if (v.spots.length) {
              const cs = v.spots.map((s) => s.col);
              const rs = v.spots.map((s) => s.row);
              minC = Math.max(0, Math.min(...cs) - halfCol);
              maxC = Math.min(cols - 1, Math.max(...cs) + halfCol);
              minR = Math.max(0, Math.min(...rs) - halfRow);
              maxR = Math.min(rows - 1, Math.max(...rs) + halfRow);
            }
            return {
              dx: minC * 0.05, dy: minR * 0.05,
              w: (maxC - minC + 1) * 0.05, h: (maxR - minR + 1) * 0.05,
              fill: plantColorLight(z.plant), stroke: plantColor(z.plant),
            };
          });
          if (zoneRects.length) zoneRectsMap.set(bed.id, zoneRects);
          views.forEach((v, idx) => {
            legend.push({ bedId: bed.id, bedName: bed.name, zoneId: plan.zones[idx].id, plantName: v.zone.plant.name, color: plantColor(v.zone.plant), count: v.spots.length });
          });
          const spots: BedPlantSpot[] = [];
          for (const v of views) {
            for (const s of v.spots) {
              const tl = cellTopLeftMeters(s.col, s.row, bed);
              spots.push({ x: tl.x + 0.025, y: tl.y + 0.025, color: plantColor(v.zone.plant), icon: plantIcon(v.zone.plant) });
            }
          }
          for (const c of plan.cells) {
            const tl = cellTopLeftMeters(c.col, c.row, bed);
            spots.push({ x: tl.x + 0.025, y: tl.y + 0.025, color: plantColor(c.plant), icon: plantIcon(c.plant) });
          }
          if (spots.length) spotsMap.set(bed.id, spots);
        });
        this.bedSpots.set(spotsMap);
        this.bedZoneRects.set(zoneRectsMap);
        this.bedZoneInputs.set(inputsMap);
        this.bedZonesList.set(legend);
      });
    });
  }

  private clearSelection() {
    this.selectedBed.set(null);
    this.selectedObstacle.set(null);
    this.editingBed.set(false);
    this.selectedZone.set(null);
  }

  private snapToOtherBeds(x: number, y: number, bed: GardenBed, others: GardenBed[]): { x: number; y: number } {
    const SNAP = 0.15;
    let snappedX = x;
    let snappedY = y;
    const right = x + bed.widthM;
    const bottom = y + bed.lengthM;
    for (const o of others) {
      if ((o.rotationDeg ?? 0) % 90 !== 0) continue;
      const oRight = o.xM + o.widthM;
      const oBottom = o.yM + o.lengthM;
      if (Math.abs(x - oRight) < SNAP) snappedX = oRight;
      else if (Math.abs(right - o.xM) < SNAP) snappedX = o.xM - bed.widthM;
      else if (Math.abs(x - o.xM) < SNAP) snappedX = o.xM;
      else if (Math.abs(right - oRight) < SNAP) snappedX = oRight - bed.widthM;
      if (Math.abs(y - oBottom) < SNAP) snappedY = oBottom;
      else if (Math.abs(bottom - o.yM) < SNAP) snappedY = o.yM - bed.lengthM;
      else if (Math.abs(y - o.yM) < SNAP) snappedY = o.yM;
      else if (Math.abs(bottom - oBottom) < SNAP) snappedY = oBottom - bed.lengthM;
    }
    return { x: snappedX, y: snappedY };
  }

  private wouldOverlap(x: number, y: number, bed: GardenBed, others: GardenBed[]): boolean {
    const rot = bed.rotationDeg ?? 0;
    for (const o of others) {
      if (this.obbOverlap(x, y, bed.widthM, bed.lengthM, rot, o.xM, o.yM, o.widthM, o.lengthM, o.rotationDeg ?? 0)) {
        return true;
      }
    }
    return false;
  }

  private obbOverlap(ax: number, ay: number, aw: number, ah: number, aRot: number,
                     bx: number, by: number, bw: number, bh: number, bRot: number): boolean {
    const cornersA = this.obbCorners(ax, ay, aw, ah, aRot);
    const cornersB = this.obbCorners(bx, by, bw, bh, bRot);
    const aRad = aRot * Math.PI / 180;
    const bRad = bRot * Math.PI / 180;
    const axes: [number, number][] = [
      [Math.cos(aRad), Math.sin(aRad)],
      [-Math.sin(aRad), Math.cos(aRad)],
      [Math.cos(bRad), Math.sin(bRad)],
      [-Math.sin(bRad), Math.cos(bRad)],
    ];
    for (const axis of axes) {
      const [aMin, aMax] = this.projectOBB(cornersA, axis);
      const [bMin, bMax] = this.projectOBB(cornersB, axis);
      if (aMax <= bMin || bMax <= aMin) return false;
    }
    return true;
  }

  private obbCorners(x: number, y: number, w: number, h: number, deg: number): [number, number][] {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const rad = deg * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const hw = w / 2;
    const hh = h / 2;
    return ([ [-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh] ] as [number, number][]).map(
      ([lx, ly]): [number, number] => [cx + lx * cos - ly * sin, cy + lx * sin + ly * cos]
    );
  }

  private projectOBB(corners: [number, number][], axis: [number, number]): [number, number] {
    let min = Infinity, max = -Infinity;
    for (const [cx, cy] of corners) {
      const p = cx * axis[0] + cy * axis[1];
      min = Math.min(min, p);
      max = Math.max(max, p);
    }
    return [min, max];
  }

  private svgPoint(event: Ptr): { x: number; y: number } | null {
    const svg = (event.target as Element).closest('svg') as SVGSVGElement;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const svgPt = pt.matrixTransform(ctm.inverse());
    return { x: svgPt.x, y: svgPt.y };
  }

  private bedById(id: string | null): GardenBed | undefined {
    return id ? this.garden()?.beds.find((b) => b.id === id) : undefined;
  }

  /** Returns true if a draw started on a bed (caller then suppresses panning). */
  private plantPointDown(p: Ptr): boolean {
    if (!this.selectedPlant()) return false;
    const pt = this.svgPoint(p);
    if (!pt) return false;
    for (const bed of this.garden()?.beds ?? []) {
      const cell = bedCellAtPoint(pt, bed);
      if (cell) {
        // Don't start a selection on a cell already covered by a zone.
        const occupied = (this.bedZoneInputs().get(bed.id) ?? []).some(
          (z) => cell.col >= z.minCol && cell.col <= z.maxCol && cell.row >= z.minRow && cell.row <= z.maxRow,
        );
        if (occupied) return false;
        this.plantDrawBedId = bed.id;
        this.plantAnchorCell = { col: cell.col, row: cell.row };
        this.plantSel.set({ bedId: bed.id, minCol: cell.col, minRow: cell.row, maxCol: cell.col, maxRow: cell.row });
        return true;
      }
    }
    return false;
  }

  private plantPointMove(p: Ptr) {
    const sel = this.plantSel();
    const bed = this.bedById(this.plantDrawBedId);
    const anchor = this.plantAnchorCell;
    if (!sel || !bed || !anchor) return;
    const pt = this.svgPoint(p);
    if (!pt) return;
    const { cols, rows } = bedColsRows(bed);
    const cell = bedCellAtPoint(pt, bed) ?? this.nearestCell(pt, bed, cols, rows);
    this.plantSel.set({
      bedId: bed.id,
      minCol: Math.min(anchor.col, cell.col), minRow: Math.min(anchor.row, cell.row),
      maxCol: Math.max(anchor.col, cell.col), maxRow: Math.max(anchor.row, cell.row),
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

  /** End the drag; keep the selection for the two-step confirm bar. */
  private plantPointUp() {
    this.plantDrawBedId = null;
    this.plantAnchorCell = null;
  }

  /** Spots the pending selection would place, suppressed against the bed's existing zones. */
  protected readonly plantPreviewSpots = computed(() => {
    const sel = this.plantSel();
    const plant = this.selectedPlant();
    if (!sel || !plant) return [] as { col: number; row: number }[];
    const bed = this.garden()?.beds.find((b) => b.id === sel.bedId);
    if (!bed) return [];
    const { cols, rows } = bedColsRows(bed);
    const existing = this.bedZoneInputs().get(bed.id) ?? [];
    const newInput: ZoneInput = {
      minCol: sel.minCol, minRow: sel.minRow, maxCol: sel.maxCol, maxRow: sel.maxRow,
      spacingFactor: this.plantSpacingFactor(),
      spacingCm: plant.spacingCm, rowSpacingCm: plant.rowSpacingCm ?? plant.spacingCm,
    };
    const views = computeBedZoneViews([...existing, newInput], cols, rows);
    return views[views.length - 1].spots;
  });
  protected readonly plantPreviewCount = computed(() => this.plantPreviewSpots().length);

  /** Garden-metre centres of the preview spots, for rendering inside the bed's <g>. */
  protected plantPreviewCentres(bed: GardenBed): { x: number; y: number }[] {
    return this.plantPreviewSpots().map((s) => {
      const tl = cellTopLeftMeters(s.col, s.row, bed);
      return { x: tl.x + 0.025, y: tl.y + 0.025 };
    });
  }

  /** The spacing each preview plant claims, as an ellipse centred on its spot (metres). */
  protected plantPreviewHalos(bed: GardenBed): { cx: number; cy: number; rx: number; ry: number }[] {
    const plant = this.selectedPlant();
    if (!plant) return [];
    const factor = this.plantSpacingFactor();
    const rx = (plant.spacingCm * factor) / 100 / 2;
    const ry = ((plant.rowSpacingCm ?? plant.spacingCm) * factor) / 100 / 2;
    return this.plantPreviewSpots().map((s) => {
      const tl = cellTopLeftMeters(s.col, s.row, bed);
      return { cx: tl.x + 0.025, cy: tl.y + 0.025, rx, ry };
    });
  }

  protected previewLightColor(): string {
    const p = this.selectedPlant();
    return p ? plantColorLight(p) : '#cbe0c0';
  }

  protected confirmPlantSelection() {
    const sel = this.plantSel();
    const plant = this.selectedPlant();
    const g = this.garden();
    if (!sel || !plant || !g) return;
    const plantCount = this.plantPreviewCount();
    if (plantCount <= 0) return;
    this.api.addPlantingZone(g.id, sel.bedId, new Date().getFullYear(), {
      plantId: plant.id, minCol: sel.minCol, minRow: sel.minRow, maxCol: sel.maxCol, maxRow: sel.maxRow,
      spacingFactor: this.plantSpacingFactor(), plantCount,
    }).subscribe(() => {
      this.cancelPlantSelection();
      this.loadGarden(g.id);
    });
  }

  protected cancelPlantSelection() {
    this.plantDrawBedId = null;
    this.plantAnchorCell = null;
    this.plantSel.set(null);
  }

  protected bedGridLinesFor(bedId: string): { xs: number[]; ys: number[] } {
    return this.bedGridLinesMap().get(bedId) ?? { xs: [], ys: [] };
  }

  private computeBedGridLines(bed: GardenBed): { xs: number[]; ys: number[] } {
    const { cols, rows } = bedColsRows(bed);
    const xs: number[] = [];
    const ys: number[] = [];
    for (let c = 1; c < cols; c++) xs.push(bed.xM + c * 0.05);
    for (let r = 1; r < rows; r++) ys.push(bed.yM + r * 0.05);
    return { xs, ys };
  }

  protected removeZoneById(bedId: string, zoneId: string) {
    const g = this.garden();
    if (!g) return;
    this.api.removePlantingZone(g.id, bedId, new Date().getFullYear(), zoneId).subscribe(() => this.loadGarden(g.id));
  }

  // ─── Existing-zone editing (plant mode, edit tool) ──────────────────────────

  /** Pair each bed's zone rectangle with its zoneId (bedZoneRects and the per-bed
   *  legend share plan order). */
  protected zonesForBed(bedId: string): { zoneId: string; rect: BedZoneRect }[] {
    const rects = this.bedZoneRects().get(bedId) ?? [];
    const legend = this.bedZonesList().filter((l) => l.bedId === bedId);
    return rects.map((rect, i) => ({ zoneId: legend[i]?.zoneId ?? String(i), rect }));
  }

  protected selectZone(bedId: string, zoneId: string) {
    if (this.tool() !== 'edit' || this.mode() !== 'plant') return;
    this.selectedZone.set({ bedId, zoneId });
    this.toolbarOpen.set(true);
  }

  /** Resolve the BedZoneInput for the selected zone (bedZoneInputs and the per-bed
   *  legend share plan order, so match by index within the bed). */
  private selectedZoneInput(): BedZoneInput | null {
    const sel = this.selectedZone();
    if (!sel) return null;
    const perBed = this.bedZonesList().filter((l) => l.bedId === sel.bedId);
    const idx = perBed.findIndex((l) => l.zoneId === sel.zoneId);
    return (this.bedZoneInputs().get(sel.bedId) ?? [])[idx] ?? null;
  }

  /** Begin dragging an existing zone (records the grabbed cell + current bounds). */
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

  /** Begin resizing the zone by dragging one of its edges. */
  protected zoneEdgeDown(bedId: string, zoneId: string, edge: ZoneEdge, p: Ptr) {
    this.selectZone(bedId, zoneId);
    const zi = this.selectedZoneInput();
    if (!zi) return;
    const orig: ZoneCells = { minCol: zi.minCol, minRow: zi.minRow, maxCol: zi.maxCol, maxRow: zi.maxRow };
    this.zoneResizeStart = { edge, orig, bedId, zoneId };
    this.zoneResizeBounds.set(orig);
  }

  /** Persist new cell bounds for an existing zone via remove + re-add (no zone-update
   *  API). No-op if unchanged or the new bounds overlap another zone in the bed. */
  private commitZoneBounds(bedId: string, zoneId: string, bounds: ZoneCells) {
    const g = this.garden();
    const bed = this.bedById(bedId);
    if (!g || !bed) return;
    const inputs = this.bedZoneInputs().get(bedId) ?? [];
    const perBed = this.bedZonesList().filter((l) => l.bedId === bedId);
    const idx = perBed.findIndex((l) => l.zoneId === zoneId);
    const zi = inputs[idx];
    if (!zi) return;
    if (bounds.minCol === zi.minCol && bounds.maxCol === zi.maxCol &&
        bounds.minRow === zi.minRow && bounds.maxRow === zi.maxRow) return; // unchanged
    if (inputs.some((o, i) => i !== idx && zonesOverlap(bounds, o))) return; // illegal: snap back
    const { cols, rows } = bedColsRows(bed);
    const year = new Date().getFullYear();
    const views = computeBedZoneViews(
      [{ ...bounds, spacingFactor: zi.spacingFactor, spacingCm: zi.spacingCm, rowSpacingCm: zi.rowSpacingCm }],
      cols, rows);
    const plantCount = views[0]?.spots.length ?? 0;
    this.api.removePlantingZone(g.id, bedId, year, zoneId).subscribe(() => {
      this.api.addPlantingZone(g.id, bedId, year, {
        plantId: zi.plant.id, minCol: bounds.minCol, minRow: bounds.minRow, maxCol: bounds.maxCol, maxRow: bounds.maxRow,
        spacingFactor: zi.spacingFactor, plantCount,
      }).subscribe(() => { this.selectedZone.set(null); this.loadGarden(g.id); });
    });
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
        plantId: z.plant.id, minCol: z.minCol, minRow: z.minRow, maxCol: z.maxCol, maxRow: z.maxRow,
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

  private snap(val: number): number {
    return Math.round(val / 0.01) * 0.01;
  }
}
