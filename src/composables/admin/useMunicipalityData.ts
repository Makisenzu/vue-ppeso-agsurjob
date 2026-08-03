import { ref, type Ref } from 'vue'
import { userAccountService } from '@/services/admin/userAccountService'
import { getAllProvinces, getCities, getBarangays } from '@/helpers/common/psgcHelpers'

function normalizeText(value?: string | null) {
  return value?.trim().toLowerCase() ?? ''
}

export function useMunicipalityData(initialMunicipality?: string) {
  const municipality = ref(initialMunicipality ?? '')
  const isLoading = ref(false)
  const barangayRows = ref<{ name: string; users: number }[]>([])

  async function loadData(name?: string) {
    const municipalityName = (name ?? municipality.value) || ''
    if (!municipalityName) {
      barangayRows.value = []
      return
    }

    isLoading.value = true
    try {
      const profiles = await userAccountService.fetchAllProfiles()

      // Try to get official barangay list from PSGC; fall back to computing from profiles
      let psgcBarangayNames: string[] = []
      try {
        const provinces = await getAllProvinces()
        const province = provinces.find((p: any) => normalizeText(p.name) === 'agusan del sur')
        if (province?.code) {
          const cities = await getCities(province.code)
          const municipalityEntry = cities.find((c: any) => normalizeText(c.name) === normalizeText(municipalityName))
          if (municipalityEntry?.code) {
            const barangays = await getBarangays(municipalityEntry.code)
            psgcBarangayNames = barangays.map((b: any) => b.name?.trim() ?? '').filter(Boolean)
          }
        }
      } catch {
        // ignore PSGC errors
      }

      const counts = new Map<string, number>()

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

      barangayRows.value = Array.from(counts.entries())
        .map(([name, users]) => ({ name, users }))
        .sort((a, b) => a.name.localeCompare(b.name))
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
