import type { RouteLocationRaw } from 'vue-router'
import type { Database } from '@/types/database.types'

type SystemSchema = Database['system']

/** PESO-managed public page content from migration 046. */
export type SiteContentRow = SystemSchema['Tables']['site_contents']['Row']
export type SiteContentPlacement = SystemSchema['Enums']['site_content_placement']

export const SITE_CONTENT_MEDIA_BUCKET = 'site-content-media'

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
  image: string
  imageAlt: string
  primary?: LandingHeroAction
  secondary?: LandingHeroAction
}
