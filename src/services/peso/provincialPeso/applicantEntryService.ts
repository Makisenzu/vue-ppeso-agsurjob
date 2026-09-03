import { supabase } from '@/lib/supabaseClient'
import type {
  ApplicantInsert,
  ApplicantRow,
  ProgramReferralSummary,
} from '@/types/peso/provincialPeso/applicantEntry'
import type { GipApplicantInsert, GipApplicantRow } from '@/types/peso/provincialPeso/gip'
import type { SpesApplicantInsert, SpesApplicantRow } from '@/types/peso/provincialPeso/spes'

export const applicantEntryService = {
  /**
   * Fetch all applicant records from applicants.applicants schema
   */
  async fetchAllApplicants(): Promise<ApplicantRow[]> {
    const { data, error } = await supabase
      .schema('applicants')
      .from('applicants')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message || 'Failed to fetch applicants registry data')
    }

    return (data ?? []) as ApplicantRow[]
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

    // Automatically check what the applicant has been referred to and insert into ESMDD tables
    try {
      await this.processReferrals(createdApplicant)
    } catch (referralErr: unknown) {
      console.error('[applicantEntryService] Non-blocking referral dispatch error:', referralErr)
    }

    return createdApplicant
  },
}
