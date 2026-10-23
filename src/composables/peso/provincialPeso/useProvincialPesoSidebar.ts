import type { Component } from 'vue'
import { useRoute } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import {
  Blocks,
  BookMarked,
  CalendarDays,
  File,
  GalleryHorizontalEnd,
  Hammer,
  IdCardLanyard,
  Info,
  Leaf,
  Mail,
  MapPinned,
  Phone,
  Plane,
  Search,
  SportShoe,
  SquareLibrary,
  SquareUser,
  Star,
  TrendingUp,
  UserRoundCog,
  UsersRound,
} from '@lucide/vue'
import { useSidebar } from '@/components/ui/sidebar'
import { useAuth } from '@/composables/common/useAuth'

export interface ProvincialPesoSidebarItem {
  title: string
  to: RouteLocationRaw & { name: string }
  icon: Component
}

// Items without a page yet point at the dashboard (or company profile) for now
const sddItems: ProvincialPesoSidebarItem[] = [
  { title: 'Job Start', to: { name: 'provincial-peso-dashboard' }, icon: TrendingUp },
  { title: 'Skills Training', to: { name: 'provincial-peso-dashboard' }, icon: SportShoe },
  { title: 'Free Wellness Services', to: { name: 'provincial-peso-dashboard' }, icon: Leaf },
]
const contactSubItems: ProvincialPesoSidebarItem[] = [
  { title: 'Help Center & FAQ', to: { name: 'provincial-peso-dashboard' }, icon: Search },
  { title: 'Submit a Ticket', to: { name: 'provincial-peso-dashboard' }, icon: Mail },
  { title: 'Live Chat', to: { name: 'provincial-peso-dashboard' }, icon: Phone },
  { title: 'Feedbacks', to: { name: 'provincial-peso-dashboard' }, icon: Star },
]
const settingsSubItems: ProvincialPesoSidebarItem[] = [
  { title: 'Company Settings', to: { name: 'provincial-peso-dashboard' }, icon: UserRoundCog },
]

const employmentItems: ProvincialPesoSidebarItem[] = [
  { title: 'Job Fair', to: { name: 'provincial-peso-job-fair' }, icon: IdCardLanyard },
  { title: 'FNPLP / OFW', to: { name: 'provincial-peso-fnplp' }, icon: Plane },
  { title: 'GIP', to: { name: 'provincial-peso-gip' }, icon: SquareUser },
  { title: 'TUPAD', to: { name: 'provincial-peso-tupad' }, icon: Hammer },
  { title: 'SPES', to: { name: 'provincial-peso-spes' }, icon: BookMarked },
  { title: 'Recruitment Activity', to: { name: 'provincial-peso-recruitment-activity' }, icon: MapPinned },
]

const companyItems: ProvincialPesoSidebarItem[] = [
  { title: 'Events', to: { name: 'company-profile' }, icon: CalendarDays },
  { title: 'Organizational Chart', to: { name: 'company-profile' }, icon: File },
  { title: 'Citizen Charter', to: { name: 'company-profile' }, icon: UsersRound },
  { title: 'Functional Charter', to: { name: 'company-profile' }, icon: Blocks },
  { title: 'Records Charter', to: { name: 'company-profile' }, icon: SquareLibrary },
  { title: 'Where Abouts', to: { name: 'company-profile' }, icon: Info },
  { title: 'Site Contents', to: { name: 'provincial-peso-site-contents' }, icon: GalleryHorizontalEnd },
]

export function useProvincialPesoSidebar() {
  const route = useRoute()
  const { state, isMobile, setOpenMobile } = useSidebar()
  const { displayName, userInitials, userEmail, isVerified, isLoading, handleSignOut } = useAuth()

  function isActive(name: string) {
    return route.name === name
  }

  /** Called when a nav link is clicked: closes the mobile sheet. On desktop the sidebar stays as it is;
   * only its collapse button folds it. */
  function collapseSidebar() {
    if (isMobile.value) setOpenMobile(false)
  }

  return {
    sddItems,
    contactSubItems,
    settingsSubItems,
    employmentItems,
    companyItems,
    state,
    isMobile,
    displayName,
    userInitials,
    userEmail,
    isVerified,
    isLoading,
    isActive,
    collapseSidebar,
    handleSignOut,
  }
}
