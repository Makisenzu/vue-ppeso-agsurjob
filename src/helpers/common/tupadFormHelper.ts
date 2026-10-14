import * as z from 'zod'
import {
  TUPAD_ATTACHMENT_MAX_BYTES,
  TUPAD_ATTACHMENT_MIME_TYPES,
  TUPAD_DOCUMENT_OPTIONS,
  TUPAD_LOCKED_DOCUMENT,
} from '@/types/common/tupad'

/**
 * Monthly income field. Vue's v-model casts `<input type="number">` to a number, and an emptied
 * input gives '' — so both are accepted here and converted with parseTupadIncome on submit.
 */
export const tupadIncomeSchema = z
  .union([z.number(), z.string().trim()])
  .refine((v) => v === '' || (Number.isFinite(Number(v)) && Number(v) >= 0), { message: 'Enter a valid amount.' })

/** Income form value → `monthly_income` column (null when left blank). */
export function parseTupadIncome(value: number | string | null | undefined): number | null {
  if (value === '' || value === null || value === undefined) return null
  return Number(value)
}

/** `doc_submitted` field: NSRP Form is always included. */
export const tupadDocumentsSchema = z
  .array(z.string())
  .refine((docs) => docs.includes(TUPAD_LOCKED_DOCUMENT), { message: `${TUPAD_LOCKED_DOCUMENT} must be included.` })

/** Saved checklist with NSRP Form always on it. */
export function withLockedTupadDocument(docs: readonly string[] | null | undefined): string[] {
  return [...new Set([TUPAD_LOCKED_DOCUMENT, ...(docs ?? [])])]
}

/** Adds or removes one document from the checklist value; NSRP Form cannot be removed. */
export function toggleTupadDocument(
  current: readonly string[] | undefined,
  doc: string,
  checked: boolean | 'indeterminate'
): string[] {
  const docs = new Set(current ?? [])
  if (checked === true || doc === TUPAD_LOCKED_DOCUMENT) docs.add(doc)
  else docs.delete(doc)
  return TUPAD_DOCUMENT_OPTIONS.filter((option) => docs.has(option)).concat(
    [...docs].filter((d) => !TUPAD_DOCUMENT_OPTIONS.includes(d))
  )
}

/** Error message when a file cannot be attached to a TUPAD document, else null. */
export function validateTupadAttachment(file: File): string | null {
  if (!(TUPAD_ATTACHMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
    return 'Upload an image (JPG, PNG, WEBP) or a PDF file.'
  }
  if (file.size > TUPAD_ATTACHMENT_MAX_BYTES) {
    return `The file must be ${TUPAD_ATTACHMENT_MAX_BYTES / 1024 / 1024} MB or smaller.`
  }
  return null
}
