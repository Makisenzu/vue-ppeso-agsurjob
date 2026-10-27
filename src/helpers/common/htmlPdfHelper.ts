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
