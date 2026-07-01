import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Category } from '../../models';
import { CategoryService } from '../../services/category.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h2>Categories</h2>
    <p class="muted">
      Buckets used to organise resumes (Frontend Developer, QA, DevOps, HR, ...).
    </p>

    <div class="card create-form">
      <h3>Add new category</h3>
      <div class="row">
        <input
          [(ngModel)]="newName"
          placeholder="e.g. Frontend Developer"
          (keyup.enter)="create()"
        />
        <input
          [(ngModel)]="newDescription"
          placeholder="Description (optional)"
        />
        <button (click)="create()" [disabled]="!newName.trim() || saving()">
          {{ saving() ? 'Adding…' : 'Add' }}
        </button>
      </div>
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
    </div>

    @if (loading()) {
      <p>Loading…</p>
    } @else if (categories().length === 0) {
      <div class="card empty">No categories yet — add your first one above.</div>
    } @else {
      <div class="grid">
        @for (cat of categories(); track cat._id) {
          <div class="card category">
            <div class="cat-head">
              <h3>{{ cat.name }}</h3>
              <span class="badge">{{ cat.resumeCount ?? 0 }} resumes</span>
            </div>
            @if (cat.description) {
              <p class="muted">{{ cat.description }}</p>
            }
            <button class="danger" (click)="remove(cat)">Delete</button>
          </div>
        }
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
      .create-form {
        margin: 1rem 0 1.5rem;
      }
      .row {
        display: grid;
        grid-template-columns: 1fr 1fr auto;
        gap: 0.75rem;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 1rem;
      }
      .category {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .cat-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .cat-head h3 {
        margin: 0;
      }
      .empty {
        text-align: center;
        color: var(--text-muted);
      }
      .error {
        color: var(--danger);
        font-size: 0.9rem;
        margin: 0.5rem 0 0;
      }
    `,
  ],
})
export class CategoriesComponent implements OnInit {
  private categoryService = inject(CategoryService);

  protected categories = signal<Category[]>([]);
  protected loading = signal(true);
  protected saving = signal(false);
  protected error = signal('');

  protected newName = '';
  protected newDescription = '';

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.categoryService.list().subscribe({
      next: (list) => {
        this.categories.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to load categories');
        this.loading.set(false);
      },
    });
  }

  protected create(): void {
    const name = this.newName.trim();
    if (!name) return;
    this.saving.set(true);
    this.error.set('');
    this.categoryService.create(name, this.newDescription.trim()).subscribe({
      next: () => {
        this.newName = '';
        this.newDescription = '';
        this.saving.set(false);
        this.load();
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to create category');
        this.saving.set(false);
      },
    });
  }

  protected remove(cat: Category): void {
    const confirmed = confirm(
      `Delete "${cat.name}"? All resumes in this category will also be deleted.`
    );
    if (!confirmed) return;
    this.categoryService.delete(cat._id).subscribe({
      next: () => this.load(),
      error: (err) =>
        this.error.set(err.error?.error || 'Failed to delete category'),
    });
  }
}
