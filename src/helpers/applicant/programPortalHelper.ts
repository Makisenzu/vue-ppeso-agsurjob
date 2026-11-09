import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { ClipboardList, FileText, GraduationCap, Hammer, Info } from '@lucide/vue'
import gipLogo from '@/assets/images/gip.png'
import tupadLogo from '@/assets/images/tupadLogo.png'

/**
 * Applicant program portals: each PESO program gets its own section of the applicant side with its own
 * sidebar (ProgramPortalLayout.vue + ProgramPortalSidebar.vue). A portal is just an entry here plus a
 * route group whose parent record sets `meta.program` to the key. See DESIGN.md §7.1 to add a program.
 */
export type ProgramPortalKey = 'gip' | 'tupad'

export interface ProgramPortalLink {
  title: string
  /** A `hash` points at a section of the page (e.g. the requirements on the overview) */
  to: RouteLocationRaw & { name: string; hash?: string }
  icon: Component
  /**
   * Shown only to applicants enrolled in the program (useProgramPortal.ts decides per program;
   * GIP: has an appointment). Everyone else sees only the always-on items, e.g. My Application.
   */
  requiresEnrollment?: boolean
}

export interface ProgramPortalConfig {
  key: ProgramPortalKey
  /** Sidebar header and collapsed tooltip, e.g. "GIP" */
  shortTitle: string
  title: string
  /** Shown when the program has no logo */
  icon: Component
  /** Program logo in the sidebar header (src/assets/images) */
  logo?: string
  /** A round seal with white margins (GIP): cropped to a circle; other logos show whole */
  isSealLogo?: boolean
  /** The sidebar header links here: the program's page, which lives in the applicant layout */
  home: RouteLocationRaw & { name: string }
  /** The program's own pages, in sidebar order */
  items: ProgramPortalLink[]
}

export const PROGRAM_PORTALS: Record<ProgramPortalKey, ProgramPortalConfig> = {
  gip: {
    key: 'gip',
    shortTitle: 'GIP',
    title: 'Government Internship Program',
    icon: GraduationCap,
    logo: gipLogo,
    isSealLogo: true,
    home: { name: 'gip-application' },
    // Not yet an intern (no appointment): only My Application
    items: [
      { title: 'Overview', to: { name: 'gip-application' }, icon: Info, requiresEnrollment: true },
      { title: 'Requirements', to: { name: 'gip-application', hash: '#gip-requirements' }, icon: ClipboardList, requiresEnrollment: true },
      { title: 'My Application', to: { name: 'gip-my-application' }, icon: FileText },
    ],
  },
  tupad: {
    key: 'tupad',
    shortTitle: 'TUPAD',
    title: 'Tulong Panghanapbuhay sa Ating Disadvantaged/Displaced Workers',
    icon: Hammer,
    logo: tupadLogo,
    home: { name: 'tupad-application' },
    // Not yet a beneficiary (in no batch): only My Application
    items: [
      { title: 'Overview', to: { name: 'tupad-application' }, icon: Info, requiresEnrollment: true },
      { title: 'Requirements', to: { name: 'tupad-application', hash: '#tupad-requirements' }, icon: ClipboardList, requiresEnrollment: true },
      { title: 'My Application', to: { name: 'tupad-my-application' }, icon: FileText },
    ],
  },
}

export function isProgramPortalKey(value: unknown): value is ProgramPortalKey {
  return typeof value === 'string' && value in PROGRAM_PORTALS
}
