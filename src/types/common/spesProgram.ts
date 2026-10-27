// Content of the SPES program page (public /spes and the applicant's SPES page), like gipProgram.ts
import type { SpesDocumentKey } from '@/types/common/spesForm'

export const SPES_HERO = {
  eyebrow: 'Special Program for Employment of Students',
  title: 'Earn during your school break with SPES',
  description: 'For students aged 15 to 30 who live in Agusan del Sur and come from low-income families.',
}

export const SPES_ABOUT = {
  title: 'What is SPES?',
  definition:
    'The Special Program for Employment of Students (SPES) gives students and out-of-school youth paid work during school breaks, so they can earn for their schooling.',
  purpose:
    'PESO Agusan del Sur runs SPES with the Department of Labor and Employment (DOLE). Beneficiaries are drawn per municipality and work for 10 or 20 days.',
}

export const SPES_FACTS: readonly { label: string; value: string }[] = [
  { label: 'Age', value: '15 to 30 years old' },
  { label: 'Who', value: 'Students, ALS students and out-of-school youth' },
  { label: 'Work period', value: '10 or 20 days' },
]

/**
 * Profile document types attached automatically to the SPES requirement that means the same thing
 * (BACKEND.md §18). Exact types only; anything else can still be picked from "My documents".
 */
export const SPES_PROFILE_DOCUMENT_MATCHES: Partial<Record<SpesDocumentKey, readonly string[]>> = {
  has_resume: ['Resume'],
  has_birth_certificate: ['Birth Certificate'],
}
