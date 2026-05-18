import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { form, FormField, FormRoot, required, min } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../services/api.service';

interface GardenFormData {
  name: string;
  description: string;
  widthM: number;
  lengthM: number;
}

@Component({
  selector: 'app-garden-create',
  imports: [FormField, FormRoot],
  templateUrl: './garden-create.html',
  styleUrl: './garden-create.scss',
})
export class GardenCreateComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  private readonly model = signal<GardenFormData>({
    name: '',
    description: '',
    widthM: 10,
    lengthM: 8,
  });

  protected readonly gardenForm = form(
    this.model,
    (path) => {
      required(path.name, { message: 'Garden name is required' });
      min(path.widthM, 0.5);
      min(path.lengthM, 0.5);
    },
    {
      submission: {
        action: async (field) => {
          const value = field().value();
          const garden = await firstValueFrom(
            this.api.createGarden({
              name: value.name,
              description: value.description || undefined,
              widthM: value.widthM,
              lengthM: value.lengthM,
            })
          );
          this.router.navigate(['/gardens', garden.id]);
        },
      },
    }
  );

  protected cancel() {
    this.router.navigate(['/']);
  }
}
