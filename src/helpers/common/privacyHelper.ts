import { format } from 'date-fns'
import type {
  DataSubjectRequestStatus,
  DataSubjectRequestType,
  PrivacyPurpose,
  PrivacyRequestOption,
  PrivacyStatus,
} from '@/types/common/privacy'

export const PRIVACY_PURPOSE_LABELS: Record<PrivacyPurpose, string> = {
  privacy_notice: 'Processing of my personal information as described in the Privacy Notice',
  sensitive_personal_information:
    'Processing of my sensitive personal information (age, civil status, religion, disability, education, government IDs) for employment facilitation',
  biometrics: 'Processing of my biometric (face) data for identity verification',
}

/** "I agree to the processing of my ..." — the checkbox wording for one purpose */
export function getPrivacyConsentStatement(purpose: PrivacyPurpose): string {
  const label = PRIVACY_PURPOSE_LABELS[purpose]
  return `I agree to the ${label.charAt(0).toLowerCase()}${label.slice(1)}.`
}

export const DATA_SUBJECT_REQUEST_LABELS: Record<DataSubjectRequestType, string> = {
  access: 'Access to my data',
  rectification: 'Correct my data',
  erasure: 'Delete my account and data',
  objection: 'Object to processing',
  portability: 'Copy of my data',
  complaint: 'Privacy complaint',
}

/** Requests offered on the Privacy & My Data page. Access / portability are self-service (Download my data). */
export const PRIVACY_REQUEST_OPTIONS: PrivacyRequestOption[] = [
  { type: 'rectification', label: DATA_SUBJECT_REQUEST_LABELS.rectification, description: 'For details you can\'t edit yourself.' },
  { type: 'objection', label: DATA_SUBJECT_REQUEST_LABELS.objection, description: 'Ask PESO to stop a specific use of your data.' },
  { type: 'erasure', label: DATA_SUBJECT_REQUEST_LABELS.erasure, description: 'Your account, records and files are removed.' },
  { type: 'complaint', label: DATA_SUBJECT_REQUEST_LABELS.complaint, description: 'Report a concern to the Data Protection Officer.' },
]

export const DATA_SUBJECT_REQUEST_STATUSES: DataSubjectRequestStatus[] = ['Pending', 'In progress', 'Completed', 'Rejected']

const REQUEST_STATUS_BADGE_CLASS: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/30',
  'in progress': 'bg-info/10 text-info border-info/30',
  completed: 'bg-success/10 text-success border-success/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
}

export function getDataSubjectRequestStatusBadgeClass(status?: string | null): string {
  return REQUEST_STATUS_BADGE_CLASS[(status || '').toLowerCase()] ?? 'bg-muted text-muted-foreground border-border'
}

export function isOpenDataSubjectRequest(status?: string | null): boolean {
  return status === 'Pending' || status === 'In progress'
}

/** True when the account has accepted every required purpose; an unknown status (RPC failed) never blocks. */
export function hasAcceptedPrivacyNotice(status: PrivacyStatus | null): boolean {
  return !status || status.missing.length === 0
}

/** Purposes the signup form must collect for a role (mirrors core.required_privacy_purposes). */
export function getRequiredPrivacyPurposes(role: string | null): PrivacyPurpose[] {
  return role === 'applicant' ? ['privacy_notice', 'sensitive_personal_information'] : ['privacy_notice']
}

export function formatPrivacyDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : format(date, 'MMM d, yyyy')
}

/** "agsurjobs-my-data-2026-10-27.json" */
export function buildPersonalDataExportFileName(now = new Date()): string {
  return `agsurjobs-my-data-${format(now, 'yyyy-MM-dd')}.json`
}
