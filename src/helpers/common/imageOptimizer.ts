// ==============================================================================
// Helper: imageOptimizer.ts
// Description: Non-blocking client-side image compression and resizing to prevent
//              browser freezing, memory spikes, and lag during document OCR.
// ==============================================================================

import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Configure PDF.js worker to match the installed pdfjs-dist version
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker
}

/**
 * Optimizes an image file by resizing large dimensions and compressing quality.
 * Decodes off-thread when possible (via createImageBitmap) to keep UI at 60fps.
 */
export async function optimizeImageForOcr(
  file: File,
  maxDimension = 1800,
  quality = 0.85
): Promise<File> {
  // If not an image (e.g. PDF), return original
  if (!file.type.startsWith('image/')) {
    return file
  }

  // If already lightweight (< 500KB and JPEG/WEBP), no heavy resize needed
  if (file.size < 500 * 1024 && (file.type === 'image/jpeg' || file.type === 'image/webp')) {
    return file
  }

  try {
    let width = 0
    let height = 0
    let source: ImageBitmap | HTMLImageElement

    if (typeof createImageBitmap === 'function') {
      // Decode off-thread
      const bitmap = await createImageBitmap(file)
      width = bitmap.width
      height = bitmap.height
      source = bitmap
    } else {
      // Fallback Image element
      const img = new Image()
      const objectUrl = URL.createObjectURL(file)
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Failed to load image for optimization'))
        img.src = objectUrl
      })
      URL.revokeObjectURL(objectUrl)
      width = img.naturalWidth || img.width
      height = img.naturalHeight || img.height
      source = img
    }

    // Determine target dimensions
    let targetWidth = width
    let targetHeight = height

    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        targetWidth = maxDimension
        targetHeight = Math.round((height * maxDimension) / width)
      } else {
        targetHeight = maxDimension
        targetWidth = Math.round((width * maxDimension) / height)
      }
    }

    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const ctx = canvas.getContext('2d', { alpha: false })

    if (!ctx) {
      if ('close' in source && typeof source.close === 'function') source.close()
      return file
    }

    // Use smooth image smoothing
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'medium'
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, targetWidth, targetHeight)
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight)

    if ('close' in source && typeof source.close === 'function') {
      source.close()
    }

    // Convert canvas to Blob
    const blob: Blob | null = await new Promise((resolve) => {
      canvas.toBlob(
        (b) => resolve(b),
        'image/jpeg',
        quality
      )
    })

    if (!blob) return file

    const optimizedName = file.name.replace(/\.[^/.]+$/, '') + '.jpg'
    return new File([blob], optimizedName, { type: 'image/jpeg' })
  } catch (err) {
    console.warn('Image optimization skipped due to error, using original file:', err)
    return file
  }
}


/**
 * Converts the first page of a PDF into a lightweight, optimized JPEG image.
 * Renders at a clean max resolution (default 1600px) and frees canvas/PDF memory immediately.
 */
export async function convertPdfPageToOptimizedImage(
  file: File,
  pageNumber = 1,
  maxDimension = 1600,
  quality = 0.85
): Promise<File> {
  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
  let pdfDoc: any = null

  try {
    pdfDoc = await loadingTask.promise
    if (pdfDoc.numPages < pageNumber) {
      throw new Error(`PDF only has ${pdfDoc.numPages} pages, cannot load page ${pageNumber}.`)
    }

    const page = await pdfDoc.getPage(pageNumber)
    try {
      const initialViewport = page.getViewport({ scale: 1.0 })
      let scale = 1.0

      if (initialViewport.width > maxDimension || initialViewport.height > maxDimension) {
        scale = maxDimension / Math.max(initialViewport.width, initialViewport.height)
      } else if (initialViewport.width < 1000) {
        scale = Math.min(1.5, 1200 / initialViewport.width)
      }

      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height

      const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false })
      if (!ctx) {
        throw new Error('Canvas 2D context unavailable.')
      }

      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      await page.render({
        canvasContext: ctx,
        viewport,
        canvas,
      } as any).promise

      const blob: Blob | null = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
      })

      canvas.width = 0
      canvas.height = 0

      if (!blob) {
        throw new Error('Failed to create image blob from PDF page.')
      }

      const baseName = file.name.replace(/\.[^/.]+$/, '')
      return new File([blob], `${baseName}_page${pageNumber}.jpg`, { type: 'image/jpeg' })
    } finally {
      page.cleanup()
    }
  } finally {
    if (pdfDoc) {
      await pdfDoc.cleanup()
      await pdfDoc.destroy()
    }
  }
}

