<script setup lang="ts">
import { ref, toRefs, watch } from 'vue'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useGeographicMap } from '@/composables/admin/useGeographicMap'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

type JumpLocation = {
    province?: string
    municipality?: string
    barangay?: string
    latitude: number
    longitude: number
}

const props = withDefaults(
    defineProps<{
        latitude?: number | null
        longitude?: number | null
        label?: string
        zoom?: number
        heightClass?: string
        selectedProvince?: string
        selectedMunicipality?: string
        provinceLocations?: JumpLocation[]
        municipalityLocations?: JumpLocation[]
        barangayLocations?: JumpLocation[]
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

const {
    mapboxToken,
    provinces,
    municipalities,
    barangays,
    selectedProvince,
    selectedMunicipality,
    selectedBarangay,
} = useGeographicMap({
    mapContainer,
    latitude,
    longitude,
    label,
    zoom,
    provinceLocations: props.provinceLocations,
    municipalityLocations: props.municipalityLocations,
    barangayLocations: props.barangayLocations,
})

watch(
    () => props.selectedProvince,
    (value) => {
        selectedProvince.value = value?.trim() ?? ''
    },
    { immediate: true }
)

watch(
    () => props.selectedMunicipality,
    (value) => {
        selectedMunicipality.value = value?.trim() ?? ''
    },
    { immediate: true }
)
</script>

<template>
    <!-- Made the outer wrapper flexible and take full height when instructed -->
    <div :class="['flex w-full flex-col', heightClass === 'h-full' ? 'h-full' : '']">
        <div class="mb-3 grid gap-3 md:grid-cols-3">
            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-muted-foreground">Province</span>
                <NativeSelect v-model="selectedProvince" class="w-full">
                    <NativeSelectOption value="">All provinces</NativeSelectOption>
                    <NativeSelectOption
                        v-for="province in provinces"
                        :key="province.name"
                        :value="province.name"
                    >
                        {{ province.name }} ({{ province.count }})
                    </NativeSelectOption>
                </NativeSelect>
            </div>

            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-muted-foreground">Municipality</span>
                <NativeSelect v-model="selectedMunicipality" class="w-full">
                    <NativeSelectOption value="">All municipalities</NativeSelectOption>
                    <NativeSelectOption
                        v-for="municipality in municipalities"
                        :key="municipality.name"
                        :value="municipality.name"
                    >
                        {{ municipality.name }} ({{ municipality.count }})
                    </NativeSelectOption>
                </NativeSelect>
            </div>

            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-muted-foreground">Barangay</span>
                <NativeSelect v-model="selectedBarangay" class="w-full">
                    <NativeSelectOption value="">All barangays</NativeSelectOption>
                    <NativeSelectOption
                        v-for="barangay in barangays"
                        :key="barangay.name"
                        :value="barangay.name"
                    >
                        {{ barangay.name }} ({{ barangay.count }})
                    </NativeSelectOption>
                </NativeSelect>
            </div>
        </div>

        <div
            ref="mapContainer"
            :class="['w-full overflow-hidden rounded-xl border border-border bg-muted/20 shadow-sm', heightClass]"
        ></div>

        <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 px-1 text-[11px] text-muted-foreground">
            <span class="font-medium uppercase tracking-wide text-muted-foreground/80">Legend</span>
            <span class="inline-flex items-center gap-1.5">
                <span class="h-2.5 w-2.5 rounded-full bg-red-500"></span>
                <span>Admin</span>
            </span>
            <span class="inline-flex items-center gap-1.5">
                <span class="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                <span>Applicant</span>
            </span>
            <span class="inline-flex items-center gap-1.5">
                <span class="h-2.5 w-2.5 rounded-full bg-orange-500"></span>
                <span>Provincial PESO</span>
            </span>
            <span class="inline-flex items-center gap-1.5">
                <span class="h-2.5 w-2.5 rounded-full bg-green-500"></span>
                <span>Municipal PESO</span>
            </span>
            <span class="inline-flex items-center gap-1.5">
                <span class="h-2.5 w-2.5 rounded-full bg-violet-500"></span>
                <span>Company Member/Owner</span>
            </span>
        </div>

        <div
            v-if="!mapboxToken"
            class="mt-3 rounded-lg border border-dashed border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
            Mapbox access token is missing. Set VITE_MAPBOX_ACCESS_TOKEN in your .env file.
        </div>
    </div>
</template>