import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import { getAllProvinces, getCities, getBarangays } from '@/helpers/common/psgcHelpers'
import {
  matchesGeographicLabel,
  normalizeGeographicLabel,
} from '@/helpers/peso/provincialPeso/skillRepositoryHelper'
import type {
  ApplicantSkillProfile,
  ExtractedSkill,
  LpiiCategory,
  MunicipalitySkillDetail,
  MunicipalitySkillSummaryRow,
  SkillCountEntry,
  SkillRepositoryApplicantFilters,
  SkillRepositorySummary,
} from '@/types/peso/provincialPeso/skillRepository'

/**
 * Skill Repository reads (migration 110). The database extracts, cleans and counts skills; the browser
 * only receives totals, per-municipality summaries and one page of applicants at a time.
 *
 * The RPCs are not in database.types.ts until `npm run types:gen`, so the typed client rejects their
 * names; use `supabase.schema('applicants')` directly after regenerating.
 */
const untypedApplicants = () => (supabase as unknown as SupabaseClient).schema('applicants')

/** Shown on the dashboard cards and tables */
const TOP_SKILLS_PER_MUNICIPALITY = 4

type SummaryMunicipalityRow = Omit<MunicipalitySkillSummaryRow, 'topSkills' | 'uniqueSkillsCount'>

interface SummaryResponse {
  stats: Omit<SkillRepositorySummary['stats'], 'municipalitiesCovered' | 'outsideMunicipalitiesCount'>
  municipalities: SummaryMunicipalityRow[]
  skills: SkillCountEntry[]
}

interface ApplicantPageRow {
  id: string
  profile_id: string | null
  first_name: string | null
  middle_name: string | null
  surname: string | null
  suffix: string | null
  municipality: string
  barangay: string
  province: string
  lpii_tag: LpiiCategory | null
  skills: { name: string; category: string }[]
  contact_number: string | null
  email: string | null
  employment_status: string | null
  highest_education: string | null
  total_count: number
}

/**
 * Barangays per Agusan del Sur municipality from PSGC (cached for 30 days by psgcHelpers).
 * Preferred over the database count, which may be incomplete; empty when PSGC is unreachable.
 */
async function fetchPsgcBarangayCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  try {
    const provinces = await getAllProvinces()
    const province = provinces.find((p: { name: string }) => matchesGeographicLabel(p.name, 'Agusan del Sur'))
    if (!province?.code) return counts
    const cities = await getCities(province.code)
    await Promise.all(
      cities.map(async (city: { code: string; name: string }) => {
        try {
          counts[normalizeGeographicLabel(city.name)] = (await getBarangays(city.code)).length
        } catch {
          // keeps the database count for this one
        }
      }),
    )
  } catch {
    // the database counts stay
  }
  return counts
}

function toApplicantProfile(row: ApplicantPageRow): ApplicantSkillProfile {
  const fullName = [row.first_name, row.middle_name, row.surname, row.suffix].filter(Boolean).join(' ') || 'Applicant'
  const skills: ExtractedSkill[] = (row.skills ?? []).map((skill) => ({ ...skill, source: 'other_skills' }))
  return {
    id: row.id,
    profileId: row.profile_id,
    fullName,
    firstName: row.first_name ?? '',
    surname: row.surname ?? '',
    middleName: row.middle_name,
    municipality: row.municipality,
    barangay: row.barangay,
    province: row.province,
    lpiiTag: row.lpii_tag,
    skills,
    skillNames: skills.map((skill) => skill.name),
    contactNumber: row.contact_number,
    email: row.email,
    employmentStatus: row.employment_status,
    highestEducation: row.highest_education,
  }
}

export const skillRepositoryService = {
  /** Dashboard: totals, one row per municipality (14 of Agusan del Sur always) and every skill */
  async fetchSummary(): Promise<SkillRepositorySummary> {
    const [{ data, error }, psgcCounts] = await Promise.all([
      untypedApplicants().rpc('skill_repository_summary'),
      fetchPsgcBarangayCounts(),
    ])
    if (error) throw new Error(error.message || 'Failed to load the skill repository.')

    const response = data as SummaryResponse
    const municipalities: MunicipalitySkillSummaryRow[] = response.municipalities.map((row) => ({
      ...row,
      barangays: (row.isAgusanDelSur && psgcCounts[normalizeGeographicLabel(row.name)]) || row.barangays,
      topSkills: row.allSkills.slice(0, TOP_SKILLS_PER_MUNICIPALITY),
      uniqueSkillsCount: row.allSkills.length,
    }))

    return {
      stats: {
        ...response.stats,
        municipalitiesCovered: municipalities.filter((row) => row.isAgusanDelSur && row.totalApplicants > 0).length,
        outsideMunicipalitiesCount: municipalities.filter((row) => !row.isAgusanDelSur).length,
      },
      municipalities,
      skills: response.skills,
    }
  },

  /** One municipality: totals, skills breakdown and its barangays (applicants come page by page) */
  async fetchMunicipalityDetail(municipalityName: string): Promise<MunicipalitySkillDetail> {
    const { data, error } = await untypedApplicants().rpc('skill_repository_municipality', { p_name: municipalityName })
    if (error) throw new Error(error.message || `Failed to load ${municipalityName}.`)
    return data as MunicipalitySkillDetail
  },

  /** One page of a municipality's applicants, newest first, with the filtered total */
  async fetchApplicantsPage(
    filters: SkillRepositoryApplicantFilters,
  ): Promise<{ rows: ApplicantSkillProfile[]; total: number }> {
    const { data, error } = await untypedApplicants().rpc('skill_repository_applicants', {
      p_municipality: filters.municipality,
      p_search: filters.search || null,
      p_skill: filters.skill || null,
      p_lpii: filters.lpii === 'ALL' ? null : filters.lpii,
      p_limit: filters.pageSize,
      p_offset: (filters.page - 1) * filters.pageSize,
    })
    if (error) throw new Error(error.message || 'Failed to load the applicants.')
    const rows = (data ?? []) as ApplicantPageRow[]
    return { rows: rows.map(toApplicantProfile), total: Number(rows[0]?.total_count ?? 0) }
  },
}
