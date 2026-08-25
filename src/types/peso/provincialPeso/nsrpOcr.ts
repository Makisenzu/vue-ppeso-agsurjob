import type { LpiiCategory } from '@/types/peso/provincialPeso/gip'

export interface NsrpParsedApplicant {
  id?: string
  surname: string
  firstName: string
  middleName: string
  suffix: string
  sex: 'Male' | 'Female' | string
  dateOfBirth: string
  age: number | null
  civilStatus: string
  religion: string
  tin: string
  houseStreet: string
  barangay: string
  municipality: string
  province: string
  contactNumber: string
  email: string
  educationalLevel: string
  course: string
  yearGraduated: string
  lpiiTag: LpiiCategory
  batchYear: number
  documentsSubmitted: string[]
  employmentStatus: string
  is4ps: boolean
  hasDisability: boolean
  skills: string[]
  sourceFile?: string
  pageRange?: string
  rawOcrText?: string
  validationErrors?: string[]
  isValid?: boolean
}

export interface OcrProgressState {
  isProcessing: boolean
  stage: 'idle' | 'reading_pdf' | 'rendering_pages' | 'ocr_running' | 'parsing_fields' | 'completed' | 'error'
  currentPage: number
  totalPages: number
  progressPercent: number
  statusMessage: string
  detectedApplicantsCount: number
}

export interface BatchUploadResult {
  totalProcessed: number
  successCount: number
  failedCount: number
  errors: string[]
}
