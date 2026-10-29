import { computed, type MaybeRef } from 'vue'
import { useMapboxMap } from '@/composables/common/useMapboxMap'

interface UseCompanyMapOptions {
  latitude: MaybeRef<number | null>
  longitude: MaybeRef<number | null>
  companyName: MaybeRef<string>
}

/**
 * Composable for managing company location map.
 * Extends generic mapbox composable with company-specific configuration.
 * The map always renders: without a pin it shows the default center (Agusan del Sur).
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
  const shouldShowMap = computed(() => Boolean(mapState.mapboxToken))

  // Determine which fallback to show
  const fallbackType = computed(() => (mapState.mapboxToken ? 'none' : 'missing-token'))

  return {
    ...mapState,
    shouldShowMap,
    fallbackType,
  }
}
