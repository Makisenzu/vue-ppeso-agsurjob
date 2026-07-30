import type { Database } from '@/types/common/database.types'

export type DirectoryCategory = 'applicant' | 'company'

export type CompanyRow = Database['employers']['Tables']['companies']['Row']
export type ApplicantRow = Database['applicants']['Tables']['applicants']['Row']

export interface SubmittedDocument {
  id: number
  name: string
  filename: string | null
  mime_type: string | null
  size: number | null
  path: string | null
  publicUrl: string | null
  status: string | null
  remarks: string | null
  created_at: string | null
}

export type DirectoryProfileRow = Database['core']['Tables']['profiles']['Row'] & {
  email?: string | null
  avatarUrl?: string | null
  category: DirectoryCategory
  companyDetails?: CompanyRow | null
  applicantDetails?: ApplicantRow | null
  documents: SubmittedDocument[]
  documentCount: number
  hasDocuments: boolean
}

export interface SystemDirectoryState {
  records: DirectoryProfileRow[]
  isLoading: boolean
  isSubmitting: boolean
  errorMessage: string | null
  selectedRecord: DirectoryProfileRow | null
  isDetailsOpen: boolean
  isEditStatusOpen: boolean
}
