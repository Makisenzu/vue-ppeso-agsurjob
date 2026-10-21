import { computed, onMounted, ref } from 'vue'
import type { Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import { useColorMode } from '@vueuse/core'
import {
  Bell,
  Bookmark,
  Briefcase,
  Building,
  GraduationCap,
  Hammer,
  Inbox,
  Mail,
  MessageCircle,
  Phone,
  Search,
  Settings,
  Star,
  UserRoundCog,
} from '@lucide/vue'
import { useAuth } from '@/composables/common/useAuth'
import { useProfileMedia } from '@/composables/applicant/useProfileMedia'

export interface ApplicantNavChild {
  title: string
  /** Omitted when the page doesn't exist yet; the item renders disabled as "Coming soon" */
  to?: RouteLocationRaw & { name: string }
  icon: Component
}

/** Account-menu link; always points at a route */
export type ApplicantMenuLink = ApplicantNavChild & Required<Pick<ApplicantNavChild, 'to'>>

export interface ApplicantNavItem {
  title: string
  to?: RouteLocationRaw & { name: string }
  children?: ApplicantNavChild[]
}

const navItems: ApplicantNavItem[] = [
  { title: 'Home', to: { name: 'home' } },
  { title: 'Dashboard', to: { name: 'dashboard' } },
  {
    title: 'Job Search',
    children: [
      { title: 'Vacancies', to: { name: 'vacancies' }, icon: Search },
      { title: 'Saved Jobs', to: { name: 'saved-job' }, icon: Bookmark },
      { title: 'Companies', to: { name: 'company' }, icon: Building },
    ],
  },
  {
    title: 'Gov. Programs',
    children: [
      { title: 'SPES', to: { name: 'spes-application' }, icon: GraduationCap },
      { title: 'TUPAD', to: { name: 'tupad-application' }, icon: Hammer },
      // No applicant GIP page yet
      { title: 'GIP', icon: Briefcase },
    ],
  },
  {
    title: 'My Activities',
    children: [
      { title: 'Job Applications', to: { name: 'application' }, icon: Inbox },
      { title: 'Interviews', to: { name: 'interview' }, icon: Phone },
      { title: 'Chats', to: { name: 'chat' }, icon: MessageCircle },
      { title: 'Offers', to: { name: 'offer' }, icon: Mail },
    ],
  },
]

// Support and settings pages don't exist yet; they point at the dashboard like the old sidebar did
const supportItems: ApplicantMenuLink[] = [
  { title: 'Help Center & FAQ', to: { name: 'dashboard' }, icon: Search },
  { title: 'Submit a Ticket', to: { name: 'dashboard' }, icon: Mail },
  { title: 'Live Chat', to: { name: 'dashboard' }, icon: Phone },
  { title: 'Feedbacks', to: { name: 'dashboard' }, icon: Star },
]
const settingsItems: ApplicantMenuLink[] = [
  { title: 'Profile Settings', to: { name: 'dashboard' }, icon: UserRoundCog },
  { title: 'Account Security', to: { name: 'dashboard' }, icon: Settings },
  { title: 'Notification Preferences', to: { name: 'dashboard' }, icon: Bell },
]

/** State and actions for the applicant top navigation (ApplicantHeader.vue). */
export function useApplicantNavigation() {
  const route = useRoute()
  const mode = useColorMode()
  const mobileOpen = ref(false)

  const { displayName, userInitials, userEmail, isVerified, isLoading, handleSignOut, profileUsername } = useAuth()
  const { createAvatarSource, profileMedia } = useProfileMedia()
  const { avatarSrc } = createAvatarSource(displayName, profileMedia)

  const isDark = computed(() => mode.value === 'dark')

  const accountRoute = computed<RouteLocationRaw>(() =>
    profileUsername.value ? { name: 'profile', params: { username: profileUsername.value } } : { name: 'dashboard' }
  )

  // Computed once per route change instead of re-scanning every nav item on each render
  const activeTitles = computed(() => {
    const name = route.name
    return new Set(
      navItems
        .filter(item => (item.to ? item.to.name === name : item.children?.some(child => child.to?.name === name)))
        .map(item => item.title)
    )
  })

  function isActive(item: ApplicantNavItem) {
    return activeTitles.value.has(item.title)
  }

  function isCurrentRoute(link: ApplicantNavChild) {
    return !!link.to && route.name === link.to.name
  }

  function toggleTheme() {
    mode.value = isDark.value ? 'light' : 'dark'
  }

  function closeMobileMenu() {
    mobileOpen.value = false
  }

  return {
    navItems,
    supportItems,
    settingsItems,
    mobileOpen,
    isDark,
    displayName,
    userInitials,
    userEmail,
    isVerified,
    isLoading,
    avatarSrc,
    accountRoute,
    isActive,
    isCurrentRoute,
    toggleTheme,
    closeMobileMenu,
    handleSignOut,
  }
}

/**
 * Applicant pages are lazy-loaded, so the first visit to each one waits on a chunk download.
 * Warm those chunks once the browser is idle so navigation feels instant.
 * Skipped when the user has Data Saver on.
 */
export function usePrefetchApplicantPages() {
  const router = useRouter()

  function prefetchApplicantPages() {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    if (connection?.saveData) return

    for (const record of router.getRoutes()) {
      if (!record.path.startsWith('/app/')) continue
      const loader = record.components?.default
      if (typeof loader !== 'function') continue
      try {
        const result = (loader as () => unknown)()
        if (result instanceof Promise) result.catch(() => {})
      } catch {
        // not a lazy loader; nothing to prefetch
      }
    }
  }

  onMounted(() => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(prefetchApplicantPages, { timeout: 4000 })
    else setTimeout(prefetchApplicantPages, 2000)
  })
}
