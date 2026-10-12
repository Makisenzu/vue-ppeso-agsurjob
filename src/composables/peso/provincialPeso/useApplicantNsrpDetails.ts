import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useApplicantEntryStore } from '@/stores/peso/provincialPeso/applicantEntryStore'
import { formatDateDisplay, getInitials } from '@/helpers/peso/provincialPeso/applicantEntryHelper'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { usePsgc } from '@/composables/common/usePsgc'
import type { ApplicantEntryRecord, ApplicantUpdate } from '@/types/peso/provincialPeso/applicantEntry'
import type {
  EducationalBackgroundItem,
  WorkExperienceItem,
  VocationalTrainingItem,
  EligibilityItem,
  LanguageProficiencyItem,
} from '@/types/peso/provincialPeso/applicantEntry'
import {
  DISABILITY_OPTIONS,
  JOB_TYPE_OPTIONS,
  PROGRAM_OPTIONS,
  SKILL_OPTIONS,
} from '@/composables/peso/provincialPeso/useApplicantNewEntry'
import type { PsgcLocationEntity } from '@/composables/peso/provincialPeso/useApplicantNewEntry'

import {
  downloadNsrpFormPdf,
  printNsrpForm,
} from '@/helpers/peso/provincialPeso/nsrpTemplateHelper'

export interface UseApplicantNsrpDetailsProps {
  applicant?: ApplicantEntryRecord
}

export interface UseApplicantNsrpDetailsOptions {
  props?: UseApplicantNsrpDetailsProps
  emit?: (e: 'back') => void
}

// ─── Section Edit Mode Types ───
export type EditableSection =
  | 'personal'       // Section I
  | 'doleStatus'     // Section I (DOLE Status & Classifications)
  | 'preferences'    // Section II
  | 'language'       // Section III
  | 'education'      // Section IV
  | 'vocational'     // Section V
  | 'eligibility'    // Section VI
  | 'workExperience' // Section VII
  | 'skills'         // Section VIII

export function useApplicantNsrpDetails(options?: UseApplicantNsrpDetailsOptions) {
  const route = useRoute()
  const router = useRouter()
  const store = useApplicantEntryStore()
  const toastAlert = useToastAlert()
  const { isLoading } = storeToRefs(store)

  const isGeneratingPdf = ref(false)
  const isPrintingPdf = ref(false)

  const applicant = computed<ApplicantEntryRecord | null>(() => {
    if (options?.props?.applicant) return options.props.applicant
    const id = route.params.id as string
    if (store.selectedApplicant && store.selectedApplicant.id === id) {
      return store.selectedApplicant
    }
    return store.applicants.find((a) => a.id === id) ?? null
  })

  onMounted(async () => {
    if (!applicant.value && store.applicants.length === 0) {
      await store.fetchApplicants()
    }
  })

  const handleBack = () => {
    options?.emit?.('back')
    router.push({ name: 'provincial-peso-entry' })
  }

  const handlePrint = async () => {
    if (!applicant.value) {
      window.print()
      return
    }
    try {
      isPrintingPdf.value = true
      await printNsrpForm(applicant.value)
    } catch (error: any) {
      console.error('Failed to prepare NSRP print:', error)
      toastAlert.error('Print Preparation Failed', error?.message || 'Unable to prepare PDF for printing.')
    } finally {
      isPrintingPdf.value = false
    }
  }

  const handleDownloadForm = async () => {
    if (!applicant.value) return
    try {
      isGeneratingPdf.value = true
      await downloadNsrpFormPdf(applicant.value)
      toastAlert.success('PDF Downloaded', 'The NSRP Form 1 PDF has been generated and downloaded.')
    } catch (error: any) {
      console.error('Failed to generate NSRP PDF:', error)
      toastAlert.error('PDF Generation Failed', error?.message || 'Unable to generate PDF. Please try again.')
    } finally {
      isGeneratingPdf.value = false
    }
  }

  const formattedDob = computed(() => (applicant.value ? formatDateDisplay(applicant.value.dateOfBirth) : 'N/A'))
  const formattedAssessmentDate = computed(() =>
    applicant.value ? formatDateDisplay(applicant.value.assessmentDate || applicant.value.createdAt) : 'N/A'
  )
  const formattedRegisteredDate = computed(() => formattedAssessmentDate.value)
  const formattedUpdatedDate = computed(() => (applicant.value ? formatDateDisplay(applicant.value.updatedAt) : 'N/A'))

  // ═══════════════════════════════════════════════════════════════
  // ─── PER-SECTION INLINE EDIT MODE ───
  // ═══════════════════════════════════════════════════════════════

  const editingSection = ref<EditableSection | null>(null)
  const isSaving = ref(false)

  // ─── PSGC Cascading Address (for edit mode Section I) ───
  const {
    provinces: editPsgcProvinces,
    cities: editPsgcCities,
    barangays: editPsgcBarangays,
    selectedRegion: editSelectedRegion,
    selectedProvince: editSelectedProvince,
    selectedCity: editSelectedCity,
    selectedBarangay: editSelectedBarangay,
    initialize: initEditPsgc,
  } = usePsgc()

  const onEditProvinceChange = (code: string) => {
    const province = (editPsgcProvinces.value as PsgcLocationEntity[]).find((p) => p.code === code)
    if (province) editSelectedProvince.value = province
  }

  const onEditCityChange = (code: string) => {
    const city = (editPsgcCities.value as PsgcLocationEntity[]).find((c) => c.code === code)
    if (city) editSelectedCity.value = city
  }

  const onEditBarangayChange = (code: string) => {
    const barangay = (editPsgcBarangays.value as PsgcLocationEntity[]).find((b) => b.code === code)
    if (barangay) editSelectedBarangay.value = barangay
  }

  // ─── Section I: Personal Information edit refs ───
  const editFirstName = ref('')
  const editMiddleName = ref('')
  const editSurname = ref('')
  const editSuffix = ref('')
  const editDateOfBirth = ref('')
  const editAge = ref<number | undefined>(undefined)
  const editSex = ref('Male')
  const editCivilStatus = ref('Single')
  const editReligion = ref('')
  const editHeightFt = ref<number | undefined>(undefined)
  const editTin = ref('')
  const editPrimaryContact = ref('')
  const editAdditionalContacts = ref<string[]>([])
  const editNewAdditionalContact = ref('')
  const editEmail = ref('')
  const editHouseNumber = ref('')
  const editStreet = ref('')
  const editVillage = ref('')

  // Auto-calculate age when edit DOB changes
  watch(editDateOfBirth, (val) => {
    if (!val) return
    const birthDate = new Date(val)
    if (isNaN(birthDate.getTime())) return
    const today = new Date()
    let calculatedAge = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--
    }
    if (calculatedAge >= 0 && calculatedAge < 120) {
      editAge.value = calculatedAge
    }
  })

  const addEditContactNumber = () => {
    const val = editNewAdditionalContact.value.trim()
    if (val && !editAdditionalContacts.value.includes(val)) {
      editAdditionalContacts.value.push(val)
      editNewAdditionalContact.value = ''
    }
  }

  const removeEditContactNumber = (idx: number) => {
    editAdditionalContacts.value.splice(idx, 1)
  }

  // ─── Section II: DOLE Status edit refs ───
  const editEmploymentStatus = ref('Unemployed')
  const editEmploymentType = ref<'Wage employed' | 'Self-employed'>('Wage employed')
  const editUnemployedReason = ref('Fresh Graduate')
  const editMonthsLookingForWork = ref<number | undefined>(undefined)
  const editSelfEmployedType = ref('')
  const editIs4psBeneficiary = ref(false)
  const editHouseholdId4ps = ref('')
  const editHasDisability = ref(false)
  const editSelectedDisabilities = ref<string[]>([])
  const editDisabilityOthers = ref('')
  const editIsOfw = ref(false)
  const editOfwCountry = ref('')
  const editIsFormerOfw = ref(false)
  const editFormerOfwCountry = ref('')
  const editFormerOfwReturnDate = ref('')
  const editReferredPrograms = ref<string[]>([])

  const toggleEditDisability = (d: string) => {
    const idx = editSelectedDisabilities.value.indexOf(d)
    if (idx >= 0) {
      editSelectedDisabilities.value.splice(idx, 1)
    } else {
      editSelectedDisabilities.value.push(d)
    }
  }

  const toggleEditProgram = (prog: string) => {
    const idx = editReferredPrograms.value.indexOf(prog)
    if (idx >= 0) {
      editReferredPrograms.value.splice(idx, 1)
    } else {
      editReferredPrograms.value.push(prog)
    }
  }

  // ─── Section III: Educational Background edit refs ───
  const editCurrentlyInSchool = ref(false)
  const editEducationalBackground = ref<EducationalBackgroundItem[]>([])

  const addEditEducationRow = () => {
    editEducationalBackground.value.push({
      level: 'College / Tertiary',
      school: '',
      course: '',
      year_graduated: '',
      awards: '',
      undergraduate_level_reached: '',
    })
  }

  const removeEditEducationRow = (idx: number) => {
    if (editEducationalBackground.value.length > 1) {
      editEducationalBackground.value.splice(idx, 1)
    }
  }

  // ─── Section IV: Work Experience edit refs ───
  const editWorkExperiences = ref<WorkExperienceItem[]>([])

  const addEditWorkRow = () => {
    editWorkExperiences.value.push({
      company_name: '',
      address: '',
      position: '',
      job_title: '',
      inclusive_dates: '',
      number_of_months: undefined,
      monthly_salary: undefined,
      status_of_appointment: 'Permanent',
    })
  }

  const removeEditWorkRow = (idx: number) => {
    editWorkExperiences.value.splice(idx, 1)
  }

  // ─── Section V: Vocational Trainings edit refs ───
  const editVocationalTrainings = ref<VocationalTrainingItem[]>([])

  const addEditVocationalRow = () => {
    editVocationalTrainings.value.push({
      course_training_title: '',
      duration: '',
      training_institution: '',
      skills_acquired: '',
      certificates_received: '',
    })
  }

  const removeEditVocationalRow = (idx: number) => {
    editVocationalTrainings.value.splice(idx, 1)
  }

  // ─── Section VI: Eligibilities edit refs ───
  const editEligibilities = ref<EligibilityItem[]>([])

  const addEditEligibilityRow = () => {
    editEligibilities.value.push({
      eligibility_title: '',
      rating: '',
      date_of_examination: '',
      place_of_examination: '',
    })
  }

  const removeEditEligibilityRow = (idx: number) => {
    editEligibilities.value.splice(idx, 1)
  }

  // ─── Section VII: Skills & Languages edit refs ───
  const editOtherSkills = ref<string[]>([])
  const editNewSkillTag = ref('')
  const editOtherSkillsSpecified = ref('')
  const editLanguageProficiencies = ref<LanguageProficiencyItem[]>([])
  const editNewLanguageName = ref('')

  const toggleEditSkillOption = (skill: string) => {
    const idx = editOtherSkills.value.indexOf(skill)
    if (idx >= 0) {
      editOtherSkills.value.splice(idx, 1)
    } else {
      editOtherSkills.value.push(skill)
    }
  }

  const addEditSkillTag = () => {
    const s = editNewSkillTag.value.trim()
    if (s && !editOtherSkills.value.includes(s)) {
      editOtherSkills.value.push(s)
      editNewSkillTag.value = ''
    }
  }

  const removeEditSkillTag = (idx: number) => {
    editOtherSkills.value.splice(idx, 1)
  }

  const addEditLanguage = () => {
    const l = editNewLanguageName.value.trim()
    if (l && !editLanguageProficiencies.value.some((item) => item.language?.toLowerCase() === l.toLowerCase())) {
      editLanguageProficiencies.value.push({
        language: l,
        read: false,
        write: false,
        speak: false,
        understand: false,
      })
      editNewLanguageName.value = ''
    }
  }

  const removeEditLanguage = (idx: number) => {
    editLanguageProficiencies.value.splice(idx, 1)
  }

  // ─── Section VIII: Job Preferences edit refs ───
  const editPreferredOccupations = ref<string[]>([])
  const editNewOccupationTag = ref('')
  const editPreferredLocalLocations = ref<string[]>([])
  const editNewLocalLocationTag = ref('')
  const editPreferredOverseasLocations = ref<string[]>([])
  const editNewOverseasLocationTag = ref('')
  const editJobTypePreference = ref<string[]>([])

  const addEditOccupation = () => {
    const o = editNewOccupationTag.value.trim()
    if (o && !editPreferredOccupations.value.includes(o)) {
      editPreferredOccupations.value.push(o)
      editNewOccupationTag.value = ''
    }
  }

  const removeEditOccupation = (idx: number) => {
    editPreferredOccupations.value.splice(idx, 1)
  }

  const addEditLocalLocation = () => {
    const l = editNewLocalLocationTag.value.trim()
    if (l && !editPreferredLocalLocations.value.includes(l)) {
      editPreferredLocalLocations.value.push(l)
      editNewLocalLocationTag.value = ''
    }
  }

  const removeEditLocalLocation = (idx: number) => {
    editPreferredLocalLocations.value.splice(idx, 1)
  }

  const addEditOverseasLocation = () => {
    const o = editNewOverseasLocationTag.value.trim()
    if (o && !editPreferredOverseasLocations.value.includes(o)) {
      editPreferredOverseasLocations.value.push(o)
      editNewOverseasLocationTag.value = ''
    }
  }

  const removeEditOverseasLocation = (idx: number) => {
    editPreferredOverseasLocations.value.splice(idx, 1)
  }

  const toggleEditJobType = (opt: string) => {
    const idx = editJobTypePreference.value.indexOf(opt)
    if (idx >= 0) {
      editJobTypePreference.value.splice(idx, 1)
    } else {
      editJobTypePreference.value.push(opt)
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ─── HYDRATION: deep-clone applicant data into edit refs ───
  // ═══════════════════════════════════════════════════════════════

  function hydrateSection(section: EditableSection) {
    const a = applicant.value
    if (!a) return

    switch (section) {
      case 'personal':
        editFirstName.value = a.firstName
        editSurname.value = a.surname
        editMiddleName.value = a.middleName ?? ''
        editSuffix.value = a.suffix ?? ''
        editDateOfBirth.value = a.dateOfBirth ? a.dateOfBirth.split('T')[0] : ''
        editAge.value = a.age ?? undefined
        editSex.value = a.sex
        editCivilStatus.value = a.civilStatus
        editReligion.value = a.religion ?? ''
        editHeightFt.value = a.heightFt ?? undefined
        editTin.value = a.tin ?? ''
        editPrimaryContact.value = a.contactNumber !== 'N/A' ? a.contactNumber : ''
        editAdditionalContacts.value = a.allContactNumbers.length > 1 ? [...a.allContactNumbers.slice(1)] : []
        editNewAdditionalContact.value = ''
        editEmail.value = a.email ?? ''
        editHouseNumber.value = a.address.houseNumber ?? ''
        editStreet.value = a.address.street ?? ''
        editVillage.value = a.address.village ?? ''
        // Initialize PSGC cascading from the applicant's current address
        initEditPsgc(
          a.address.region || 'Region XIII (Caraga)',
          a.address.province || 'Agusan del Sur',
          a.address.municipality,
          a.address.barangay !== 'N/A' ? a.address.barangay : undefined,
        )
        break

      case 'doleStatus':
        if (a.employmentType === 'Self-employed' || a.employmentStatus === 'Self-Employed') {
          editEmploymentStatus.value = 'Self-Employed'
        } else {
          editEmploymentStatus.value = a.employmentStatus || 'Unemployed'
        }
        editEmploymentType.value = (a.employmentType as 'Wage employed' | 'Self-employed') || 'Wage employed'
        editUnemployedReason.value = a.unemployedReason ?? 'Fresh Graduate'
        editMonthsLookingForWork.value = a.monthsLookingForWork ?? undefined
        editSelfEmployedType.value = a.selfEmployedType ?? ''
        editIs4psBeneficiary.value = a.is4psBeneficiary
        editHouseholdId4ps.value = a.householdId4ps ?? ''
        editHasDisability.value = a.hasDisability
        editSelectedDisabilities.value = [...a.disabilities]
        editDisabilityOthers.value = a.disabilityOthers ?? ''
        editIsOfw.value = a.isOfw
        editOfwCountry.value = a.ofwCountry ?? ''
        editIsFormerOfw.value = a.isFormerOfw
        editFormerOfwCountry.value = a.formerOfwCountry ?? ''
        editFormerOfwReturnDate.value = a.formerOfwReturnDate ? a.formerOfwReturnDate.split('T')[0] : ''
        editReferredPrograms.value = [...a.referredPrograms]
        break

      case 'education':
        editCurrentlyInSchool.value = a.currentlyInSchool
        editEducationalBackground.value = a.educationalBackground.length > 0
          ? a.educationalBackground.map((e) => ({ ...e }))
          : [
              {
                level: 'College / Tertiary',
                school: '',
                course: '',
                year_graduated: '',
                awards: '',
                undergraduate_level_reached: '',
              },
            ]
        break

      case 'workExperience':
        editWorkExperiences.value = a.workExperiences.map((w) => ({ ...w }))
        break

      case 'vocational':
        editVocationalTrainings.value = a.vocationalTrainings.map((v) => ({ ...v }))
        break

      case 'eligibility':
        editEligibilities.value = a.eligibilities.map((el) => ({ ...el }))
        break

      case 'language':
        editLanguageProficiencies.value = a.languageProficiencies.map((l) => ({ ...l }))
        editNewLanguageName.value = ''
        break

      case 'skills':
        editOtherSkills.value = [...a.otherSkills]
        editNewSkillTag.value = ''
        editOtherSkillsSpecified.value = a.otherSkillsSpecified ?? ''
        break

      case 'preferences':
        editPreferredOccupations.value = [...a.preferredOccupations]
        editNewOccupationTag.value = ''
        editPreferredLocalLocations.value = [...a.preferredLocalLocations]
        editNewLocalLocationTag.value = ''
        editPreferredOverseasLocations.value = [...a.preferredOverseasLocations]
        editNewOverseasLocationTag.value = ''
        editJobTypePreference.value = [...a.jobTypePreference]
        break
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ─── VALIDATION: matching ApplicantNewEntry required fields ───
  // ═══════════════════════════════════════════════════════════════

  function validateSection(section: EditableSection): boolean {
    if (section === 'personal') {
      if (!editFirstName.value.trim()) {
        toastAlert.error('Validation Error', 'First Name is required.')
        return false
      }
      if (!editSurname.value.trim()) {
        toastAlert.error('Validation Error', 'Surname is required.')
        return false
      }
      if (!editDateOfBirth.value) {
        toastAlert.error('Validation Error', 'Date of Birth is required.')
        return false
      }
      if (!editSelectedCity.value?.name?.trim()) {
        toastAlert.error('Validation Error', 'Permanent Municipality / City is required.')
        return false
      }
      if (!editSelectedBarangay.value?.name?.trim()) {
        toastAlert.error('Validation Error', 'Permanent Barangay is required.')
        return false
      }
      if (!editPrimaryContact.value.trim()) {
        toastAlert.error('Validation Error', 'Primary Contact Number is required.')
        return false
      }
    }
    return true
  }

  // ═══════════════════════════════════════════════════════════════
  // ─── PAYLOAD BUILDER: map form refs to partial ApplicantUpdate ───
  // ═══════════════════════════════════════════════════════════════

  function buildSectionPayload(section: EditableSection): ApplicantUpdate {
    switch (section) {
      case 'personal': {
        const allContacts: string[] = []
        if (editPrimaryContact.value.trim()) {
          allContacts.push(editPrimaryContact.value.trim())
        }
        for (const c of editAdditionalContacts.value) {
          if (c.trim() && !allContacts.includes(c.trim())) {
            allContacts.push(c.trim())
          }
        }

        const addressPayload = {
          houseNumber: editHouseNumber.value.trim() || undefined,
          street: editStreet.value.trim() || undefined,
          village: editVillage.value.trim() || undefined,
          barangay: editSelectedBarangay.value?.name?.trim() || '',
          municipality: editSelectedCity.value?.name?.trim() || '',
          province: editSelectedProvince.value?.name?.trim() || 'Agusan del Sur',
          region: editSelectedRegion.value?.name?.trim() || 'Region XIII (Caraga)',
        }

        return {
          first_name: editFirstName.value.trim(),
          middle_name: editMiddleName.value.trim() || null,
          surname: editSurname.value.trim(),
          suffix: editSuffix.value.trim() || null,
          date_of_birth: editDateOfBirth.value,
          age: editAge.value ?? null,
          sex: editSex.value || null,
          civil_status: editCivilStatus.value || null,
          religion: editReligion.value.trim() || null,
          height_ft: editHeightFt.value ?? null,
          tin: editTin.value.trim() || null,
          contact_numbers: allContacts.length > 0 ? allContacts : null,
          email: editEmail.value.trim() || null,
          address: addressPayload,
        }
      }

      case 'doleStatus': {
        const isSelf =
          editEmploymentStatus.value === 'Self-Employed' ||
          (editEmploymentStatus.value === 'Employed' && editEmploymentType.value === 'Self-employed')
        const isEmployed = editEmploymentStatus.value === 'Employed' || isSelf

        return {
          // Database check constraint "applicants_employment_status_check" strictly requires 'Employed' | 'Unemployed'
          employment_status: isEmployed ? 'Employed' : 'Unemployed',
          employment_type: isSelf
            ? 'Self-employed'
            : isEmployed
              ? (editEmploymentType.value || 'Wage employed')
              : null,
          unemployed_reason: !isEmployed ? editUnemployedReason.value || null : null,
          months_looking_for_work: !isEmployed ? (editMonthsLookingForWork.value ?? null) : null,
          self_employed_type: isSelf ? editSelfEmployedType.value.trim() || null : null,
          is_4ps_beneficiary: editIs4psBeneficiary.value,
          household_id_4ps: editIs4psBeneficiary.value ? editHouseholdId4ps.value.trim() || null : null,
          has_disability: editHasDisability.value,
          disabilities: editHasDisability.value ? editSelectedDisabilities.value : null,
          disability_others: editHasDisability.value && editDisabilityOthers.value.trim() ? editDisabilityOthers.value.trim() : null,
          is_ofw: editIsOfw.value,
          ofw_country: editIsOfw.value ? editOfwCountry.value.trim() || null : null,
          is_former_ofw: editIsFormerOfw.value,
          former_ofw_country: editIsFormerOfw.value ? editFormerOfwCountry.value.trim() || null : null,
          former_ofw_return_date: editIsFormerOfw.value && editFormerOfwReturnDate.value ? editFormerOfwReturnDate.value : null,
          referred_programs: editReferredPrograms.value.length > 0 ? editReferredPrograms.value : null,
        }
      }

      case 'education': {
        const cleanEducation = editEducationalBackground.value
          .filter((e) => e.school?.trim() || e.course?.trim())
          .map((e) => ({
            level: e.level?.trim() || 'Education',
            school: e.school?.trim() || '',
            course: e.course?.trim() || 'N/A',
            year_graduated: e.year_graduated || '',
            awards: e.awards?.trim() || '',
            undergraduate_level_reached: e.undergraduate_level_reached?.trim() || '',
          }))
        return {
          currently_in_school: editCurrentlyInSchool.value,
          educational_background: cleanEducation.length > 0 ? cleanEducation : null,
        }
      }

      case 'workExperience': {
        const cleanWork = editWorkExperiences.value
          .filter((w) => w.company_name?.trim() || w.position?.trim() || w.job_title?.trim())
          .map((w) => ({
            company_name: w.company_name?.trim() || '',
            address: w.address?.trim() || '',
            position: w.position?.trim() || w.job_title?.trim() || 'Staff',
            job_title: w.job_title?.trim() || w.position?.trim() || 'Staff',
            inclusive_dates: w.inclusive_dates?.trim() || 'N/A',
            number_of_months: w.number_of_months ? Number(w.number_of_months) : null,
            monthly_salary: w.monthly_salary ? Number(w.monthly_salary) : null,
            status_of_appointment: w.status_of_appointment?.trim() || 'Permanent',
          }))
        return {
          work_experiences: cleanWork.length > 0 ? cleanWork : null,
        }
      }

      case 'vocational': {
        const cleanVocational = editVocationalTrainings.value
          .filter((v) => v.course_training_title?.trim())
          .map((v) => ({
            course_training_title: v.course_training_title?.trim() || '',
            duration: v.duration?.trim() || '',
            training_institution: v.training_institution?.trim() || '',
            skills_acquired: v.skills_acquired?.trim() || '',
            certificates_received: v.certificates_received?.trim() || '',
          }))
        return {
          vocational_trainings: cleanVocational.length > 0 ? cleanVocational : null,
        }
      }

      case 'eligibility': {
        const cleanEligibilities = editEligibilities.value
          .filter((el) => el.eligibility_title?.trim())
          .map((el) => ({
            eligibility_title: el.eligibility_title?.trim() || '',
            rating: el.rating || '',
            date_of_examination: el.date_of_examination || '',
            place_of_examination: el.place_of_examination?.trim() || '',
          }))
        return {
          eligibilities: cleanEligibilities.length > 0 ? cleanEligibilities : null,
        }
      }

      case 'language':
        return {
          language_proficiencies: editLanguageProficiencies.value.length > 0 ? editLanguageProficiencies.value : null,
        }

      case 'skills':
        return {
          other_skills: editOtherSkills.value.length > 0 ? editOtherSkills.value : null,
          other_skills_specified: editOtherSkillsSpecified.value.trim() || null,
        }

      case 'preferences':
        return {
          preferred_occupations: editPreferredOccupations.value.length > 0 ? editPreferredOccupations.value : null,
          preferred_local_locations: editPreferredLocalLocations.value.length > 0 ? editPreferredLocalLocations.value : null,
          preferred_overseas_locations: editPreferredOverseasLocations.value.length > 0 ? editPreferredOverseasLocations.value : null,
          job_type_preference: editJobTypePreference.value.length > 0 ? editJobTypePreference.value : null,
        }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ─── ACTIONS: start, cancel, save section ───
  // ═══════════════════════════════════════════════════════════════

  function startEdit(section: EditableSection) {
    hydrateSection(section)
    editingSection.value = section
  }

  function cancelEdit() {
    editingSection.value = null
  }

  async function saveSection(section: EditableSection) {
    if (!applicant.value) return
    if (!validateSection(section)) return

    isSaving.value = true
    try {
      const payload = buildSectionPayload(section)
      await store.updateApplicant(applicant.value.id, payload)
      editingSection.value = null
    } catch {
      // Toast error handled in store
    } finally {
      isSaving.value = false
    }
  }

  return {
    // ─── Original returns (unchanged) ───
    applicant,
    isLoading,
    isGeneratingPdf,
    isPrintingPdf,
    handleBack,
    handlePrint,
    handleDownloadForm,
    handleDownloadPdf: handleDownloadForm,
    formattedDob,
    formattedRegisteredDate,
    formattedUpdatedDate,
    formattedAssessmentDate,
    getInitials,
    formatDateDisplay,

    // ─── Section Edit Mode State & Controls ───
    editingSection,
    isSaving,
    startEdit,
    cancelEdit,
    saveSection,

    // ─── Shared Option Constants ───
    disabilityOptions: DISABILITY_OPTIONS,
    jobTypeOptions: JOB_TYPE_OPTIONS,
    programOptions: PROGRAM_OPTIONS,
    skillOptions: SKILL_OPTIONS,

    // ─── Section I: Personal Information edit refs ───
    editFirstName,
    editMiddleName,
    editSurname,
    editSuffix,
    editDateOfBirth,
    editAge,
    editSex,
    editCivilStatus,
    editReligion,
    editHeightFt,
    editTin,
    editPrimaryContact,
    editAdditionalContacts,
    editNewAdditionalContact,
    editEmail,
    editHouseNumber,
    editStreet,
    editVillage,
    // PSGC address selectors
    editPsgcProvinces,
    editPsgcCities,
    editPsgcBarangays,
    editSelectedRegion,
    editSelectedProvince,
    editSelectedCity,
    editSelectedBarangay,
    onEditProvinceChange,
    onEditCityChange,
    onEditBarangayChange,
    addEditContactNumber,
    removeEditContactNumber,

    // ─── Section II: DOLE Status edit refs ───
    editEmploymentStatus,
    editEmploymentType,
    editUnemployedReason,
    editMonthsLookingForWork,
    editSelfEmployedType,
    editIs4psBeneficiary,
    editHouseholdId4ps,
    editHasDisability,
    editSelectedDisabilities,
    editDisabilityOthers,
    editIsOfw,
    editOfwCountry,
    editIsFormerOfw,
    editFormerOfwCountry,
    editFormerOfwReturnDate,
    editReferredPrograms,
    toggleEditDisability,
    toggleEditProgram,

    // ─── Section III: Educational Background edit refs ───
    editCurrentlyInSchool,
    editEducationalBackground,
    addEditEducationRow,
    removeEditEducationRow,

    // ─── Section IV: Work Experience edit refs ───
    editWorkExperiences,
    addEditWorkRow,
    removeEditWorkRow,

    // ─── Section V: Vocational Trainings edit refs ───
    editVocationalTrainings,
    addEditVocationalRow,
    removeEditVocationalRow,

    // ─── Section VI: Eligibilities edit refs ───
    editEligibilities,
    addEditEligibilityRow,
    removeEditEligibilityRow,

    // ─── Section VII: Skills & Languages edit refs ───
    editOtherSkills,
    editNewSkillTag,
    editOtherSkillsSpecified,
    editLanguageProficiencies,
    editNewLanguageName,
    toggleEditSkillOption,
    addEditSkillTag,
    removeEditSkillTag,
    addEditLanguage,
    removeEditLanguage,

    // ─── Section VIII: Job Preferences edit refs ───
    editPreferredOccupations,
    editNewOccupationTag,
    editPreferredLocalLocations,
    editNewLocalLocationTag,
    editPreferredOverseasLocations,
    editNewOverseasLocationTag,
    editJobTypePreference,
    addEditOccupation,
    removeEditOccupation,
    addEditLocalLocation,
    removeEditLocalLocation,
    addEditOverseasLocation,
    removeEditOverseasLocation,
    toggleEditJobType,
  }
}
