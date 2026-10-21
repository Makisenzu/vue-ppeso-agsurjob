import { supabase } from '@/lib/supabaseClient'
import {
  JOB_FAIR_ATTACHMENT_BUCKET,
  type JobFairAttachmentRow,
  type JobFairInsert,
  type JobFairParticipantDetails,
  type JobFairParticipantFormPayload,
  type JobFairParticipantRow,
  type JobFairParticipantUpdate,
  type JobFairParticipantWithCount,
  type JobFairRow,
  type JobFairUpdate,
  type JobFairRegistryApplicant,
  type JobFairWithCounts,
  type JobVacancyInsert,
  type JobVacancyRow,
  type JobVacancyUpdate,
} from '@/types/peso/provincialPeso/jobFair'
import type { EstablishmentFormFields } from '@/types/common/establishment'
import { establishmentService } from '@/services/common/establishmentService'
import { pickEstablishmentFormFields } from '@/helpers/common/establishmentHelper'

const JOB_FAIR_WITH_COUNTS_SELECT =
  '*, job_fair_participants(count), job_vacancies(vacancy_count), job_fair_applicants(count), hots(count)'
const REGISTRY_COLUMNS = 'id, profile_id, first_name, middle_name, surname, suffix, sex, email, contact_numbers'
const REGISTRY_SEARCH_LIMIT = 20
// Keeps `.in('id', …)` URLs short when looking up many registry records
const IN_FILTER_CHUNK_SIZE = 150

/** Merges each participant's establishment Form 2 fields onto it. */
async function withEstablishments<T extends JobFairParticipantRow>(rows: T[]): Promise<(T & EstablishmentFormFields)[]> {
  const establishments = await establishmentService.fetchEstablishmentsByIds(rows.map((row) => row.establishment_id))
  return rows.map((row) => {
    const establishment = establishments.get(row.establishment_id)
    if (!establishment) throw new Error("A participant's establishment record could not be loaded.")
    return { ...row, ...pickEstablishmentFormFields(establishment) }
  })
}

function toParticipantError(error: { code?: string; message?: string }, fallback: string): Error {
  // 23505 = unique_violation on (job_fair_id, establishment_id)
  if (error.code === '23505') return new Error('This employer is already a participant of this job fair.')
  return new Error(error.message || fallback)
}

/** Keeps storage keys to safe characters; the random prefix makes each path unique. */
function buildAttachmentPath(jobFairId: string, file: File) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'file'
  return `${jobFairId}/${crypto.randomUUID()}-${safeName}`
}

export const jobFairService = {
  async fetchJobFairs(): Promise<JobFairWithCounts[]> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_fairs')
      .select(JOB_FAIR_WITH_COUNTS_SELECT)
      .order('start_date', { ascending: false })

    if (error) throw new Error(error.message || 'Failed to load job fairs.')
    return (data ?? []) as JobFairWithCounts[]
  },

  async fetchJobFairById(jobFairId: string): Promise<JobFairRow> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_fairs')
      .select('*')
      .eq('id', jobFairId)
      .maybeSingle()

    if (error) throw new Error(error.message || 'Failed to load job fair.')
    if (!data) throw new Error('Job fair not found.')
    return data
  },

  async createJobFair(payload: JobFairInsert): Promise<JobFairWithCounts> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_fairs')
      .insert(payload)
      .select(JOB_FAIR_WITH_COUNTS_SELECT)
      .single()

    if (error) throw new Error(error.message || 'Failed to create job fair.')
    return data as JobFairWithCounts
  },

  async updateJobFair(jobFairId: string, payload: JobFairUpdate): Promise<JobFairWithCounts> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_fairs')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', jobFairId)
      .select(JOB_FAIR_WITH_COUNTS_SELECT)
      .single()

    if (error) throw new Error(error.message || 'Failed to update job fair.')
    return data as JobFairWithCounts
  },

  async deleteJobFair(jobFairId: string): Promise<void> {
    const { error } = await supabase
      .schema('esmdd')
      .from('job_fairs')
      .delete()
      .eq('id', jobFairId)

    // 23503 = foreign_key_violation (e.g. hired-on-the-spot records still reference it)
    if (error?.code === '23503') {
      throw new Error('This job fair still has linked records (such as hired-on-the-spot entries) and cannot be deleted.')
    }
    if (error) throw new Error(error.message || 'Failed to delete job fair.')
  },

  // ─── Attachments ───

  async fetchAttachments(jobFairId: string): Promise<JobFairAttachmentRow[]> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_fair_attachments')
      .select('*')
      .eq('job_fair_id', jobFairId)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message || 'Failed to load attachments.')
    return data ?? []
  },

  async uploadAttachment(jobFairId: string, file: File): Promise<JobFairAttachmentRow> {
    const path = buildAttachmentPath(jobFairId, file)

    const { error: uploadError } = await supabase.storage
      .from(JOB_FAIR_ATTACHMENT_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })

    if (uploadError) throw new Error(uploadError.message || `Failed to upload ${file.name}.`)

    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_fair_attachments')
      .insert({
        job_fair_id: jobFairId,
        filename: file.name,
        path,
        mime_type: file.type || null,
        size: file.size,
      })
      .select()
      .single()

    if (error) {
      // Don't leave an orphaned file behind when the record can't be saved
      await supabase.storage.from(JOB_FAIR_ATTACHMENT_BUCKET).remove([path])
      throw new Error(error.message || `Failed to save ${file.name}.`)
    }
    return data
  },

  /** Uploads every file independently so one failure doesn't block the rest. */
  async uploadAttachments(jobFairId: string, files: File[]) {
    const results = await Promise.allSettled(files.map((file) => this.uploadAttachment(jobFairId, file)))

    const uploaded: JobFairAttachmentRow[] = []
    const failed: { name: string; reason: string }[] = []
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') uploaded.push(result.value)
      else failed.push({ name: files[index]!.name, reason: result.reason?.message ?? String(result.reason) })
    })
    return { uploaded, failed }
  },

  async deleteAttachment(attachment: JobFairAttachmentRow): Promise<void> {
    const { error } = await supabase
      .schema('esmdd')
      .from('job_fair_attachments')
      .delete()
      .eq('id', attachment.id)

    if (error) throw new Error(error.message || `Failed to delete ${attachment.filename}.`)
    // Best effort: the record is already gone, so an orphaned file is harmless
    await this.removeAttachmentFiles([attachment.path]).catch(() => {})
  },

  /** Swaps the file behind an attachment, keeping the same record. */
  async replaceAttachment(attachment: JobFairAttachmentRow, file: File): Promise<JobFairAttachmentRow> {
    const path = buildAttachmentPath(attachment.job_fair_id, file)

    const { error: uploadError } = await supabase.storage
      .from(JOB_FAIR_ATTACHMENT_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })

    if (uploadError) throw new Error(uploadError.message || `Failed to upload ${file.name}.`)

    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_fair_attachments')
      .update({ filename: file.name, path, mime_type: file.type || null, size: file.size })
      .eq('id', attachment.id)
      .select()
      .single()

    if (error) {
      await supabase.storage.from(JOB_FAIR_ATTACHMENT_BUCKET).remove([path])
      throw new Error(error.message || `Failed to replace ${attachment.filename}.`)
    }

    await this.removeAttachmentFiles([attachment.path]).catch(() => {})
    return data
  },

  async removeAttachmentFiles(paths: string[]): Promise<void> {
    if (paths.length === 0) return
    const { error } = await supabase.storage.from(JOB_FAIR_ATTACHMENT_BUCKET).remove(paths)
    if (error) throw new Error(error.message || 'Failed to remove attachment files.')
  },

  getAttachmentUrl(path: string): string {
    return supabase.storage.from(JOB_FAIR_ATTACHMENT_BUCKET).getPublicUrl(path).data.publicUrl
  },

  // ─── Participants ───
  // A participant row only links a job fair to an establishment (NSRP Form 2, migration 038).
  // Form 2 fields are read from / saved to employers.establishments and merged onto the row.

  async fetchParticipants(jobFairId: string): Promise<JobFairParticipantWithCount[]> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_fair_participants')
      .select('*, job_vacancies(count)')
      .eq('job_fair_id', jobFairId)

    if (error) throw new Error(error.message || 'Failed to load job fair participants.')
    const rows = await withEstablishments(data ?? [])
    return rows.sort((a, b) => a.business_name.localeCompare(b.business_name))
  },

  async fetchParticipantById(jobFairId: string, participantId: string): Promise<JobFairParticipantDetails> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_fair_participants')
      .select('*')
      .eq('id', participantId)
      .eq('job_fair_id', jobFairId)
      .maybeSingle()

    if (error) throw new Error(error.message || 'Failed to load participant.')
    if (!data) throw new Error('Participant not found for this job fair.')
    const [row] = await withEstablishments([data])
    return row!
  },

  /**
   * Adds an establishment to a job fair. With `establishmentId` the picked Form 2 is updated with
   * the form values first; without it a new establishment is created by the RPC, in the same
   * transaction as the participant row.
   */
  async createParticipant(
    jobFairId: string,
    payload: JobFairParticipantFormPayload,
    establishmentId: string | null
  ): Promise<JobFairParticipantWithCount> {
    const existing = establishmentId
      ? await establishmentService.updateEstablishment(establishmentId, payload.establishment)
      : null

    const { data, error } = await supabase.schema('esmdd').rpc('add_job_fair_participant', {
      p_job_fair_id: jobFairId,
      p_establishment_id: existing?.id,
      p_establishment: existing ? undefined : payload.establishment,
      p_status: payload.status ?? undefined,
    })

    if (error) throw toParticipantError(error, 'Failed to add participant.')
    const establishment = existing ?? (await establishmentService.fetchEstablishmentById(data.establishment_id))
    return { ...data, ...pickEstablishmentFormFields(establishment), job_vacancies: [{ count: 0 }] }
  },

  /** Saves Form 2 edits to the establishment (shared by every activity it joined) and the participant status. */
  async updateParticipant(
    participant: JobFairParticipantDetails,
    payload: JobFairParticipantFormPayload
  ): Promise<JobFairParticipantWithCount> {
    const establishment = await establishmentService.updateEstablishment(participant.establishment_id, payload.establishment)

    const update: JobFairParticipantUpdate = { status: payload.status, updated_at: new Date().toISOString() }
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_fair_participants')
      .update(update)
      .eq('id', participant.id)
      .select('*, job_vacancies(count)')
      .single()

    if (error) throw toParticipantError(error, 'Failed to update participant.')
    return { ...data, ...pickEstablishmentFormFields(establishment) }
  },

  async deleteParticipant(participantId: string): Promise<void> {
    const { error } = await supabase
      .schema('esmdd')
      .from('job_fair_participants')
      .delete()
      .eq('id', participantId)

    // 23503 = foreign_key_violation: hired-on-the-spot records reference this employer (migration 024)
    if (error?.code === '23503') {
      throw new Error('This participant has hired-on-the-spot records and cannot be deleted. Remove those hires first.')
    }
    if (error) throw new Error(error.message || 'Failed to delete participant.')
  },

  // ─── Vacancies ───

  async fetchParticipantVacancies(jobFairId: string, participantId: string): Promise<JobVacancyRow[]> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_vacancies')
      .select('*')
      .eq('job_fair_id', jobFairId)
      .eq('participant_id', participantId)
      .order('position_title', { ascending: true })

    if (error) throw new Error(error.message || 'Failed to load vacancies.')
    return data ?? []
  },

  async createVacancy(payload: JobVacancyInsert): Promise<JobVacancyRow> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_vacancies')
      .insert(payload)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to add vacancy.')
    return data
  },

  async updateVacancy(vacancyId: string, payload: JobVacancyUpdate): Promise<JobVacancyRow> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_vacancies')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', vacancyId)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to update vacancy.')
    return data
  },

  async deleteVacancy(vacancyId: string): Promise<void> {
    const { error } = await supabase
      .schema('esmdd')
      .from('job_vacancies')
      .delete()
      .eq('id', vacancyId)

    // 23503 = foreign_key_violation: hired-on-the-spot records fill this vacancy (migration 024)
    if (error?.code === '23503') {
      throw new Error('This vacancy has hired-on-the-spot records and cannot be deleted. Remove those hires first.')
    }
    if (error) throw new Error(error.message || 'Failed to delete vacancy.')
  },

  // ─── Applicant Registry (shared by Attendees and Hired on the Spot) ───

  /** Every word must match the first name or surname, e.g. "juan dela" finds Juan Dela Cruz. */
  async searchRegistryApplicants(term: string): Promise<JobFairRegistryApplicant[]> {
    // Characters with meaning in PostgREST filters are dropped from the search words
    const words = term.replace(/[,()*%\\]/g, ' ').trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) return []

    let query = supabase.schema('applicants').from('applicants').select(REGISTRY_COLUMNS)
    for (const word of words) {
      query = query.or(`first_name.ilike.%${word}%,surname.ilike.%${word}%`)
    }

    const { data, error } = await query.order('surname', { ascending: true }).limit(REGISTRY_SEARCH_LIMIT)
    if (error) throw new Error(error.message || 'Failed to search the applicant registry.')
    return data ?? []
  },

  /** Registry records by id. PostgREST cannot embed across schemas, so they are fetched separately. */
  async fetchRegistryApplicants(ids: string[]): Promise<Map<string, JobFairRegistryApplicant>> {
    const unique = [...new Set(ids)]
    const result = new Map<string, JobFairRegistryApplicant>()

    for (let i = 0; i < unique.length; i += IN_FILTER_CHUNK_SIZE) {
      const chunk = unique.slice(i, i + IN_FILTER_CHUNK_SIZE)
      const { data, error } = await supabase.schema('applicants').from('applicants').select(REGISTRY_COLUMNS).in('id', chunk)
      if (error) throw new Error(error.message || 'Failed to load applicant registry records.')
      for (const row of data ?? []) result.set(row.id, row)
    }

    return result
  },
}
