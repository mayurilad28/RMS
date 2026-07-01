import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Category, Resume, ResumeFilters } from '../../models';
import { CategoryService } from '../../services/category.service';
import { ResumeService } from '../../services/resume.service';

@Component({
  selector: 'app-resumes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <h2>Search Candidates</h2>

    <div class="card filters">
      <div>
        <label>Category</label>
        <select [(ngModel)]="filters.categoryId">
          <option value="">All</option>
          @for (c of categories(); track c._id) {
            <option [value]="c._id">{{ c.name }}</option>
          }
        </select>
      </div>
      <div>
        <label>Skills (comma separated)</label>
        <input
          [(ngModel)]="filters.skills"
          placeholder="e.g. angular, node.js"
        />
      </div>
      <div>
        <label>Min experience (years)</label>
        <input
          type="number"
          min="0"
          [(ngModel)]="filters.minExperience"
          placeholder="e.g. 2"
        />
      </div>
      <div>
        <label>Location</label>
        <input [(ngModel)]="filters.location" placeholder="e.g. Pune" />
      </div>
      <div>
        <label>Keyword</label>
        <input
          [(ngModel)]="filters.q"
          placeholder="Search inside resume text"
        />
      </div>
      <div class="actions">
        <button (click)="search()">Search</button>
        <button class="secondary" (click)="reset()">Reset</button>
      </div>
    </div>

    @if (loading()) {
      <p>Loading…</p>
    } @else if (resumes().length === 0) {
      <div class="card empty">No resumes match your filters.</div>
    } @else {
      <p class="count">{{ resumes().length }} result(s)</p>
      <div class="grid">
        @for (r of resumes(); track r._id) {
          <a class="card resume" [routerLink]="['/resumes', r._id]">
            <div class="resume-head">
              <h3>{{ r.candidateName || r.originalName }}</h3>
              <span class="badge">{{ categoryName(r) }}</span>
            </div>
            <p class="muted small">
              {{ r.email || '—' }} · {{ r.phone || '—' }}
            </p>
            <p class="muted small">
              {{ r.location || 'Unknown location' }} ·
              {{ r.experienceYears }} yr exp
            </p>
            <div>
              @for (s of r.skills.slice(0, 6); track s) {
                <span class="badge">{{ s }}</span>
              }
              @if (r.skills.length > 6) {
                <span class="badge">+{{ r.skills.length - 6 }} more</span>
              }
            </div>
          </a>
        }
      </div>
    }
  `,
  styles: [
    `
      h2 {
        margin-top: 0;
      }
      .filters {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 1rem;
        align-items: end;
        margin-bottom: 1.5rem;
      }
      .actions {
        display: flex;
        gap: 0.5rem;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1rem;
      }
      .resume {
        text-decoration: none;
        color: inherit;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        transition: transform 0.1s, box-shadow 0.1s;
      }
      .resume:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }
      .resume-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 0.5rem;
      }
      .resume-head h3 {
        margin: 0;
        font-size: 1rem;
      }
      .muted {
        color: var(--text-muted);
      }
      .small {
        font-size: 0.85rem;
        margin: 0;
      }
      .count {
        color: var(--text-muted);
        margin: 0 0 0.75rem;
      }
      .empty {
        text-align: center;
        color: var(--text-muted);
      }
    `,
  ],
})
export class ResumesComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private resumeService = inject(ResumeService);

  protected categories = signal<Category[]>([]);
  protected resumes = signal<Resume[]>([]);
  protected loading = signal(true);

  protected filters: ResumeFilters = {
    categoryId: '',
    skills: '',
    minExperience: undefined,
    location: '',
    q: '',
  };

  ngOnInit(): void {
    this.categoryService.list().subscribe((list) => this.categories.set(list));
    this.search();
  }

  protected search(): void {
    this.loading.set(true);
    this.resumeService.list(this.filters).subscribe({
      next: (list) => {
        this.resumes.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected reset(): void {
    this.filters = {
      categoryId: '',
      skills: '',
      minExperience: undefined,
      location: '',
      q: '',
    };
    this.search();
  }

  protected categoryName(r: Resume): string {
    if (typeof r.category === 'string') return '';
    return r.category?.name ?? '';
  }
}
