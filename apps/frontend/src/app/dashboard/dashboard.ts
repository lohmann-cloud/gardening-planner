import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ApiService, Garden } from '../services/api.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterModule],
  template: `
    <div class="dashboard">
      <header class="dashboard-header">
        <h1>My Gardens</h1>
        <a routerLink="/gardens/new" class="btn btn-primary">+ New Garden</a>
      </header>

      @if (gardens().length) {
        <div class="garden-grid">
          @for (g of gardens(); track g.id) {
            <div class="garden-card">
              <a [routerLink]="['/gardens', g.id]" class="garden-card-link">
                <div class="garden-preview">
                  <svg
                    [attr.viewBox]="'0 0 ' + g.widthM + ' ' + g.lengthM"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <rect
                      [attr.width]="g.widthM"
                      [attr.height]="g.lengthM"
                      fill="#e8f5e9"
                      stroke="#4caf50"
                      stroke-width="0.05"
                    />
                    @for (b of g.beds; track b.id) {
                      <rect
                        [attr.x]="b.xM"
                        [attr.y]="b.yM"
                        [attr.width]="b.widthM"
                        [attr.height]="b.lengthM"
                        fill="#a5d6a7"
                        stroke="#388e3c"
                        stroke-width="0.03"
                      />
                    }
                    @for (o of g.obstacles; track o.id) {
                      <rect
                        [attr.x]="o.xM"
                        [attr.y]="o.yM"
                        [attr.width]="o.widthM"
                        [attr.height]="o.lengthM"
                        fill="#bdbdbd"
                        stroke="#757575"
                        stroke-width="0.03"
                      />
                    }
                  </svg>
                </div>
                <div class="garden-info">
                  <h3>{{ g.name }}</h3>
                  <p>
                    {{ g.widthM }}m &times; {{ g.lengthM }}m &middot;
                    {{ g.beds.length }} beds
                  </p>
                </div>
              </a>
              <button class="btn-delete" (click)="deleteGarden(g, $event)">
                &times;
              </button>
            </div>
          }
        </div>
      } @else {
        <div class="empty-state">
          <p>No gardens yet. Create your first one!</p>
          <a routerLink="/gardens/new" class="btn btn-primary">Create Garden</a>
        </div>
      }
    </div>
  `,
  styles: `
    .dashboard { max-width: 1000px; margin: 0 auto; padding: 2rem; }
    .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
    .dashboard-header h1 { margin: 0; color: #2e7d32; }
    .garden-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
    .garden-card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; position: relative; transition: transform 0.15s; }
    .garden-card:hover { transform: translateY(-2px); }
    .garden-card-link { text-decoration: none; color: inherit; display: block; }
    .garden-preview { padding: 1rem; background: #f5f5f5; }
    .garden-preview svg { width: 100%; height: 140px; }
    .garden-info { padding: 1rem; }
    .garden-info h3 { margin: 0 0 0.25rem; }
    .garden-info p { margin: 0; color: #666; font-size: 0.9rem; }
    .btn-delete { position: absolute; top: 0.5rem; right: 0.5rem; background: rgba(255,255,255,0.9); border: none; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; font-size: 1.1rem; color: #999; }
    .btn-delete:hover { color: #e53935; background: white; }
    .btn { display: inline-block; padding: 0.6rem 1.2rem; border-radius: 8px; text-decoration: none; font-weight: 500; cursor: pointer; border: none; }
    .btn-primary { background: #2e7d32; color: white; }
    .btn-primary:hover { background: #1b5e20; }
    .empty-state { text-align: center; padding: 4rem 2rem; }
    .empty-state p { color: #666; margin-bottom: 1rem; font-size: 1.1rem; }
  `,
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly gardens = signal<Garden[]>([]);

  ngOnInit() {
    this.loadGardens();
  }

  protected deleteGarden(g: Garden, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    if (confirm(`Delete "${g.name}"?`)) {
      this.api.deleteGarden(g.id).subscribe(() => this.loadGardens());
    }
  }

  private loadGardens() {
    this.api.getGardens().subscribe((g) => this.gardens.set(g));
  }
}
