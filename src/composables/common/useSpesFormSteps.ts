import { reactive, ref, watch } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import {
  calculateSpesAge,
  createEmptySpesFormValues,
  SPES_FORM_STEP_FIELDS,
  spesFormSchema,
  type SpesFormDraft,
  type SpesFormField,
  type SpesFormValues,
} from '@/helpers/common/spesFormHelper'
import {
  SPES_ATTACHMENT_ACCEPT,
  SPES_ATTACHMENT_MAX_BYTES,
  SPES_ATTACHMENT_MIME_TYPES,
  SPES_AVAILMENT_SLOTS,
  SPES_CIVIL_STATUS_OPTIONS,
  SPES_DOCUMENT_REQUIREMENTS,
  SPES_EDUCATION_LEVELS,
  SPES_PARENTS_STATUS_OPTIONS,
  SPES_SEX_OPTIONS,
  SPES_STUDENT_CATEGORY_OPTIONS,
  type SpesDocumentAttachmentMap,
  type SpesDocumentKey,
  type SpesParentsStatus,
  type SpesPendingAttachmentMap,
} from '@/types/common/spesForm'

const REQUIREMENTS_STEP = 4

export const SPES_FORM_STEPS = [
  { step: 1, title: 'Personal Information', description: 'Name, birth, contact & address' },
  { step: 2, title: 'Parents / Guardian', description: "Father's and mother's details" },
  { step: 3, title: 'Educational Background', description: 'Schools attended per level' },
  { step: 4, title: 'Requirements & History', description: 'Documents, skills & past SPES' },
  { step: 5, title: 'Review & Submit', description: 'Check the answers and submit' },
] as const

/**
 * Shared vee-validate form + step navigation for the SPES application form
 * (`applicants.spes_form`). Used by the applicant self-service page and the
 * PESO staff entry page, which each add their own load/save logic.
 */
export function useSpesFormSteps(options: {
  /** Every checked documentary requirement needs an image / PDF (applicant self-service). */
  requireAttachments?: boolean
} = {}) {
  const { handleSubmit, resetForm, setFieldValue, validateField, values, errors } = useForm({
    validationSchema: toTypedSchema(spesFormSchema),
    initialValues: createEmptySpesFormValues(),
  })

  // ─── Requirement attachments ───
  /** Files already saved for the form, per requirement. */
  const attachments = ref<SpesDocumentAttachmentMap>({})
  /** Files picked in this session, uploaded by the parent after the form is saved. */
  const pendingAttachments = ref<SpesPendingAttachmentMap>({})
  const attachmentErrors = reactive<Partial<Record<SpesDocumentKey, string>>>({})
  const isAttachmentRequired = !!options.requireAttachments

  const hasAttachment = (key: SpesDocumentKey) => !!pendingAttachments.value[key] || !!attachments.value[key]

  const selectAttachment = (key: SpesDocumentKey, file: File | null | undefined) => {
    delete attachmentErrors[key]
    if (!file) return
    if (!(SPES_ATTACHMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
      attachmentErrors[key] = 'Upload an image (JPG, PNG, WEBP) or a PDF file.'
      return
    }
    if (file.size > SPES_ATTACHMENT_MAX_BYTES) {
      attachmentErrors[key] = `The file must be ${SPES_ATTACHMENT_MAX_BYTES / 1024 / 1024} MB or smaller.`
      return
    }
    pendingAttachments.value = { ...pendingAttachments.value, [key]: file }
  }

  const clearPendingAttachment = (key: SpesDocumentKey) => {
    const { [key]: _removed, ...rest } = pendingAttachments.value
    pendingAttachments.value = rest
    delete attachmentErrors[key]
  }

  /** Checked requirements are only valid with a file when attachments are required. */
  const validateAttachments = (): boolean => {
    let valid = true
    for (const doc of SPES_DOCUMENT_REQUIREMENTS) {
      if (attachmentErrors[doc.key] && hasAttachment(doc.key)) delete attachmentErrors[doc.key]
      if (isAttachmentRequired && values[doc.key] && !hasAttachment(doc.key)) {
        attachmentErrors[doc.key] = 'Attach an image or PDF of this document.'
        valid = false
      }
    }
    return valid
  }

  /** Replaces the saved attachments and drops any picked but unsaved files. */
  const loadAttachments = (saved: SpesDocumentAttachmentMap) => {
    attachments.value = saved
    pendingAttachments.value = {}
    for (const key of Object.keys(attachmentErrors) as SpesDocumentKey[]) delete attachmentErrors[key]
  }

  // Unchecking a requirement discards its picked file and error
  for (const doc of SPES_DOCUMENT_REQUIREMENTS) {
    watch(
      () => values[doc.key],
      (checked) => {
        if (!checked) clearPendingAttachment(doc.key)
      }
    )
  }

  // ─── Steps ───
  const currentStep = ref(1)

  const validateStep = async (stepNum: number): Promise<boolean> => {
    const fields = SPES_FORM_STEP_FIELDS[stepNum] ?? []
    const results = await Promise.all(fields.map((field) => validateField(field)))
    const attachmentsValid = stepNum === REQUIREMENTS_STEP ? validateAttachments() : true
    return results.every((result) => result.valid) && attachmentsValid
  }

  const nextStep = async () => {
    if (currentStep.value < SPES_FORM_STEPS.length && (await validateStep(currentStep.value))) currentStep.value++
  }

  const prevStep = () => {
    if (currentStep.value > 1) currentStep.value--
  }

  /** Going back is always allowed; going forward only past valid steps. */
  const goToStep = async (stepNum: number) => {
    if (stepNum < currentStep.value) {
      currentStep.value = stepNum
      return
    }
    for (let step = currentStep.value; step < stepNum; step++) {
      if (!(await validateStep(step))) {
        currentStep.value = step
        return
      }
    }
    currentStep.value = stepNum
  }

  // ─── Derived fields ───
  watch(
    () => values.date_of_birth,
    (dob) => setFieldValue('age', calculateSpesAge(dob))
  )

  const isPermanentSameAsPresent = ref(false)
  watch([isPermanentSameAsPresent, () => values.present_address], ([same, present]) => {
    if (same) setFieldValue('permanent_address', present ?? '')
  })

  const toggleParentsStatus = (option: SpesParentsStatus, checked: boolean) => {
    const current = values.parents_status ?? []
    setFieldValue(
      'parents_status',
      checked ? [...new Set([...current, option])] : current.filter((status) => status !== option)
    )
  }

  // ─── Special skills (tag input) ───
  const skillInput = ref('')
  const addSkill = () => {
    const skill = skillInput.value.trim()
    if (!skill) return
    const current = values.special_skills ?? []
    if (!current.some((s) => s.toLowerCase() === skill.toLowerCase())) {
      setFieldValue('special_skills', [...current, skill])
    }
    skillInput.value = ''
  }
  const removeSkill = (skill: string) => {
    setFieldValue('special_skills', (values.special_skills ?? []).filter((s) => s !== skill))
  }

  // ─── Load ───
  /** Replaces the form values and returns to the first step. */
  const loadValues = (draft: SpesFormDraft) => {
    resetForm({ values: draft })
    isPermanentSameAsPresent.value = !!draft.present_address && draft.present_address === draft.permanent_address
    skillInput.value = ''
    currentStep.value = 1
  }

  // ─── Submit ───
  const hasCertified = ref(false)
  const certificationError = ref<string | null>(null)

  const stepOfField = (field: string) =>
    Number(
      Object.entries(SPES_FORM_STEP_FIELDS).find(([, fields]) => fields.includes(field as SpesFormField))?.[0] ?? 1
    )

  /**
   * Builds the submit handler: validates every step, requires the certification
   * checkbox, then calls `onValid`. On failure it jumps to the first invalid step.
   */
  const createSubmitHandler = (onValid: (formValues: SpesFormValues) => Promise<void> | void) =>
    handleSubmit(
      async (formValues) => {
        certificationError.value = null
        if (!validateAttachments()) {
          currentStep.value = REQUIREMENTS_STEP
          return
        }
        if (!hasCertified.value) {
          certificationError.value = 'Certify that the information provided is true and correct.'
          return
        }
        await onValid(formValues)
      },
      ({ errors: invalid }) => {
        const steps = Object.keys(invalid).map(stepOfField)
        if (steps.length) currentStep.value = Math.min(...steps)
      }
    )

  return {
    values,
    errors,
    setFieldValue,
    loadValues,
    createSubmitHandler,
    // steps
    steps: SPES_FORM_STEPS,
    currentStep,
    nextStep,
    prevStep,
    goToStep,
    // field helpers
    isPermanentSameAsPresent,
    toggleParentsStatus,
    skillInput,
    addSkill,
    removeSkill,
    hasCertified,
    certificationError,
    // requirement attachments
    attachments,
    pendingAttachments,
    attachmentErrors,
    isAttachmentRequired,
    hasAttachment,
    selectAttachment,
    clearPendingAttachment,
    loadAttachments,
    attachmentAccept: SPES_ATTACHMENT_ACCEPT,
    // options
    sexOptions: SPES_SEX_OPTIONS,
    civilStatusOptions: SPES_CIVIL_STATUS_OPTIONS,
    studentCategoryOptions: SPES_STUDENT_CATEGORY_OPTIONS,
    parentsStatusOptions: SPES_PARENTS_STATUS_OPTIONS,
    educationLevels: SPES_EDUCATION_LEVELS,
    availmentSlots: SPES_AVAILMENT_SLOTS,
    documentRequirements: SPES_DOCUMENT_REQUIREMENTS,
  }
}

export type SpesFormSteps = ReturnType<typeof useSpesFormSteps>
