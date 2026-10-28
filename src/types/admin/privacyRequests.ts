import type { DataSubjectRequestStatus, DataSubjectRequestType } from '@/types/common/privacy'

/** A row of core.admin_list_data_subject_requests (migration 073) */
export interface AdminPrivacyRequestRow {
  id: string
  /** NULL once the account was deleted (erasure completed) */
  profile_id: string | null
  requester_name: string | null
  requester_email: string | null
  requester_role: string | null
  request_type: DataSubjectRequestType
  details: string | null
  status: DataSubjectRequestStatus
  resolution_note: string | null
  resolved_at: string | null
  created_at: string
  total_count: number
}

export type PrivacyRequestStatusFilter = DataSubjectRequestStatus | 'ALL'
