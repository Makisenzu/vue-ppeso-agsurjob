import { supabase } from '@/lib/supabaseClient'
import { getOrSetPersistentCache, removePersistentCacheValue } from '@/helpers/common/persistentCache'
import type {
  ApplicantInsert,
  ApplicantRow,
  ApplicantUpdate,
  ExistingApplicantMatch,
  ProgramReferralSummary,
} from '@/types/peso/provincialPeso/applicantEntry'
import type { GipApplicantInsert, GipApplicantRow } from '@/types/peso/provincialPeso/gip'
import type { SpesFormRow } from '@/types/peso/provincialPeso/spes'
import type { SpesFormTableInsert, SpesFormTableUpdate } from '@/types/common/spesForm'
import { invalidateGipCaches } from '@/helpers/peso/provincialPeso/gipHelper'
import { buildSpesFormPrefill, pickBlankSpesFields } from '@/helpers/peso/provincialPeso/spesHelper'
import { hasTupadReferral } from '@/helpers/peso/provincialPeso/tupadHelper'
import { tupadService } from '@/services/peso/provincialPeso/tupadService'

export const APPLICANT_ENTRY_CACHE_KEY = 'peso:applicant-entry:applicants'
const APPLICANT_ENTRY_CACHE_TTL_MS = 1000 * 60 * 15 // 15 minutes

export function invalidateApplicantEntryCache(): void {
  removePersistentCacheValue(APPLICANT_ENTRY_CACHE_KEY)
}

/**
 * Normalizes applicant employment fields to strictly conform to database check constraints.
 * The constraint "applicants_employment_status_check" requires employment_status to be
 * 'Employed' or 'Unemployed'. Self-employment is represented as:
 * employment_status: 'Employed' and employment_type: 'Self-employed'.
 */
function normalizeApplicantEmploymentPayload<T extends Record<string, any>>(payload: T): T {
  const result: Record<string, any> = { ...payload }
  if (result.employment_status !== undefined) {
    const raw = String(result.employment_status || '').trim().toLowerCase()
    if (raw.includes('self')) {
      result.employment_status = 'Employed'
      if (!result.employment_type) {
        result.employment_type = 'Self-employed'
      }
    } else if (raw.includes('unemployed')) {
      result.employment_status = 'Unemployed'
    } else if (raw.includes('employed')) {
      result.employment_status = 'Employed'
    } else if (!raw) {
      result.employment_status = 'Unemployed'
    }
  }
  return result as T
}

export const applicantEntryService = {
  /**
   * Fetch all applicant records from applicants.applicants schema with persistent cache
   */
  async fetchAllApplicants(forceRefresh = false): Promise<ApplicantRow[]> {
    if (forceRefresh) {
      removePersistentCacheValue(APPLICANT_ENTRY_CACHE_KEY)
    }

    return getOrSetPersistentCache(APPLICANT_ENTRY_CACHE_KEY, APPLICANT_ENTRY_CACHE_TTL_MS, async () => {
      const { data, error } = await supabase
        .schema('applicants')
        .from('applicants')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(error.message || 'Failed to fetch applicants registry data')
      }

      return (data ?? []) as ApplicantRow[]
    })
  },

  /**
   * Fetch a single applicant record by ID
   */
  async fetchApplicantById(id: string): Promise<ApplicantRow | null> {
    const { data, error } = await supabase
      .schema('applicants')
      .from('applicants')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      throw new Error(error.message || `Failed to fetch applicant with ID ${id}`)
    }

    return data as ApplicantRow | null
  },

  /**
   * Refer an applicant to GIP by inserting a record into esmdd.gip_applicants
   */
  async referToGip(applicant: ApplicantRow): Promise<GipApplicantRow | null> {
    const payload: GipApplicantInsert = {
      applicant_id: applicant.id,
      status: 'Pending',
      document_submitted: ['NSRP Form 1'],
      remarks: ['Referred via Provincial PESO Applicant Registry'],
    }

    // Check if referral record already exists to prevent duplicate entries
    const { data: existing } = await supabase
      .schema('esmdd')
      .from('gip_applicants')
      .select('*')
      .eq('applicant_id', applicant.id)
      .maybeSingle()

    if (existing) {
      return existing as GipApplicantRow
    }

    const { data, error } = await supabase
      .schema('esmdd')
      .from('gip_applicants')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('[applicantEntryService] Failed to insert into esmdd.gip_applicants:', error.message)
      throw new Error(error.message || 'Failed to register applicant under GIP')
    }

    // Writing a partial list here would replace the full cached registry; invalidate so the next fetch caches the complete list
    invalidateGipCaches({ applicants: true })

    return data as GipApplicantRow
  },

  /**
   * Refer an applicant to SPES by creating their applicants.spes_form from the registry record.
   * An existing form (by registry applicant, then by account) only gets its blank fields filled,
   * so whatever PESO or the applicant already encoded is never overwritten.
   */
  async referToSpes(applicant: ApplicantRow): Promise<Pick<SpesFormRow, 'id'>> {
    const prefill = buildSpesFormPrefill(applicant)

    const findForm = (column: 'applicant_id' | 'profile_id', value: string) =>
      supabase
        .schema('applicants')
        .from('spes_form')
        .select('*')
        .eq(column, value)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    let { data: existing, error: lookupErr } = await findForm('applicant_id', applicant.id)
    if (!lookupErr && !existing && applicant.profile_id) {
      ;({ data: existing, error: lookupErr } = await findForm('profile_id', applicant.profile_id))
    }
    if (lookupErr) throw new Error(lookupErr.message || 'Failed to look up the SPES application form')

    if (existing) {
      const patch = {
        ...pickBlankSpesFields(existing, prefill),
        ...(existing.applicant_id ? {} : { applicant_id: applicant.id }),
      }
      if (Object.keys(patch).length === 0) return { id: existing.id }

      const { error } = await supabase.schema('applicants').from('spes_form').update(patch as SpesFormTableUpdate).eq('id', existing.id)
      if (error) {
        console.error('[applicantEntryService] Failed to update applicants.spes_form:', error.message)
        throw new Error(error.message || 'Failed to update the SPES application form')
      }
      return { id: existing.id }
    }

    const { data, error } = await supabase
      .schema('applicants')
      .from('spes_form')
      .insert({ ...prefill, applicant_id: applicant.id, profile_id: applicant.profile_id } as SpesFormTableInsert)
      .select('id')
      .single()

    if (error) {
      console.error('[applicantEntryService] Failed to insert into applicants.spes_form:', error.message)
      throw new Error(error.message || 'Failed to register applicant under SPES')
    }

    return data
  },

  /**
   * Safely unrefer an applicant from SPES by deleting the SPES form PESO created for them.
   * Business Policy:
   * Only deletes forms without a user account (the applicant's own submissions are kept),
   * still 'Pending', and with no beneficiary record in esmdd.spes.
   */
  async unreferFromSpes(applicantId: string): Promise<{ deleted: boolean; reason?: string }> {
    const { data: spesForm, error: fetchErr } = await supabase
      .schema('applicants')
      .from('spes_form')
      .select('id, profile_id, status')
      .eq('applicant_id', applicantId)
      .maybeSingle()

    if (fetchErr || !spesForm) return { deleted: false, reason: 'No SPES application form found' }
    if (spesForm.profile_id) return { deleted: false, reason: 'The SPES form belongs to the applicant account.' }
    if (spesForm.status !== 'Pending') {
      return { deleted: false, reason: `SPES form status is '${spesForm.status}'. Historical records are kept intact.` }
    }

    const { data: beneficiary, error: depErr } = await supabase
      .schema('esmdd')
      .from('spes')
      .select('id')
      .eq('application_id', spesForm.id)
      .limit(1)

    if (depErr) return { deleted: false, reason: depErr.message }
    if (beneficiary && beneficiary.length > 0) {
      return { deleted: false, reason: 'Applicant is already enrolled as a SPES beneficiary.' }
    }

    const { error: delErr } = await supabase.schema('applicants').from('spes_form').delete().eq('id', spesForm.id)
    if (delErr) {
      console.error('[applicantEntryService] Failed to delete applicants.spes_form row:', delErr.message)
      return { deleted: false, reason: delErr.message }
    }

    return { deleted: true }
  },

  /**
   * Check referred_programs and automatically route to corresponding ESMDD program tables
   */
  async processReferrals(applicant: ApplicantRow): Promise<ProgramReferralSummary[]> {
    const results: ProgramReferralSummary[] = []
    const programs = (applicant.referred_programs || []).map((p) => (p || '').trim().toUpperCase())

    if (programs.length === 0) {
      return results
    }

    // 1. GIP Referral check -> esmdd.gip_applicants
    if (programs.some((p) => p.includes('GIP'))) {
      try {
        const gipRow = await this.referToGip(applicant)
        results.push({
          program: 'GIP',
          targetTable: 'esmdd.gip_applicants',
          success: true,
          recordId: gipRow?.id,
          gipRow,
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        results.push({
          program: 'GIP',
          targetTable: 'esmdd.gip_applicants',
          success: false,
          error: message,
        })
      }
    }

    // 2. SPES Referral check -> applicants.spes_form
    if (programs.some((p) => p.includes('SPES'))) {
      try {
        const spesRow = await this.referToSpes(applicant)
        results.push({
          program: 'SPES',
          targetTable: 'applicants.spes_form',
          success: true,
          recordId: spesRow?.id,
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        results.push({
          program: 'SPES',
          targetTable: 'applicants.spes_form',
          success: false,
          error: message,
        })
      }
    }

    // 3. TUPAD Referral check -> esmdd.tupad_applicants
    if (hasTupadReferral(programs)) {
      try {
        const tupadRow = await tupadService.referToTupad(applicant.id)
        results.push({
          program: 'TUPAD',
          targetTable: 'esmdd.tupad_applicants',
          success: true,
          recordId: tupadRow.id,
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        results.push({
          program: 'TUPAD',
          targetTable: 'esmdd.tupad_applicants',
          success: false,
          error: message,
        })
      }
    }

    return results
  },

  /**
   * Create a new applicant record in applicants.applicants schema
   * and subsequently check & route to program tables (e.g. esmdd.gip_applicants, applicants.spes_form)
   */
  async createApplicant(payload: ApplicantInsert): Promise<ApplicantRow> {
    const sanitizedPayload = normalizeApplicantEmploymentPayload(payload)

    const { data, error } = await supabase
      .schema('applicants')
      .from('applicants')
      .insert(sanitizedPayload)
      .select()
      .single()

    if (error) {
      throw new Error(error.message || 'Failed to register new applicant')
    }

    const createdApplicant = data as ApplicantRow

    // Invalidate cached applicant list on mutation
    removePersistentCacheValue(APPLICANT_ENTRY_CACHE_KEY)

    // Automatically check what the applicant has been referred to and insert into ESMDD tables
    try {
      await this.processReferrals(createdApplicant)
    } catch (referralErr: unknown) {
      console.error('[applicantEntryService] Non-blocking referral dispatch error:', referralErr)
    }

    return createdApplicant
  },

  /**
   * Check if an applicant already exists in applicants.applicants by first name, surname, and optional DOB/middle name
   */
  async checkApplicantExists(criteria: {
    firstName: string
    surname: string
    middleName?: string
    dateOfBirth?: string
  }): Promise<ExistingApplicantMatch | null> {
    const fName = criteria.firstName?.trim()
    const sName = criteria.surname?.trim()
    if (!fName || !sName) return null

    const { data, error } = await supabase
      .schema('applicants')
      .from('applicants')
      .select('*')
      .ilike('first_name', fName)
      .ilike('surname', sName)

    if (error || !data || data.length === 0) {
      return null
    }

    const targetDob = criteria.dateOfBirth ? criteria.dateOfBirth.trim().split('T')[0] : ''
    const targetMiddle = (criteria.middleName || '').trim().toLowerCase()

    // 1. Exact match with date_of_birth
    if (targetDob) {
      const exactDobMatch = data.find((row) => (row.date_of_birth || '').trim().split('T')[0] === targetDob)
      if (exactDobMatch) {
        return {
          existingApplicant: exactDobMatch as ApplicantRow,
          matchedBy: 'name_and_dob',
          confidence: 'exact',
          existingPrograms: (exactDobMatch.referred_programs || []) as string[],
        }
      }
    }

    // 2. Match with middle name
    if (targetMiddle) {
      const middleMatch = data.find((row) => (row.middle_name || '').trim().toLowerCase() === targetMiddle)
      if (middleMatch) {
        return {
          existingApplicant: middleMatch as ApplicantRow,
          matchedBy: 'name_only',
          confidence: 'high',
          existingPrograms: (middleMatch.referred_programs || []) as string[],
        }
      }
    }

    // 3. Fallback to first name match
    const candidateRow = data[0] as ApplicantRow
    return {
      existingApplicant: candidateRow,
      matchedBy: 'name_only',
      confidence: targetDob ? 'possible' : 'high',
      existingPrograms: (candidateRow.referred_programs || []) as string[],
    }
  },

  /**
   * Batch check candidate list against applicants.applicants
   */
  async checkApplicantsBatchExists(
    candidates: Array<{ firstName: string; surname: string; middleName?: string; dateOfBirth?: string }>
  ): Promise<Map<number, ExistingApplicantMatch>> {
    const resultMap = new Map<number, ExistingApplicantMatch>()
    if (!candidates || candidates.length === 0) return resultMap

    const uniqueSurnames = Array.from(
      new Set(candidates.map((c) => c.surname?.trim()).filter(Boolean))
    )

    if (uniqueSurnames.length === 0) return resultMap

    const { data: existingRows, error } = await supabase
      .schema('applicants')
      .from('applicants')
      .select('*')
      .in('surname', uniqueSurnames)

    if (error || !existingRows || existingRows.length === 0) {
      return resultMap
    }

    candidates.forEach((cand, idx) => {
      const cFirst = (cand.firstName || '').trim().toLowerCase()
      const cSur = (cand.surname || '').trim().toLowerCase()
      const cDob = cand.dateOfBirth ? cand.dateOfBirth.trim().split('T')[0] : ''
      const cMid = (cand.middleName || '').trim().toLowerCase()

      if (!cFirst || !cSur) return

      const nameMatches = existingRows.filter(
        (r) => (r.first_name || '').trim().toLowerCase() === cFirst && (r.surname || '').trim().toLowerCase() === cSur
      )

      if (nameMatches.length === 0) return

      let bestMatch: ApplicantRow | null = null
      let matchedBy: 'name_and_dob' | 'name_only' = 'name_only'
      let confidence: 'exact' | 'high' | 'possible' = 'possible'

      if (cDob) {
        const dobMatch = nameMatches.find((r) => (r.date_of_birth || '').trim().split('T')[0] === cDob)
        if (dobMatch) {
          bestMatch = dobMatch as ApplicantRow
          matchedBy = 'name_and_dob'
          confidence = 'exact'
        }
      }

      if (!bestMatch && cMid) {
        const midMatch = nameMatches.find((r) => (r.middle_name || '').trim().toLowerCase() === cMid)
        if (midMatch) {
          bestMatch = midMatch as ApplicantRow
          confidence = 'high'
        }
      }

      if (!bestMatch) {
        bestMatch = nameMatches[0] as ApplicantRow
        confidence = cDob ? 'possible' : 'high'
      }

      resultMap.set(idx, {
        existingApplicant: bestMatch,
        matchedBy,
        confidence,
        existingPrograms: (bestMatch.referred_programs || []) as string[],
      })
    })

    return resultMap
  },

  /**
   * Link an existing applicant to a new program or offer (e.g. GIP, SPES, Job Fair),
   * updates referred_programs in applicants.applicants, and routes to ESMDD tables.
   */
  async linkApplicantToProgram(
    applicantId: string,
    newProgram: string,
    options?: {
      additionalRemarks?: string
      updateData?: Partial<ApplicantUpdate>
    }
  ): Promise<{ applicant: ApplicantRow; referralResults: ProgramReferralSummary[] }> {
    const existing = await this.fetchApplicantById(applicantId)
    if (!existing) {
      throw new Error(`Applicant with ID ${applicantId} not found`)
    }

    const currentPrograms = (existing.referred_programs || []) as string[]
    const formattedNewProgram = newProgram.trim()

    // Add new program if not already present (case-insensitive check)
    const existsAlready = currentPrograms.some(
      (p) => p.toUpperCase() === formattedNewProgram.toUpperCase()
    )
    const updatedPrograms = existsAlready
      ? currentPrograms
      : [...currentPrograms, formattedNewProgram]

    const updatePayload: ApplicantUpdate = {
      ...(options?.updateData || {}),
      referred_programs: updatedPrograms,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .schema('applicants')
      .from('applicants')
      .update(updatePayload)
      .eq('id', applicantId)
      .select()
      .single()

    if (error) {
      throw new Error(error.message || `Failed to link applicant to ${formattedNewProgram}`)
    }

    const updatedApplicant = data as ApplicantRow
    removePersistentCacheValue(APPLICANT_ENTRY_CACHE_KEY)
    invalidateGipCaches({ applicants: true })

    // Automatically check what the applicant has been referred to and route to ESMDD tables
    let referralResults: ProgramReferralSummary[] = []
    try {
      referralResults = await this.processReferrals(updatedApplicant)
    } catch (referralErr: unknown) {
      console.error('[applicantEntryService] Non-blocking referral dispatch error:', referralErr)
    }

    return {
      applicant: updatedApplicant,
      referralResults,
    }
  },

  /**
   * Update an existing applicant record in applicants.applicants.
   * Used by inline per-section editing in ApplicantNsrpDetails.
   */
  async updateApplicant(applicantId: string, payload: ApplicantUpdate): Promise<ApplicantRow> {
    const cleanPayload: Record<string, any> = {}
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined) {
        cleanPayload[key] = value
      }
    }
    cleanPayload.updated_at = new Date().toISOString()
    const sanitizedPayload = normalizeApplicantEmploymentPayload(cleanPayload)

    const { data, error } = await supabase
      .schema('applicants')
      .from('applicants')
      .update(sanitizedPayload as ApplicantUpdate)
      .eq('id', applicantId)
      .select()
      .maybeSingle()

    if (error) {
      throw new Error(error.message || 'Failed to update applicant record')
    }

    if (!data) {
      // Check if applicant exists in DB to verify RLS issue vs non-existent row
      const { data: existing } = await supabase
        .schema('applicants')
        .from('applicants')
        .select('id')
        .eq('id', applicantId)
        .maybeSingle()

      if (!existing) {
        throw new Error(`Applicant record (${applicantId}) was not found in the database.`)
      }

      throw new Error(
        'Update affected 0 rows. Please execute migration 004_applicants_peso_policy.sql in your Supabase SQL Editor to grant PESO role UPDATE permission on applicants.applicants.'
      )
    }

    const updatedApplicant = data as ApplicantRow
    removePersistentCacheValue(APPLICANT_ENTRY_CACHE_KEY)

    // Synchronize referred programs with ESMDD program tables if referred_programs was updated
    if ('referred_programs' in cleanPayload) {
      const currentPrograms = ((updatedApplicant.referred_programs || []) as string[]).map((p) =>
        (p || '').trim().toUpperCase()
      )
      const hasGip = currentPrograms.some((p) => p.includes('GIP'))
      const hasSpes = currentPrograms.some((p) => p.includes('SPES'))
      const hasTupad = hasTupadReferral(currentPrograms)

      if (hasGip) {
        try {
          await this.referToGip(updatedApplicant)
          invalidateGipCaches({ applicants: true })
        } catch (referralErr: unknown) {
          console.error('[applicantEntryService] Failed to auto-route to GIP on update:', referralErr)
        }
      } else {
        try {
          await this.unreferFromGip(applicantId)
        } catch (unreferErr: unknown) {
          console.error('[applicantEntryService] Failed to unrefer from GIP on update:', unreferErr)
        }
      }

      if (hasSpes) {
        try {
          await this.referToSpes(updatedApplicant)
        } catch (spesErr: unknown) {
          console.error('[applicantEntryService] Failed to auto-route to SPES on update:', spesErr)
        }
      } else {
        try {
          await this.unreferFromSpes(applicantId)
        } catch (unreferErr: unknown) {
          console.error('[applicantEntryService] Failed to unrefer from SPES on update:', unreferErr)
        }
      }

      if (hasTupad) {
        try {
          await tupadService.referToTupad(applicantId)
        } catch (tupadErr: unknown) {
          console.error('[applicantEntryService] Failed to auto-route to TUPAD on update:', tupadErr)
        }
      } else {
        try {
          await tupadService.unreferFromTupad(applicantId)
        } catch (unreferErr: unknown) {
          console.error('[applicantEntryService] Failed to unrefer from TUPAD on update:', unreferErr)
        }
      }
    }

    return updatedApplicant
  },

  /**
   * Safely unrefer an applicant from GIP by deleting from esmdd.gip_applicants.
   * Business Policy:
   * Only deletes if the applicant's status is 'Pending' AND they have no deployment records in esmdd.gips.
   * Otherwise preserves the historical record intact.
   */
  async unreferFromGip(applicantId: string): Promise<{ deleted: boolean; reason?: string }> {
    try {
      const { data: gipApp, error: fetchErr } = await supabase
        .schema('esmdd')
        .from('gip_applicants')
        .select('id, status')
        .eq('applicant_id', applicantId)
        .maybeSingle()

      if (fetchErr || !gipApp) {
        return { deleted: false, reason: 'No GIP application record found' }
      }

      // 1. Only allow deletion if status is Pending
      if (gipApp.status !== 'Pending') {
        return {
          deleted: false,
          reason: `Applicant status is '${gipApp.status}'. Historical records are kept intact.`,
        }
      }

      // 2. Check if applicant has any deployment records in esmdd.gips
      const { data: deployments, error: depErr } = await supabase
        .schema('esmdd')
        .from('gips')
        .select('id')
        .eq('application_id', gipApp.id)

      if (depErr) {
        console.warn('[applicantEntryService] Error checking deployments in esmdd.gips:', depErr.message)
        return { deleted: false, reason: 'Failed to verify deployment status' }
      }

      if (deployments && deployments.length > 0) {
        return {
          deleted: false,
          reason: 'Applicant has existing deployment records in esmdd.gips and cannot be automatically deleted.',
        }
      }

      // 3. Safe to delete from esmdd.gip_applicants
      const { error: delErr } = await supabase
        .schema('esmdd')
        .from('gip_applicants')
        .delete()
        .eq('id', gipApp.id)

      if (delErr) {
        console.error('[applicantEntryService] Failed to delete esmdd.gip_applicants row:', delErr.message)
        return { deleted: false, reason: delErr.message }
      }

      invalidateGipCaches({ applicants: true })
      return { deleted: true }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('[applicantEntryService] Non-blocking unrefer error:', msg)
      return { deleted: false, reason: msg }
    }
  },

  /**
   * Untick TUPAD in referred_programs after PESO deletes these applicants' TUPAD applications,
   * so the registry and the TUPAD list stay in step (and the next edit does not re-add them).
   */
  async removeTupadReferrals(applicantIds: string[]): Promise<void> {
    if (applicantIds.length === 0) return

    const { data, error } = await supabase
      .schema('applicants')
      .from('applicants')
      .select('id, referred_programs')
      .in('id', applicantIds)

    if (error) throw new Error(error.message || 'Failed to load the referred programs')

    for (const row of data ?? []) {
      const programs = (row.referred_programs ?? []) as string[]
      if (!hasTupadReferral(programs)) continue

      const { error: updateErr } = await supabase
        .schema('applicants')
        .from('applicants')
        .update({ referred_programs: programs.filter((p) => !hasTupadReferral([p])), updated_at: new Date().toISOString() })
        .eq('id', row.id)

      if (updateErr) throw new Error(updateErr.message || 'Failed to update the referred programs')
    }

    removePersistentCacheValue(APPLICANT_ENTRY_CACHE_KEY)
  },

  /**
   * Permanently delete an applicant from applicants.applicants together with their GIP/SPES referrals.
   * Blocked when the applicant is linked to a user account or already has a GIP/SPES deployment.
   */
  async deleteApplicant(applicantId: string): Promise<void> {
    await this.deleteApplicantRecord(applicantId)
    removePersistentCacheValue(APPLICANT_ENTRY_CACHE_KEY)
    invalidateGipCaches({ applicants: true })
  },

  async bulkDeleteApplicants(
    applicantIds: string[]
  ): Promise<{ deletedIds: string[]; errors: string[] }> {
    const deletedIds: string[] = []
    const errors: string[] = []

    for (const id of applicantIds) {
      try {
        await this.deleteApplicantRecord(id)
        deletedIds.push(id)
      } catch (err: unknown) {
        errors.push(err instanceof Error ? err.message : `Failed to delete applicant ${id}`)
      }
    }

    if (deletedIds.length > 0) {
      removePersistentCacheValue(APPLICANT_ENTRY_CACHE_KEY)
      invalidateGipCaches({ applicants: true })
    }

    return { deletedIds, errors }
  },

  async deleteApplicantRecord(applicantId: string): Promise<void> {
    const { data: applicant, error: fetchErr } = await supabase
      .schema('applicants')
      .from('applicants')
      .select('id, profile_id, first_name, surname')
      .eq('id', applicantId)
      .maybeSingle()

    if (fetchErr) throw new Error(fetchErr.message || 'Failed to load applicant before deletion.')
    if (!applicant) throw new Error('Applicant record was not found.')

    const label = [applicant.first_name, applicant.surname].filter(Boolean).join(' ') || 'Applicant'

    if (applicant.profile_id) {
      throw new Error(`${label} is linked to a registered user account and cannot be deleted from the registry.`)
    }

    // The applicant's SPES form (applicant_id) is removed by ON DELETE CASCADE with the master row
    const [gipRes, spesRes] = await Promise.all([
      supabase.schema('esmdd').from('gip_applicants').select('id').eq('applicant_id', applicantId),
      supabase.schema('applicants').from('spes_form').select('id').eq('applicant_id', applicantId),
    ])

    if (gipRes.error) throw new Error(gipRes.error.message || 'Failed to check GIP referrals.')
    if (spesRes.error) throw new Error(spesRes.error.message || 'Failed to check SPES referrals.')

    const spesFormIds = (spesRes.data ?? []).map((r) => r.id)
    if (spesFormIds.length > 0) {
      const { data, error } = await supabase
        .schema('esmdd')
        .from('spes')
        .select('id')
        .in('application_id', spesFormIds)
        .limit(1)
      if (error) throw new Error(error.message || 'Failed to check SPES beneficiaries.')
      if (data && data.length > 0) {
        throw new Error(`${label} is enrolled as a SPES beneficiary and cannot be deleted.`)
      }
    }

    // The TUPAD applicant row cascades with the master row; a batch engagement would cascade too, so block it
    if (await tupadService.hasTupadEngagement(applicantId)) {
      throw new Error(`${label} is part of a TUPAD batch and cannot be deleted.`)
    }

    const gipAppIds = (gipRes.data ?? []).map((r) => r.id)

    if (gipAppIds.length > 0) {
      const { data, error } = await supabase
        .schema('esmdd')
        .from('gips')
        .select('id')
        .in('application_id', gipAppIds)
        .limit(1)
      if (error) throw new Error(error.message || 'Failed to check GIP deployments.')
      if (data && data.length > 0) {
        throw new Error(`${label} has a GIP deployment record and cannot be deleted.`)
      }
    }

    const deleteReferrals = async () => {
      if (gipAppIds.length > 0) {
        const { error } = await supabase.schema('esmdd').from('gip_applicants').delete().in('id', gipAppIds)
        if (error) throw new Error(error.message || 'Failed to remove GIP referral.')
      }
    }

    const deleteMaster = () =>
      supabase.schema('applicants').from('applicants').delete().eq('id', applicantId).select('id')

    // Master row goes first so an RLS denial (0 rows, no error) leaves the referrals untouched
    let { data: deleted, error: delErr } = await deleteMaster()

    // 23503 = foreign key violation: referrals must be removed before the master row
    if (delErr?.code === '23503') {
      await deleteReferrals()
      ;({ data: deleted, error: delErr } = await deleteMaster())
    } else if (!delErr && deleted && deleted.length > 0) {
      // Cross-schema FKs may not cascade; clear any remaining referrals so no orphans stay in ESMDD
      try {
        await deleteReferrals()
      } catch (cleanupErr) {
        console.warn('[applicantEntryService] Applicant deleted but referral cleanup failed:', cleanupErr)
      }
    }

    if (delErr) throw new Error(delErr.message || `Failed to delete ${label}.`)
    if (!deleted || deleted.length === 0) {
      throw new Error(
        'Delete affected 0 rows. Please execute migration 005_applicants_peso_delete_policy.sql in your Supabase SQL Editor to grant DELETE permission on applicants.applicants.'
      )
    }
  },
}
