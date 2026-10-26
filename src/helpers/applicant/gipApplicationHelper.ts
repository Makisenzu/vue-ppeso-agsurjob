import { GIP_ATTACHMENT_MAX_BYTES, GIP_ATTACHMENT_MIME_TYPES } from '@/types/common/gipProgram'

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
    return 'Upload an image (JPG, PNG, WEBP) or a PDF file.'
  }
  if (file.size > GIP_ATTACHMENT_MAX_BYTES) {
    return `The file must be ${GIP_ATTACHMENT_MAX_BYTES / 1024 / 1024} MB or smaller.`
  }
  return null
}
