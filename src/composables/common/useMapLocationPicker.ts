import { computed, onBeforeUnmount, onMounted, ref, shallowRef, unref, watch, type MaybeRef, type Ref } from 'vue'
import mapboxgl from 'mapbox-gl'
import {
  createMapMarkerElement,
  DEFAULT_MAP_CENTER,
  geocodeMapboxLocation,
  hasValidCoordinates,
  resolveMapboxStyle,
  resolveMapboxToken,
  type MapCoordinates,
} from '@/helpers/common/mapboxHelpers'

interface UseMapLocationPickerOptions {
  mapContainer: Ref<HTMLDivElement | null>
  latitude: MaybeRef<number | null | undefined>
  longitude: MaybeRef<number | null | undefined>
  onPick: (coordinates: MapCoordinates | null) => void
  zoom?: number
  defaultCenter?: MapCoordinates
}

const round = (value: number) => Math.round(value * 1e6) / 1e6

/**
 * Interactive Mapbox map for picking a single point.
 * Click the map (or drag the marker) to choose a location; coordinates are
 * reported through `onPick` so the caller owns the value (e.g. a form field).
 */
export function useMapLocationPicker(options: UseMapLocationPickerOptions) {
  const map = shallowRef<mapboxgl.Map | null>(null)
  const marker = shallowRef<mapboxgl.Marker | null>(null)
  const isLocating = ref(false)
  const locateError = ref<string | null>(null)
  let resizeObserver: ResizeObserver | null = null

  const mapboxToken = resolveMapboxToken()
  const canRenderMap = computed(() => Boolean(mapboxToken))
  const pickedZoom = options.zoom ?? 15
  const defaultCenter = options.defaultCenter ?? DEFAULT_MAP_CENTER

  const latitude = computed(() => unref(options.latitude) ?? null)
  const longitude = computed(() => unref(options.longitude) ?? null)
  const hasCoordinates = computed(() => hasValidCoordinates(latitude.value, longitude.value))

  function emitPick(lng: number, lat: number) {
    options.onPick({ latitude: round(lat), longitude: round(lng) })
  }

  function placeMarker(lng: number, lat: number) {
    if (!map.value) return
    if (marker.value) {
      marker.value.setLngLat([lng, lat])
      return
    }
    marker.value = new mapboxgl.Marker({ element: createMapMarkerElement(), draggable: true })
      .setLngLat([lng, lat])
      .addTo(map.value)
    marker.value.on('dragend', () => {
      const position = marker.value?.getLngLat()
      if (position) emitPick(position.lng, position.lat)
    })
  }

  function removeMarker() {
    marker.value?.remove()
    marker.value = null
  }

  function initializeMap() {
    if (!options.mapContainer.value || !mapboxToken) return

    mapboxgl.accessToken = mapboxToken
    const center = hasCoordinates.value
      ? { latitude: Number(latitude.value), longitude: Number(longitude.value) }
      : defaultCenter

    try {
      map.value = new mapboxgl.Map({
        container: options.mapContainer.value,
        style: resolveMapboxStyle(),
        center: [center.longitude, center.latitude],
        zoom: hasCoordinates.value ? pickedZoom : 8,
      })
      map.value.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
      map.value.getCanvas().style.cursor = 'crosshair'

      if (hasCoordinates.value) placeMarker(center.longitude, center.latitude)

      map.value.on('click', (event) => {
        placeMarker(event.lngLat.lng, event.lngLat.lat)
        emitPick(event.lngLat.lng, event.lngLat.lat)
      })

      // Dialogs animate in, so the container size settles after init.
      resizeObserver = new ResizeObserver(() => map.value?.resize())
      resizeObserver.observe(options.mapContainer.value)
    } catch (error) {
      console.error('Error initializing Mapbox location picker:', error)
    }
  }

  // Keep the marker in sync when the value is changed from outside (reset, geocode, clear).
  watch([latitude, longitude], () => {
    if (!map.value) return
    if (!hasCoordinates.value) {
      removeMarker()
      return
    }
    const lat = Number(latitude.value)
    const lng = Number(longitude.value)
    const current = marker.value?.getLngLat()
    if (current && round(current.lat) === lat && round(current.lng) === lng) return
    placeMarker(lng, lat)
    map.value.flyTo({ center: [lng, lat], zoom: Math.max(map.value.getZoom(), pickedZoom - 2) })
  })

  function clearLocation() {
    removeMarker()
    options.onPick(null)
  }

  async function locateFromQuery(query: string) {
    locateError.value = null
    if (!query.trim()) {
      locateError.value = 'Enter a location first.'
      return
    }
    isLocating.value = true
    try {
      const result = await geocodeMapboxLocation(query, mapboxToken)
      if (!result) {
        locateError.value = 'Location not found. Click on the map to pin it manually.'
        return
      }
      options.onPick({ latitude: round(result.latitude), longitude: round(result.longitude) })
    } finally {
      isLocating.value = false
    }
  }

  onMounted(() => {
    initializeMap()
  })

  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    map.value?.remove()
  })

  return {
    canRenderMap,
    hasCoordinates,
    isLocating,
    locateError,
    clearLocation,
    locateFromQuery,
  }
}
