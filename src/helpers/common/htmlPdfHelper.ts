import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas-pro'

/**
 * Renders the pages of a printable form (a full HTML document) into an A4 portrait PDF, one element
 * per page, in an isolated hidden iframe. Shared by the NSRP Form 1 and TUPAD profiling form templates.
 */
export async function renderHtmlPagesToPdf(htmlContent: string, pageIds: readonly string[]): Promise<jsPDF> {
  // Use an isolated hidden iframe so no styles, Tailwind v4 CSS variables or oklch colors bleed into the renderer
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.left = '-99999px'
  iframe.style.top = '0'
  iframe.style.width = '1200px'
  iframe.style.height = '1600px'
  iframe.style.border = '0'
  iframe.style.opacity = '0'
  iframe.style.pointerEvents = 'none'
  iframe.style.zIndex = '-99999'
  document.body.appendChild(iframe)

  try {
    const iframeWin = iframe.contentWindow
    const iframeDoc = iframe.contentDocument || iframeWin?.document
    if (!iframeWin || !iframeDoc) {
      throw new Error('Unable to initialize rendering environment for PDF.')
    }

    // Strip any script tags from the injected HTML to prevent duplicate script execution inside the iframe
    const cleanHtml = htmlContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    iframeDoc.open()
    iframeDoc.write(cleanHtml)
    iframeDoc.close()

    // Strip no-print elements from iframe
    iframeDoc.querySelectorAll('.no-print').forEach((el) => el.remove())

    // Normalize container pages so box-shadow or outer margins don't appear in canvas
    iframeDoc.querySelectorAll('.page-container').forEach((el) => {
      const pageEl = el as HTMLElement
      pageEl.style.boxShadow = 'none'
      pageEl.style.margin = '0 auto'
    })

    // Wait for images (seals, logos) to load
    const images = Array.from(iframeDoc.querySelectorAll('img'))
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalHeight !== 0) {
              resolve()
            } else {
              img.onload = () => resolve()
              img.onerror = () => resolve()
              setTimeout(resolve, 1500)
            }
          })
      )
    )

    // Wait for fonts
    if (iframeDoc.fonts) {
      await iframeDoc.fonts.ready
    }

    await new Promise((resolve) => setTimeout(resolve, 100))

    const pages = pageIds.map((id) => iframeDoc.getElementById(id) as HTMLElement | null)
    if (pages.some((page) => !page)) {
      throw new Error(`Form pages (${pageIds.map((id) => `#${id}`).join(', ')}) could not be located.`)
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    })

    const pdfWidth = 210
    const pdfHeight = 297

    const addElementToPdfPage = async (element: HTMLElement, isFirst: boolean) => {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1200,
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.98)
      if (!isFirst) {
        pdf.addPage('a4', 'portrait')
      }

      const ratio = canvas.width / canvas.height
      let targetWidth = 195
      let targetHeight = targetWidth / ratio
      if (targetHeight > 287) {
        targetHeight = 287
        targetWidth = targetHeight * ratio
      }
      const marginX = (pdfWidth - targetWidth) / 2
      const marginY = (pdfHeight - targetHeight) / 2

      pdf.addImage(imgData, 'JPEG', marginX, marginY, targetWidth, targetHeight, undefined, 'FAST')
    }

    for (const [index, page] of pages.entries()) {
      await addElementToPdfPage(page!, index === 0)
    }

    return pdf
  } finally {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe)
    }
  }
}

// ─── Paginated documents (reports whose length varies) ─────────────────────

/** A chunk of a paginated document: plain HTML kept whole, or a table whose rows may split across pages */
export type PaginatedBlock =
  | { kind: 'html'; html: string }
  | {
      kind: 'table'
      /** Opening tag with its classes, e.g. `<table class="report">` */
      tableTag: string
      /** `<colgroup>` and `<thead>`, repeated on every page the table continues on */
      head: string
      rows: string[]
    }

export interface PaginatedDocument {
  /** CSS for the whole document (`.page`, `.page-header`, `.page-body`, `.page-footer` are laid out here) */
  styles: string
  /** Repeated at the top / bottom of every page (letterhead, footer address) */
  headerHtml?: string
  footerHtml?: string
  blocks: PaginatedBlock[]
  /** A4 portrait (default) or landscape */
  orientation?: 'portrait' | 'landscape'
}

// A4 at 96 dpi
const PAGE_WIDTH_PX = 794
const PAGE_HEIGHT_PX = 1123

/**
 * Lays a document out on as many A4 portrait pages as it needs, in an isolated hidden iframe: blocks flow from
 * page to page, table rows split between pages with the table head repeated, and the header / footer repeat on
 * every page. Each page is then drawn into the PDF at full size (no scaling, unlike renderHtmlPagesToPdf).
 */
export async function renderPaginatedPdf(doc: PaginatedDocument): Promise<jsPDF> {
  const landscape = doc.orientation === 'landscape'
  const orientation = landscape ? 'landscape' : 'portrait'
  const canvases = await renderPaginatedCanvases(doc)
  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4', compress: true })
  for (const [index, canvas] of canvases.entries()) {
    if (index > 0) pdf.addPage('a4', orientation)
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, landscape ? 297 : 210, landscape ? 210 : 297, undefined, 'FAST')
  }
  return pdf
}

/** The same pages as renderPaginatedPdf, as images (one data URL per page) for showing the form on screen */
export async function renderPaginatedImages(doc: PaginatedDocument): Promise<string[]> {
  return (await renderPaginatedCanvases(doc)).map((canvas) => canvas.toDataURL('image/png'))
}

async function renderPaginatedCanvases(doc: PaginatedDocument): Promise<HTMLCanvasElement[]> {
  const landscape = doc.orientation === 'landscape'
  const pageWidth = landscape ? PAGE_HEIGHT_PX : PAGE_WIDTH_PX
  const pageHeight = landscape ? PAGE_WIDTH_PX : PAGE_HEIGHT_PX
  const iframe = document.createElement('iframe')
  Object.assign(iframe.style, {
    position: 'fixed',
    left: '-99999px',
    top: '0',
    width: `${pageWidth + 40}px`,
    height: `${pageHeight + 40}px`,
    border: '0',
    opacity: '0',
    pointerEvents: 'none',
    zIndex: '-99999',
  })
  document.body.appendChild(iframe)

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) throw new Error('Unable to initialize rendering environment for PDF.')

    iframeDoc.open()
    iframeDoc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: #ffffff; }
      .page { width: ${pageWidth}px; height: ${pageHeight}px; display: flex; flex-direction: column; background: #ffffff; overflow: hidden; }
      .page-body { flex: 1 1 auto; min-height: 0; overflow: hidden; }
      ${doc.styles}
    </style></head><body></body></html>`)
    iframeDoc.close()

    const body = iframeDoc.body
    const pages: HTMLElement[] = []
    let pageBody: HTMLElement

    const toElement = (html: string): HTMLElement => {
      const holder = iframeDoc.createElement('div')
      holder.innerHTML = html.trim()
      return (holder.firstElementChild as HTMLElement | null) ?? holder
    }

    const newPage = () => {
      const page = iframeDoc.createElement('div')
      page.className = 'page'
      if (doc.headerHtml) page.appendChild(toElement(`<div class="page-header">${doc.headerHtml}</div>`))
      pageBody = toElement('<div class="page-body"></div>')
      page.appendChild(pageBody)
      if (doc.footerHtml) page.appendChild(toElement(`<div class="page-footer">${doc.footerHtml}</div>`))
      body.appendChild(page)
      pages.push(page)
    }

    const overflows = () => pageBody.scrollHeight > pageBody.clientHeight + 1

    newPage()

    for (const block of doc.blocks) {
      if (block.kind === 'html') {
        const el = toElement(block.html)
        pageBody!.appendChild(el)
        // Kept whole: moved to a fresh page when it doesn't fit (a block taller than a page is clipped)
        if (overflows() && pageBody!.childElementCount > 1) {
          el.remove()
          newPage()
          pageBody!.appendChild(el)
        }
        continue
      }

      const startTable = () => {
        const table = toElement(`${block.tableTag}${block.head}<tbody></tbody></table>`)
        pageBody!.appendChild(table)
        return table.querySelector('tbody') as HTMLElement
      }

      let tbody = startTable()
      for (const rowHtml of block.rows) {
        const holder = iframeDoc.createElement('tbody')
        holder.innerHTML = rowHtml.trim()
        const row = holder.firstElementChild as HTMLElement
        tbody.appendChild(row)
        if (!overflows()) continue

        row.remove()
        const tableHasRows = tbody.childElementCount > 0
        const pageHasOtherContent = pageBody!.childElementCount > 1
        if (!tableHasRows) tbody.closest('table')?.remove()
        if (tableHasRows || pageHasOtherContent) newPage()
        tbody = startTable()
        tbody.appendChild(row)
      }
    }

    // Wait for images (seals, logos) and fonts
    const images = Array.from(iframeDoc.querySelectorAll('img'))
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalHeight !== 0) return resolve()
            img.onload = () => resolve()
            img.onerror = () => resolve()
            setTimeout(resolve, 1500)
          })
      )
    )
    if (iframeDoc.fonts) await iframeDoc.fonts.ready
    await new Promise((resolve) => setTimeout(resolve, 100))

    const canvases: HTMLCanvasElement[] = []
    for (const page of pages) {
      canvases.push(
        await html2canvas(page, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: pageWidth,
          height: pageHeight,
          windowWidth: pageWidth + 40,
        }),
      )
    }
    return canvases
  } finally {
    if (document.body.contains(iframe)) document.body.removeChild(iframe)
  }
}

/** Opens a generated PDF with the browser's print dialog (a hidden iframe when pop-ups are blocked) */
export function printPdf(pdf: jsPDF): void {
  pdf.autoPrint()
  const blobUrl = URL.createObjectURL(pdf.output('blob'))
  const printWindow = window.open(blobUrl, '_blank')
  if (printWindow) {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
    return
  }
  const iframe = document.createElement('iframe')
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' })
  iframe.src = blobUrl
  document.body.appendChild(iframe)
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } catch (err) {
      console.error('Error triggering iframe print:', err)
    }
    setTimeout(() => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe)
      URL.revokeObjectURL(blobUrl)
    }, 60000)
  }
}
