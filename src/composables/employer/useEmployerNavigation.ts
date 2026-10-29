import { computed, ref } from 'vue'
import type { Component } from 'vue'
import { useRoute } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import { useColorMode } from '@vueuse/core'
import { Mail, Phone, Search, ShieldCheck, Star, UserRoundCog } from '@lucide/vue'
import { useAuth } from '@/composables/common/useAuth'
import { useAuthStore } from '@/stores/common/auth'
import { useProfileMedia } from '@/composables/applicant/useProfileMedia'

export interface EmployerNavChild {
  title: string
  /** Omitted when the page doesn't exist yet; the item renders disabled as "Coming soon" */
  to?: RouteLocationRaw & { name: string }
}

/** Account-menu link; always points at a route */
export interface EmployerMenuLink {
  title: string
  to: RouteLocationRaw & { name: string }
  icon: Component
}

export interface EmployerNavItem {
  title: string
  to?: RouteLocationRaw & { name: string }
  children?: EmployerNavChild[]
}

// Same sections the employer sidebar had. Chats has no page yet and points at the dashboard
const navItems: EmployerNavItem[] = [
  { title: 'Dashboard', to: { name: 'employer-dashboard' } },
  {
    title: 'Company',
    children: [
      { title: 'Company Profile', to: { name: 'company-profile' } },
      { title: 'Team' },
    ],
  },
  {
    title: 'Jobs',
    children: [
      { title: 'Job Posts', to: { name: 'job-postings' } },
      { title: 'Applicants', to: { name: 'job-applicants' } },
      { title: 'Interviews' },
    ],
  },
  { title: 'Chats', to: { name: 'employer-dashboard' } },
]

// Until the establishment (NSRP Form 2) is registered the router guard only allows the complete-profile page, so Home is the only item
const incompleteNavItems: EmployerNavItem[] = [{ title: 'Home', to: { name: 'employer-complete-profile' } }]

// Same items in the shape GoeyNav.vue renders (desktop nav)
const toGooeyNavItems = (items: EmployerNavItem[]) =>
  items.map(item => ({
    label: item.title,
    to: item.to,
    children: item.children?.map(child => ({ label: child.title, to: child.to })),
  }))

// Support pages don't exist yet; they point at the dashboard for now
const supportItems: EmployerMenuLink[] = [
  { title: 'Help Center & FAQ', to: { name: 'employer-dashboard' }, icon: Search },
  { title: 'Submit a Ticket', to: { name: 'employer-dashboard' }, icon: Mail },
  { title: 'Live Chat', to: { name: 'employer-dashboard' }, icon: Phone },
  { title: 'Feedbacks', to: { name: 'employer-dashboard' }, icon: Star },
]
const settingsItems: EmployerMenuLink[] = [
  { title: 'Company Settings', to: { name: 'company-profile' }, icon: UserRoundCog },
  { title: 'Privacy & My Data', to: { name: 'employer-privacy-center' }, icon: ShieldCheck },
]

/** State and actions for the employer top navigation (EmployerHeader.vue). */
export function useEmployerNavigation() {
  const route = useRoute()
  const mode = useColorMode()
  const mobileOpen = ref(false)

  const { displayName, userInitials, userEmail, isVerified, isLoading, handleSignOut } = useAuth()
  const { createAvatarSource, profileMedia } = useProfileMedia()
  const { avatarSrc } = createAvatarSource(displayName, profileMedia)

  const authStore = useAuthStore()

  const isDark = computed(() => mode.value === 'dark')

  const visibleNavItems = computed(() => (authStore.isEmployerProfileComplete ? navItems : incompleteNavItems))
  const gooeyNavItems = computed(() => toGooeyNavItems(visibleNavItems.value))
  const accountRoute: RouteLocationRaw = { name: 'company-profile' }

  // Computed once per route change instead of re-scanning every nav item on each render
  const activeTitles = computed(() => {
    const name = route.name
    return new Set(
      visibleNavItems.value
        .filter(item => (item.to ? item.to.name === name : item.children?.some(child => child.to?.name === name)))
        .map(item => item.title)
    )
  })

  // -1 on pages outside the main nav (notifications, privacy) so GoeyNav hides its pill
  const activeNavIndex = computed(() => visibleNavItems.value.findIndex(item => activeTitles.value.has(item.title)))

  function isActive(item: EmployerNavItem) {
    return activeTitles.value.has(item.title)
  }

  function isCurrentRoute(link: EmployerNavChild) {
    return !!link.to && route.name === link.to.name
  }

  function toggleTheme() {
    mode.value = isDark.value ? 'light' : 'dark'
  }

  function closeMobileMenu() {
    mobileOpen.value = false
  }

  return {
    navItems: visibleNavItems,
    gooeyNavItems,
    activeNavIndex,
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
