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
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
    @if (step() === 3 && result(); as r) {
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
            <h3>Suggestions</h3>
            <ul class="tips">
              @for (s of r.match.suggestions; track s) {
                <li>{{ s }}</li>
              }
            </ul>
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
  styles: [
    `
      :host {
        /* local design tokens — easy to tweak in one place */
        --coral-50:  #faf4f3;
        --coral-100: #fce0de;
        --coral-200: #fbcfcd;
        --coral-300: #ff8c87;
        --coral-400: #ff7672;
        --coral-500: #ff5e59;
        --coral-600: #ed4a45;
        --coral-700: #d63b37;
        --slate-50:  #f8fafc;
        --slate-100: #f1f5f9;
        --slate-200: #e2e8f0;
        --slate-300: #cbd5e1;
        --slate-400: #94a3b8;
        --slate-500: #64748b;
        --slate-600: #475569;
        --slate-700: #334155;
        --slate-900: #0f172a;
        --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06);
        --shadow-md: 0 4px 12px rgba(15, 23, 42, 0.08);
        --radius: 12px;
      }

      :host .card {
        background: #fff;
        border: 1px solid var(--slate-200);
        border-radius: var(--radius);
        padding: 1.25rem;
        box-shadow: var(--shadow-sm);
      }

      /* Hero */
      .hero {
        text-align: center;
        margin-bottom: 2rem;
        padding-top: 0.5rem;
      }
      .hero h1 {
        margin: 0;
        font-size: 2.1rem;
        font-weight: 700;
        letter-spacing: -0.02em;
        background: linear-gradient(120deg, #1e293b 30%, var(--coral-600) 90%);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
      .subtitle {
        color: var(--slate-500);
        margin: 0.6rem 0 0;
        font-size: 1rem;
      }
      .accent {
        background: linear-gradient(120deg, var(--coral-500), var(--coral-700));
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        font-weight: 700;
        font-size: 1.15em;
      }

      /* Stepper */
      .stepper {
        list-style: none;
        display: flex;
        justify-content: center;
        gap: 0;
        padding: 0;
        margin: 2rem auto 2.25rem;
        max-width: 480px;
      }
      .stepper li {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1;
        position: relative;
        color: var(--slate-400);
        transition: color 0.2s ease;
      }
      .stepper li:not(:last-child)::after {
        content: '';
        position: absolute;
        top: 17px;
        left: calc(50% + 22px);
        right: calc(-50% + 22px);
        height: 2px;
        background: var(--slate-200);
        z-index: 0;
        transition: background 0.3s ease;
      }
      .stepper li.done:not(:last-child)::after {
        background: linear-gradient(90deg, var(--coral-500), var(--coral-600));
      }
      .circle {
        width: 36px;
        height: 36px;
        border-radius: 999px;
        border: 2px solid var(--slate-200);
        background: #fff;
        display: grid;
        place-items: center;
        font-weight: 600;
        font-size: 0.9rem;
        z-index: 1;
        color: var(--slate-400);
        transition: all 0.25s ease;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
      }
      .stepper li.active .circle {
        background: linear-gradient(135deg, var(--coral-500), var(--coral-600));
        color: #fff;
        border-color: var(--coral-600);
        transform: scale(1.08);
        box-shadow: 0 6px 16px rgba(255, 94, 89, 0.35);
      }
      .stepper li.done .circle {
        background: linear-gradient(135deg, var(--coral-500), var(--coral-600));
        color: #fff;
        border-color: var(--coral-600);
      }
      .stepper li.active,
      .stepper li.done {
        color: var(--slate-900);
      }
      .label {
        margin-top: 0.55rem;
        font-size: 0.85rem;
        font-weight: 500;
      }

      /* Dropzone */
      .dropzone {
        border: 2px dashed var(--slate-300);
        border-radius: 16px;
        padding: 3rem 1.5rem;
        text-align: center;
        background: #fff;
        transition: all 0.2s ease;
        cursor: default;
      }
      .dropzone:hover {
        border-color: var(--coral-500);
        background: var(--coral-50);
      }
      .dropzone.dragging {
        border-color: var(--coral-600);
        background: var(--coral-50);
        transform: scale(1.005);
        box-shadow: var(--shadow-md);
      }
      .icon {
        margin-bottom: 1rem;
      }
      .drop-text {
        font-size: 1.05rem;
        margin: 0;
        color: var(--slate-700);
        font-weight: 500;
      }
      .choose span {
        color: var(--coral-600);
        text-decoration: underline;
        text-underline-offset: 2px;
        cursor: pointer;
        font-weight: 600;
      }
      .choose span:hover {
        color: var(--coral-700);
      }
      .hint {
        color: var(--slate-400);
        font-size: 0.85rem;
        margin: 0.5rem 0 0;
      }
      .selected {
        margin-top: 1rem;
        color: var(--slate-900);
        font-size: 0.95rem;
      }

      /* Step 2 textarea */
      textarea {
        width: 100%;
        font-family: inherit;
        resize: vertical;
        font-size: 0.95rem;
        line-height: 1.55;
      }
      textarea:disabled {
        background: var(--slate-100);
        color: var(--slate-400);
        cursor: not-allowed;
      }
      .jd-upload-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
        margin-bottom: 1rem;
      }
      .jd-file-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background: #ecfdf5;
        color: #065f46;
        padding: 0.4rem 0.85rem;
        border-radius: 999px;
        font-size: 0.85rem;
        border: 1px solid #a7f3d0;
      }
      .remove-link {
        color: #b91c1c;
        text-decoration: underline;
        cursor: pointer;
        font-size: 0.8rem;
      }
      .or-divider {
        position: relative;
        text-align: center;
        margin: 1.25rem 0;
        color: var(--slate-400);
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 500;
      }
      .or-divider span {
        background: #fff;
        padding: 0 0.75rem;
        position: relative;
        z-index: 1;
      }
      .or-divider::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 1px;
        background: var(--slate-200);
      }

      /* Actions */
      .actions {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
        margin-top: 1.5rem;
      }
      .actions.center {
        justify-content: center;
      }

      /* Tabs */
      .tab-bar {
        display: grid;
        grid-template-columns: 1fr 1fr;
        background: var(--slate-100);
        border-radius: 12px;
        padding: 5px;
        gap: 4px;
        margin-bottom: 1.25rem;
        border: 1px solid var(--slate-200);
      }
      .tab {
        background: transparent;
        color: var(--slate-500);
        border: none;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        font-weight: 500;
        font-size: 0.95rem;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .tab:hover {
        color: var(--slate-900);
      }
      .tab.active {
        background: #fff;
        color: var(--slate-900);
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
        font-weight: 600;
      }

      .status-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        background: linear-gradient(90deg, #ecfdf5, #f0fdf4);
        border: 1px solid #a7f3d0;
        border-radius: 12px;
        padding: 0.85rem 1.15rem;
        margin-bottom: 1.25rem;
      }
      .status-left {
        display: flex;
        align-items: center;
        gap: 0.85rem;
      }
      .status-left .check {
        width: 26px;
        height: 26px;
        border-radius: 999px;
        background: linear-gradient(135deg, #10b981, #16a34a);
        color: #fff;
        display: grid;
        place-items: center;
        font-size: 0.85rem;
        font-weight: 700;
        flex-shrink: 0;
        box-shadow: 0 2px 6px rgba(22, 163, 74, 0.3);
      }
      .status-left strong {
        display: block;
        color: #064e3b;
        font-size: 0.95rem;
      }
      .status-left .muted.small {
        color: #047857;
        font-size: 0.8rem;
      }
      .tip-pill {
        background: #dcfce7;
        color: #166534;
        font-size: 0.8rem;
        padding: 0.4rem 0.85rem;
        border-radius: 999px;
        font-weight: 500;
        white-space: nowrap;
        border: 1px solid #86efac;
      }

      .swap-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1.25rem;
        flex-wrap: wrap;
      }
      .swap-bar .small {
        font-size: 0.85rem;
      }
      .swap-actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        align-items: center;
      }
      .swap-btn {
        cursor: pointer;
      }
      .swap-btn span {
        display: inline-block;
        padding: 0.6rem 1.1rem;
        border-radius: 10px;
        background: linear-gradient(135deg, var(--coral-500), var(--coral-600));
        color: #fff;
        font-size: 0.9rem;
        font-weight: 500;
        transition: all 0.15s ease;
        box-shadow: 0 1px 3px rgba(255, 94, 89, 0.3);
      }
      .swap-btn:hover span {
        box-shadow: 0 6px 16px rgba(255, 94, 89, 0.4);
        transform: translateY(-1px);
      }
      .swap-btn.secondary span {
        background: var(--slate-100);
        color: var(--slate-900);
        box-shadow: none;
        border: 1px solid var(--slate-200);
      }
      .swap-btn.secondary:hover span {
        background: var(--slate-200);
        box-shadow: 0 2px 6px rgba(15, 23, 42, 0.06);
      }
      .swap-btn input:disabled + span {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none !important;
        box-shadow: none !important;
      }
      .swap-btn-text {
        background: transparent;
        color: var(--coral-600);
        border: none;
        padding: 0.55rem 0.5rem;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
      }
      .swap-btn-text:hover:not(:disabled) {
        color: var(--coral-700);
        text-decoration: underline;
        text-underline-offset: 3px;
      }
      .swap-btn-text:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .reset-link {
        color: var(--slate-500);
        text-decoration: underline;
        text-underline-offset: 2px;
        cursor: pointer;
        font-size: 0.9rem;
      }
      .reset-link:hover {
        color: var(--slate-700);
      }

      /* Progress card */
      .progress-card {
        background: linear-gradient(135deg, var(--coral-50), #fff5f4);
        border: 1px solid var(--coral-100);
        margin: 1.25rem 0;
      }
      .progress-head {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        color: var(--coral-700);
      }
      .progress-head strong {
        flex: 1;
        font-size: 0.95rem;
      }
      .progress-percent {
        font-variant-numeric: tabular-nums;
        color: var(--coral-600);
        font-weight: 600;
        font-size: 0.95rem;
      }
      .progress-bar {
        margin-top: 0.7rem;
        height: 8px;
        border-radius: 999px;
        background: var(--coral-100);
        overflow: hidden;
      }
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--coral-400), var(--coral-600));
        border-radius: 999px;
        transition: width 0.2s ease-out;
      }
      .progress-fill.indeterminate {
        width: 100% !important;
        background: linear-gradient(
          90deg,
          var(--coral-100) 0%,
          var(--coral-500) 50%,
          var(--coral-100) 100%
        );
        background-size: 200% 100%;
        animation: shimmer 1.2s linear infinite;
      }
      @keyframes shimmer {
        from { background-position: 200% 0; }
        to   { background-position: -200% 0; }
      }
      .progress-hint {
        margin-top: 0.55rem;
      }
      .spinner {
        width: 14px;
        height: 14px;
        border-radius: 999px;
        border: 2px solid var(--coral-200);
        border-top-color: var(--coral-600);
        animation: spin 0.7s linear infinite;
        display: inline-block;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      /* ===== Result grid ===== */
      .result-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.25rem;
      }
      .result-grid .card {
        transition: box-shadow 0.2s ease, transform 0.2s ease;
      }
      .result-grid .card:hover {
        box-shadow: var(--shadow-md);
      }
      .result-grid h3 {
        margin: 0 0 0.75rem;
        font-size: 0.95rem;
        font-weight: 600;
        color: var(--slate-900);
        display: flex;
        align-items: center;
        gap: 0.4rem;
      }

      /* ===== Score card with circular gauge ===== */
      .score-card {
        grid-column: 1 / -1;
        text-align: center;
        background: linear-gradient(135deg, #ffffff, var(--slate-50));
        padding: 2rem 1.5rem;
      }
      .score-card[data-tier='high'] {
        background: linear-gradient(135deg, #ffffff, #f0fdf4);
      }
      .score-card[data-tier='mid'] {
        background: linear-gradient(135deg, #ffffff, #fffbeb);
      }
      .score-card[data-tier='low'] {
        background: linear-gradient(135deg, #ffffff, #fef2f2);
      }
      .score-gauge {
        position: relative;
        width: 200px;
        height: 200px;
        margin: 0 auto 1.5rem;
      }
      .gauge-svg {
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
        filter: drop-shadow(0 4px 8px rgba(255, 94, 89, 0.2));
      }
      .gauge-bg {
        fill: none;
        stroke: var(--slate-100);
        stroke-width: 12;
      }
      .gauge-fill {
        fill: none;
        stroke-width: 12;
        stroke-linecap: round;
        transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .gauge-text {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      }
      .gauge-percent {
        font-size: 3rem;
        font-weight: 700;
        line-height: 1;
        color: var(--slate-900);
        letter-spacing: -0.02em;
        font-variant-numeric: tabular-nums;
      }
      .gauge-percent span {
        font-size: 1.3rem;
        color: var(--slate-400);
        font-weight: 600;
        margin-left: 2px;
      }
      .gauge-label {
        color: var(--slate-500);
        margin-top: 0.25rem;
        font-size: 0.85rem;
        font-weight: 500;
        letter-spacing: 0.02em;
        text-transform: uppercase;
      }

      /* Sub-score mini progress bars */
      .breakdown-modern {
        display: grid;
        gap: 0.85rem;
        margin-top: 1rem;
        max-width: 480px;
        margin-left: auto;
        margin-right: auto;
      }
      .sub-head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 0.35rem;
        font-size: 0.85rem;
        color: var(--slate-600);
      }
      .sub-head strong {
        color: var(--slate-900);
        font-variant-numeric: tabular-nums;
      }
      .sub-bar {
        height: 6px;
        border-radius: 999px;
        background: var(--slate-100);
        overflow: hidden;
      }
      .sub-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--coral-400), var(--coral-600));
        border-radius: 999px;
        transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
      }
      [data-tier='high'] .sub-fill {
        background: linear-gradient(90deg, #10b981, #22c55e);
      }
      [data-tier='mid'] .sub-fill {
        background: linear-gradient(90deg, #f59e0b, #facc15);
      }
      [data-tier='low'] .sub-fill {
        background: linear-gradient(90deg, #ef4444, #f87171);
      }

      /* ===== Badges ===== */
      :host .badge {
        display: inline-block;
        padding: 0.3rem 0.7rem;
        border-radius: 999px;
        font-size: 0.78rem;
        margin: 0.18rem;
        font-weight: 500;
      }
      .badge.ok {
        background: #dcfce7;
        color: #166534;
        border: 1px solid #86efac;
      }
      .badge.miss {
        background: #fee2e2;
        color: #991b1b;
        border: 1px solid #fca5a5;
      }
      .badge.soft-miss {
        background: #fef9c3;
        color: #854d0e;
        border: 1px solid #fde68a;
      }

      .ok-text {
        color: #16a34a;
        font-weight: 500;
      }
      .miss-text {
        color: #dc2626;
        font-weight: 500;
      }

      .tips {
        margin: 0.5rem 0 0;
        padding-left: 1.25rem;
        color: var(--slate-700);
      }
      .tips li {
        margin: 0.45rem 0;
        line-height: 1.5;
      }

      .muted {
        color: var(--slate-400);
      }
      .error {
        color: #dc2626;
        background: #fef2f2;
        border: 1px solid #fecaca;
        padding: 0.6rem 0.85rem;
        border-radius: 8px;
        margin: 0.75rem 0 0;
        font-size: 0.9rem;
      }
    `,
  ],
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
    const allowed = ['.pdf', '.doc', '.docx'];
    const ok = allowed.some((ext) => f.name.toLowerCase().endsWith(ext));
    if (!ok) {
      this.fileError.set('Please choose a .pdf, .doc, or .docx file.');
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
