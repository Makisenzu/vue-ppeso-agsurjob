// ==============================================================================
// Types: ocrVision.ts
// Description: Type definitions for Gemini Vision OCR form extraction
// ==============================================================================

export interface FormAddress {
  houseStreet: string | null
  barangay: string | null
  municipality: string | null
  province: string | null
}

export interface FormPersonalInfo {
  surname: string | null
  firstName: string | null
  middleName: string | null
  suffix: string | null
  sex: 'Male' | 'Female' | string | null
  dateOfBirth: string | null
  age: number | null
  civilStatus: string | null
  religion: string | null
  tin: string | null
  sss: string | null
  philhealth: string | null
  contactNumber: string | null
  email: string | null
  address: FormAddress
}

export interface FormEducation {
  educationalLevel: string | null
  course: string | null
  school: string | null
  yearGraduated: string | null
}

export interface FormWorkExperience {
  jobTitle: string
  company: string
  duration: string
  description: string
}

export interface FormOtherDetails {
  is4ps: boolean | null
  hasDisability: boolean | null
  employmentStatus: string | null
  preferredOccupations: string[]
}

export interface ApplicantFormOcrData {
  personalInfo: FormPersonalInfo
  education: FormEducation
  workExperience: FormWorkExperience[]
  skills: string[]
  otherDetails: FormOtherDetails
  confidenceScore?: number
  extractedNotes?: string | null
}

export interface OcrProcessResponse {
  success: boolean
  data?: ApplicantFormOcrData
  form_id?: string | null
  metadata?: {
    file_path?: string | null
    model?: string
    processed_at?: string
  }
  error?: string
}

export type OcrStage = 'idle' | 'reading_file' | 'uploading_storage' | 'gemini_vision_processing' | 'completed' | 'error'

export interface OcrState {
  stage: OcrStage
  isUploading: boolean
  isExtracting: boolean
  progressPercent: number
  statusMessage: string
  errorMessage: string | null
}
