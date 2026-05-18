import { Component, computed, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService, Garden, GardenBed, Plant, PlantingPlan, PlantingZone } from '../services/api.service';

const CELL_CM = 5;
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
      views.push({ zone, color: this.plantColor(zone.plant), colorLight: this.plantColorLight(zone.plant), plantSpots: valid });
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
    const factor = this.spacingFactor();
    const spacingCells = Math.max(1, Math.round(plant.spacingCm * factor / CELL_CM));
    const rowSpacingCells = Math.max(1, Math.round((plant.rowSpacingCm ?? plant.spacingCm) * factor / CELL_CM));
    const candidates = this.computePositionsInArea(rect.minCol, rect.minRow, rect.maxCol, rect.maxRow, plant);
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

  ngOnInit() {
    const gardenId = this.route.snapshot.paramMap.get('id')!;
    const bedId = this.route.snapshot.paramMap.get('bedId')!;
    this.api.getGarden(gardenId).subscribe((g) => {
      this.garden.set(g);
      this.bed.set(g.beds.find((b) => b.id === bedId) ?? null);
      setTimeout(() => this.fitToContainer(), 0);
    });
    this.api.getPlants().subscribe((p) => this.plants.set(p));
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
    }).subscribe(() => {
      this.selection.set(null);
      this.loadPlan(g.id, b.id);
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
    }).subscribe(() => this.loadPlan(g.id, b.id));
  }

  protected removeZone(zoneView: ZoneView, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    const g = this.garden();
    const b = this.bed();
    if (!g || !b) return;
    this.api.removePlantingZone(g.id, b.id, this.year(), zoneView.zone.id)
      .subscribe(() => this.loadPlan(g.id, b.id));
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

  protected plantColor(plant: Plant): string {
    let hash = 0;
    for (let i = 0; i < plant.name.length; i++) hash = plant.name.charCodeAt(i) + ((hash << 5) - hash);
    const h = (((hash % 120) + 120) % 120) + 60;
    return `hsl(${h}, 55%, 55%)`;
  }

  protected plantColorLight(plant: Plant): string {
    let hash = 0;
    for (let i = 0; i < plant.name.length; i++) hash = plant.name.charCodeAt(i) + ((hash << 5) - hash);
    const h = (((hash % 120) + 120) % 120) + 60;
    return `hsl(${h}, 45%, 88%)`;
  }

  private computePositionsInArea(minCol: number, minRow: number, maxCol: number, maxRow: number, plant: Plant, factor = this.spacingFactor()): { col: number; row: number }[] {
    const sCol = Math.max(1, Math.round(plant.spacingCm * factor / CELL_CM));
    const sRow = Math.max(1, Math.round((plant.rowSpacingCm ?? plant.spacingCm) * factor / CELL_CM));
    // Try both orientations, pick the one with more plants
    const orientA = this.computeGrid(minCol, minRow, maxCol, maxRow, sCol, sRow);
    const orientB = sCol !== sRow ? this.computeGrid(minCol, minRow, maxCol, maxRow, sRow, sCol) : [];
    return orientA.length >= orientB.length ? orientA : orientB;
  }

  private computeGrid(minCol: number, minRow: number, maxCol: number, maxRow: number, colSpacing: number, rowSpacing: number): { col: number; row: number }[] {
    const halfCol = Math.ceil(colSpacing / 2);
    const halfRow = Math.ceil(rowSpacing / 2);
    const effMinCol = Math.max(minCol, halfCol);
    const effMaxCol = Math.min(maxCol, this.cols() - 1 - halfCol);
    const effMinRow = Math.max(minRow, halfRow);
    const effMaxRow = Math.min(maxRow, this.rows() - 1 - halfRow);
    // Bed too small for any margin — fall back to a single centered plant
    if (effMinCol > effMaxCol || effMinRow > effMaxRow) {
      return [{ col: Math.round((minCol + maxCol) / 2), row: Math.round((minRow + maxRow) / 2) }];
    }
    const zoneCols = effMaxCol - effMinCol + 1;
    const zoneRows = effMaxRow - effMinRow + 1;
    const nCols = Math.floor((zoneCols - 1) / colSpacing) + 1;
    const nRows = Math.floor((zoneRows - 1) / rowSpacing) + 1;
    const offsetCol = Math.floor((zoneCols - 1 - (nCols - 1) * colSpacing) / 2);
    const offsetRow = Math.floor((zoneRows - 1 - (nRows - 1) * rowSpacing) / 2);
    const positions: { col: number; row: number }[] = [];
    for (let ri = 0; ri < nRows; ri++) {
      for (let ci = 0; ci < nCols; ci++) {
        positions.push({ col: effMinCol + offsetCol + ci * colSpacing, row: effMinRow + offsetRow + ri * rowSpacing });
      }
    }
    return positions;
  }

  private loadPlan(gardenId: string, bedId: string) {
    this.api.getPlantingPlan(gardenId, bedId, this.year()).subscribe((p) => this.plan.set(p));
  }
}
