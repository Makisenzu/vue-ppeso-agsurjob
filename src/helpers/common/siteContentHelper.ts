import type { LandingHeroAction, LandingHeroSlide, SiteContentRow } from '@/types/common/siteContent'

/** A stored link as a button: '/path' routes in-app, '#id' and 'https://' stay plain links. */
export function toHeroAction(label: string | null, link: string | null): LandingHeroAction | undefined {
  if (!label || !link) return undefined
  if (link.startsWith('/')) return { label, to: link }
  return { label, href: link, external: link.startsWith('https://') }
}

/** A site_contents row as a hero slide; `imageUrl` is the resolved public URL, or the default image when the row has none. */
export function toHeroSlide(row: SiteContentRow, imageUrl: string, fallbackAlt: string): LandingHeroSlide {
  return {
    id: row.id,
    eyebrow: row.eyebrow ?? '',
    title: row.title,
    description: row.description,
    image: imageUrl,
    imageAlt: row.image_path ? (row.image_alt ?? '') : fallbackAlt,
    primary: toHeroAction(row.primary_label, row.primary_link),
    secondary: toHeroAction(row.secondary_label, row.secondary_link),
  }
}
