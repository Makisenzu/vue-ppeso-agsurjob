import { computed, h, type Component, type FunctionalComponent } from 'vue'
import { Mail } from '@lucide/vue'
import agsurSeal from '@/assets/images/agsur.png'
import pesoLogo from '@/assets/images/pesologo.png'
import doleLogo from '@/assets/images/dole.png'
import doleLogoDark from '@/assets/images/dole-dark.png'
import bagongPilipinasLogo from '@/assets/images/bagongPilipinas.png'
import bagongPilipinasLogoDark from '@/assets/images/bagongPh-dark.png'
import { useLandingLinks, type LandingLinkTarget } from '@/composables/landing/useLandingNavigation'

export interface LandingFooterLink extends LandingLinkTarget {
  label: string
}

export interface LandingFooterLogo {
  src: string
  /** Shown instead of `src` in dark mode, for logos that disappear on a dark background */
  darkSrc?: string
  /** Extra classes for the dark image, for dark variants drawn smaller within their canvas */
  darkClass?: string
  alt: string
}

export interface LandingFooterContact extends LandingFooterLink {
  href: string
  type: string
  icon: Component
}

// Lucide 1.x dropped brand icons, so the Facebook mark is drawn inline (Simple Icons path), sized and
// colored by class like a Lucide icon
const FacebookIcon: FunctionalComponent = () =>
  h('svg', { viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': 'true' }, [
    h('path', {
      d: 'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z',
    }),
  ])

const CONTACTS: LandingFooterContact[] = [
  { type: 'Email', icon: Mail, label: 'peso.agusandelsur13@gmail.com', href: 'mailto:peso.agusandelsur13@gmail.com' },
  { type: 'Facebook', icon: FacebookIcon, label: 'Agusan del Sur PESO', href: 'https://www.facebook.com/ProvincialPESOAgusandelSurPage' },
]

// The province, its PESO, and the national partners behind the programs
const LOGOS: LandingFooterLogo[] = [
  { src: agsurSeal, alt: 'Seal of the Province of Agusan del Sur' },
  { src: pesoLogo, alt: 'Provincial PESO logo' },
  { src: doleLogo, darkSrc: doleLogoDark, darkClass: 'scale-125', alt: 'Department of Labor and Employment logo' },
  { src: bagongPilipinasLogo, darkSrc: bagongPilipinasLogoDark, alt: 'Bagong Pilipinas logo' },
]

/** Landing page footer: brand and partner seals, link columns, and a copyright bar. */
export function useLandingFooter() {
  // Same links as the header: top-level links under "Explore", the PESO Programs dropdown under "Programs"
  const { links } = useLandingLinks()
  const exploreLinks = computed<LandingFooterLink[]>(() => links.value.map(({ label, href, to }) => ({ label, href, to })))
  const programLinks = computed<LandingFooterLink[]>(
    () => links.value.find((link) => link.label === 'PESO Programs')?.children ?? [],
  )

  return {
    office: 'Provincial Public Employment Service Office',
    address: 'Government Center, Patin-ay, Prosperidad, Agusan del Sur',
    contacts: CONTACTS,
    exploreLinks,
    programLinks,
    logos: LOGOS,
    year: new Date().getFullYear(),
  }
}
