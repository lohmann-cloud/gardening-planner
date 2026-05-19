import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  pictureUrl?: string;
}

interface AuthResponse {
  token: string;
  user: CurrentUser;
}

const STORAGE_KEY = 'garden.auth.token';
const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly tokenSignal = signal<string | null>(this.readToken());
  private readonly userSignal = signal<CurrentUser | null>(null);
  private readonly readySignal = signal(false);

  readonly token = computed(() => this.tokenSignal());
  readonly user = computed(() => this.userSignal());
  readonly isAuthenticated = computed(() => !!this.userSignal());
  readonly ready = computed(() => this.readySignal());

  async init(): Promise<void> {
    const token = this.tokenSignal();
    if (!token) {
      this.readySignal.set(true);
      return;
    }
    try {
      const u = await firstValueFrom(this.http.get<CurrentUser>(`${API}/auth/me`));
      this.userSignal.set(u);
    } catch {
      this.clearToken();
    } finally {
      this.readySignal.set(true);
    }
  }

  loginWithGoogle(idToken: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API}/auth/google`, { idToken }).pipe(
      tap((res) => {
        this.writeToken(res.token);
        this.userSignal.set(res.user);
      })
    );
  }

  logout(): Observable<void> {
    const token = this.tokenSignal();
    if (!token) {
      this.clearToken();
      return of(void 0);
    }
    return this.http.post<void>(`${API}/auth/logout`, null).pipe(
      tap({
        next: () => this.clearToken(),
        error: () => this.clearToken(),
      })
    );
  }

  private writeToken(token: string) {
    this.tokenSignal.set(token);
    try {
      localStorage.setItem(STORAGE_KEY, token);
    } catch {
      // ignore
    }
  }

  private clearToken() {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  private readToken(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }
}
