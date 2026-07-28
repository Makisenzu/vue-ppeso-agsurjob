import { ref, shallowRef, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import mapboxgl from 'mapbox-gl'

interface UseMapboxMapOptions {
  latitude: number | null
  longitude: number | null
  label?: string
  zoom?: number
}

/**
 * Generic composable for Mapbox map initialization and management.
 * Handles map setup, markers, popups, and coordinate validation.
 */
export function useMapboxMap(options: UseMapboxMapOptions) {
  const { latitude, longitude, label = '', zoom = 14 } = options

  const mapContainer = ref<HTMLDivElement | null>(null)
  const map = shallowRef<mapboxgl.Map | null>(null)
  const marker = shallowRef<mapboxgl.Marker | null>(null)

  // Check for Mapbox Access Token
  const mapboxToken = (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '').trim()

  // Validate coordinates
  const hasCoordinates = computed(() => {
    if (latitude === null || longitude === null) return false
    const lat = Number(latitude)
    const lng = Number(longitude)
    return (
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180 &&
      !(lat === 0 && lng === 0)
    )
  })

  function initializeMap() {
    if (!mapContainer.value || !hasCoordinates.value || !mapboxToken) return

    mapboxgl.accessToken = mapboxToken

    const lng = Number(longitude)
    const lat = Number(latitude)

    try {
      map.value = new mapboxgl.Map({
        container: mapContainer.value,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [lng, lat],
        zoom,
        cooperativeGestures: true,
      })

      map.value.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

      // Create custom marker element
      const el = document.createElement('div')
      el.className = 'custom-map-marker'
      el.innerHTML = `
        <div class="relative flex items-center justify-center h-10 w-10">
          <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-primary/40 opacity-75"></span>
          <div class="relative flex items-center justify-center rounded-full h-6 w-6 bg-primary border-2 border-white shadow-xl">
            <div class="h-2 w-2 rounded-full bg-white"></div>
          </div>
        </div>
      `

      // Add popup on click
      const popup = new mapboxgl.Popup({ offset: 15, closeButton: false }).setHTML(
        `<div class="p-1 font-sans"><p class="text-xs font-semibold text-foreground">${label}</p></div>`
      )

      marker.value = new mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.value)
    } catch (error) {
      console.error('Error initializing Mapbox map:', error)
    }
  }

  // Watch for coordinate updates
  watch(
    () => [latitude, longitude],
    () => {
      if (map.value) {
        if (hasCoordinates.value) {
          const lng = Number(longitude)
          const lat = Number(latitude)
          map.value.setCenter([lng, lat])
          if (marker.value) {
            marker.value.setLngLat([lng, lat])
          }
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
  }
}
