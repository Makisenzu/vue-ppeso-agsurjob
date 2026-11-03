import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { usePageHeroManagerStore } from '@/stores/peso/provincialPeso/pageHeroManagerStore'
import { PUBLIC_PAGES, type PublicPage } from '@/types/common/siteContent'

/**
 * A Site Contents panel of hero banners: "Page banners" (What is PESO?) or "Job Fairs page" (108).
 * Each panel only answers for its own pages, so their remove-photo dialogs don't both open.
 */
export function usePageHeroes(pageKeys: readonly PublicPage[]) {
  const store = usePageHeroManagerStore()
  const { isLoading, errorMessage, savingImagePage, pageToClear } = storeToRefs(store)
  const { fetchHeroes, clearImage, cancelClear } = store

  const pageToClearName = computed(() => PUBLIC_PAGES.find((page) => page.key === pageToClear.value)?.name ?? '')

  const pages = PUBLIC_PAGES.filter((page) => pageKeys.includes(page.key))
  const isClearDialogOpen = computed({
    get: () => pageToClear.value !== null && pageKeys.includes(pageToClear.value),
    set: (open: boolean) => {
      if (!open) cancelClear()
    },
  })

  onMounted(() => {
    void fetchHeroes()
  })

  return {
    pages,
    isLoading,
    errorMessage,
    isClearing: computed(() => savingImagePage.value !== null && savingImagePage.value === pageToClear.value),
    pageToClearName,
    isClearDialogOpen,
    confirmClear: clearImage,
  }
}
