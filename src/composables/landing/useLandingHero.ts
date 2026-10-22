import { onMounted, ref, shallowRef, watch } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { useIntervalFn, usePreferredReducedMotion } from '@vueuse/core'
import type { CarouselApi } from '@/components/ui/carousel'
import pesoLogo from '@/assets/images/pesologo.png'
import gipLogo from '@/assets/images/gip.png'
import doleLogo from '@/assets/images/dole.png'
import bagongPilipinasLogo from '@/assets/images/bagongPilipinas.png'

export interface LandingHeroAction {
  label: string
  /** Router navigation; otherwise `href` jumps to a landing section */
  to?: RouteLocationRaw
  href?: string
}

export interface LandingHeroSlide {
  id: string
  eyebrow: string
  title: string
  description: string
  image: string
  imageAlt: string
  primary: LandingHeroAction
  secondary?: LandingHeroAction
}

// Program facts come from the PESO requirements list; swap the logos for program photos once available
const slides: LandingHeroSlide[] = [
  {
    id: 'agsurjobs',
    eyebrow: 'PESO Agusan del Sur',
    title: 'Find work close to home in Agusan del Sur',
    description: 'Browse vacancies from local employers, apply online, and track every application in one place.',
    image: pesoLogo,
    imageAlt: 'PESO Agusan del Sur logo',
    primary: { label: 'Create an account', to: { name: 'signup' } },
    secondary: { label: 'See vacancies', href: '#jobs' },
  },
  {
    id: 'spes',
    eyebrow: 'Special Program for Employment of Students',
    title: 'Earn during your school break with SPES',
    description: 'For students aged 15 to 30 who live in Agusan del Sur and come from low-income families.',
    image: doleLogo,
    imageAlt: 'Department of Labor and Employment logo',
    primary: { label: 'Apply for SPES', to: { name: 'signup' } },
    secondary: { label: 'View requirements', href: '#program-spes' },
  },
  {
    id: 'gip',
    eyebrow: 'Government Internship Program',
    title: 'Start your career in public service through GIP',
    description: 'Open to 18 to 30 year olds who finished at least high school or a tech-voc course.',
    image: gipLogo,
    imageAlt: 'Government Internship Program logo',
    primary: { label: 'Apply for GIP', to: { name: 'signup' } },
    secondary: { label: 'View requirements', href: '#program-gip' },
  },
  {
    id: 'fnplp',
    eyebrow: 'OFW Fly Now Pay Later Plan',
    title: 'Fly now and pay later for your overseas job',
    description: 'Financing for OFWs with an employment contract and working visa, backed by two co-makers.',
    image: bagongPilipinasLogo,
    imageAlt: 'Bagong Pilipinas logo',
    primary: { label: 'Apply for FNPLP', to: { name: 'signup' } },
    secondary: { label: 'View requirements', href: '#program-fly-now-pay-later' },
  },
]

const AUTOPLAY_DELAY = 6000

export function useLandingHero() {
  const api = shallowRef<CarouselApi>()
  const selectedIndex = ref(0)
  const reducedMotion = usePreferredReducedMotion()

  // Autoplay stays off for reduced motion and pauses while the carousel is hovered or focused
  const { pause, resume } = useIntervalFn(() => api.value?.scrollNext(), AUTOPLAY_DELAY, { immediate: false })

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
    if (reducedMotion.value !== 'reduce') resume()
  }

  watch(api, value => {
    if (!value) return
    selectedIndex.value = value.selectedScrollSnap()
    value.on('select', () => {
      selectedIndex.value = value.selectedScrollSnap()
    })
  })

  watch(reducedMotion, value => {
    if (value === 'reduce') pause()
    else resume()
  })

  onMounted(resumeAutoplay)

  return {
    slides,
    selectedIndex,
    setApi,
    scrollTo,
    pauseAutoplay,
    resumeAutoplay,
  }
}
