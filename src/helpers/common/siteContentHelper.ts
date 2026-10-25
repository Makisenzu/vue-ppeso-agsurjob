import {
  PUBLIC_PAGES,
  type OrgChart,
  type OrgChartPerson,
  type OrgChartPositionItem,
  type OrgChartUnitRow,
  type LandingHeroAction,
  type LandingHeroSlide,
  type PageHero,
  type PageHeroRow,
  type PublicPage,
  type SiteContentRow,
} from '@/types/common/siteContent'

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

/** A public page's hero: each empty saved text falls back to the page's built-in text (PUBLIC_PAGES). */
export function toPageHero(page: PublicPage, row: PageHeroRow | null, imageUrl: string | null): PageHero {
  const defaults = PUBLIC_PAGES.find((item) => item.key === page)!.defaults
  return {
    eyebrow: row?.eyebrow || defaults.eyebrow,
    title: row?.title || defaults.title,
    description: row?.description || defaults.description,
    backgroundImage: imageUrl,
    imageAlt: row?.image_alt ?? '',
  }
}

/** First and last name initials, skipping the title, suffix and middle initials ("Hon. Santiago B. Cane, Jr." → "SC"). */
export function getNameInitials(name: string | null): string {
  if (!name) return ''
  const words = name
    .replace(/^Hon\.\s*/i, '')
    .replace(/,.*$/, '')
    .split(/\s+/)
    .filter((word) => word && !/^[A-Z]\.$/i.test(word))
  return ((words[0]?.[0] ?? '') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase()
}

export function toOrgChartPerson(position: OrgChartPositionItem): OrgChartPerson {
  return {
    id: position.id,
    name: position.holder_name,
    position: position.title,
    status: position.holder_name ? position.employment_status : 'vacant',
    photo: position.photo_url,
    initials: getNameInitials(position.holder_name),
    isHead: position.is_head,
  }
}

const bySortOrder = <T extends { sort_order: number; created_at: string }>(a: T, b: T) =>
  a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)

/** Units and positions (migration 052) → the public chart: top positions, then each unit's head and staff. */
export function toOrgChart(units: OrgChartUnitRow[], positions: OrgChartPositionItem[]): OrgChart {
  const sorted = [...positions].sort(bySortOrder)
  return {
    top: sorted.filter((position) => !position.unit_id).map(toOrgChartPerson),
    units: [...units].sort(bySortOrder).map((unit) => {
      const own = sorted.filter((position) => position.unit_id === unit.id)
      const head = own.find((position) => position.is_head)
      return {
        id: unit.id,
        name: unit.name,
        abbreviation: unit.abbreviation,
        head: head ? toOrgChartPerson(head) : null,
        members: own.filter((position) => position !== head).map(toOrgChartPerson),
      }
    }),
  }
}
