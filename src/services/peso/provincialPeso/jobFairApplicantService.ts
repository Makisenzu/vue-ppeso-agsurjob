import { supabase } from '@/lib/supabaseClient'
import { jobFairService } from '@/services/peso/provincialPeso/jobFairService'
import type {
  JobFairApplicantInsert,
  JobFairApplicantRow,
  JobFairApplicantUpdate,
  JobFairAttendee,
} from '@/types/peso/provincialPeso/jobFair'

async function withRegistry(rows: JobFairApplicantRow[]): Promise<JobFairAttendee[]> {
  const registry = await jobFairService.fetchRegistryApplicants(rows.map((row) => row.applicant_id))
  return rows.map((row) => ({ ...row, applicant: registry.get(row.applicant_id) ?? null }))
}

export const jobFairApplicantService = {
  async fetchAttendees(jobFairId: string): Promise<JobFairAttendee[]> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_fair_applicants')
      .select('*')
      .eq('job_fair_id', jobFairId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message || 'Failed to load job fair attendees.')
    return withRegistry(data ?? [])
  },

  async createAttendee(payload: JobFairApplicantInsert): Promise<JobFairAttendee> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_fair_applicants')
      .insert(payload)
      .select()
      .single()

    // 23505 = unique_violation on (job_fair_id, applicant_id)
    if (error?.code === '23505') throw new Error('This applicant is already listed for this job fair.')
    if (error) throw new Error(error.message || 'Failed to add the attendee.')
    const [attendee] = await withRegistry([data])
    return attendee!
  },

  async updateAttendee(attendeeId: string, payload: JobFairApplicantUpdate): Promise<JobFairAttendee> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_fair_applicants')
      .update(payload)
      .eq('id', attendeeId)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to update the attendee.')
    const [attendee] = await withRegistry([data])
    return attendee!
  },

  async deleteAttendee(attendeeId: string): Promise<void> {
    const { error } = await supabase
      .schema('esmdd')
      .from('job_fair_applicants')
      .delete()
      .eq('id', attendeeId)

    if (error) throw new Error(error.message || 'Failed to remove the attendee.')
  },
}
