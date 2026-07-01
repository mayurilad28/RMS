import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Category, Resume } from '../../models';
import { CategoryService } from '../../services/category.service';
import { ResumeService } from '../../services/resume.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <h2>Upload Resume</h2>
    <p class="muted">PDF, DOC, or DOCX up to 5 MB.</p>

    <div class="card form">
      <div>
        <label>Category</label>
        <select [(ngModel)]="selectedCategoryId">
          <option value="">— Select category —</option>
          @for (c of categories(); track c._id) {
            <option [value]="c._id">{{ c.name }}</option>
          }
        </select>
        @if (categories().length === 0 && !loadingCategories()) {
          <p class="muted small">
            No categories yet —
            <a routerLink="/categories">create one first</a>.
          </p>
        }
      </div>

      <div>
        <label>Resume file</label>
        <input
          type="file"
          (change)="onFileSelected($event)"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        />
      </div>

      <button (click)="upload()" [disabled]="!canUpload()">
        {{ uploading() ? 'Uploading…' : 'Upload & Scan' }}
      </button>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
    </div>

    @if (lastUploaded(); as r) {
      <div class="card result">
        <h3>Extracted info</h3>
        <dl>
          <dt>Name</dt>
          <dd>{{ r.candidateName || '—' }}</dd>
          <dt>Email</dt>
          <dd>{{ r.email || '—' }}</dd>
          <dt>Phone</dt>
          <dd>{{ r.phone || '—' }}</dd>
          <dt>Location</dt>
          <dd>{{ r.location || '—' }}</dd>
          <dt>Experience</dt>
          <dd>{{ r.experienceYears }} year(s)</dd>
          <dt>Skills</dt>
          <dd>
            @if (r.skills.length) {
              @for (s of r.skills; track s) {
                <span class="badge">{{ s }}</span>
              }
            } @else {
              —
            }
          </dd>
        </dl>
        <a routerLink="/resumes">View all resumes →</a>
      </div>
    }
  `,
  styles: [
    `
      h2 {
        margin-top: 0;
      }
      .muted {
        color: var(--text-muted);
      }
      .small {
        font-size: 0.85rem;
      }
      .form {
        display: grid;
        gap: 1rem;
        max-width: 520px;
      }
      .result {
        margin-top: 1.5rem;
      }
      .result dl {
        display: grid;
        grid-template-columns: 130px 1fr;
        gap: 0.5rem 1rem;
        margin: 1rem 0;
      }
      .result dt {
        color: var(--text-muted);
      }
      .error {
        color: var(--danger);
        margin: 0;
      }
    `,
  ],
})
export class UploadComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private resumeService = inject(ResumeService);

  protected categories = signal<Category[]>([]);
  protected loadingCategories = signal(true);
  protected uploading = signal(false);
  protected error = signal('');
  protected lastUploaded = signal<Resume | null>(null);

  protected selectedCategoryId = '';
  protected file: File | null = null;

  ngOnInit(): void {
    this.categoryService.list().subscribe({
      next: (list) => {
        this.categories.set(list);
        this.loadingCategories.set(false);
      },
      error: () => this.loadingCategories.set(false),
    });
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file = input.files?.[0] ?? null;
  }

  protected canUpload(): boolean {
    return !!this.selectedCategoryId && !!this.file && !this.uploading();
  }

  protected upload(): void {
    if (!this.file || !this.selectedCategoryId) return;
    this.uploading.set(true);
    this.error.set('');
    this.lastUploaded.set(null);

    this.resumeService.upload(this.selectedCategoryId, this.file).subscribe({
      next: (resume) => {
        this.lastUploaded.set(resume);
        this.uploading.set(false);
        this.file = null;
        (document.querySelector('input[type=file]') as HTMLInputElement).value =
          '';
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Upload failed');
        this.uploading.set(false);
      },
    });
  }
}
