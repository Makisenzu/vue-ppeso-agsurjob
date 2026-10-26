import type { RouteLocationRaw } from 'vue-router'
import type { Database } from '@/types/database.types'

type SystemSchema = Database['system']

/** PESO-managed public page content from migration 046. */
export type SiteContentRow = SystemSchema['Tables']['site_contents']['Row']
export type SiteContentInsert = SystemSchema['Tables']['site_contents']['Insert']
export type SiteContentUpdate = SystemSchema['Tables']['site_contents']['Update']
export type SiteContentPlacement = SystemSchema['Enums']['site_content_placement']
export type SiteContentStatus = SystemSchema['Enums']['announcement_status']
export type SiteContentMediaType = SystemSchema['Enums']['site_content_media_type']

/** What visitors see right now: status plus the publish / expiry window. */
export type SiteContentState = 'Draft' | 'Scheduled' | 'Live' | 'Expired' | 'Archived'

/** A row for the management table, with its background media resolved to a public URL. */
export type SiteContentListItem = SiteContentRow & { image_url: string | null }

export const SITE_CONTENT_MEDIA_BUCKET = 'site-content-media'

// Mirrors the bucket (046, 048) and the link CHECK (046). Videos get the bucket's 50MB limit;
// photos stay small so the landing page loads fast.
export const SITE_CONTENT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const SITE_CONTENT_IMAGE_MAX_MB = 5
export const SITE_CONTENT_VIDEO_TYPES = ['video/mp4', 'video/webm']
export const SITE_CONTENT_VIDEO_MAX_MB = 50
export const SITE_CONTENT_MEDIA_ACCEPT = '.jpg,.jpeg,.png,.webp,.mp4,.webm'
export const SITE_CONTENT_LINK_PATTERN = /^(\/|#|https:\/\/)/

export interface LandingHeroAction {
  label: string
  /** Router navigation; otherwise `href` jumps to a landing section or an external page */
  to?: RouteLocationRaw
  href?: string
  /** External pages open in a new tab */
  external?: boolean
}

export interface LandingHeroSlide {
  id: string
  eyebrow: string
  title: string
  description: string
  /** Uploaded photo or video shown behind the text; slides without one use the plain band */
  backgroundImage: string | null
  /** Videos play muted and looped, and only while their slide is on screen */
  backgroundType: SiteContentMediaType
  imageAlt: string
  /** False for a media-only slide: no text block and no fade over the photo / video */
  hasText: boolean
  primary?: LandingHeroAction
  secondary?: LandingHeroAction
}

// ─── PESO Programs gallery (migration 049) ───
// system.landing_program_cards is not in database.types.ts until `npm run types:gen` is re-run,
// so its row is typed here; switch to the generated types once they include it.

export type LandingProgram = 'tupad' | 'gip' | 'fly_now_pay_later' | 'spes' | 'skills_training'

export interface ProgramCardRow {
  program: LandingProgram
  /** Path in 'site-content-media' at programs/<program>/<filename>; null shows the plain panel */
  image_path: string | null
  updated_by: string | null
  updated_at: string
}

/** A card for the management page, with its photo resolved to a public URL. */
export type ProgramCardItem = ProgramCardRow & { image_url: string | null }

/** Cards of the landing gallery in display order; the table only holds their photos. */
export const LANDING_PROGRAMS: { key: LandingProgram; label: string; name: string }[] = [
  { key: 'tupad', label: 'TUPAD', name: 'Tulong Panghanapbuhay sa Ating Disadvantaged/Displaced Workers' },
  { key: 'gip', label: 'Government Internship Program (GIP)', name: 'Government Internship Program' },
  { key: 'fly_now_pay_later', label: 'Fly Now Pay Later', name: 'OFW Fly Now Pay Later Plan' },
  { key: 'spes', label: 'SPES', name: 'Special Program for Employment of Students' },
  { key: 'skills_training', label: 'Skills Training', name: 'Skills Training' },
]

// ─── Municipality logos (migration 050) ───
// system.landing_municipality_logos is not in database.types.ts until `npm run types:gen` is re-run,
// so its row is typed here; switch to the generated types once they include it.

export type AgsurMunicipality =
  | 'bayugan'
  | 'bunawan'
  | 'esperanza'
  | 'la_paz'
  | 'loreto'
  | 'prosperidad'
  | 'rosario'
  | 'san_francisco'
  | 'san_luis'
  | 'santa_josefa'
  | 'sibagat'
  | 'talacogon'
  | 'trento'
  | 'veruela'

export interface MunicipalityLogoRow {
  municipality: AgsurMunicipality
  /** Path in 'site-content-media' at municipalities/<municipality>/<filename>; null shows the province seal */
  image_path: string | null
  updated_by: string | null
  updated_at: string
}

/** A logo for the management page, resolved to a public URL. */
export type MunicipalityLogoItem = MunicipalityLogoRow & { image_url: string | null }

// ─── PESO achievements (migration 059) ───
// system.peso_achievements is not in database.types.ts until `npm run types:gen` is re-run.

export interface AchievementRow {
  id: string
  /** Path in 'site-content-media' at achievements/<filename> */
  image_path: string
  /** e.g. "Best PESO in Caraga, 2025" */
  title: string | null
  /** The photo's own pixel size, read at upload, so the masonry keeps its aspect ratio */
  width: number | null
  height: number | null
  created_by: string | null
  created_at: string
}

export type AchievementInsert = Pick<AchievementRow, 'image_path' | 'title' | 'width' | 'height'>

/** An achievement resolved to its photo's public URL. */
export type AchievementItem = AchievementRow & { image_url: string }

/** Photos uploaded in one go from Site Contents → Achievements */
export const ACHIEVEMENT_MAX_FILES_PER_UPLOAD = 20

/** The province's 13 municipalities and 1 city, the city first, then A to Z; the table only holds their logos. */
export const LANDING_MUNICIPALITIES: { key: AgsurMunicipality; name: string; isCity: boolean }[] = [
  { key: 'bayugan', name: 'Bayugan', isCity: true },
  { key: 'bunawan', name: 'Bunawan', isCity: false },
  { key: 'esperanza', name: 'Esperanza', isCity: false },
  { key: 'la_paz', name: 'La Paz', isCity: false },
  { key: 'loreto', name: 'Loreto', isCity: false },
  { key: 'prosperidad', name: 'Prosperidad', isCity: false },
  { key: 'rosario', name: 'Rosario', isCity: false },
  { key: 'san_francisco', name: 'San Francisco', isCity: false },
  { key: 'san_luis', name: 'San Luis', isCity: false },
  { key: 'santa_josefa', name: 'Santa Josefa', isCity: false },
  { key: 'sibagat', name: 'Sibagat', isCity: false },
  { key: 'talacogon', name: 'Talacogon', isCity: false },
  { key: 'trento', name: 'Trento', isCity: false },
  { key: 'veruela', name: 'Veruela', isCity: false },
]

// ─── Public page heroes (migration 051) ───
// system.public_page_heroes is not in database.types.ts until `npm run types:gen` is re-run,
// so its row is typed here; switch to the generated types once they include it.

export type PublicPage = 'what_is_peso'

export interface PageHeroRow {
  page: PublicPage
  /** Empty text falls back to the page's built-in text (PUBLIC_PAGES) */
  eyebrow: string | null
  title: string | null
  description: string | null
  /** Path in 'site-content-media' at pages/<page>/<filename>; null shows the plain band */
  image_path: string | null
  image_alt: string | null
  updated_by: string | null
  updated_at: string
}

/** A hero for the management page, with its photo resolved to a public URL. */
export type PageHeroItem = PageHeroRow & { image_url: string | null }

/** What the public page renders: saved text over the built-in text, and the photo's public URL. */
export interface PageHero {
  eyebrow: string
  title: string
  description: string
  backgroundImage: string | null
  imageAlt: string
}

export type PageHeroText = Pick<PageHero, 'eyebrow' | 'title' | 'description'>

// Mirrors the column CHECKs in 051
export const PAGE_HERO_LIMITS = { eyebrow: 80, title: 120, description: 300, imageAlt: 200 }

/** Public pages with a hero; the table only holds what PESO changed, these are the built-in texts. */
export const PUBLIC_PAGES: { key: PublicPage; name: string; path: string; defaults: PageHeroText }[] = [
  {
    key: 'what_is_peso',
    name: 'What is PESO?',
    path: '/what-is-peso',
    defaults: {
      eyebrow: 'Provincial PESO Agusan del Sur',
      title: 'What is PESO?',
      description: 'Free employment services for every Agsurnon, from a first job to the next one.',
    },
  },
]

// ─── Organizational chart (migration 052) ───
// system.org_chart_units / org_chart_positions are not in database.types.ts until `npm run types:gen`
// is re-run, so their rows are typed here; switch to the generated types once they include them.

/** The office's legend; a position without a holder shows as vacant instead */
export type OrgEmploymentStatus = 'elected' | 'permanent' | 'casual' | 'job_order'

export interface OrgChartUnitRow {
  id: string
  name: string
  abbreviation: string | null
  sort_order: number
  created_at: string
  updated_by: string | null
  updated_at: string
}

export interface OrgChartPositionRow {
  id: string
  /** Null: top of the chart (Governor, PESO Manager) */
  unit_id: string | null
  title: string
  /** Null: vacant */
  holder_name: string | null
  employment_status: OrgEmploymentStatus
  /** The unit's head, or the office head at the top */
  is_head: boolean
  /** Path in 'site-content-media' at org-chart/<id>/<filename> */
  photo_path: string | null
  sort_order: number
  created_at: string
  updated_by: string | null
  updated_at: string
}

export type OrgChartUnitInsert = Pick<OrgChartUnitRow, 'name' | 'abbreviation' | 'sort_order'>
export type OrgChartPositionInsert = Pick<
  OrgChartPositionRow,
  'unit_id' | 'title' | 'holder_name' | 'employment_status' | 'is_head' | 'sort_order'
>

/** A position for the management page, with its photo resolved to a public URL. */
export type OrgChartPositionItem = OrgChartPositionRow & { photo_url: string | null }

export type OrgChartStatus = OrgEmploymentStatus | 'vacant'

/** One card of the public chart. */
export interface OrgChartPerson {
  id: string
  /** Null for a vacant position */
  name: string | null
  position: string
  status: OrgChartStatus
  photo: string | null
  /** Avatar fallback; empty for a vacant position, which shows a person icon */
  initials: string
  isHead: boolean
}

export interface OrgChartUnit {
  id: string
  name: string
  abbreviation: string | null
  /** Null when no position of the unit is marked as its head */
  head: OrgChartPerson | null
  members: OrgChartPerson[]
}

export interface OrgChart {
  /** Positions above the divisions, top first (Governor, then the PESO Manager) */
  top: OrgChartPerson[]
  units: OrgChartUnit[]
}

export const ORG_EMPLOYMENT_STATUS_LABELS: Record<OrgEmploymentStatus, string> = {
  elected: 'Coterminous / Elected',
  permanent: 'Permanent',
  casual: 'Casual',
  job_order: 'Job order',
}

// Mirror the column CHECKs in 052
export const ORG_CHART_LIMITS = { unitName: 120, abbreviation: 20, title: 200, holderName: 120 }
