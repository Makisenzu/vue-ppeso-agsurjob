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
import type { SpesApplicantInsert, SpesApplicantRow } from '@/types/peso/provincialPeso/spes'

export const APPLICANT_ENTRY_CACHE_KEY = 'peso:applicant-entry:applicants'
const APPLICANT_ENTRY_CACHE_TTL_MS = 1000 * 60 * 15 // 15 minutes

export function invalidateApplicantEntryCache(): void {
  removePersistentCacheValue(APPLICANT_ENTRY_CACHE_KEY)
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

    return data as GipApplicantRow
  },

  /**
   * Refer an applicant to SPES by inserting a record into esmdd.spes_applicants
   */
  async referToSpes(applicant: ApplicantRow): Promise<SpesApplicantRow | null> {
    const payload: SpesApplicantInsert = {
      applicant_id: applicant.id,
      status: 'Pending',
      beneficiary: applicant.is_4ps_beneficiary ? '4Ps Beneficiary' : 'Student / Out-of-School Youth',
      remarks: 'Referred via Provincial PESO Applicant Registry',
    }

    // Check if referral record already exists to prevent duplicate entries
    const { data: existing } = await supabase
      .schema('esmdd')
      .from('spes_applicants')
      .select('*')
      .eq('applicant_id', applicant.id)
      .maybeSingle()

    if (existing) {
      return existing as SpesApplicantRow
    }

    const { data, error } = await supabase
      .schema('esmdd')
      .from('spes_applicants')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('[applicantEntryService] Failed to insert into esmdd.spes_applicants:', error.message)
      throw new Error(error.message || 'Failed to register applicant under SPES')
    }

    return data as SpesApplicantRow
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

    // 2. SPES Referral check -> esmdd.spes_applicants
    if (programs.some((p) => p.includes('SPES'))) {
      try {
        const spesRow = await this.referToSpes(applicant)
        results.push({
          program: 'SPES',
          targetTable: 'esmdd.spes_applicants',
          success: true,
          recordId: spesRow?.id,
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        results.push({
          program: 'SPES',
          targetTable: 'esmdd.spes_applicants',
          success: false,
          error: message,
        })
      }
    }

    return results
  },

  /**
   * Create a new applicant record in applicants.applicants schema
   * and subsequently check & route to program tables (e.g. esmdd.gip_applicants, esmdd.spes_applicants)
   */
  async createApplicant(payload: ApplicantInsert): Promise<ApplicantRow> {
    const { data, error } = await supabase
      .schema('applicants')
      .from('applicants')
      .insert(payload)
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
    removePersistentCacheValue('peso:gip:applicants')

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
}
