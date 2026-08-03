import { ref, shallowRef, onMounted, onBeforeUnmount, watch, computed, unref, type MaybeRef, type Ref } from 'vue'
import mapboxgl from 'mapbox-gl'
import {
  createMapMarkerElement,
  createMapPopupHtml,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAPBOX_STYLE,
  hasValidCoordinates,
  resolveCoordinates,
  resolveMapboxStyle,
  resolveMapboxToken,
  type MapCoordinates,
} from '@/helpers/common/mapboxHelpers'

interface UseMapboxMapOptions {
  mapContainer?: Ref<HTMLDivElement | null>
  latitude: MaybeRef<number | null>
  longitude: MaybeRef<number | null>
  label?: MaybeRef<string>
  zoom?: MaybeRef<number>
  style?: MaybeRef<string | null | undefined>
  defaultCenter?: MapCoordinates
}

/**
 * Generic composable for Mapbox map initialization and management.
 * Handles map setup, markers, popups, and coordinate validation.
 */
export function useMapboxMap(options: UseMapboxMapOptions) {
  const internalMapContainer = ref<HTMLDivElement | null>(null)
  const mapContainer = options.mapContainer ?? internalMapContainer
  const map = shallowRef<mapboxgl.Map | null>(null)
  const marker = shallowRef<mapboxgl.Marker | null>(null)

  const mapboxToken = resolveMapboxToken()
  const mapStyle = computed(() => resolveMapboxStyle(unref(options.style) ?? DEFAULT_MAPBOX_STYLE))
  const label = computed(() => unref(options.label) ?? '')
  const zoom = computed(() => unref(options.zoom) ?? 14)
  const defaultCenter = computed(() => options.defaultCenter ?? DEFAULT_MAP_CENTER)
  const appliedStyle = ref(mapStyle.value)

  const latitude = computed(() => unref(options.latitude))
  const longitude = computed(() => unref(options.longitude))

  const hasCoordinates = computed(() => hasValidCoordinates(latitude.value, longitude.value))
  const canRenderMap = computed(() => Boolean(mapboxToken))

  function initializeMap() {
    if (!mapContainer.value || !mapboxToken) return

    mapboxgl.accessToken = mapboxToken
    const center = hasCoordinates.value
      ? resolveCoordinates(latitude.value, longitude.value)
      : defaultCenter.value

    try {
      map.value = new mapboxgl.Map({
        container: mapContainer.value,
        style: mapStyle.value,
        center: [center.longitude, center.latitude],
        zoom: hasCoordinates.value ? zoom.value : Math.max(zoom.value - 2, 5),
        cooperativeGestures: true,
      })

      map.value.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
      appliedStyle.value = mapStyle.value

      if (hasCoordinates.value) {
        const popup = new mapboxgl.Popup({ offset: 15, closeButton: false }).setHTML(
          createMapPopupHtml(label.value)
        )

        marker.value = new mapboxgl.Marker({ element: createMapMarkerElement() })
          .setLngLat([center.longitude, center.latitude])
          .setPopup(popup)
          .addTo(map.value)
      }
    } catch (error) {
      console.error('Error initializing Mapbox map:', error)
    }
  }

  watch(
    () => [latitude.value, longitude.value, label.value, zoom.value, mapStyle.value],
    () => {
      if (map.value) {
        if (mapStyle.value !== appliedStyle.value) {
          appliedStyle.value = mapStyle.value
          map.value.setStyle(mapStyle.value)
        }

        if (hasCoordinates.value) {
          const center = resolveCoordinates(latitude.value, longitude.value, defaultCenter.value)
          map.value.setCenter([center.longitude, center.latitude])
          map.value.setZoom(zoom.value)
          marker.value?.setLngLat([center.longitude, center.latitude])
          if (!marker.value) {
            const popup = new mapboxgl.Popup({ offset: 15, closeButton: false }).setHTML(
              createMapPopupHtml(label.value)
            )

            marker.value = new mapboxgl.Marker({ element: createMapMarkerElement() })
              .setLngLat([center.longitude, center.latitude])
              .setPopup(popup)
              .addTo(map.value)
          }
        } else {
          map.value.setCenter([defaultCenter.value.longitude, defaultCenter.value.latitude])
          map.value.setZoom(Math.max(zoom.value - 2, 5))
          marker.value?.remove()
          marker.value = null
        }
      } else {
        initializeMap()
      }
    }
  )

  onMounted(() => {
    initializeMap()
  })

  onBeforeUnmount(() => {
    if (map.value) {
      map.value.remove()
    }
  })

  return {
    mapContainer,
    mapboxToken,
    hasCoordinates,
    canRenderMap,
  }
}
