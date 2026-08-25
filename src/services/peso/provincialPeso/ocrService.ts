import * as pdfjsLib from 'pdfjs-dist'
import { createWorker } from 'tesseract.js'
import type { LpiiCategory } from '@/types/peso/provincialPeso/gip'
import type { NsrpParsedApplicant, OcrProgressState } from '@/types/peso/provincialPeso/nsrpOcr'
import { parseNsrpTwoPageText } from '@/helpers/peso/provincialPeso/nsrpOcrHelper'

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Configure PDF.js worker
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker
}

export type OcrProgressCallback = (progress: OcrProgressState) => void

export const ocrService = {
  /**
   * Reads a multi-page PDF document, groups pages into 2-page NSRP Form 1 documents,
   * performs text extraction or scanned image OCR, and parses structured applicant records.
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
      statusMessage: `Reading PDF document: ${file.name}...`,
    })

    const fileBuffer = await file.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ data: fileBuffer })
    const pdfDoc = await loadingTask.promise
    const totalPages = pdfDoc.numPages

    if (totalPages === 0) {
      throw new Error('The uploaded PDF has no readable pages.')
    }

    const estimatedApplicants = Math.ceil(totalPages / 2)

    notify({
      stage: 'rendering_pages',
      currentPage: 1,
      totalPages,
      progressPercent: 10,
      statusMessage: `PDF loaded (${totalPages} pages, ~${estimatedApplicants} NSRP applicants detected). Initializing OCR engine...`,
    })

    // Initialize Tesseract worker for fallback/scanned image OCR
    let tesseractWorker: any = null
    const getWorker = async () => {
      if (!tesseractWorker) {
        tesseractWorker = await createWorker('eng')
      }
      return tesseractWorker
    }

    const extractedPageTexts: string[] = []

    try {
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum)
        const progressBase = 10 + Math.floor(((pageNum - 1) / totalPages) * 75)

        notify({
          stage: 'ocr_running',
          currentPage: pageNum,
          totalPages,
          progressPercent: progressBase,
          statusMessage: `Extracting page ${pageNum} of ${totalPages}...`,
          detectedApplicantsCount: Math.floor((pageNum - 1) / 2),
        })

        // Step A: Attempt selectable text extraction first
        const textContent = await page.getTextContent()
        const textItems = textContent.items
          .map((item: any) => ('str' in item ? item.str : ''))
          .filter(Boolean)
        const directText = textItems.join(' ').trim()

        // If direct selectable text is substantial, use it immediately
        if (directText.length > 120 && (directText.includes('NSRP') || directText.includes('PERSONAL') || directText.includes('NAME') || directText.includes('DOLE') || directText.includes('PESO'))) {
          extractedPageTexts.push(directText)
          continue
        }

        // Step B: If page is a scanned image, render to Canvas at 2x scale and run Tesseract OCR
        notify({
          stage: 'ocr_running',
          currentPage: pageNum,
          totalPages,
          progressPercent: progressBase + 2,
          statusMessage: `Scanning image on page ${pageNum} using OCR engine...`,
        })

        const viewport = page.getViewport({ scale: 2.0 })
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        canvas.width = viewport.width
        canvas.height = viewport.height

        if (context) {
          await page.render({ canvasContext: context, viewport, canvas } as any).promise

          const worker = await getWorker()
          const { data } = await worker.recognize(canvas)
          const ocrText = (data?.text || directText).trim()
          extractedPageTexts.push(ocrText)
        } else {
          extractedPageTexts.push(directText)
        }
      }
    } finally {
      if (tesseractWorker) {
        await tesseractWorker.terminate()
      }
    }

    notify({
      stage: 'parsing_fields',
      currentPage: totalPages,
      totalPages,
      progressPercent: 90,
      statusMessage: 'Parsing NSRP Form 1 applicant fields and LPII ecosystem tagging...',
      detectedApplicantsCount: estimatedApplicants,
    })

    // Step C: Group 2 pages per applicant and parse structured fields
    const parsedApplicants: NsrpParsedApplicant[] = []

    for (let i = 0; i < extractedPageTexts.length; i += 2) {
      const page1 = extractedPageTexts[i] || ''
      const page2 = extractedPageTexts[i + 1] || ''
      const applicantIndex = Math.floor(i / 2)

      const parsed = parseNsrpTwoPageText(
        page1,
        page2,
        applicantIndex,
        file.name,
        barangayTagMap
      )
      parsedApplicants.push(parsed)
    }

    notify({
      stage: 'completed',
      currentPage: totalPages,
      totalPages,
      progressPercent: 100,
      statusMessage: `OCR completed successfully! Found ${parsedApplicants.length} applicant records.`,
      detectedApplicantsCount: parsedApplicants.length,
    })

    return parsedApplicants
  },
}
