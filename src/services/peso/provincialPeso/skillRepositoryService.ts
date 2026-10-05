import { supabase } from '@/lib/supabaseClient'
import { getOrSetPersistentCache, removePersistentCacheValue } from '@/helpers/common/persistentCache'
import { getAllProvinces, getCities, getBarangays } from '@/helpers/common/psgcHelpers'
import type { Database } from '@/types/database.types'
import type {
  ApplicantSkillProfile,
  BarangaySkillRow,
  ExtractedSkill,
  LpiiCategory,
  MunicipalitySkillDetail,
  MunicipalitySkillSummaryRow,
  SkillRepositoryStats,
} from '@/types/peso/provincialPeso/skillRepository'
import {
  AGUSAN_DEL_SUR_CANONICAL_MUNICIPALITIES,
  aggregateSkills,
  computeRepositoryStats,
  extractSkillsFromApplicant,
  findBarangayTagByName,
  isAgusanDelSurMunicipality,
  matchesGeographicLabel,
  normalizeBarangayName,
  normalizeGeographicLabel,
} from '@/helpers/peso/provincialPeso/skillRepositoryHelper'

export const SKILL_REPOSITORY_CACHE_KEY = 'peso:skill-repository:all-data'
const SKILL_REPOSITORY_CACHE_TTL_MS = 1000 * 60 * 15 // 15 minutes

interface RawRepositoryBundle {
  applicants: Array<Database['applicants']['Tables']['applicants']['Row']>
  applicantSkills: Array<Database['applicants']['Tables']['applicant_skills']['Row']>
  barangays: Array<{ id: string; name: string; lpii_tag: LpiiCategory | null; municipality_id: string }>
  municipalities: Array<{ id: string; name: string; code: string }>
  psgcBarangayCounts: Record<string, number>
}

export function invalidateSkillRepositoryCache(): void {
  removePersistentCacheValue(SKILL_REPOSITORY_CACHE_KEY)
}

export const skillRepositoryService = {
  /**
   * Fetches all underlying database rows and PSGC counts with persistent caching.
   */
  async fetchRawBundle(forceRefresh = false): Promise<RawRepositoryBundle> {
    if (forceRefresh) {
      removePersistentCacheValue(SKILL_REPOSITORY_CACHE_KEY)
    }

    return getOrSetPersistentCache(SKILL_REPOSITORY_CACHE_KEY, SKILL_REPOSITORY_CACHE_TTL_MS, async () => {
      // 1. Fetch applicants from applicants schema
      const { data: applicantsData, error: applicantsError } = await supabase
        .schema('applicants')
        .from('applicants')
        .select('*')
        .order('created_at', { ascending: false })

      if (applicantsError) {
        throw new Error(applicantsError.message || 'Failed to fetch applicants for skill repository')
      }

      // 2. Fetch applicant_skills from applicants schema
      const { data: skillsData, error: skillsError } = await supabase
        .schema('applicants')
        .from('applicant_skills')
        .select('*')

      if (skillsError) {
        console.warn('[skillRepositoryService] Warning fetching applicant_skills:', skillsError.message)
      }

      // 3. Fetch public municipalities
      const { data: muniData } = await supabase
        .schema('public')
        .from('municipalities')
        .select('id, name, code')

      // 4. Fetch public barangays with LPII tagging
      const { data: brgyData } = await supabase
        .schema('public')
        .from('barangays')
        .select('id, name, lpii_tag, municipality_id')

      // 5. Query PSGC for municipality barangay counts in Agusan del Sur
      const psgcCounts: Record<string, number> = {}
      try {
        const provinces = await getAllProvinces()
        const province = provinces.find((p: any) => matchesGeographicLabel(p.name, 'Agusan del Sur'))
        if (province?.code) {
          const cities = await getCities(province.code)
          await Promise.all(
            cities.map(async (city: any) => {
              try {
                const bList = await getBarangays(city.code)
                psgcCounts[normalizeGeographicLabel(city.name)] = bList.length
              } catch {
                // fallback
              }
            })
          )
        }
      } catch {
        // PSGC fallback will rely on database barangay count
      }

      return {
        applicants: applicantsData ?? [],
        applicantSkills: skillsData ?? [],
        barangays: (brgyData ?? []) as RawRepositoryBundle['barangays'],
        municipalities: (muniData ?? []) as RawRepositoryBundle['municipalities'],
        psgcBarangayCounts: psgcCounts,
      }
    })
  },

  /**
   * Transforms raw applicants into typed ApplicantSkillProfile records.
   */
  async fetchAllApplicantProfiles(forceRefresh = false): Promise<ApplicantSkillProfile[]> {
    const bundle = await this.fetchRawBundle(forceRefresh)

    // Build skill index by profile_id
    const skillsByProfileId = new Map<string, Array<Database['applicants']['Tables']['applicant_skills']['Row']>>()
    for (const skill of bundle.applicantSkills) {
      if (skill.profile_id) {
        const list = skillsByProfileId.get(skill.profile_id) ?? []
        list.push(skill)
        skillsByProfileId.set(skill.profile_id, list)
      }
    }

    // Build municipality name lookup
    const muniIdToName = new Map<string, string>()
    for (const m of bundle.municipalities) {
      muniIdToName.set(m.id, m.name)
    }

    return bundle.applicants.map((row) => {
      // Parse address object
      const addr = (row.address as Record<string, any>) || {}
      const rawMuni =
        addr.city_municipality ||
        addr.municipality ||
        addr.city ||
        addr.geographic ||
        ''

      // Match canonical municipality name if possible
      const matchedMuni =
        AGUSAN_DEL_SUR_CANONICAL_MUNICIPALITIES.find((m) => matchesGeographicLabel(m, rawMuni)) ||
        (rawMuni || 'Unknown')

      const isAgusan = isAgusanDelSurMunicipality(matchedMuni)
      const barangay = addr.barangay || addr.brgy || 'Unknown'
      const province = addr.province || (isAgusan ? 'Agusan del Sur' : 'Outside Agusan del Sur')

      // Find LPII Tag for this barangay (only applicable for Agusan del Sur)
      let lpiiTag: LpiiCategory | null = null
      if (isAgusan) {
        const muniRecord = bundle.municipalities.find((m) => matchesGeographicLabel(m.name, matchedMuni))
        const relevantBarangays = muniRecord
          ? bundle.barangays.filter((b) => b.municipality_id === muniRecord.id)
          : bundle.barangays
        lpiiTag = findBarangayTagByName(barangay, relevantBarangays)
      }

      // Extract skills
      const linkedSkills = row.profile_id ? skillsByProfileId.get(row.profile_id) ?? [] : []
      const extractedSkills = extractSkillsFromApplicant(row, linkedSkills)
      const skillNames = extractedSkills.map((s) => s.name)

      // Format full name
      const nameParts = [row.first_name, row.middle_name, row.surname, row.suffix].filter(Boolean)
      const fullName = nameParts.length > 0 ? nameParts.join(' ') : 'Applicant'

      const contactNumber =
        (Array.isArray(row.contact_numbers) && row.contact_numbers.length > 0
          ? row.contact_numbers[0]
          : null) || null

      const highestEducation =
        Array.isArray(row.educational_background) && row.educational_background.length > 0
          ? ((row.educational_background[0] as Record<string, any>)?.course ||
             (row.educational_background[0] as Record<string, any>)?.level ||
             null)
          : null

      return {
        id: row.id,
        profileId: row.profile_id,
        fullName,
        firstName: row.first_name || '',
        surname: row.surname || '',
        middleName: row.middle_name,
        municipality: matchedMuni,
        barangay,
        province,
        lpiiTag,
        skills: extractedSkills,
        skillNames,
        contactNumber,
        email: row.email,
        employmentStatus: row.employment_status,
        highestEducation,
      }
    })
  },

  /**
   * Fetches municipality-level summaries for the main Skills Repository dashboard.
   */
  async fetchMunicipalitySummaries(forceRefresh = false): Promise<MunicipalitySkillSummaryRow[]> {
    const bundle = await this.fetchRawBundle(forceRefresh)
    const applicants = await this.fetchAllApplicantProfiles(forceRefresh)

    // 1. Build canonical set of Agusan del Sur municipalities
    const agusanMuniMap = new Map<string, string>()
    for (const name of AGUSAN_DEL_SUR_CANONICAL_MUNICIPALITIES) {
      agusanMuniMap.set(normalizeGeographicLabel(name), name)
    }

    // 2. Build unique set of outside municipalities from applicant data
    const outsideMuniMap = new Map<string, { displayName: string; province: string }>()
    for (const app of applicants) {
      if (!isAgusanDelSurMunicipality(app.municipality)) {
        const norm = normalizeGeographicLabel(app.municipality)
        if (norm && norm !== 'agusan del sur' && norm !== 'unknown') {
          if (!outsideMuniMap.has(norm)) {
            outsideMuniMap.set(norm, {
              displayName: app.municipality,
              province: app.province || 'Outside Agusan del Sur',
            })
          }
        }
      }
    }

    const summaries: MunicipalitySkillSummaryRow[] = []

    // 1. Process Agusan del Sur municipalities
    for (const [normKey, displayName] of agusanMuniMap.entries()) {
      const muniApplicants = applicants.filter((app) =>
        matchesGeographicLabel(app.municipality, displayName)
      )

      let lowlandApplicants = 0
      let uplandApplicants = 0
      let wetlandApplicants = 0

      const muniSkills: ExtractedSkill[] = []
      for (const app of muniApplicants) {
        if (app.lpiiTag === 'LOWLAND') lowlandApplicants++
        else if (app.lpiiTag === 'UPLAND') uplandApplicants++
        else if (app.lpiiTag === 'WETLAND') wetlandApplicants++

        muniSkills.push(...app.skills)
      }

      const allSkillsAggregated = aggregateSkills(muniSkills)
      const topSkills = allSkillsAggregated.slice(0, 4)

      // Count barangays from PSGC or database
      let barangayCount = bundle.psgcBarangayCounts?.[normKey] ?? 0
      if (!barangayCount) {
        const muniRecord = bundle.municipalities.find((m) => matchesGeographicLabel(m.name, displayName))
        if (muniRecord) {
          barangayCount = bundle.barangays.filter((b) => b.municipality_id === muniRecord.id).length
        }
      }

      summaries.push({
        name: displayName,
        province: 'Agusan del Sur',
        isAgusanDelSur: true,
        barangays: barangayCount,
        totalApplicants: muniApplicants.length,
        lowlandApplicants,
        uplandApplicants,
        wetlandApplicants,
        topSkills,
        allSkills: allSkillsAggregated,
        uniqueSkillsCount: allSkillsAggregated.length,
      })
    }

    // 2. Process Outside Agusan del Sur municipalities
    for (const [, info] of outsideMuniMap.entries()) {
      const muniApplicants = applicants.filter((app) =>
        matchesGeographicLabel(app.municipality, info.displayName)
      )

      const muniSkills: ExtractedSkill[] = []
      const distinctBarangays = new Set<string>()

      for (const app of muniApplicants) {
        if (app.barangay && app.barangay !== 'Unknown') {
          distinctBarangays.add(normalizeBarangayName(app.barangay))
        }
        muniSkills.push(...app.skills)
      }

      const allSkillsAggregated = aggregateSkills(muniSkills)
      const topSkills = allSkillsAggregated.slice(0, 4)

      summaries.push({
        name: info.displayName,
        province: info.province,
        isAgusanDelSur: false,
        barangays: distinctBarangays.size,
        totalApplicants: muniApplicants.length,
        lowlandApplicants: 0,
        uplandApplicants: 0,
        wetlandApplicants: 0,
        topSkills,
        allSkills: allSkillsAggregated,
        uniqueSkillsCount: allSkillsAggregated.length,
      })
    }

    // Sort: Agusan del Sur first (alphabetical), then Outside (alphabetical)
    return summaries.sort((a, b) => {
      if (a.isAgusanDelSur && !b.isAgusanDelSur) return -1
      if (!a.isAgusanDelSur && b.isAgusanDelSur) return 1
      return a.name.localeCompare(b.name)
    })
  },

  /**
   * Fetches detailed data for a specific municipality, including skills breakdown and barangay table.
   */
  async fetchMunicipalityDetail(
    municipalityName: string,
    forceRefresh = false
  ): Promise<MunicipalitySkillDetail | null> {
    const bundle = await this.fetchRawBundle(forceRefresh)
    const allApplicants = await this.fetchAllApplicantProfiles(forceRefresh)

    const targetApplicants = allApplicants.filter((app) =>
      matchesGeographicLabel(app.municipality, municipalityName)
    )

    const isAgusan = isAgusanDelSurMunicipality(municipalityName)
    const province = isAgusan
      ? 'Agusan del Sur'
      : (targetApplicants[0]?.province || 'Outside Agusan del Sur')

    const muniRecord = bundle.municipalities.find((m) =>
      matchesGeographicLabel(m.name, municipalityName)
    )

    // Collect all database barangays for this municipality
    const dbBarangays = muniRecord
      ? bundle.barangays.filter((b) => b.municipality_id === muniRecord.id)
      : []

    // Group applicants by barangay
    const barangayMap = new Map<
      string,
      {
        name: string
        lpiiTag: LpiiCategory | null
        applicants: ApplicantSkillProfile[]
        skills: ExtractedSkill[]
      }
    >()

    // Pre-populate with known DB barangays so empty barangays still appear (for Agusan municipalities)
    for (const dbB of dbBarangays) {
      const key = normalizeBarangayName(dbB.name)
      barangayMap.set(key, {
        name: dbB.name,
        lpiiTag: dbB.lpii_tag ?? 'LOWLAND',
        applicants: [],
        skills: [],
      })
    }

    // Distribute applicants into barangayMap
    for (const app of targetApplicants) {
      const key = normalizeBarangayName(app.barangay)
      let bEntry = barangayMap.get(key)
      if (!bEntry) {
        bEntry = {
          name: app.barangay,
          lpiiTag: isAgusan ? app.lpiiTag : null,
          applicants: [],
          skills: [],
        }
        barangayMap.set(key, bEntry)
      }
      bEntry.applicants.push(app)
      bEntry.skills.push(...app.skills)
    }

    const barangayRows: BarangaySkillRow[] = Array.from(barangayMap.values())
      .map((entry) => {
        const aggregated = aggregateSkills(entry.skills)
        return {
          name: entry.name,
          lpiiTag: entry.lpiiTag,
          applicantsCount: entry.applicants.length,
          topSkills: aggregated.slice(0, 3),
          allSkills: aggregated.map((s) => s.name),
        }
      })
      .sort((a, b) => b.applicantsCount - a.applicantsCount || a.name.localeCompare(b.name))

    // Aggregate municipality-wide skills
    const allMuniSkills: ExtractedSkill[] = []
    let lowlandApplicants = 0
    let uplandApplicants = 0
    let wetlandApplicants = 0

    for (const app of targetApplicants) {
      if (isAgusan) {
        if (app.lpiiTag === 'LOWLAND') lowlandApplicants++
        else if (app.lpiiTag === 'UPLAND') uplandApplicants++
        else if (app.lpiiTag === 'WETLAND') wetlandApplicants++
      }
      allMuniSkills.push(...app.skills)
    }

    const skillsBreakdown = aggregateSkills(allMuniSkills)
    const categorySet = new Set<string>()
    for (const s of skillsBreakdown) {
      categorySet.add(s.category)
    }

    return {
      municipality: municipalityName,
      province,
      isAgusanDelSur: isAgusan,
      totalApplicants: targetApplicants.length,
      lowlandApplicants,
      uplandApplicants,
      wetlandApplicants,
      uniqueSkillsCount: skillsBreakdown.length,
      skillsBreakdown,
      categories: Array.from(categorySet).sort(),
      barangayRows,
      applicants: targetApplicants,
    }
  },

  /**
   * Fetches overall repository stats.
   */
  async fetchRepositoryStats(forceRefresh = false): Promise<SkillRepositoryStats> {
    const summaries = await this.fetchMunicipalitySummaries(forceRefresh)
    const allApplicants = await this.fetchAllApplicantProfiles(forceRefresh)
    return computeRepositoryStats(summaries, allApplicants)
  },
}
