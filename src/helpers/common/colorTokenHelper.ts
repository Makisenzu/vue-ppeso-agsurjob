/**
 * Resolves a CSS color token (e.g. `--foreground`, defined in oklch) to hex, for WebGL and canvas
 * drawing (ElectricLogo, CircularGallery) that can't read CSS variables.
 */
export function resolveTokenHex(token: string): string {
  const probe = document.createElement('span')
  probe.style.color = `var(${token})`
  document.body.appendChild(probe)
  const color = getComputedStyle(probe).color
  probe.remove()

  // Paint one pixel so the browser converts any color space to sRGB bytes
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  if (!ctx) return '#ffffff'
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}
