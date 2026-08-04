import { ref, type Ref } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { userAccountService } from '@/services/admin/userAccountService'
import { getAllProvinces, getCities, getBarangays } from '@/helpers/common/psgcHelpers'
import { getOrSetPersistentCache, getPersistentCacheValue, removePersistentCacheValue } from '@/helpers/common/persistentCache'
import type { Database } from '@/types/database.types'

function normalizeText(value?: string | null) {
  return value?.trim().toLowerCase() ?? ''
}

function normalizeGeographicLabel(value?: string | null) {
  const normalized = normalizeText(value)
  return normalized
    .replace(/^city of\s+/i, '')
    .replace(/^municipality of\s+/i, '')
    .replace(/^municipality\s+/i, '')
    .replace(/^city\s+/i, '')
    .replace(/\s+city$/i, '')
    .trim()
}

function matchesGeographicLabel(left?: string | null, right?: string | null) {
  const leftNormalized = normalizeGeographicLabel(left)
  const rightNormalized = normalizeGeographicLabel(right)
  return leftNormalized === rightNormalized
}

function normalizeBarangayName(value?: string | null) {
  const normalized = normalizeText(value)
  // Remove common barangay name suffixes/prefixes
  return normalized
    .replace(/\s+barangay$/i, '')
    .replace(/^barangay\s+/i, '')
    .replace(/\s+puroks?$/i, '')
    .replace(/\s+sitio\s+/i, ' ')
    .trim()
}

function findBarangayTagByName(
  barangayName: string,
  barangayRecords: Array<{ name?: string | null; lpii_tag?: Database['public']['Enums']['lpii_type'] | null }>
): Database['public']['Enums']['lpii_type'] | null {
  const searchNormalized = normalizeBarangayName(barangayName)
  
  // First try exact normalized match
  for (const record of barangayRecords) {
    if (normalizeBarangayName(record.name) === searchNormalized) {
      return record.lpii_tag ?? null
    }
  }
  
  // Second try similarity matching: check if normalized names contain each other or have high overlap
  for (const record of barangayRecords) {
    const recordNormalized = normalizeBarangayName(record.name)
    if (
      recordNormalized.includes(searchNormalized) ||
      searchNormalized.includes(recordNormalized) ||
      levenshteinDistance(searchNormalized, recordNormalized) <= 2
    ) {
      return record.lpii_tag ?? null
    }
  }
  
  return null
}

function levenshteinDistance(a: string, b: string): number {
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

function getGeographicAliases(value?: string | null) {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return []

  const aliases = new Set<string>([trimmed])
  const stripped = trimmed
    .replace(/^city of\s+/i, '')
    .replace(/^municipality of\s+/i, '')
    .replace(/^municipality\s+/i, '')
    .replace(/^city\s+/i, '')
    .replace(/\s+city$/i, '')
    .trim()

  if (stripped) {
    aliases.add(stripped)
    aliases.add(`City of ${stripped}`)
    aliases.add(`${stripped} City`)
    aliases.add(`Municipality of ${stripped}`)
  }

  return [...aliases]
}

type MunicipalityRow = {
  id: string
  code: string
  name: string
}

type BarangayRow = {
  name: string
  users: number
  lpiiTag: Database['public']['Enums']['lpii_type']
}

const MUNICIPALITY_CACHE_TTL_MS = 1000 * 60 * 15

function getMunicipalityCacheKey(municipalityName: string) {
  return `geographic:municipality:${normalizeText(municipalityName)}`
}

export function useMunicipalityData(initialMunicipality?: string) {
  const municipality = ref(initialMunicipality ?? '')
  const isLoading = ref(false)
  const barangayRows = ref<BarangayRow[]>([])

  async function loadData(name?: string, options?: { forceRefresh?: boolean }) {
    const municipalityName = (name ?? municipality.value) || ''
    if (!municipalityName) {
      barangayRows.value = []
      return
    }

    municipality.value = municipalityName
    const cacheKey = getMunicipalityCacheKey(municipalityName)

    if (!options?.forceRefresh) {
      const cachedRows = getPersistentCacheValue<BarangayRow[]>(cacheKey)
      if (cachedRows !== null) {
        barangayRows.value = cachedRows
        isLoading.value = false
        return
      }
    } else {
      removePersistentCacheValue(cacheKey)
    }

    isLoading.value = true
    try {
      const profiles = await userAccountService.fetchAllProfiles()

      let psgcBarangayNames: string[] = []
      let municipalityRecord: MunicipalityRow | null = null
      try {
        const provinces = await getAllProvinces()
        const province = provinces.find((p: any) => matchesGeographicLabel(p.name, 'Agusan del Sur'))
        if (province?.code) {
          const cities = await getCities(province.code)
          const municipalityEntry = cities.find((c: any) => matchesGeographicLabel(c.name, municipalityName))
          if (municipalityEntry?.code) {
            const barangays = await getBarangays(municipalityEntry.code)
            psgcBarangayNames = barangays.map((b: any) => b.name?.trim() ?? '').filter(Boolean)

            const municipalityAliases = getGeographicAliases(municipalityEntry.name)
            const { data: municipalityRowsData, error: municipalityError } = await supabase
              .schema('public')
              .from('municipalities')
              .select('id, code, name')
              .or(`code.eq.${municipalityEntry.code},${municipalityAliases.map((alias) => `name.ilike.${alias}`).join(',')}`)
              .maybeSingle()

            if (municipalityError) {
              throw new Error(municipalityError.message || 'Failed to load municipality record')
            }

            if (municipalityRowsData) {
              municipalityRecord = municipalityRowsData as MunicipalityRow
            }
          }
        }
      } catch {
        // fall back to profile data when PSGC or Supabase lookups fail
      }

      const counts = new Map<string, number>()
      const barangayTags = new Map<string, Database['public']['Enums']['lpii_type'] | null>()

      if (psgcBarangayNames.length > 0) {
        for (const n of psgcBarangayNames) counts.set(n, 0)
        for (const p of profiles) {
          if (normalizeText(p.geographic) !== normalizeText(municipalityName)) continue
          const b = p.barangay?.trim() || 'Unknown'
          counts.set(b, (counts.get(b) ?? 0) + 1)
        }
      } else {
        for (const p of profiles) {
          if (normalizeText(p.geographic) !== normalizeText(municipalityName)) continue
          const b = p.barangay?.trim() || 'Unknown'
          counts.set(b, (counts.get(b) ?? 0) + 1)
        }
      }

      if (municipalityRecord?.id) {
        const { data: barangayRecords, error: barangayError } = await supabase
          .schema('public')
          .from('barangays')
          .select('name, lpii_tag')
          .eq('municipality_id', municipalityRecord.id)

        if (barangayError) {
          throw new Error(barangayError.message || 'Failed to load barangay LPII tags')
        }

        // Populate barangayTags map for ALL barangays in the counts map using fuzzy matching
        if (barangayRecords && barangayRecords.length > 0) {
          for (const [barangayName, _] of counts.entries()) {
            const tag = findBarangayTagByName(barangayName, barangayRecords)
            barangayTags.set(barangayName, tag)
          }
        } else {
          // Try direct name match against database
          for (const [barangayName, _] of counts.entries()) {
            barangayTags.set(barangayName, null)
          }
        }
      } else {
        // If no municipality record found, still initialize barangay tags to prevent "Unclassified"
        for (const [barangayName, _] of counts.entries()) {
          barangayTags.set(barangayName, null)
        }
      }

      const nextRows = Array.from(counts.entries())
        .map(([name, users]) => ({
          name,
          users,
          lpiiTag: barangayTags.get(name) ?? 'LOWLAND',
        }))
        .sort((a, b) => a.name.localeCompare(b.name))

      await getOrSetPersistentCache(cacheKey, MUNICIPALITY_CACHE_TTL_MS, async () => nextRows)
      barangayRows.value = nextRows
    } finally {
      isLoading.value = false
    }
  }

  return {
    municipality: municipality as Ref<string>,
    barangayRows,
    isLoading,
    loadData,
  }
}
