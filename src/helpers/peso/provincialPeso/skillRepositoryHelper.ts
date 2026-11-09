import type { LpiiCategory } from '@/types/peso/provincialPeso/skillRepository'

// Skill extraction, cleaning, categories, LPII barangay matching and the counts now run in the
// database (migration 110: applicants.sr_clean_skill, sr_categorize_skill, sr_barangay_tag, …).
// Keep these display helpers in step with sr_normalize_geo / sr_normalize_barangay there.

// ─── Text Normalization & Matching ───

export function normalizeText(value?: string | null): string {
  return value?.trim().toLowerCase() ?? ''
}

export function normalizeGeographicLabel(value?: string | null): string {
  const normalized = normalizeText(value)
  return normalized
    .replace(/^city of\s+/i, '')
    .replace(/^municipality of\s+/i, '')
    .replace(/^municipality\s+/i, '')
    .replace(/^city\s+/i, '')
    .replace(/\s+city$/i, '')
    .trim()
}

export function matchesGeographicLabel(left?: string | null, right?: string | null): boolean {
  return normalizeGeographicLabel(left) === normalizeGeographicLabel(right)
}

export function normalizeBarangayName(value?: string | null): string {
  const normalized = normalizeText(value)
  return normalized
    .replace(/\s+barangay$/i, '')
    .replace(/^barangay\s+/i, '')
    .replace(/\s+brgy\.?$/i, '')
    .replace(/^brgy\.?\s+/i, '')
    .replace(/\s+puroks?$/i, '')
    .replace(/\s+sitio\s+/i, ' ')
    .trim()
}

// ─── LPII Badge Props Helper ───

export interface LpiiBadgeProps {
  class: string
  label: string
}

export function getLpiiBadgeProps(tag?: LpiiCategory | null): LpiiBadgeProps {
  switch (tag) {
    case 'UPLAND':
      return {
        class: 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-500/30',
        label: 'Upland',
      }
    case 'WETLAND':
      return {
        class: 'bg-sky-500/10 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 border-sky-500/30',
        label: 'Wetland',
      }
    case 'LOWLAND':
      return {
        class: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-500/30',
        label: 'Lowland',
      }
    default:
      return {
        class: 'bg-muted text-muted-foreground border-border/50',
        label: 'External (N/A)',
      }
  }
}
