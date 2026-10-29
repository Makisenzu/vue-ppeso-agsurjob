<script setup lang="ts">
import { ref, toRef } from 'vue'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Crosshair, Loader2, MapPin, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { useMapLocationPicker } from '@/composables/common/useMapLocationPicker'
import type { MapCoordinates } from '@/helpers/common/mapboxHelpers'

/** Click-or-drag map pin picker; the caller owns the coordinates (v-on:update:location). */
const props = withDefaults(
  defineProps<{
    latitude: number | null | undefined
    longitude: number | null | undefined
    /** Free-text location used by "Find on map" to geocode a starting point. */
    locationQuery?: string
    /** Shown under the map while nothing is pinned */
    emptyHint?: string
    disabled?: boolean
  }>(),
  { locationQuery: '', emptyHint: 'Click on the map to pin the location.', disabled: false },
)

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

const formatCoordinate = (value: number | null | undefined) => (typeof value === 'number' ? value.toFixed(6) : '—')
</script>

<template>
  <div class="space-y-2">
    <div v-if="canRenderMap" class="flex items-center justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        class="h-7 px-2 text-xs"
        :disabled="props.disabled || isLocating"
        @click="locateFromQuery(props.locationQuery)"
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
        :disabled="props.disabled"
        @click="clearLocation"
      >
        <X class="size-3.5" />
        Clear
      </Button>
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
        class="h-72 w-full overflow-hidden rounded-md border bg-muted/10"
        :class="{ 'pointer-events-none opacity-60': props.disabled }"
      />
      <p v-if="locateError" class="text-xs text-destructive">{{ locateError }}</p>
      <p class="flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin class="size-3.5 shrink-0" />
        <span v-if="hasCoordinates">
          {{ formatCoordinate(props.latitude) }}, {{ formatCoordinate(props.longitude) }} — drag the pin to adjust.
        </span>
        <span v-else>{{ props.emptyHint }}</span>
      </p>
    </template>
  </div>
</template>
