<script setup lang="ts">
import { ref, toRef } from 'vue'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Crosshair, Loader2, MapPin, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { useMapLocationPicker } from '@/composables/common/useMapLocationPicker'
import { formatCoordinate } from '@/helpers/peso/provincialPeso/jobFairHelper'
import type { MapCoordinates } from '@/helpers/common/mapboxHelpers'

const props = defineProps<{
  latitude: number | null | undefined
  longitude: number | null | undefined
  /** Free-text location used by "Find on map" to geocode a starting point. */
  locationQuery?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:location': [coordinates: MapCoordinates | null]
}>()

const mapContainer = ref<HTMLDivElement | null>(null)

const { canRenderMap, hasCoordinates, isLocating, locateError, clearLocation, locateFromQuery } = useMapLocationPicker({
  mapContainer,
  latitude: toRef(props, 'latitude'),
  longitude: toRef(props, 'longitude'),
  onPick: (coordinates) => emit('update:location', coordinates),
})
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between gap-2">
      <p class="text-sm font-medium">
        Map Location <span class="font-normal text-muted-foreground">(optional)</span>
      </p>
      <div v-if="canRenderMap" class="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          class="h-7 px-2 text-xs"
          :disabled="disabled || isLocating"
          @click="locateFromQuery(locationQuery ?? '')"
        >
          <Loader2 v-if="isLocating" class="size-3.5 animate-spin" />
          <Crosshair v-else class="size-3.5" />
          Find on map
        </Button>
        <Button
          v-if="hasCoordinates"
          type="button"
          variant="ghost"
          size="sm"
          class="h-7 px-2 text-xs text-muted-foreground"
          :disabled="disabled"
          @click="clearLocation"
        >
          <X class="size-3.5" />
          Clear
        </Button>
      </div>
    </div>

    <div
      v-if="!canRenderMap"
      class="flex h-40 flex-col items-center justify-center rounded-md border border-dashed bg-muted/20 p-4 text-center"
    >
      <MapPin class="mb-2 size-5 text-muted-foreground" />
      <p class="text-xs text-muted-foreground">Map is unavailable. Mapbox access token is not configured.</p>
    </div>

    <template v-else>
      <div
        ref="mapContainer"
        class="h-52 w-full overflow-hidden rounded-md border bg-muted/10"
        :class="{ 'pointer-events-none opacity-60': disabled }"
      />
      <p v-if="locateError" class="text-xs text-destructive">{{ locateError }}</p>
      <p class="flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin class="size-3.5 shrink-0" />
        <span v-if="hasCoordinates">
          {{ formatCoordinate(latitude) }}, {{ formatCoordinate(longitude) }} — drag the pin to adjust.
        </span>
        <span v-else>Click on the map to pin the event venue.</span>
      </p>
    </template>
  </div>
</template>
