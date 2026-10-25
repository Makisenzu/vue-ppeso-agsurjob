import { format, parseISO } from 'date-fns'
import { formatFileSize } from '@/helpers/common/uploadHelpers'
import {
  SITE_CONTENT_IMAGE_MAX_MB,
  SITE_CONTENT_IMAGE_TYPES,
  SITE_CONTENT_VIDEO_MAX_MB,
  SITE_CONTENT_VIDEO_TYPES,
  type SiteContentMediaType,
  type SiteContentRow,
  type SiteContentState,
} from '@/types/common/siteContent'

const STATE_BADGE_CLASS: Record<SiteContentState, string> = {
  Draft: 'bg-muted text-muted-foreground border-border',
  Scheduled: 'bg-info/10 text-info border-info/30',
  Live: 'bg-success/10 text-success border-success/30',
  Expired: 'bg-warning/10 text-warning border-warning/30',
  Archived: 'bg-muted text-muted-foreground border-border',
}

/** Same "live" rule as the RLS policy in migration 046, evaluated at `now`. */
export function getSiteContentState(row: Pick<SiteContentRow, 'status' | 'published_at' | 'expires_at'>, now = new Date()): SiteContentState {
  if (row.status === 'draft') return 'Draft'
  if (row.status === 'archived') return 'Archived'
  if (row.published_at && parseISO(row.published_at) > now) return 'Scheduled'
  if (row.expires_at && parseISO(row.expires_at) <= now) return 'Expired'
  return 'Live'
}

export function getSiteContentStateBadgeClass(state: SiteContentState): string {
  return STATE_BADGE_CLASS[state]
}

/** "Oct 22, 2026 → Nov 30, 2026", "From Oct 22, 2026", or "—" for unpublished drafts. */
export function formatSiteContentSchedule(publishedAt: string | null, expiresAt: string | null): string {
  const fmt = (iso: string) => format(parseISO(iso), 'MMM d, yyyy')
  if (publishedAt && expiresAt) return `${fmt(publishedAt)} → ${fmt(expiresAt)}`
  if (publishedAt) return `From ${fmt(publishedAt)}`
  if (expiresAt) return `Until ${fmt(expiresAt)}`
  return '—'
}

/** ISO timestamp → value for <input type="datetime-local"> (local time). */
export function toDateTimeLocal(iso: string | null): string {
  return iso ? format(parseISO(iso), "yyyy-MM-dd'T'HH:mm") : ''
}

/** <input type="datetime-local"> value → ISO timestamp, or null when empty. */
export function fromDateTimeLocal(value: string | null | undefined): string | null {
  return value ? new Date(value).toISOString() : null
}

/**
 * Whether a picked file can be a slide background, and as what. Throws a readable message for
 * other types or files over the limit (photos 5MB, videos 50MB, as in the bucket from 048).
 */
export function getSiteContentMediaType(file: File): SiteContentMediaType {
  const isVideo = SITE_CONTENT_VIDEO_TYPES.includes(file.type)
  if (!isVideo && !SITE_CONTENT_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Use a JPG, PNG or WebP photo, or an MP4 or WebM video.')
  }
  const maxMb = isVideo ? SITE_CONTENT_VIDEO_MAX_MB : SITE_CONTENT_IMAGE_MAX_MB
  if (file.size > maxMb * 1024 * 1024) {
    throw new Error(`This ${isVideo ? 'video' : 'photo'} is ${formatFileSize(file.size)}. The limit is ${maxMb}MB.`)
  }
  return isVideo ? 'video' : 'image'
}

/** Program card backgrounds are photos only (the gallery renders an <img>); throws a readable message otherwise. */
export function assertProgramCardPhoto(file: File): void {
  if (getSiteContentMediaType(file) === 'video') throw new Error('Program cards need a photo: use a JPG, PNG or WebP.')
}

/** Municipality logos are images only (the spiral renders an <img>); throws a readable message otherwise. */
export function assertMunicipalityLogo(file: File): void {
  if (getSiteContentMediaType(file) === 'video') throw new Error('Logos need an image: use a PNG, WebP or JPG.')
}

/** Page banners are photos only (the hero renders an <img>); throws a readable message otherwise. */
export function assertPageHeroPhoto(file: File): void {
  if (getSiteContentMediaType(file) === 'video') throw new Error('Page banners need a photo: use a JPG, PNG or WebP.')
}

/**
 * Storage path for an uploaded photo / video: <folder>/<cleaned name>_<timestamp>.<ext>. The folder is a
 * site_contents id for slides (policy in 046), programs/<program> for program cards (policy in 049) or
 * municipalities/<municipality> for municipality logos (policy in 050) or pages/<page> for page banners (policy in 051).
 */
export function buildSiteContentMediaPath(contentId: string, filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  const ext = lastDot !== -1 ? filename.slice(lastDot + 1).toLowerCase() : 'jpg'
  const name = (lastDot !== -1 ? filename.slice(0, lastDot) : filename).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 60)
  return `${contentId}/${name || 'image'}_${Date.now()}.${ext}`
}
