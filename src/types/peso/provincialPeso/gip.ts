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

export type ApplicantStatus = 'Hired' | 'Pending' | 'Approved' | 'Rejected'

export interface ApplicantStatusDataPoint {
  status: ApplicantStatus
  label: string
  count: number
  color: string
  description: string
}

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

export interface GipAppointmentRecord {
  id: string
  gipId: string
  termNumber: number
  appointmentCode: string
  program: 'PGAS' | 'DOLE'
  assignedOffice: string
  supervisor: string
  dailyStipend: string
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
  status: GipAppointmentStatus
  daysRemaining?: number
  isExpired?: boolean
  isExpiringSoon?: boolean
  decisionNotes?: string | null
  decidedBy?: string | null
  decidedAt?: string | null
  createdAt?: string | null
}

export type GipAppointmentStatus =
  | 'Active'
  | 'Expiring Soon'
  | 'Expired'
  | 'Renewed'
  | 'Completed'
  | 'Terminated'
  | 'Hired'

export interface GipRenewAppointmentPayload {
  gipId: string
  currentAppointmentId?: string
  nextTermNumber: number
  program: 'PGAS' | 'DOLE'
  assignedOffice: string
  supervisor?: string
  stipend: string
  startDate: string
  endDate: string
  remarks?: string
}

export interface GipConcludeAppointmentPayload {
  gipId: string
  appointmentId?: string
  action: 'Completed' | 'Hired' | 'Terminated'
  remarks?: string
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
  documentsSubmitted?: string[]
  currentAppointment?: GipAppointmentRecord | null
  appointmentHistory?: GipAppointmentRecord[]
  appointmentStatus?: GipAppointmentStatus
  daysRemaining?: number
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
  totalPriorityScore?: number | null
  priorityRank?: number | null
  statusScore?: number | null
  academicScore?: number | null
  eligibilityScore?: number | null
  certScore?: number | null
  povertyScore?: number | null
  unemploymentScore?: number | null
  rawApplication?: Record<string, any> | null
  rawApplicant?: Record<string, any> | null
}

export type GipPriorityScoreRow = Database['esmdd']['Views']['gip_applicant_priority_scores']['Row'] & {
  eligibility_score?: number | null
}

export interface GipPriorityApplicantRecord {
  applicantId: string
  gipApplicantId: string
  rank: number
  code: string
  fullName: string
  firstName: string
  surname: string
  middleName?: string | null
  suffix?: string | null
  gender: 'Male' | 'Female' | string
  age: number | null
  municipality: string
  barangay: string
  lpiiTag: LpiiCategory
  course: string
  status: string
  contact: string
  email: string | null
  dateOfBirth?: string | null
  civilStatus?: string | null
  currentlyInSchool?: boolean | null
  unemployedReason?: string | null
  // Sub-scores & Total
  statusScore: number
  academicScore: number
  eligibilityScore: number
  certScore: number
  povertyScore: number
  unemploymentScore: number
  totalPriorityScore: number
  rawScoreRow?: Record<string, any> | null
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
  selectedAppointmentFilter?: string
}

