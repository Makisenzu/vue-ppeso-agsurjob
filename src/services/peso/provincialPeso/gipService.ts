import { supabase } from '@/lib/supabaseClient'
import type {
  ApplicantRow,
  BarangayRow,
  GenderDataPoint,
  GipApplicantInsert,
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
  computeLpiiBreakdown,
  computeYearlyDemographics,
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
   * Computes yearly demographics from live database intern records.
   */
  async fetchYearlyDemographics(): Promise<{
    pgas: GenderDataPoint[]
    dole: GenderDataPoint[]
  }> {
    const records = await this.fetchInterns()
    return computeYearlyDemographics(records)
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
}
