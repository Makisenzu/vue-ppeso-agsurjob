import { computed, ref } from 'vue'
import { useRoute, type RouteLocationRaw } from 'vue-router'
import { useColorMode } from '@vueuse/core'
import { useAuthStore } from '@/stores/common/auth'

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
  // Top of the landing page (the hero); from other public pages it leads back there
  { label: 'Home', href: '#main' },
  {
    label: 'About',
    href: '#about',
    children: [
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
      { label: 'GIP', to: { name: 'gip' } },
    ],
  },
]

/**
 * On the landing page, section anchors stay plain hash links (clicking one again re-scrolls to it).
 * On other public pages they become router links back to that section of the landing page.
 * Signed-in applicants get the same sections on their home page ("/" would redirect them there and drop the hash).
 */
export function useLandingLinks() {
  const route = useRoute()
  const authStore = useAuthStore()
  const sectionsRoute = computed(() => (authStore.isAuthenticated && authStore.userRole === 'applicant' ? 'home' : 'landing'))
  const onSectionsPage = computed(() => route.name === sectionsRoute.value)

  function resolve<T extends LandingLinkTarget>(link: T): T {
    if (onSectionsPage.value || !link.href?.startsWith('#')) return link
    return { ...link, href: undefined, to: { name: sectionsRoute.value, hash: link.href } }
  }

  const links = computed(() =>
    navLinks.map((link) => ({ ...resolve(link), children: link.children?.map(resolve) })),
  )

  return { links, resolve }
}

export function useLandingNavigation() {
  const mode = useColorMode()
  const mobileOpen = ref(false)
  const route = useRoute()
  const { links } = useLandingLinks()
  const authStore = useAuthStore()

  // Signed-in users see a Dashboard button instead of Log in / Sign up
  const isSignedIn = computed(() => authStore.isAuthenticated)

  // Nav item highlighted on load: Home on the landing page, otherwise the item whose dropdown holds the page
  const activeNavIndex = computed(() => {
    const index = navLinks.findIndex((link) =>
      link.children?.some((child) => typeof child.to === 'object' && 'name' in child.to && child.to.name === route.name),
    )
    return Math.max(index, 0)
  })

  const isDark = computed(() => mode.value === 'dark')

  function toggleTheme() {
    mode.value = isDark.value ? 'light' : 'dark'
  }

  function closeMobileMenu() {
    mobileOpen.value = false
  }

  return {
    navLinks: links,
    activeNavIndex,
    mobileOpen,
    isDark,
    isSignedIn,
    toggleTheme,
    closeMobileMenu,
  }
}
