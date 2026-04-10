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
  template: `
    @if (garden(); as g) {
      <div class="layout-page">
        <header class="layout-header">
          <a routerLink="/" class="back">&larr; Gardens</a>
          <h1>{{ g.name }}</h1>
          <span class="dims">{{ g.widthM }}m &times; {{ g.lengthM }}m</span>
        </header>

        <div class="layout-body">
          <!-- Toolbar -->
          <aside class="toolbar">
            <h3>Tools</h3>
            <button
              [class.active]="tool() === 'select'"
              (click)="tool.set('select')"
            >
              &#9754; Select
            </button>
            <button
              [class.active]="tool() === 'bed'"
              (click)="tool.set('bed')"
            >
              &#9744; Add Bed
            </button>
            <button
              [class.active]="tool() === 'obstacle'"
              (click)="tool.set('obstacle')"
            >
              &#9632; Add Obstacle
            </button>

            <hr />

            @switch (tool()) {
              @case ('bed') {
                <div class="tool-form">
                  <h4>New Bed</h4>
                  <label
                    >Name
                    <input type="text" [(ngModel)]="newBedName" />
                  </label>
                  <label
                    >Width (m)
                    <input
                      type="number"
                      [(ngModel)]="newBedWidthM"
                      min="0.5"
                      step="0.5"
                    />
                  </label>
                  <label
                    >Length (m)
                    <input
                      type="number"
                      [(ngModel)]="newBedLengthM"
                      min="0.5"
                      step="0.5"
                    />
                  </label>
                  <p class="hint">Click on the grid to place</p>
                </div>
              }
              @case ('obstacle') {
                <div class="tool-form">
                  <h4>New Obstacle</h4>
                  <label
                    >Label
                    <input type="text" [(ngModel)]="newObstacleLabel" />
                  </label>
                  <label
                    >Width (m)
                    <input
                      type="number"
                      [(ngModel)]="newObstacleWidthM"
                      min="0.1"
                      step="0.5"
                    />
                  </label>
                  <label
                    >Length (m)
                    <input
                      type="number"
                      [(ngModel)]="newObstacleLengthM"
                      min="0.1"
                      step="0.5"
                    />
                  </label>
                  <p class="hint">Click on the grid to place</p>
                </div>
              }
              @case ('select') {
                @if (selectedBed(); as bed) {
                  <div class="tool-form">
                    <h4>Bed: {{ bed.name }}</h4>
                    <p>{{ bed.widthM }}m &times; {{ bed.lengthM }}m</p>
                    <p>Position: ({{ bed.xM }}, {{ bed.yM }})</p>
                    <button class="btn-danger" (click)="deleteBed(bed)">
                      Delete Bed
                    </button>
                  </div>
                }
                @if (selectedObstacle(); as obs) {
                  <div class="tool-form">
                    <h4>Obstacle: {{ obs.label }}</h4>
                    <p>{{ obs.widthM }}m &times; {{ obs.lengthM }}m</p>
                    <button class="btn-danger" (click)="deleteObstacle(obs)">
                      Delete Obstacle
                    </button>
                  </div>
                }
              }
            }
          </aside>

          <!-- Canvas -->
          <div class="canvas-container">
            <svg
              class="garden-canvas"
              [attr.viewBox]="'0 0 ' + g.widthM + ' ' + g.lengthM"
              preserveAspectRatio="xMidYMid meet"
              (click)="onCanvasClick($event)"
              (mousemove)="onCanvasMove($event)"
            >
              <!-- Background -->
              <rect
                [attr.width]="g.widthM"
                [attr.height]="g.lengthM"
                fill="#e8f5e9"
              />

              <!-- Grid lines -->
              @for (x of gridLinesX(); track x) {
                <line
                  [attr.x1]="x"
                  y1="0"
                  [attr.x2]="x"
                  [attr.y2]="g.lengthM"
                  stroke="#c8e6c9"
                  stroke-width="0.02"
                />
              }
              @for (y of gridLinesY(); track y) {
                <line
                  x1="0"
                  [attr.y1]="y"
                  [attr.x2]="g.widthM"
                  [attr.y2]="y"
                  stroke="#c8e6c9"
                  stroke-width="0.02"
                />
              }

              <!-- Obstacles -->
              @for (o of g.obstacles; track o.id) {
                <g (click)="selectObstacle(o, $event)" class="clickable">
                  <rect
                    [attr.x]="o.xM"
                    [attr.y]="o.yM"
                    [attr.width]="o.widthM"
                    [attr.height]="o.lengthM"
                    fill="#bdbdbd"
                    stroke="#757575"
                    [attr.stroke-width]="
                      selectedObstacle()?.id === o.id ? 0.06 : 0.03
                    "
                    [attr.stroke-dasharray]="
                      selectedObstacle()?.id === o.id ? '0.1 0.05' : 'none'
                    "
                  />
                  <text
                    [attr.x]="o.xM + o.widthM / 2"
                    [attr.y]="o.yM + o.lengthM / 2"
                    text-anchor="middle"
                    dominant-baseline="central"
                    [attr.font-size]="Math.min(o.widthM, o.lengthM) * 0.3"
                    fill="#424242"
                  >
                    {{ o.label }}
                  </text>
                </g>
              }

              <!-- Beds -->
              @for (b of g.beds; track b.id) {
                <g (click)="selectBed(b, $event)" class="clickable">
                  <rect
                    [attr.x]="b.xM"
                    [attr.y]="b.yM"
                    [attr.width]="b.widthM"
                    [attr.height]="b.lengthM"
                    fill="#a5d6a7"
                    stroke="#2e7d32"
                    [attr.stroke-width]="
                      selectedBed()?.id === b.id ? 0.06 : 0.03
                    "
                    [attr.stroke-dasharray]="
                      selectedBed()?.id === b.id ? '0.1 0.05' : 'none'
                    "
                  />
                  <text
                    [attr.x]="b.xM + b.widthM / 2"
                    [attr.y]="b.yM + b.lengthM / 2"
                    text-anchor="middle"
                    dominant-baseline="central"
                    [attr.font-size]="Math.min(b.widthM, b.lengthM) * 0.3"
                    fill="#1b5e20"
                  >
                    {{ b.name }}
                  </text>
                </g>
              }

              <!-- Ghost preview -->
              @if (ghost(); as gh) {
                <rect
                  [attr.x]="gh.x"
                  [attr.y]="gh.y"
                  [attr.width]="gh.w"
                  [attr.height]="gh.h"
                  [attr.fill]="
                    gh.type === 'bed'
                      ? 'rgba(76,175,80,0.3)'
                      : 'rgba(158,158,158,0.3)'
                  "
                  [attr.stroke]="gh.type === 'bed' ? '#2e7d32' : '#757575'"
                  stroke-width="0.03"
                  stroke-dasharray="0.1 0.05"
                  pointer-events="none"
                />
              }
            </svg>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .layout-page { height: 100vh; display: flex; flex-direction: column; }
    .layout-header { display: flex; align-items: center; gap: 1rem; padding: 1rem 2rem; background: white; border-bottom: 1px solid #e0e0e0; }
    .layout-header h1 { margin: 0; font-size: 1.3rem; color: #2e7d32; }
    .back { text-decoration: none; color: #666; font-size: 1.1rem; }
    .dims { color: #999; font-size: 0.9rem; }
    .layout-body { display: flex; flex: 1; overflow: hidden; }
    .toolbar { width: 240px; padding: 1rem; background: white; border-right: 1px solid #e0e0e0; overflow-y: auto; }
    .toolbar h3 { margin: 0 0 1rem; color: #333; }
    .toolbar button { display: block; width: 100%; padding: 0.5rem; margin-bottom: 0.4rem; border: 1px solid #e0e0e0; border-radius: 6px; background: white; cursor: pointer; text-align: left; font-size: 0.9rem; }
    .toolbar button.active { background: #e8f5e9; border-color: #4caf50; color: #2e7d32; font-weight: 600; }
    .toolbar button:hover { background: #f5f5f5; }
    .toolbar hr { margin: 1rem 0; border: none; border-top: 1px solid #e0e0e0; }
    .tool-form { display: flex; flex-direction: column; gap: 0.6rem; }
    .tool-form h4 { margin: 0; color: #333; }
    .tool-form label { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem; color: #555; }
    .tool-form input { padding: 0.4rem 0.5rem; border: 1px solid #ccc; border-radius: 6px; font-size: 0.9rem; }
    .tool-form input:focus { outline: none; border-color: #4caf50; }
    .hint { color: #999; font-size: 0.8rem; font-style: italic; margin: 0; }
    .btn-danger { padding: 0.4rem 0.8rem; background: #e53935; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
    .btn-danger:hover { background: #c62828; }
    .canvas-container { flex: 1; background: #fafafa; display: flex; align-items: center; justify-content: center; padding: 2rem; }
    .garden-canvas { width: 100%; max-height: 100%; cursor: crosshair; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.1)); }
    .clickable { cursor: pointer; }
  `,
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
