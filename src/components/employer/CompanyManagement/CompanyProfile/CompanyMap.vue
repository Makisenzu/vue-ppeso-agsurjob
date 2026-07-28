<script setup lang="ts">
import { useCompanyMap } from '@/composables/useCompanyMap'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MapPinIcon, InfoIcon } from '@lucide/vue'

const props = defineProps<{
  latitude: number | null
  longitude: number | null
  companyName: string
}>()

const { mapContainer, shouldShowMap: _shouldShowMap, fallbackType } = useCompanyMap({
  latitude: props.latitude,
  longitude: props.longitude,
  companyName: props.companyName,
})

// mapContainer is used as a template ref via :ref binding
defineExpose({ mapContainer })
</script>

<template>
  <div class="w-full">
    <template v-if="fallbackType === 'missing-coordinates'">
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
