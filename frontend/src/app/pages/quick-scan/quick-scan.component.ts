import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ScannerService, ScanResult } from '../../services/scanner.service';

type ScanStage = 'idle' | 'uploading' | 'analyzing';

@Component({
  selector: 'app-quick-scan',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="hero">
      <h1>Score any resume against your job posting</h1>
      <p class="subtitle">
        <span class="accent">5x</span> faster candidate shortlisting
      </p>
    </div>

    <ol class="stepper">
      @for (s of stepLabels; track s.num) {
        <li
          [class.active]="step() === s.num"
          [class.done]="step() > s.num"
        >
          <span class="circle">
            @if (step() > s.num) {
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <path
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3 8.5l3.5 3.5L13 4.5"
                />
              </svg>
            } @else {
              {{ s.num }}
            }
          </span>
          <span class="label">{{ s.label }}</span>
        </li>
      }
    </ol>

    <!-- ===== STEP 1: Upload resume ====================================== -->
    @if (step() === 1) {
      <div
        class="dropzone"
        [class.dragging]="isDragging()"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave()"
        (drop)="onDrop($event)"
      >
        <div class="icon" aria-hidden="true">
          <svg viewBox="0 0 64 64" width="56" height="56">
            <path
              fill="#cfe2ff"
              d="M14 6h28l10 10v42a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4z"
            />
            <path fill="#9ec5fe" d="M42 6v10h10z" />
            <circle cx="46" cy="48" r="10" fill="#2563eb" />
            <path
              fill="#fff"
              d="M46 42l-5 5h3v6h4v-6h3z"
            />
          </svg>
        </div>
        <p class="drop-text">
          Drag &amp; Drop or
          <label class="choose">
            <input
              type="file"
              hidden
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.tiff,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,text/plain"
              (change)="onFileSelected($event)"
            />
            <span>Choose file</span>
          </label>
          to upload
        </p>
        <p class="hint">as .pdf or .docx file</p>
        @if (file()) {
          <p class="selected">Selected: <strong>{{ file()!.name }}</strong></p>
        }
        @if (fileError()) {
          <p class="error">{{ fileError() }}</p>
        }
      </div>

      <div class="actions center">
        <button (click)="goToStep2()" [disabled]="!file()">Continue</button>
      </div>
    }

    <!-- ===== STEP 2: Add job description ================================ -->
    @if (step() === 2) {
      <div class="card">
        <div class="jd-upload-row">
          <label class="swap-btn">
            <input
              type="file"
              hidden
              accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              (change)="onSelectJobFile($event)"
              [disabled]="scanning()"
            />
            <span>
              {{ jobDescriptionFile() ? 'Change JD file' : 'Upload JD file (PDF / DOC / DOCX / TXT)' }}
            </span>
          </label>
          @if (jobDescriptionFile(); as jf) {
            <span class="jd-file-pill">
              <strong>{{ jf.name }}</strong>
              <a class="remove-link" (click)="clearJobFile()">remove</a>
            </span>
          }
        </div>

        <div class="or-divider"><span>or paste below</span></div>

        <label for="jd">Paste the job description</label>
        <textarea
          id="jd"
          rows="12"
          [(ngModel)]="jobDescription"
          [disabled]="!!jobDescriptionFile()"
          placeholder="Paste the full job description here. The more detail, the better the score."
        ></textarea>
        @if (jobDescriptionFile()) {
          <p class="hint">
            Using the uploaded file as the job description. Remove it to paste
            text instead.
          </p>
        } @else {
          <p class="hint">
            We compare required skills, keywords, and years of experience
            against this resume.
          </p>
        }
      </div>

      <div class="actions">
        <button class="secondary" (click)="step.set(1)" [disabled]="scanning()">← Back</button>
        <button (click)="runStep2Scan()" [disabled]="!hasJdSource() || scanning()">
          {{ scanning() ? 'Scanning…' : 'Check score' }}
        </button>
      </div>

      @if (scanning()) {
        <div class="progress-card card">
          <div class="progress-head">
            @if (scanStage() === 'uploading') {
              <span class="spinner"></span>
              <strong>Uploading…</strong>
              <span class="progress-percent">{{ uploadPercent() }}%</span>
            } @else {
              <span class="spinner"></span>
              <strong>Analyzing the resume…</strong>
              <span class="progress-percent">parsing PDF</span>
            }
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill"
              [class.indeterminate]="scanStage() === 'analyzing'"
              [style.width.%]="uploadPercent()"
            ></div>
          </div>
          <p class="hint progress-hint">
            @if (scanStage() === 'uploading') {
              Sending {{ file()?.name }} to the server.
            } @else {
              Extracting text, scoring skills, and matching keywords. Please don't close this tab.
            }
          </p>
        </div>
      }

      @if (scanError()) {
        <p class="error">{{ scanError() }}</p>
      }
    }

    <!-- ===== STEP 3: Results ============================================ -->
    @if (result(); as r) {
        <div class="tab-bar">
        <button
          class="tab"
          [class.active]="tab() === 'resume'"
          (click)="tab.set('resume')"
        >
          Resume Report
        </button>
        <button
          class="tab"
          [class.active]="tab() === 'jd'"
          (click)="tab.set('jd')"
        >
          Job Description
        </button>
      </div>

      <!-- ----- Resume Report tab ----- -->
      @if (tab() === 'resume') {
        <div class="swap-bar card">
          <div>
            <strong>{{ file()?.name || 'Resume' }}</strong>
            <span class="muted small"> · swap resume or JD and re-score</span>
          </div>
          <div class="swap-actions">
            <label class="swap-btn">
              <input
                type="file"
                hidden
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                (change)="onSwapResume($event)"
                [disabled]="scanning()"
              />
              <span>{{ scanning() ? 'Scanning…' : 'Upload new resume' }}</span>
            </label>
            <label class="swap-btn secondary">
              <input
                type="file"
                hidden
                accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                (change)="onSwapJobFile($event)"
                [disabled]="scanning()"
              />
              <span>{{ scanning() ? 'Scanning…' : 'Upload new JD' }}</span>
            </label>
            <button
              type="button"
              class="swap-btn-text"
              (click)="tab.set('jd')"
              [disabled]="scanning()"
            >
              Edit JD text
            </button>
          </div>
        </div>

        @if (scanning()) {
          <div class="progress-card card">
            <div class="progress-head">
              @if (scanStage() === 'uploading') {
                <span class="spinner"></span>
                <strong>Uploading…</strong>
                <span class="progress-percent">{{ uploadPercent() }}%</span>
              } @else {
                <span class="spinner"></span>
                <strong>Analyzing the resume…</strong>
                <span class="progress-percent">parsing PDF</span>
              }
            </div>
            <div class="progress-bar">
              <div
                class="progress-fill"
                [class.indeterminate]="scanStage() === 'analyzing'"
                [style.width.%]="uploadPercent()"
              ></div>
            </div>
          </div>
        }

        @if (fileError()) {
          <p class="error">{{ fileError() }}</p>
        }
        @if (scanError()) {
          <p class="error">{{ scanError() }}</p>
        }

        <div class="result-grid">
          <div class="card score-card" [attr.data-tier]="scoreTier(r.match.score)">
            <div class="score-gauge">
              <svg viewBox="0 0 120 120" class="gauge-svg" aria-hidden="true">
                <defs>
                  <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#ff7672" />
                    <stop offset="100%" stop-color="#ff5e59" />
                  </linearGradient>
                  <linearGradient id="gaugeGradientHigh" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#10b981" />
                    <stop offset="100%" stop-color="#22c55e" />
                  </linearGradient>
                  <linearGradient id="gaugeGradientMid" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#f59e0b" />
                    <stop offset="100%" stop-color="#facc15" />
                  </linearGradient>
                  <linearGradient id="gaugeGradientLow" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#ef4444" />
                    <stop offset="100%" stop-color="#f87171" />
                  </linearGradient>
                </defs>
                <circle class="gauge-bg" cx="60" cy="60" r="52" />
                <circle
                  class="gauge-fill"
                  cx="60" cy="60" r="52"
                  [attr.stroke]="'url(#' + gaugeGradientId(r.match.score) + ')'"
                  [style.stroke-dasharray]="gaugeCircumference + ' ' + gaugeCircumference"
                  [style.stroke-dashoffset]="gaugeDashOffset(r.match.score)"
                />
              </svg>
              <div class="gauge-text">
                <div class="gauge-percent">{{ r.match.score }}<span>%</span></div>
                <div class="gauge-label">Match score</div>
              </div>
            </div>

            <div class="breakdown-modern">
              <div class="sub-score">
                <div class="sub-head">
                  <span>Skills</span>
                  <strong>{{ r.match.breakdown.skillsScore }}%</strong>
                </div>
                <div class="sub-bar">
                  <div class="sub-fill" [style.width.%]="r.match.breakdown.skillsScore"></div>
                </div>
              </div>
              <div class="sub-score">
                <div class="sub-head">
                  <span>Keywords</span>
                  <strong>{{ r.match.breakdown.keywordsScore }}%</strong>
                </div>
                <div class="sub-bar">
                  <div class="sub-fill" [style.width.%]="r.match.breakdown.keywordsScore"></div>
                </div>
              </div>
              <div class="sub-score">
                <div class="sub-head">
                  <span>Experience</span>
                  <strong>{{ r.match.breakdown.experienceScore }}%</strong>
                </div>
                <div class="sub-bar">
                  <div class="sub-fill" [style.width.%]="r.match.breakdown.experienceScore"></div>
                </div>
              </div>
            </div>
          </div>         

          <div class="card">
            <h3>Matched skills ({{ r.match.matchedSkills.length }})</h3>
            @if (r.match.matchedSkills.length) {
              <div>
                @for (s of r.match.matchedSkills; track s) {
                  <span class="badge ok">{{ s }}</span>
                }
              </div>
            } @else {
              <p class="muted">No matching skills detected.</p>
            }
          </div>

          <div class="card">
            <h3>Missing skills ({{ r.match.missingSkills.length }})</h3>
            @if (r.match.missingSkills.length) {
              <div>
                @for (s of r.match.missingSkills; track s) {
                  <span class="badge miss">{{ s }}</span>
                }
              </div>
            } @else {
              <p class="muted">You have every skill the JD asked for.</p>
            }
          </div>

          <div class="card">
            <h3>Experience</h3>
            <p>
              Job requires <strong>{{ r.match.experience.required || 'no specific' }}</strong>
              year(s). The resume shows
              <strong>{{ r.match.experience.candidate }}</strong> year(s).
            </p>
            <p
              [class.ok-text]="r.match.experience.meets"
              [class.miss-text]="!r.match.experience.meets"
            >
              {{ r.match.experience.meets ? '✓ You meet the experience requirement' : '✗ Below the requested experience' }}
            </p>
          </div>

          <div class="card">
            <h3>Position</h3>
            @if (r.resume.position || r.match.jobTitle.job) {
              <div>
                @if (r.resume.position) {
                  <p><strong>Resume position:</strong> {{ r.resume.position }}</p>
                  @if (r.resume.positionSource === 'inferred') {
                    <p class="hint">Title inferred from resume content; may be approximate.</p>
                  }
                } @else {
                  <p class="muted">Resume position not detected</p>
                }
                @if (r.match.jobTitle.job) {
                  <p><strong>JD title:</strong> {{ r.match.jobTitle.job }}</p>
                } @else {
                  <p class="muted">JD title not detected</p>
                }
                @if (r.resume.position && r.match.jobTitle.job) {
                  <p [class.ok-text]="r.match.jobTitle.matches" [class.miss-text]="!r.match.jobTitle.matches">
                    {{ r.match.jobTitle.matches ? '✓ Position matches the JD' : '✗ Position does not match the JD' }}
                  </p>
                }
              </div>
            } @else {
              <p class="muted">No position title found in resume or JD.</p>
            }
          </div>

          <div class="card">
            <h3>Missing keywords ({{ r.match.missingKeywords.length }})</h3>
            @if (r.match.missingKeywords.length) {
              <div>
                @for (k of r.match.missingKeywords; track k) {
                  <span class="badge soft-miss">{{ k }}</span>
                }
              </div>
              <p class="hint">
                Naturally include these where they apply to your real experience.
              </p>
            } @else {
              <p class="muted">All key JD terms are covered.</p>
            }
          </div>
        </div>
      }

      <!-- ----- Job Description tab ----- -->
      @if (tab() === 'jd') {
        <div class="swap-bar card">
          <div>
            <strong>Job description</strong>
            <span class="muted small"> · keep this resume, score a different JD</span>
          </div>
          <button
            (click)="rescanWithEditedJd()"
            [disabled]="!jobDescription.trim() || scanning()"
          >
            {{ scanning() ? 'Scanning…' : 'Re-scan' }}
          </button>
        </div>

        @if (scanning()) {
          <div class="progress-card card">
            <div class="progress-head">
              @if (scanStage() === 'uploading') {
                <span class="spinner"></span>
                <strong>Uploading…</strong>
                <span class="progress-percent">{{ uploadPercent() }}%</span>
              } @else {
                <span class="spinner"></span>
                <strong>Analyzing the resume…</strong>
                <span class="progress-percent">parsing PDF</span>
              }
            </div>
            <div class="progress-bar">
              <div
                class="progress-fill"
                [class.indeterminate]="scanStage() === 'analyzing'"
                [style.width.%]="uploadPercent()"
              ></div>
            </div>
          </div>
        }

        <div class="card">
          <label for="jd-edit">Edit the job description</label>
          <textarea
            id="jd-edit"
            rows="16"
            [(ngModel)]="jobDescription"
          ></textarea>
          <p class="hint">
            Tip: paste a different role and click <strong>Re-scan</strong> to
            score the same resume against a new posting.
          </p>
        </div>

        @if (scanError()) {
          <p class="error">{{ scanError() }}</p>
        }
      }

      <div class="actions center">
        <a class="reset-link" (click)="reset()">Start over</a>
      </div>
    }
  `,
  styleUrls: ['./quick-scan.component.css'],
})
export class QuickScanComponent {
  private readonly scannerService = inject(ScannerService);

  protected stepLabels = [
    { num: 1, label: 'Upload Resume' },
    { num: 2, label: 'Add Job' },
    { num: 3, label: 'View Results' },
  ];

  protected step = signal<number>(1);
  protected file = signal<File | null>(null);
  protected fileError = signal<string>('');
  protected isDragging = signal<boolean>(false);
  protected jobDescription = '';
  protected scanning = signal<boolean>(false);
  protected scanError = signal<string>('');
  protected result = signal<ScanResult | null>(null);
  protected tab = signal<'resume' | 'jd'>('resume');

  protected scanStage = signal<ScanStage>('idle');
  protected uploadPercent = signal<number>(0);
  protected jobDescriptionFile = signal<File | null>(null);

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const f = input.files?.[0];
    if (f) this.acceptFile(f);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  protected onDragLeave(): void {
    this.isDragging.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const f = event.dataTransfer?.files?.[0];
    if (f) this.acceptFile(f);
  }

  private acceptFile(f: File): void {
    const allowed = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.tiff'];
    const ok = allowed.some((ext) => f.name.toLowerCase().endsWith(ext));
    if (!ok) {
      this.fileError.set('Please choose a .pdf, .doc, .docx, .png, .jpg, .jpeg, or .tiff file.');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      this.fileError.set('Maximum file size is 5 MB.');
      return;
    }
    this.fileError.set('');
    this.file.set(f);
  }

  protected goToStep2(): void {
    if (this.file()) this.step.set(2);
  }

  /**
   * @param jobFile  optional JD file. When provided, the backend extracts
   *                 the text from it and uses that as the JD (overriding
   *                 the current `jobDescription` string).
   */
  protected runScan(jobFile?: File): void {
    const f = this.file();
    const hasJdSource = !!jobFile || !!this.jobDescription.trim();
    if (!f || !hasJdSource) return;
    this.scanning.set(true);
    this.scanError.set('');
    this.scanStage.set('uploading');
    this.uploadPercent.set(0);

    this.scannerService
      .quickScan(f, this.jobDescription, jobFile)
      .subscribe({
        next: (event) => {
          if (event.type === 'upload') {
            this.scanStage.set('uploading');
            this.uploadPercent.set(event.percent);
          } else if (event.type === 'analyzing') {
            this.scanStage.set('analyzing');
            this.uploadPercent.set(100);
          } else if (event.type === 'done') {
            this.result.set(event.result);
            // If the JD came from a file, the backend extracted text from
            // it — keep that text in sync so the JD tab can show/edit it.
            this.jobDescription = event.result.jobDescription;
            // The file's purpose is over; the extracted text is now the
            // canonical JD. Clear it so the UI shows the text source going
            // forward.
            this.jobDescriptionFile.set(null);
            this.scanning.set(false);
            this.scanStage.set('idle');
            this.uploadPercent.set(0);
            this.step.set(3);
            this.tab.set('resume');
          }
        },
        error: (err) => {
          this.scanError.set(
            err.error?.error || 'Scan failed. Please try again.'
          );
          this.scanning.set(false);
          this.scanStage.set('idle');
          this.uploadPercent.set(0);
        },
      });
  }

  /**
   * Resume Report tab → "Upload new resume" button.
   * Keeps the current JD, swaps the file, and re-scans immediately.
   */
  protected onSwapResume(event: Event): void {
    const input = event.target as HTMLInputElement;
    const f = input.files?.[0];
    input.value = ''; // allow re-selecting the same file later
    if (!f) return;
    this.acceptFile(f);
    if (this.file() && this.jobDescription.trim()) {
      this.runScan();
    }
  }

  /**
   * Resume Report tab → "Upload new JD" button.
   * Keeps the current resume, uploads a JD file, and re-scans immediately.
   * The backend extracts JD text from the file and returns it.
   */
  protected onSwapJobFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;

    const allowed = ['.pdf', '.doc', '.docx', '.txt'];
    const ok = allowed.some((ext) => f.name.toLowerCase().endsWith(ext));
    if (!ok) {
      this.scanError.set('JD must be a .pdf, .doc, .docx, or .txt file.');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      this.scanError.set('JD file is too large (max 5 MB).');
      return;
    }
    if (!this.file()) return;

    this.runScan(f);
  }

  /**
   * Job Description tab → "Re-scan" button.
   * Keeps the current resume, runs a new scan with the edited JD.
   */
  protected rescanWithEditedJd(): void {
    if (!this.file() || !this.jobDescription.trim()) return;
    this.runScan();
  }

  /** Step 2 → user picked a JD file to use instead of pasting text. */
  protected onSelectJobFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;

    const allowed = ['.pdf', '.doc', '.docx', '.txt'];
    const ok = allowed.some((ext) => f.name.toLowerCase().endsWith(ext));
    if (!ok) {
      this.scanError.set('JD must be a .pdf, .doc, .docx, or .txt file.');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      this.scanError.set('JD file is too large (max 5 MB).');
      return;
    }
    this.scanError.set('');
    this.jobDescriptionFile.set(f);
  }

  protected clearJobFile(): void {
    this.jobDescriptionFile.set(null);
  }

  /** Whether there's *some* JD source (pasted text OR uploaded file). */
  protected hasJdSource(): boolean {
    return !!this.jobDescriptionFile() || !!this.jobDescription.trim();
  }

  /** Step 2 → "Check score". Uses the uploaded JD file if present. */
  protected runStep2Scan(): void {
    const jf = this.jobDescriptionFile();
    if (jf) {
      this.runScan(jf);
    } else if (this.jobDescription.trim()) {
      this.runScan();
    }
  }

  protected reset(): void {
    this.step.set(1);
    this.file.set(null);
    this.jobDescription = '';
    this.jobDescriptionFile.set(null);
    this.result.set(null);
    this.scanError.set('');
    this.fileError.set('');
    this.tab.set('resume');
  }

  protected scoreTier(score: number): 'high' | 'mid' | 'low' {
    if (score >= 75) return 'high';
    if (score >= 50) return 'mid';
    return 'low';
  }

  /** SVG circle circumference for r=52 → 2 · π · 52 ≈ 326.73 */
  protected readonly gaugeCircumference = 2 * Math.PI * 52;

  /** stroke-dashoffset that "uncovers" the gauge by `score%`. */
  protected gaugeDashOffset(score: number): number {
    const clamped = Math.max(0, Math.min(100, score));
    return this.gaugeCircumference * (1 - clamped / 100);
  }

  /** Picks the right SVG gradient id for the gauge based on the score tier. */
  protected gaugeGradientId(score: number): string {
    const tier = this.scoreTier(score);
    return `gaugeGradient${tier === 'high' ? 'High' : tier === 'mid' ? 'Mid' : 'Low'}`;
  }
}
