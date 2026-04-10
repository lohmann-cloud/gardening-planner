import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-garden-create',
  imports: [FormsModule],
  templateUrl: './garden-create.html',
  styleUrl: './garden-create.scss',
})
export class GardenCreateComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  protected name = '';
  protected description = '';
  protected widthM = 10;
  protected lengthM = 8;

  protected submit() {
    this.api
      .createGarden({
        name: this.name,
        description: this.description || undefined,
        widthM: this.widthM,
        lengthM: this.lengthM,
      })
      .subscribe((garden) => {
        this.router.navigate(['/gardens', garden.id]);
      });
  }

  protected cancel() {
    this.router.navigate(['/']);
  }
}
