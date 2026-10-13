<script setup lang="ts">
import { ref, toRef } from 'vue'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MapPin } from '@lucide/vue'
import { useMapboxMap } from '@/composables/common/useMapboxMap'

const props = defineProps<{
  latitude: number
  longitude: number
  label: string
}>()

const mapContainer = ref<HTMLDivElement | null>(null)

const { canRenderMap } = useMapboxMap({
  mapContainer,
  latitude: toRef(props, 'latitude'),
  longitude: toRef(props, 'longitude'),
  label: toRef(props, 'label'),
  zoom: 15,
})
</script>

<template>
  <div
    v-if="!canRenderMap"
    class="flex h-full min-h-40 flex-col items-center justify-center rounded-md border border-dashed bg-muted/20 p-4 text-center"
  >
    <MapPin class="mb-2 size-5 text-muted-foreground" />
    <p class="text-xs text-muted-foreground">Map is unavailable. Mapbox access token is not configured.</p>
  </div>
  <div v-else ref="mapContainer" class="h-full min-h-40 w-full overflow-hidden rounded-md border bg-muted/10" />
</template>
