import {
  computed,
  createApp,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  unref,
  watch,
  type MaybeRef,
  type Ref,
  type VNode,
} from 'vue'
import { useColorMode } from '@vueuse/core'
import mapboxgl from 'mapbox-gl'
import { Button } from '@/components/ui/button'
import {
  AGUSAN_DEL_SUR_MUNICIPALITIES,
  DEFAULT_MAP_CENTER,
  type MapCoordinates,
  resolveMapboxStyle,
  resolveMapboxToken,
} from '@/helpers/common/mapboxHelpers'
import type { MunicipalitySkillSummaryRow } from '@/types/peso/provincialPeso/skillRepository'
import {
  matchesGeographicLabel,
  normalizeGeographicLabel,
  normalizeText,
} from '@/helpers/peso/provincialPeso/skillRepositoryHelper'

export interface UseSkillMapOptions {
  mapContainer?: Ref<HTMLDivElement | null>
  municipalityRows?: MaybeRef<MunicipalitySkillSummaryRow[]> | (() => MunicipalitySkillSummaryRow[])
  selectedMunicipality?: MaybeRef<string> | (() => string)
  onSelectMunicipality?: (name: string) => void
  onViewMunicipality?: (name: string) => void
}

interface MarkerHandle {
  marker: mapboxgl.Marker
  app: { unmount: () => void }
  popupApp: { unmount: () => void }
  municipality: string
}

type TerrainKey = 'lowlandApplicants' | 'uplandApplicants' | 'wetlandApplicants'

/**
 * LPII terrain zones, mapped to semantic tokens so they stay theme-aware.
 * Shared with the legend in SkillMapboxMap.vue to keep colors in sync.
 */
export const SKILL_MAP_TERRAINS: { key: TerrainKey; label: string; swatchClass: string }[] = [
  { key: 'lowlandApplicants', label: 'Lowland', swatchClass: 'bg-success' },
  { key: 'uplandApplicants', label: 'Upland', swatchClass: 'bg-warning' },
  { key: 'wetlandApplicants', label: 'Wetland', swatchClass: 'bg-info' },
]

// Mapbox Standard closely matches the Google Maps look (road hierarchy, POIs, land cover).
// Its lightPreset switches day/night in place, so theme changes don't reload the style.
const SKILL_MAP_STYLE = 'mapbox://styles/mapbox/standard'
const BASEMAP_IMPORT_ID = 'basemap'

const OVERVIEW_ZOOM = 8.8
const FOCUS_ZOOM = 11.5

// Marker is anchored at its bottom tip, so popups above it must clear the marker body
const POPUP_OFFSET: mapboxgl.PopupOptions['offset'] = {
  top: [0, 6],
  'top-left': [0, 6],
  'top-right': [0, 6],
  bottom: [0, -48],
  'bottom-left': [0, -48],
  'bottom-right': [0, -48],
  left: [14, -24],
  right: [-14, -24],
}

const AGUSAN_DEL_SUR_COORDINATES_MAP = new Map<string, MapCoordinates>()
for (const entry of AGUSAN_DEL_SUR_MUNICIPALITIES) {
  const coords: MapCoordinates = { latitude: entry.latitude, longitude: entry.longitude }
  AGUSAN_DEL_SUR_COORDINATES_MAP.set(normalizeText(entry.municipality), coords)
  AGUSAN_DEL_SUR_COORDINATES_MAP.set(normalizeGeographicLabel(entry.municipality), coords)
}

function getMunicipalityCoordinates(name?: string | null): MapCoordinates | undefined {
  if (!name) return undefined
  return (
    AGUSAN_DEL_SUR_COORDINATES_MAP.get(normalizeGeographicLabel(name)) ||
    AGUSAN_DEL_SUR_COORDINATES_MAP.get(normalizeText(name))
  )
}

function toPercent(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

/**
 * Proportional terrain-mix bar. Segment widths are data-driven,
 * so flex-grow is the one value that must be set inline.
 */
function renderTerrainBar(row: MunicipalitySkillSummaryRow, barClass: string): VNode {
  return h(
    'div',
    { class: ['flex w-full gap-px overflow-hidden rounded-full bg-muted', barClass], 'aria-hidden': 'true' },
    SKILL_MAP_TERRAINS.filter((t) => row[t.key] > 0).map((t) =>
      h('span', { class: ['h-full', t.swatchClass], style: { flexGrow: row[t.key] } })
    )
  )
}

function renderPopupContent(row: MunicipalitySkillSummaryRow, onView?: (name: string) => void): VNode {
  const total = row.totalApplicants
  const skills = row.topSkills.slice(0, 4)
  const maxSkillCount = Math.max(1, ...skills.map((s) => s.count))

  return h('div', { class: 'w-72 font-sans text-card-foreground' }, [
    // Header
    h('div', { class: 'px-4 pt-4 pb-3 pr-10' }, [
      h('h3', { class: 'text-sm font-semibold leading-tight' }, row.name),
      h('p', { class: 'mt-0.5 text-xs text-muted-foreground' }, `${row.barangays} barangays · Agusan del Sur`),
    ]),

    h('div', { class: 'space-y-4 border-t border-border px-4 py-3' }, [
      // Headline metric
      h('div', { class: 'flex items-baseline justify-between gap-2' }, [
        h('span', { class: 'text-xs text-muted-foreground' }, 'Registered applicants'),
        h('span', { class: 'text-2xl font-bold tracking-tight tabular-nums' }, total.toLocaleString()),
      ]),

      // Terrain composition
      total > 0
        ? h('div', { class: 'space-y-2' }, [
            renderTerrainBar(row, 'h-2'),
            h(
              'div',
              { class: 'grid grid-cols-3 gap-2' },
              SKILL_MAP_TERRAINS.map((t) =>
                h('div', { class: 'space-y-0.5' }, [
                  h('div', { class: 'flex items-center gap-1.5' }, [
                    h('span', { class: ['size-2 shrink-0 rounded-full', t.swatchClass] }),
                    h('span', { class: 'text-[11px] text-muted-foreground' }, t.label),
                  ]),
                  h('p', { class: 'text-sm font-semibold tabular-nums' }, [
                    `${row[t.key]}`,
                    h(
                      'span',
                      { class: 'ml-1 text-[11px] font-normal text-muted-foreground' },
                      `${toPercent(row[t.key], total)}%`
                    ),
                  ]),
                ])
              )
            ),
          ])
        : null,

      // Top skills — ranked list with relative bars
      h('div', { class: 'space-y-2' }, [
        h('p', { class: 'text-xs font-medium text-muted-foreground' }, 'Top skills'),
        skills.length > 0
          ? h(
              'ol',
              { class: 'space-y-2' },
              skills.map((s) =>
                h('li', { class: 'space-y-1' }, [
                  h('div', { class: 'flex items-center justify-between gap-2 text-xs' }, [
                    h('span', { class: 'truncate font-medium' }, s.name),
                    h('span', { class: 'shrink-0 tabular-nums text-muted-foreground' }, `${s.count}`),
                  ]),
                  h('div', { class: 'h-1 overflow-hidden rounded-full bg-muted' }, [
                    h('div', {
                      class: 'h-full rounded-full bg-primary/70',
                      style: { width: `${(s.count / maxSkillCount) * 100}%` },
                    }),
                  ]),
                ])
              )
            )
          : h('p', { class: 'text-xs text-muted-foreground' }, 'No registered skills yet.'),
      ]),
    ]),

    h('div', { class: 'px-4 pb-4' }, [
      h(
        Button,
        { size: 'sm', class: 'w-full cursor-pointer', onClick: () => onView?.(row.name) },
        () => 'View municipality skills'
      ),
    ]),
  ])
}

export function useSkillMap(options: UseSkillMapOptions = {}) {
  const internalMapContainer = ref<HTMLDivElement | null>(null)
  const mapContainer = options.mapContainer ?? internalMapContainer
  const map = shallowRef<mapboxgl.Map | null>(null)
  const markerHandles = shallowRef<MarkerHandle[]>([])
  const isReady = ref(false)
  const mapboxToken = resolveMapboxToken()

  const colorMode = useColorMode()
  const isDark = computed(() => colorMode.state.value === 'dark')
  const mapStyle = computed(() => resolveMapboxStyle(SKILL_MAP_STYLE))
  const lightPreset = computed(() => (isDark.value ? 'night' : 'day'))

  const selectedProvince = ref('Agusan del Sur')

  function resolveSelectedMunicipality(): string {
    if (typeof options.selectedMunicipality === 'function') {
      return options.selectedMunicipality() || ''
    }
    return unref(options.selectedMunicipality) || ''
  }

  function resolveRows(): MunicipalitySkillSummaryRow[] {
    if (typeof options.municipalityRows === 'function') {
      return options.municipalityRows() || []
    }
    return unref(options.municipalityRows) || []
  }

  const selectedMunicipality = ref(resolveSelectedMunicipality())

  // Watch external prop changes for selectedMunicipality
  watch(
    () => resolveSelectedMunicipality(),
    (val) => {
      if (val !== undefined && val !== selectedMunicipality.value) {
        selectedMunicipality.value = val || ''
      }
    }
  )

  const municipalitiesList = computed(() => {
    const rows = resolveRows()
    return rows.map((r) => ({
      name: r.name,
      applicants: r.totalApplicants,
      barangays: r.barangays,
    }))
  })

  const totalApplicants = computed(() =>
    municipalitiesList.value.reduce((sum, m) => sum + m.applicants, 0)
  )

  function clearMarkers() {
    for (const h of markerHandles.value) {
      h.marker.remove()
      h.app.unmount()
      h.popupApp.unmount()
    }
    markerHandles.value = []
  }

  function createMarkerElement(
    row: MunicipalitySkillSummaryRow,
    coordinates: MapCoordinates
  ): MarkerHandle {
    const el = document.createElement('div')
    el.className = 'group pointer-events-auto cursor-pointer select-none'

    const app = createApp({
      render() {
        const hasApplicants = row.totalApplicants > 0
        const isSelected = matchesGeographicLabel(selectedMunicipality.value, row.name)

        return h(
          'div',
          {
            role: 'button',
            tabindex: 0,
            'aria-label': `${row.name}, ${row.totalApplicants} applicants`,
            class: [
              'relative flex flex-col items-center transition-transform duration-150 ease-out',
              isSelected ? 'z-40 -translate-y-1' : 'z-10 group-hover:z-30 group-hover:-translate-y-0.5',
            ],
            onClick: (e: MouseEvent) => {
              e.stopPropagation()
              if (options.onSelectMunicipality) {
                options.onSelectMunicipality(row.name)
              } else {
                selectedMunicipality.value = matchesGeographicLabel(selectedMunicipality.value, row.name) ? '' : row.name
              }
            },
            onKeydown: (e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                ;(e.currentTarget as HTMLElement).click()
              }
            },
          },
          [
            // Marker card: name + count, with terrain mix underneath
            h(
              'div',
              {
                class: [
                  'flex flex-col gap-1 rounded-lg border px-2 py-1 shadow-md transition-all duration-150',
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-primary/20'
                    : hasApplicants
                      ? 'border-border bg-card/95 text-card-foreground backdrop-blur-sm group-hover:border-primary/60 group-hover:shadow-lg'
                      : 'border-border/60 bg-muted/90 text-muted-foreground opacity-75 group-hover:opacity-100',
                ],
              },
              [
                h('div', { class: 'flex items-center gap-2' }, [
                  h('span', { class: 'text-[11px] font-semibold tracking-tight whitespace-nowrap' }, row.name),
                  h(
                    'span',
                    {
                      class: [
                        'text-[11px] font-bold leading-none tabular-nums',
                        isSelected ? 'text-primary-foreground' : hasApplicants ? 'text-primary' : 'text-muted-foreground',
                      ],
                    },
                    `${row.totalApplicants}`
                  ),
                ]),
                hasApplicants
                  ? renderTerrainBar(row, isSelected ? 'h-1 bg-primary-foreground/30' : 'h-1')
                  : null,
              ]
            ),

            // Pointer stem
            h('div', {
              class: [
                'size-0 -mt-px border-x-[5px] border-t-[6px] border-x-transparent pointer-events-none',
                isSelected ? 'border-t-primary' : 'border-t-border',
              ],
            }),
          ]
        )
      },
    })

    app.mount(el)

    const targetMap = map.value
    if (!targetMap) {
      throw new Error('Map is not ready')
    }

    // Rendered via Vue (not innerHTML) so DB-sourced skill names are always escaped
    const popupContent = document.createElement('div')
    const popupApp = createApp({
      render: () => renderPopupContent(row, options.onViewMunicipality),
    })
    popupApp.mount(popupContent)

    const popup = new mapboxgl.Popup({
      offset: POPUP_OFFSET,
      closeButton: true,
      closeOnClick: false,
      maxWidth: '300px',
      focusAfterOpen: false,
    }).setDOMContent(popupContent)

    const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([coordinates.longitude, coordinates.latitude])
      .setPopup(popup)
      .addTo(targetMap)

    return { marker, app, popupApp, municipality: row.name }
  }

  function openMarkerPopup(name: string) {
    if (!name || !map.value) return
    const match = markerHandles.value.find((h) => matchesGeographicLabel(h.municipality, name))
    if (match) {
      const popup = match.marker.getPopup()
      if (popup && !popup.isOpen()) {
        match.marker.togglePopup()
      }
    }
  }

  function renderAllMarkers() {
    if (!map.value || !isReady.value) return
    clearMarkers()

    const rows = resolveRows()
    const nextHandles: MarkerHandle[] = []
    for (const row of rows) {
      const coords = getMunicipalityCoordinates(row.name)
      if (coords) {
        const handle = createMarkerElement(row, coords)
        nextHandles.push(handle)
      }
    }
    markerHandles.value = nextHandles

    if (selectedMunicipality.value) {
      openMarkerPopup(selectedMunicipality.value)
    }
  }

  function flyToMunicipality(name: string) {
    if (!map.value) return
    if (!name) {
      map.value.flyTo({
        center: [DEFAULT_MAP_CENTER.longitude, DEFAULT_MAP_CENTER.latitude],
        zoom: OVERVIEW_ZOOM,
        duration: 900,
      })
      return
    }

    const coords = getMunicipalityCoordinates(name)
    if (coords) {
      map.value.flyTo({
        center: [coords.longitude, coords.latitude],
        zoom: FOCUS_ZOOM,
        duration: 900,
      })
    }
  }

  watch(
    () => selectedMunicipality.value,
    (val) => {
      flyToMunicipality(val)
      renderAllMarkers()
    }
  )

  watch(
    () => resolveRows(),
    () => {
      renderAllMarkers()
    },
    { deep: true }
  )

  // Follow the app theme without reloading the style
  watch(lightPreset, (preset) => {
    map.value?.setConfigProperty(BASEMAP_IMPORT_ID, 'lightPreset', preset)
  })

  function initializeMap() {
    if (!mapContainer.value) return
    if (map.value) return

    mapboxgl.accessToken = mapboxToken

    const instance = new mapboxgl.Map({
      container: mapContainer.value,
      style: mapStyle.value,
      config: {
        [BASEMAP_IMPORT_ID]: {
          lightPreset: lightPreset.value,
          // Flat, 2D presentation like Google Maps' default view
          show3dObjects: false,
          showPointOfInterestLabels: true,
          showTransitLabels: true,
          showPlaceLabels: true,
          showRoadLabels: true,
        },
      },
      pitch: 0,
      center: [DEFAULT_MAP_CENTER.longitude, DEFAULT_MAP_CENTER.latitude],
      zoom: OVERVIEW_ZOOM,
      minZoom: 7,
      maxZoom: 16,
      attributionControl: false,
    })

    instance.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right')
    instance.addControl(new mapboxgl.FullscreenControl(), 'top-right')
    instance.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right')

    instance.on('load', () => {
      isReady.value = true
      renderAllMarkers()
      if (selectedMunicipality.value) {
        flyToMunicipality(selectedMunicipality.value)
      }
    })

    map.value = instance
  }

  onMounted(() => {
    void nextTick(() => {
      initializeMap()
    })
  })

  onBeforeUnmount(() => {
    clearMarkers()
    if (map.value) {
      map.value.remove()
      map.value = null
    }
  })

  function resetView() {
    selectedMunicipality.value = ''
    if (options.onSelectMunicipality) {
      options.onSelectMunicipality('')
    }
    flyToMunicipality('')
  }

  function handleMunicipalityChange(event: Event) {
    const target = event.target as HTMLSelectElement
    const val = target?.value ?? ''
    selectedMunicipality.value = val
    if (options.onSelectMunicipality) {
      options.onSelectMunicipality(val)
    }
  }

  return {
    mapContainer,
    map,
    isReady,
    mapboxToken,
    selectedProvince,
    selectedMunicipality,
    municipalitiesList,
    totalApplicants,
    flyToMunicipality,
    resetView,
    renderAllMarkers,
    handleMunicipalityChange,
  }
}
