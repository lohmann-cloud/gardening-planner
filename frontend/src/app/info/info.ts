import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ApiService, VersionInfo } from '../services/api.service';
import { version as frontendVersion } from '../../environments/version';

@Component({
  selector: 'app-info',
  imports: [RouterModule],
  templateUrl: './info.html',
  styleUrl: './info.scss',
})
export class InfoComponent implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly frontend = frontendVersion;
  protected readonly backend = signal<VersionInfo | null>(null);
  protected readonly backendError = signal(false);
  protected readonly loading = signal(true);

  ngOnInit() {
    this.api.getVersion().subscribe({
      next: (v) => {
        this.backend.set(v);
        this.loading.set(false);
      },
      error: () => {
        this.backendError.set(true);
        this.loading.set(false);
      },
    });
  }
}
