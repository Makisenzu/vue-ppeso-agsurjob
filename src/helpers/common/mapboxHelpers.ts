export interface MapCoordinates {
	latitude: number
	longitude: number
}

export const DEFAULT_MAPBOX_STYLE = 'mapbox://styles/mapbox/streets-v12'

export const DEFAULT_MAP_CENTER: MapCoordinates = {
	latitude: 8.55251025178305,
	longitude: 125.94684817739258,
}

const geocodeCache = new Map<string, MapCoordinates | null>()

export function resolveMapboxToken(token?: string | null) {
	return (token ?? import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? '').trim()
}

export function resolveMapboxStyle(style?: string | null) {
	return (style ?? import.meta.env.VITE_MAPBOX_STYLE ?? DEFAULT_MAPBOX_STYLE).trim()
}

export function normalizeCoordinate(value: number | string | null | undefined) {
	if (value === null || value === undefined || value === '') return null

	const numericValue = Number(value)
	return Number.isNaN(numericValue) ? null : numericValue
}

export function hasValidCoordinates(latitude: number | string | null | undefined, longitude: number | string | null | undefined) {
	const normalizedLatitude = normalizeCoordinate(latitude)
	const normalizedLongitude = normalizeCoordinate(longitude)

	if (normalizedLatitude === null || normalizedLongitude === null) return false

	return (
		normalizedLatitude >= -90 &&
		normalizedLatitude <= 90 &&
		normalizedLongitude >= -180 &&
		normalizedLongitude <= 180 &&
		!(normalizedLatitude === 0 && normalizedLongitude === 0)
	)
}

export function resolveCoordinates(
	latitude: number | string | null | undefined,
	longitude: number | string | null | undefined,
	fallback: MapCoordinates = DEFAULT_MAP_CENTER
) {
	if (!hasValidCoordinates(latitude, longitude)) {
		return fallback
	}

	return {
		latitude: Number(latitude),
		longitude: Number(longitude),
	}
}

export function buildLocationQuery(parts: Array<string | null | undefined>) {
	const locationParts = parts
		.map((value) => value?.trim().replace(/\s+/g, ' ') ?? '')
		.filter(Boolean)

	if (locationParts.length === 0) return ''

	return [...locationParts, 'Philippines'].join(', ')
}

export async function geocodeMapboxLocation(query: string, token: string) {
	const normalizedQuery = query.trim()
	if (!normalizedQuery || !token) return null

	if (geocodeCache.has(normalizedQuery)) {
		return geocodeCache.get(normalizedQuery) ?? null
	}

	const endpoint = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(normalizedQuery)}.json`)
	endpoint.searchParams.set('access_token', token)
	endpoint.searchParams.set('limit', '1')
	endpoint.searchParams.set('types', 'place,locality,neighborhood,address')
	endpoint.searchParams.set('country', 'ph')

	try {
		const response = await fetch(endpoint.toString())
		if (!response.ok) {
			geocodeCache.set(normalizedQuery, null)
			return null
		}

		const data = await response.json()
		const center = data?.features?.[0]?.center

		if (!Array.isArray(center) || center.length < 2) {
			geocodeCache.set(normalizedQuery, null)
			return null
		}

		const coordinates = {
			longitude: Number(center[0]),
			latitude: Number(center[1]),
		}

		if (Number.isNaN(coordinates.latitude) || Number.isNaN(coordinates.longitude)) {
			geocodeCache.set(normalizedQuery, null)
			return null
		}

		geocodeCache.set(normalizedQuery, coordinates)
		return coordinates
	} catch {
		geocodeCache.set(normalizedQuery, null)
		return null
	}
}

export function createMapMarkerElement() {
	const markerElement = document.createElement('div')
	markerElement.className = 'custom-map-marker'
	markerElement.innerHTML = `
		<div class="relative flex items-center justify-center h-10 w-10">
			<span class="absolute inline-flex h-8 w-8 animate-ping rounded-full bg-primary/35 opacity-75"></span>
			<div class="relative flex items-center justify-center h-6 w-6 rounded-full border-2 border-white bg-primary shadow-xl">
				<div class="h-2 w-2 rounded-full bg-white"></div>
			</div>
		</div>
	`

	return markerElement
}

export function createMapPopupHtml(label: string) {
	return `<div class="p-1 font-sans"><p class="text-xs font-semibold text-foreground">${label}</p></div>`
}