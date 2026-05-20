import { Component, computed, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService, Garden, GardenBed, InventoryItem, Plant, PlantingPlan, PlantingZone } from '../services/api.service';
import { plantColor, plantColorLight, plantIcon } from '../plant-utils';
import { plantPositions, CELL_CM } from '../planning/plant-grid';

const CELL_PX = 20;

interface Selection {
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
}

interface ZoneView {
  zone: PlantingZone;
  color: string;
  colorLight: string;
  icon: string;
  plantSpots: { col: number; row: number }[];
}

@Component({
  selector: 'app-bed-planner',
  imports: [RouterModule, DecimalPipe],
  templateUrl: './bed-planner.html',
  styleUrl: './bed-planner.scss',
})
export class BedPlannerComponent implements OnInit {
  @ViewChild('gridContainer') private containerRef!: ElementRef<HTMLElement>;

  protected readonly CELL_PX = CELL_PX;

  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);

  protected readonly garden = signal<Garden | null>(null);
  protected readonly bed = signal<GardenBed | null>(null);
  protected readonly plants = signal<Plant[]>([]);
  protected readonly plan = signal<PlantingPlan | null>(null);
  protected readonly selectedPlant = signal<Plant | null>(null);
  protected readonly year = signal(new Date().getFullYear());
  protected readonly plantSearch = signal('');
  protected readonly dragging = signal(false);
  protected readonly selection = signal<Selection | null>(null);
  protected readonly spacingFactor = signal(1.0);
  protected readonly sidebarTab = signal<'plants' | 'inventory'>('plants');
  protected readonly paletteOpen = signal(false);
  protected readonly inventory = signal<InventoryItem[]>([]);
  private draggedInventoryPlant: Plant | null = null;

  // Viewport
  protected readonly zoom = signal(1);
  protected readonly panX = signal(0);
  protected readonly panY = signal(0);
  protected readonly isPanning = signal(false);
  protected readonly canvasTransform = computed(
    () => `translate(${this.panX()}px, ${this.panY()}px) scale(${this.zoom()})`
  );
  private panningStart: { clientX: number; clientY: number; panX: number; panY: number } | null = null;
  private panMoved = false;

  protected readonly cols = computed(() => {
    const b = this.bed();
    return b ? Math.floor((b.widthM * 100) / CELL_CM) : 0;
  });

  protected readonly rows = computed(() => {
    const b = this.bed();
    return b ? Math.floor((b.lengthM * 100) / CELL_CM) : 0;
  });

  protected readonly selectionRect = computed(() => {
    const sel = this.selection();
    if (!sel) return null;
    return {
      minCol: Math.min(sel.startCol, sel.endCol),
      maxCol: Math.max(sel.startCol, sel.endCol),
      minRow: Math.min(sel.startRow, sel.endRow),
      maxRow: Math.max(sel.startRow, sel.endRow),
    };
  });

  protected readonly zoneViews = computed<ZoneView[]>(() => {
    const p = this.plan();
    if (!p || !this.cols() || !this.rows()) return [];
    const placed: { col: number; row: number; spacingCells: number; rowSpacingCells: number }[] = [];
    const views: ZoneView[] = [];
    for (const zone of p.zones) {
      const f = zone.spacingFactor ?? 1;
      const spacingCells = Math.max(1, Math.round(zone.plant.spacingCm * f / CELL_CM));
      const rowSpacingCells = Math.max(1, Math.round((zone.plant.rowSpacingCm ?? zone.plant.spacingCm) * f / CELL_CM));
      const candidates = this.computePositionsInArea(zone.minCol, zone.minRow, zone.maxCol, zone.maxRow, zone.plant, f);
      const valid = candidates.filter(
        (pos) => !placed.some((pl) => {
          const minDx = (spacingCells + pl.spacingCells) / 2;
          const minDy = (rowSpacingCells + pl.rowSpacingCells) / 2;
          return Math.abs(pos.col - pl.col) < minDx && Math.abs(pos.row - pl.row) < minDy;
        })
      );
      for (const pos of valid) placed.push({ ...pos, spacingCells, rowSpacingCells });
      views.push({ zone, color: this.plantColor(zone.plant), colorLight: this.plantColorLight(zone.plant), icon: this.plantIcon(zone.plant), plantSpots: valid });
    }
    return views;
  });

  protected readonly zoneCellMap = computed(() => {
    const map = new Map<string, ZoneView>();
    for (const zv of this.zoneViews()) {
      const z = zv.zone;
      for (let r = z.minRow; r <= z.maxRow; r++) {
        for (let c = z.minCol; c <= z.maxCol; c++) {
          map.set(`${c},${r}`, zv);
        }
      }
    }
    return map;
  });

  protected readonly plantSpotMap = computed(() => {
    const set = new Set<string>();
    for (const zv of this.zoneViews()) {
      for (const spot of zv.plantSpots) set.add(`${spot.col},${spot.row}`);
    }
    return set;
  });

  protected readonly previewSpots = computed(() => {
    const rect = this.selectionRect();
    const plant = this.selectedPlant();
    if (!rect || !plant) return [];
    return this.placeableSpots(rect.minCol, rect.minRow, rect.maxCol, rect.maxRow, plant, this.spacingFactor());
  });

  protected readonly previewSpotSet = computed(() => {
    const set = new Set<string>();
    for (const s of this.previewSpots()) set.add(`${s.col},${s.row}`);
    return set;
  });

  protected readonly filteredPlants = computed(() => {
    const q = this.plantSearch().toLowerCase();
    if (!q) return this.plants();
    return this.plants().filter(
      (p) => p.name.toLowerCase().includes(q) || p.botanicalName?.toLowerCase().includes(q)
    );
  });

  protected readonly plantFitInfo = computed(() => {
    const plant = this.selectedPlant();
    const b = this.bed();
    if (!plant || !b || !this.cols() || !this.rows()) return null;
    const total = this.computePositionsInArea(0, 0, this.cols() - 1, this.rows() - 1, plant).length;
    return { total };
  });

  protected readonly inventoryPlants = computed(() => {
    const inv = this.inventory();
    const allPlants = this.plants();
    return inv
      .filter(i => i.quantity > 0)
      .map(i => ({ item: i, plant: allPlants.find(p => p.id === i.plantId) }))
      .filter((x): x is { item: InventoryItem; plant: Plant } => !!x.plant);
  });

  ngOnInit() {
    const gardenId = this.route.snapshot.paramMap.get('id')!;
    const bedId = this.route.snapshot.paramMap.get('bedId')!;
    this.api.getGarden(gardenId).subscribe((g) => {
      this.garden.set(g);
      this.bed.set(g.beds.find((b) => b.id === bedId) ?? null);
      setTimeout(() => this.fitToContainer(), 0);
    });
    this.api.getPlants().subscribe((p) => this.plants.set(p));
    this.loadInventory();
    this.loadPlan(gardenId, bedId);
  }

  protected selectPlant(plant: Plant) {
    const toggled = this.selectedPlant()?.id === plant.id ? null : plant;
    this.selectedPlant.set(toggled);
    this.selection.set(null);
    if (toggled) this.spacingFactor.set(1.0);
  }

  protected onCellMouseDown(col: number, row: number, event: MouseEvent) {
    event.stopPropagation();
    if (!this.selectedPlant()) return;
    if (this.zoneCellMap().has(`${col},${row}`)) return;
    event.preventDefault();
    this.dragging.set(true);
    this.selection.set({ startCol: col, startRow: row, endCol: col, endRow: row });
  }

  protected onCellMouseEnter(col: number, row: number) {
    if (!this.dragging()) return;
    const sel = this.selection();
    if (!sel) return;
    this.selection.set({ ...sel, endCol: col, endRow: row });
  }

  protected onContainerMouseDown(event: MouseEvent) {
    if (event.button !== 0 || this.dragging()) return;
    this.panMoved = false;
    this.isPanning.set(true);
    this.panningStart = { clientX: event.clientX, clientY: event.clientY, panX: this.panX(), panY: this.panY() };
  }

  protected onContainerMouseMove(event: MouseEvent) {
    if (!this.isPanning() || !this.panningStart) return;
    const dx = event.clientX - this.panningStart.clientX;
    const dy = event.clientY - this.panningStart.clientY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.panMoved = true;
    this.panX.set(this.panningStart.panX + dx);
    this.panY.set(this.panningStart.panY + dy);
  }

  protected onContainerMouseUp() {
    this.dragging.set(false);
    this.isPanning.set(false);
    this.panningStart = null;
  }

  protected onContainerMouseLeave() {
    this.dragging.set(false);
    this.isPanning.set(false);
    this.panningStart = null;
  }

  // ─── Touch: pinch-zoom, one-finger pan, one-finger area drawing ──────────
  private touchMode: 'none' | 'pan' | 'draw' | 'pinch' = 'none';
  private panStartTouch: { x: number; y: number; panX: number; panY: number } | null = null;
  private pinchStart: { dist: number; midX: number; midY: number; zoom: number; panX: number; panY: number } | null = null;

  protected onTouchStart(event: TouchEvent) {
    if (event.touches.length === 2) {
      this.beginPinch(event);
      event.preventDefault();
      return;
    }
    if (event.touches.length !== 1) return;
    const t = event.touches[0];
    const cell = (t.target as Element)?.closest?.('.cell') as HTMLElement | null;
    if (this.selectedPlant() && cell && cell.dataset['col'] != null && !cell.classList.contains('zone-cell')) {
      this.touchMode = 'draw';
      this.dragging.set(true);
      const col = +cell.dataset['col']!;
      const row = +cell.dataset['row']!;
      this.selection.set({ startCol: col, startRow: row, endCol: col, endRow: row });
    } else {
      this.touchMode = 'pan';
      this.panStartTouch = { x: t.clientX, y: t.clientY, panX: this.panX(), panY: this.panY() };
    }
    event.preventDefault();
  }

  protected onTouchMove(event: TouchEvent) {
    if (this.touchMode === 'pinch' && event.touches.length === 2) {
      this.updatePinch(event);
      event.preventDefault();
      return;
    }
    if (this.touchMode === 'pan' && this.panStartTouch && event.touches.length === 1) {
      const t = event.touches[0];
      this.panX.set(this.panStartTouch.panX + (t.clientX - this.panStartTouch.x));
      this.panY.set(this.panStartTouch.panY + (t.clientY - this.panStartTouch.y));
      event.preventDefault();
      return;
    }
    if (this.touchMode === 'draw' && event.touches.length === 1) {
      const t = event.touches[0];
      const el = document.elementFromPoint(t.clientX, t.clientY) as HTMLElement | null;
      const cell = el?.closest?.('.cell') as HTMLElement | null;
      const sel = this.selection();
      if (cell && cell.dataset['col'] != null && sel) {
        this.selection.set({ ...sel, endCol: +cell.dataset['col']!, endRow: +cell.dataset['row']! });
      }
      event.preventDefault();
    }
  }

  protected onTouchEnd(event: TouchEvent) {
    if (event.touches.length === 0) {
      if (this.touchMode === 'draw') this.dragging.set(false);
      this.touchMode = 'none';
      this.panStartTouch = null;
      this.pinchStart = null;
    } else if (event.touches.length === 1 && this.touchMode === 'pinch') {
      const t = event.touches[0];
      this.touchMode = 'pan';
      this.pinchStart = null;
      this.panStartTouch = { x: t.clientX, y: t.clientY, panX: this.panX(), panY: this.panY() };
    }
  }

  private beginPinch(event: TouchEvent) {
    const [a, b] = [event.touches[0], event.touches[1]];
    const r = this.containerRef.nativeElement.getBoundingClientRect();
    this.touchMode = 'pinch';
    this.dragging.set(false);
    this.pinchStart = {
      dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
      midX: (a.clientX + b.clientX) / 2 - r.left,
      midY: (a.clientY + b.clientY) / 2 - r.top,
      zoom: this.zoom(), panX: this.panX(), panY: this.panY(),
    };
  }

  private updatePinch(event: TouchEvent) {
    const ps = this.pinchStart;
    if (!ps) return;
    const [a, b] = [event.touches[0], event.touches[1]];
    const r = this.containerRef.nativeElement.getBoundingClientRect();
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const midX = (a.clientX + b.clientX) / 2 - r.left;
    const midY = (a.clientY + b.clientY) / 2 - r.top;
    const newZoom = Math.max(0.1, Math.min(10, ps.zoom * (dist / ps.dist)));
    const worldX = (ps.midX - ps.panX) / ps.zoom;
    const worldY = (ps.midY - ps.panY) / ps.zoom;
    this.panX.set(midX - worldX * newZoom);
    this.panY.set(midY - worldY * newZoom);
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
    const newZoom = Math.max(0.1, Math.min(10, oldZoom * factor));
    this.panX.set(mx - (mx - this.panX()) * newZoom / oldZoom);
    this.panY.set(my - (my - this.panY()) * newZoom / oldZoom);
    this.zoom.set(newZoom);
  }

  protected zoomIn() { this.applyZoom(1.25); }
  protected zoomOut() { this.applyZoom(1 / 1.25); }
  protected zoomReset() { this.fitToContainer(); }

  private applyZoom(factor: number) {
    const el = this.containerRef?.nativeElement;
    const rect = el?.getBoundingClientRect();
    if (!rect) return;
    const mx = rect.width / 2;
    const my = rect.height / 2;
    const oldZoom = this.zoom();
    const newZoom = Math.max(0.1, Math.min(10, oldZoom * factor));
    this.panX.set(mx - (mx - this.panX()) * newZoom / oldZoom);
    this.panY.set(my - (my - this.panY()) * newZoom / oldZoom);
    this.zoom.set(newZoom);
  }

  private fitToContainer() {
    const el = this.containerRef?.nativeElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cols = this.cols();
    const rows = this.rows();
    if (!cols || !rows) return;
    const gridW = cols * CELL_PX;
    const gridH = rows * CELL_PX;
    const fitZoom = Math.max(0.2, Math.min((rect.width - 80) / gridW, (rect.height - 80) / gridH, 1.5));
    this.zoom.set(fitZoom);
    this.panX.set((rect.width - gridW * fitZoom) / 2);
    this.panY.set((rect.height - gridH * fitZoom) / 2);
  }

  protected confirmSelection() {
    const rect = this.selectionRect();
    const plant = this.selectedPlant();
    const g = this.garden();
    const b = this.bed();
    if (!rect || !plant || !g || !b) return;
    this.api.addPlantingZone(g.id, b.id, this.year(), {
      plantId: plant.id,
      minCol: rect.minCol,
      minRow: rect.minRow,
      maxCol: rect.maxCol,
      maxRow: rect.maxRow,
      spacingFactor: this.spacingFactor(),
      plantCount: this.previewSpots().length,
    }).subscribe(() => {
      this.selection.set(null);
      this.loadPlan(g.id, b.id);
      this.loadInventory();
    });
  }

  protected cancelSelection() {
    this.selection.set(null);
  }

  protected fillBed() {
    const plant = this.selectedPlant();
    const g = this.garden();
    const b = this.bed();
    if (!plant || !g || !b) return;
    this.api.addPlantingZone(g.id, b.id, this.year(), {
      plantId: plant.id,
      minCol: 0,
      minRow: 0,
      maxCol: this.cols() - 1,
      maxRow: this.rows() - 1,
      spacingFactor: this.spacingFactor(),
      plantCount: this.placeableSpots(0, 0, this.cols() - 1, this.rows() - 1, plant, this.spacingFactor()).length,
    }).subscribe(() => {
      this.loadPlan(g.id, b.id);
      this.loadInventory();
    });
  }

  protected removeZone(zoneView: ZoneView, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    const g = this.garden();
    const b = this.bed();
    if (!g || !b) return;
    this.api.removePlantingZone(g.id, b.id, this.year(), zoneView.zone.id)
      .subscribe(() => {
        this.loadPlan(g.id, b.id);
        this.loadInventory();
      });
  }

  protected setSidebarTab(tab: 'plants' | 'inventory') {
    this.sidebarTab.set(tab);
  }

  protected togglePalette() {
    this.paletteOpen.update((v) => !v);
  }

  protected onInventoryDragStart(plant: Plant, event: DragEvent) {
    this.draggedInventoryPlant = plant;
    event.dataTransfer?.setData('text/plain', plant.id);
    this.selectedPlant.set(plant);
    this.selection.set(null);
    if (this.spacingFactor() !== 1.0) this.spacingFactor.set(1.0);
  }

  protected onInventoryDragEnd() {
    this.draggedInventoryPlant = null;
  }

  protected onCellDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  protected onCellDrop(col: number, row: number, event: DragEvent) {
    event.preventDefault();
    const plant = this.draggedInventoryPlant ?? this.selectedPlant();
    if (!plant) return;
    if (this.zoneCellMap().has(`${col},${row}`)) return;
    const g = this.garden();
    const b = this.bed();
    if (!g || !b) return;
    this.selectedPlant.set(plant);
    this.api.addPlantingZone(g.id, b.id, this.year(), {
      plantId: plant.id,
      minCol: col,
      minRow: row,
      maxCol: col,
      maxRow: row,
      spacingFactor: this.spacingFactor(),
      plantCount: this.placeableSpots(col, row, col, row, plant, this.spacingFactor()).length,
    }).subscribe(() => {
      this.draggedInventoryPlant = null;
      this.loadPlan(g.id, b.id);
      this.loadInventory();
    });
  }

  protected onSearchInput(event: Event) {
    this.plantSearch.set((event.target as HTMLInputElement).value);
  }

  protected onSpacingFactorInput(event: Event) {
    this.spacingFactor.set(+(event.target as HTMLInputElement).value / 100);
  }

  protected cellSize(): number {
    return CELL_CM;
  }

  protected isInSelection(col: number, row: number): boolean {
    const rect = this.selectionRect();
    if (!rect) return false;
    return col >= rect.minCol && col <= rect.maxCol && row >= rect.minRow && row <= rect.maxRow;
  }

  protected demandLabel(demand?: string): string {
    switch (demand) {
      case 'HEAVY': return 'Starkzehrer';
      case 'MEDIUM': return 'Mittelzehrer';
      case 'LIGHT': return 'Schwachzehrer';
      default: return '';
    }
  }

  protected plantColor(plant: Plant): string { return plantColor(plant); }
  protected plantColorLight(plant: Plant): string { return plantColorLight(plant); }
  protected plantIcon(plant: Plant): string { return plantIcon(plant); }

  /** Positions a plant would actually occupy in an area, after avoiding the plants in existing zones. */
  private placeableSpots(minCol: number, minRow: number, maxCol: number, maxRow: number, plant: Plant, factor: number): { col: number; row: number }[] {
    const spacingCells = Math.max(1, Math.round(plant.spacingCm * factor / CELL_CM));
    const rowSpacingCells = Math.max(1, Math.round((plant.rowSpacingCm ?? plant.spacingCm) * factor / CELL_CM));
    const candidates = this.computePositionsInArea(minCol, minRow, maxCol, maxRow, plant, factor);
    const placed: { col: number; row: number; spacingCells: number; rowSpacingCells: number }[] = [];
    for (const zv of this.zoneViews()) {
      const zf = zv.zone.spacingFactor ?? 1;
      const s = Math.max(1, Math.round(zv.zone.plant.spacingCm * zf / CELL_CM));
      const rs = Math.max(1, Math.round((zv.zone.plant.rowSpacingCm ?? zv.zone.plant.spacingCm) * zf / CELL_CM));
      for (const spot of zv.plantSpots) placed.push({ col: spot.col, row: spot.row, spacingCells: s, rowSpacingCells: rs });
    }
    return candidates.filter(
      (pos) => !placed.some((pl) => {
        const minDx = (spacingCells + pl.spacingCells) / 2;
        const minDy = (rowSpacingCells + pl.rowSpacingCells) / 2;
        return Math.abs(pos.col - pl.col) < minDx && Math.abs(pos.row - pl.row) < minDy;
      })
    );
  }

  private loadInventory() {
    this.api.getInventory().subscribe(inv => this.inventory.set(inv));
  }

  private computePositionsInArea(minCol: number, minRow: number, maxCol: number, maxRow: number, plant: Plant, factor = this.spacingFactor()): { col: number; row: number }[] {
    return plantPositions(
      minCol, minRow, maxCol, maxRow,
      this.cols(), this.rows(),
      plant.spacingCm, plant.rowSpacingCm ?? plant.spacingCm, factor,
    );
  }

  private loadPlan(gardenId: string, bedId: string) {
    this.api.getPlantingPlan(gardenId, bedId, this.year()).subscribe((p) => this.plan.set(p));
  }
}
