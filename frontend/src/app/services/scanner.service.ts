import {
  HttpClient,
  HttpEventType,
  HttpResponse,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import { environment } from '../../environments/environment';

const API = `${environment.apiBase}/api/scanner`;

export interface ScanResult {
  resume: {
    candidateName: string;
    position: string;
    positionSource: 'explicit' | 'inferred' | 'none';
    email: string;
    phone: string;
    location: string;
    skills: string[];
    experienceYears: number;
  };
  jobDescription: string;
  match: {
    score: number;
    breakdown: {
      skillsScore: number;
      keywordsScore: number;
      experienceScore: number;
    };
    matchedSkills: string[];
    missingSkills: string[];
    extraSkills: string[];
    matchedKeywords: string[];
    missingKeywords: string[];
    location: {
      resume: string;
      job: string;
      matches: boolean;
    };
    jobTitle: {
      resume: string;
      job: string;
      matches: boolean;
    };
    experience: { required: number; candidate: number; meets: boolean };
    suggestions: string[];
  };
}

/**
 * One of these is emitted at every step of the scan:
 *   - { type: 'upload', percent: 0..100 } while bytes are being uploaded
 *   - { type: 'analyzing' }              once the upload finishes; backend is parsing
 *   - { type: 'done', result }           final result is available
 */
export type ScanEvent =
  | { type: 'upload'; percent: number }
  | { type: 'analyzing' }
  | { type: 'done'; result: ScanResult };

@Injectable({ providedIn: 'root' })
export class ScannerService {
  private readonly http = inject(HttpClient);

  /**
   * Send the resume + JD to the backend.
   * The JD can be supplied as plain text (`jobDescription`) OR as a file
   * (`jobFile`). If both are provided, the uploaded file wins (backend logic).
   */
  quickScan(
    file: File,
    jobDescription: string,
    jobFile?: File | null
  ): Observable<ScanEvent> {
    const form = new FormData();
    form.append('file', file);
    if (jobFile) {
      form.append('jobFile', jobFile);
    } else {
      form.append('jobDescription', jobDescription);
    }

    return this.http
      .post<ScanResult>(`${API}/quick-scan`, form, {
        reportProgress: true,
        observe: 'events',
      })
      .pipe(
        map((event): ScanEvent | null => {
          if (event.type === HttpEventType.UploadProgress) {
            const total = event.total ?? file.size;
            const percent = total
              ? Math.min(100, Math.round((event.loaded / total) * 100))
              : 0;
            // Once the bytes are fully delivered, the server starts parsing.
            return percent >= 100
              ? { type: 'analyzing' }
              : { type: 'upload', percent };
          }
          if (event.type === HttpEventType.Response) {
            const res = event as HttpResponse<ScanResult>;
            return { type: 'done', result: res.body as ScanResult };
          }
          return null;
        }),
        filter((e): e is ScanEvent => e !== null),
      );
  }
}
