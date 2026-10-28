import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, of, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, Credentials, Me } from './models';

const STORAGE_KEY = 'myapp.session';
const ADMIN_ROLE = 'Admin';

/**
 * Holds the JWT session. Tokens are kept in localStorage so a refresh survives page reloads;
 * the trade-off is that any XSS can read them, so keep the app free of untrusted HTML.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly session = signal<AuthResponse | null>(this.load());
  private refreshing$?: Observable<AuthResponse>;

  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly claims = computed(() => decodeClaims(this.session()?.accessToken));
  readonly email = computed(() => this.claims()?.email ?? null);
  readonly isAdmin = computed(() => this.claims()?.role === ADMIN_ROLE);

  accessToken(): string | null {
    return this.session()?.accessToken ?? null;
  }

  hasRefreshToken(): boolean {
    return !!this.session()?.refreshToken;
  }

  register(credentials: Credentials): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, credentials)
      .pipe(tap((r) => this.store(r)));
  }

  login(credentials: Credentials): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(tap((r) => this.store(r)));
  }

  me(): Observable<Me> {
    return this.http.get<Me>(`${environment.apiUrl}/auth/me`);
  }

  /**
   * Exchanges the refresh token for a new pair. Refresh tokens rotate and the API treats reuse as theft
   * (revoking every session), so concurrent callers must share one in-flight request.
   */
  refresh(): Observable<AuthResponse> {
    const refreshToken = this.session()?.refreshToken;
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token'));
    }

    this.refreshing$ ??= this.http.post<AuthResponse>(`${environment.apiUrl}/auth/refresh`, { refreshToken }).pipe(
      tap((r) => this.store(r)),
      finalize(() => (this.refreshing$ = undefined)),
      shareReplay(1),
    );
    return this.refreshing$;
  }

  /** Revokes the refresh token server-side (best effort), then clears the local session. */
  logout(): void {
    const refreshToken = this.session()?.refreshToken;
    if (refreshToken) {
      this.http
        .post<void>(`${environment.apiUrl}/auth/logout`, { refreshToken })
        .pipe(catchError(() => of(null)))
        .subscribe();
    }
    this.expire();
  }

  /** Drops the local session without calling the API (e.g. the server already rejected it). */
  expire(): void {
    this.session.set(null);
    this.persist(null);
    void this.router.navigate(['/login']);
  }

  private store(response: AuthResponse): void {
    this.session.set(response);
    this.persist(response);
  }

  private persist(response: AuthResponse | null): void {
    try {
      if (response) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(response));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Storage unavailable (private mode etc.): the session just lasts until reload.
    }
  }

  private load(): AuthResponse | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AuthResponse) : null;
    } catch {
      return null;
    }
  }
}

interface Claims {
  sub?: string;
  email?: string;
  role?: string;
}

/** Reads (does not verify) the JWT payload; the API remains the authority on every request. */
function decodeClaims(token: string | undefined): Claims | null {
  if (!token) {
    return null;
  }
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(payload)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    return JSON.parse(json) as Claims;
  } catch {
    return null;
  }
}
