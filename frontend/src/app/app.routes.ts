import { Routes } from '@angular/router';

import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'quick-scan',
  },
  {
    // Quick Scan stays public — no login required.
    path: 'quick-scan',
    loadComponent: () =>
      import('./pages/quick-scan/quick-scan.component').then(
        (m) => m.QuickScanComponent
      ),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.component').then(
        (m) => m.RegisterComponent
      ),
  },
  {
    path: 'categories',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/categories/categories.component').then(
        (m) => m.CategoriesComponent
      ),
  },
  {
    path: 'upload',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/upload/upload.component').then((m) => m.UploadComponent),
  },
  {
    path: 'resumes',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/resumes/resumes.component').then(
        (m) => m.ResumesComponent
      ),
  },
  {
    path: 'resumes/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/resume-detail/resume-detail.component').then(
        (m) => m.ResumeDetailComponent
      ),
  },
  { path: '**', redirectTo: 'quick-scan' },
];
