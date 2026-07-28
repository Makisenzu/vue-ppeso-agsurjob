import { ref, computed, watch } from 'vue'
import { getRegions, getProvinces, getCities, getBarangays } from '@/helpers/common/psgcHelpers'

export function usePsgc() {
  // Selected values
  const selectedRegion = ref<any>(null)
  const selectedProvince = ref<any>(null)
  const selectedCity = ref<any>(null)
  const selectedBarangay = ref<any>(null)

  // Search terms
  const regionSearch = ref('')
  const provinceSearch = ref('')
  const citySearch = ref('')
  const barangaySearch = ref('')

  // Data arrays
  const regions = ref<any[]>([])
  const provinces = ref<any[]>([])
  const cities = ref<any[]>([])
  const barangays = ref<any[]>([])

  // Filtered computed properties
  const filteredRegions = computed(() => {
    if (!regionSearch.value) return regions.value
    return regions.value.filter(r =>
      r.name.toLowerCase().includes(regionSearch.value.toLowerCase())
    )
  })

  const filteredProvinces = computed(() => {
    if (!provinceSearch.value) return provinces.value
    return provinces.value.filter(p =>
      p.name.toLowerCase().includes(provinceSearch.value.toLowerCase())
    )
  })

  const filteredCities = computed(() => {
    if (!citySearch.value) return cities.value
    return cities.value.filter(c =>
      c.name.toLowerCase().includes(citySearch.value.toLowerCase())
    )
  })

  const filteredBarangays = computed(() => {
    if (!barangaySearch.value) return barangays.value
    return barangays.value.filter(b =>
      b.name.toLowerCase().includes(barangaySearch.value.toLowerCase())
    )
  })

  // Load functions
  const loadRegions = async () => {
    regions.value = await getRegions()
  }

  const loadProvinces = async (regionCode: string) => {
    provinces.value = await getProvinces(regionCode)
  }

  const loadCities = async (provinceCode: string) => {
    cities.value = await getCities(provinceCode)
  }

  const loadBarangays = async (cityCode: string) => {
    barangays.value = await getBarangays(cityCode)
  }

  const isRestoring = ref(false)

  // Watchers for region selection changes
  watch(selectedRegion, async (newRegion) => {
    if (newRegion) {
      if (!isRestoring.value) {
        selectedProvince.value = null
        selectedCity.value = null
        selectedBarangay.value = null
      }
      await loadProvinces(newRegion.code)
    }
  })

  // Watchers for province selection changes
  watch(selectedProvince, async (newProvince) => {
    if (newProvince) {
      if (!isRestoring.value) {
        selectedCity.value = null
        selectedBarangay.value = null
      }
      await loadCities(newProvince.code)
    }
  })

  // Watchers for city selection changes
  watch(selectedCity, async (newCity) => {
    if (newCity) {
      if (!isRestoring.value) {
        selectedBarangay.value = null
      }
      await loadBarangays(newCity.code)
    }
  })

  // Reset function
  const reset = () => {
    selectedRegion.value = null
    selectedProvince.value = null
    selectedCity.value = null
    selectedBarangay.value = null
    regionSearch.value = ''
    provinceSearch.value = ''
    citySearch.value = ''
    barangaySearch.value = ''
  }

  // Initialize on first use
  const initialize = async (regionName?: string, provinceName?: string, cityName?: string, barangayName?: string) => {
    if (regionName) {
      isRestoring.value = true
      try {
        await loadRegions()
        const region = regions.value.find(r => r.name.toLowerCase() === regionName.toLowerCase())
        if (region) {
          selectedRegion.value = region
          await loadProvinces(region.code)
          
          if (provinceName) {
            const province = provinces.value.find(p => p.name.toLowerCase() === provinceName.toLowerCase())
            if (province) {
              selectedProvince.value = province
              await loadCities(province.code)
              
              if (cityName) {
                const city = cities.value.find(c => c.name.toLowerCase() === cityName.toLowerCase())
                if (city) {
                  selectedCity.value = city
                  await loadBarangays(city.code)
                  
                  if (barangayName) {
                    const barangay = barangays.value.find(b => b.name.toLowerCase() === barangayName.toLowerCase())
                    if (barangay) {
                      selectedBarangay.value = barangay
                    }
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to restore location values:', error)
      } finally {
        isRestoring.value = false
      }
    } else {
      await loadRegions()
    }
  }

  return {
    // Selected values
    selectedRegion,
    selectedProvince,
    selectedCity,
    selectedBarangay,

    // Search terms
    regionSearch,
    provinceSearch,
    citySearch,
    barangaySearch,

    // Data arrays
    regions,
    provinces,
    cities,
    barangays,

    // Filtered computed properties
    filteredRegions,
    filteredProvinces,
    filteredCities,
    filteredBarangays,

    // Functions
    loadRegions,
    loadProvinces,
    loadCities,
    loadBarangays,
    reset,
    initialize,
  }
}

