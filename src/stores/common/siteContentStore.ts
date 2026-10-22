import { defineStore } from 'pinia'
import { ref } from 'vue'
import { siteContentService } from '@/services/common/siteContentService'
import { mediaService } from '@/services/common/mediaService'
import { toHeroSlide } from '@/helpers/common/siteContentHelper'
import { SITE_CONTENT_MEDIA_BUCKET, type LandingHeroSlide } from '@/types/common/siteContent'

export const useSiteContentStore = defineStore('siteContent', () => {
  // ─── State ───
  const heroSlides = ref<LandingHeroSlide[]>([])
  const isHeroLoading = ref(false)
  const isHeroLoaded = ref(false)

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

  return { heroSlides, isHeroLoading, isHeroLoaded, loadHeroSlides, resetHeroSlides }
})
