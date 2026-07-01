import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Resume } from '../../models';
import { ResumeService } from '../../services/resume.service';

@Component({
  selector: 'app-resume-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <p>
      <a routerLink="/resumes">← Back to search</a>
    </p>

    @if (loading()) {
      <p>Loading…</p>
    } @else if (!resume()) {
      <p>Resume not found.</p>
    } @else {
      @let r = resume()!;
      <div class="card header">
        <div>
          <h2>{{ r.candidateName || r.originalName }}</h2>
          <p class="muted">{{ categoryName() }}</p>
        </div>
        <div class="actions">
          <a class="button secondary" [href]="downloadUrl()" target="_blank">
            Download original
          </a>
          <button class="danger" (click)="remove()">Delete</button>
        </div>
      </div>

      <div class="card info">
        <h3>Contact & summary</h3>
        <dl>
          <dt>Email</dt>
          <dd>{{ r.email || '—' }}</dd>
          <dt>Phone</dt>
          <dd>{{ r.phone || '—' }}</dd>
          <dt>Location</dt>
          <dd>{{ r.location || '—' }}</dd>
          <dt>Experience</dt>
          <dd>{{ r.experienceYears }} year(s)</dd>
          <dt>File</dt>
          <dd>{{ r.originalName }} ({{ formatSize(r.sizeBytes) }})</dd>
          <dt>Uploaded</dt>
          <dd>{{ r.createdAt | date: 'medium' }}</dd>
        </dl>

        <h3>Skills</h3>
        @if (r.skills.length) {
          <div>
            @for (s of r.skills; track s) {
              <span class="badge">{{ s }}</span>
            }
          </div>
        } @else {
          <p class="muted">No skills detected.</p>
        }
      </div>

      <div class="card">
        <h3>Raw text</h3>
        <pre>{{ r.rawText }}</pre>
      </div>
    }
  `,
  styles: [
    `
      h2 {
        margin: 0;
      }
      .muted {
        color: var(--text-muted);
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
      }
      .actions {
        display: flex;
        gap: 0.5rem;
      }
      .button {
        display: inline-block;
        padding: 0.55rem 1rem;
        border-radius: var(--radius);
        text-decoration: none;
        background: var(--primary);
        color: #fff;
      }
      .button.secondary {
        background: #e2e8f0;
        color: var(--text);
      }
      .info {
        margin-bottom: 1rem;
      }
      dl {
        display: grid;
        grid-template-columns: 130px 1fr;
        gap: 0.4rem 1rem;
        margin: 0.5rem 0 1.5rem;
      }
      dt {
        color: var(--text-muted);
      }
      pre {
        background: #f1f5f9;
        padding: 1rem;
        border-radius: var(--radius);
        max-height: 400px;
        overflow: auto;
        white-space: pre-wrap;
        font-size: 0.85rem;
      }
    `,
  ],
})
export class ResumeDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private resumeService = inject(ResumeService);

  protected resume = signal<Resume | null>(null);
  protected loading = signal(true);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      return;
    }
    this.resumeService.get(id).subscribe({
      next: (r) => {
        this.resume.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected categoryName(): string {
    const r = this.resume();
    if (!r) return '';
    return typeof r.category === 'string' ? '' : r.category.name;
  }

  protected downloadUrl(): string {
    const r = this.resume();
    return r ? this.resumeService.downloadUrl(r._id) : '';
  }

  protected remove(): void {
    const r = this.resume();
    if (!r) return;
    if (!confirm('Delete this resume?')) return;
    this.resumeService.delete(r._id).subscribe(() => {
      this.router.navigate(['/resumes']);
    });
  }

  protected formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}
