/** Platforms offered in the social links editor; `hosts` lets a pasted link pick its platform. */
export const SOCIAL_PLATFORMS = [
  { name: 'Facebook', hosts: ['facebook.com', 'fb.com'] },
  { name: 'LinkedIn', hosts: ['linkedin.com'] },
  { name: 'Instagram', hosts: ['instagram.com'] },
  { name: 'X', hosts: ['x.com', 'twitter.com'] },
  { name: 'TikTok', hosts: ['tiktok.com'] },
  { name: 'YouTube', hosts: ['youtube.com', 'youtu.be'] },
  { name: 'GitHub', hosts: ['github.com'] },
  { name: 'Portfolio', hosts: ['behance.net', 'dribbble.com', 'github.io', 'carrd.co', 'wixsite.com'] },
  { name: 'Website', hosts: [] },
] as const

export const MAX_PROFILE_SOCIALS = 8

/** Adds `https://` when the user typed a bare domain. */
export function normalizeSocialLink(link: string): string {
  const trimmed = link.trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

/** Parses a link the way it will be saved; `null` when it isn't a usable http(s) URL. */
export function parseSocialLink(link: string): URL | null {
  try {
    const url = new URL(normalizeSocialLink(link))
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) return null
    return url
  } catch {
    return null
  }
}

function hostOf(url: URL): string {
  return url.hostname.replace(/^(www\.|m\.)/i, '').toLowerCase()
}

/** Platform name matching the link's host, or `null` for an unknown site. */
export function detectSocialPlatform(link: string): string | null {
  const url = parseSocialLink(link)
  if (!url) return null
  const host = hostOf(url)
  const platform = SOCIAL_PLATFORMS.find((p) =>
    p.hosts.some((h) => host === h || host.endsWith(`.${h}`))
  )
  return platform?.name ?? null
}

/** Short label for a saved link: the handle/path for known platforms, the domain otherwise. */
export function formatSocialHandle(link: string | null | undefined): string {
  const url = link ? parseSocialLink(link) : null
  if (!url) return link ?? ''
  const path = url.pathname.replace(/\/+$/, '')
  if (!path) return hostOf(url)
  return detectSocialPlatform(link!) ? path.replace(/^\//, '') : `${hostOf(url)}${path}`
}
