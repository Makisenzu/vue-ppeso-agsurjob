import { supabase } from '@/lib/supabaseClient'
import type { AdminPrivacyRequestRow, PrivacyRequestStatusFilter } from '@/types/admin/privacyRequests'
import type { DataSubjectRequestStatus } from '@/types/common/privacy'

// Migration 073's functions are not in database.types.ts until `npm run types:gen` is re-run
const core = () => supabase.schema('core') as any

/** The Data Protection Officer's queue of data subject requests (RA 10173 Sec. 16). */
export const privacyRequestService = {
  /** One page, open requests first; paged in SQL (BACKEND.md §19) */
  async fetchRequestPage(
    status: PrivacyRequestStatusFilter,
    page: number,
    pageSize: number
  ): Promise<{ rows: AdminPrivacyRequestRow[]; total: number }> {
    const { data, error } = await core().rpc('admin_list_data_subject_requests', {
      p_status: status === 'ALL' ? null : status,
      p_limit: pageSize,
      p_offset: (page - 1) * pageSize,
    })
    if (error) throw new Error(error.message || 'Failed to load privacy requests.')
    const rows = (data ?? []) as AdminPrivacyRequestRow[]
    return { rows, total: Number(rows[0]?.total_count ?? 0) }
  },

  async updateRequest(id: string, status: DataSubjectRequestStatus, note: string): Promise<void> {
    const { error } = await core().rpc('admin_update_data_subject_request', {
      p_id: id,
      p_status: status,
      p_note: note.trim() || null,
    })
    if (error) throw new Error(error.message || 'Failed to update the request.')
  },
}
