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
    el.className = 'group pointer-events-auto cursor-pointer transition-transform duration-200 hover:scale-105 select-none'

    const app = createApp({
      render() {
        const hasApplicants = row.totalApplicants > 0
        const isSelected = matchesGeographicLabel(selectedMunicipality.value, row.name)

        return h(
          'div',
          {
            class: [
              'flex flex-col items-center',
              isSelected ? 'scale-110 z-30' : 'z-10',
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
            // Main marker card pill
            h(
              'div',
              {
                class: [
                  'flex items-center gap-2 rounded-xl px-2.5 py-1.5 shadow-md backdrop-blur-md transition-all border',
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-primary/30 ring-2 ring-primary/40'
                    : hasApplicants
                    ? 'bg-background/95 text-foreground border-border/80 hover:border-primary/50 hover:bg-background'
                    : 'bg-background/80 text-muted-foreground border-border/50 opacity-80',
                ],
              },
              [
                // Municipality Name
                h('span', { class: 'text-xs font-bold whitespace-nowrap' }, row.name),

                // Applicants Count Pill
                h(
                  'span',
                  {
                    class: [
                      'inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-extrabold leading-none',
                      isSelected
                        ? 'bg-primary-foreground text-primary'
                        : hasApplicants
                        ? 'bg-primary/10 text-primary dark:bg-primary/20'
                        : 'bg-muted text-muted-foreground',
                    ],
                  },
                  `${row.totalApplicants}`
                ),
              ]
            ),

            // LPII breakdown indicator bar (Lowland / Upland / Wetland)
            hasApplicants
              ? h(
                  'div',
                  {
                    class:
                      'mt-1 flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 shadow-xs border border-border/60 text-[9px] font-semibold text-muted-foreground',
                  },
                  [
                    row.lowlandApplicants > 0
                      ? h('span', { class: 'flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400' }, [
                          h('span', { class: 'size-1.5 rounded-full bg-emerald-500' }),
                          `${row.lowlandApplicants}L`,
                        ])
                      : null,
                    row.uplandApplicants > 0
                      ? h('span', { class: 'flex items-center gap-0.5 text-amber-600 dark:text-amber-400' }, [
                          h('span', { class: 'size-1.5 rounded-full bg-amber-500' }),
                          `${row.uplandApplicants}U`,
                        ])
                      : null,
                    row.wetlandApplicants > 0
                      ? h('span', { class: 'flex items-center gap-0.5 text-sky-600 dark:text-sky-400' }, [
                          h('span', { class: 'size-1.5 rounded-full bg-sky-500' }),
                          `${row.wetlandApplicants}W`,
                        ])
                      : null,
                  ].filter(Boolean)
                )
              : null,

            // Top skill tag teaser
            row.topSkills.length > 0
              ? h(
                  'div',
                  {
                    class:
                      'mt-0.5 max-w-32 truncate rounded-md bg-secondary/90 px-1.5 py-0.5 text-[9px] font-medium text-secondary-foreground shadow-xs hidden group-hover:block',
                  },
                  `Top: ${row.topSkills[0].name}`
                )
              : null,

            // Pin triangle stem
            h('div', {
              class: [
                'size-0 border-x-4 border-x-transparent border-t-4',
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
    popupContent.className = 'p-3 space-y-2 text-foreground font-sans'

    const topSkillsHtml =
      row.topSkills.length > 0
        ? row.topSkills
            .slice(0, 3)
            .map(
              (s) =>
                `<span class="inline-block rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium">${s.name} (${s.count})</span>`
            )
            .join(' ')
        : '<span class="text-xs text-muted-foreground italic">No registered skills yet</span>'

    popupContent.innerHTML = `
      <div class="border-b pb-2">
        <h3 class="font-bold text-sm text-foreground">${row.name}</h3>
        <p class="text-xs text-muted-foreground">${row.barangays} Barangays in Agusan del Sur</p>
      </div>
      <div class="space-y-1 text-xs">
        <div class="flex justify-between font-medium">
          <span>Total Applicants:</span>
          <span class="font-bold text-primary">${row.totalApplicants}</span>
        </div>
        <div class="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span class="text-emerald-600 font-semibold">Lowland: ${row.lowlandApplicants}</span> •
          <span class="text-amber-600 font-semibold">Upland: ${row.uplandApplicants}</span> •
          <span class="text-sky-600 font-semibold">Wetland: ${row.wetlandApplicants}</span>
        </div>
      </div>
      <div class="space-y-1 pt-1">
        <span class="text-[11px] font-semibold text-muted-foreground block">Top Skills in Municipality:</span>
        <div class="flex flex-wrap gap-1">${topSkillsHtml}</div>
      </div>
    `

    const viewBtn = document.createElement('button')
    viewBtn.className =
      'mt-2.5 w-full rounded-lg bg-primary py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5'
    viewBtn.innerHTML = '<span>View Municipality Skills</span>'
    viewBtn.addEventListener('click', () => {
      if (options.onViewMunicipality) {
        options.onViewMunicipality(row.name)
      }
    })
    popupContent.appendChild(viewBtn)

    const popup = new mapboxgl.Popup({ offset: 20, closeButton: true, maxWidth: '280px' }).setDOMContent(
      popupContent
    )

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
