import { ref, computed, watch } from 'vue'
import type { NsrpParsedApplicant } from '@/types/peso/provincialPeso/nsrpOcr'
import type { LpiiCategory } from '@/types/peso/provincialPeso/gip'
import {
  AGSUR_MUNICIPALITIES,
  inferLpiiCategory,
} from '@/helpers/peso/provincialPeso/excelImportHelper'
import { GIP_DOCUMENT_OPTIONS } from '@/helpers/peso/provincialPeso/gipHelper'

interface EditCandidateProps {
  open: boolean
  candidate: NsrpParsedApplicant | null
  index: number
}

type EditCandidateEmit = {
  (e: 'update:open', val: boolean): void
  (e: 'save', updated: NsrpParsedApplicant, index: number): void
}

export function useGipEditCandidate(
  props: EditCandidateProps,
  emit: EditCandidateEmit
) {
  const currentYear = new Date().getFullYear()

  const defaultCandidateState = (): NsrpParsedApplicant => ({
    surname: '',
    firstName: '',
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
    course: 'BS Information Technology',
    yearGraduated: `${currentYear}`,
    batchYear: currentYear,
    lpiiTag: 'LOWLAND',
    documentsSubmitted: ['NSRP Form 1', 'Resume / Bio-Data', 'PDS', 'Birth Certficate'],
    employmentStatus: 'Unemployed',
    is4ps: false,
    hasDisability: false,
    skills: ['Computer Literacy', 'Communication', 'Dancing'],
    validationErrors: [],
    isValid: true,
  })

  const form = ref<NsrpParsedApplicant>(defaultCandidateState())
  const manualLpiiOverride = ref<boolean>(false)
  const skillsInput = ref<string>('')

  // Sync state whenever selected candidate prop updates
  watch(
    () => props.candidate,
    (newCandidate) => {
      if (newCandidate) {
        form.value = JSON.parse(JSON.stringify(newCandidate))
        skillsInput.value = (newCandidate.skills || []).join(', ')
        manualLpiiOverride.value = false
      }
    },
    { immediate: true }
  )

  // Auto-calculate age from dateOfBirth
  watch(
    () => form.value.dateOfBirth,
    (newDob) => {
      if (newDob) {
        const birthYear = new Date(newDob).getFullYear()
        if (!isNaN(birthYear) && birthYear > 1940 && birthYear <= currentYear) {
          form.value.age = currentYear - birthYear
        }
      }
    }
  )

  // Auto-compute LPII if not manually overridden
  watch(
    [() => form.value.municipality, () => form.value.barangay],
    ([newMuni, newBrgy]) => {
      if (!manualLpiiOverride.value && newMuni && newBrgy) {
        form.value.lpiiTag = inferLpiiCategory(newMuni, newBrgy)
      }
    }
  )

  const setLpiiCategory = (cat: LpiiCategory) => {
    manualLpiiOverride.value = true
    form.value.lpiiTag = cat
  }

  const toggleDocument = (doc: string) => {
    if (!form.value.documentsSubmitted) {
      form.value.documentsSubmitted = []
    }
    const idx = form.value.documentsSubmitted.indexOf(doc)
    if (idx >= 0) {
      form.value.documentsSubmitted.splice(idx, 1)
    } else {
      form.value.documentsSubmitted.push(doc)
    }
  }

  // Pure validation check
  const validationErrors = computed<string[]>(() => {
    const errors: string[] = []
    if (!form.value.surname || !form.value.surname.trim()) {
      errors.push('Surname is required')
    }
    if (!form.value.firstName || !form.value.firstName.trim()) {
      errors.push('First name is required')
    }
    if (!form.value.municipality || !form.value.municipality.trim()) {
      errors.push('Municipality is required')
    }
    if (!form.value.barangay || !form.value.barangay.trim()) {
      errors.push('Barangay is required')
    }
    if (!form.value.course || !form.value.course.trim()) {
      errors.push('Academic Course / Degree is required')
    }
    return errors
  })

  const isValid = computed(() => validationErrors.value.length === 0)

  const handleSave = () => {
    const parsedSkills = skillsInput.value
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)

    const updatedRecord: NsrpParsedApplicant = {
      ...form.value,
      surname: form.value.surname.trim(),
      firstName: form.value.firstName.trim(),
      middleName: (form.value.middleName || '').trim(),
      suffix: (form.value.suffix || '').trim(),
      municipality: form.value.municipality.trim(),
      barangay: form.value.barangay.trim(),
      houseStreet: (form.value.houseStreet || '').trim(),
      course: form.value.course.trim(),
      skills: parsedSkills.length > 0 ? parsedSkills : ['Computer Literacy'],
      validationErrors: validationErrors.value,
      isValid: isValid.value,
    }

    emit('save', updatedRecord, props.index)
    emit('update:open', false)
  }

  const handleClose = () => {
    emit('update:open', false)
  }

  return {
    form,
    skillsInput,
    validationErrors,
    isValid,
    municipalities: AGSUR_MUNICIPALITIES,
    documentOptions: GIP_DOCUMENT_OPTIONS,
    setLpiiCategory,
    toggleDocument,
    handleSave,
    handleClose,
  }
}
