import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { BookMarked, FileText, GraduationCap, Hammer, NotebookPen, UserRoundPen } from '@lucide/vue'
import gipLogo from '@/assets/images/gip.png'
import tupadLogo from '@/assets/images/tupadLogo.png'

/**
 * Applicant program portals: each PESO program gets its own section of the applicant side with its own
 * sidebar (ProgramPortalLayout.vue + ProgramPortalSidebar.vue). A portal is just an entry here plus a
 * route group whose parent record sets `meta.program` to the key. See DESIGN.md §7.1 to add a program.
 */
export type ProgramPortalKey = 'gip' | 'tupad' | 'spes'

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
    // Not yet an intern (no appointment): only My Application. The program's overview and requirements stay on
    // its page (the sidebar header links there), so they are not repeated here
    items: [
      { title: 'My Application', to: { name: 'gip-my-application' }, icon: FileText },
      { title: 'Accomplishments', to: { name: 'gip-accomplishments' }, icon: NotebookPen, requiresEnrollment: true },
    ],
  },
  tupad: {
    key: 'tupad',
    shortTitle: 'TUPAD',
    title: 'Tulong Panghanapbuhay sa Ating Disadvantaged/Displaced Workers',
    icon: Hammer,
    logo: tupadLogo,
    home: { name: 'tupad-application' },
    // The overview and requirements stay on the program's page (the sidebar header links there)
    items: [
      { title: 'My Application', to: { name: 'tupad-my-application' }, icon: FileText },
    ],
  },
  spes: {
    key: 'spes',
    shortTitle: 'SPES',
    title: 'Special Program for Employment of Students',
    // No SPES logo in src/assets/images yet: add `logo` here once there is one
    icon: BookMarked,
    home: { name: 'spes-application' },
    // Not yet appointed: only My Application ("Edit details" on it still opens My SPES Details). The overview and
    // requirements stay on the program's page (the sidebar header links there)
    items: [
      { title: 'My Application', to: { name: 'spes-my-application' }, icon: FileText },
      { title: 'My SPES Details', to: { name: 'spes-details' }, icon: UserRoundPen, requiresEnrollment: true },
    ],
  },
}

export function isProgramPortalKey(value: unknown): value is ProgramPortalKey {
  return typeof value === 'string' && value in PROGRAM_PORTALS
}
