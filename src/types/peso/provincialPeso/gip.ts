import type { Database } from '@/types/database.types'

// ─── Database Derived Types ───
export type GipRow = Database['esmdd']['Tables']['gips']['Row']
export type GipInsert = Database['esmdd']['Tables']['gips']['Insert']
export type GipUpdate = Database['esmdd']['Tables']['gips']['Update']

export type GipApplicantRow = Database['esmdd']['Tables']['gip_applicants']['Row']
export type GipApplicantInsert = Database['esmdd']['Tables']['gip_applicants']['Insert']
export type GipApplicantUpdate = Database['esmdd']['Tables']['gip_applicants']['Update']

export type ApplicantRow = Database['applicants']['Tables']['applicants']['Row']
export type BarangayRow = Database['public']['Tables']['barangays']['Row']

// ─── Domain & Enum Types ───
export type GipProgram = 'ALL' | 'PGAS' | 'DOLE'

export type LpiiCategory = 'LOWLAND' | 'UPLAND' | 'WETLAND'

export type GipInternStatus = 'Active' | 'Hired' | 'Resigned' | 'Completed' | 'Pending' | string

export interface GenderDataPoint {
  year: number
  male: number
  female: number
}

export interface LpiiDataPoint {
  category: LpiiCategory
  label: string
  count: number
  color: string
  description: string
}

export interface LpiiCategoryConfig {
  label: string
  color: string
  bgClass: string
  textClass: string
  badgeClass: string
}

export interface GipTotals {
  male: number
  female: number
  total: number
}

export interface GipInternRecord {
  id: string
  code: string
  fullName: string
  gender: 'Male' | 'Female' | string
  program: 'PGAS' | 'DOLE'
  municipality: string
  barangay: string
  lpiiTag: LpiiCategory
  assignedOffice: string
  supervisor: string
  course: string
  stipend: string
  batchYear: number
  period: string
  status: GipInternStatus
  contact: string
  rawGip?: Record<string, any> | null
  rawApplication?: Record<string, any> | null
  rawApplicant?: Record<string, any> | null
}

export interface GipApplicantRecord {
  id: string
  code: string
  applicantId: string | null
  fullName: string
  gender: 'Male' | 'Female' | string
  municipality: string
  barangay: string
  lpiiTag: LpiiCategory
  course: string
  batchYear: number
  status: string
  contact: string
  documentsSubmitted: string[]
  remarks: string[]
  createdAt: string
  rawApplication?: Record<string, any> | null
  rawApplicant?: Record<string, any> | null
}

export interface GipJoinedRecord {
  gip: GipRow
  application: GipApplicantRow | null
  applicant: ApplicantRow | null
}

export interface GipFilterState {
  searchQuery: string
  selectedProgram: GipProgram
  selectedLpiiFilter: string
  selectedYearFilter: string
  selectedGenderFilter: string
  selectedStatusFilter: string
}
