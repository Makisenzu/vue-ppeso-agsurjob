import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { MyProgramApplicationRows } from '@/types/applicant/applicationStatus'
import type { SpesFormRow } from '@/types/common/spesForm'
import type { JobApplicationStage } from '@/types/common/jobVacancyApplication'

type VacancyApplicationLookupRow = {
  id: string
  job_vacancy_id: string
  stage: JobApplicationStage
  status_remarks: string | null
  created_at: string
  updated_at: string
  job_vacancies: { position_title: string } | null
  job_vacancy_stages: { stage_name: string } | null
}

/**
 * The signed-in applicant's applications across PESO programs and job vacancies, for the Application
 * Status page. Every query goes through the applicant's own-row RLS (migrations 034 / 087).
 */
export const applicationStatusService = {
  async fetchMyProgramApplications(applicantId: string, profileId: string): Promise<MyProgramApplicationRows> {
    const [gip, spes, tupad, vacancies] = await Promise.all([
      supabase
        .schema('esmdd')
        .from('gip_applicants')
        .select('id, status, status_remarks, created_at, updated_at, gips(id)')
        .eq('applicant_id', applicantId),
      // `*` for applied_at (migration 067), not in database.types.ts until `npm run types:gen`
      supabase
        .schema('applicants')
        .from('spes_form')
        .select('*')
        .or(`applicant_id.eq.${applicantId},profile_id.eq.${profileId}`),
      supabase
        .schema('esmdd')
        .from('tupad_applicants')
        .select('id, status, status_remarks, created_at, updated_at, tupad(id)')
        .eq('applicant_id', applicantId),
      // job_vacancy_applications (087) is not in database.types.ts until `npm run types:gen`
      (supabase as unknown as SupabaseClient)
        .schema('esmdd')
        .from('job_vacancy_applications')
        .select(
          'id, job_vacancy_id, stage, status_remarks, created_at, updated_at, job_vacancies(position_title), job_vacancy_stages!stage_id(stage_name)',
        )
        .eq('applicant_id', applicantId),
    ])

    if (gip.error) throw new Error(gip.error.message || 'Failed to load your GIP application')
    if (spes.error) throw new Error(spes.error.message || 'Failed to load your SPES application')
    if (tupad.error) throw new Error(tupad.error.message || 'Failed to load your TUPAD application')
    if (vacancies.error) throw new Error(vacancies.error.message || 'Failed to load your job applications')

    // PostgREST can't embed across schemas (spes_form is in applicants, spes in esmdd).
    // One form carries every SPES round (067), so only an appointment from the round's year counts.
    const spesForms = (spes.data ?? []) as SpesFormRow[]
    const latestYearByForm = new Map<string, number>()
    if (spesForms.length) {
      const { data: beneficiaries, error } = await supabase
        .schema('esmdd')
        .from('spes')
        .select('id, application_id')
        .in('application_id', spesForms.map((row) => row.id))
      if (error) throw new Error(error.message || 'Failed to load your SPES deployment')

      const formBySpes = new Map((beneficiaries ?? []).map((row) => [row.id, row.application_id]))
      if (formBySpes.size) {
        // spes_appointments (015) is not in database.types.ts until `npm run types:gen`
        const { data: appointments, error: appointmentErr } = await (supabase.schema('esmdd') as any)
          .from('spes_appointments')
          .select('spes_id, spes_year')
          .in('spes_id', [...formBySpes.keys()])
        if (appointmentErr) throw new Error(appointmentErr.message || 'Failed to load your SPES deployment')
        for (const appointment of (appointments ?? []) as { spes_id: string; spes_year: number }[]) {
          const formId = formBySpes.get(appointment.spes_id)
          if (formId) latestYearByForm.set(formId, Math.max(latestYearByForm.get(formId) ?? 0, appointment.spes_year))
        }
      }
    }

    return {
      gip: (gip.data ?? []).map(({ gips, ...row }) => ({ ...row, isDeployed: (gips ?? []).length > 0 })),
      spes: spesForms.map((row) => {
        const appliedAt = row.applied_at ?? row.created_at
        const roundYear = appliedAt ? new Date(appliedAt).getFullYear() : new Date().getFullYear()
        return {
          id: row.id,
          status: row.status,
          remarks: row.remarks,
          created_at: appliedAt,
          updated_at: row.updated_at,
          isDeployed: (latestYearByForm.get(row.id) ?? 0) >= roundYear,
        }
      }),
      tupad: (tupad.data ?? []).map(({ tupad: batches, ...row }) => ({ ...row, isDeployed: (batches ?? []).length > 0 })),
      vacancies: ((vacancies.data ?? []) as unknown as VacancyApplicationLookupRow[]).map(({ job_vacancies, job_vacancy_stages, ...row }) => ({
        ...row,
        position_title: job_vacancies?.position_title ?? 'Job vacancy',
        stage_name: job_vacancy_stages?.stage_name ?? null,
      })),
    }
  },
}
