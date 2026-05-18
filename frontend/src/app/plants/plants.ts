import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ApiService, Plant, NutrientDemand } from '../services/api.service';

@Component({
  selector: 'app-plants',
  imports: [RouterModule],
  templateUrl: './plants.html',
  styleUrl: './plants.scss',
})
export class PlantsComponent implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly plants = signal<Plant[]>([]);
  protected readonly search = signal('');
  protected readonly categoryFilter = signal<string>('');
  protected readonly demandFilter = signal<string>('');

  protected readonly categories = computed(() => {
    const cats = new Set(this.plants().map((p) => p.category));
    return [...cats].sort();
  });

  protected readonly filteredPlants = computed(() => {
    let list = this.plants();
    const q = this.search().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.botanicalName?.toLowerCase().includes(q) ||
          p.family?.toLowerCase().includes(q)
      );
    }
    const cat = this.categoryFilter();
    if (cat) list = list.filter((p) => p.category === cat);
    const demand = this.demandFilter();
    if (demand) list = list.filter((p) => p.nutrientDemand === demand);
    return list;
  });

  ngOnInit() {
    this.api.getPlants().subscribe((p) => this.plants.set(p));
  }

  protected onSearch(event: Event) {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onCategoryChange(event: Event) {
    this.categoryFilter.set((event.target as HTMLSelectElement).value);
  }

  protected onDemandChange(event: Event) {
    this.demandFilter.set((event.target as HTMLSelectElement).value);
  }

  protected demandLabel(demand?: NutrientDemand): string {
    switch (demand) {
      case 'HEAVY': return 'Starkzehrer';
      case 'MEDIUM': return 'Mittelzehrer';
      case 'LIGHT': return 'Schwachzehrer';
      default: return '–';
    }
  }

  protected demandClass(demand?: NutrientDemand): string {
    switch (demand) {
      case 'HEAVY': return 'demand-heavy';
      case 'MEDIUM': return 'demand-medium';
      case 'LIGHT': return 'demand-light';
      default: return '';
    }
  }

  protected categoryLabel(category: string): string {
    const map: Record<string, string> = {
      VEGETABLE: 'Gemüse', FRUIT: 'Obst', HERB: 'Kräuter',
      FLOWER: 'Blumen', TREE: 'Baum', SHRUB: 'Strauch',
    };
    return map[category] ?? category;
  }

  protected heightDisplay(plant: Plant): string {
    if (plant.heightMinCm && plant.heightMaxCm) return `${plant.heightMinCm}–${plant.heightMaxCm} cm`;
    if (plant.heightMinCm) return `ab ${plant.heightMinCm} cm`;
    if (plant.heightMaxCm) return `bis ${plant.heightMaxCm} cm`;
    return '–';
  }
}
