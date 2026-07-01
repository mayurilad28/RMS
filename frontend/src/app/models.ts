export interface Category {
  _id: string;
  name: string;
  description?: string;
  resumeCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Resume {
  _id: string;
  category: Category | string;
  originalName: string;
  storedName: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  candidateName: string;
  email: string;
  phone: string;
  location: string;
  skills: string[];
  experienceYears: number;
  rawText?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeFilters {
  categoryId?: string;
  skills?: string;
  minExperience?: number;
  location?: string;
  q?: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
