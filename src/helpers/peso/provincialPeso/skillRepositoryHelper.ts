import type { Database } from '@/types/database.types'
import type {
  ApplicantSkillProfile,
  ExtractedSkill,
  LpiiCategory,
  MunicipalitySkillSummaryRow,
  SkillCountEntry,
  SkillRepositoryStats,
} from '@/types/peso/provincialPeso/skillRepository'

// ─── Text Normalization & Matching ───

export function normalizeText(value?: string | null): string {
  return value?.trim().toLowerCase() ?? ''
}

export function normalizeGeographicLabel(value?: string | null): string {
  const normalized = normalizeText(value)
  return normalized
    .replace(/^city of\s+/i, '')
    .replace(/^municipality of\s+/i, '')
    .replace(/^municipality\s+/i, '')
    .replace(/^city\s+/i, '')
    .replace(/\s+city$/i, '')
    .trim()
}

export function matchesGeographicLabel(left?: string | null, right?: string | null): boolean {
  return normalizeGeographicLabel(left) === normalizeGeographicLabel(right)
}

export function normalizeBarangayName(value?: string | null): string {
  const normalized = normalizeText(value)
  return normalized
    .replace(/\s+barangay$/i, '')
    .replace(/^barangay\s+/i, '')
    .replace(/\s+brgy\.?$/i, '')
    .replace(/^brgy\.?\s+/i, '')
    .replace(/\s+puroks?$/i, '')
    .replace(/\s+sitio\s+/i, ' ')
    .trim()
}

export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(0))

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      )
    }
  }

  return matrix[b.length][a.length]
}

export function findBarangayTagByName(
  barangayName: string,
  barangayRecords: Array<{ name?: string | null; lpii_tag?: LpiiCategory | null }>
): LpiiCategory {
  if (!barangayName || barangayName === 'N/A' || barangayName === 'Unknown') {
    return 'LOWLAND'
  }

  const searchNormalized = normalizeBarangayName(barangayName)

  // 1. Exact normalized match
  for (const record of barangayRecords) {
    if (normalizeBarangayName(record.name) === searchNormalized) {
      return record.lpii_tag ?? 'LOWLAND'
    }
  }

  // 2. Substring & fuzzy distance match (threshold <= 2)
  for (const record of barangayRecords) {
    const recordNormalized = normalizeBarangayName(record.name)
    if (
      recordNormalized.includes(searchNormalized) ||
      searchNormalized.includes(recordNormalized) ||
      levenshteinDistance(searchNormalized, recordNormalized) <= 2
    ) {
      return record.lpii_tag ?? 'LOWLAND'
    }
  }

  return 'LOWLAND'
}

// ─── Skill Classification & Categorization ───

export function categorizeSkill(skillName: string): string {
  const lower = normalizeText(skillName)

  if (
    lower.includes('comput') ||
    lower.includes('gis') ||
    lower.includes('prog') ||
    lower.includes('data') ||
    lower.includes('software') ||
    lower.includes('web') ||
    lower.includes('it ') ||
    lower.includes('hardware') ||
    lower.includes('network') ||
    lower.includes('spss') ||
    lower.includes('qgis') ||
    lower.includes('fragstat') ||
    lower.includes('typing')
  ) {
    return 'Information Technology'
  }

  if (
    lower.includes('weld') ||
    lower.includes('smaw') ||
    lower.includes('carpenter') ||
    lower.includes('carpent') ||
    lower.includes('mason') ||
    lower.includes('plumb') ||
    lower.includes('electric') ||
    lower.includes('automot') ||
    lower.includes('mechanic') ||
    lower.includes('engine') ||
    lower.includes('construct') ||
    lower.includes('repair')
  ) {
    return 'Technical & Engineering'
  }

  if (
    lower.includes('farm') ||
    lower.includes('agri') ||
    lower.includes('garden') ||
    lower.includes('watershed') ||
    lower.includes('water') ||
    lower.includes('crop') ||
    lower.includes('poultry') ||
    lower.includes('livestock') ||
    lower.includes('fish') ||
    lower.includes('forest')
  ) {
    return 'Agriculture & Environment'
  }

  if (
    lower.includes('admin') ||
    lower.includes('clerk') ||
    lower.includes('bookkeep') ||
    lower.includes('account') ||
    lower.includes('office') ||
    lower.includes('secretar') ||
    lower.includes('manage') ||
    lower.includes('statist') ||
    lower.includes('analys')
  ) {
    return 'Office & Administration'
  }

  if (
    lower.includes('cook') ||
    lower.includes('bake') ||
    lower.includes('food') ||
    lower.includes('chores') ||
    lower.includes('housekeep') ||
    lower.includes('care') ||
    lower.includes('driv') ||
    lower.includes('sew') ||
    lower.includes('tailor') ||
    lower.includes('beaut') ||
    lower.includes('hair') ||
    lower.includes('massage') ||
    lower.includes('service')
  ) {
    return 'Services & Livelihood'
  }

  if (
    lower.includes('paint') ||
    lower.includes('art') ||
    lower.includes('draw') ||
    lower.includes('craft') ||
    lower.includes('music') ||
    lower.includes('photo')
  ) {
    return 'Arts & Design'
  }

  return 'General Skills'
}

export const AGUSAN_DEL_SUR_CANONICAL_MUNICIPALITIES: string[] = [
  'City of Bayugan',
  'Bunawan',
  'Esperanza',
  'La Paz',
  'Loreto',
  'Prosperidad',
  'Rosario',
  'San Francisco',
  'San Luis',
  'Santa Josefa',
  'Sibagat',
  'Talacogon',
  'Trento',
  'Veruela',
]

export function isAgusanDelSurMunicipality(name?: string | null): boolean {
  if (!name) return false
  return AGUSAN_DEL_SUR_CANONICAL_MUNICIPALITIES.some((m) => matchesGeographicLabel(m, name))
}

export function cleanSkillName(rawName?: string | null): string {
  if (!rawName) return ''
  const trimmed = rawName.trim().replace(/^[-*•,\s]+|[-*•,\s]+$/g, '')
  if (!trimmed || trimmed.length < 2) return ''
  if (/^n[\s/.]*a$/i.test(trimmed) || /^none$/i.test(trimmed)) return ''

  // Standardize common variations
  if (/computer\s*(literate|literacy)/i.test(trimmed)) return 'Computer Literacy'
  if (/qgis/i.test(trimmed)) return 'QGIS / Spatial Mapping'
  if (/^gis$/i.test(trimmed)) return 'GIS (Geographic Information Systems)'
  if (/smaw/i.test(trimmed)) return 'Shielded Metal Arc Welding (SMAW)'
  if (/watershed\s*(delineation|dilimation)/i.test(trimmed) || /water\s*dilimation/i.test(trimmed)) {
    return 'Watershed Delineation'
  }
  if (/fragstat/i.test(trimmed)) return 'Fragstats (Spatial Pattern Analysis)'
  if (/spss/i.test(trimmed)) return 'SPSS / Biostatistics'
  if (/painter\s*\/\s*artist/i.test(trimmed)) return 'Painter / Visual Artist'

  // Format to Title Case
  return trimmed
    .split(/\s+/)
    .map((word) => {
      if (word.length <= 3 && word === word.toUpperCase()) return word
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

// ─── Extract Skills from Applicant Row & Profile ───

export function extractSkillsFromApplicant(
  applicantRow: Database['applicants']['Tables']['applicants']['Row'],
  linkedSkills: Array<Database['applicants']['Tables']['applicant_skills']['Row']> = []
): ExtractedSkill[] {
  const extracted: ExtractedSkill[] = []
  const seen = new Set<string>()

  function addSkill(name: string, categoryFallback?: string, source: ExtractedSkill['source'] = 'other_skills') {
    const cleaned = cleanSkillName(name)
    if (!cleaned) return
    const key = normalizeText(cleaned)
    if (seen.has(key)) return
    seen.add(key)

    extracted.push({
      name: cleaned,
      category: categoryFallback || categorizeSkill(cleaned),
      source,
    })
  }

  // 1. Linked applicant_skills records
  for (const s of linkedSkills) {
    if (s.skill_name) {
      addSkill(s.skill_name, s.skill_category, 'applicant_skills')
    }
  }

  // 2. other_skills array
  if (Array.isArray(applicantRow.other_skills)) {
    for (const s of applicantRow.other_skills) {
      if (typeof s === 'string') {
        addSkill(s, undefined, 'other_skills')
      }
    }
  }

  // 3. other_skills_specified
  if (applicantRow.other_skills_specified) {
    const parts = applicantRow.other_skills_specified.split(/[,;\n]/)
    for (const part of parts) {
      addSkill(part, undefined, 'other_skills')
    }
  }

  // 4. vocational_trainings
  if (Array.isArray(applicantRow.vocational_trainings)) {
    for (const training of applicantRow.vocational_trainings as Array<Record<string, unknown>>) {
      if (typeof training.skills_acquired === 'string') {
        addSkill(training.skills_acquired, undefined, 'vocational')
      }
      if (typeof training.course_training_title === 'string') {
        addSkill(training.course_training_title, undefined, 'vocational')
      }
    }
  }

  // 5. eligibilities
  if (Array.isArray(applicantRow.eligibilities)) {
    for (const el of applicantRow.eligibilities as Array<Record<string, unknown>>) {
      if (typeof el.eligibility_title === 'string') {
        addSkill(el.eligibility_title, 'Certifications & Eligibilities', 'other_skills')
      }
      if (typeof el.license_title === 'string') {
        addSkill(el.license_title, 'Certifications & Eligibilities', 'other_skills')
      }
    }
  }

  return extracted
}

// ─── Aggregation Utilities ───

export function aggregateSkills(skills: ExtractedSkill[]): SkillCountEntry[] {
  const counts = new Map<string, { count: number; category: string; originalName: string }>()

  for (const skill of skills) {
    const key = normalizeText(skill.name)
    const existing = counts.get(key)
    if (existing) {
      existing.count += 1
    } else {
      counts.set(key, {
        count: 1,
        category: skill.category,
        originalName: skill.name,
      })
    }
  }

  return Array.from(counts.values())
    .map((item) => ({
      name: item.originalName,
      count: item.count,
      category: item.category,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export function computeRepositoryStats(
  municipalityRows: MunicipalitySkillSummaryRow[],
  allApplicants: ApplicantSkillProfile[]
): SkillRepositoryStats {
  const totalApplicants = allApplicants.length
  let lowlandApplicants = 0
  let uplandApplicants = 0
  let wetlandApplicants = 0
  let agusanApplicants = 0
  let outsideApplicants = 0

  for (const app of allApplicants) {
    const isAgusan = isAgusanDelSurMunicipality(app.municipality)
    if (isAgusan) {
      agusanApplicants += 1
      if (app.lpiiTag === 'LOWLAND') lowlandApplicants += 1
      else if (app.lpiiTag === 'UPLAND') uplandApplicants += 1
      else if (app.lpiiTag === 'WETLAND') wetlandApplicants += 1
    } else {
      outsideApplicants += 1
    }
  }

  const uniqueSkillsSet = new Set<string>()
  for (const app of allApplicants) {
    for (const skill of app.skillNames) {
      uniqueSkillsSet.add(normalizeText(skill))
    }
  }

  const municipalitiesCovered = municipalityRows.filter(
    (m) => m.isAgusanDelSur && m.totalApplicants > 0
  ).length

  const outsideMunicipalitiesCount = municipalityRows.filter(
    (m) => !m.isAgusanDelSur
  ).length

  return {
    totalApplicants,
    totalUniqueSkills: uniqueSkillsSet.size,
    lowlandApplicants,
    uplandApplicants,
    wetlandApplicants,
    municipalitiesCovered,
    agusanApplicants,
    outsideApplicants,
    outsideMunicipalitiesCount,
  }
}
