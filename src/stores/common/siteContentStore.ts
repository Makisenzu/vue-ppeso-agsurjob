import { defineStore } from 'pinia'
import { ref } from 'vue'
import { siteContentService } from '@/services/common/siteContentService'
import { mediaService } from '@/services/common/mediaService'
import { toHeroSlide } from '@/helpers/common/siteContentHelper'
import { SITE_CONTENT_MEDIA_BUCKET, type LandingHeroSlide, type LandingProgram } from '@/types/common/siteContent'

export const useSiteContentStore = defineStore('siteContent', () => {
  // ─── State ───
  const heroSlides = ref<LandingHeroSlide[]>([])
  const isHeroLoading = ref(false)
  const isHeroLoaded = ref(false)
  // Public URL of each program card's photo; programs without one are missing
  const programImages = ref<Partial<Record<LandingProgram, string>>>({})
  const isProgramCardsLoading = ref(false)
  const isProgramCardsLoaded = ref(false)

  // ─── Actions ───
  // Loads once per visit. No toast on failure: the landing page falls back to its built-in slides.
  const loadHeroSlides = async () => {
    if (isHeroLoaded.value || isHeroLoading.value) return
    isHeroLoading.value = true
    try {
      const rows = await siteContentService.fetchLive('hero_carousel')
      heroSlides.value = rows.map(row =>
        toHeroSlide(row, row.image_path ? mediaService.getPublicUrl(row.image_path, SITE_CONTENT_MEDIA_BUCKET) : null),
      )
    } catch (error) {
      console.error(error)
    } finally {
      isHeroLoaded.value = true
      isHeroLoading.value = false
    }
  }

  // Called after PESO edits the slides, so the landing page reloads them on its next visit
  const resetHeroSlides = () => {
    heroSlides.value = []
    isHeroLoaded.value = false
  }

  // Loads once per visit. No toast on failure: cards without a photo show as plain panels.
  const loadProgramCards = async () => {
    if (isProgramCardsLoaded.value || isProgramCardsLoading.value) return
    isProgramCardsLoading.value = true
    try {
      const rows = await siteContentService.fetchProgramCards()
      programImages.value = Object.fromEntries(
        rows.flatMap(row =>
          row.image_path ? [[row.program, mediaService.getPublicUrl(row.image_path, SITE_CONTENT_MEDIA_BUCKET)]] : [],
        ),
      )
    } catch (error) {
      console.error(error)
    } finally {
      isProgramCardsLoaded.value = true
      isProgramCardsLoading.value = false
    }
  }

  // Called after PESO changes a card photo, so the landing page reloads them on its next visit
  const resetProgramCards = () => {
    programImages.value = {}
    isProgramCardsLoaded.value = false
  }

  return {
    heroSlides,
    isHeroLoading,
    isHeroLoaded,
    loadHeroSlides,
    resetHeroSlides,
    programImages,
    isProgramCardsLoaded,
    loadProgramCards,
    resetProgramCards,
  }
})
