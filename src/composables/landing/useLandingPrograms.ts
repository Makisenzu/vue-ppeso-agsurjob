import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import type { AccordionGalleryItem } from '@/components/AccordionGallery.vue'
import { useSiteContentStore } from '@/stores/common/siteContentStore'
import { LANDING_PROGRAMS } from '@/types/common/siteContent'

// Transparent 1x1 GIF for programs PESO hasn't given a photo yet: AccordionGallery needs an image,
// and this leaves its dark panel, overlay and label showing
const NO_PHOTO = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

/** "PESO Programs" section under the about section: a centered heading over an accordion gallery of the programs. */
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

  onMounted(() => {
    void store.loadProgramCards()
  })

  return {
    title: 'PESO Programs',
    programs,
  }
}
