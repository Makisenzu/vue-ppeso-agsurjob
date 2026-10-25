import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSiteContentStore } from '@/stores/common/siteContentStore'
import type { PublicPage } from '@/types/common/siteContent'

/** Hero banner of a public page (e.g. "What is PESO?"), edited by Provincial PESO in Site Contents (migration 051). */
export function useLandingPageHero(page: PublicPage) {
  const store = useSiteContentStore()
  const { pageHeroes } = storeToRefs(store)

  // Undefined until loaded; a failed load still resolves to the built-in text
  const hero = computed(() => pageHeroes.value[page])

  onMounted(() => {
    void store.loadPageHero(page)
  })

  return { hero }
}
