<script setup lang="ts">
import 'mapbox-gl/dist/mapbox-gl.css'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { useSkillMap } from '@/composables/peso/provincialPeso/useSkillMap'
import type { MunicipalitySkillSummaryRow } from '@/types/peso/provincialPeso/skillRepository'

const props = withDefaults(
  defineProps<{
    municipalityRows?: MunicipalitySkillSummaryRow[]
    selectedMunicipality?: string
    heightClass?: string
  }>(),
  {
    municipalityRows: () => [],
    selectedMunicipality: '',
    heightClass: 'h-full',
  }
)

const emit = defineEmits<{
  (e: 'select-municipality', name: string): void
  (e: 'view-municipality', name: string): void
}>()

const {
  mapboxToken,
  selectedProvince,
  selectedMunicipality: internalSelectedMunicipality,
  municipalitiesList,
  resetView,
  handleMunicipalityChange,
} = useSkillMap({
  municipalityRows: () => props.municipalityRows,
  selectedMunicipality: () => props.selectedMunicipality,
  onSelectMunicipality: (name) => emit('select-municipality', name),
  onViewMunicipality: (name) => emit('view-municipality', name),
})
</script>

<template>
  <div :class="['flex w-full flex-col min-h-0', heightClass === 'h-full' ? 'h-full' : '']">
    <!-- Top Filter Controls Bar -->
    <div class="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      <div class="flex flex-col gap-1">
        <span class="text-xs font-medium text-muted-foreground">Province</span>
        <NativeSelect v-model="selectedProvince" disabled class="w-full">
          <NativeSelectOption value="Agusan del Sur">Agusan del Sur</NativeSelectOption>
        </NativeSelect>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-xs font-medium text-muted-foreground">Municipality Focus</span>
        <NativeSelect
          :model-value="props.selectedMunicipality || internalSelectedMunicipality"
          class="w-full"
          @change="handleMunicipalityChange"
        >
          <NativeSelectOption value="">All municipalities (Overview)</NativeSelectOption>
          <NativeSelectOption
            v-for="muni in municipalitiesList"
            :key="muni.name"
            :value="muni.name"
          >
            {{ muni.name }} ({{ muni.applicants }} Applicants)
          </NativeSelectOption>
        </NativeSelect>
      </div>
    </div>

    <!-- Mapbox Canvas Container -->
    <div
      ref="mapContainer"
      class="min-h-0 w-full flex-1 overflow-hidden rounded-xl border border-border bg-muted/20 shadow-xs relative"
    >
      <!-- Optional quick reset button on map -->
      <button
        v-if="props.selectedMunicipality || internalSelectedMunicipality"
        class="absolute top-2 left-2 z-10 rounded-lg bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground shadow-md backdrop-blur-md border border-border hover:bg-background cursor-pointer transition"
        @click="resetView"
      >
        ← Reset Overview
      </button>
    </div>

    <!-- Map Legend -->
    <div class="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1 text-[11px] text-muted-foreground">
      <div class="flex flex-wrap items-center gap-3">
        <span class="font-bold uppercase tracking-wider text-muted-foreground/80">LPII Legend</span>
        <span class="inline-flex items-center gap-1.5 font-medium">
          <span class="size-2.5 rounded-full bg-emerald-500"></span>
          <span>Lowland (L)</span>
        </span>
        <span class="inline-flex items-center gap-1.5 font-medium">
          <span class="size-2.5 rounded-full bg-amber-500"></span>
          <span>Upland (U)</span>
        </span>
        <span class="inline-flex items-center gap-1.5 font-medium">
          <span class="size-2.5 rounded-full bg-sky-500"></span>
          <span>Wetland (W)</span>
        </span>
      </div>

      <span class="text-[10px] text-muted-foreground/70">
        Click marker to preview top skills or navigate
      </span>
    </div>

    <!-- Missing Token Warning -->
    <div
      v-if="!mapboxToken"
      class="mt-3 rounded-lg border border-dashed border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
    >
      Mapbox access token is missing. Set VITE_MAPBOX_ACCESS_TOKEN in your .env file.
    </div>
  </div>
</template>
