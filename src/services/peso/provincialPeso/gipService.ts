import { supabase } from '@/lib/supabaseClient'
import { getOrSetPersistentCache, removePersistentCacheValue } from '@/helpers/common/persistentCache'
import { invalidateApplicantEntryCache, applicantEntryService } from '@/services/peso/provincialPeso/applicantEntryService'
import type {
  GipInternRecord,
  GipApplicantRecord,
  GipPriorityApplicantRecord,
  GipPriorityScoreRow,
  GenderDataPoint,
  LpiiDataPoint,
  LpiiCategory,
  GipRow,
  GipApplicantRow,
  ApplicantRow,
  GipApplicantInsert,
  GipApplicantUpdate,
  GipInsert,
  GipUpdate,
  GipAppointmentRecord,
  GipRenewAppointmentPayload,
  GipConcludeAppointmentPayload,
} from '@/types/peso/provincialPeso/gip'
import type {
  ExistingApplicantMatch,
  DuplicateResolutionAction,
} from '@/types/peso/provincialPeso/applicantEntry'
import {
  mapToGipInternRecord,
  mapToGipApplicantRecord,
  mapToGipPriorityApplicantRecord,
  computeYearlyDemographics,
  computeApplicantsDemographics,
  computeLpiiBreakdown,
  computeApplicantLpiiBreakdown,
  parsePeriodDates,
  generateAppointmentCode,
  calculateAppointmentStatus,
} from '@/helpers/peso/provincialPeso/gipHelper'

export const GIP_INTERNS_CACHE_KEY = 'peso:gip:interns'
export const GIP_APPLICANTS_CACHE_KEY = 'peso:gip:applicants'
export const GIP_PRIORITY_APPLICANTS_CACHE_KEY = 'peso:gip:priority-applicants'
export const GIP_YEARLY_DEMOGRAPHICS_CACHE_KEY = 'peso:gip:yearly-demographics'
export const GIP_LPII_INTERNS_CACHE_KEY = 'peso:gip:lpii-interns'
export const GIP_LPII_APPLICANTS_CACHE_KEY = 'peso:gip:lpii-applicants'
const GIP_CACHE_TTL_MS = 1000 * 60 * 15 // 15 minutes

export function invalidateGipCaches(options?: { interns?: boolean; applicants?: boolean; all?: boolean }): void {
  if (options?.all || options?.interns) {
    removePersistentCacheValue(GIP_INTERNS_CACHE_KEY)
    removePersistentCacheValue(GIP_LPII_INTERNS_CACHE_KEY)
    removePersistentCacheValue(GIP_YEARLY_DEMOGRAPHICS_CACHE_KEY)
  }
  if (options?.all || options?.applicants) {
    removePersistentCacheValue(GIP_APPLICANTS_CACHE_KEY)
    removePersistentCacheValue(GIP_PRIORITY_APPLICANTS_CACHE_KEY)
    removePersistentCacheValue(GIP_LPII_APPLICANTS_CACHE_KEY)
    removePersistentCacheValue(GIP_YEARLY_DEMOGRAPHICS_CACHE_KEY)
  }
}

type BarangayRow = {
  name: string
  lpii_tag: string
}

/**
 * Resilient query helper for esmdd.gip_appointments.
 */
async function fetchGipAppointmentsQuery(): Promise<GipAppointmentRecord[]> {
  try {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('gip_appointments' as any)
      .select('*')
      .order('term_number', { ascending: false })

    if (error) {
      console.warn('[gipService] Could not query esmdd.gip_appointments (using fallback):', error.message)
      return []
    }

    return (data || []).map((row: any) => {
      const calc = calculateAppointmentStatus(row.end_date, row.status)
      return {
        id: row.id,
        gipId: row.gip_id,
        termNumber: row.term_number || 1,
        appointmentCode: row.appointment_code,
        program: row.program || 'PGAS',
        assignedOffice: row.assigned_office || 'Provincial PESO / PGAS Office',
        supervisor: row.supervisor || 'Assigned Coordinator',
        dailyStipend: row.daily_stipend || '₱479.35 / day',
        startDate: row.start_date,
        endDate: row.end_date,
        status: calc.status,
        daysRemaining: calc.daysRemaining,
        isExpired: calc.isExpired,
        isExpiringSoon: calc.isExpiringSoon,
        decisionNotes: row.decision_notes,
        decidedBy: row.decided_by,
        decidedAt: row.decided_at,
        createdAt: row.created_at,
      } as GipAppointmentRecord
    })
  } catch (err: any) {
    console.warn('[gipService] Exception querying esmdd.gip_appointments:', err?.message)
    return []
  }
}

/**
 * Resilient query helper for esmdd.gip_applicants.
 */
async function fetchGipApplicantsQuery(): Promise<GipApplicantRow[]> {
  try {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('gip_applicants')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      // Schema not exposed or table not yet created in Supabase
      return []
    }
    return (data ?? []) as GipApplicantRow[]
  } catch {
    return []
  }
}

/**
 * Resilient query helper for esmdd.gips.
 */
async function fetchGipsQuery(): Promise<GipRow[]> {
  try {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('gips')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return []
    }
    return (data ?? []) as GipRow[]
  } catch {
    return []
  }
}

export const gipService = {
  /**
   * Fetches all GIP deployment records by joining:
   * 1. esmdd.gips
   * 2. esmdd.gip_applicants
   * 3. applicants.applicants
   * 4. public.barangays (for LPII classification tagging)
   */
  async fetchInterns(forceRefresh = false): Promise<GipInternRecord[]> {
    if (forceRefresh) {
      removePersistentCacheValue(GIP_INTERNS_CACHE_KEY)
    }

    return getOrSetPersistentCache(GIP_INTERNS_CACHE_KEY, GIP_CACHE_TTL_MS, async () => {
      // 1. Fetch GIPs, GIP applicants, barangays, and appointments
      const [gips, gipApps, barangaysRes, appointments] = await Promise.all([
        fetchGipsQuery(),
        fetchGipApplicantsQuery(),
        supabase
          .schema('public')
          .from('barangays')
          .select('name, lpii_tag'),
        fetchGipAppointmentsQuery(),
      ])

      const barangays = (barangaysRes.data ?? []) as BarangayRow[]

      // Build Barangay -> LPII tag lookup map
      const barangayTagMap = new Map<string, LpiiCategory>()
      for (const b of barangays) {
        if (b.name && b.lpii_tag) {
          barangayTagMap.set(b.name.trim().toLowerCase(), b.lpii_tag as LpiiCategory)
        }
      }

      // Build map of application_id -> GipApplicantRow
      const appMap = new Map<string, GipApplicantRow>()
      for (const app of gipApps) {
        appMap.set(app.id, app)
      }

      // Build gip_id -> GipAppointmentRecord[] map
      const appointmentsMap = new Map<string, GipAppointmentRecord[]>()
      for (const apt of appointments) {
        if (!appointmentsMap.has(apt.gipId)) {
          appointmentsMap.set(apt.gipId, [])
        }
        appointmentsMap.get(apt.gipId)!.push(apt)
      }

      // If there are no deployed interns in esmdd.gips, return empty list
      if (gips.length === 0) {
        return []
      }

      // Collect all applicant IDs needed for only deployed interns
      const applicantIds = new Set<string>()
      for (const gip of gips) {
        if (gip.application_id) {
          const app = appMap.get(gip.application_id)
          if (app?.applicant_id) applicantIds.add(app.applicant_id)
        }
      }

      // 2. Fetch corresponding applicant profile records
      let applicantsList: ApplicantRow[] = []
      if (applicantIds.size > 0) {
        const { data: applicantsData, error: applicantsError } = await supabase
          .schema('applicants')
          .from('applicants')
          .select('*')
          .in('id', Array.from(applicantIds))

        if (!applicantsError && applicantsData) {
          applicantsList = applicantsData as ApplicantRow[]
        }
      }

      const applicantMap = new Map<string, ApplicantRow>()
      for (const applicant of applicantsList) {
        applicantMap.set(applicant.id, applicant)
        if (applicant.profile_id) {
          applicantMap.set(applicant.profile_id, applicant)
        }
      }

      // 3. Map GIP records strictly from esmdd.gips
      const records: GipInternRecord[] = []

      for (const gip of gips) {
        const app = gip.application_id ? appMap.get(gip.application_id) || null : null
        const applicant = app?.applicant_id ? applicantMap.get(app.applicant_id) || null : null
        records.push(mapToGipInternRecord(gip, app, applicant, barangayTagMap, appointmentsMap))
      }

      return records
    })
  },

  /**
   * Fetches all GIP applicant records from esmdd.gip_applicants and applicants.applicants.
   */
  async fetchApplicants(forceRefresh = false): Promise<GipApplicantRecord[]> {
    if (forceRefresh) {
      removePersistentCacheValue(GIP_APPLICANTS_CACHE_KEY)
    }

    return getOrSetPersistentCache(GIP_APPLICANTS_CACHE_KEY, GIP_CACHE_TTL_MS, async () => {
      const [gipApps, barangaysRes] = await Promise.all([
        fetchGipApplicantsQuery(),
        supabase
          .schema('public')
          .from('barangays')
          .select('name, lpii_tag'),
      ])

      const barangays = (barangaysRes.data ?? []) as BarangayRow[]

      const barangayTagMap = new Map<string, LpiiCategory>()
      for (const b of barangays) {
        if (b.name && b.lpii_tag) {
          barangayTagMap.set(b.name.trim().toLowerCase(), b.lpii_tag as LpiiCategory)
        }
      }

      const applicantIds = new Set<string>()
      for (const app of gipApps) {
        if (app.applicant_id) applicantIds.add(app.applicant_id)
      }

      let applicantsList: ApplicantRow[] = []
      if (applicantIds.size > 0) {
        const { data: applicantsData, error: applicantsError } = await supabase
          .schema('applicants')
          .from('applicants')
          .select('*')
          .in('id', Array.from(applicantIds))

        if (!applicantsError && applicantsData) {
          applicantsList = applicantsData as ApplicantRow[]
        }
      }

      const applicantMap = new Map<string, ApplicantRow>()
      for (const applicant of applicantsList) {
        applicantMap.set(applicant.id, applicant)
        if (applicant.profile_id) {
          applicantMap.set(applicant.profile_id, applicant)
        }
      }

      // Query priority scores to attach to applicants if available
      const scoreMap = new Map<string, { total: number; rank: number; status: number; academic: number; eligibility: number; cert: number; poverty: number; unemployment: number }>()
      try {
        const { data: scoreData } = await supabase
          .schema('esmdd')
          .from('gip_applicant_priority_scores')
          .select('applicant_id, total_priority_score, status_score, academic_score, eligibility_score, cert_score, poverty_score, unemployment_score')
          .order('total_priority_score', { ascending: false })

        if (scoreData) {
          scoreData.forEach((row: any, idx) => {
            if (row.applicant_id) {
              scoreMap.set(row.applicant_id, {
                total: Number(row.total_priority_score) || 0,
                rank: idx + 1,
                status: Number(row.status_score) || 0,
                academic: Number(row.academic_score) || 0,
                eligibility: Number(row.eligibility_score) || 0,
                cert: Number(row.cert_score) || 0,
                poverty: Number(row.poverty_score) || 0,
                unemployment: Number(row.unemployment_score) || 0,
              })
            }
          })
        }
      } catch {
        // Non-blocking fallback
      }

      return gipApps.map((app) => {
        const applicant = app.applicant_id ? applicantMap.get(app.applicant_id) || null : null
        const rec = mapToGipApplicantRecord(app, applicant, barangayTagMap)
        if (app.applicant_id && scoreMap.has(app.applicant_id)) {
          const s = scoreMap.get(app.applicant_id)!
          rec.totalPriorityScore = s.total
          rec.priorityRank = s.rank
          rec.statusScore = s.status
          rec.academicScore = s.academic
          rec.eligibilityScore = s.eligibility
          rec.certScore = s.cert
          rec.povertyScore = s.poverty
          rec.unemploymentScore = s.unemployment
        }
        return rec
      })
    })
  },

  /**
   * Fetches all GIP priority applicants ranked by total priority score.
   */
  async fetchPriorityApplicants(forceRefresh = false): Promise<GipPriorityApplicantRecord[]> {
    if (forceRefresh) {
      removePersistentCacheValue(GIP_PRIORITY_APPLICANTS_CACHE_KEY)
    }

    return getOrSetPersistentCache(GIP_PRIORITY_APPLICANTS_CACHE_KEY, GIP_CACHE_TTL_MS, async () => {
      const [priorityScoresRes, barangaysRes] = await Promise.all([
        supabase
          .schema('esmdd')
          .from('gip_applicant_priority_scores')
          .select('*')
          .order('total_priority_score', { ascending: false }),
        supabase
          .schema('public')
          .from('barangays')
          .select('name, lpii_tag'),
      ])

      if (priorityScoresRes.error) {
        console.error('[gipService] Error fetching priority applicants:', priorityScoresRes.error)
        return []
      }

      const barangays = (barangaysRes.data ?? []) as BarangayRow[]
      const barangayTagMap = new Map<string, LpiiCategory>()
      for (const b of barangays) {
        if (b.name && b.lpii_tag) {
          barangayTagMap.set(b.name.trim().toLowerCase(), b.lpii_tag as LpiiCategory)
        }
      }

      const rows = (priorityScoresRes.data ?? []) as GipPriorityScoreRow[]
      return rows.map((row, index) => mapToGipPriorityApplicantRecord(row, index + 1, barangayTagMap))
    })
  },

  /**
   * Computes yearly demographics from live database intern records and applicant records.
   */
  async fetchYearlyDemographics(forceRefresh = false): Promise<{
    pgas: GenderDataPoint[]
    dole: GenderDataPoint[]
    applicants: GenderDataPoint[]
  }> {
    if (forceRefresh) {
      removePersistentCacheValue(GIP_YEARLY_DEMOGRAPHICS_CACHE_KEY)
    }

    return getOrSetPersistentCache(GIP_YEARLY_DEMOGRAPHICS_CACHE_KEY, GIP_CACHE_TTL_MS, async () => {
      const [interns, applicants] = await Promise.all([
        this.fetchInterns(forceRefresh),
        this.fetchApplicants(forceRefresh),
      ])
      const { pgas, dole } = computeYearlyDemographics(interns)
      const applicantsData = computeApplicantsDemographics(applicants)
      return { pgas, dole, applicants: applicantsData }
    })
  },

  /**
   * Computes LPII ecosystem distribution from live database intern records.
   */
  async fetchLpiiData(forceRefresh = false): Promise<{
    pgas: LpiiDataPoint[]
    dole: LpiiDataPoint[]
  }> {
    if (forceRefresh) {
      removePersistentCacheValue(GIP_LPII_INTERNS_CACHE_KEY)
    }

    return getOrSetPersistentCache(GIP_LPII_INTERNS_CACHE_KEY, GIP_CACHE_TTL_MS, async () => {
      const records = await this.fetchInterns(forceRefresh)
      return computeLpiiBreakdown(records)
    })
  },

  /**
   * Computes LPII ecosystem distribution from live database applicant records.
   */
  async fetchApplicantLpiiData(forceRefresh = false): Promise<{
    overall: LpiiDataPoint[]
    male: LpiiDataPoint[]
    female: LpiiDataPoint[]
  }> {
    if (forceRefresh) {
      removePersistentCacheValue(GIP_LPII_APPLICANTS_CACHE_KEY)
    }

    return getOrSetPersistentCache(GIP_LPII_APPLICANTS_CACHE_KEY, GIP_CACHE_TTL_MS, async () => {
      const records = await this.fetchApplicants(forceRefresh)
      return computeApplicantLpiiBreakdown(records)
    })
  },

  /**
   * Creates a new GIP application record in esmdd.gip_applicants.
   */
  async createGipApplicant(payload: GipApplicantInsert): Promise<GipApplicantRow> {
    try {
      const { data, error } = await supabase
        .schema('esmdd')
        .from('gip_applicants')
        .insert(payload)
        .select()
        .single()

      if (error) throw error
      invalidateGipCaches({ applicants: true })
      return data as GipApplicantRow
    } catch (err: any) {
      // Fallback if esmdd schema is not exposed
      const { data, error } = await (supabase.from('gip_applicants' as any) as any)
        .insert(payload)
        .select()
        .single()

      if (error) throw new Error(error.message || 'Failed to create GIP application.')
      invalidateGipCaches({ applicants: true })
      return data as GipApplicantRow
    }
  },

  /**
   * Creates a new deployed GIP record in esmdd.gips.
   */
  async createGip(payload: GipInsert): Promise<GipRow> {
    try {
      const { data, error } = await supabase
        .schema('esmdd')
        .from('gips')
        .insert(payload)
        .select()
        .single()

      if (error) throw error
      invalidateGipCaches({ interns: true })
      return data as GipRow
    } catch (err: any) {
      const { data, error } = await (supabase.from('gips' as any) as any)
        .insert(payload)
        .select()
        .single()

      if (error) throw new Error(error.message || 'Failed to create GIP record.')
      invalidateGipCaches({ interns: true })
      return data as GipRow
    }
  },

  /**
   * Updates an existing GIP deployment record in esmdd.gips.
   */
  async updateGip(id: string, payload: GipUpdate): Promise<GipRow> {
    try {
      const { data, error } = await supabase
        .schema('esmdd')
        .from('gips')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      invalidateGipCaches({ interns: true })
      return data as GipRow
    } catch (err: any) {
      const { data, error } = await (supabase.from('gips' as any) as any)
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message || 'Failed to update GIP record.')
      invalidateGipCaches({ interns: true })
      return data as GipRow
    }
  },

  /**
   * Updates an existing GIP application in esmdd.gip_applicants.
   */
  async updateGipApplicant(id: string, payload: GipApplicantUpdate): Promise<GipApplicantRow> {
    try {
      const { data, error } = await supabase
        .schema('esmdd')
        .from('gip_applicants')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      invalidateGipCaches({ applicants: true })
      return data as GipApplicantRow
    } catch (err: any) {
      const { data, error } = await (supabase.from('gip_applicants' as any) as any)
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message || 'Failed to update GIP application.')
      invalidateGipCaches({ applicants: true })
      return data as GipApplicantRow
    }
  },

  /**
   * Creates a full applicant record in applicants.applicants and registers it in esmdd.gip_applicants.
   */
  async createSingleApplicantWithGipApplication(applicantData: {
    surname: string
    firstName: string
    middleName?: string
    suffix?: string
    sex: string
    dateOfBirth?: string
    age?: number | null
    civilStatus?: string
    religion?: string
    tin?: string
    houseStreet?: string
    barangay: string
    municipality: string
    province?: string
    contactNumber?: string
    email?: string
    educationalLevel?: string
    course: string
    yearGraduated?: string
    lpiiTag: LpiiCategory
    batchYear: number
    documentsSubmitted?: string[]
    employmentStatus?: string
    is4ps?: boolean
    hasDisability?: boolean
    skills?: string[]
  }): Promise<{ applicantId: string; applicationId: string }> {
    const addressPayload = {
      house_street: applicantData.houseStreet || 'Purok 1',
      barangay: applicantData.barangay,
      municipality: applicantData.municipality,
      province: applicantData.province || 'Agusan del Sur',
    }

    const educationPayload = [
      {
        level: applicantData.educationalLevel || 'College Graduate',
        course: applicantData.course,
        year_graduated: applicantData.yearGraduated || `${new Date().getFullYear()}`,
      },
    ]

    // 1. Insert into applicants.applicants
    const { data: applicant, error: applicantError } = await supabase
      .schema('applicants')
      .from('applicants')
      .insert({
        surname: applicantData.surname,
        first_name: applicantData.firstName,
        middle_name: applicantData.middleName || null,
        suffix: applicantData.suffix || null,
        sex: applicantData.sex,
        date_of_birth: applicantData.dateOfBirth || '2000-01-01',
        age: applicantData.age || null,
        civil_status: applicantData.civilStatus || 'Single',
        religion: applicantData.religion || 'Roman Catholic',
        tin: applicantData.tin || null,
        address: addressPayload,
        contact_numbers: applicantData.contactNumber ? [applicantData.contactNumber] : [],
        email: applicantData.email || null,
        educational_background: educationPayload,
        is_4ps_beneficiary: applicantData.is4ps || false,
        has_disability: applicantData.hasDisability || false,
        other_skills: applicantData.skills || ['Computer Literacy'],
        employment_status: applicantData.employmentStatus || 'Unemployed',
      } as any)
      .select()
      .single()

    if (applicantError) {
      throw new Error(applicantError.message || 'Failed to create applicant master profile.')
    }

    // 2. Insert into esmdd.gip_applicants (with fallback)
    const remarks = [
      `Batch ${applicantData.batchYear}`,
      `${applicantData.lpiiTag} ECOSYSTEM`,
      `Registered via Provincial PESO GIP Registry`,
    ]

    const gipApp = await this.createGipApplicant({
      applicant_id: (applicant as any).id,
      status: 'Pending',
      document_submitted: applicantData.documentsSubmitted || ['NSRP Form 1', 'Resume'],
      remarks,
    })

    invalidateApplicantEntryCache()
    invalidateGipCaches({ applicants: true })

    return {
      applicantId: (applicant as any).id,
      applicationId: gipApp.id,
    }
  },

  /**
   * Batch creates applicant records and links them to esmdd.gip_applicants.
   * If a candidate is flagged as an existing duplicate and marked with 'link_program',
   * the applicant's record is linked to GIP instead of creating a redundant master record.
   */
  async batchCreateGipApplicants(
    applicantsList: Array<{
      surname: string
      firstName: string
      middleName?: string
      suffix?: string
      sex: string
      dateOfBirth?: string
      age?: number | null
      civilStatus?: string
      religion?: string
      tin?: string
      houseStreet?: string
      barangay: string
      municipality: string
      province?: string
      contactNumber?: string
      email?: string
      educationalLevel?: string
      course: string
      yearGraduated?: string
      lpiiTag: LpiiCategory
      batchYear: number
      documentsSubmitted?: string[]
      employmentStatus?: string
      is4ps?: boolean
      hasDisability?: boolean
      skills?: string[]
      existingMatch?: ExistingApplicantMatch | null
      resolutionAction?: DuplicateResolutionAction
      selectedProgram?: string
    }>
  ): Promise<{ total: number; successCount: number; errors: string[] }> {
    let successCount = 0
    const errors: string[] = []

    for (let i = 0; i < applicantsList.length; i++) {
      const item = applicantsList[i]

      // 1. If candidate marked as skip, bypass
      if (item.resolutionAction === 'skip') {
        continue
      }

      // 2. If candidate is resolved to link to program and has existing applicant record
      if (
        item.resolutionAction === 'link_program' &&
        item.existingMatch?.existingApplicant?.id
      ) {
        try {
          const prog = item.selectedProgram || 'GIP'
          await applicantEntryService.linkApplicantToProgram(
            item.existingMatch.existingApplicant.id,
            prog
          )
          successCount++
        } catch (err: any) {
          errors.push(
            `Row ${i + 1} (${item.firstName} ${item.surname}): Linking failed - ${err.message || 'Error'}`
          )
        }
        continue
      }

      // 3. Otherwise standard single creation
      try {
        await this.createSingleApplicantWithGipApplication(item)
        successCount++
      } catch (err: any) {
        errors.push(`Row ${i + 1} (${item.firstName} ${item.surname}): ${err.message || 'Failed to insert'}`)
      }
    }

    if (successCount > 0) {
      invalidateApplicantEntryCache()
      invalidateGipCaches({ applicants: true })
    }

    return {
      total: applicantsList.length,
      successCount,
      errors,
    }
  },

  /**
   * Deploys an applicant as a GIP intern by creating a record in esmdd.gips
   * and updating the application status in esmdd.gip_applicants.
   */
  async deployGipIntern(deploymentData: {
    applicationId: string
    program: 'PGAS' | 'DOLE'
    assignedOffice: string
    supervisor?: string
    stipend?: string
    period?: string
    status?: string
    remarks?: string
  }): Promise<GipRow> {
    const parts = [`[${deploymentData.program}] ${deploymentData.assignedOffice}`]
    if (deploymentData.supervisor) parts.push(`Supervisor: ${deploymentData.supervisor}`)
    if (deploymentData.period) parts.push(`Period: ${deploymentData.period}`)
    if (deploymentData.stipend) parts.push(`Stipend: ${deploymentData.stipend}`)
    if (deploymentData.remarks) parts.push(`Notes: ${deploymentData.remarks}`)
    const fullRemarks = parts.join(' | ')

    const gip = await this.createGip({
      application_id: deploymentData.applicationId,
      status: deploymentData.status || 'Active',
      remarks: fullRemarks,
    })

    // Create initial Term 1 appointment
    try {
      const dates = parsePeriodDates(deploymentData.period || '')
      const code = generateAppointmentCode(new Date().getFullYear(), gip.id, 1)
      await (supabase.schema('esmdd').from('gip_appointments' as any) as any).insert({
        gip_id: gip.id,
        term_number: 1,
        appointment_code: code,
        program: deploymentData.program,
        assigned_office: deploymentData.assignedOffice,
        supervisor: deploymentData.supervisor || 'Assigned Coordinator',
        daily_stipend: deploymentData.stipend || (deploymentData.program === 'DOLE' ? '₱475.00 / day' : '₱479.35 / day'),
        start_date: dates.startDate,
        end_date: dates.endDate,
        status: deploymentData.status || 'Active',
      })
    } catch (apptErr) {
      console.warn('[gipService] Could not insert initial appointment row:', apptErr)
    }

    try {
      await this.updateGipApplicant(deploymentData.applicationId, {
        status: deploymentData.status === 'Active' ? 'Approved' : deploymentData.status || 'Approved',
      })
    } catch (err) {
      console.warn('[gipService] Could not update applicant status:', err)
    }

    invalidateGipCaches({ all: true })

    return gip
  },

  /**
   * Provincial PESO: Renews a GIP intern's appointment for another term.
   */
  async renewAppointment(payload: GipRenewAppointmentPayload): Promise<void> {
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData?.user?.id || null

    // 1. Mark previous appointment as Renewed if valid
    if (payload.currentAppointmentId && !payload.currentAppointmentId.startsWith('synthetic-')) {
      try {
        await (supabase.schema('esmdd').from('gip_appointments' as any) as any)
          .update({
            status: 'Renewed',
            decision_notes: `Renewed to Term #${payload.nextTermNumber}. Notes: ${payload.remarks || 'None'}`,
            decided_by: userId,
            decided_at: new Date().toISOString(),
          })
          .eq('id', payload.currentAppointmentId)
      } catch (err: any) {
        console.warn('[gipService] Could not update previous appointment:', err.message)
      }
    }

    // 2. Insert new appointment term
    const appointmentCode = generateAppointmentCode(
      new Date(payload.startDate).getFullYear() || new Date().getFullYear(),
      payload.gipId,
      payload.nextTermNumber,
    )

    try {
      await (supabase.schema('esmdd').from('gip_appointments' as any) as any).insert({
        gip_id: payload.gipId,
        term_number: payload.nextTermNumber,
        appointment_code: appointmentCode,
        program: payload.program,
        assigned_office: payload.assignedOffice,
        supervisor: payload.supervisor || 'Assigned Coordinator',
        daily_stipend: payload.stipend,
        start_date: payload.startDate,
        end_date: payload.endDate,
        status: 'Active',
        decision_notes: payload.remarks || null,
        decided_by: userId,
        decided_at: new Date().toISOString(),
      })
    } catch (err: any) {
      console.warn('[gipService] Could not insert renewed appointment record:', err.message)
    }

    // 3. Update master gips table status & remarks
    const parts = [`[${payload.program}] ${payload.assignedOffice}`]
    if (payload.supervisor) parts.push(`Supervisor: ${payload.supervisor}`)
    parts.push(`Period: ${payload.startDate} to ${payload.endDate}`)
    parts.push(`Stipend: ${payload.stipend}`)
    parts.push(`Term: #${payload.nextTermNumber}`)
    if (payload.remarks) parts.push(`Notes: ${payload.remarks}`)
    const fullRemarks = parts.join(' | ')

    await this.updateGip(payload.gipId, {
      status: 'Active',
      remarks: fullRemarks,
    })

    invalidateGipCaches({ all: true })
  },

  /**
   * Provincial PESO: Concludes an intern's appointment (Completed, Hired, Terminated).
   */
  async concludeAppointment(payload: GipConcludeAppointmentPayload): Promise<void> {
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData?.user?.id || null

    if (payload.appointmentId && !payload.appointmentId.startsWith('synthetic-')) {
      try {
        await (supabase.schema('esmdd').from('gip_appointments' as any) as any)
          .update({
            status: payload.action,
            decision_notes: payload.remarks || null,
            decided_by: userId,
            decided_at: new Date().toISOString(),
          })
          .eq('id', payload.appointmentId)
      } catch (err: any) {
        console.warn('[gipService] Could not update appointment status on conclude:', err.message)
      }
    }

    // Update master GIP record
    await this.updateGip(payload.gipId, {
      status: payload.action,
    })

    invalidateGipCaches({ all: true })
  },
}
