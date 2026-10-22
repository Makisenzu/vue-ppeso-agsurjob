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
