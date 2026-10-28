import { supabase } from '@/lib/supabaseClient'
import type {
  DataSubjectRequestRow,
  DataSubjectRequestType,
  PrivacyPurpose,
  PrivacyStatus,
} from '@/types/common/privacy'

// Migration 073's tables and functions are not in database.types.ts until `npm run types:gen` is re-run
const core = () => supabase.schema('core') as any
const system = () => supabase.schema('system') as any

/** Consent, data subject requests and the self-service export (RA 10173; .agents/PRIVACY.md). */
export const privacyService = {
  async fetchMyPrivacyStatus(): Promise<PrivacyStatus> {
    const { data, error } = await core().rpc('my_privacy_status')
    if (error) throw new Error(error.message || 'Failed to load your privacy settings.')
    return data as PrivacyStatus
  },

  async acceptPrivacyNotice(purposes: PrivacyPurpose[]): Promise<PrivacyStatus> {
    const { data, error } = await core().rpc('accept_privacy_notice', { p_purposes: purposes })
    if (error) throw new Error(error.message || 'Failed to save your consent.')
    return data as PrivacyStatus
  },

  async withdrawConsent(purpose: PrivacyPurpose): Promise<PrivacyStatus> {
    const { data, error } = await core().rpc('withdraw_privacy_consent', { p_purpose: purpose })
    if (error) throw new Error(error.message || 'Failed to withdraw your consent.')
    return data as PrivacyStatus
  },

  /** The signed-in account's own requests (RLS: owner_select). Bounded: a person files only a few. */
  async fetchMyRequests(profileId: string): Promise<DataSubjectRequestRow[]> {
    const { data, error } = await core()
      .from('data_subject_requests')
      .select('id, profile_id, request_type, details, status, resolution_note, resolved_at, created_at')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw new Error(error.message || 'Failed to load your requests.')
    return (data ?? []) as DataSubjectRequestRow[]
  },

  async submitRequest(type: DataSubjectRequestType, details: string): Promise<string> {
    const { data, error } = await core().rpc('submit_data_subject_request', {
      p_type: type,
      p_details: details.trim() || null,
    })
    if (error) throw new Error(error.message || 'Failed to send your request.')
    return data as string
  },

  /** Everything the portal holds about the signed-in account, as JSON (core.export_my_data). */
  async exportMyData(): Promise<unknown> {
    const { data, error } = await core().rpc('export_my_data')
    if (error) throw new Error(error.message || 'Failed to prepare your data.')
    return data
  },

  /**
   * Records that a staff member opened (VIEW) or exported (EXPORT) personal data. Reads can't fire
   * database triggers, so screens that show someone's full record call this (SECURITY.md §10).
   * Never throws: a failed log entry must not block the screen, it is reported to the console only.
   */
  async logPersonalDataAccess(
    action: 'VIEW' | 'EXPORT',
    table: string,
    recordId: string | null,
    details?: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await system().rpc('log_personal_data_access', {
      p_action: action,
      p_table: table,
      p_record_id: recordId,
      p_details: details ?? null,
    })
    if (error) console.error('[privacyService] Could not write the audit entry')
  },
}
