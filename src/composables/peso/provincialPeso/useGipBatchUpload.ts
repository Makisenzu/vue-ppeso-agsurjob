import { ref, shallowRef, computed } from 'vue'
import { useGipStore } from '@/stores/peso/provincialPeso/gipStore'
import { useToastAlert } from '@/composables/common/useToastAlert'
import type {
  NsrpParsedApplicant,
  OcrProgressState,
} from '@/types/peso/provincialPeso/nsrpOcr'
import type {
  DuplicateResolutionAction,
  DuplicateResolutionChoice,
} from '@/types/peso/provincialPeso/applicantEntry'
import {
  downloadGipApplicantsExcelTemplate,
  parseApplicantsExcelFile,
} from '@/helpers/peso/provincialPeso/excelImportHelper'
import { ocrService } from '@/services/peso/provincialPeso/ocrService'
import { applicantEntryService } from '@/services/peso/provincialPeso/applicantEntryService'

export function useGipBatchUpload() {
  const store = useGipStore()
  const toastAlert = useToastAlert()

  const isDragging = ref<boolean>(false)
  const isParsing = ref<boolean>(false)
  const uploadedFile = ref<File | null>(null)
  const parsedApplicants = shallowRef<NsrpParsedApplicant[]>([])
  const selectedCandidate = shallowRef<NsrpParsedApplicant | null>(null)

  // Duplicate Resolution Modal State
  const duplicateCandidate = shallowRef<NsrpParsedApplicant | null>(null)
  const duplicateCandidateIndex = ref<number>(-1)
  const isDuplicateModalOpen = ref<boolean>(false)

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
  const validApplicantsCount = computed<number>(
    () => parsedApplicants.value.filter((a) => a.isValid !== false && a.resolutionAction !== 'skip').length
  )
  const invalidApplicantsCount = computed<number>(
    () => parsedApplicants.value.filter((a) => a.isValid === false).length
  )
  const duplicatesCount = computed<number>(
    () => parsedApplicants.value.filter((a) => !!a.existingMatch).length
  )
  const skippedCount = computed<number>(
    () => parsedApplicants.value.filter((a) => a.resolutionAction === 'skip').length
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
   * Run duplicate check against applicants.applicants table for extracted candidate batch
   */
  const checkBatchDuplicates = async (candidates: NsrpParsedApplicant[]) => {
    try {
      const matchMap = await applicantEntryService.checkApplicantsBatchExists(
        candidates.map((c) => ({
          firstName: c.firstName,
          surname: c.surname,
          middleName: c.middleName,
          dateOfBirth: c.dateOfBirth,
        }))
      )

      candidates.forEach((cand, idx) => {
        const match = matchMap.get(idx)
        if (match) {
          cand.existingMatch = match
          // Default action is to link program to GIP
          cand.resolutionAction = 'link_program'
          cand.selectedProgram = 'GIP'
        }
      })

      if (matchMap.size > 0) {
        toastAlert.info(
          'Existing Records Detected',
          `Found ${matchMap.size} applicant(s) already registered. Set to link to GIP by default.`
        )
      }
    } catch (checkErr: any) {
      console.error('[useGipBatchUpload] Batch duplicate check error:', checkErr)
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
   * Parses Excel file rows into structured applicants and checks duplicates.
   */
  const processExcel = async (file: File) => {
    isParsing.value = true
    try {
      const result = await parseApplicantsExcelFile(file)
      await checkBatchDuplicates(result)
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
   * Runs OCR on multi-page NSRP Form 1 PDF document and checks duplicates.
   */
  const processPdfOcr = async (file: File) => {
    isParsing.value = true
    ocrProgress.value.isProcessing = true
    try {
      const result = await ocrService.processNsrpPdf(file, (prog) => {
        ocrProgress.value = { ...prog }
      })
      await checkBatchDuplicates(result)
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

  const editingCandidate = ref<NsrpParsedApplicant | null>(null)
  const editingCandidateIndex = ref<number>(-1)
  const isEditModalOpen = ref<boolean>(false)

  const openEditCandidateModal = (candidate: NsrpParsedApplicant, index: number) => {
    editingCandidate.value = { ...candidate }
    editingCandidateIndex.value = index
    isEditModalOpen.value = true
  }

  const closeEditCandidateModal = () => {
    isEditModalOpen.value = false
    editingCandidate.value = null
    editingCandidateIndex.value = -1
  }

  const saveEditedCandidate = async (updated: NsrpParsedApplicant, index: number) => {
    if (parsedApplicants.value[index]) {
      // Re-check single duplicate if names or DOB changed
      const oldCand = parsedApplicants.value[index]
      if (
        oldCand.firstName !== updated.firstName ||
        oldCand.surname !== updated.surname ||
        oldCand.dateOfBirth !== updated.dateOfBirth
      ) {
        const match = await applicantEntryService.checkApplicantExists({
          firstName: updated.firstName,
          surname: updated.surname,
          middleName: updated.middleName,
          dateOfBirth: updated.dateOfBirth,
        })
        updated.existingMatch = match
        if (match && !updated.resolutionAction) {
          updated.resolutionAction = 'link_program'
          updated.selectedProgram = 'GIP'
        }
      }

      parsedApplicants.value[index] = { ...updated }
      parsedApplicants.value = [...parsedApplicants.value]
      toastAlert.success('Candidate Updated', `Information for ${updated.firstName} ${updated.surname} has been updated.`)
    }
  }

  const removeCandidate = (index: number) => {
    parsedApplicants.value.splice(index, 1)
    parsedApplicants.value = [...parsedApplicants.value]
  }

  const updateCandidate = (index: number, updated: NsrpParsedApplicant) => {
    saveEditedCandidate(updated, index)
  }

  // Duplicate Resolution Dialog Handlers
  const openDuplicateModal = (candidate: NsrpParsedApplicant, index: number) => {
    duplicateCandidate.value = candidate
    duplicateCandidateIndex.value = index
    isDuplicateModalOpen.value = true
  }

  const closeDuplicateModal = () => {
    isDuplicateModalOpen.value = false
    duplicateCandidate.value = null
    duplicateCandidateIndex.value = -1
  }

  const resolveDuplicate = (choice: DuplicateResolutionChoice) => {
    const idx = duplicateCandidateIndex.value
    if (idx >= 0 && parsedApplicants.value[idx]) {
      parsedApplicants.value[idx].resolutionAction = choice.action
      parsedApplicants.value[idx].selectedProgram = choice.targetProgram
      parsedApplicants.value = [...parsedApplicants.value]

      const cand = parsedApplicants.value[idx]
      const actionLabels: Record<DuplicateResolutionAction, string> = {
        link_program: `Link to ${choice.targetProgram}`,
        create_new: 'Create New Record',
        skip: 'Skipped from Import',
      }
      toastAlert.info(
        'Resolution Set',
        `${cand.firstName} ${cand.surname}: ${actionLabels[choice.action] || choice.action}.`
      )
    }
    closeDuplicateModal()
  }

  /**
   * Set bulk action for all detected duplicates (e.g. bulk link or bulk skip)
   */
  const setAllDuplicatesAction = (action: DuplicateResolutionAction, program = 'GIP') => {
    parsedApplicants.value.forEach((cand) => {
      if (cand.existingMatch) {
        cand.resolutionAction = action
        cand.selectedProgram = program
      }
    })
    parsedApplicants.value = [...parsedApplicants.value]
    toastAlert.success(
      'Bulk Resolution Applied',
      `All duplicate candidates set to ${action === 'link_program' ? `Link to ${program}` : action}.`
    )
  }

  const confirmImport = async () => {
    if (parsedApplicants.value.length === 0) return
    // Only import records that are not skipped
    const toImport = parsedApplicants.value.filter((a) => a.resolutionAction !== 'skip')
    if (toImport.length === 0) {
      toastAlert.info('No Applicants to Import', 'All candidates were skipped.')
      return
    }
    await store.batchImportApplicants(toImport)
    resetBatchState()
  }

  const resetBatchState = () => {
    uploadedFile.value = null
    parsedApplicants.value = []
    selectedCandidate.value = null
    editingCandidate.value = null
    editingCandidateIndex.value = -1
    isEditModalOpen.value = false
    duplicateCandidate.value = null
    duplicateCandidateIndex.value = -1
    isDuplicateModalOpen.value = false
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
    editingCandidate,
    editingCandidateIndex,
    isEditModalOpen,
    duplicateCandidate,
    duplicateCandidateIndex,
    isDuplicateModalOpen,
    ocrProgress,
    validApplicantsCount,
    invalidApplicantsCount,
    duplicatesCount,
    skippedCount,
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
    openEditCandidateModal,
    closeEditCandidateModal,
    saveEditedCandidate,
    openDuplicateModal,
    closeDuplicateModal,
    resolveDuplicate,
    setAllDuplicatesAction,
    confirmImport,
    resetBatchState,
    downloadTemplate,
  }
}
