import { supabase } from '@/lib/supabaseClient'
import { fetchAllInChunks, fetchAllPages, IN_FILTER_CHUNK_SIZE } from '@/helpers/common/supabasePaging'
import { TUPAD_LOCKED_DOCUMENT } from '@/types/peso/provincialPeso/tupad'
import { DOCUMENT_UPLOAD_BUCKET } from '@/helpers/common/uploadHelpers'
import type {
  TupadApplicantReview,
  TupadApplicantRow,
  TupadApplicantStatus,
  TupadApplicantWithRegistry,
  TupadAttachmentWithUrl,
  TupadBatchFormValues,
  TupadBatchRow,
  TupadBatchWithCount,
  TupadInsert,
  TupadMember,
  TupadMemberFormValues,
  TupadRegistryApplicant,
  TupadRow,
} from '@/types/peso/provincialPeso/tupad'

const REGISTRY_COLUMNS =
  'id, profile_id, first_name, middle_name, surname, suffix, sex, date_of_birth, age, contact_numbers, address'

const SIGNED_URL_TTL_SECONDS = 60 * 60

/** Registry records (`applicants.applicants`) by id. PostgREST cannot embed across schemas, so they are fetched separately. */
async function fetchRegistryApplicants(ids: string[]): Promise<Map<string, TupadRegistryApplicant>> {
  const { data, error } = await fetchAllInChunks(ids, (chunk) =>
    supabase.schema('applicants').from('applicants').select(REGISTRY_COLUMNS).in('id', chunk).order('id')
  )
  if (error) throw new Error(error.message || 'Failed to load applicant registry records')

  return new Map(data.map((row) => [row.id, row]))
}

async function withRegistry(rows: TupadApplicantRow[]): Promise<TupadApplicantWithRegistry[]> {
  const registry = await fetchRegistryApplicants(rows.map((row) => row.applicant_id))
  return rows.map((row) => ({ ...row, applicant: registry.get(row.applicant_id) ?? null }))
}

export const tupadService = {
  // ─── Batches ───

  async fetchBatches(): Promise<TupadBatchWithCount[]> {
    const { data, error } = await fetchAllPages(() =>
      supabase
        .schema('esmdd')
        .from('tupad_batch')
        .select('*, tupad(count)')
        .order('created_at', { ascending: false })
        .order('id')
    )

    if (error) throw new Error(error.message || 'Failed to load TUPAD batches')

    return (data ?? []).map(({ tupad, ...batch }) => ({
      ...batch,
      member_count: tupad?.[0]?.count ?? 0,
    }))
  },

  async fetchBatchById(id: string): Promise<TupadBatchRow | null> {
    const { data, error } = await supabase.schema('esmdd').from('tupad_batch').select('*').eq('id', id).maybeSingle()
    if (error) throw new Error(error.message || 'Failed to load the TUPAD batch')
    return data
  },

  async createBatch(values: TupadBatchFormValues): Promise<TupadBatchRow> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('tupad_batch')
      .insert({ ...values, edl_number: values.edl_number.trim() })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') throw new Error(`A batch with EDL number "${values.edl_number.trim()}" already exists.`)
      throw new Error(error.message || 'Failed to create the TUPAD batch')
    }
    return data
  },

  async updateBatch(id: string, values: TupadBatchFormValues): Promise<TupadBatchRow> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('tupad_batch')
      .update({ ...values, edl_number: values.edl_number.trim() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') throw new Error(`A batch with EDL number "${values.edl_number.trim()}" already exists.`)
      throw new Error(error.message || 'Failed to update the TUPAD batch')
    }
    return data
  },

  /** Deleting a batch also removes its engagements (ON DELETE CASCADE). */
  async deleteBatch(id: string): Promise<void> {
    const { error } = await supabase.schema('esmdd').from('tupad_batch').delete().eq('id', id)
    if (error) throw new Error(error.message || 'Failed to delete the TUPAD batch')
  },

  // ─── TUPAD applicants ───

  async fetchTupadApplicants(): Promise<TupadApplicantWithRegistry[]> {
    const { data, error } = await fetchAllPages(() =>
      supabase
        .schema('esmdd')
        .from('tupad_applicants')
        .select('*')
        .order('created_at', { ascending: false })
        .order('id')
    )

    if (error) throw new Error(error.message || 'Failed to load TUPAD applicants')
    return withRegistry(data ?? [])
  },

  async updateTupadApplicant(id: string, review: TupadApplicantReview): Promise<TupadApplicantRow> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('tupad_applicants')
      .update(review)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to update the TUPAD applicant')
    return data
  },

  async bulkUpdateTupadApplicantStatus(ids: string[], status: TupadApplicantStatus): Promise<TupadApplicantRow[]> {
    const updated: TupadApplicantRow[] = []
    for (let i = 0; i < ids.length; i += IN_FILTER_CHUNK_SIZE) {
      const { data, error } = await supabase
        .schema('esmdd')
        .from('tupad_applicants')
        .update({ status })
        .in('id', ids.slice(i, i + IN_FILTER_CHUNK_SIZE))
        .select()

      if (error) throw new Error(error.message || 'Failed to update the TUPAD applicants')
      updated.push(...(data ?? []))
    }
    return updated
  },

  /**
   * Deletes TUPAD applicants. Anyone already added to a batch is skipped — deleting them would also
   * delete their beneficiary record and daily attachments (ON DELETE CASCADE).
   * Returns the deleted rows (with their registry applicant ids) and the skipped ids.
   */
  async deleteTupadApplicants(
    ids: string[]
  ): Promise<{ deleted: Pick<TupadApplicantRow, 'id' | 'applicant_id'>[]; skippedIds: string[] }> {
    const { data: engagements, error: engagementErr } = await fetchAllInChunks(ids, (chunk) =>
      supabase.schema('esmdd').from('tupad').select('tupad_applicant_id').in('tupad_applicant_id', chunk).order('id')
    )
    if (engagementErr) throw new Error(engagementErr.message || 'Failed to check TUPAD batches')
    const engaged = new Set(engagements.map((row) => row.tupad_applicant_id))

    const deletable = ids.filter((id) => !engaged.has(id))
    const deleted: Pick<TupadApplicantRow, 'id' | 'applicant_id'>[] = []
    for (let i = 0; i < deletable.length; i += IN_FILTER_CHUNK_SIZE) {
      const { data, error } = await supabase
        .schema('esmdd')
        .from('tupad_applicants')
        .delete()
        .in('id', deletable.slice(i, i + IN_FILTER_CHUNK_SIZE))
        .select('id, applicant_id')
      if (error) throw new Error(error.message || 'Failed to delete the TUPAD applicants')
      deleted.push(...(data ?? []))
    }

    return { deleted, skippedIds: [...engaged] }
  },

  /**
   * Register a registry applicant as a TUPAD applicant (referred_programs includes TUPAD).
   * Returns the existing row when they are already registered.
   */
  async referToTupad(applicantId: string): Promise<TupadApplicantRow> {
    const { data: existing, error: lookupErr } = await supabase
      .schema('esmdd')
      .from('tupad_applicants')
      .select('*')
      .eq('applicant_id', applicantId)
      .maybeSingle()

    if (lookupErr) throw new Error(lookupErr.message || 'Failed to look up the TUPAD applicant')
    if (existing) return existing

    const { data, error } = await supabase
      .schema('esmdd')
      .from('tupad_applicants')
      .insert({ applicant_id: applicantId, status: 'Pending', doc_submitted: [TUPAD_LOCKED_DOCUMENT] })
      .select()
      .single()

    if (error) {
      console.error('[tupadService] Failed to insert into esmdd.tupad_applicants:', error.message)
      throw new Error(error.message || 'Failed to register applicant under TUPAD')
    }
    return data
  },

  /**
   * Remove a TUPAD referral when TUPAD is unchecked.
   * Business Policy: only a 'Pending' TUPAD applicant who was never added to a batch is deleted;
   * anyone reviewed or engaged keeps their record.
   */
  async unreferFromTupad(applicantId: string): Promise<{ deleted: boolean; reason?: string }> {
    const { data: tupadApp, error: fetchErr } = await supabase
      .schema('esmdd')
      .from('tupad_applicants')
      .select('id, status')
      .eq('applicant_id', applicantId)
      .maybeSingle()

    if (fetchErr || !tupadApp) return { deleted: false, reason: 'No TUPAD applicant record found' }
    if (tupadApp.status !== 'Pending') {
      return { deleted: false, reason: `TUPAD applicant status is '${tupadApp.status}'. Historical records are kept intact.` }
    }

    const { data: engagements, error: depErr } = await supabase
      .schema('esmdd')
      .from('tupad')
      .select('id')
      .eq('tupad_applicant_id', tupadApp.id)
      .limit(1)

    if (depErr) return { deleted: false, reason: depErr.message }
    if (engagements && engagements.length > 0) {
      return { deleted: false, reason: 'Applicant is already part of a TUPAD batch.' }
    }

    const { error: delErr } = await supabase.schema('esmdd').from('tupad_applicants').delete().eq('id', tupadApp.id)
    if (delErr) {
      console.error('[tupadService] Failed to delete esmdd.tupad_applicants row:', delErr.message)
      return { deleted: false, reason: delErr.message }
    }
    return { deleted: true }
  },

  /** True when the registry applicant has been added to any TUPAD batch. */
  async hasTupadEngagement(applicantId: string): Promise<boolean> {
    const { data: tupadApp, error } = await supabase
      .schema('esmdd')
      .from('tupad_applicants')
      .select('id')
      .eq('applicant_id', applicantId)
      .maybeSingle()

    if (error) throw new Error(error.message || 'Failed to check TUPAD referrals.')
    if (!tupadApp) return false

    const { data, error: engErr } = await supabase
      .schema('esmdd')
      .from('tupad')
      .select('id')
      .eq('tupad_applicant_id', tupadApp.id)
      .limit(1)

    if (engErr) throw new Error(engErr.message || 'Failed to check TUPAD batches.')
    return (data ?? []).length > 0
  },

  // ─── Batch members (esmdd.tupad) ───

  async fetchBatchMembers(batchId: string): Promise<TupadMember[]> {
    const { data, error } = await fetchAllPages(() =>
      supabase
        .schema('esmdd')
        .from('tupad')
        .select('*, tupad_applicants(*)')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: true })
        .order('id')
    )

    if (error) throw new Error(error.message || 'Failed to load the batch beneficiaries')

    const rows = data ?? []
    const registry = await fetchRegistryApplicants(
      rows.flatMap((row) => (row.tupad_applicants ? [row.tupad_applicants.applicant_id] : []))
    )

    return rows.map(({ tupad_applicants, ...member }) => ({
      ...member,
      tupad_applicant: tupad_applicants
        ? { ...tupad_applicants, applicant: registry.get(tupad_applicants.applicant_id) ?? null }
        : null,
    }))
  },

  /** TUPAD applicant ids with an Active engagement in any batch — they cannot join another batch yet. */
  async fetchActiveTupadApplicantIds(): Promise<string[]> {
    const { data, error } = await fetchAllPages(() =>
      supabase.schema('esmdd').from('tupad').select('tupad_applicant_id').eq('status', 'Active').order('id')
    )
    if (error) throw new Error(error.message || 'Failed to check active TUPAD engagements')
    return [...new Set((data ?? []).map((row) => row.tupad_applicant_id))]
  },

  async addApplicantsToBatch(batchId: string, tupadApplicantIds: string[], daysDuration: number): Promise<TupadRow[]> {
    const payload: TupadInsert[] = tupadApplicantIds.map((tupadApplicantId) => ({
      batch_id: batchId,
      tupad_applicant_id: tupadApplicantId,
      days_duration: daysDuration,
      status: 'Active',
    }))

    const { data, error } = await supabase.schema('esmdd').from('tupad').insert(payload).select()

    if (error) {
      if (error.code === '23505') throw new Error('One or more of the selected applicants are already in this batch.')
      // 23514 = check_violation from trg_tupad_guard_batch_requirements (missing income / documents)
      throw new Error(error.message || 'Failed to add beneficiaries to the batch')
    }
    return data ?? []
  },

  async updateMember(id: string, values: TupadMemberFormValues): Promise<TupadRow> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('tupad')
      .update({ ...values, remarks: values.remarks?.trim() || null })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to update the beneficiary')
    return data
  },

  /** Daily attachments a beneficiary uploaded (`esmdd.tupad_attachments`), oldest first, with signed URLs for viewing. */
  async fetchMemberAttachments(tupadId: string): Promise<TupadAttachmentWithUrl[]> {
    const { data, error } = await fetchAllPages(() =>
      supabase
        .schema('esmdd')
        .from('tupad_attachments')
        .select('*')
        .eq('tupad_id', tupadId)
        .order('created_at', { ascending: true })
        .order('id')
    )

    if (error) throw new Error(error.message || 'Failed to load the beneficiary attachments')

    const rows = data ?? []
    if (rows.length === 0) return []

    const { data: signed, error: signError } = await supabase.storage
      .from(DOCUMENT_UPLOAD_BUCKET)
      .createSignedUrls(
        rows.map((row) => row.path),
        SIGNED_URL_TTL_SECONDS
      )
    // Rows still show without a link if signing fails (e.g. the file was removed from storage)
    if (signError) console.warn('[tupadService] Failed to sign attachment URLs:', signError.message)

    const urlByPath = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]))
    return rows.map((row) => ({ ...row, url: urlByPath.get(row.path) ?? null }))
  },

  /** Removing an engagement also removes its attachments (ON DELETE CASCADE). */
  async removeMember(id: string): Promise<void> {
    const { error } = await supabase.schema('esmdd').from('tupad').delete().eq('id', id)
    if (error) throw new Error(error.message || 'Failed to remove the beneficiary from the batch')
  },
}
