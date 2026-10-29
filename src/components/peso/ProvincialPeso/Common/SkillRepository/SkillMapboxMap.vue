<script setup lang="ts">
import 'mapbox-gl/dist/mapbox-gl.css'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import SearchSelect from '@/components/SearchSelect.vue'
import { computed, ref } from 'vue'
import { SKILL_MAP_TERRAINS, useSkillMap } from '@/composables/peso/provincialPeso/useSkillMap'
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
  isReady,
  selectedMunicipality: internalSelectedMunicipality,
  municipalitiesList,
  municipalityFocusOptions,
  totalApplicants,
  resetView,
  handleMunicipalityChange,
} = useSkillMap({
  mapContainer,
  municipalityRows: () => props.municipalityRows,
  selectedMunicipality: () => props.selectedMunicipality,
  onSelectMunicipality: (name) => emit('select-municipality', name),
  onViewMunicipality: (name) => emit('view-municipality', name),
})

const activeMunicipality = computed(() => props.selectedMunicipality || internalSelectedMunicipality.value)
</script>

<template>
  <div :class="['flex w-full min-h-0 flex-col gap-3', heightClass === 'h-full' ? 'h-full' : '']">
    <!-- Toolbar: province context + municipality focus -->
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0">
        <p class="text-sm font-semibold text-foreground">Agusan del Sur</p>
        <p class="text-xs text-muted-foreground tabular-nums">
          {{ municipalitiesList.length }} municipalities · {{ totalApplicants.toLocaleString() }} applicants
        </p>
      </div>

      <div class="w-full sm:w-64">
        <SearchSelect
          :model-value="activeMunicipality"
          :options="municipalityFocusOptions"
          search-placeholder="Search municipality..."
          size="sm"
          class="w-full text-xs"
          aria-label="Focus on a municipality"
          @update:model-value="handleMunicipalityChange"
        />
      </div>
    </div>

    <!-- Map canvas with overlays (overlays stay visible in fullscreen) -->
    <div
      ref="mapContainer"
      class="relative min-h-0 w-full flex-1 overflow-hidden rounded-xl border border-border bg-muted/30"
    >
      <!-- Loading state -->
      <div
        v-if="mapboxToken && !isReady"
        class="absolute inset-0 z-20 flex items-center justify-center bg-background"
      >
        <Skeleton class="absolute inset-0 rounded-none" />
        <span class="relative text-xs text-muted-foreground">Loading map…</span>
      </div>

      <Button
        v-if="activeMunicipality"
        variant="outline"
        size="sm"
        class="absolute top-3 left-3 z-10 h-8 cursor-pointer bg-background/90 text-xs shadow-sm backdrop-blur-sm"
        @click="resetView"
      >
        Reset view
      </Button>

      <!-- Legend: explains marker count + terrain-mix bar -->
      <div
        class="absolute bottom-3 left-3 z-10 w-52 space-y-2 rounded-lg border border-border bg-background/90 p-3 shadow-sm backdrop-blur-sm"
      >
        <p class="text-xs font-semibold text-foreground">Applicants by terrain zone</p>
        <div class="flex h-1.5 w-full gap-px overflow-hidden rounded-full" aria-hidden="true">
          <span
            v-for="terrain in SKILL_MAP_TERRAINS"
            :key="terrain.key"
            :class="['h-full flex-1', terrain.swatchClass]"
          />
        </div>
        <div class="flex items-center justify-between">
          <span
            v-for="terrain in SKILL_MAP_TERRAINS"
            :key="terrain.key"
            class="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
          >
            <span :class="['size-2 shrink-0 rounded-full', terrain.swatchClass]" />
            {{ terrain.label }}
          </span>
        </div>
        <p class="text-[11px] leading-snug text-muted-foreground">
          Bar under each marker shows its LPII terrain mix.
        </p>
      </div>
    </div>

    <!-- Missing Token Warning -->
    <div
      v-if="!mapboxToken"
      class="rounded-lg border border-dashed border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
    >
      Mapbox access token is missing. Set VITE_MAPBOX_ACCESS_TOKEN in your .env file.
    </div>
  </div>
</template>
