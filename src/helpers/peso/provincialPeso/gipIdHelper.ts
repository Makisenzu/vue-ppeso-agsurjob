/**
 * The GIP intern ID, laid out from public/templates/GIP_ID.docx (measured from Word's own rendering of it).
 *
 * The template is a Letter landscape sheet (1 in margins) holding two copies of one card, 3.408 × 4.871 in each;
 * print at 100% (Actual size). A card is the template's background picture with the PGAS seal, the QR code and the
 * washed-out PESO logo placed over it, then four centred lines in Calibri Bold:
 *
 *   "NICKNAME"            34 pt, drop shadow        (above the red band)
 *   FULL NAME              18 pt, drop shadow        (on the red band)
 *   Administrative Aide    14 pt
 *   OFFICE                 24 pt, drop shadow
 *
 * Every position below is in points from the card's top-left corner. Text is placed by its baseline, so it
 * lands where Word puts it whatever the browser's line metrics. Calibri is used when installed (Windows);
 * Carlito, its metric-compatible twin, otherwise, so widths and positions are identical.
 */

export interface GipIdCardData {
  nickname: string
  fullName: string
  position: string
  office: string
  photoUrl: string | null
}

export const GIP_ID_POSITION = 'Administrative Aide'

// ─── Template geometry (pt) ────────────────────────────────────────────────

/** Group 30: 3116580 × 4453890 EMU */
const CARD = { width: 245.4, height: 350.7 }

/**
 * Where the two copies sit, from the paper's top-left corner (Groups 30 and 39 on the template's Letter page).
 * The printed page is only as big as the cards, not Letter: a fixed 11 × 8.5 in page gets shrunk to fit A4
 * paper (≈3% smaller cards), while this prints at true size on Letter, A4 or Legal.
 */
const CARD_SLOTS = [
  { left: 72, top: 69.72 },
  { left: 322.85, top: 69.6 },
] as const

const IMAGES = {
  /** Picture 10: the PGAS official seal, over the background's own */
  seal: { x: 6.75, y: 5.63, size: 52.5 },
  /** Picture 38: the QR code (its srcRect crop is baked into qr.png) */
  qr: { x: 6.765, y: 95.678, width: 57.05, height: 57.0 },
  /** Picture 12: the PESO logo, brightness +70% / contrast −70% baked into peso-logo.png */
  pesoLogo: { x: 179.95, y: 92.93, size: 60 },
  /** Inside the background's black photo frame */
  photo: { x: 71.33, y: 55.67, width: 105.03, height: 130.65 },
}

interface TextLine {
  /** Centre of the template's text box */
  centerX: number
  baseline: number
  size: number
  /** The box's width less its 0.1 in insets: longer text is scaled down to fit on one line */
  maxWidth: number
  shadow: boolean
}

const TEXT = {
  /** Text Box 49: 3338195 EMU wide at −104775. Kept clear of the "Hi I'm" tag (right edge 48.4 pt) it sits beside */
  nickname: { centerX: 123.18, baseline: 217.92, size: 34, maxWidth: 145.5, shadow: true },
  /** Text Box 1972140915: card-wide */
  fullName: { centerX: 122.7, baseline: 244.42, size: 18, maxWidth: 231, shadow: true },
  /** Text Box 1365616589, first paragraph */
  position: { centerX: 122.25, baseline: 270.53, size: 14, maxWidth: 230.1, shadow: false },
  /** Text Box 1365616589, second paragraph */
  office: { centerX: 122.25, baseline: 306.4, size: 24, maxWidth: 230.1, shadow: true },
} satisfies Record<string, TextLine>

/** w14:shadow: 3 pt blur, 1.5 pt away at 45°, black at 60% */
const SHADOW = { offset: 1.06, blur: 1.5, opacity: 0.6 }

const FONT_FAMILY = 'Calibri, Carlito, sans-serif'
const CARLITO_CSS = 'https://fonts.googleapis.com/css2?family=Carlito:wght@700&display=swap'

// ─── Text ──────────────────────────────────────────────────────────────────

const clean = (value: unknown) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '')

/** CHARLENE KATE A. CABUSAS: first name, middle initial, surname, suffix */
export function gipIdFullName(applicant: Record<string, unknown> | null | undefined, fallback: string): string {
  const first = clean(applicant?.first_name)
  const surname = clean(applicant?.surname)
  if (!first && !surname) return clean(fallback).toUpperCase()
  const middle = clean(applicant?.middle_name)
  return [first, middle ? `${middle.charAt(0)}.` : '', surname, clean(applicant?.suffix)].filter(Boolean).join(' ').toUpperCase()
}

/** “KATE” */
export const gipIdNickname = (nickname: string) => `“${clean(nickname).toUpperCase()}”`

const escapeXml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const asset = (name: string) => new URL(`/templates/gip-id/${name}`, window.location.origin).href

let measureContext: CanvasRenderingContext2D | null = null

/** The font size that keeps the text within the line's width (never larger than the template's) */
function fittedSize(text: string, line: TextLine): number {
  measureContext ??= document.createElement('canvas').getContext('2d')
  if (!measureContext) return line.size
  measureContext.font = `700 ${line.size}px ${FONT_FAMILY}`
  // Word sets these lines without kerning, and so does the SVG
  if ('fontKerning' in measureContext) measureContext.fontKerning = 'none'
  const width = measureContext.measureText(text).width
  return width > line.maxWidth ? Math.floor((line.size * line.maxWidth * 100) / width) / 100 : line.size
}

/** Loads Carlito (for browsers without Calibri) so text is measured and drawn with the right metrics */
export async function loadGipIdFont(target: Document = document): Promise<void> {
  if (!target.querySelector(`link[href="${CARLITO_CSS}"]`)) {
    const link = target.createElement('link')
    link.rel = 'stylesheet'
    link.href = CARLITO_CSS
    target.head.appendChild(link)
    await new Promise<void>((resolve) => {
      link.onload = () => resolve()
      link.onerror = () => resolve()
      setTimeout(resolve, 3000)
    })
  }
  try {
    await target.fonts.load(`700 34px ${FONT_FAMILY}`)
  } catch {
    // The system fallback is used
  }
}

// ─── Card ──────────────────────────────────────────────────────────────────

function textElement(text: string, line: TextLine, shadowId: string): string {
  const size = fittedSize(text, line)
  return (
    `<text x="${line.centerX}" y="${line.baseline}" text-anchor="middle" font-family="${FONT_FAMILY}" font-weight="700" ` +
    `font-size="${size}" fill="#000" style="font-kerning:none;font-variant-ligatures:none"${line.shadow ? ` filter="url(#${shadowId})"` : ''}>${escapeXml(text)}</text>`
  )
}

/** One card as SVG, sized in points. `key` keeps the ids apart when several cards share a page. */
export function gipIdCardSvg(data: GipIdCardData, key = 'gip-id'): string {
  const shadowId = `${key}-shadow`
  const photoClipId = `${key}-photo`
  const { seal, qr, pesoLogo, photo } = IMAGES
  const image = (href: string, x: number, y: number, width: number, height: number, extra = '') =>
    `<image href="${escapeXml(href)}" x="${x}" y="${y}" width="${width}" height="${height}"${extra}/>`

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD.width} ${CARD.height}" width="${CARD.width}pt" height="${CARD.height}pt">`,
    '<defs>',
    `<filter id="${shadowId}" x="-10%" y="-40%" width="120%" height="180%" color-interpolation-filters="sRGB">`,
    `<feDropShadow dx="${SHADOW.offset}" dy="${SHADOW.offset}" stdDeviation="${SHADOW.blur}" flood-color="#000" flood-opacity="${SHADOW.opacity}"/>`,
    '</filter>',
    `<clipPath id="${photoClipId}"><rect x="${photo.x}" y="${photo.y}" width="${photo.width}" height="${photo.height}"/></clipPath>`,
    '</defs>',
    image(asset('background.jpg'), 0, 0, CARD.width, CARD.height, ' preserveAspectRatio="none"'),
    data.photoUrl
      ? image(data.photoUrl, photo.x, photo.y, photo.width, photo.height, ` preserveAspectRatio="xMidYMid slice" clip-path="url(#${photoClipId})"`)
      : '',
    image(asset('qr.png'), qr.x, qr.y, qr.width, qr.height, ' preserveAspectRatio="none"'),
    image(asset('peso-logo.png'), pesoLogo.x, pesoLogo.y, pesoLogo.size, pesoLogo.size),
    image(asset('seal.png'), seal.x, seal.y, seal.size, seal.size),
    textElement(gipIdNickname(data.nickname), TEXT.nickname, shadowId),
    textElement(data.fullName, TEXT.fullName, shadowId),
    textElement(data.position, TEXT.position, shadowId),
    textElement(data.office, TEXT.office, shadowId),
    '</svg>',
  ].join('')
}

// ─── Print ─────────────────────────────────────────────────────────────────

/** The template's sheet: two copies of the card at their places on Letter landscape */
export function gipIdSheetHtml(data: GipIdCardData): string {
  const sheetWidth = Math.max(...CARD_SLOTS.map((slot) => slot.left)) + CARD.width
  const sheetHeight = Math.max(...CARD_SLOTS.map((slot) => slot.top)) + CARD.height
  const cards = CARD_SLOTS.map(
    (slot, index) =>
      `<div class="card" style="left:${slot.left}pt;top:${slot.top}pt">${gipIdCardSvg(data, `gip-id-${index}`)}</div>`,
  ).join('')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>GIP ID</title>
<link rel="stylesheet" href="${CARLITO_CSS}">
<style>
  @page { size: landscape; margin: 0; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .sheet { position: relative; width: ${sheetWidth}pt; height: ${sheetHeight}pt; }
  .card { position: absolute; width: ${CARD.width}pt; height: ${CARD.height}pt; }
  .card svg { display: block; }
</style></head><body><div class="sheet">${cards}</div></body></html>`
}

/** Opens the print dialog for the ID sheet (a hidden iframe, so the app's styles don't apply) */
export async function printGipId(data: GipIdCardData): Promise<void> {
  const iframe = document.createElement('iframe')
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' })
  document.body.appendChild(iframe)
  const frameDocument = iframe.contentDocument
  const frameWindow = iframe.contentWindow
  if (!frameDocument || !frameWindow) {
    iframe.remove()
    throw new Error('The print preview could not be opened.')
  }
  frameDocument.open()
  frameDocument.write(gipIdSheetHtml(data))
  frameDocument.close()

  // Fonts and every picture must be in before the dialog opens, or they print blank
  await loadGipIdFont(frameDocument)
  await Promise.all(
    Array.from(frameDocument.querySelectorAll('image')).map(
      (node) =>
        new Promise<void>((resolve) => {
          const probe = new Image()
          probe.onload = () => resolve()
          probe.onerror = () => resolve()
          probe.src = node.getAttribute('href') ?? ''
          setTimeout(resolve, 4000)
        }),
    ),
  )
  await new Promise((resolve) => setTimeout(resolve, 150))

  frameWindow.focus()
  frameWindow.print()
  setTimeout(() => iframe.remove(), 60000)
}
