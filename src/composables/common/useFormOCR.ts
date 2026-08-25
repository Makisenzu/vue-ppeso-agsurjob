// ==============================================================================
// Composable: useFormOCR.ts
// Description: Vue 3 Composable for handling handwritten form upload,
//              Gemini Vision OCR extraction, and interactive form editing.
// ==============================================================================

import { ref, reactive } from 'vue'
import { ocrVisionService } from '@/services/common/ocrVisionService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { optimizeImageForOcr, convertPdfPageToOptimizedImage } from '@/helpers/common/imageOptimizer'
import type { ApplicantFormOcrData, OcrState } from '@/types/common/ocrVision'

const defaultFormData = (): ApplicantFormOcrData => ({
  personalInfo: {
    surname: '',
    firstName: '',
    middleName: '',
    suffix: '',
    sex: '',
    dateOfBirth: '',
    age: null,
    civilStatus: '',
    religion: '',
    tin: '',
    sss: '',
    philhealth: '',
    contactNumber: '',
    email: '',
    address: {
      houseStreet: '',
      barangay: '',
      municipality: '',
      province: 'Agusan del Sur',
    },
  },
  education: {
    educationalLevel: '',
    course: '',
    school: '',
    yearGraduated: '',
  },
  workExperience: [],
  skills: [],
  otherDetails: {
    is4ps: false,
    hasDisability: false,
    employmentStatus: '',
    preferredOccupations: [],
  },
  confidenceScore: 1,
  extractedNotes: null,
})

const yieldThread = (ms = 15): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

export function useFormOCR() {
  const toast = useToastAlert()

  // File state
  const selectedFile = ref<File | null>(null)
  const previewUrl = ref<string | null>(null)
  const uploadedPath = ref<string | null>(null)
  const savedFormId = ref<string | null>(null)

  // OCR Processing State
  const ocrState = reactive<OcrState>({
    stage: 'idle',
    isUploading: false,
    isExtracting: false,
    progressPercent: 0,
    statusMessage: '',
    errorMessage: null,
  })

  // Extracted & Editable Form State
  const isExtracted = ref<boolean>(false)
  const isSaving = ref<boolean>(false)
  const formData = reactive<ApplicantFormOcrData>(defaultFormData())

  /**
   * Handles user selecting or dropping a file with lightweight, non-blocking optimization
   */
  const handleFileSelect = async (file: File) => {
    if (!file) return

    // Validate mime type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf']
    if (!validTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|pdf)$/i)) {
      toast.error('Invalid File Type', 'Please upload an image (.jpg, .jpeg, .png, .webp) or PDF document.')
      return
    }

    // Validate size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File Too Large', 'Please upload a file smaller than 20MB.')
      return
    }

    ocrState.errorMessage = null
    ocrState.stage = 'idle'
    ocrState.progressPercent = 0

    // Revoke previous object URL if any
    if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl.value)
    }

    // Fast non-blocking image / PDF optimization to prevent laptop freeze
    if (file.type.startsWith('image/')) {
      const optimized = await optimizeImageForOcr(file)
      selectedFile.value = optimized
      previewUrl.value = URL.createObjectURL(optimized)
    } else if (file.type === 'application/pdf' || file.name.match(/\.pdf$/i)) {
      try {
        ocrState.statusMessage = 'Optimizing PDF document...'
        const optimizedPdfImage = await convertPdfPageToOptimizedImage(file, 1)
        selectedFile.value = optimizedPdfImage
        previewUrl.value = URL.createObjectURL(optimizedPdfImage)
      } catch (pdfErr) {
        console.warn('PDF page preview rendering notice, using original PDF:', pdfErr)
        selectedFile.value = file
        previewUrl.value = null
      }
    } else {
      selectedFile.value = file
      previewUrl.value = null
    }
  }


  /**
   * Clears the current file and resets extraction
   */
  const clearFile = () => {
    if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl.value)
    }
    selectedFile.value = null
    previewUrl.value = null
    uploadedPath.value = null
    savedFormId.value = null
    ocrState.stage = 'idle'
    ocrState.isUploading = false
    ocrState.isExtracting = false
    ocrState.progressPercent = 0
    ocrState.statusMessage = ''
    ocrState.errorMessage = null
  }

  /**
   * Executes Vision OCR extraction via Supabase Edge Function
   */
  const runOcrExtraction = async (applicantId?: string) => {
    if (!selectedFile.value) {
      toast.error('No File Selected', 'Please upload or select an applicant form image first.')
      return
    }

    try {
      ocrState.errorMessage = null
      ocrState.isExtracting = true
      ocrState.progressPercent = 15
      ocrState.stage = 'uploading_storage'
      ocrState.statusMessage = 'Preparing document for Vision AI analysis...'
      await yieldThread(20)

      // Step 1: Upload to Supabase Storage (fallback to direct base64 if storage fails)
      let storagePath: string | null = null
      try {
        const uploadResult = await ocrVisionService.uploadFormImage(selectedFile.value)
        storagePath = uploadResult.path
        uploadedPath.value = uploadResult.path
      } catch (uploadErr: any) {
        console.warn('Direct bucket upload notice, attempting base64 pipeline fallback:', uploadErr.message)
      }

      // Step 2: Invoke Edge Function
      ocrState.progressPercent = 45
      ocrState.stage = 'gemini_vision_processing'
      ocrState.statusMessage = 'Google Gemini Vision AI is reading handwriting & form fields...'
      await yieldThread(20)

      let response
      if (storagePath) {
        response = await ocrVisionService.processOcrWithGemini({
          imagePath: storagePath,
          applicantId,
        })
      } else {
        // Fallback: convert directly to base64
        const base64Data = await ocrVisionService.fileToBase64(selectedFile.value)
        response = await ocrVisionService.processOcrWithGemini({
          imageBase64: base64Data,
          mimeType: selectedFile.value.type,
          applicantId,
        })
      }

      ocrState.progressPercent = 90
      ocrState.statusMessage = 'Parsing extracted structured data...'
      await yieldThread(10)

      if (response && response.data) {
        // Deep assign into reactive formData
        const data = response.data
        if (data.personalInfo) {
          Object.assign(formData.personalInfo, {
            ...data.personalInfo,
            address: {
              ...formData.personalInfo.address,
              ...(data.personalInfo.address || {}),
            },
          })
        }
        if (data.education) {
          Object.assign(formData.education, data.education)
        }
        if (Array.isArray(data.workExperience)) {
          formData.workExperience = [...data.workExperience]
        }
        if (Array.isArray(data.skills)) {
          formData.skills = [...data.skills]
        }
        if (data.otherDetails) {
          Object.assign(formData.otherDetails, data.otherDetails)
        }
        if (data.confidenceScore !== undefined) {
          formData.confidenceScore = data.confidenceScore
        }
        formData.extractedNotes = data.extractedNotes || null

        if (response.form_id) {
          savedFormId.value = response.form_id
        }

        isExtracted.value = true
        ocrState.stage = 'completed'
        ocrState.progressPercent = 100
        ocrState.statusMessage = 'Form data extracted successfully!'

        toast.success(
          'OCR Extraction Complete',
          `Successfully extracted details with ${Math.round((formData.confidenceScore || 1) * 100)}% confidence score.`
        )
      } else {
        throw new Error('No structured data returned from Gemini OCR.')
      }
    } catch (err: any) {
      console.error('Vision OCR Error:', err)
      ocrState.stage = 'error'
      ocrState.errorMessage = err.message || 'Failed to extract form data with Gemini OCR.'
      toast.error('OCR Processing Failed', ocrState.errorMessage || 'Please check your GEMINI_API_KEY and try again.')
    } finally {
      ocrState.isExtracting = false
      ocrState.isUploading = false
    }
  }

  /**
   * Saves or confirms the edited form data
   */
  const saveFormData = async (applicantId?: string) => {
    try {
      isSaving.value = true
      await ocrVisionService.saveApplicantFormRecord({
        filePath: uploadedPath.value || 'direct_upload',
        extractedData: formData,
        applicantId,
        formId: savedFormId.value,
      })

      toast.success('Form Saved', 'Applicant data verified and saved to database successfully.')
    } catch (err: any) {
      console.error('Save Form Error:', err)
      toast.error('Failed to Save', err.message || 'Could not save the form record.')
    } finally {
      isSaving.value = false
    }
  }

  /**
   * Helper to add a new empty work experience row
   */
  const addWorkExperience = () => {
    formData.workExperience.push({
      jobTitle: '',
      company: '',
      duration: '',
      description: '',
    })
  }

  /**
   * Helper to remove a work experience row
   */
  const removeWorkExperience = (index: number) => {
    formData.workExperience.splice(index, 1)
  }

  /**
   * Helper to add a skill tag
   */
  const addSkill = (skill: string) => {
    const trimmed = skill.trim()
    if (trimmed && !formData.skills.includes(trimmed)) {
      formData.skills.push(trimmed)
    }
  }

  /**
   * Helper to remove a skill tag
   */
  const removeSkill = (index: number) => {
    formData.skills.splice(index, 1)
  }

  /**
   * Copies formatted JSON to clipboard
   */
  const copyJsonToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(formData, null, 2))
      toast.info('JSON Copied', 'Form data copied to clipboard in JSON format.')
    } catch {
      toast.error('Copy Failed', 'Could not copy to clipboard.')
    }
  }

  /**
   * Resets all form fields and upload state
   */
  const resetAll = () => {
    clearFile()
    isExtracted.value = false
    Object.assign(formData, defaultFormData())
  }

  return {
    // State
    selectedFile,
    previewUrl,
    uploadedPath,
    savedFormId,
    ocrState,
    isExtracted,
    isSaving,
    formData,

    // Methods
    handleFileSelect,
    clearFile,
    runOcrExtraction,
    saveFormData,
    addWorkExperience,
    removeWorkExperience,
    addSkill,
    removeSkill,
    copyJsonToClipboard,
    resetAll,
  }
}
