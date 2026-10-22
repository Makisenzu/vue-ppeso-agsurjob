import type { LandingHeroAction, LandingHeroSlide, SiteContentRow } from '@/types/common/siteContent'

/** A stored link as a button: '/path' routes in-app, '#id' and 'https://' stay plain links. */
export function toHeroAction(label: string | null, link: string | null): LandingHeroAction | undefined {
  if (!label || !link) return undefined
  if (link.startsWith('/')) return { label, to: link }
  return { label, href: link, external: link.startsWith('https://') }
}

/** A site_contents row as a hero slide; `imageUrl` is the resolved public URL of its photo, if any. */
export function toHeroSlide(row: SiteContentRow, imageUrl: string | null): LandingHeroSlide {
  const primary = toHeroAction(row.primary_label, row.primary_link)
  const secondary = toHeroAction(row.secondary_label, row.secondary_link)
  return {
    id: row.id,
    eyebrow: row.eyebrow ?? '',
    title: row.title ?? '',
    description: row.description,
    backgroundImage: imageUrl,
    backgroundType: row.media_type,
    imageAlt: row.image_alt ?? '',
    hasText: !!(row.eyebrow || row.title || row.description || primary || secondary),
    primary,
    secondary,
  }
}

/** Name of a row for toasts, dialogs and the table; media-only slides have no title. */
export function getSiteContentDisplayName(row: Pick<SiteContentRow, 'title' | 'eyebrow' | 'media_type'>): string {
  return row.title || row.eyebrow || (row.media_type === 'video' ? 'Video-only slide' : 'Photo-only slide')
}
