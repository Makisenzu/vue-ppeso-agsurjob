import { supabase } from '@/lib/supabaseClient'
import { establishmentService } from '@/services/common/establishmentService'
import type { JobVacancyRow } from '@/types/peso/provincialPeso/jobFair'
import {
  RECRUITMENT_ACTIVITY_DOCUMENT_BUCKET,
  RECRUITMENT_ACTIVITY_DOCUMENT_URL_TTL_SECONDS,
  type RecruitmentActivityAttachmentRow,
  type RecruitmentActivityDetails,
  type RecruitmentActivityFormPayload,
  type RecruitmentActivityListItem,
  type RecruitmentActivityRequirement,
  type RecruitmentActivityRequirementRow,
  type RecruitmentActivityRow,
  type RecruitmentActivityUpdate,
  type RecruitmentActivityVacancyDetails,
  type RecruitmentActivityVacancyFormPayload,
  type RecruitmentActivityVacancyRow,
} from '@/types/peso/provincialPeso/recruitmentActivity'

const LIST_SELECT = '*, recruitment_activity_requirements(stage, is_submitted), recruitment_activity_vacancies(count)'
const REQUIREMENT_SELECT = '*, recruitment_activity_attachments(*)'
const VACANCY_SELECT = '*, job_vacancies(*)'

/** Turns trigger / constraint errors into messages PESO staff can act on. */
function toActivityError(error: { code?: string; message?: string }, fallback: string): Error {
  // P0001 = RAISE EXCEPTION in the status guard / job order trigger (migration 041)
  if (error.code === 'P0001' && error.message) return new Error(error.message)
  // 23505 = unique_violation (CONO number, or the same vacancy listed twice)
  if (error.code === '23505') {
    return new Error(
      error.message?.includes('cono_number')
        ? 'This CONO number is already used by another activity.'
        : 'This vacancy is already a job order of this activity.'
    )
  }
  // 23503 = foreign_key_violation
  if (error.code === '23503') return new Error('This record is still referenced by other records.')
  return new Error(error.message || fallback)
}

/** Agency names for list rows (PostgREST cannot embed across schemas). */
async function withAgencyNames<T extends { establishment_id: string }>(rows: T[]): Promise<(T & { agency_name: string })[]> {
  const establishments = await establishmentService.fetchEstablishmentsByIds(rows.map((row) => row.establishment_id))
  return rows.map((row) => ({
    ...row,
    agency_name: establishments.get(row.establishment_id)?.business_name ?? 'Unknown agency',
  }))
}

/** Flattens a job order and its job into one row; the job order's id, openings and status win. */
function toVacancyDetails(
  row: RecruitmentActivityVacancyRow & { job_vacancies: JobVacancyRow }
): RecruitmentActivityVacancyDetails {
  const { job_vacancies: job, ...order } = row
  const {
    id: _jobId,
    vacancy_count: _jobCount,
    status: _jobStatus,
    created_by: _createdBy,
    created_at: _createdAt,
    updated_at: _updatedAt,
    ...details
  } = job
  return { ...details, ...order }
}

/** Keeps storage keys to safe characters; the random prefix makes each path unique. */
function buildDocumentPath(activityId: string, requirementId: string, file: File) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'file'
  return `${activityId}/${requirementId}/${crypto.randomUUID()}-${safeName}`
}

export const recruitmentActivityService = {
  // ─── Activities ───

  async fetchActivities(): Promise<RecruitmentActivityListItem[]> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('recruitment_activities')
      .select(LIST_SELECT)
      .order('start_date', { ascending: false })

    if (error) throw new Error(error.message || 'Failed to load recruitment activities.')
    return withAgencyNames(data ?? [])
  },

  async fetchActivityById(activityId: string): Promise<RecruitmentActivityDetails> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('recruitment_activities')
      .select('*')
      .eq('id', activityId)
      .maybeSingle()

    if (error) throw new Error(error.message || 'Failed to load recruitment activity.')
    if (!data) throw new Error('Recruitment activity not found.')
    const establishment = await establishmentService.fetchEstablishmentById(data.establishment_id)
    return { ...data, establishment }
  },

  /**
   * Saves the agency's completed NSRP Form 2 (updating the picked establishment or registering a
   * new one), then creates the activity. Its checklist is seeded by trigger with the NSRP Form 2
   * item already ticked (migration 042), since the form was just completed.
   */
  async createActivity(payload: RecruitmentActivityFormPayload): Promise<RecruitmentActivityListItem> {
    const establishment = payload.establishmentId
      ? await establishmentService.updateEstablishment(payload.establishmentId, payload.establishment)
      : await establishmentService.createEstablishment(payload.establishment)

    const { data, error } = await supabase
      .schema('esmdd')
      .from('recruitment_activities')
      .insert({ ...payload.activity, establishment_id: establishment.id })
      .select('id')
      .single()

    if (error) throw toActivityError(error, 'Failed to create recruitment activity.')

    return this.fetchListItem(data.id)
  },

  async updateActivity(activityId: string, payload: RecruitmentActivityUpdate): Promise<RecruitmentActivityRow> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('recruitment_activities')
      .update(payload)
      .eq('id', activityId)
      .select('*')
      .single()

    if (error) throw toActivityError(error, 'Failed to update recruitment activity.')
    return data
  },

  async fetchListItem(activityId: string): Promise<RecruitmentActivityListItem> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('recruitment_activities')
      .select(LIST_SELECT)
      .eq('id', activityId)
      .single()

    if (error) throw new Error(error.message || 'Failed to load recruitment activity.')
    const [row] = await withAgencyNames([data])
    return row!
  },

  /**
   * Deletes the activity, its checklist, job orders and stored documents. Triggers (migration 043) also
   * delete the job orders' vacancies and the agency's establishment when nothing else uses them.
   */
  async deleteActivity(activityId: string): Promise<void> {
    const { data: attachments } = await supabase
      .schema('esmdd')
      .from('recruitment_activity_attachments')
      .select('path')
      .eq('activity_id', activityId)

    const { error } = await supabase.schema('esmdd').from('recruitment_activities').delete().eq('id', activityId)
    if (error) throw toActivityError(error, 'Failed to delete recruitment activity.')

    // Best effort: the records are gone, so an orphaned file is harmless
    const paths = (attachments ?? []).map((row) => row.path)
    if (paths.length) await supabase.storage.from(RECRUITMENT_ACTIVITY_DOCUMENT_BUCKET).remove(paths)
  },

  // ─── Checklist ───

  async fetchRequirements(activityId: string): Promise<RecruitmentActivityRequirement[]> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('recruitment_activity_requirements')
      .select(REQUIREMENT_SELECT)
      .eq('activity_id', activityId)
      .order('sort_order', { ascending: true })

    if (error) throw new Error(error.message || 'Failed to load requirements.')
    return data ?? []
  },

  async setRequirementSubmitted(requirementId: string, isSubmitted: boolean): Promise<RecruitmentActivityRequirementRow> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('recruitment_activity_requirements')
      .update({ is_submitted: isSubmitted })
      .eq('id', requirementId)
      .select('*')
      .single()

    if (error) throw new Error(error.message || 'Failed to update requirement.')
    return data
  },

  async uploadDocument(activityId: string, requirementId: string, file: File): Promise<RecruitmentActivityAttachmentRow> {
    const path = buildDocumentPath(activityId, requirementId, file)

    const { error: uploadError } = await supabase.storage
      .from(RECRUITMENT_ACTIVITY_DOCUMENT_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })

    if (uploadError) throw new Error(uploadError.message || `Failed to upload ${file.name}.`)

    const { data, error } = await supabase
      .schema('esmdd')
      .from('recruitment_activity_attachments')
      .insert({
        activity_id: activityId,
        requirement_id: requirementId,
        filename: file.name,
        path,
        mime_type: file.type || null,
        size: file.size,
      })
      .select()
      .single()

    if (error) {
      // Don't leave an orphaned file behind when the record can't be saved
      await supabase.storage.from(RECRUITMENT_ACTIVITY_DOCUMENT_BUCKET).remove([path])
      throw new Error(error.message || `Failed to save ${file.name}.`)
    }
    return data
  },

  async deleteDocument(attachment: RecruitmentActivityAttachmentRow): Promise<void> {
    const { error } = await supabase
      .schema('esmdd')
      .from('recruitment_activity_attachments')
      .delete()
      .eq('id', attachment.id)

    if (error) throw new Error(error.message || `Failed to delete ${attachment.filename}.`)
    await supabase.storage.from(RECRUITMENT_ACTIVITY_DOCUMENT_BUCKET).remove([attachment.path])
  },

  /** The bucket is private, so documents open through a short-lived signed link. */
  async getDocumentUrl(path: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(RECRUITMENT_ACTIVITY_DOCUMENT_BUCKET)
      .createSignedUrl(path, RECRUITMENT_ACTIVITY_DOCUMENT_URL_TTL_SECONDS)

    if (error || !data) throw new Error(error?.message || 'Failed to open the document.')
    return data.signedUrl
  },

  // ─── Job Orders ───
  // The job lives in job_vacancies (owned by the agency's establishment); the activity's job
  // order adds this activity's openings, status and SRA details (migration 041).

  async fetchVacancies(activityId: string): Promise<RecruitmentActivityVacancyDetails[]> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('recruitment_activity_vacancies')
      .select(VACANCY_SELECT)
      .eq('activity_id', activityId)

    if (error) throw new Error(error.message || 'Failed to load job orders.')
    return (data ?? []).map(toVacancyDetails).sort((a, b) => a.position_title.localeCompare(b.position_title))
  },

  async createVacancy(
    activityId: string,
    establishmentId: string,
    payload: RecruitmentActivityVacancyFormPayload
  ): Promise<RecruitmentActivityVacancyDetails> {
    const { data: job, error: jobError } = await supabase
      .schema('esmdd')
      .from('job_vacancies')
      .insert({
        ...payload.vacancy,
        establishment_id: establishmentId,
        vacancy_count: payload.vacancy_count,
        status: payload.status,
      })
      .select('id')
      .single()

    if (jobError) throw toActivityError(jobError, 'Failed to add job order.')

    const { data, error } = await supabase
      .schema('esmdd')
      .from('recruitment_activity_vacancies')
      .insert({
        activity_id: activityId,
        job_vacancy_id: job.id,
        vacancy_count: payload.vacancy_count,
        status: payload.status,
        destination_country: payload.destination_country,
        job_order_number: payload.job_order_number,
      })
      .select(VACANCY_SELECT)
      .single()

    if (error) {
      // Don't leave a job behind that no activity offers
      await supabase.schema('esmdd').from('job_vacancies').delete().eq('id', job.id)
      throw toActivityError(error, 'Failed to add job order.')
    }
    return toVacancyDetails(data)
  },

  /** Saves job details to the shared job_vacancies row, the rest to this activity's job order. */
  async updateVacancy(
    target: RecruitmentActivityVacancyDetails,
    payload: RecruitmentActivityVacancyFormPayload
  ): Promise<RecruitmentActivityVacancyDetails> {
    const { error: jobError } = await supabase
      .schema('esmdd')
      .from('job_vacancies')
      .update({ ...payload.vacancy, updated_at: new Date().toISOString() })
      .eq('id', target.job_vacancy_id)

    if (jobError) throw toActivityError(jobError, 'Failed to update job order.')

    const { data, error } = await supabase
      .schema('esmdd')
      .from('recruitment_activity_vacancies')
      .update({
        vacancy_count: payload.vacancy_count,
        status: payload.status,
        destination_country: payload.destination_country,
        job_order_number: payload.job_order_number,
      })
      .eq('id', target.id)
      .select(VACANCY_SELECT)
      .single()

    if (error) throw toActivityError(error, 'Failed to update job order.')
    return toVacancyDetails(data)
  },

  /**
   * Removes the job order from this activity. A trigger (migration 043) deletes its job_vacancies row
   * too, unless a job fair or another activity still lists it.
   */
  async deleteVacancy(activityVacancyId: string): Promise<void> {
    const { error } = await supabase
      .schema('esmdd')
      .from('recruitment_activity_vacancies')
      .delete()
      .eq('id', activityVacancyId)

    if (error) throw toActivityError(error, 'Failed to remove job order.')
  },
}
