import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(opts: {
            client_id: string;
            callback: (resp: { credential: string }) => void;
            auto_select?: boolean;
          }): void;
          renderButton(
            parent: HTMLElement,
            opts: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'small' | 'medium' | 'large';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              width?: number;
            }
          ): void;
          disableAutoSelect(): void;
        };
      };
    };
  }
}

@Component({
  selector: 'app-login',
  imports: [RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent implements AfterViewInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  @ViewChild('googleButton') private googleButton!: ElementRef<HTMLElement>;

  protected readonly clientId = environment.googleClientId;
  protected readonly hasClientId = computed(() => !!this.clientId);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  ngAfterViewInit(): void {
    if (!this.clientId) return;
    this.waitForGoogle().then((gsi) => {
      gsi.initialize({
        client_id: this.clientId,
        callback: (resp) => this.handleCredential(resp.credential),
        auto_select: false,
      });
      gsi.renderButton(this.googleButton.nativeElement, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'pill',
      });
    });
  }

  private handleCredential(idToken: string) {
    this.error.set(null);
    this.busy.set(true);
    this.auth.loginWithGoogle(idToken).subscribe({
      next: () => {
        this.busy.set(false);
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.message ?? 'Login failed. Please try again.');
      },
    });
  }

  private waitForGoogle(): Promise<NonNullable<Window['google']>['accounts']['id']> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const tick = () => {
        const gsi = window.google?.accounts?.id;
        if (gsi) {
          resolve(gsi);
          return;
        }
        attempts++;
        if (attempts > 50) {
          reject(new Error('Google Identity Services failed to load'));
          return;
        }
        setTimeout(tick, 100);
      };
      tick();
    });
  }
}
