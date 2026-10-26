// Content of the GIP program page (public /gip and the applicant's GIP page)

export interface GipProgramFact {
  label: string
  value: string
}

export const GIP_HERO = {
  eyebrow: 'Government Internship Program',
  title: 'Start your career in public service through GIP',
  description: 'Open to 18 to 30 year olds who finished at least high school or a tech-voc course.',
}

export const GIP_ABOUT = {
  title: 'What is GIP?',
  definition:
    'The Government Internship Program (GIP) gives young Agsurnons their first work experience in public service. Interns are assigned to a government office, learn on the job under a supervisor, and receive a daily stipend for each term.',
  purpose:
    'PESO Agusan del Sur runs GIP with the Department of Labor and Employment (DOLE) and the Provincial Government of Agusan del Sur (PGAS), so interns may serve in national or provincial offices.',
}

export const GIP_FACTS: readonly GipProgramFact[] = [
  { label: 'Age', value: '18 to 30 years old' },
  { label: 'Education', value: 'At least high school or a tech-voc course' },
  { label: 'Programs', value: 'DOLE and PGAS' },
]

// Same checklist PESO ticks when reviewing a GIP applicant (DOCUMENT_OPTIONS in useApplicantNewEntry.ts)
export const GIP_REQUIRED_DOCUMENTS: readonly string[] = [
  'NSRP',
  'Resume',
  'Application Letter',
  'TOR/Form 137/Form 138/Diploma',
  'Certificates',
]

/** NSRP Form 1: generated from the applicant's registry record and attached as a PDF, not picked from files. */
export const GIP_NSRP_DOCUMENT = 'NSRP'

/** Soft copies attached to the application, NSRP included (CHECK in migrations 060 / 061). */
export const GIP_UPLOAD_DOCUMENTS: readonly string[] = GIP_REQUIRED_DOCUMENTS

/** Training / award certificates: not everyone has one, so applying doesn't wait for it. */
export const GIP_OPTIONAL_DOCUMENTS: readonly string[] = ['Certificates']

// Every requirement is a PDF (CHECK in migration 061)
export const GIP_ATTACHMENT_MIME_TYPES = ['application/pdf'] as const
export const GIP_ATTACHMENT_ACCEPT = 'application/pdf,.pdf'
export const GIP_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024

/**
 * `esmdd.gip_applicant_documents` (migration 060) — the soft copy of a required document.
 * Declared here until `npm run types:gen` is re-run against the migrated database.
 */
export interface GipApplicantDocumentRow {
  id: string
  gip_applicant_id: string
  document_name: string
  file_name: string
  path: string
  mime_type: string | null
  size: number | null
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

export type GipApplicantDocument = GipApplicantDocumentRow & { url: string | null }

/** Saved files per document name. */
export type GipApplicantDocumentMap = Partial<Record<string, GipApplicantDocument>>

/** Files picked but not uploaded yet, per document name. */
export type GipPendingDocumentMap = Partial<Record<string, File>>
