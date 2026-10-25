import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { usePageHeroManagerStore } from '@/stores/peso/provincialPeso/pageHeroManagerStore'
import { PUBLIC_PAGES } from '@/types/common/siteContent'

/** "Page banners" panel of Site Contents: one hero banner per public page outside the landing page. */
export function usePageHeroes() {
  const store = usePageHeroManagerStore()
  const { isLoading, errorMessage, savingImagePage, pageToClear } = storeToRefs(store)
  const { fetchHeroes, clearImage, cancelClear } = store

  const pageToClearName = computed(() => PUBLIC_PAGES.find((page) => page.key === pageToClear.value)?.name ?? '')

  const isClearDialogOpen = computed({
    get: () => pageToClear.value !== null,
    set: (open: boolean) => {
      if (!open) cancelClear()
    },
  })

  onMounted(() => {
    void fetchHeroes()
  })

  return {
    pages: PUBLIC_PAGES,
    isLoading,
    errorMessage,
    isClearing: computed(() => savingImagePage.value !== null && savingImagePage.value === pageToClear.value),
    pageToClearName,
    isClearDialogOpen,
    confirmClear: clearImage,
  }
}
