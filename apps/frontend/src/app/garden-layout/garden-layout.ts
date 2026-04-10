import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="layout-page" *ngIf="garden">
      <header class="layout-header">
        <a routerLink="/" class="back">&larr; Gardens</a>
        <h1>{{ garden.name }}</h1>
        <span class="dims"
          >{{ garden.widthM }}m &times; {{ garden.lengthM }}m</span
        >
      </header>

      <div class="layout-body">
        <!-- Toolbar -->
        <aside class="toolbar">
          <h3>Tools</h3>
          <button [class.active]="tool === 'select'" (click)="tool = 'select'">
            &#9754; Select
          </button>
          <button [class.active]="tool === 'bed'" (click)="tool = 'bed'">
            &#9744; Add Bed
          </button>
          <button
            [class.active]="tool === 'obstacle'"
            (click)="tool = 'obstacle'"
          >
            &#9632; Add Obstacle
          </button>

          <hr />

          <!-- Add Bed form -->
          <div *ngIf="tool === 'bed'" class="tool-form">
            <h4>New Bed</h4>
            <label>Name <input type="text" [(ngModel)]="newBed.name" /></label>
            <label
              >Width (m)
              <input
                type="number"
                [(ngModel)]="newBed.widthM"
                min="0.5"
                step="0.5"
            /></label>
            <label
              >Length (m)
              <input
                type="number"
                [(ngModel)]="newBed.lengthM"
                min="0.5"
                step="0.5"
            /></label>
            <p class="hint">Click on the grid to place</p>
          </div>

          <!-- Add Obstacle form -->
          <div *ngIf="tool === 'obstacle'" class="tool-form">
            <h4>New Obstacle</h4>
            <label
              >Label <input type="text" [(ngModel)]="newObstacle.label"
            /></label>
            <label
              >Width (m)
              <input
                type="number"
                [(ngModel)]="newObstacle.widthM"
                min="0.1"
                step="0.5"
            /></label>
            <label
              >Length (m)
              <input
                type="number"
                [(ngModel)]="newObstacle.lengthM"
                min="0.1"
                step="0.5"
            /></label>
            <p class="hint">Click on the grid to place</p>
          </div>

          <!-- Selection info -->
          <div *ngIf="selectedBed" class="tool-form">
            <h4>Bed: {{ selectedBed.name }}</h4>
            <p>{{ selectedBed.widthM }}m &times; {{ selectedBed.lengthM }}m</p>
            <p>Position: ({{ selectedBed.xM }}, {{ selectedBed.yM }})</p>
            <button class="btn-danger" (click)="deleteBed(selectedBed)">
              Delete Bed
            </button>
          </div>

          <div *ngIf="selectedObstacle" class="tool-form">
            <h4>Obstacle: {{ selectedObstacle.label }}</h4>
            <p>
              {{ selectedObstacle.widthM }}m &times;
              {{ selectedObstacle.lengthM }}m
            </p>
            <button
              class="btn-danger"
              (click)="deleteObstacle(selectedObstacle)"
            >
              Delete Obstacle
            </button>
          </div>
        </aside>

        <!-- Canvas -->
        <div class="canvas-container">
          <svg
            class="garden-canvas"
            [attr.viewBox]="'0 0 ' + garden.widthM + ' ' + garden.lengthM"
            preserveAspectRatio="xMidYMid meet"
            (click)="onCanvasClick($event)"
            (mousemove)="onCanvasMove($event)"
          >
            <!-- Background -->
            <rect
              [attr.width]="garden.widthM"
              [attr.height]="garden.lengthM"
              fill="#e8f5e9"
            />

            <!-- Grid lines -->
            <line
              *ngFor="let x of gridLinesX"
              [attr.x1]="x"
              y1="0"
              [attr.x2]="x"
              [attr.y2]="garden.lengthM"
              stroke="#c8e6c9"
              [attr.stroke-width]="0.02"
            />
            <line
              *ngFor="let y of gridLinesY"
              x1="0"
              [attr.y1]="y"
              [attr.x2]="garden.widthM"
              [attr.y2]="y"
              stroke="#c8e6c9"
              [attr.stroke-width]="0.02"
            />

            <!-- Obstacles -->
            <g
              *ngFor="let o of garden.obstacles"
              (click)="selectObstacle(o, $event)"
              class="clickable"
            >
              <rect
                [attr.x]="o.xM"
                [attr.y]="o.yM"
                [attr.width]="o.widthM"
                [attr.height]="o.lengthM"
                fill="#bdbdbd"
                stroke="#757575"
                [attr.stroke-width]="
                  selectedObstacle?.id === o.id ? 0.06 : 0.03
                "
                [attr.stroke-dasharray]="
                  selectedObstacle?.id === o.id ? '0.1 0.05' : 'none'
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

            <!-- Beds -->
            <g
              *ngFor="let b of garden.beds"
              (click)="selectBed(b, $event)"
              class="clickable"
            >
              <rect
                [attr.x]="b.xM"
                [attr.y]="b.yM"
                [attr.width]="b.widthM"
                [attr.height]="b.lengthM"
                fill="#a5d6a7"
                stroke="#2e7d32"
                [attr.stroke-width]="selectedBed?.id === b.id ? 0.06 : 0.03"
                [attr.stroke-dasharray]="
                  selectedBed?.id === b.id ? '0.1 0.05' : 'none'
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

            <!-- Ghost preview -->
            <rect
              *ngIf="ghost"
              [attr.x]="ghost.x"
              [attr.y]="ghost.y"
              [attr.width]="ghost.w"
              [attr.height]="ghost.h"
              [attr.fill]="
                ghost.type === 'bed'
                  ? 'rgba(76,175,80,0.3)'
                  : 'rgba(158,158,158,0.3)'
              "
              [attr.stroke]="ghost.type === 'bed' ? '#2e7d32' : '#757575'"
              stroke-width="0.03"
              stroke-dasharray="0.1 0.05"
              pointer-events="none"
            />
          </svg>
        </div>
      </div>
    </div>
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
  garden: Garden | null = null;
  tool: Tool = 'select';
  selectedBed: GardenBed | null = null;
  selectedObstacle: Obstacle | null = null;
  ghost: { x: number; y: number; w: number; h: number; type: string } | null =
    null;
  gridLinesX: number[] = [];
  gridLinesY: number[] = [];
  Math = Math;

  newBed = { name: 'Bed', widthM: 2, lengthM: 1 };
  newObstacle = { label: 'Shed', widthM: 2, lengthM: 2 };

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.load(id);
  }

  load(id: string) {
    this.api.getGarden(id).subscribe((g) => {
      this.garden = g;
      this.buildGrid();
    });
  }

  buildGrid() {
    if (!this.garden) return;
    const res = this.garden.gridResolutionM;
    this.gridLinesX = [];
    this.gridLinesY = [];
    for (let x = res; x < this.garden.widthM; x += res) this.gridLinesX.push(x);
    for (let y = res; y < this.garden.lengthM; y += res)
      this.gridLinesY.push(y);
  }

  svgPoint(event: MouseEvent): { x: number; y: number } | null {
    const svg = (event.target as Element).closest('svg') as SVGSVGElement;
    if (!svg || !this.garden) return null;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const svgPt = pt.matrixTransform(ctm.inverse());
    return { x: svgPt.x, y: svgPt.y };
  }

  snap(val: number): number {
    const res = this.garden?.gridResolutionM ?? 0.5;
    return Math.round(val / res) * res;
  }

  onCanvasMove(event: MouseEvent) {
    if (this.tool === 'select' || !this.garden) {
      this.ghost = null;
      return;
    }

    const pt = this.svgPoint(event);
    if (!pt) return;

    const w =
      this.tool === 'bed' ? this.newBed.widthM : this.newObstacle.widthM;
    const h =
      this.tool === 'bed' ? this.newBed.lengthM : this.newObstacle.lengthM;

    let x = this.snap(pt.x - w / 2);
    let y = this.snap(pt.y - h / 2);
    x = Math.max(0, Math.min(x, this.garden.widthM - w));
    y = Math.max(0, Math.min(y, this.garden.lengthM - h));

    this.ghost = { x, y, w, h, type: this.tool };
  }

  onCanvasClick(event: MouseEvent) {
    if (!this.garden || !this.ghost) return;

    if (this.tool === 'bed') {
      this.selectedBed = null;
      this.selectedObstacle = null;
      this.api
        .createBed(this.garden.id, {
          name: this.newBed.name,
          xM: this.ghost.x,
          yM: this.ghost.y,
          widthM: this.newBed.widthM,
          lengthM: this.newBed.lengthM,
        })
        .subscribe(() => {
          this.load(this.garden!.id);
          this.newBed.name = `Bed ${(this.garden?.beds.length ?? 0) + 2}`;
        });
    } else if (this.tool === 'obstacle') {
      this.selectedBed = null;
      this.selectedObstacle = null;
      this.api
        .createObstacle(this.garden.id, {
          label: this.newObstacle.label,
          xM: this.ghost.x,
          yM: this.ghost.y,
          widthM: this.newObstacle.widthM,
          lengthM: this.newObstacle.lengthM,
        })
        .subscribe(() => this.load(this.garden!.id));
    }
  }

  selectBed(bed: GardenBed, event: Event) {
    event.stopPropagation();
    if (this.tool !== 'select') return;
    this.selectedBed = bed;
    this.selectedObstacle = null;
  }

  selectObstacle(obstacle: Obstacle, event: Event) {
    event.stopPropagation();
    if (this.tool !== 'select') return;
    this.selectedObstacle = obstacle;
    this.selectedBed = null;
  }

  deleteBed(bed: GardenBed) {
    if (!this.garden) return;
    this.api.deleteBed(this.garden.id, bed.id).subscribe(() => {
      this.selectedBed = null;
      this.load(this.garden!.id);
    });
  }

  deleteObstacle(obstacle: Obstacle) {
    if (!this.garden) return;
    this.api.deleteObstacle(this.garden.id, obstacle.id).subscribe(() => {
      this.selectedObstacle = null;
      this.load(this.garden!.id);
    });
  }
}
