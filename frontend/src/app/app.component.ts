import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="topbar">
      <a class="brand" routerLink="/quick-scan" aria-label="Resume Management System home">
        <svg
          class="logo"
          viewBox="0 0 40 40"
          width="36"
          height="36"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="rmsLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ff7672" />
              <stop offset="100%" stop-color="#ff5e59" />
            </linearGradient>
            <linearGradient id="rmsCheckGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#10b981" />
              <stop offset="100%" stop-color="#22c55e" />
            </linearGradient>
          </defs>

          <!-- Rounded gradient tile -->
          <rect x="1" y="1" width="38" height="38" rx="10" fill="url(#rmsLogoGrad)" />

          <!-- Document with corner fold -->
          <path
            d="M13 10h10.5l4.5 4.5V29a2.5 2.5 0 0 1-2.5 2.5H13A2.5 2.5 0 0 1 10.5 29V12.5A2.5 2.5 0 0 1 13 10z"
            fill="#ffffff"
          />
          <path d="M23.5 10v4.5H28" fill="rgba(255, 94, 89, 0.18)" />

          <!-- Resume "lines" -->
          <rect x="13.5" y="17.5" width="9.5" height="1.6" rx="0.8" fill="#fbcfcd" />
          <rect x="13.5" y="20.6" width="11" height="1.6" rx="0.8" fill="#fbcfcd" />
          <rect x="13.5" y="23.7" width="7" height="1.6" rx="0.8" fill="#fbcfcd" />

          <!-- Match check badge -->
          <circle cx="30" cy="29" r="6" fill="url(#rmsCheckGrad)" stroke="#ffffff" stroke-width="1.5" />
          <path
            d="M27.4 29.2l1.8 1.8 3.6-3.8"
            fill="none"
            stroke="#ffffff"
            stroke-width="1.9"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <div class="brand-text">
          <span class="brand-title">Resume Management System</span>
          <span class="brand-sub">Score · Match · Shortlist</span>
        </div>
      </a>
      <nav>
        <a routerLink="/quick-scan" routerLinkActive="active">Quick Scan</a>
        <ng-container *ngIf="auth.isAuthenticated()">
          <a routerLink="/categories" routerLinkActive="active">Categories</a>
          <a routerLink="/upload" routerLinkActive="active">Upload</a>
          <a routerLink="/resumes" routerLinkActive="active">Search</a>
        </ng-container>
      </nav>

      <div class="auth-area">
        <ng-container *ngIf="auth.isAuthenticated(); else loggedOut">
          <div class="user-chip" [title]="auth.user()?.email || ''">
            <div class="avatar">{{ initials() }}</div>
            <span class="user-name">{{ auth.user()?.name }}</span>
          </div>
          <button class="logout-btn" type="button" (click)="logout()">
            Logout
          </button>
        </ng-container>
        <ng-template #loggedOut>
          <a class="auth-link" routerLink="/login">Sign in</a>
          <a class="auth-link primary" routerLink="/register">Sign up</a>
        </ng-template>
      </div>
    </header>
    <main class="container">
      <router-outlet />
    </main>
  `,
  styles: [
    `
      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.9rem 2rem;
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: saturate(180%) blur(12px);
        -webkit-backdrop-filter: saturate(180%) blur(12px);
        color: #0f172a;
        border-bottom: 1px solid #e2e8f0;
        position: sticky;
        top: 0;
        z-index: 10;
      }
      .brand {
        display: inline-flex;
        align-items: center;
        gap: 0.7rem;
        text-decoration: none;
        color: inherit;
        transition: opacity 0.15s ease;
      }
      .brand:hover {
        opacity: 0.85;
        text-decoration: none;
      }
      .logo {
        flex-shrink: 0;
        filter: drop-shadow(0 2px 6px rgba(255, 94, 89, 0.35));
      }
      .brand-text {
        display: flex;
        flex-direction: column;
        line-height: 1.1;
      }
      .brand-title {
        font-size: 1.02rem;
        font-weight: 700;
        letter-spacing: -0.01em;
        background: linear-gradient(120deg, #ff5e59, #ed4a45);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
      .brand-sub {
        font-size: 0.7rem;
        color: #94a3b8;
        font-weight: 500;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        margin-top: 2px;
      }
      @media (max-width: 640px) {
        .brand-text {
          display: none;
        }
      }
      nav {
        display: flex;
        gap: 0.25rem;
        flex: 1;
        justify-content: center;
      }
      nav a {
        color: #64748b;
        text-decoration: none;
        padding: 0.45rem 0.85rem;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 500;
        transition: all 0.15s ease;
      }
      nav a:hover {
        color: #0f172a;
        background: #f1f5f9;
      }
      nav a.active {
        color: #ff5e59;
        background: #faf4f3;
      }
      .auth-area {
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }
      .auth-link {
        color: #64748b;
        text-decoration: none;
        padding: 0.45rem 0.95rem;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 500;
        transition: all 0.15s ease;
      }
      .auth-link:hover {
        color: #0f172a;
        background: #f1f5f9;
      }
      .auth-link.primary {
        background: linear-gradient(135deg, #ff7672, #ff5e59);
        color: #fff;
        box-shadow: 0 1px 3px rgba(255, 94, 89, 0.3);
      }
      .auth-link.primary:hover {
        background: linear-gradient(135deg, #ff5e59, #ed4a45);
        box-shadow: 0 6px 16px rgba(255, 94, 89, 0.4);
        transform: translateY(-1px);
      }
      .user-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        padding: 0.3rem 0.8rem 0.3rem 0.3rem;
        background: #faf4f3;
        border: 1px solid #f1dedb;
        border-radius: 999px;
        font-size: 0.88rem;
        color: #334155;
        max-width: 200px;
      }
      .avatar {
        width: 28px;
        height: 28px;
        border-radius: 999px;
        background: linear-gradient(135deg, #ff7672, #ed4a45);
        color: #fff;
        font-size: 0.72rem;
        font-weight: 700;
        display: grid;
        place-items: center;
        letter-spacing: 0.02em;
      }
      .user-name {
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .logout-btn {
        padding: 0.45rem 0.85rem;
        background: #fff;
        color: #ed4a45;
        border: 1px solid #f1dedb;
        border-radius: 8px;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
        box-shadow: none;
      }
      .logout-btn:hover {
        background: #faf4f3;
        border-color: #e6c9c6;
        box-shadow: var(--shadow-md);
      }
      @media (max-width: 640px) {
        .user-name {
          display: none;
        }
        .user-chip {
          padding: 0.25rem;
        }
      }
      .container {
        max-width: 1100px;
        margin: 2rem auto;
        padding: 0 1.5rem;
      }
    `,
  ],
})
export class AppComponent {
  protected auth = inject(AuthService);
  private router = inject(Router);

  protected initials(): string {
    const name = this.auth.user()?.name || '';
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] || '';
    const second = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + second).toUpperCase() || '?';
  }

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/quick-scan');
  }
}
