import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useIntervalFn, usePreferredReducedMotion } from '@vueuse/core'
import type { CarouselApi } from '@/components/ui/carousel'
import { useSiteContentStore } from '@/stores/common/siteContentStore'
import { useLandingIntroDone } from '@/composables/landing/useLandingIntro'
import type { LandingHeroSlide } from '@/types/common/siteContent'

// Office name set under the carousel, revealed letter by letter once the landing intro lifts
const OFFICE_NAME = 'Public Employment Service Office'

// Built-in slides, shown until PESO publishes hero_carousel rows in system.site_contents (or when
// loading them fails). Program facts come from the PESO requirements list. They have no photo, so
// they render on the plain band.
const FALLBACK_SLIDES: LandingHeroSlide[] = [
  {
    id: 'agsurjobs',
    eyebrow: 'PESO Agusan del Sur',
    title: 'Find work close to home in Agusan del Sur',
    description: 'Browse vacancies from local employers, apply online, and track every application in one place.',
    backgroundImage: null,
    backgroundType: 'image',
    imageAlt: '',
    hasText: true,
    primary: { label: 'Create an account', to: { name: 'signup' } },
    secondary: { label: 'See vacancies', href: '#jobs' },
  },
  {
    id: 'spes',
    eyebrow: 'Special Program for Employment of Students',
    title: 'Earn during your school break with SPES',
    description: 'For students aged 15 to 30 who live in Agusan del Sur and come from low-income families.',
    backgroundImage: null,
    backgroundType: 'image',
    imageAlt: '',
    hasText: true,
    primary: { label: 'Apply for SPES', to: { name: 'signup' } },
    secondary: { label: 'View requirements', href: '#program-spes' },
  },
  {
    id: 'gip',
    eyebrow: 'Government Internship Program',
    title: 'Start your career in public service through GIP',
    description: 'Open to 18 to 30 year olds who finished at least high school or a tech-voc course.',
    backgroundImage: null,
    backgroundType: 'image',
    imageAlt: '',
    hasText: true,
    primary: { label: 'Apply for GIP', to: { name: 'signup' } },
    secondary: { label: 'View requirements', href: '#program-gip' },
  },
  {
    id: 'fnplp',
    eyebrow: 'OFW Fly Now Pay Later Plan',
    title: 'Fly now and pay later for your overseas job',
    description: 'Financing for OFWs with an employment contract and working visa, backed by two co-makers.',
    backgroundImage: null,
    backgroundType: 'image',
    imageAlt: '',
    hasText: true,
    primary: { label: 'Apply for FNPLP', to: { name: 'signup' } },
    secondary: { label: 'View requirements', href: '#program-fly-now-pay-later' },
  },
]

const AUTOPLAY_DELAY = 6000

export function useLandingHero() {
  const store = useSiteContentStore()
  const { heroSlides, isHeroLoaded } = storeToRefs(store)

  // The carousel mounts once loading settles, so it never swaps slides under the visitor
  const isLoading = computed(() => !isHeroLoaded.value)
  const slides = computed(() => (heroSlides.value.length ? heroSlides.value : FALLBACK_SLIDES))
  const hasMultipleSlides = computed(() => slides.value.length > 1)

  const api = shallowRef<CarouselApi>()
  const selectedIndex = ref(0)
  const reducedMotion = usePreferredReducedMotion()

  // Autoplay stays off for reduced motion and pauses while the carousel is hovered or focused
  const { pause, resume } = useIntervalFn(() => api.value?.scrollNext(), AUTOPLAY_DELAY, { immediate: false })
  const canAutoplay = () => reducedMotion.value !== 'reduce' && hasMultipleSlides.value

  // Background videos: muted and looped; only the slide on screen plays, so the others don't
  // download and decode in the background. Nothing plays for visitors who prefer reduced motion.
  const videos = new Map<number, HTMLVideoElement>()

  function syncVideos() {
    videos.forEach((video, index) => {
      if (index === selectedIndex.value && reducedMotion.value !== 'reduce') {
        // Rejected when the browser blocks autoplay anyway; the first frame stays as a still
        video.play().catch(() => {})
      } else {
        video.pause()
      }
    })
  }

  /** Template ref for a slide's <video>: registers it so the active slide's video plays. */
  function registerVideo(index: number) {
    return (el: unknown) => {
      if (el instanceof HTMLVideoElement) {
        // Set as a property too: some browsers only allow muted autoplay when it's set before play()
        el.muted = true
        videos.set(index, el)
        syncVideos()
      } else {
        videos.delete(index)
      }
    }
  }

  // Slides keep their own height (a media-only slide is as tall as its photo / video at the current
  // width), and the band takes the active slide's height. Re-measured whenever a slide resizes, e.g.
  // when its photo / video finishes loading or the screen rotates.
  const activeSlideHeight = ref<number | null>(null)
  let slideObserver: ResizeObserver | null = null

  function syncHeight() {
    const node = api.value?.slideNodes()[selectedIndex.value]
    activeSlideHeight.value = node ? node.offsetHeight : null
  }

  const contentStyle = computed(() => (activeSlideHeight.value ? { height: `${activeSlideHeight.value}px` } : undefined))

  function observeSlides(value: NonNullable<CarouselApi>) {
    slideObserver?.disconnect()
    slideObserver = new ResizeObserver(syncHeight)
    value.slideNodes().forEach(node => slideObserver!.observe(node))
    syncHeight()
  }

  function setApi(value: CarouselApi) {
    api.value = value
  }

  function scrollTo(index: number) {
    api.value?.scrollTo(index)
  }

  function pauseAutoplay() {
    pause()
  }

  function resumeAutoplay() {
    if (canAutoplay()) resume()
  }

  watch(api, value => {
    if (!value) return
    selectedIndex.value = value.selectedScrollSnap()
    value.on('select', () => {
      selectedIndex.value = value.selectedScrollSnap()
    })
    value.on('reInit', () => observeSlides(value))
    observeSlides(value)
  })

  watch([selectedIndex, reducedMotion], syncVideos)
  watch(selectedIndex, syncHeight)

  watch([reducedMotion, hasMultipleSlides], () => {
    if (canAutoplay()) resume()
    else pause()
  })

  onMounted(() => {
    store.loadHeroSlides()
    resumeAutoplay()
  })

  onUnmounted(() => {
    slideObserver?.disconnect()
    slideObserver = null
  })

  // Rise-in for the office name; reduced motion keeps a plain fade
  const isIntroDone = useLandingIntroDone()
  const officeNameFrom = computed(() => (reducedMotion.value === 'reduce' ? { opacity: 0 } : { opacity: 0, y: 40 }))
  const officeNameTo = computed(() => (reducedMotion.value === 'reduce' ? { opacity: 1 } : { opacity: 1, y: 0 }))

  return {
    officeName: OFFICE_NAME,
    isIntroDone,
    officeNameFrom,
    officeNameTo,
    slides,
    isLoading,
    hasMultipleSlides,
    selectedIndex,
    registerVideo,
    contentStyle,
    setApi,
    scrollTo,
    pauseAutoplay,
    resumeAutoplay,
  }
}
