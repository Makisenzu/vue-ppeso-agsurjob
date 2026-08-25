import { ref, computed } from 'vue'
import { useGipStore } from '@/stores/peso/provincialPeso/gipStore'
import { useToastAlert } from '@/composables/common/useToastAlert'
import type {
  NsrpParsedApplicant,
  OcrProgressState,
} from '@/types/peso/provincialPeso/nsrpOcr'
import {
  downloadGipApplicantsExcelTemplate,
  parseApplicantsExcelFile,
} from '@/helpers/peso/provincialPeso/excelImportHelper'
import { ocrService } from '@/services/peso/provincialPeso/ocrService'

export function useGipBatchUpload() {
  const store = useGipStore()
  const toastAlert = useToastAlert()

  const isDragging = ref<boolean>(false)
  const isParsing = ref<boolean>(false)
  const uploadedFile = ref<File | null>(null)
  const parsedApplicants = ref<NsrpParsedApplicant[]>([])
  const selectedCandidate = ref<NsrpParsedApplicant | null>(null)

  const ocrProgress = ref<OcrProgressState>({
    isProcessing: false,
    stage: 'idle',
    currentPage: 0,
    totalPages: 0,
    progressPercent: 0,
    statusMessage: '',
    detectedApplicantsCount: 0,
  })

  // Computed summary metrics
  const validApplicantsCount = computed(
    () => parsedApplicants.value.filter((a) => a.isValid !== false).length
  )
  const invalidApplicantsCount = computed(
    () => parsedApplicants.value.filter((a) => a.isValid === false).length
  )

  const hasParsedData = computed(() => parsedApplicants.value.length > 0)

  // Drag & Drop Handlers
  const onDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isDragging.value = true
  }

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isDragging.value = false
  }

  const onDrop = async (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isDragging.value = false

    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      await processSelectedFile(files[0])
    }
  }

  const onFileInputChange = async (e: Event) => {
    const target = e.target as HTMLInputElement
    if (target.files && target.files.length > 0) {
      await processSelectedFile(target.files[0])
    }
  }

  /**
   * Dispatches file to Excel parser or NSRP PDF OCR engine based on extension.
   */
  const processSelectedFile = async (file: File) => {
    uploadedFile.value = file
    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
      await processExcel(file)
    } else if (ext === 'pdf') {
      await processPdfOcr(file)
    } else {
      toastAlert.error(
        'Unsupported File Format',
        'Please upload an Excel spreadsheet (.xlsx, .xls, .csv) or a PDF document (.pdf).'
      )
    }
  }

  /**
   * Parses Excel file rows into structured applicants.
   */
  const processExcel = async (file: File) => {
    isParsing.value = true
    try {
      const result = await parseApplicantsExcelFile(file)
      parsedApplicants.value = result
      toastAlert.success(
        'Excel File Parsed',
        `Extracted ${result.length} applicant records from ${file.name}.`
      )
    } catch (err: any) {
      toastAlert.error('Excel Parsing Failed', err.message || 'Could not parse Excel spreadsheet.')
    } finally {
      isParsing.value = false
    }
  }

  /**
   * Runs OCR on multi-page NSRP Form 1 PDF document.
   */
  const processPdfOcr = async (file: File) => {
    isParsing.value = true
    ocrProgress.value.isProcessing = true
    try {
      const result = await ocrService.processNsrpPdf(file, (prog) => {
        ocrProgress.value = { ...prog }
      })
      parsedApplicants.value = result
      toastAlert.success(
        'OCR Completed',
        `Extracted ${result.length} applicants from NSRP scanned PDF document.`
      )
    } catch (err: any) {
      toastAlert.error('OCR Processing Error', err.message || 'Failed to extract text from PDF.')
    } finally {
      isParsing.value = false
      ocrProgress.value.isProcessing = false
    }
  }

  const removeCandidate = (index: number) => {
    parsedApplicants.value.splice(index, 1)
  }

  const updateCandidate = (index: number, updated: NsrpParsedApplicant) => {
    if (parsedApplicants.value[index]) {
      parsedApplicants.value[index] = { ...updated }
    }
  }

  const confirmImport = async () => {
    if (parsedApplicants.value.length === 0) return
    await store.batchImportApplicants(parsedApplicants.value)
    resetBatchState()
  }

  const resetBatchState = () => {
    uploadedFile.value = null
    parsedApplicants.value = []
    selectedCandidate.value = null
    ocrProgress.value = {
      isProcessing: false,
      stage: 'idle',
      currentPage: 0,
      totalPages: 0,
      progressPercent: 0,
      statusMessage: '',
      detectedApplicantsCount: 0,
    }
  }

  const downloadTemplate = () => {
    try {
      downloadGipApplicantsExcelTemplate()
      toastAlert.success('Template Downloaded', 'GIP Applicants Batch Template has been saved.')
    } catch {
      toastAlert.error('Download Failed', 'Could not generate Excel template.')
    }
  }

  return {
    isDragging,
    isParsing,
    uploadedFile,
    parsedApplicants,
    selectedCandidate,
    ocrProgress,
    validApplicantsCount,
    invalidApplicantsCount,
    hasParsedData,
    isSubmitting: store.isSubmitting,
    isOpen: computed({
      get: () => store.isBatchUploadModalOpen,
      set: (val: boolean) => {
        if (!val) {
          store.closeBatchUploadModal()
          resetBatchState()
        } else {
          store.openBatchUploadModal()
        }
      },
    }),
    onDragOver,
    onDragLeave,
    onDrop,
    onFileInputChange,
    processSelectedFile,
    removeCandidate,
    updateCandidate,
    confirmImport,
    resetBatchState,
    downloadTemplate,
  }
}
