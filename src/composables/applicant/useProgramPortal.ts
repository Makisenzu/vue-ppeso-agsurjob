import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import { useColorMode } from '@vueuse/core'
import { useSidebar } from '@/components/ui/sidebar'
import { useAuth } from '@/composables/common/useAuth'
import { useProfileMedia } from '@/composables/applicant/useProfileMedia'
import { useGipApplicationStore } from '@/stores/applicant/gipApplicationStore'
import {
  PROGRAM_PORTALS,
  isProgramPortalKey,
} from '@/helpers/applicant/programPortalHelper'
import type { ProgramPortalConfig, ProgramPortalKey, ProgramPortalLink } from '@/helpers/applicant/programPortalHelper'

/** The portal of the current route: the deepest matched record that sets `meta.program` */
function useCurrentProgram() {
  const route = useRoute()
  return computed<ProgramPortalConfig | null>(() => {
    const key = [...route.matched].reverse().find((record) => record.meta.program)?.meta.program
    return isProgramPortalKey(key) ? PROGRAM_PORTALS[key] : null
  })
}

/** Shell of a program portal (ProgramPortalLayout.vue): theme toggle and edge-to-edge pages */
export function useProgramPortalLayout() {
  const route = useRoute()
  const mode = useColorMode()

  const isDark = computed(() => mode.value === 'dark')
  // Overview pages bring their own full-bleed hero and section padding
  const isFullWidth = computed(() => !!route.meta.fullWidth)

  function toggleTheme() {
    mode.value = isDark.value ? 'light' : 'dark'
  }

  return { program: useCurrentProgram(), isDark, isFullWidth, toggleTheme }
}

/** Sidebar of a program portal (ProgramPortalSidebar.vue); call inside the SidebarProvider */
export function useProgramPortalSidebar() {
  const route = useRoute()
  const { state, isMobile, setOpenMobile } = useSidebar()
  const { displayName, userInitials, userEmail, isVerified, isLoading, handleSignOut, profileUsername } = useAuth()
  const { createAvatarSource, profileMedia } = useProfileMedia()
  const { avatarSrc } = createAvatarSource(displayName, profileMedia)

  const program = useCurrentProgram()

  // Enrollment per program, read from the program's store. Every portal page already loads it
  // (useLandingGip / useGipApplicationForm call fetchMyApplication), so the sidebar fetches nothing
  const { internships: gipInternships } = storeToRefs(useGipApplicationStore())
  const enrollment: Record<ProgramPortalKey, ComputedRef<boolean>> = {
    gip: computed(() => gipInternships.value.some((internship) => internship.appointments.length > 0)),
  }

  /** The program's items this applicant sees: enrolled-only items are hidden until they are enrolled */
  const programItems = computed(() => {
    const current = program.value
    if (!current) return []
    const isEnrolled = enrollment[current.key].value
    return current.items.filter((item) => !item.requiresEnrollment || isEnrolled)
  })

  const accountRoute = computed<RouteLocationRaw>(() =>
    profileUsername.value ? { name: 'profile', params: { username: profileUsername.value } } : { name: 'home' }
  )

  /** Same page and same section: "Overview" and "Requirements" share a route but not a hash */
  function isActive(link: ProgramPortalLink) {
    return route.name === link.to.name && (link.to.hash ?? '') === route.hash
  }

  /** Closes the mobile sheet after a link is picked; on desktop the sidebar stays as it is */
  function collapseSidebar() {
    if (isMobile.value) setOpenMobile(false)
  }

  return {
    program,
    programItems,
    state,
    isMobile,
    displayName,
    userInitials,
    userEmail,
    isVerified,
    isLoading,
    avatarSrc,
    accountRoute,
    isActive,
    collapseSidebar,
    handleSignOut,
  }
}
