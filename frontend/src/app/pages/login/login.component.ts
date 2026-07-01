import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-wrap">
      <div class="auth-card">
        <h1>Welcome back</h1>
        <p class="muted">Sign in to manage your resumes and categories.</p>

        <form (ngSubmit)="submit()" #f="ngForm" novalidate>
          <label>
            <span>Email</span>
            <input
              type="email"
              name="email"
              [(ngModel)]="email"
              required
              autocomplete="username"
              placeholder="you@example.com"
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              name="password"
              [(ngModel)]="password"
              required
              autocomplete="current-password"
              placeholder="At least 8 characters"
            />
          </label>

          <div class="error" *ngIf="errorMsg()">{{ errorMsg() }}</div>

          <button type="submit" [disabled]="loading() || !email || !password">
            {{ loading() ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>

        <p class="alt">
          New here? <a routerLink="/register">Create an account</a>
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      .auth-wrap {
        min-height: calc(100vh - 64px - 4rem);
        display: grid;
        place-items: center;
        padding: 2rem 1rem;
      }
      .auth-card {
        width: 100%;
        max-width: 420px;
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 2rem;
        box-shadow: var(--shadow-md);
      }
      h1 {
        margin: 0 0 0.4rem;
        font-size: 1.55rem;
        letter-spacing: -0.01em;
      }
      .muted {
        color: #64748b;
        margin: 0 0 1.4rem;
        font-size: 0.95rem;
      }
      form {
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
      }
      label {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        font-size: 0.88rem;
        color: #334155;
      }
      label span {
        font-weight: 500;
      }
      input {
        padding: 0.65rem 0.85rem;
        border-radius: 10px;
        border: 1px solid var(--border);
        font-size: 0.95rem;
      }
      .error {
        background: #fef2f2;
        color: #b91c1c;
        border: 1px solid #fecaca;
        border-radius: 10px;
        padding: 0.55rem 0.75rem;
        font-size: 0.88rem;
      }
      button {
        margin-top: 0.4rem;
        padding: 0.75rem;
        font-size: 0.95rem;
      }
      .alt {
        margin: 1.2rem 0 0;
        text-align: center;
        font-size: 0.9rem;
        color: #64748b;
      }
      .alt a {
        color: var(--primary);
        font-weight: 600;
        text-decoration: none;
      }
      .alt a:hover {
        text-decoration: underline;
      }
    `,
  ],
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  protected email = '';
  protected password = '';
  protected loading = signal(false);
  protected errorMsg = signal<string | null>(null);

  protected submit(): void {
    if (!this.email || !this.password) return;
    this.loading.set(true);
    this.errorMsg.set(null);

    this.auth.login(this.email.trim(), this.password).subscribe({
      next: () => {
        const returnUrl =
          this.route.snapshot.queryParamMap.get('returnUrl') || '/categories';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMsg.set(
          err.error?.error || 'Could not sign in. Please try again.'
        );
        this.loading.set(false);
      },
    });
  }
}
