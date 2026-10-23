import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'
import type { AccordionGalleryItem } from '@/components/AccordionGallery.vue'
import { useSiteContentStore } from '@/stores/common/siteContentStore'
import { LANDING_PROGRAMS } from '@/types/common/siteContent'

// Transparent 1x1 GIF for programs PESO hasn't given a photo yet: the galleries need an image,
// and this leaves their dark card showing
const NO_PHOTO = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

/** "PESO Programs" section under the about section: a centered heading over a gallery of the programs. */
export function useLandingPrograms() {
  const store = useSiteContentStore()
  const { programImages } = storeToRefs(store)

  // Photos are set by Provincial PESO in Site Contents (system.landing_program_cards, migration 049)
  const programs = computed<AccordionGalleryItem[]>(() =>
    LANDING_PROGRAMS.map((program) => ({
      image: programImages.value[program.key] ?? NO_PHOTO,
      label: program.label,
      alt: program.name,
    })),
  )

  // Phones get a swipeable card stack (DepthCarousel); the accordion's panels are too narrow there
  const isPhone = useBreakpoints(breakpointsTailwind).smaller('sm')

  // DepthCarousel has no labels, so the front card's program is captioned under the stack
  const activeIndex = ref(0)
  const activeProgram = computed(() => LANDING_PROGRAMS[activeIndex.value])
  const onCarouselChange = (index: number) => {
    activeIndex.value = index
  }

  onMounted(() => {
    void store.loadProgramCards()
  })

  return {
    title: 'PESO Programs',
    programs,
    isPhone,
    activeProgram,
    onCarouselChange,
  }
}
