import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  ApiService,
  Garden,
  GardenBed,
  Obstacle,
} from '../services/api.service';

type Tool = 'select' | 'bed' | 'obstacle';

@Component({
  selector: 'app-garden-layout',
  imports: [FormsModule, RouterModule],
  templateUrl: './garden-layout.html',
  styleUrl: './garden-layout.scss',
})
export class GardenLayoutComponent implements OnInit {
  protected readonly Math = Math;

  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);

  protected readonly garden = signal<Garden | null>(null);
  protected readonly tool = signal<Tool>('select');
  protected readonly selectedBed = signal<GardenBed | null>(null);
  protected readonly selectedObstacle = signal<Obstacle | null>(null);
  protected readonly ghost = signal<{
    x: number;
    y: number;
    w: number;
    h: number;
    type: string;
  } | null>(null);

  protected readonly gridLinesX = computed(() => {
    const g = this.garden();
    if (!g) return [];
    const lines: number[] = [];
    for (let x = g.gridResolutionM; x < g.widthM; x += g.gridResolutionM)
      lines.push(x);
    return lines;
  });

  protected readonly gridLinesY = computed(() => {
    const g = this.garden();
    if (!g) return [];
    const lines: number[] = [];
    for (let y = g.gridResolutionM; y < g.lengthM; y += g.gridResolutionM)
      lines.push(y);
    return lines;
  });

  protected newBedName = 'Bed';
  protected newBedWidthM = 2;
  protected newBedLengthM = 1;
  protected newObstacleLabel = 'Shed';
  protected newObstacleWidthM = 2;
  protected newObstacleLengthM = 2;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loadGarden(id);
  }

  protected onCanvasMove(event: MouseEvent) {
    if (this.tool() === 'select' || !this.garden()) {
      this.ghost.set(null);
      return;
    }

    const pt = this.svgPoint(event);
    if (!pt) return;

    const w =
      this.tool() === 'bed' ? this.newBedWidthM : this.newObstacleWidthM;
    const h =
      this.tool() === 'bed' ? this.newBedLengthM : this.newObstacleLengthM;
    const g = this.garden()!;

    let x = this.snap(pt.x - w / 2);
    let y = this.snap(pt.y - h / 2);
    x = Math.max(0, Math.min(x, g.widthM - w));
    y = Math.max(0, Math.min(y, g.lengthM - h));

    this.ghost.set({ x, y, w, h, type: this.tool() });
  }

  protected onCanvasClick(event: MouseEvent) {
    const g = this.garden();
    const gh = this.ghost();
    if (!g || !gh) return;

    if (this.tool() === 'bed') {
      this.clearSelection();
      this.api
        .createBed(g.id, {
          name: this.newBedName,
          xM: gh.x,
          yM: gh.y,
          widthM: this.newBedWidthM,
          lengthM: this.newBedLengthM,
        })
        .subscribe(() => {
          this.loadGarden(g.id);
          this.newBedName = `Bed ${(g.beds.length ?? 0) + 2}`;
        });
    } else if (this.tool() === 'obstacle') {
      this.clearSelection();
      this.api
        .createObstacle(g.id, {
          label: this.newObstacleLabel,
          xM: gh.x,
          yM: gh.y,
          widthM: this.newObstacleWidthM,
          lengthM: this.newObstacleLengthM,
        })
        .subscribe(() => this.loadGarden(g.id));
    }
  }

  protected selectBed(bed: GardenBed, event: Event) {
    event.stopPropagation();
    if (this.tool() !== 'select') return;
    this.selectedBed.set(bed);
    this.selectedObstacle.set(null);
  }

  protected selectObstacle(obstacle: Obstacle, event: Event) {
    event.stopPropagation();
    if (this.tool() !== 'select') return;
    this.selectedObstacle.set(obstacle);
    this.selectedBed.set(null);
  }

  protected deleteBed(bed: GardenBed) {
    const g = this.garden();
    if (!g) return;
    this.api.deleteBed(g.id, bed.id).subscribe(() => {
      this.selectedBed.set(null);
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

  private loadGarden(id: string) {
    this.api.getGarden(id).subscribe((g) => this.garden.set(g));
  }

  private clearSelection() {
    this.selectedBed.set(null);
    this.selectedObstacle.set(null);
  }

  private svgPoint(event: MouseEvent): { x: number; y: number } | null {
    const svg = (event.target as Element).closest('svg') as SVGSVGElement;
    const g = this.garden();
    if (!svg || !g) return null;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const svgPt = pt.matrixTransform(ctm.inverse());
    return { x: svgPt.x, y: svgPt.y };
  }

  private snap(val: number): number {
    const res = this.garden()?.gridResolutionM ?? 0.5;
    return Math.round(val / res) * res;
  }
}
