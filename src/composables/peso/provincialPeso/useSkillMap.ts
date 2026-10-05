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
} from 'vue'
import mapboxgl from 'mapbox-gl'
import {
  AGUSAN_DEL_SUR_MUNICIPALITIES,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAPBOX_STYLE,
  resolveMapboxStyle,
  resolveMapboxToken,
  type MapCoordinates,
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
  municipality: string
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

export function useSkillMap(options: UseSkillMapOptions = {}) {
  const internalMapContainer = ref<HTMLDivElement | null>(null)
  const mapContainer = options.mapContainer ?? internalMapContainer
  const map = shallowRef<mapboxgl.Map | null>(null)
  const markerHandles = shallowRef<MarkerHandle[]>([])
  const isReady = ref(false)
  const mapboxToken = resolveMapboxToken()
  const mapStyle = computed(() => resolveMapboxStyle(DEFAULT_MAPBOX_STYLE))

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

  function clearMarkers() {
    for (const h of markerHandles.value) {
      h.marker.remove()
      h.app.unmount()
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

        // Dominant terrain dot indicator
        let dotColorClass = 'bg-muted-foreground/40'
        if (
          row.lowlandApplicants >= row.uplandApplicants &&
          row.lowlandApplicants >= row.wetlandApplicants &&
          row.lowlandApplicants > 0
        ) {
          dotColorClass = 'bg-emerald-500 shadow-xs shadow-emerald-500/50'
        } else if (row.uplandApplicants >= row.wetlandApplicants && row.uplandApplicants > 0) {
          dotColorClass = 'bg-amber-500 shadow-xs shadow-amber-500/50'
        } else if (row.wetlandApplicants > 0) {
          dotColorClass = 'bg-sky-500 shadow-xs shadow-sky-500/50'
        }

        return h(
          'div',
          {
            class: [
              'relative flex flex-col items-center transition-transform duration-150',
              isSelected ? 'scale-105 z-40' : 'z-10 group-hover:z-30',
            ],
            onClick: (e: MouseEvent) => {
              e.stopPropagation()
              if (options.onSelectMunicipality) {
                options.onSelectMunicipality(row.name)
              } else {
                selectedMunicipality.value = matchesGeographicLabel(selectedMunicipality.value, row.name) ? '' : row.name
              }
            },
          },
          [
            // Hover micro-tooltip preview (smooth opacity & translate transition, avoiding reflow glitches)
            hasApplicants
              ? h(
                  'div',
                  {
                    class: [
                      'pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 z-50',
                      'flex items-center gap-1.5 rounded-md bg-foreground/95 px-2 py-0.5 text-[9px] font-semibold text-background shadow-lg backdrop-blur-xs whitespace-nowrap',
                      'opacity-0 translate-y-1 transition-all duration-150 ease-out',
                      'group-hover:opacity-100 group-hover:translate-y-0',
                    ],
                  },
                  [
                    h('span', { class: 'text-emerald-400 font-bold' }, `${row.lowlandApplicants}L`),
                    h('span', { class: 'opacity-40' }, '•'),
                    h('span', { class: 'text-amber-400 font-bold' }, `${row.uplandApplicants}U`),
                    h('span', { class: 'opacity-40' }, '•'),
                    h('span', { class: 'text-sky-400 font-bold' }, `${row.wetlandApplicants}W`),
                    row.topSkills.length > 0
                      ? h('span', { class: 'opacity-60 ml-0.5' }, `| ${row.topSkills[0].name}`)
                      : null,
                  ].filter(Boolean)
                )
              : null,

            // Single unified, sleek marker pill with hit-box buffer to prevent border jitter
            h(
              'div',
              {
                class: [
                  'relative flex items-center gap-1.5 rounded-full px-2.5 py-1 shadow-md backdrop-blur-md border transition-all duration-150',
                  'before:absolute before:-inset-1 before:rounded-full before:content-[\'\']',
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30 ring-2 ring-primary/40'
                    : hasApplicants
                    ? 'bg-card/95 text-card-foreground border-border/80 group-hover:border-primary/50 group-hover:bg-card group-hover:shadow-lg'
                    : 'bg-muted/80 text-muted-foreground border-border/40 opacity-70 group-hover:opacity-100',
                ],
              },
              [
                // Terrain dot
                h('span', {
                  class: [
                    'size-2 shrink-0 rounded-full transition-transform',
                    isSelected ? 'bg-primary-foreground' : dotColorClass,
                  ],
                }),

                // Municipality Name
                h(
                  'span',
                  {
                    class: [
                      'text-[11px] font-bold tracking-tight whitespace-nowrap',
                      isSelected ? 'text-primary-foreground' : 'text-foreground',
                    ],
                  },
                  row.name
                ),

                // Applicants Count Pill
                h(
                  'span',
                  {
                    class: [
                      'inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[9px] font-black leading-none tabular-nums',
                      isSelected
                        ? 'bg-primary-foreground text-primary'
                        : hasApplicants
                        ? 'bg-primary/10 text-primary dark:bg-primary/25'
                        : 'bg-muted text-muted-foreground',
                    ],
                  },
                  `${row.totalApplicants}`
                ),
              ]
            ),

            // Subtle stem pointer
            h('div', {
              class: [
                'size-0 border-x-4 border-x-transparent border-t-[5px] -mt-px pointer-events-none',
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

    const popupContent = document.createElement('div')
    popupContent.className = 'w-72 overflow-hidden text-foreground font-sans'

    const topSkillsHtml =
      row.topSkills.length > 0
        ? row.topSkills
            .slice(0, 4)
            .map(
              (s) =>
                `<span class="inline-flex items-center gap-1 rounded-md bg-muted/60 dark:bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-foreground border border-border/50">
                  <span>${s.name}</span>
                  <span class="rounded bg-primary/10 dark:bg-primary/25 px-1 font-bold text-primary text-[9px]">${s.count}</span>
                </span>`
            )
            .join(' ')
        : '<span class="text-xs text-muted-foreground italic">No registered skills yet</span>'

    popupContent.innerHTML = `
      <div class="border-b border-border/60 bg-muted/30 px-3.5 py-2.5">
        <div class="flex items-center justify-between gap-2 pr-6">
          <h3 class="font-bold text-sm tracking-tight text-foreground">${row.name}</h3>
          <span class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground border border-border/60">
            ${row.barangays} Barangays
          </span>
        </div>
        <p class="text-[11px] text-muted-foreground mt-0.5">Agusan del Sur Municipality</p>
      </div>

      <div class="p-3.5 space-y-3">
        <!-- Applicant breakdown metric box -->
        <div class="rounded-lg border border-border/60 bg-card p-2.5 shadow-2xs space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-muted-foreground">Total Applicants</span>
            <span class="text-base font-extrabold text-foreground tracking-tight">${row.totalApplicants}</span>
          </div>

          <div class="grid grid-cols-3 gap-1.5 pt-1 border-t border-border/40 text-center">
            <div class="rounded-md bg-emerald-500/10 px-1 py-1 border border-emerald-500/20">
              <span class="block text-[9px] font-bold text-emerald-700 dark:text-emerald-300">Lowland</span>
              <span class="block text-xs font-black text-emerald-700 dark:text-emerald-300 tabular-nums">${row.lowlandApplicants}</span>
            </div>
            <div class="rounded-md bg-amber-500/10 px-1 py-1 border border-amber-500/20">
              <span class="block text-[9px] font-bold text-amber-700 dark:text-amber-300">Upland</span>
              <span class="block text-xs font-black text-amber-700 dark:text-amber-300 tabular-nums">${row.uplandApplicants}</span>
            </div>
            <div class="rounded-md bg-sky-500/10 px-1 py-1 border border-sky-500/20">
              <span class="block text-[9px] font-bold text-sky-700 dark:text-sky-300">Wetland</span>
              <span class="block text-xs font-black text-sky-700 dark:text-sky-300 tabular-nums">${row.wetlandApplicants}</span>
            </div>
          </div>
        </div>

        <!-- Top Skills -->
        <div class="space-y-1.5">
          <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Top Skills in LGU</span>
          <div class="flex flex-wrap gap-1">${topSkillsHtml}</div>
        </div>
      </div>
    `

    const buttonWrapper = document.createElement('div')
    buttonWrapper.className = 'px-3.5 pb-3.5 pt-0'

    const viewBtn = document.createElement('button')
    viewBtn.className =
      'w-full rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]'
    viewBtn.innerHTML = '<span>Explore Municipality Skills</span><svg xmlns="http://www.w3.org/2000/svg" class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>'
    viewBtn.addEventListener('click', () => {
      if (options.onViewMunicipality) {
        options.onViewMunicipality(row.name)
      }
    })
    buttonWrapper.appendChild(viewBtn)
    popupContent.appendChild(buttonWrapper)

    const popup = new mapboxgl.Popup({
      offset: 14,
      closeButton: true,
      closeOnClick: false,
      maxWidth: '290px',
      focusAfterOpen: false,
    }).setDOMContent(popupContent)

    const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([coordinates.longitude, coordinates.latitude])
      .setPopup(popup)
      .addTo(targetMap)

    return { marker, app, municipality: row.name }
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
        zoom: 8.8,
        duration: 900,
      })
      return
    }

    const coords = getMunicipalityCoordinates(name)
    if (coords) {
      map.value.flyTo({
        center: [coords.longitude, coords.latitude],
        zoom: 11.5,
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

  function initializeMap() {
    if (!mapContainer.value) return
    if (map.value) return

    mapboxgl.accessToken = mapboxToken

    const instance = new mapboxgl.Map({
      container: mapContainer.value,
      style: mapStyle.value,
      center: [DEFAULT_MAP_CENTER.longitude, DEFAULT_MAP_CENTER.latitude],
      zoom: 8.8,
      minZoom: 7,
      maxZoom: 16,
    })

    instance.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right')
    instance.addControl(new mapboxgl.FullscreenControl(), 'top-right')

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
    flyToMunicipality,
    resetView,
    renderAllMarkers,
    handleMunicipalityChange,
  }
}
