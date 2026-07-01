import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Category } from '../models';

const API = `${environment.apiBase}/api/categories`;

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private http = inject(HttpClient);

  list(): Observable<Category[]> {
    return this.http.get<Category[]>(API);
  }

  create(name: string, description = ''): Observable<Category> {
    return this.http.post<Category>(API, { name, description });
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${API}/${id}`);
  }
}
