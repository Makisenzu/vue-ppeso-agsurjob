/**
 * Verification rule (migration 103): an applicant applies to job vacancies, GIP, TUPAD and SPES only
 * once their account is verified (core.profiles.status = 'approved', set when PESO approves the
 * Application Form, Resume and Birth Certificate — migration 030). The database enforces it too.
 */
export const UNVERIFIED_APPLICANT_TITLE = 'Verify your account first'
export const UNVERIFIED_APPLICANT_MESSAGE =
  'You can apply once PESO verifies your account. Upload your Application Form, Resume and Birth Certificate in your profile requirements.'

/**
 * Where the applicant uploads their account documents: their profile. The route needs the username
 * (profile/:username), so without one it falls back to home, like the header's profile link.
 */
export const toAccountRequirementsLink = (username: string | null | undefined) =>
  username ? { name: 'profile', params: { username } } : { name: 'home' }
