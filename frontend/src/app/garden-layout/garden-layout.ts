import { Component, computed, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { form, FormField, min, required } from '@angular/forms/signals';
import { ApiService, Garden, GardenBed, Obstacle } from '../services/api.service';

type Tool = 'select' | 'bed' | 'obstacle';

@Component({
  selector: 'app-garden-layout',
  imports: [FormField, RouterModule, DecimalPipe],
  templateUrl: './garden-layout.html',
  styleUrl: './garden-layout.scss',
})
export class GardenLayoutComponent implements OnInit {
  protected readonly Math = Math;

  @ViewChild('gardenSvg') private svgRef!: ElementRef<SVGSVGElement>;

  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly garden = signal<Garden | null>(null);
  protected readonly tool = signal<Tool>('select');
  protected readonly selectedBed = signal<GardenBed | null>(null);
  protected readonly selectedObstacle = signal<Obstacle | null>(null);
  protected readonly editingBed = signal(false);
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

  private readonly bedModel = signal({ name: 'Bed', widthM: 2, lengthM: 1 });
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

  private readonly obstacleModel = signal({ label: 'Shed', widthM: 2, lengthM: 2 });
  protected readonly obstacleForm = form(this.obstacleModel, (path) => {
    required(path.label);
    min(path.widthM, 0.1);
    min(path.lengthM, 0.1);
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loadGarden(id);
  }

  protected onCanvasMouseDown(event: MouseEvent) {
    if (event.button !== 0) return;
    this.panMoved = false;
    this.isPanning.set(true);
    this.panningStart = { clientX: event.clientX, clientY: event.clientY, panX: this.panX(), panY: this.panY() };
  }

  protected onCanvasMove(event: MouseEvent) {
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
    if (this.tool() === 'select' || !this.garden()) {
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

  protected onCanvasMouseUp(event: MouseEvent) {
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

  private handleBackgroundClick(event: MouseEvent) {
    const g = this.garden();
    if (this.tool() === 'select') {
      this.clearSelection();
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
        this.bedForm.name().value.set(`Bed ${(g.beds.length ?? 0) + 2}`);
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

  protected onBedMouseDown(bed: GardenBed, event: MouseEvent) {
    event.stopPropagation();
    if (this.tool() !== 'select') return;
    this.selectedBed.set(bed);
    this.selectedObstacle.set(null);
    this.editingBed.set(false);
    const pt = this.svgPoint(event);
    if (!pt) return;
    this.draggedBed.set(bed);
    this.dragOffset.set({ dx: pt.x - bed.xM, dy: pt.y - bed.yM });
    this.dragPos.set({ x: bed.xM, y: bed.yM });
    this.lastValidDragPos.set({ x: bed.xM, y: bed.yM });
  }

  protected onObstacleMouseDown(obstacle: Obstacle, event: MouseEvent) {
    event.stopPropagation();
    if (this.tool() !== 'select') return;
    this.selectedObstacle.set(obstacle);
    this.selectedBed.set(null);
    this.editingBed.set(false);
  }

  protected onRotateHandleMouseDown(bed: GardenBed, event: MouseEvent) {
    event.stopPropagation();
    const pt = this.svgPoint(event);
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
    this.isPanning.set(false);
    this.panningStart = null;
  }

  protected selectObstacle(obstacle: Obstacle) {
    if (this.tool() !== 'select') return;
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

  protected openBedPlanner() {
    const bed = this.selectedBed();
    const g = this.garden();
    if (!bed || !g) return;
    this.router.navigate(['/gardens', g.id, 'beds', bed.id]);
  }

  protected deleteBed(bed: GardenBed) {
    const g = this.garden();
    if (!g) return;
    this.api.deleteBed(g.id, bed.id).subscribe(() => {
      this.selectedBed.set(null);
      this.editingBed.set(false);
      this.loadGarden(g.id);
    });
  }

  protected deleteObstacle(obstacle: Obstacle) {
    const g = this.garden();
    if (!g) return;
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

  private loadGarden(id: string) {
    this.api.getGarden(id).subscribe((g) => this.garden.set(g));
  }

  private clearSelection() {
    this.selectedBed.set(null);
    this.selectedObstacle.set(null);
    this.editingBed.set(false);
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

  private svgPoint(event: MouseEvent): { x: number; y: number } | null {
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

  private snap(val: number): number {
    return Math.round(val / 0.01) * 0.01;
  }
}
