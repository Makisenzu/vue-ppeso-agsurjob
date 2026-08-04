import { computed, createApp, h, nextTick, onBeforeUnmount, onMounted, ref, unref, watch, type MaybeRef, type Ref } from 'vue'
import mapboxgl from 'mapbox-gl'
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from '@/components/ui/avatar'
import { userAccountService } from '@/services/admin/userAccountService'
import { getAllProvinces, getCities, getBarangays } from '@/helpers/common/psgcHelpers'
import { getOrSetPersistentCache, getPersistentCacheValue } from '@/helpers/common/persistentCache'
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

const GEOGRAPHIC_PROFILES_CACHE_KEY = 'geographic-map:profiles'
const GEOGRAPHIC_PSGC_CACHE_KEY = 'geographic-map:agusan-del-sur-municipality-barangay-counts'
const GEOGRAPHIC_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30

export const AGUSAN_DEL_SUR_MUNICIPALITIES: JumpLocationEntry[] = [
	{ province: 'Agusan del Sur', municipality: 'City of Bayugan', latitude: 8.714579545754654, longitude: 125.74815761294684 },
	{ province: 'Agusan del Sur', municipality: 'Bunawan', latitude: 8.175856177177328, longitude: 125.99440939690173 },
	{ province: 'Agusan del Sur', municipality: 'Esperanza', latitude: 8.67636777814262, longitude: 125.6456281225687 },
	{ province: 'Agusan del Sur', municipality: 'La Paz', latitude: 8.279508687215753, longitude: 125.81538651624723 },
	{ province: 'Agusan del Sur', municipality: 'Loreto', latitude: 8.186649968514885, longitude: 125.85303978101459 },
	{ province: 'Agusan del Sur', municipality: 'Prosperidad', latitude: 8.605781769060076, longitude: 125.91316083036553 },
	{ province: 'Agusan del Sur', municipality: 'Rosario', latitude: 8.38597635304188, longitude: 126.00251397352055 },
	{ province: 'Agusan del Sur', municipality: 'San Francisco', latitude: 8.505163822596515, longitude: 125.97695600151802 },
	{ province: 'Agusan del Sur', municipality: 'San Luis', latitude: 8.477717564524182, longitude: 125.74466737311792 },
	{ province: 'Agusan del Sur', municipality: 'Santa Josefa', latitude: 7.991982, longitude: 126.003941 },
	{ province: 'Agusan del Sur', municipality: 'Sibagat', latitude: 8.820286, longitude: 125.977841 },
	{ province: 'Agusan del Sur', municipality: 'Talacogon', latitude: 8.450263774712683, longitude: 125.78592465151321 },
	{ province: 'Agusan del Sur', municipality: 'Trento', latitude: 8.044078940694366, longitude: 126.06278599367083 },
	{ province: 'Agusan del Sur', municipality: 'Veruela', latitude: 8.028639, longitude: 125.944172 },
]

const DEFAULT_PROVINCE_LOCATIONS: JumpLocationEntry[] = [
	{ province: 'Agusan del Sur', latitude: 8.55251025178305, longitude: 125.94684817739258 },
]

const DEFAULT_MUNICIPALITY_LOCATIONS: JumpLocationEntry[] = AGUSAN_DEL_SUR_MUNICIPALITIES

const DEFAULT_BARANGAY_LOCATIONS: JumpLocationEntry[] = []

const AGUSAN_DEL_SUR_MUNICIPALITY_INDEX = new Map(
	AGUSAN_DEL_SUR_MUNICIPALITIES.map((location) => [normalizeText(location.municipality), location])
)

interface JumpLocationEntry extends MapCoordinates {
	province?: string
	municipality?: string
	barangay?: string
}

interface UseGeographicMapOptions {
	mapContainer?: Ref<HTMLDivElement | null>
	latitude?: MaybeRef<number | null>
	longitude?: MaybeRef<number | null>
	label?: MaybeRef<string>
	zoom?: MaybeRef<number>
	style?: MaybeRef<string | null | undefined>
	defaultCenter?: MapCoordinates
	provinceLocations?: MaybeRef<JumpLocationEntry[] | null | undefined>
	municipalityLocations?: MaybeRef<JumpLocationEntry[] | null | undefined>
	barangayLocations?: MaybeRef<JumpLocationEntry[] | null | undefined>
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

interface MunicipalitySummaryRow {
	name: string
	users: number
	barangays: number
}

interface MunicipalityBarangayCount {
	name: string
	barangays: number
}

function normalizeText(value?: string | null) {
	return value?.trim().toLowerCase() ?? ''
}

function matchesText(left?: string | null, right?: string | null) {
	return normalizeText(left) === normalizeText(right)
}

function findAgusanDelSurMunicipalityLocation(municipality?: string | null) {
	return AGUSAN_DEL_SUR_MUNICIPALITY_INDEX.get(normalizeText(municipality)) ?? null
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
	const provinceLocationEntries = computed(() => unref(options.provinceLocations) ?? DEFAULT_PROVINCE_LOCATIONS)
	const municipalityLocationEntries = computed(() => unref(options.municipalityLocations) ?? DEFAULT_MUNICIPALITY_LOCATIONS)
	const barangayLocationEntries = computed(() => unref(options.barangayLocations) ?? DEFAULT_BARANGAY_LOCATIONS)
	const viewMode = ref<ViewMode>('all')
	const selectedProvince = ref<string>('')
	const selectedMunicipality = ref<string>('')
	const selectedBarangay = ref<string>('')
	const isReady = ref(false)
	const isGeocoding = ref(false)
	const geoError = ref<string | null>(null)
	const psgcMunicipalityEntries = ref<{ name: string; code: string }[]>([])
	const psgcMunicipalityBarangayCounts = ref<MunicipalityBarangayCount[]>([])
	const cachedProfiles = getPersistentCacheValue<ProfileRow[]>(GEOGRAPHIC_PROFILES_CACHE_KEY)
	const cachedMunicipalityCounts = getPersistentCacheValue<MunicipalityBarangayCount[]>(GEOGRAPHIC_PSGC_CACHE_KEY)
	if (cachedProfiles !== null) {
		records.value = cachedProfiles
	}
	if (cachedMunicipalityCounts !== null) {
		psgcMunicipalityBarangayCounts.value = cachedMunicipalityCounts
	}

	// When true, the map was just created and we should preserve
	// the initial center/zoom rather than auto-fitting to markers.
	const initialLoad = ref(true)
	const municipalities = computed(() => {
		const seen = new Map<string, { name: string; count: number }>()
		for (const record of records.value) {
			if (selectedProvince.value && normalizeText(record.province) !== normalizeText(selectedProvince.value)) continue
			const name = record.geographic?.trim()
			if (!name) continue
			const key = normalizeText(name)
			const entry = seen.get(key)
			seen.set(key, entry ? { ...entry, count: entry.count + 1 } : { name, count: 1 })
		}
		return [...seen.values()].sort((left, right) => left.name.localeCompare(right.name))
	})

	const municipalityRows = computed<MunicipalitySummaryRow[]>(() => {
		const municipalityNames = new Map<string, string>()
		const barangayCountLookup = new Map(
			psgcMunicipalityBarangayCounts.value.map((entry) => [normalizeText(entry.name), entry.barangays])
		)

		const municipalitySource = psgcMunicipalityEntries.value.length
			? psgcMunicipalityEntries.value.map((entry) => entry.name)
			: AGUSAN_DEL_SUR_MUNICIPALITIES.map((entry) => entry.municipality).filter((value): value is string => Boolean(value))

		for (const location of municipalitySource) {
			municipalityNames.set(normalizeText(location), location)
		}

		for (const record of records.value) {
			const municipality = record.geographic?.trim()
			if (!municipality) continue
			const key = normalizeText(municipality)
			if (!municipalityNames.has(key)) {
				municipalityNames.set(key, municipality)
			}
		}

		return [...municipalityNames.values()]
			.sort((left, right) => left.localeCompare(right))
			.map((name) => {
				const municipalityRecords = records.value.filter((record) => normalizeText(record.geographic) === normalizeText(name))

				return {
					name,
					users: municipalityRecords.length,
					barangays: barangayCountLookup.get(normalizeText(name)) ?? 0,
				}
			})
	})

	const provinces = computed(() => {
		const seen = new Map<string, { name: string; count: number }>()
		for (const record of records.value) {
			const name = record.province?.trim()
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
			if (selectedProvince.value && normalizeText(record.province) !== normalizeText(selectedProvince.value)) continue
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
		return records.value.filter((record) => {
			const matchesProvince = !selectedProvince.value
				|| normalizeText(record.province) === normalizeText(selectedProvince.value)
			const matchesMunicipality = !selectedMunicipality.value
				|| normalizeText(record.geographic) === normalizeText(selectedMunicipality.value)
			const matchesBarangay = !selectedBarangay.value
				|| normalizeText(record.barangay) === normalizeText(selectedBarangay.value)
			return matchesProvince && matchesMunicipality && matchesBarangay
		})
	})

	const totalUsers = computed(() => filteredRecords.value.length)
	const selectedLocationLabel = computed(() => {
		if (selectedBarangay.value) return selectedBarangay.value
		if (selectedMunicipality.value) return selectedMunicipality.value
		if (selectedProvince.value) return selectedProvince.value
		return 'All locations'
	})
	const hasLocation = computed(() => filteredRecords.value.length > 0)
	const coordinateCache = new Map<string, MapCoordinates | null>()

	function findProvinceOverride(province?: string | null) {
		const locations = provinceLocationEntries.value
		return locations.find((location) => matchesText(location.province, province)) ?? null
	}

	function findMunicipalityOverride(province?: string | null, municipality?: string | null) {
		const locations = municipalityLocationEntries.value
		const municipalityMatches = locations.filter((location) => matchesText(location.municipality, municipality))
		if (municipalityMatches.length === 0) return null

		if (!province) {
			return municipalityMatches[0] ?? null
		}

		return (
			municipalityMatches.find((location) => !location.province || matchesText(location.province, province))
			?? municipalityMatches[0]
			?? null
		)
	}

	function findBarangayOverride(province?: string | null, municipality?: string | null, barangay?: string | null) {
		const locations = barangayLocationEntries.value
		return locations.find((location) => {
			if (!matchesText(location.barangay, barangay)) return false
			if (location.province && !matchesText(location.province, province)) return false
			if (location.municipality && !matchesText(location.municipality, municipality)) return false
			return true
		}) ?? null
	}

	function clearMarkers() {
		for (const entry of markerEntries.value) {
			entry.marker.remove()
			entry.app.unmount()
		}
		markerEntries.value = []
	}

	async function resolveSelectionCoordinates() {
		if (selectedBarangay.value) {
			const barangayOverride = findBarangayOverride(selectedProvince.value, selectedMunicipality.value, selectedBarangay.value)
			if (barangayOverride) return barangayOverride

			const municipalityOverride = findMunicipalityOverride(selectedProvince.value, selectedMunicipality.value)
			if (municipalityOverride) return municipalityOverride

			const provinceOverride = findProvinceOverride(selectedProvince.value)
			if (provinceOverride) return provinceOverride

			return geocodeMapboxLocation(
				buildLocationQuery([selectedBarangay.value, selectedMunicipality.value, selectedProvince.value]),
				mapboxToken
			)
		}

		if (selectedMunicipality.value) {
			const municipalityListOverride = findAgusanDelSurMunicipalityLocation(selectedMunicipality.value)
			if (municipalityListOverride) return municipalityListOverride

			const municipalityOverride = findMunicipalityOverride(selectedProvince.value, selectedMunicipality.value)
			if (municipalityOverride) return municipalityOverride

			const municipalityOnlyOverride = findMunicipalityOverride(null, selectedMunicipality.value)
			if (municipalityOnlyOverride) return municipalityOnlyOverride

			const provinceOverride = findProvinceOverride(selectedProvince.value)
			if (provinceOverride) return provinceOverride

			return geocodeMapboxLocation(buildLocationQuery([selectedMunicipality.value, selectedProvince.value]), mapboxToken)
		}

		if (selectedProvince.value) {
			const provinceOverride = findProvinceOverride(selectedProvince.value)
			if (provinceOverride) return provinceOverride

			return geocodeMapboxLocation(buildLocationQuery([selectedProvince.value]), mapboxToken)
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
				zoom: 10,
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

		const municipalityListOverride = findAgusanDelSurMunicipalityLocation(firstRecord.geographic)
		if (municipalityListOverride) {
			coordinateCache.set(cacheKey, municipalityListOverride)
			return municipalityListOverride
		}

		const municipalityOverride = findMunicipalityOverride(firstRecord.province, firstRecord.geographic)
		if (municipalityOverride) {
			coordinateCache.set(cacheKey, municipalityOverride)
			return municipalityOverride
		}

		const municipalityOnlyOverride = findMunicipalityOverride(null, firstRecord.geographic)
		if (municipalityOnlyOverride) {
			coordinateCache.set(cacheKey, municipalityOnlyOverride)
			return municipalityOnlyOverride
		}

		const provinceOverride = findProvinceOverride(firstRecord.province)
		if (provinceOverride) {
			coordinateCache.set(cacheKey, provinceOverride)
			return provinceOverride
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
		})

		window.requestAnimationFrame(() => {
			isReady.value = true
			void refreshMap()
		})
	}

	async function loadAllProfiles() {
		try {
			const profiles = await getOrSetPersistentCache(GEOGRAPHIC_PROFILES_CACHE_KEY, GEOGRAPHIC_CACHE_TTL_MS, async () => {
				return userAccountService.fetchAllProfiles()
			})
			records.value = profiles
		} catch (error) {
			console.error('Failed to load profiles for geographic map:', error)
			geoError.value = 'Unable to load users for the geographic map.'
			records.value = []
		}
	}

	async function loadMunicipalityBarangayCounts() {
		try {
			const counts = await getOrSetPersistentCache(GEOGRAPHIC_PSGC_CACHE_KEY, GEOGRAPHIC_CACHE_TTL_MS, async () => {
				const provinces = await getAllProvinces()
				const province = provinces.find((entry: { name?: string; code?: string }) => normalizeText(entry.name) === normalizeText('Agusan del Sur'))

				if (!province?.code) {
					return []
				}

				const municipalitiesFromPsgc = await getCities(province.code)
				psgcMunicipalityEntries.value = municipalitiesFromPsgc
					.map((municipality: { name?: string; code?: string }) => ({
						name: municipality.name?.trim() ?? '',
						code: municipality.code?.trim() ?? '',
					}))
					.filter((municipality: { name: string; code: string }) => Boolean(municipality.name) && Boolean(municipality.code))
				const municipalityCounts = await Promise.all(
					municipalitiesFromPsgc.map(async (municipality: { name?: string; code?: string }) => {
						if (!municipality.code || !municipality.name) {
							return null
						}

						const barangays = await getBarangays(municipality.code)
						return {
							name: municipality.name.trim(),
							barangays: barangays.length,
						}
					})
				)

				return municipalityCounts.filter((value): value is MunicipalityBarangayCount => Boolean(value))
			})

			psgcMunicipalityBarangayCounts.value = counts
		} catch (error) {
			console.error('Failed to load PSGC municipality barangay counts:', error)
		}
	}

	async function refreshRecords() {
		const shouldShowLoading = cachedProfiles === null || cachedMunicipalityCounts === null
		isRecordsLoading.value = shouldShowLoading
		try {
			await Promise.all([
			loadAllProfiles(),
			loadMunicipalityBarangayCounts(),
			])
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

	watch(selectedProvince, () => {
		selectedMunicipality.value = ''
		selectedBarangay.value = ''
	})

	watch(selectedMunicipality, () => {
		selectedBarangay.value = ''
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
		await refreshRecords()
		await nextTick()
		initializeMap()
	})

	onBeforeUnmount(() => {
		clearMarkers()
		map.value?.remove()
		map.value = null
	})

	function selectMunicipality(name: string) {
		selectedProvince.value = 'Agusan del Sur'
		selectedMunicipality.value = name
	}

	return {
		mapContainer,
		mapboxToken,
		viewMode,
		selectedProvince,
		selectedMunicipality,
		selectedBarangay,
		provinces,
		municipalities,
		municipalityRows,
		barangays,
		filteredRecords,
		totalUsers,
		selectedLocationLabel,
		hasLocation,
		selectMunicipality,
		refreshRecords,
		refreshPsgcMunicipalityCounts: loadMunicipalityBarangayCounts,
		isLoading: computed(() => isRecordsLoading.value || isGeocoding.value),
		geoError,
		defaultProvinceLocations: DEFAULT_PROVINCE_LOCATIONS,
		defaultMunicipalityLocations: DEFAULT_MUNICIPALITY_LOCATIONS,
		defaultBarangayLocations: DEFAULT_BARANGAY_LOCATIONS,
	}
}