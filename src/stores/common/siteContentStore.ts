import { defineStore } from 'pinia'
import { ref } from 'vue'
import { siteContentService } from '@/services/common/siteContentService'
import { mediaService } from '@/services/common/mediaService'
import { toHeroSlide, toOrgChart, toPageHero } from '@/helpers/common/siteContentHelper'
import {
  SITE_CONTENT_MEDIA_BUCKET,
  type AgsurMunicipality,
  type LandingHeroSlide,
  type LandingProgram,
  type OrgChart,
  type PageHero,
  type PublicPage,
} from '@/types/common/siteContent'

export const useSiteContentStore = defineStore('siteContent', () => {
  // ─── State ───
  const heroSlides = ref<LandingHeroSlide[]>([])
  const isHeroLoading = ref(false)
  const isHeroLoaded = ref(false)
  // Public URL of each program card's photo; programs without one are missing
  const programImages = ref<Partial<Record<LandingProgram, string>>>({})
  const isProgramCardsLoading = ref(false)
  const isProgramCardsLoaded = ref(false)
  // Public URL of each municipality's logo; municipalities without one are missing
  const municipalityLogos = ref<Partial<Record<AgsurMunicipality, string>>>({})
  const isMunicipalityLogosLoading = ref(false)
  const isMunicipalityLogosLoaded = ref(false)
  // Hero of each public page, saved text already merged over the built-in text
  const pageHeroes = ref<Partial<Record<PublicPage, PageHero>>>({})
  const loadingPageHeroes = ref<PublicPage[]>([])
  // Organizational chart of the "What is PESO?" page; null until loaded or when loading failed
  const orgChart = ref<OrgChart | null>(null)
  const isOrgChartLoading = ref(false)
  const isOrgChartLoaded = ref(false)

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

  // Loads once per visit. No toast on failure: municipalities without a logo show the province seal.
  const loadMunicipalityLogos = async () => {
    if (isMunicipalityLogosLoaded.value || isMunicipalityLogosLoading.value) return
    isMunicipalityLogosLoading.value = true
    try {
      const rows = await siteContentService.fetchMunicipalityLogos()
      municipalityLogos.value = Object.fromEntries(
        rows.flatMap(row =>
          row.image_path ? [[row.municipality, mediaService.getPublicUrl(row.image_path, SITE_CONTENT_MEDIA_BUCKET)]] : [],
        ),
      )
    } catch (error) {
      console.error(error)
    } finally {
      isMunicipalityLogosLoaded.value = true
      isMunicipalityLogosLoading.value = false
    }
  }

  // Called after PESO changes a logo, so the landing page reloads them on its next visit
  const resetMunicipalityLogos = () => {
    municipalityLogos.value = {}
    isMunicipalityLogosLoaded.value = false
  }

  // Loads once per visit. No toast on failure: the page shows its built-in text on the plain band.
  const loadPageHero = async (page: PublicPage) => {
    if (pageHeroes.value[page] || loadingPageHeroes.value.includes(page)) return
    loadingPageHeroes.value = [...loadingPageHeroes.value, page]
    let row = null
    try {
      row = await siteContentService.fetchPageHero(page)
    } catch (error) {
      console.error(error)
    } finally {
      const imageUrl = row?.image_path ? mediaService.getPublicUrl(row.image_path, SITE_CONTENT_MEDIA_BUCKET) : null
      pageHeroes.value = { ...pageHeroes.value, [page]: toPageHero(page, row, imageUrl) }
      loadingPageHeroes.value = loadingPageHeroes.value.filter(item => item !== page)
    }
  }

  // Called after PESO edits a hero, so the page reloads it on its next visit
  const resetPageHero = (page: PublicPage) => {
    const { [page]: _removed, ...rest } = pageHeroes.value
    pageHeroes.value = rest
  }

  // Loads once per visit. No toast on failure: the page leaves the chart out.
  const loadOrgChart = async () => {
    if (isOrgChartLoaded.value || isOrgChartLoading.value) return
    isOrgChartLoading.value = true
    try {
      const { units, positions } = await siteContentService.fetchOrgChart()
      orgChart.value = toOrgChart(
        units,
        positions.map(position => ({
          ...position,
          photo_url: position.photo_path ? mediaService.getPublicUrl(position.photo_path, SITE_CONTENT_MEDIA_BUCKET) : null,
        })),
      )
    } catch (error) {
      console.error(error)
    } finally {
      isOrgChartLoaded.value = true
      isOrgChartLoading.value = false
    }
  }

  // Called after PESO edits the chart, so the page reloads it on its next visit
  const resetOrgChart = () => {
    orgChart.value = null
    isOrgChartLoaded.value = false
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
    municipalityLogos,
    isMunicipalityLogosLoaded,
    loadMunicipalityLogos,
    resetMunicipalityLogos,
    pageHeroes,
    loadPageHero,
    resetPageHero,
    orgChart,
    isOrgChartLoading,
    loadOrgChart,
    resetOrgChart,
  }
})
