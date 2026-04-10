import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-garden-create',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="create-page">
      <h1>Create Garden</h1>
      <form (ngSubmit)="submit()" class="form">
        <label>
          Garden Name
          <input
            type="text"
            [(ngModel)]="name"
            name="name"
            required
            placeholder="e.g. Backyard Garden"
          />
        </label>

        <label>
          Description (optional)
          <textarea
            [(ngModel)]="description"
            name="description"
            rows="2"
            placeholder="Notes about this garden"
          ></textarea>
        </label>

        <div class="row">
          <label>
            Width (metres)
            <input
              type="number"
              [(ngModel)]="widthM"
              name="widthM"
              required
              min="0.5"
              step="0.5"
            />
          </label>
          <label>
            Length (metres)
            <input
              type="number"
              [(ngModel)]="lengthM"
              name="lengthM"
              required
              min="0.5"
              step="0.5"
            />
          </label>
        </div>

        <div class="preview" *ngIf="widthM > 0 && lengthM > 0">
          <p>Preview: {{ widthM }}m &times; {{ lengthM }}m</p>
          <svg
            [attr.viewBox]="'0 0 ' + widthM + ' ' + lengthM"
            preserveAspectRatio="xMidYMid meet"
          >
            <rect
              [attr.width]="widthM"
              [attr.height]="lengthM"
              fill="#e8f5e9"
              stroke="#4caf50"
              stroke-width="0.05"
            />
          </svg>
        </div>

        <div class="actions">
          <button type="button" class="btn btn-secondary" (click)="cancel()">
            Cancel
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="!name || widthM < 0.5 || lengthM < 0.5"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  `,
  styles: `
    .create-page { max-width: 600px; margin: 0 auto; padding: 2rem; }
    h1 { color: #2e7d32; margin-bottom: 1.5rem; }
    .form { display: flex; flex-direction: column; gap: 1.25rem; }
    label { display: flex; flex-direction: column; gap: 0.3rem; font-weight: 500; color: #333; }
    input, textarea { padding: 0.6rem 0.8rem; border: 1px solid #ccc; border-radius: 8px; font-size: 1rem; }
    input:focus, textarea:focus { outline: none; border-color: #4caf50; box-shadow: 0 0 0 2px rgba(76,175,80,0.2); }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .preview { text-align: center; }
    .preview p { color: #666; margin-bottom: 0.5rem; }
    .preview svg { width: 100%; max-height: 200px; border-radius: 8px; }
    .actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 0.5rem; }
    .btn { padding: 0.6rem 1.4rem; border-radius: 8px; font-weight: 500; cursor: pointer; border: none; font-size: 1rem; }
    .btn-primary { background: #2e7d32; color: white; }
    .btn-primary:hover:not(:disabled) { background: #1b5e20; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { background: #e0e0e0; color: #333; }
    .btn-secondary:hover { background: #bdbdbd; }
  `,
})
export class GardenCreateComponent {
  name = '';
  description = '';
  widthM = 10;
  lengthM = 8;

  constructor(private api: ApiService, private router: Router) {}

  submit() {
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

  cancel() {
    this.router.navigate(['/']);
  }
}
