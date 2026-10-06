<script setup lang="ts">
import 'mapbox-gl/dist/mapbox-gl.css'
import { RotateCcw } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ref } from 'vue'
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

const mapContainer = ref<HTMLDivElement | null>(null)

const {
  mapboxToken,
  selectedMunicipality: internalSelectedMunicipality,
  municipalitiesList,
  resetView,
  handleMunicipalityChange,
} = useSkillMap({
  mapContainer,
  municipalityRows: () => props.municipalityRows,
  selectedMunicipality: () => props.selectedMunicipality,
  onSelectMunicipality: (name) => emit('select-municipality', name),
  onViewMunicipality: (name) => emit('view-municipality', name),
})
</script>

<template>
  <div :class="['flex w-full flex-col min-h-0', heightClass === 'h-full' ? 'h-full' : '']">
    <!-- Top Filter & Navigation Toolbar -->
    <div class="mb-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <!-- Province Context Identifier -->
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-foreground">Agusan del Sur</span>
          <Badge variant="secondary" class="h-5 px-1.5 text-[10px] font-medium text-muted-foreground">
            {{ municipalitiesList.length }} Municipalities
          </Badge>
        </div>
      </div>

      <!-- Municipality Focus Dropdown & Reset Action -->
      <div class="flex items-center gap-2">
        <div class="w-full sm:w-60">
          <NativeSelect
            :model-value="props.selectedMunicipality || internalSelectedMunicipality"
            class="h-8 w-full text-xs font-medium"
            @change="handleMunicipalityChange"
          >
            <NativeSelectOption value="">All Municipalities (Overview)</NativeSelectOption>
            <NativeSelectOption
              v-for="muni in municipalitiesList"
              :key="muni.name"
              :value="muni.name"
            >
              {{ muni.name }} ({{ muni.applicants }} Applicants)
            </NativeSelectOption>
          </NativeSelect>
        </div>

        <Button
          v-if="props.selectedMunicipality || internalSelectedMunicipality"
          variant="outline"
          size="sm"
          class="h-8 shrink-0 gap-1.5 px-2.5 text-xs cursor-pointer hover:bg-muted"
          @click="resetView"
        >
          <RotateCcw class="size-3" />
          <span>Reset</span>
        </Button>
      </div>
    </div>

    <!-- Mapbox Canvas Container with Integrated HUD Elements -->
    <div
      ref="mapContainer"
      class="relative min-h-0 w-full flex-1 overflow-hidden rounded-xl border border-border bg-muted/20 shadow-xs"
    >
      <!-- Floating Quick Reset Button on Map Canvas -->
      <button
        v-if="props.selectedMunicipality || internalSelectedMunicipality"
        class="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/90 px-3 py-1.5 text-xs font-semibold text-foreground shadow-md backdrop-blur-md transition hover:bg-background active:scale-95 cursor-pointer"
        @click="resetView"
      >
        <RotateCcw class="size-3.5 text-muted-foreground" />
        <span>Reset Overview</span>
      </button>

      <!-- Floating Bottom-Left HUD Legend Card -->
      <div class="pointer-events-auto absolute bottom-3 left-3 z-10 rounded-xl border border-border/80 bg-background/90 p-2.5 shadow-md backdrop-blur-md">
        <div class="flex items-center justify-between gap-3 mb-1.5">
          <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">LPII Terrain Zones</span>
          <span class="text-[10px] font-medium text-muted-foreground/60">AgSur</span>
        </div>
        <div class="flex items-center gap-2.5 text-xs">
          <span class="inline-flex items-center gap-1.5 font-medium">
            <span class="size-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50"></span>
            <span class="text-[11px] text-foreground">Lowland</span>
          </span>
          <span class="inline-flex items-center gap-1.5 font-medium">
            <span class="size-2 rounded-full bg-amber-500 shadow-xs shadow-amber-500/50"></span>
            <span class="text-[11px] text-foreground">Upland</span>
          </span>
          <span class="inline-flex items-center gap-1.5 font-medium">
            <span class="size-2 rounded-full bg-sky-500 shadow-xs shadow-sky-500/50"></span>
            <span class="text-[11px] text-foreground">Wetland</span>
          </span>
        </div>
      </div>
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

