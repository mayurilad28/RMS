import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';

type FieldName = 'name' | 'email' | 'password' | 'confirm';

// Same rules enforced on the backend — keep them in lockstep.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_NAME_LENGTH = 4;
const MIN_PASSWORD_LENGTH = 8;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-wrap">
      <div class="auth-card">
        <h1>Create your account</h1>
        <p class="muted">
          Free to start — manage your own categories and resumes in seconds.
        </p>

        <form (ngSubmit)="submit()" #f="ngForm" novalidate>
          <label>
            <span>Full name</span>
            <input
              type="text"
              name="name"
              [(ngModel)]="name"
              #nameRef="ngModel"
              (blur)="touched.name = true"
              [class.invalid]="showError('name')"
              required
              autocomplete="name"
              placeholder="Jane Recruiter"
            />
            <small class="field-error" *ngIf="showError('name')">
              {{ nameError() }}
            </small>
          </label>

          <label>
            <span>Email</span>
            <input
              type="email"
              name="email"
              [(ngModel)]="email"
              #emailRef="ngModel"
              (blur)="touched.email = true"
              [class.invalid]="showError('email')"
              required
              autocomplete="email"
              placeholder="you@example.com"
            />
            <small class="field-error" *ngIf="showError('email')">
              {{ emailError() }}
            </small>
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              name="password"
              [(ngModel)]="password"
              #passwordRef="ngModel"
              (blur)="touched.password = true"
              [class.invalid]="showError('password')"
              required
              minlength="8"
              autocomplete="new-password"
              placeholder="At least 8 characters"
            />
            <small class="field-error" *ngIf="showError('password')">
              {{ passwordError() }}
            </small>
          </label>

          <label>
            <span>Confirm password</span>
            <input
              type="password"
              name="confirm"
              [(ngModel)]="confirm"
              #confirmRef="ngModel"
              (blur)="touched.confirm = true"
              [class.invalid]="showError('confirm')"
              required
              autocomplete="new-password"
              placeholder="Re-enter your password"
            />
            <small class="field-error" *ngIf="showError('confirm')">
              {{ confirmError() }}
            </small>
          </label>

          <div class="error" *ngIf="errorMsg()">{{ errorMsg() }}</div>

          <button
            type="submit"
            [disabled]="loading() || !canSubmit()"
          >
            {{ loading() ? 'Creating account…' : 'Create account' }}
          </button>
        </form>

        <p class="alt">
          Already have an account? <a routerLink="/login">Sign in</a>
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
        max-width: 460px;
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
        gap: 0.85rem;
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
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      input.invalid {
        border-color: #fca5a5;
        background: #fff7f7;
      }
      input.invalid:focus {
        border-color: #ef4444;
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
      }
      .field-error {
        color: #b91c1c;
        font-size: 0.78rem;
        font-weight: 500;
        margin-top: 2px;
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
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected name = '';
  protected email = '';
  protected password = '';
  protected confirm = '';
  protected loading = signal(false);
  protected errorMsg = signal<string | null>(null);

  /**
   * Per-field "touched" map. We only show field-level errors after the
   * user has either blurred the field once or attempted to submit, so
   * the form doesn't look like it's already failing when first rendered.
   */
  protected touched: Record<FieldName, boolean> = {
    name: false,
    email: false,
    password: false,
    confirm: false,
  };
  protected submitted = false;

  protected nameError(): string | null {
    const trimmed = this.name.trim();
    if (!trimmed) return 'Full name is required.';
    if (trimmed.length < MIN_NAME_LENGTH) {
      return `Full name must be at least ${MIN_NAME_LENGTH} characters.`;
    }
    return null;
  }

  protected emailError(): string | null {
    const trimmed = this.email.trim();
    if (!trimmed) return 'Email is required.';
    if (!EMAIL_REGEX.test(trimmed)) {
      return 'Please enter a valid email address (e.g. you@example.com).';
    }
    return null;
  }

  protected passwordError(): string | null {
    if (!this.password) return 'Password is required.';
    if (this.password.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    return null;
  }

  protected confirmError(): string | null {
    if (!this.confirm) return 'Please confirm your password.';
    if (this.password !== this.confirm) return 'Passwords do not match.';
    return null;
  }

  protected showError(field: FieldName): boolean {
    if (!this.touched[field] && !this.submitted) return false;
    return this.fieldError(field) !== null;
  }

  protected canSubmit(): boolean {
    return (
      this.nameError() === null &&
      this.emailError() === null &&
      this.passwordError() === null &&
      this.confirmError() === null
    );
  }

  private fieldError(field: FieldName): string | null {
    switch (field) {
      case 'name':
        return this.nameError();
      case 'email':
        return this.emailError();
      case 'password':
        return this.passwordError();
      case 'confirm':
        return this.confirmError();
    }
  }

  protected submit(): void {
    this.submitted = true;
    this.errorMsg.set(null);

    if (!this.canSubmit()) return;

    this.loading.set(true);
    this.auth
      .register(this.name.trim(), this.email.trim(), this.password)
      .subscribe({
        next: () => this.router.navigateByUrl('/categories'),
        error: (err: HttpErrorResponse) => {
          this.errorMsg.set(
            err.error?.error || 'Could not create your account. Please try again.'
          );
          this.loading.set(false);
        },
      });
  }
}
