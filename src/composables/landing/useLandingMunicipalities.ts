import { computed, onMounted, ref, shallowRef, watch, type ComponentPublicInstance } from 'vue'
import { storeToRefs } from 'pinia'
import { breakpointsTailwind, useBreakpoints, useColorMode, useElementVisibility } from '@vueuse/core'
import type { InfiniteSpiralItem } from '@/components/InfiniteSpiral.vue'
import agsurSeal from '@/assets/images/agsur.png'
import { useSiteContentStore } from '@/stores/common/siteContentStore'
import { resolveTokenHex } from '@/helpers/common/colorTokenHelper'
import { composeLogoCard } from '@/helpers/common/logoCardHelper'
import { LANDING_MUNICIPALITIES } from '@/types/common/siteContent'

// The phone gallery's cards are round (square, fully rounded) and crop their image to fill, so each logo is
// drawn whole on a transparent square first. The padding keeps a square logo's corners inside the circle
const LOGO_CARD = { width: 720, height: 720, padding: 0.15 } as const

/** "13 Municipalities and 1 City" section under the programs: text on the left, the LGU logos on the right. */
export function useLandingMunicipalities() {
  const store = useSiteContentStore()
  const { municipalityLogos, isMunicipalityLogosLoaded } = storeToRefs(store)

  // Logos are set by Provincial PESO in Site Contents (system.landing_municipality_logos, migration 050);
  // an LGU without one shows the province seal, so there are always all 14
  const logoItems = computed(() =>
    LANDING_MUNICIPALITIES.map((municipality) => {
      const logo = municipalityLogos.value[municipality.key]
      return {
        key: municipality.key,
        src: logo ?? agsurSeal,
        alt: logo ? `${municipality.name} logo` : '',
        label: municipality.isCity ? `City of ${municipality.name}` : municipality.name,
      }
    }),
  )

  const spiralItems = computed<InfiniteSpiralItem[]>(() =>
    logoItems.value.map(({ key, src, alt, label }) => ({ id: key, src, alt, label })),
  )

  // ─── Phones: CircularGallery (ogl / WebGL) as a swipeable carousel ───
  const isPhone = useBreakpoints(breakpointsTailwind).smaller('sm')

  // The gallery renders every frame and listens for swipes on the whole window, so it only exists
  // while its stage is on screen (with a margin so it is ready as it scrolls in)
  const galleryStageRef = ref<HTMLElement | null>(null)
  const isGalleryNearView = useElementVisibility(galleryStageRef, { rootMargin: '200px 0px' })
  const setGalleryStage = (el: Element | ComponentPublicInstance | null) => {
    galleryStageRef.value = el as HTMLElement | null
  }

  // Each logo with its LGU name drawn underneath
  const galleryItems = shallowRef<{ image: string; text: string }[]>([])
  // The names are drawn on a canvas, so they need a resolved color; redrawn when the mode changes
  const galleryTextColor = ref('#000000')
  const mode = useColorMode()
  watch(
    mode,
    () => {
      galleryTextColor.value = resolveTokenHex('--foreground')
    },
    { immediate: true, flush: 'post' },
  )

  // Composed once per set of logos; a logo that fails to load falls back to the original image
  let composeRun = 0
  watch(
    [isPhone, isMunicipalityLogosLoaded, logoItems],
    async ([phone, loaded, items]) => {
      if (!phone || !loaded) return
      const run = ++composeRun
      const cards = await Promise.all(
        items.map(async (item) => ({
          image: await composeLogoCard(item.src, LOGO_CARD).catch(() => item.src),
          text: item.label,
        })),
      )
      if (run === composeRun) galleryItems.value = cards
    },
    { immediate: true },
  )

  const showGallery = computed(() => isGalleryNearView.value && galleryItems.value.length > 0)

  onMounted(() => {
    void store.loadMunicipalityLogos()
  })

  return {
    titleLead: '13 Municipalities',
    titleAccent: 'and 1 City',
    description:
      'Provincial PESO serves job seekers and employers in every town of Agusan del Sur, together with the Public Employment Service Office of each local government.',
    municipalities: LANDING_MUNICIPALITIES,
    spiralItems,
    isPhone,
    setGalleryStage,
    showGallery,
    galleryItems,
    galleryTextColor,
  }
}
