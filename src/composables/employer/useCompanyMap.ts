import { computed } from 'vue'
import { useMapboxMap } from '@/composables/common/useMapboxMap'

interface UseCompanyMapOptions {
  latitude: number | null
  longitude: number | null
  companyName: string
}

/**
 * Composable for managing company location map.
 * Extends generic mapbox composable with company-specific configuration.
 */
export function useCompanyMap(options: UseCompanyMapOptions) {
  const { latitude, longitude, companyName } = options

  const mapState = useMapboxMap({
    latitude,
    longitude,
    label: companyName,
    zoom: 14,
  })

  // Check if map should be displayed
  const shouldShowMap = computed(() => {
    return mapState.mapboxToken && mapState.hasCoordinates.value
  })

  // Determine which fallback to show
  const fallbackType = computed(() => {
    if (!mapState.mapboxToken) return 'missing-token'
    if (!mapState.hasCoordinates.value) return 'missing-coordinates'
    return 'none'
  })

  return {
    ...mapState,
    shouldShowMap,
    fallbackType,
  }
}
