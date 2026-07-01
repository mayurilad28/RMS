import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthResponse, User } from '../models';

const API = `${environment.apiBase}/api/auth`;
const TOKEN_KEY = 'rms.token';
const USER_KEY = 'rms.user';

/**
 * AuthService — single source of truth for "who is logged in?".
 *
 * - Persists the token and user to localStorage so a refresh keeps the
 *   session alive.
 * - Exposes `user`, `token`, and `isAuthenticated` as signals so
 *   templates and guards can react automatically.
 * - `verifyToken()` is called once on app start to confirm the saved
 *   token is still valid (e.g. not deleted server-side). If it isn't,
 *   we clear the session.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  private readonly _user = signal<User | null>(this.readStoredUser());
  private readonly _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token() && !!this._user());

  register(name: string, email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API}/register`, { name, email, password })
      .pipe(tap((res) => this.persistSession(res)));
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API}/login`, { email, password })
      .pipe(tap((res) => this.persistSession(res)));
  }

  /** Called on app boot to validate the saved token against the server. */
  verifyToken(): Observable<User | null> {
    if (!this._token()) return of(null);
    return this.http.get<{ user: User }>(`${API}/me`).pipe(
      tap((res) => this._user.set(res.user)),
      map((res) => res.user),
      // If the server rejects the token, drop the session silently.
      catchError(() => {
        this.clearSession();
        return of(null);
      })
    );
  }

  logout(): void {
    this.clearSession();
  }

  private persistSession(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this._token.set(res.token);
    this._user.set(res.user);
  }

  /** Called by the HTTP interceptor when the server returns a 401. */
  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._token.set(null);
    this._user.set(null);
  }

  private readStoredUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }

  // For convenience when something non-reactive needs the value.
  getToken(): string | null {
    return this._token();
  }
}
