import { computed, createApp, h, nextTick, onBeforeUnmount, onMounted, ref, unref, watch, type MaybeRef, type Ref } from 'vue'
import mapboxgl from 'mapbox-gl'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useSystemDirectoryStore } from '@/stores/admin/systemDirectoryStore'
import {
	DEFAULT_MAP_CENTER,
	DEFAULT_MAPBOX_STYLE,
	hasValidCoordinates,
	resolveCoordinates,
	resolveMapboxToken,
	resolveMapboxStyle,
	buildLocationQuery,
	geocodeMapboxLocation,
	type MapCoordinates,
} from '@/helpers/common/mapboxHelpers'
import type { DirectoryProfileRow } from '@/types/admin/systemDirectory'

interface UseGeographicMapOptions {
	mapContainer?: Ref<HTMLDivElement | null>
	latitude?: MaybeRef<number | null>
	longitude?: MaybeRef<number | null>
	label?: MaybeRef<string>
	zoom?: MaybeRef<number>
	style?: MaybeRef<string | null | undefined>
	defaultCenter?: MapCoordinates
}

type ViewMode = 'all' | 'municipalities' | 'barangay'

type MarkerAppHandle = {
	unmount: () => void
}

type MapboxMarkerHandle = {
	remove: () => void
}

interface DirectoryMarkerEntry {
	marker: MapboxMarkerHandle
	app: MarkerAppHandle
}

function normalizeText(value?: string | null) {
	return value?.trim().toLowerCase() ?? ''
}

function getDisplayName(record: DirectoryProfileRow) {
	return [record.firstname, record.middlename, record.lastname].filter(Boolean).join(' ').trim() || record.username || 'User'
}

function getInitials(displayName: string) {
	return displayName
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? '')
		.join('') || 'U'
}

export function useGeographicMap(options: UseGeographicMapOptions = {}) {
	const store = useSystemDirectoryStore()
	const internalMapContainer = ref<HTMLDivElement | null>(null)
	const mapContainer = options.mapContainer ?? internalMapContainer
	const map = ref<mapboxgl.Map | null>(null)
	const markerEntries = ref<DirectoryMarkerEntry[]>([])
	const mapboxToken = resolveMapboxToken()
	const mapStyle = computed(() => resolveMapboxStyle(unref(options.style) ?? DEFAULT_MAPBOX_STYLE))
	const defaultCenter = computed(() => options.defaultCenter ?? DEFAULT_MAP_CENTER)
	const viewMode = ref<ViewMode>('all')
	const selectedMunicipality = ref<string>('')
	const selectedBarangay = ref<string>('')
	const isReady = ref(false)
	const isGeocoding = ref(false)
	const geoError = ref<string | null>(null)

	// When true, the map was just created and we should preserve
	// the initial center/zoom rather than auto-fitting to markers.
	const initialLoad = ref(true)

	const records = computed(() => store.records.filter((record) => record.status !== 'inactive'))
	const municipalities = computed(() => {
		const seen = new Map<string, { name: string; count: number }>()
		for (const record of records.value) {
			const name = record.geographic?.trim()
			if (!name) continue
			const key = normalizeText(name)
			const entry = seen.get(key)
			seen.set(key, entry ? { ...entry, count: entry.count + 1 } : { name, count: 1 })
		}
		return [...seen.values()].sort((left, right) => left.name.localeCompare(right.name))
	})

	const barangays = computed(() => {
		if (!selectedMunicipality.value) return []
		const seen = new Map<string, { name: string; count: number }>()
		for (const record of records.value) {
			if (normalizeText(record.geographic) !== normalizeText(selectedMunicipality.value)) continue
			const name = record.barangay?.trim()
			if (!name) continue
			const key = normalizeText(name)
			const entry = seen.get(key)
			seen.set(key, entry ? { ...entry, count: entry.count + 1 } : { name, count: 1 })
		}
		return [...seen.values()].sort((left, right) => left.name.localeCompare(right.name))
	})

	const filteredRecords = computed(() => {
		if (viewMode.value === 'all') return records.value
		return records.value.filter((record) => {
			const matchesMunicipality = !selectedMunicipality.value
				|| normalizeText(record.geographic) === normalizeText(selectedMunicipality.value)
			const matchesBarangay = viewMode.value !== 'barangay'
				|| !selectedBarangay.value
				|| normalizeText(record.barangay) === normalizeText(selectedBarangay.value)
			return matchesMunicipality && matchesBarangay
		})
	})

	const totalUsers = computed(() => filteredRecords.value.length)
	const selectedLocationLabel = computed(() => {
		if (viewMode.value === 'barangay' && selectedBarangay.value) return selectedBarangay.value
		if (selectedMunicipality.value) return selectedMunicipality.value
		return 'All locations'
	})
	const hasLocation = computed(() => filteredRecords.value.length > 0)
	const coordinateCache = new Map<string, MapCoordinates | null>()

	function clearMarkers() {
		for (const entry of markerEntries.value) {
			entry.marker.remove()
			entry.app.unmount()
		}
		markerEntries.value = []
	}

	function getRecordCoordinateKey(record: DirectoryProfileRow) {
		return `${record.id}:${record.category}:${record.geographic ?? ''}:${record.barangay ?? ''}:${record.province ?? ''}:${record.region ?? ''}`
	}

	async function resolveRecordCoordinates(record: DirectoryProfileRow) {
		const cacheKey = getRecordCoordinateKey(record)
		if (coordinateCache.has(cacheKey)) {
			return coordinateCache.get(cacheKey) ?? null
		}

		const companyCoordinates = record.companyDetails?.latitude != null && record.companyDetails?.longitude != null
			? resolveCoordinates(record.companyDetails.latitude, record.companyDetails.longitude)
			: null

		if (companyCoordinates && hasValidCoordinates(companyCoordinates.latitude, companyCoordinates.longitude)) {
			coordinateCache.set(cacheKey, companyCoordinates)
			return companyCoordinates
		}

		const query = buildLocationQuery([
			record.barangay,
			record.geographic,
			record.province,
			record.region,
		])

		const coordinates = query ? await geocodeMapboxLocation(query, mapboxToken) : null
		coordinateCache.set(cacheKey, coordinates)
		return coordinates
	}

	async function resolveSelectionCoordinates() {
		if (viewMode.value === 'barangay' && selectedBarangay.value) {
			return geocodeMapboxLocation(
				buildLocationQuery([selectedBarangay.value, selectedMunicipality.value]),
				mapboxToken
			)
		}

		if (selectedMunicipality.value) {
			return geocodeMapboxLocation(buildLocationQuery([selectedMunicipality.value]), mapboxToken)
		}

		return null
	}

	function buildAvatarMarker(record: DirectoryProfileRow, coordinates: MapCoordinates): DirectoryMarkerEntry {
		const displayName = getDisplayName(record)
		const initials = getInitials(displayName)
		const avatarUrl = record.avatarUrl ?? ''
		const mountPoint = document.createElement('div')
		mountPoint.className = 'pointer-events-auto'

		const app = createApp({
			render() {
				return h(
					Avatar,
					{ class: 'size-11 border-2 border-white shadow-lg shadow-black/20 ring-1 ring-black/10' },
					{
						default: () => [
							h(AvatarImage, { src: avatarUrl, alt: displayName }),
							h(AvatarFallback, null, { default: () => initials }),
						],
					}
				)
			},
		})

		app.mount(mountPoint)
		const targetMap: any = map.value
		if (!targetMap) {
			throw new Error('Map instance is not ready yet.')
		}

		const marker = new mapboxgl.Marker({ element: mountPoint, anchor: 'center' })
			.setLngLat([coordinates.longitude, coordinates.latitude])
			.addTo(targetMap)

		return {
			marker: {
				remove: () => marker.remove(),
			},
			app: app as unknown as MarkerAppHandle,
		}
	}

	async function fitMapToMarkers(markerCoordinates: MapCoordinates[]) {
		if (!map.value) return

		if (markerCoordinates.length === 0) {
			map.value.flyTo({
				center: [defaultCenter.value.longitude, defaultCenter.value.latitude],
				zoom: 7,
				duration: 800,
			})
			return
		}

		if (markerCoordinates.length === 1) {
			const only = markerCoordinates[0]
			map.value.flyTo({
				center: [only.longitude, only.latitude],
				zoom: 12,
				duration: 900,
			})
			return
		}

		const bounds = new mapboxgl.LngLatBounds(
			[markerCoordinates[0].longitude, markerCoordinates[0].latitude],
			[markerCoordinates[0].longitude, markerCoordinates[0].latitude]
		)

		for (const coordinate of markerCoordinates.slice(1)) {
			bounds.extend([coordinate.longitude, coordinate.latitude])
		}

		map.value.fitBounds(bounds, {
			padding: 80,
			duration: 900,
			maxZoom: 13,
		})
	}

	async function refreshMap() {
		if (!map.value || !isReady.value) return
		isGeocoding.value = true
		geoError.value = null

		try {
			clearMarkers()

			const visibleRecords = filteredRecords.value
			const resolvedEntries: Array<{
				record: DirectoryProfileRow
				coordinates: MapCoordinates | null
			}> = await Promise.all(
				visibleRecords.map(async (record) => ({
					record,
					coordinates: await resolveRecordCoordinates(record),
				}))
			)

			const markerCoordinates: MapCoordinates[] = []
			for (const entry of resolvedEntries) {
				if (!entry.coordinates) continue
				markerCoordinates.push(entry.coordinates)
				const markerEntry: DirectoryMarkerEntry = buildAvatarMarker(entry.record, entry.coordinates)
				markerEntries.value.push(markerEntry)
			}

			// On the very first refresh (initial load), preserve initial
			// center/zoom set during map initialization. Subsequent calls
			// (filter changes, selections) will perform fly/fit behavior.
			if (initialLoad.value) {
				initialLoad.value = false
				return
			}

			const selectionCoordinates = await resolveSelectionCoordinates()
			if (selectionCoordinates) {
				const zoom = viewMode.value === 'barangay' ? 14 : 11
				map.value.flyTo({
					center: [selectionCoordinates.longitude, selectionCoordinates.latitude],
					zoom,
					duration: 1000,
				})
				return
			}

			await fitMapToMarkers(markerCoordinates)
		} catch (error) {
			console.error('Failed to refresh geographic map markers:', error)
			geoError.value = 'Unable to load map markers for the selected location.'
		} finally {
			isGeocoding.value = false
		}
	}

	function initializeMap() {
		if (!mapContainer.value || !mapboxToken || map.value) return

		mapboxgl.accessToken = mapboxToken
		map.value = new mapboxgl.Map({
			container: mapContainer.value,
			style: mapStyle.value,
			center: [defaultCenter.value.longitude, defaultCenter.value.latitude],
			zoom: 8,
			cooperativeGestures: true,
		})

		window.requestAnimationFrame(() => {
			isReady.value = true
			void refreshMap()
		})
	}

	watch(
		() => [mapContainer.value, mapboxToken, mapStyle.value],
		() => {
			if (!mapContainer.value || !mapboxToken) return
			if (!map.value) {
				initializeMap()
				return
			}
			if (mapStyle.value) {
				map.value.setStyle(mapStyle.value)
			}
		},
		{ immediate: true }
	)

	watch(filteredRecords, () => {
		void refreshMap()
	}, { deep: true })

	watch([viewMode, selectedMunicipality, selectedBarangay], () => {
		void refreshMap()
	})

	watch(selectedMunicipality, () => {
		if (viewMode.value !== 'barangay') {
			selectedBarangay.value = ''
		}
	})

	watch(viewMode, (newMode) => {
		if (newMode === 'all') {
			selectedMunicipality.value = ''
			selectedBarangay.value = ''
		}
		if (newMode === 'municipalities') {
			selectedBarangay.value = ''
		}
	})

	onMounted(async () => {
		if (store.records.length === 0 && !store.isLoading) {
			await store.fetchRecords()
		}
		await nextTick()
		initializeMap()
	})

	onBeforeUnmount(() => {
		clearMarkers()
		map.value?.remove()
		map.value = null
	})

	return {
		mapContainer,
		mapboxToken,
		viewMode,
		selectedMunicipality,
		selectedBarangay,
		municipalities,
		barangays,
		filteredRecords,
		totalUsers,
		selectedLocationLabel,
		hasLocation,
		isLoading: computed(() => store.isLoading || isGeocoding.value),
		geoError,
	}
}