import { supabase } from '@/lib/supabaseClient'
import type { MyProgramApplicationRows } from '@/types/applicant/applicationStatus'

/**
 * The signed-in applicant's applications across PESO programs, for the Application Status page.
 * Every query goes through the applicant's own-row RLS (migration 034).
 *
 * Job vacancies are not read yet: jobs.job_applications.applicant_id is int4 while
 * applicants.applicants.id is uuid, so applicants can't own those rows (034, "Not owner-scoped yet").
 */
export const applicationStatusService = {
  async fetchMyProgramApplications(applicantId: string, profileId: string): Promise<MyProgramApplicationRows> {
    const [gip, spes, tupad] = await Promise.all([
      supabase
        .schema('esmdd')
        .from('gip_applicants')
        .select('id, status, status_remarks, created_at, updated_at, gips(id)')
        .eq('applicant_id', applicantId),
      supabase
        .schema('applicants')
        .from('spes_form')
        .select('id, status, remarks, created_at, updated_at')
        .or(`applicant_id.eq.${applicantId},profile_id.eq.${profileId}`),
      supabase
        .schema('esmdd')
        .from('tupad_applicants')
        .select('id, status, status_remarks, created_at, updated_at, tupad(id)')
        .eq('applicant_id', applicantId),
    ])

    if (gip.error) throw new Error(gip.error.message || 'Failed to load your GIP application')
    if (spes.error) throw new Error(spes.error.message || 'Failed to load your SPES application')
    if (tupad.error) throw new Error(tupad.error.message || 'Failed to load your TUPAD application')

    // PostgREST can't embed across schemas (spes_form is in applicants, spes in esmdd)
    const spesIds = (spes.data ?? []).map((row) => row.id)
    const deployedSpes = new Set<string>()
    if (spesIds.length) {
      const { data, error } = await supabase.schema('esmdd').from('spes').select('application_id').in('application_id', spesIds)
      if (error) throw new Error(error.message || 'Failed to load your SPES deployment')
      for (const row of data ?? []) if (row.application_id) deployedSpes.add(row.application_id)
    }

    return {
      gip: (gip.data ?? []).map(({ gips, ...row }) => ({ ...row, isDeployed: (gips ?? []).length > 0 })),
      spes: (spes.data ?? []).map((row) => ({ ...row, isDeployed: deployedSpes.has(row.id) })),
      tupad: (tupad.data ?? []).map(({ tupad: batches, ...row }) => ({ ...row, isDeployed: (batches ?? []).length > 0 })),
    }
  },
}
