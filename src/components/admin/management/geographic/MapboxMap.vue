<script setup lang="ts">
import { ref, toRefs } from 'vue'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useGeographicMap } from '@/composables/admin/useGeographicMap'

const props = withDefaults(
    defineProps<{
        latitude?: number | null
        longitude?: number | null
        label?: string
        zoom?: number
        heightClass?: string
    }>(),
    {
        latitude: null,
        longitude: null,
        label: 'Geographic location',
        zoom: 10,
        heightClass: 'h-[28rem]',
    }
)

const { latitude, longitude, label, zoom } = toRefs(props)

const mapContainer = ref<HTMLDivElement | null>(null)

const { mapboxToken, hasLocation } = useGeographicMap({
    mapContainer,
    latitude,
    longitude,
    label,
    zoom,
})
</script>

<template>
    <!-- Made the outer wrapper flexible and take full height when instructed -->
    <div :class="['flex w-full flex-col', heightClass === 'h-full' ? 'h-full' : '']">
        <div
            ref="mapContainer"
            :class="['w-full overflow-hidden rounded-xl border border-border bg-muted/20 shadow-sm', heightClass]"
        ></div>

        <div class="mt-2 flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
            <span class="inline-flex h-1.5 w-1.5 rounded-full bg-primary"></span>
            <span v-if="hasLocation">Showing the selected geographic location.</span>
            <span v-else>Default map view is shown until coordinates are provided.</span>
        </div>

        <div
            v-if="!mapboxToken"
            class="mt-3 rounded-lg border border-dashed border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
            Mapbox access token is missing. Set VITE_MAPBOX_ACCESS_TOKEN in your .env file.
        </div>
    </div>
</template>