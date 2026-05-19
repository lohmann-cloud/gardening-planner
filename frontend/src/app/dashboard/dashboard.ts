import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService, Garden, Plant } from '../services/api.service';
import { plantColor, plantColorLight, plantIcon } from '../plant-utils';

@Component({
  selector: 'app-dashboard',
  imports: [RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly Math = Math;
  protected readonly gardens = signal<Garden[]>([]);
  protected readonly bedPlants = signal<Map<string, Plant[]>>(new Map());

  ngOnInit() {
    this.loadGardens();
  }

  protected bedFill(bedId: string): string {
    const plants = this.bedPlants().get(bedId);
    return plants?.length ? plantColorLight(plants[0]) : '#a5d6a7';
  }

  protected bedStroke(bedId: string): string {
    const plants = this.bedPlants().get(bedId);
    return plants?.length ? plantColor(plants[0]) : '#388e3c';
  }

  protected bedIconText(bedId: string): string {
    const plants = this.bedPlants().get(bedId);
    if (!plants?.length) return '';
    return plants.slice(0, 2).map(p => plantIcon(p)).join('');
  }

  protected deleteGarden(g: Garden, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    if (confirm(`Delete "${g.name}"?`)) {
      this.api.deleteGarden(g.id).subscribe(() => this.loadGardens());
    }
  }

  private loadGardens() {
    const year = new Date().getFullYear();
    this.api.getGardens().subscribe((gardens) => {
      this.gardens.set(gardens);
      const allBeds = gardens.flatMap(g => g.beds);
      if (!allBeds.length) return;
      const planRequests = allBeds.map(b => this.api.getPlantingPlan(b.gardenId, b.id, year));
      forkJoin(planRequests).subscribe((plans) => {
        const map = new Map<string, Plant[]>();
        plans.forEach((plan, i) => {
          const seen = new Set<string>();
          const plants: Plant[] = [];
          for (const z of plan.zones) {
            if (!seen.has(z.plant.id)) { seen.add(z.plant.id); plants.push(z.plant); }
          }
          for (const c of plan.cells) {
            if (!seen.has(c.plant.id)) { seen.add(c.plant.id); plants.push(c.plant); }
          }
          if (plants.length) map.set(allBeds[i].id, plants);
        });
        this.bedPlants.set(map);
      });
    });
  }
}
