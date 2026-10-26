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
