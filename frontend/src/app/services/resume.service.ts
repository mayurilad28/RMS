import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Resume, ResumeFilters } from '../models';

const API = `${environment.apiBase}/api/resumes`;

@Injectable({ providedIn: 'root' })
export class ResumeService {
  private http = inject(HttpClient);

  list(filters: ResumeFilters = {}): Observable<Resume[]> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<Resume[]>(API, { params });
  }

  get(id: string): Observable<Resume> {
    return this.http.get<Resume>(`${API}/${id}`);
  }

  upload(categoryId: string, file: File): Observable<Resume> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<Resume>(`${API}/upload/${categoryId}`, form);
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${API}/${id}`);
  }

  downloadUrl(id: string): string {
    return `${API}/${id}/download`;
  }
}
