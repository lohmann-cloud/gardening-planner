import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ApiService, Garden } from '../services/api.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
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
