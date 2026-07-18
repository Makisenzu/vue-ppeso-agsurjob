<script setup lang="ts">
import { useCompanyMap } from '@/composables/useCompanyMap'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MapPinIcon, InfoIcon, ShieldAlertIcon } from '@lucide/vue'

const props = defineProps<{
  latitude: number | null
  longitude: number | null
  companyName: string
}>()

const { mapContainer, shouldShowMap, fallbackType } = useCompanyMap({
  latitude: props.latitude,
  longitude: props.longitude,
  companyName: props.companyName,
})

</script>

<template>
  <div class="w-full">
    <!-- Map Rendering Block -->
    <template v-if="fallbackType === 'missing-token'">
      <!-- Fallback when Mapbox Token is missing -->
      <div
        class="w-full min-h-75 rounded-xl border border-dashed border-border bg-muted/10 flex flex-col items-center justify-center p-6 text-center"
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

    <template v-else-if="fallbackType === 'missing-coordinates'">
      <!-- Fallback when coordinates are missing or invalid -->
      <div
        class="w-full min-h-75 rounded-xl border border-dashed border-border bg-muted/15 flex flex-col items-center justify-center p-6 text-center"
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
          class="w-full h-80 rounded-xl border border-border shadow-sm overflow-hidden bg-muted/5"
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
