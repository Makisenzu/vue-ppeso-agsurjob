// Data Privacy Act (RA 10173) — consent, data subject requests and the Privacy Notice (.agents/PRIVACY.md).
// core.privacy_consents / core.data_subject_requests (migration 073) are not in database.types.ts
// until `npm run types:gen` is re-run, so their shapes are declared here.

/**
 * Version of the Privacy Notice page. Must equal core.privacy_notice_version() (migration 073):
 * signup sends it with the consent, and the server ignores a consent for any other version.
 */
export const PRIVACY_NOTICE_VERSION = '2026-10-27'

export type PrivacyPurpose = 'privacy_notice' | 'sensitive_personal_information' | 'biometrics'

export type PrivacyConsentSource = 'signup' | 'web' | 'peso_office'

export interface PrivacyConsent {
  purpose: PrivacyPurpose
  notice_version: string
  source: PrivacyConsentSource
  granted_at: string
  withdrawn_at: string | null
}

/** core.my_privacy_status() */
export interface PrivacyStatus {
  notice_version: string
  required: PrivacyPurpose[]
  /** Required purposes not yet accepted for the current notice version */
  missing: PrivacyPurpose[]
  consents: PrivacyConsent[]
}

export type DataSubjectRequestType = 'access' | 'rectification' | 'erasure' | 'objection' | 'portability' | 'complaint'

export type DataSubjectRequestStatus = 'Pending' | 'In progress' | 'Completed' | 'Rejected'

export interface DataSubjectRequestRow {
  id: string
  profile_id: string | null
  request_type: DataSubjectRequestType
  details: string | null
  status: DataSubjectRequestStatus
  resolution_note: string | null
  resolved_at: string | null
  created_at: string
}

export interface PrivacyRequestOption {
  type: DataSubjectRequestType
  label: string
  description: string
}

/** Signup sends this in the auth metadata; trigger core.record_signup_privacy_consent stores it. */
export interface SignupPrivacyConsent {
  version: string
  purposes: PrivacyPurpose[]
}
