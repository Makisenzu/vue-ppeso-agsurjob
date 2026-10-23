export interface LogoCardOptions {
  width: number
  height: number
  /** Solid card color (hex or rgb); omit to keep the logo's own transparent background */
  background?: string
  /** Space around the logo, as a fraction of the card's shorter side */
  padding?: number
}

/**
 * Draws a logo whole (contained, centered) on a card of the given size and returns it as a PNG data URL.
 * For galleries that crop images to fill their cards (CircularGallery), which would clip the logo.
 * The logo host must allow CORS (Supabase public buckets and bundled assets do).
 */
export function composeLogoCard(src: string, { width, height, background, padding = 0.14 }: LogoCardOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Could not get a 2d context'))

      if (background) {
        ctx.fillStyle = background
        ctx.fillRect(0, 0, width, height)
      }

      const box = Math.min(width, height) * (1 - padding * 2)
      const scale = Math.min(box / img.naturalWidth, box / img.naturalHeight)
      const drawWidth = img.naturalWidth * scale
      const drawHeight = img.naturalHeight * scale
      ctx.drawImage(img, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error(`Could not load the logo ${src}`))
    img.src = src
  })
}
