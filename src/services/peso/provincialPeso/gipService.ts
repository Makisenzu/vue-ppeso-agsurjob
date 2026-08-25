import { supabase } from '@/lib/supabaseClient'
import type {
  ApplicantRow,
  BarangayRow,
  GenderDataPoint,
  GipApplicantInsert,
  GipApplicantRecord,
  GipApplicantRow,
  GipApplicantUpdate,
  GipInsert,
  GipInternRecord,
  GipRow,
  GipUpdate,
  LpiiCategory,
  LpiiDataPoint,
} from '@/types/peso/provincialPeso/gip'
import {
  computeApplicantLpiiBreakdown,
  computeApplicantsDemographics,
  computeLpiiBreakdown,
  computeYearlyDemographics,
  mapToGipApplicantRecord,
  mapToGipInternRecord,
} from '@/helpers/peso/provincialPeso/gipHelper'

export const gipService = {
  /**
   * Fetches all GIP intern records by querying:
   * 1. esmdd.gips
   * 2. esmdd.gip_applicants
   * 3. applicants.applicants
   * 4. public.barangays (for LPII classification tagging)
   */
  async fetchInterns(): Promise<GipInternRecord[]> {
    // 1. Fetch GIPs and GIP applicants
    const [gipsRes, gipAppsRes, barangaysRes] = await Promise.all([
      supabase
        .schema('esmdd')
        .from('gips')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .schema('esmdd')
        .from('gip_applicants')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .schema('public')
        .from('barangays')
        .select('name, lpii_tag'),
    ])

    const gips = (gipsRes.data ?? []) as GipRow[]
    const gipApps = (gipAppsRes.data ?? []) as GipApplicantRow[]
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

    // Collect all applicant IDs needed
    const applicantIds = new Set<string>()
    for (const app of gipApps) {
      if (app.applicant_id) applicantIds.add(app.applicant_id)
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

    // 3. Map GIP records to domain format
    const records: GipInternRecord[] = []

    if (gips.length > 0) {
      for (const gip of gips) {
        const app = gip.application_id ? appMap.get(gip.application_id) || null : null
        const applicant = app?.applicant_id ? applicantMap.get(app.applicant_id) || null : null
        records.push(mapToGipInternRecord(gip, app, applicant, barangayTagMap))
      }
    } else if (gipApps.length > 0) {
      // If gips is empty but applications exist, construct records from applications
      for (const app of gipApps) {
        const applicant = app.applicant_id ? applicantMap.get(app.applicant_id) || null : null
        const syntheticGip: GipRow = {
          id: app.id,
          application_id: app.id,
          remarks: (app.remarks || []).join(' '),
          status: app.status || 'Pending',
          created_at: app.created_at,
          updated_at: app.updated_at,
        }
        records.push(mapToGipInternRecord(syntheticGip, app, applicant, barangayTagMap))
      }
    }

    return records
  },

  /**
   * Fetches all GIP applicant records from esmdd.gip_applicants and applicants.applicants.
   */
  async fetchApplicants(): Promise<GipApplicantRecord[]> {
    const [gipAppsRes, barangaysRes] = await Promise.all([
      supabase
        .schema('esmdd')
        .from('gip_applicants')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .schema('public')
        .from('barangays')
        .select('name, lpii_tag'),
    ])

    const gipApps = (gipAppsRes.data ?? []) as GipApplicantRow[]
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

    return gipApps.map((app) => {
      const applicant = app.applicant_id ? applicantMap.get(app.applicant_id) || null : null
      return mapToGipApplicantRecord(app, applicant, barangayTagMap)
    })
  },

  /**
   * Computes yearly demographics from live database intern records and applicant records.
   */
  async fetchYearlyDemographics(): Promise<{
    pgas: GenderDataPoint[]
    dole: GenderDataPoint[]
    applicants: GenderDataPoint[]
  }> {
    const [interns, applicants] = await Promise.all([
      this.fetchInterns(),
      this.fetchApplicants(),
    ])
    const { pgas, dole } = computeYearlyDemographics(interns)
    const applicantsData = computeApplicantsDemographics(applicants)
    return { pgas, dole, applicants: applicantsData }
  },

  /**
   * Computes LPII ecosystem distribution from live database intern records.
   */
  async fetchLpiiData(): Promise<{
    pgas: LpiiDataPoint[]
    dole: LpiiDataPoint[]
  }> {
    const records = await this.fetchInterns()
    return computeLpiiBreakdown(records)
  },

  /**
   * Computes LPII ecosystem distribution from live database applicant records.
   */
  async fetchApplicantLpiiData(): Promise<{
    overall: LpiiDataPoint[]
    male: LpiiDataPoint[]
    female: LpiiDataPoint[]
  }> {
    const records = await this.fetchApplicants()
    return computeApplicantLpiiBreakdown(records)
  },

  /**
   * Creates a new GIP application record in esmdd.gip_applicants.
   */
  async createGipApplicant(payload: GipApplicantInsert): Promise<GipApplicantRow> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('gip_applicants')
      .insert(payload)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to create GIP application.')
    return data as GipApplicantRow
  },

  /**
   * Creates a new deployed GIP record in esmdd.gips.
   */
  async createGip(payload: GipInsert): Promise<GipRow> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('gips')
      .insert(payload)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to create GIP record.')
    return data as GipRow
  },

  /**
   * Updates an existing GIP deployment record in esmdd.gips.
   */
  async updateGip(id: string, payload: GipUpdate): Promise<GipRow> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('gips')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to update GIP record.')
    return data as GipRow
  },

  /**
   * Updates an existing GIP application in esmdd.gip_applicants.
   */
  async updateGipApplicant(id: string, payload: GipApplicantUpdate): Promise<GipApplicantRow> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('gip_applicants')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to update GIP application.')
    return data as GipApplicantRow
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

    // 2. Insert into esmdd.gip_applicants
    const remarks = [
      `Batch ${applicantData.batchYear}`,
      `${applicantData.lpiiTag} ECOSYSTEM`,
      `Registered via Provincial PESO GIP Registry`,
    ]

    const { data: gipApp, error: gipAppError } = await supabase
      .schema('esmdd')
      .from('gip_applicants')
      .insert({
        applicant_id: (applicant as any).id,
        status: 'Pending',
        document_submitted: applicantData.documentsSubmitted || ['NSRP Form 1', 'Resume'],
        remarks,
      })
      .select()
      .single()

    if (gipAppError) {
      throw new Error(gipAppError.message || 'Failed to link applicant to GIP application registry.')
    }

    return {
      applicantId: (applicant as any).id,
      applicationId: (gipApp as any).id,
    }
  },

  /**
   * Batch creates applicant records and links them to esmdd.gip_applicants.
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
    }>
  ): Promise<{ total: number; successCount: number; errors: string[] }> {
    let successCount = 0
    const errors: string[] = []

    for (let i = 0; i < applicantsList.length; i++) {
      const item = applicantsList[i]
      try {
        await this.createSingleApplicantWithGipApplication(item)
        successCount++
      } catch (err: any) {
        errors.push(`Row ${i + 1} (${item.firstName} ${item.surname}): ${err.message || 'Failed to insert'}`)
      }
    }

    return {
      total: applicantsList.length,
      successCount,
      errors,
    }
  },
}
