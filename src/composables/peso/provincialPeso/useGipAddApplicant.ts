import { ref, computed, watch } from 'vue'
import { useGipStore } from '@/stores/peso/provincialPeso/gipStore'
import {
  AGSUR_MUNICIPALITIES,
  inferLpiiCategory,
} from '@/helpers/peso/provincialPeso/excelImportHelper'
import { GIP_DOCUMENT_OPTIONS } from '@/helpers/peso/provincialPeso/gipHelper'

export function useGipAddApplicant() {
  const store = useGipStore()
  const currentYear = new Date().getFullYear()

  const initialFormState = () => ({
    surname: '',
    firstName: '',
    middleName: '',
    suffix: '',
    sex: 'Male',
    dateOfBirth: '',
    age: null as number | null,
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
    documentsSubmitted: ['NSRP Form 1', 'Resume / Bio-Data'],
    employmentStatus: 'Unemployed',
    is4ps: false,
    hasDisability: false,
    skills: 'Computer Literacy, Data Entry',
  })

  const form = ref(initialFormState())

  // Auto-calculate age when dateOfBirth changes
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

  // Auto-compute LPII category based on location
  const computedLpiiTag = computed(() => {
    return inferLpiiCategory(form.value.municipality, form.value.barangay)
  })

  const isFormValid = computed(() => {
    return (
      form.value.surname.trim() !== '' &&
      form.value.firstName.trim() !== '' &&
      form.value.municipality.trim() !== '' &&
      form.value.barangay.trim() !== '' &&
      form.value.course.trim() !== ''
    )
  })

  const toggleDocument = (doc: string) => {
    const index = form.value.documentsSubmitted.indexOf(doc)
    if (index >= 0) {
      form.value.documentsSubmitted.splice(index, 1)
    } else {
      form.value.documentsSubmitted.push(doc)
    }
  }

  const resetForm = () => {
    form.value = initialFormState()
  }

  const handleSubmit = async () => {
    if (!isFormValid.value) return

    const payload = {
      ...form.value,
      lpiiTag: computedLpiiTag.value,
      skills: form.value.skills
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean),
    }

    await store.createSingleApplicant(payload)
    resetForm()
  }

  const handleClose = () => {
    store.closeAddApplicantModal()
  }

  return {
    form,
    computedLpiiTag,
    isFormValid,
    isSubmitting: computed(() => store.isSubmitting),
    isOpen: computed({
      get: () => store.isAddApplicantModalOpen,
      set: (val: boolean) => {
        if (!val) store.closeAddApplicantModal()
        else store.openAddApplicantModal()
      },
    }),
    municipalities: AGSUR_MUNICIPALITIES,
    documentOptions: GIP_DOCUMENT_OPTIONS,
    toggleDocument,
    handleSubmit,
    handleClose,
    resetForm,
  }
}
