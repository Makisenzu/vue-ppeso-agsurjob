export type GipProgram = 'ALL' | 'PGAS' | 'DOLE'

export type LpiiCategory = 'LOWLAND' | 'UPLAND' | 'WETLAND'

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

export type GipInternStatus = 'Active' | 'Hired' | 'Resigned'

export interface GipInternRecord {
  id: string
  code: string
  fullName: string
  gender: 'Male' | 'Female'
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
}

export interface GipFilterState {
  searchQuery: string
  selectedProgram: GipProgram
  selectedLpiiFilter: string
  selectedYearFilter: string
  selectedGenderFilter: string
  selectedStatusFilter: string
}
