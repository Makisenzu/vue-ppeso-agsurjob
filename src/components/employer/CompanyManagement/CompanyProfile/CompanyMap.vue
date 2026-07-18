<script setup lang="ts">
import { ref, shallowRef, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MapPinIcon, InfoIcon, ShieldAlertIcon } from '@lucide/vue'

const props = defineProps<{
  latitude: number | null
  longitude: number | null
  companyName: string
}>()

const mapContainer = ref<HTMLDivElement | null>(null)
const map = shallowRef<mapboxgl.Map | null>(null)
const marker = shallowRef<mapboxgl.Marker | null>(null)

// Check for Mapbox Access Token
const mapboxToken = (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '').trim()

// Validate coordinates
const hasCoordinates = computed(() => {
  if (props.latitude === null || props.longitude === null) return false
  const lat = Number(props.latitude)
  const lng = Number(props.longitude)
  return (
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0) // Treat 0,0 as unconfigured/placeholder usually
  )
})

function initializeMap() {
  if (!mapContainer.value || !hasCoordinates.value || !mapboxToken) return

  // Set the Mapbox access token
  mapboxgl.accessToken = mapboxToken

  const lng = Number(props.longitude)
  const lat = Number(props.latitude)

  try {
    map.value = new mapboxgl.Map({
      container: mapContainer.value,
      style: 'mapbox://styles/mapbox/streets-v12', // Clean, professional standard street view
      center: [lng, lat],
      zoom: 14,
      cooperativeGestures: true, // Prevents scroll hijacking on long pages
    })

    // Add navigation controls (zoom, compass)
    map.value.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

    // Create a custom modern bouncing/pulsing marker element
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
      `<div class="p-1 font-sans"><p class="text-xs font-semibold text-foreground">${props.companyName}</p></div>`
    )

    // Add marker to map
    marker.value = new mapboxgl.Marker({ element: el })
      .setLngLat([lng, lat])
      .setPopup(popup)
      .addTo(map.value)
  } catch (error) {
    console.error('Error initializing Mapbox map:', error)
  }
}

// Watch for coordinate updates to re-center or re-initialize map
watch(
  () => [props.latitude, props.longitude],
  () => {
    if (map.value) {
      if (hasCoordinates.value) {
        const lng = Number(props.longitude)
        const lat = Number(props.latitude)
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
</script>

<template>
  <div class="w-full">
    <!-- Map Rendering Block -->
    <template v-if="!mapboxToken">
      <!-- Fallback when Mapbox Token is missing -->
      <div
        class="w-full min-h-[300px] rounded-xl border border-dashed border-border bg-muted/10 flex flex-col items-center justify-center p-6 text-center"
      >
        <div class="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mb-3">
          <ShieldAlertIcon class="h-5 w-5" />
        </div>
        <h4 class="text-sm font-semibold text-foreground">Mapbox Access Token Missing</h4>
        <p class="text-xs text-muted-foreground max-w-sm mt-1 mb-4 leading-relaxed">
          Please add <code class="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px] text-amber-500">VITE_MAPBOX_ACCESS_TOKEN</code> to your local <code class="font-mono text-[10px]">.env</code> file to enable the interactive map view.
        </p>
        <div class="text-[11px] text-muted-foreground/80 bg-muted/30 px-3 py-2 rounded-lg border border-border/40 font-mono text-left max-w-md">
          # Add this line to your .env file:<br />
          VITE_MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token_here
        </div>
      </div>
    </template>

    <template v-else-if="!hasCoordinates">
      <!-- Fallback when coordinates are missing or invalid -->
      <div
        class="w-full min-h-[300px] rounded-xl border border-dashed border-border bg-muted/15 flex flex-col items-center justify-center p-6 text-center"
      >
        <div class="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
          <MapPinIcon class="h-5 w-5" />
        </div>
        <h4 class="text-sm font-semibold text-foreground">Location Not Set</h4>
        <p class="text-xs text-muted-foreground max-w-xs mt-1 leading-relaxed">
          No geographical coordinates (latitude & longitude) have been set for this company's profile yet.
        </p>
      </div>
    </template>

    <template v-else>
      <!-- Active Map State -->
      <div class="space-y-2">
        <div
          ref="mapContainer"
          class="w-full h-[320px] rounded-xl border border-border shadow-sm overflow-hidden bg-muted/5"
        ></div>
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground px-1">
          <InfoIcon class="h-3 w-3 shrink-0" />
          <span>Drag with mouse/touch to explore the map. Use navigation buttons to zoom.</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style>
/* Global styles for custom marker & popup styling inside the mapbox canvas */
.custom-map-marker {
  cursor: pointer;
}

.mapboxgl-popup-content {
  border-radius: 8px !important;
  border: 1px solid var(--border) !important;
  background-color: var(--background) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
  padding: 8px 12px !important;
}

.mapboxgl-popup-anchor-top .mapboxgl-popup-tip {
  border-bottom-color: var(--background) !important;
}
.mapboxgl-popup-anchor-bottom .mapboxgl-popup-tip {
  border-top-color: var(--background) !important;
}
.mapboxgl-popup-anchor-left .mapboxgl-popup-tip {
  border-right-color: var(--background) !important;
}
.mapboxgl-popup-anchor-right .mapboxgl-popup-tip {
  border-left-color: var(--background) !important;
}
</style>
