import { computed, ref } from 'vue'
import { useRoute, type RouteLocationRaw } from 'vue-router'
import { useColorMode } from '@vueuse/core'

/** A section anchor on the landing page (`href`) or a separate public page (`to`) */
export interface LandingLinkTarget {
  href?: string
  to?: RouteLocationRaw
}

export interface LandingNavChild extends LandingLinkTarget {
  label: string
}

export interface LandingNavLink extends LandingNavChild {
  children?: LandingNavChild[]
}

// Hash anchors point to landing page sections; `to` links open their own page
export const navLinks: LandingNavLink[] = [
  {
    label: 'About',
    href: '#about',
    children: [
      { label: 'History of Agusan del Sur', href: '#about-mission' },
      { label: 'What is PESO?', to: { name: 'what-is-peso' } },
    ],
  },
  { label: 'Announcements', href: '#contact' },
  { label: 'Vacancies', href: '#jobs' },
  {
    label: 'PESO Programs',
    href: '#programs',
    children: [
      { label: 'Fly Now Pay Later Program', href: '#program-fly-now-pay-later' },
      { label: 'Skills Training', href: '#program-skills-training' },
      { label: 'TUPAD', href: '#program-tupad' },
      { label: 'SPES', href: '#program-spes' },
      { label: 'GIP', href: '#program-gip' },
    ],
  },
]

/**
 * On the landing page, section anchors stay plain hash links (clicking one again re-scrolls to it).
 * On other public pages they become router links back to that section of the landing page.
 */
export function useLandingLinks() {
  const route = useRoute()
  const onLanding = computed(() => route.name === 'landing')

  function resolve<T extends LandingLinkTarget>(link: T): T {
    if (onLanding.value || !link.href?.startsWith('#')) return link
    return { ...link, href: undefined, to: { name: 'landing', hash: link.href } }
  }

  const links = computed(() =>
    navLinks.map((link) => ({ ...resolve(link), children: link.children?.map(resolve) })),
  )

  return { links, resolve }
}

export function useLandingNavigation() {
  const mode = useColorMode()
  const mobileOpen = ref(false)
  const { links } = useLandingLinks()

  const isDark = computed(() => mode.value === 'dark')

  function toggleTheme() {
    mode.value = isDark.value ? 'light' : 'dark'
  }

  function closeMobileMenu() {
    mobileOpen.value = false
  }

  return {
    navLinks: links,
    mobileOpen,
    isDark,
    toggleTheme,
    closeMobileMenu,
  }
}
