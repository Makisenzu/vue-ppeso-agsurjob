import { GIP_ATTACHMENT_MAX_BYTES, GIP_ATTACHMENT_MIME_TYPES } from '@/types/common/gipProgram'
import { formatNsrpDate, formatProfileLocation } from '@/helpers/applicant/nsrpDisplayHelper'

// Older GIP records use longer labels; map them onto the review checklist names (same rule as useGipEditApplicant.ts)
export function normalizeGipDocumentName(doc: string): string {
  const trimmed = doc.trim()
  const upper = trimmed.toUpperCase()
  if (upper.startsWith('NSRP')) return 'NSRP'
  if (upper.startsWith('RESUME')) return 'Resume'
  return trimmed
}

/** Status of a GIP application as shown to the applicant; Deployed / Hired both read as Hired. */
export function normalizeGipStatus(status: string | null | undefined): string {
  const value = (status ?? '').trim()
  if (!value) return 'Pending'
  if (value.toLowerCase() === 'deployed') return 'Hired'
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

/** Error message for a soft copy that can't be uploaded, or null when it is fine. */
export function validateGipAttachment(file: File): string | null {
  if (!(GIP_ATTACHMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
    return 'Upload a PDF file.'
  }
  if (file.size > GIP_ATTACHMENT_MAX_BYTES) {
    return `The file must be ${GIP_ATTACHMENT_MAX_BYTES / 1024 / 1024} MB or smaller.`
  }
  return null
}

/** Reference number PESO sees in GIP Applicants (same formula as mapToGipApplicantRecord in gipHelper.ts). */
export function gipApplicationCode(applicationId: string, createdAt: string | null | undefined): string {
  const year = (createdAt ? new Date(createdAt).getFullYear() : NaN) || new Date().getFullYear()
  return `GIP-APP-${year}-${applicationId.slice(0, 4).toUpperCase()}`
}

/** How the application came in, from the notes the RPC / PESO referral write to gip_applicants.remarks. */
export function gipApplicationSource(remarks: readonly string[] | null | undefined): string {
  const notes = (remarks ?? []).join(' ').toLowerCase()
  if (notes.includes('online')) return 'Online, through AGSURJOBS'
  if (notes.includes('referred')) return 'Referred by PESO'
  return 'PESO office'
}

/** Latest course (or level) from the NSRP educational background; '' when none. */
export function latestGipCourse(educationalBackground: unknown): string {
  if (Array.isArray(educationalBackground) && educationalBackground.length > 0) {
    const latest = educationalBackground[educationalBackground.length - 1] as Record<string, unknown>
    const value = latest?.course || latest?.level
    return typeof value === 'string' ? value : ''
  }
  if (educationalBackground && typeof educationalBackground === 'object') {
    const course = (educationalBackground as Record<string, unknown>).course
    return typeof course === 'string' ? course : ''
  }
  return ''
}

/** "Oct 26, 2026, 9:09 PM"; '—' when missing. */
export function formatGipDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/**
 * Fields of the applicant's NSRP record (applicants.applicants) shown on their GIP application.
 * Json columns are `unknown`: comparing the generated Json type against a reactive copy trips TS2589.
 */
export interface GipApplicantSummarySource {
  first_name: string
  middle_name: string | null
  surname: string
  suffix: string | null
  sex: string | null
  date_of_birth: string
  contact_numbers: string[] | null
  email: string | null
  address: unknown
  educational_background: unknown
}

/** The applicant's details shown on their GIP application, label → value; blank values are left out. */
export function describeGipApplicant(record: GipApplicantSummarySource): { label: string; value: string }[] {
  const name = [record.first_name, record.middle_name, record.surname, record.suffix].filter(Boolean).join(' ')
  const details = [
    { label: 'Full name', value: name },
    { label: 'Sex', value: record.sex ?? '' },
    { label: 'Date of birth', value: formatNsrpDate(record.date_of_birth) },
    { label: 'Contact number', value: record.contact_numbers?.[0] ?? '' },
    { label: 'Email', value: record.email ?? '' },
    { label: 'Address', value: formatProfileLocation(record.address) },
    { label: 'Course / education', value: latestGipCourse(record.educational_background) },
  ]
  return details.filter((detail) => detail.value)
}
