import { computed, unref, type MaybeRef, type Ref } from 'vue'
import { useMapboxMap } from '@/composables/common/useMapboxMap'
import { DEFAULT_MAP_CENTER, DEFAULT_MAPBOX_STYLE, type MapCoordinates } from '@/helpers/common/mapboxHelpers'

interface UseGeographicMapOptions {
	mapContainer?: Ref<HTMLDivElement | null>
	latitude?: MaybeRef<number | null>
	longitude?: MaybeRef<number | null>
	label?: MaybeRef<string>
	zoom?: MaybeRef<number>
	style?: MaybeRef<string | null | undefined>
	defaultCenter?: MapCoordinates
}

export function useGeographicMap(options: UseGeographicMapOptions = {}) {
	const mapState = useMapboxMap({
		mapContainer: options.mapContainer,
		latitude: options.latitude ?? null,
		longitude: options.longitude ?? null,
		label: options.label ?? 'Geographic location',
		zoom: options.zoom ?? 11,
		style: options.style ?? DEFAULT_MAPBOX_STYLE,
		defaultCenter: options.defaultCenter ?? DEFAULT_MAP_CENTER,
	})

	const hasLocation = computed(() => mapState.hasCoordinates.value)
	const isTokenReady = computed(() => Boolean(mapState.mapboxToken))

	return {
		...mapState,
		hasLocation,
		isTokenReady,
		label: computed(() => unref(options.label) ?? 'Geographic location'),
	}
}