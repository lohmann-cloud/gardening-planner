import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ApiService, InventoryItem, Plant } from '../services/api.service';
import { plantIcon, plantColor, plantColorLight } from '../plant-utils';

@Component({
  selector: 'app-inventory',
  imports: [RouterModule],
  templateUrl: './inventory.html',
  styleUrl: './inventory.scss',
})
export class InventoryComponent implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly inventory = signal<InventoryItem[]>([]);
  protected readonly plants = signal<Plant[]>([]);
  protected readonly search = signal('');
  protected readonly editingQuantities = signal<Record<string, number>>({});
  protected readonly addSearch = signal('');
  protected readonly addPanelOpen = signal(false);

  protected readonly filteredInventory = computed(() => {
    const q = this.search().toLowerCase();
    return this.inventory().filter(i =>
      !q || i.plantName.toLowerCase().includes(q)
    );
  });

  protected readonly addablePlants = computed(() => {
    const q = this.addSearch().toLowerCase();
    const inInventory = new Set(this.inventory().map(i => i.plantId));
    return this.plants()
      .filter(p => !inInventory.has(p.id))
      .filter(p => !q || p.name.toLowerCase().includes(q))
      .slice(0, 20);
  });

  readonly plantIcon = plantIcon;
  readonly plantColor = plantColor;
  readonly plantColorLight = plantColorLight;

  ngOnInit() {
    this.api.getInventory().subscribe(items => this.inventory.set(items));
    this.api.getPlants().subscribe(p => this.plants.set(p));
  }

  protected getQuantity(item: InventoryItem): number {
    const edits = this.editingQuantities();
    return edits[item.plantId] !== undefined ? edits[item.plantId] : item.quantity;
  }

  protected onQuantityInput(item: InventoryItem, event: Event) {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.editingQuantities.update(eq => ({ ...eq, [item.plantId]: isNaN(val) ? 0 : val }));
  }

  protected increment(item: InventoryItem) {
    const next = this.getQuantity(item) + 1;
    this.editingQuantities.update(eq => ({ ...eq, [item.plantId]: next }));
    this.saveQuantity(item);
  }

  protected decrement(item: InventoryItem) {
    const next = Math.max(0, this.getQuantity(item) - 1);
    this.editingQuantities.update(eq => ({ ...eq, [item.plantId]: next }));
    this.saveQuantity(item);
  }

  protected saveQuantity(item: InventoryItem) {
    const edits = this.editingQuantities();
    const qty = edits[item.plantId];
    if (qty === undefined) return;
    if (qty === 0) {
      this.removeItem(item);
      return;
    }
    this.api.upsertInventory(item.plantId, qty).subscribe(updated => {
      this.inventory.update(inv => inv.map(i => i.plantId === updated.plantId ? updated : i));
      this.editingQuantities.update(eq => { const c = { ...eq }; delete c[item.plantId]; return c; });
    });
  }

  protected removeItem(item: InventoryItem) {
    this.api.removeInventory(item.plantId).subscribe(() => {
      this.inventory.update(inv => inv.filter(i => i.plantId !== item.plantId));
      this.editingQuantities.update(eq => { const c = { ...eq }; delete c[item.plantId]; return c; });
    });
  }

  protected addPlant(plant: Plant) {
    this.api.upsertInventory(plant.id, 1).subscribe(item => {
      this.inventory.update(inv => [...inv, item]);
      this.addSearch.set('');
    });
  }

  protected onAddSearch(event: Event) {
    this.addSearch.set((event.target as HTMLInputElement).value);
  }

  protected onSearch(event: Event) {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected toggleAddPanel() {
    this.addPanelOpen.update(v => !v);
    if (!this.addPanelOpen()) this.addSearch.set('');
  }

  protected iconFor(item: InventoryItem): string {
    return item.plantIconEmoji ?? '🌱';
  }

  protected colorFor(item: InventoryItem): string {
    if (item.plantColorHex) return item.plantColorHex;
    return '#779964';
  }

  protected colorLightFor(item: InventoryItem): string {
    if (item.plantColorHex) return this.mixWithWhite(item.plantColorHex, 0.78);
    return '#e3ebde';
  }

  private mixWithWhite(hex: string, t: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const mix = (c: number) => Math.round(c + (255 - c) * t);
    return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
  }
}
