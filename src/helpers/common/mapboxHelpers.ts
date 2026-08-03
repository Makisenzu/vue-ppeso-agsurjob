export interface MapCoordinates {
	latitude: number
	longitude: number
}

export const DEFAULT_MAPBOX_STYLE = 'mapbox://styles/mapbox/streets-v12'

export const DEFAULT_MAP_CENTER: MapCoordinates = {
	latitude: 8.55251025178305,
	longitude: 125.94684817739258,
}

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