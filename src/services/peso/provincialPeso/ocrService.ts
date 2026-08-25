import * as pdfjsLib from 'pdfjs-dist'
import type { LpiiCategory } from '@/types/peso/provincialPeso/gip'
import type { NsrpParsedApplicant, OcrProgressState } from '@/types/peso/provincialPeso/nsrpOcr'
import { mapGeminiOcrToNsrpApplicant } from '@/helpers/peso/provincialPeso/nsrpOcrHelper'
import { ocrVisionService } from '@/services/common/ocrVisionService'

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Configure PDF.js worker to always match the installed pdfjs-dist version
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker
}

export type OcrProgressCallback = (progress: OcrProgressState) => void

/**
 * Non-blocking yield back to the browser's event loop and animation frames.
 * Gives the browser breathing room to paint UI, process events, and run Garbage Collection.
 */
const yieldToMainThread = (ms = 25): Promise<void> => {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => setTimeout(resolve, ms))
    } else {
      setTimeout(resolve, ms)
    }
  })
}

/**
 * Renders a single PDF page to a crisp JPEG base64 string.
 * Renders at scale 2.0 (~1200x1700px for standard A4) for optimal OCR handwriting legibility.
 */
async function renderPageToBase64(page: any, maxDimension = 1800): Promise<string> {
  const initialViewport = page.getViewport({ scale: 1.0 })
  let scale = 2.0

  if (initialViewport.width * scale > maxDimension || initialViewport.height * scale > maxDimension) {
    scale = maxDimension / Math.max(initialViewport.width, initialViewport.height)
  }

  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(viewport.width)
  canvas.height = Math.round(viewport.height)

  const context = canvas.getContext('2d', { alpha: false })
  if (!context) {
    throw new Error('Canvas 2D context unavailable for page rendering.')
  }

  context.fillStyle = '#FFFFFF'
  context.fillRect(0, 0, canvas.width, canvas.height)

  await page.render({ canvasContext: context, viewport, canvas } as any).promise

  const dataUrl = canvas.toDataURL('image/jpeg', 0.90)

  // Free GPU and memory immediately
  canvas.width = 0
  canvas.height = 0

  const commaIdx = dataUrl.indexOf(',')
  return commaIdx >= 0 ? dataUrl.substring(commaIdx + 1) : dataUrl
}

export const ocrService = {
  /**
   * Reads a multi-page PDF document, groups pages into 2-page NSRP Form 1 documents (Page 1 + Page 2),
   * renders each page pair as high-resolution JPEG images, sends them to Gemini Vision via the process-ocr
   * edge function, and maps the structured responses to NsrpParsedApplicant records.
   */
  async processNsrpPdf(
    file: File,
    onProgress?: OcrProgressCallback,
    barangayTagMap?: Map<string, LpiiCategory>
  ): Promise<NsrpParsedApplicant[]> {
    const notify = (state: Partial<OcrProgressState>) => {
      if (onProgress) {
        onProgress({
          isProcessing: true,
          stage: state.stage || 'ocr_running',
          currentPage: state.currentPage ?? 0,
          totalPages: state.totalPages ?? 0,
          progressPercent: state.progressPercent ?? 0,
          statusMessage: state.statusMessage || 'Processing PDF document...',
          detectedApplicantsCount: state.detectedApplicantsCount ?? 0,
        })
      }
    }

    notify({
      stage: 'reading_pdf',
      currentPage: 0,
      totalPages: 0,
      progressPercent: 5,
      statusMessage: `Reading PDF: ${file.name}...`,
    })
    await yieldToMainThread(10)

    const fileBuffer = await file.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({
      data: fileBuffer,
      disableFontFace: true,
      stopAtErrors: false,
    })
    let pdfDoc: any = null

    // Store rendered page images
    const pageImages: string[] = []
    let totalPages = 0

    try {
      pdfDoc = await loadingTask.promise
      totalPages = pdfDoc.numPages

      if (totalPages === 0) {
        throw new Error('The uploaded PDF has no readable pages.')
      }

      // DOLE NSRP Form 1 is strictly 2 pages per applicant
      const totalApplicants = Math.ceil(totalPages / 2)

      notify({
        stage: 'rendering_pages',
        currentPage: 1,
        totalPages,
        progressPercent: 10,
        statusMessage: `PDF loaded (${totalPages} pages, ${totalApplicants} applicants detected). Rendering pages...`,
      })
      await yieldToMainThread(15)

      // Phase 1: Render all pages to JPEG images
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        await yieldToMainThread(15)

        const page = await pdfDoc.getPage(pageNum)
        const progressBase = 10 + Math.floor(((pageNum - 1) / totalPages) * 25)

        notify({
          stage: 'rendering_pages',
          currentPage: pageNum,
          totalPages,
          progressPercent: progressBase,
          statusMessage: `Rendering page ${pageNum} of ${totalPages}...`,
          detectedApplicantsCount: 0,
        })

        try {
          const base64 = await renderPageToBase64(page, 1800)
          pageImages.push(base64)
        } finally {
          page.cleanup()
        }
      }
    } finally {
      // Free PDF document memory
      if (pdfDoc) {
        try {
          await pdfDoc.cleanup()
          await pdfDoc.destroy()
        } catch {
          // ignore
        }
      }
      try {
        await loadingTask.destroy()
      } catch {
        // ignore
      }
    }

    // Phase 2: Group pages into STRICT 2-page applicant pairs (NSRP Form 1 standard: Page 1 + Page 2)
    const applicantGroups: Array<{
      page1Base64: string
      page2Base64: string | null
      pageRange: string
      applicantIndex: number
    }> = []

    for (let i = 0; i < pageImages.length; i += 2) {
      const p1 = pageImages[i]
      const p2 = pageImages[i + 1] || null
      const startPage = i + 1
      const endPage = Math.min(i + 2, totalPages)
      const applicantIndex = Math.floor(i / 2)

      applicantGroups.push({
        page1Base64: p1,
        page2Base64: p2,
        pageRange: p2 ? `Pages ${startPage} - ${endPage}` : `Page ${startPage}`,
        applicantIndex,
      })
    }

    notify({
      stage: 'ocr_running',
      currentPage: 1,
      totalPages: applicantGroups.length,
      progressPercent: 35,
      statusMessage: `Analyzing ${applicantGroups.length} applicant records with Gemini Vision AI...`,
      detectedApplicantsCount: 0,
    })
    await yieldToMainThread(10)

    // Phase 3: Send each applicant's 2-page form to Gemini Vision
    const parsedApplicants: NsrpParsedApplicant[] = []

    for (let idx = 0; idx < applicantGroups.length; idx++) {
      await yieldToMainThread(15)

      const group = applicantGroups[idx]
      const progressBase = 35 + Math.floor((idx / applicantGroups.length) * 60)

      notify({
        stage: 'ocr_running',
        currentPage: idx + 1,
        totalPages: applicantGroups.length,
        progressPercent: progressBase,
        statusMessage: `Gemini Vision extracting applicant ${idx + 1} of ${applicantGroups.length} (${group.pageRange})...`,
        detectedApplicantsCount: parsedApplicants.length,
      })

      try {
        // Build image list for this applicant (Page 1 + Page 2)
        const imageList: Array<{ data: string; mime_type: string }> = [
          { data: group.page1Base64, mime_type: 'image/jpeg' },
        ]
        if (group.page2Base64) {
          imageList.push({ data: group.page2Base64, mime_type: 'image/jpeg' })
        }

        // Call Gemini OCR via edge function or direct API fallback
        const response = await ocrVisionService.processOcrWithGemini({
          imageBase64List: imageList,
        })

        if (response && response.data) {
          const mapped = mapGeminiOcrToNsrpApplicant(
            response.data,
            idx,
            file.name,
            group.pageRange,
            barangayTagMap
          )
          parsedApplicants.push(mapped)
        } else {
          throw new Error('Gemini Vision did not return structured applicant data.')
        }
      } catch (err: any) {
        console.error(`Gemini OCR failed for applicant ${idx + 1}:`, err)
        parsedApplicants.push({
          id: `ERR-${idx + 1}-${Date.now().toString().slice(-4)}`,
          surname: `Applicant-${idx + 1}`,
          firstName: 'Candidate',
          middleName: '',
          suffix: '',
          sex: 'Male',
          dateOfBirth: '',
          age: null,
          civilStatus: 'Single',
          religion: 'Roman Catholic',
          tin: '',
          houseStreet: 'Purok 1',
          barangay: 'Poblacion',
          municipality: 'Prosperidad',
          province: 'Agusan del Sur',
          contactNumber: '',
          email: '',
          educationalLevel: 'College Graduate',
          course: 'Not Specified',
          yearGraduated: `${new Date().getFullYear()}`,
          lpiiTag: 'LOWLAND',
          batchYear: new Date().getFullYear(),
          documentsSubmitted: ['NSRP Form 1'],
          employmentStatus: 'Unemployed',
          is4ps: false,
          hasDisability: false,
          skills: [],
          sourceFile: file.name,
          pageRange: group.pageRange,
          rawOcrText: '',
          validationErrors: [`OCR Error: ${err.message || 'Could not extract'}`],
          isValid: false,
        })
      }
    }

    notify({
      stage: 'completed',
      currentPage: totalPages,
      totalPages,
      progressPercent: 100,
      statusMessage: `Completed! Successfully processed ${parsedApplicants.length} applicants from ${totalPages} pages.`,
      detectedApplicantsCount: parsedApplicants.length,
    })

    return parsedApplicants
  },
}
