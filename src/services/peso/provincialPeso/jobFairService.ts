import { supabase } from '@/lib/supabaseClient'
import {
  JOB_FAIR_ATTACHMENT_BUCKET,
  type JobFairAttachmentRow,
  type JobFairInsert,
  type JobFairParticipantInsert,
  type JobFairParticipantRow,
  type JobFairParticipantUpdate,
  type JobFairParticipantWithCount,
  type JobFairRow,
  type JobFairUpdate,
  type JobFairWithCounts,
  type JobVacancyInsert,
  type JobVacancyRow,
  type JobVacancyUpdate,
} from '@/types/peso/provincialPeso/jobFair'

const JOB_FAIR_WITH_COUNTS_SELECT = '*, job_fair_participants(count), job_vacancies(vacancy_count)'

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

  async fetchParticipants(jobFairId: string): Promise<JobFairParticipantWithCount[]> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_fair_participants')
      .select('*, job_vacancies(count)')
      .eq('job_fair_id', jobFairId)
      .order('business_name', { ascending: true })

    if (error) throw new Error(error.message || 'Failed to load job fair participants.')
    return (data ?? []) as JobFairParticipantWithCount[]
  },

  async fetchParticipantById(jobFairId: string, participantId: string): Promise<JobFairParticipantRow> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_fair_participants')
      .select('*')
      .eq('id', participantId)
      .eq('job_fair_id', jobFairId)
      .maybeSingle()

    if (error) throw new Error(error.message || 'Failed to load participant.')
    if (!data) throw new Error('Participant not found for this job fair.')
    return data
  },

  async createParticipant(payload: JobFairParticipantInsert): Promise<JobFairParticipantWithCount> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_fair_participants')
      .insert(payload)
      .select('*, job_vacancies(count)')
      .single()

    if (error) throw new Error(error.message || 'Failed to add participant.')
    return data as JobFairParticipantWithCount
  },

  async updateParticipant(participantId: string, payload: JobFairParticipantUpdate): Promise<JobFairParticipantWithCount> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('job_fair_participants')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', participantId)
      .select('*, job_vacancies(count)')
      .single()

    if (error) throw new Error(error.message || 'Failed to update participant.')
    return data as JobFairParticipantWithCount
  },

  async deleteParticipant(participantId: string): Promise<void> {
    const { error } = await supabase
      .schema('esmdd')
      .from('job_fair_participants')
      .delete()
      .eq('id', participantId)

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

    if (error) throw new Error(error.message || 'Failed to delete vacancy.')
  },
}
