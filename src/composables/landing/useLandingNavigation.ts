import { computed, ref } from 'vue'
import { useColorMode } from '@vueuse/core'

export interface LandingNavLink {
  label: string
  href: string
  children?: { label: string; href: string }[]
}

// Anchors point to landing page sections (to be added below the header)
const navLinks: LandingNavLink[] = [
  {
    label: 'About',
    href: '#about',
    children: [
      { label: 'History of Agusan del Sur', href: '#about-mission' },
      { label: 'What is PESO?', href: '#about' },
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

export function useLandingNavigation() {
  const mode = useColorMode()
  const mobileOpen = ref(false)

  const isDark = computed(() => mode.value === 'dark')

  function toggleTheme() {
    mode.value = isDark.value ? 'light' : 'dark'
  }

  function closeMobileMenu() {
    mobileOpen.value = false
  }

  return {
    navLinks,
    mobileOpen,
    isDark,
    toggleTheme,
    closeMobileMenu,
  }
}
