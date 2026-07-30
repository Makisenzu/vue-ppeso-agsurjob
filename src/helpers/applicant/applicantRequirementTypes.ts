export const APPLICANT_REQUIREMENT_TYPE = 'applicant_requirements'
export const LEGACY_APPLICANT_REQUIREMENT_TYPES = ['applicant_requirements', 'applicant_requirement'] as const

export function normalizeRequirementTypeValue(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
}

export function isApplicantRequirementType(value: string | null | undefined) {
  const normalized = normalizeRequirementTypeValue(value)
  return normalized === 'applicantrequirements' || normalized === 'applicantrequirement'
}

export function getApplicantRequirementTypeCandidates(value?: string | null) {
  const preferredType = value && isApplicantRequirementType(value) ? value : APPLICANT_REQUIREMENT_TYPE

  return [preferredType, ...LEGACY_APPLICANT_REQUIREMENT_TYPES].filter(
    (candidate, index, values) => values.indexOf(candidate) === index
  )
}
