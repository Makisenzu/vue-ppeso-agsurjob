import { computed, createApp, h, nextTick, onBeforeUnmount, onMounted, ref, unref, watch, type MaybeRef, type Ref } from 'vue'
import mapboxgl from 'mapbox-gl'
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from '@/components/ui/avatar'
import { userAccountService } from '@/services/admin/userAccountService'
import {
	DEFAULT_MAP_CENTER,
	DEFAULT_MAPBOX_STYLE,
	resolveMapboxToken,
	resolveMapboxStyle,
	buildLocationQuery,
	geocodeMapboxLocation,
	type MapCoordinates,
} from '@/helpers/common/mapboxHelpers'
import type { ProfileRow } from '@/types/admin/userAccounts'

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

interface MunicipalityMarkerGroup {
	key: string
	label: string
	records: ProfileRow[]
}

function normalizeText(value?: string | null) {
	return value?.trim().toLowerCase() ?? ''
}

function getDisplayName(record: ProfileRow) {
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

function hashText(value: string) {
	let hash = 0
	for (let index = 0; index < value.length; index += 1) {
		hash = (hash << 5) - hash + value.charCodeAt(index)
		hash |= 0
	}
	return Math.abs(hash)
}

function createFallbackCoordinates(record: ProfileRow, index: number): MapCoordinates {
	const hash = hashText(`${record.id}:${record.firstname ?? ''}:${record.lastname ?? ''}:${index}`)
	const angle = (hash % 360) * (Math.PI / 180)
	const distance = 0.18 + ((hash % 700) / 700) * 0.22

	return {
		latitude: DEFAULT_MAP_CENTER.latitude + Math.sin(angle) * distance,
		longitude: DEFAULT_MAP_CENTER.longitude + Math.cos(angle) * distance,
	}
}

function offsetDuplicateCoordinates(coordinates: MapCoordinates, occurrence: number) {
	if (occurrence <= 0) return coordinates

	const angle = occurrence * 2.399963229728653
	const distance = 0.012 * occurrence

	return {
		latitude: coordinates.latitude + Math.sin(angle) * distance,
		longitude: coordinates.longitude + Math.cos(angle) * distance,
	}
}

function getMunicipalityKey(record: ProfileRow) {
	return [normalizeText(record.geographic), normalizeText(record.province), normalizeText(record.region)]
		.filter(Boolean)
		.join(':')
}

function getMunicipalityLabel(record: ProfileRow) {
	return record.geographic?.trim() || 'Unknown municipality'
}

function groupRecordsByMunicipality(records: ProfileRow[]) {
	const groups = new Map<string, MunicipalityMarkerGroup>()

	for (const record of records) {
		const municipalityKey = getMunicipalityKey(record)
		const groupKey = municipalityKey || `record:${record.id}`
		const existing = groups.get(groupKey)
		if (existing) {
			existing.records.push(record)
			continue
		}

		groups.set(groupKey, {
			key: groupKey,
			label: getMunicipalityLabel(record),
			records: [record],
		})
	}

	return [...groups.values()]
}

export function useGeographicMap(options: UseGeographicMapOptions = {}) {
	const internalMapContainer = ref<HTMLDivElement | null>(null)
	const mapContainer = options.mapContainer ?? internalMapContainer
	const map = ref<mapboxgl.Map | null>(null)
	const markerEntries = ref<DirectoryMarkerEntry[]>([])
	const records = ref<ProfileRow[]>([])
	const isRecordsLoading = ref(false)
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

	function buildAvatarMarker(group: MunicipalityMarkerGroup, coordinates: MapCoordinates): DirectoryMarkerEntry {
		const mountPoint = document.createElement('div')
		mountPoint.className = 'pointer-events-auto'

		const app = createApp({
			render() {
				const visibleRecords = group.records.slice(0, 4)
				const hiddenCount = Math.max(group.records.length - visibleRecords.length, 0)
				return h(
					'div',
					{ class: 'flex flex-col items-center gap-1' },
					[
						h(
							AvatarGroup,
							{ class: 'items-center rounded-full bg-background/90 p-0.5 shadow-lg shadow-black/20 ring-1 ring-black/10 backdrop-blur-sm' },
							{
								default: () => [
									...visibleRecords.map((record) => {
										const displayName = getDisplayName(record)
										const initials = getInitials(displayName)
										const avatarSrc = record.avatarUrl ?? ''

										return h(
											Avatar,
											{ class: 'size-7 border-2 border-white shadow-sm shadow-black/20' },
											{
												default: () => [
													avatarSrc ? h(AvatarImage, { src: avatarSrc, alt: displayName }) : null,
													h(AvatarFallback, null, { default: () => initials }),
												],
											}
										)
									}),
									hiddenCount > 0
										? h(AvatarGroupCount, { class: 'size-9 text-[10px] font-semibold' }, { default: () => `+${hiddenCount}` })
										: null,
								],
							}
						),
						h(
							'p',
							{ class: 'max-w-28 truncate rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm ring-1 ring-black/5' },
							group.label
						),
						h(
							'p',
							{ class: 'max-w-28 truncate text-[10px] font-medium text-muted-foreground' },
							`Total User: ${group.records.length}`
						),
					]
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
			const municipalityGroups = groupRecordsByMunicipality(visibleRecords)
			const resolvedEntries: Array<{
				group: MunicipalityMarkerGroup
				coordinates: MapCoordinates | null
			}> = await Promise.all(
				municipalityGroups.map(async (group) => ({
					group,
					coordinates: await resolveSelectionCoordinatesForGroup(group),
				}))
			)

			const markerCoordinates: MapCoordinates[] = []
			const coordinateUsage = new Map<string, number>()
			for (const entry of resolvedEntries) {
				const baseCoordinates = entry.coordinates ?? createFallbackCoordinates(entry.group.records[0], markerCoordinates.length)
				const coordinateKey = `${baseCoordinates.latitude.toFixed(5)}:${baseCoordinates.longitude.toFixed(5)}`
				const occurrence = coordinateUsage.get(coordinateKey) ?? 0
				coordinateUsage.set(coordinateKey, occurrence + 1)
				const finalCoordinates = offsetDuplicateCoordinates(baseCoordinates, occurrence)
				markerCoordinates.push(finalCoordinates)
				const markerEntry: DirectoryMarkerEntry = buildAvatarMarker(entry.group, finalCoordinates)
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

	async function resolveSelectionCoordinatesForGroup(group: MunicipalityMarkerGroup) {
		const firstRecord = group.records[0]
		if (!firstRecord) return null

		const cacheKey = `municipality:${getMunicipalityKey(firstRecord) || firstRecord.id}`
		if (coordinateCache.has(cacheKey)) {
			return coordinateCache.get(cacheKey) ?? null
		}

		const query = buildLocationQuery([
			firstRecord.geographic,
			firstRecord.province,
			firstRecord.region,
		])
		const coordinates = query ? await geocodeMapboxLocation(query, mapboxToken) : null
		coordinateCache.set(cacheKey, coordinates)
		return coordinates
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

	async function loadAllProfiles() {
		isRecordsLoading.value = true
		try {
			records.value = await userAccountService.fetchAllProfiles()
		} catch (error) {
			console.error('Failed to load profiles for geographic map:', error)
			geoError.value = 'Unable to load users for the geographic map.'
			records.value = []
		} finally {
			isRecordsLoading.value = false
		}
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
		await loadAllProfiles()
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
		isLoading: computed(() => isRecordsLoading.value || isGeocoding.value),
		geoError,
	}
}