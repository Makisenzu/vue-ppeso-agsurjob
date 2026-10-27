// Content of the TUPAD program page (public /tupad and the applicant's TUPAD page), like gipProgram.ts
import type { ReusableProfileDocument } from '@/helpers/applicant/applicantRequirementDocuments'
import { TUPAD_DOCUMENT_OPTIONS, TUPAD_LOCKED_DOCUMENT } from '@/types/common/tupad'

export const TUPAD_HERO = {
  eyebrow: 'Tulong Panghanapbuhay sa Ating Disadvantaged/Displaced Workers',
  title: 'Short-term work for displaced and disadvantaged workers',
  description: 'For Agsurnons 18 and older who lost their work or earn too little to get by.',
}

export const TUPAD_ABOUT = {
  title: 'What is TUPAD?',
  definition:
    'TUPAD is a community-based emergency employment program. Beneficiaries do short-term community work, like cleaning, repairs or tree planting, and are paid the minimum wage for each day worked.',
  purpose:
    'PESO Agusan del Sur runs TUPAD with the Department of Labor and Employment (DOLE). Approved applicants are grouped into batches, each with its own work period.',
}

export const TUPAD_FACTS: readonly { label: string; value: string }[] = [
  { label: 'Age', value: '18 years old and above' },
  { label: 'Who', value: 'Displaced, underemployed and seasonal workers' },
  { label: 'Pay', value: 'Minimum wage per day worked' },
]

/** Generated from the registry record, never uploaded by hand (BACKEND.md §18) */
export const TUPAD_NSRP_DOCUMENT = TUPAD_LOCKED_DOCUMENT

/** Generated like NSRP (tupadProfilingFormHelper.ts), from the registry record and the household details */
export const TUPAD_PROFILING_FORM_DOCUMENT = 'TUPAD Form'

/** Every TUPAD requirement with what it is; names follow TUPAD_DOCUMENT_OPTIONS (migrations 022 / 023) */
export const TUPAD_REQUIREMENTS: readonly { name: string; hint: string }[] = TUPAD_DOCUMENT_OPTIONS.map((name) => ({
  name,
  hint:
    {
      'NSRP Form': 'Generated from your profile when you apply',
      'Valid ID': 'Any government-issued ID with your photo',
      'TUPAD Form': 'Generated from your profile and household details',
    }[name] ?? '',
}))

/**
 * Profile document types attached automatically to the TUPAD requirement that means the same thing
 * (BACKEND.md §18). No profile document type is a valid ID yet, so it is picked by hand ("My documents"
 * or Upload); the TUPAD form is generated.
 */
export const TUPAD_PROFILE_DOCUMENT_MATCHES: Partial<Record<string, readonly string[]>> = {}

/** Profile documents chosen for a requirement, copied into the application on submit */
export type TupadReusedDocumentMap = Partial<Record<string, ReusableProfileDocument>>
