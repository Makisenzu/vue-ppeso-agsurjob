import { ref, watch, onMounted } from 'vue'
import {
  Briefcase,
  Compass,
  GraduationCap,
  Sparkles,
  User,
  Wrench,
} from '@lucide/vue'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { usePsgc } from '@/composables/common/usePsgc'
import type {
  ApplicantInsert,
  EducationalBackgroundItem,
  EligibilityItem,
  LanguageProficiencyItem,
  VocationalTrainingItem,
  WorkExperienceItem,
} from '@/types/peso/provincialPeso/applicantEntry'

export interface PsgcLocationEntity {
  code: string
  name: string
}

export const DISABILITY_OPTIONS: readonly string[] = [
  'Visual',
  'Hearing',
  'Speech',
  'Physical / Orthopedic',
  'Mental / Psychosocial',
  'Chronic Illness / Learning Disability',
]

export const JOB_TYPE_OPTIONS: readonly string[] = [
  'Full-Time',
  'Part-Time',
  'Contractual',
  'Project-Based',
  'Remote / Work From Home',
]

export const PROGRAM_OPTIONS: readonly string[] = [
  'GIP',
  'TUPAD',
  'SPES',
  'Special Recruitment',
  'PESO Job Fair',
]

export interface UseApplicantNewEntryOptions {
  emit?: (e: 'submit', payload: ApplicantInsert) => void
}

export function useApplicantNewEntry(options?: UseApplicantNewEntryOptions) {
  const toastAlert = useToastAlert()

  // ─── Steps Definition ───
  const steps = [
    {
      step: 1,
      title: 'Personal Info',
      description: 'Name, DOB, Civil Status & Address',
      icon: User,
    },
    {
      step: 2,
      title: 'DOLE Status',
      description: 'Employment, 4Ps, PWD & OFW',
      icon: Briefcase,
    },
    {
      step: 3,
      title: 'Education',
      description: 'School, Degree & Attainment',
      icon: GraduationCap,
    },
    {
      step: 4,
      title: 'Work & Training',
      description: 'Experience & Technical Certs',
      icon: Wrench,
    },
    {
      step: 5,
      title: 'Skills & Languages',
      description: 'Eligibilities, Skills & Dialects',
      icon: Sparkles,
    },
    {
      step: 6,
      title: 'Preferences & Review',
      description: 'Job Targets, Assessment & Submit',
      icon: Compass,
    },
  ]

  const currentStep = ref(1)

  // ─── PSGC Cascading Address ───
  const {
    provinces: psgcProvinces,
    cities: psgcCities,
    barangays: psgcBarangays,
    selectedRegion,
    selectedProvince,
    selectedCity,
    selectedBarangay,
    initialize: initPsgc,
  } = usePsgc()

  onMounted(() => {
    // Auto-initialize to Region XIII (Caraga) → Agusan del Sur
    initPsgc('Region XIII (Caraga)', 'Agusan del Sur')
  })

  const onProvinceChange = (code: string) => {
    const province = (psgcProvinces.value as PsgcLocationEntity[]).find((p) => p.code === code)
    if (province) selectedProvince.value = province
  }

  const onCityChange = (code: string) => {
    const city = (psgcCities.value as PsgcLocationEntity[]).find((c) => c.code === code)
    if (city) selectedCity.value = city
  }

  const onBarangayChange = (code: string) => {
    const barangay = (psgcBarangays.value as PsgcLocationEntity[]).find((b) => b.code === code)
    if (barangay) selectedBarangay.value = barangay
  }

  // ─── STEP 1: Personal Information Form State ───
  const firstName = ref('')
  const middleName = ref('')
  const surname = ref('')
  const suffix = ref('')
  const dateOfBirth = ref('')
  const age = ref<number | undefined>(undefined)
  const sex = ref('Male')
  const civilStatus = ref('Single')
  const religion = ref('')
  const heightFt = ref<number | undefined>(undefined)
  const tin = ref('')
  const primaryContactNumber = ref('')
  const additionalContactNumbers = ref<string[]>([])
  const newAdditionalContact = ref('')
  const email = ref('')

  // Address
  const houseNumber = ref('')
  const street = ref('')
  const village = ref('')

  // Auto-calculate age when dateOfBirth changes
  watch(dateOfBirth, (val) => {
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
      age.value = calculatedAge
    }
  })

  const addContactNumber = () => {
    const val = newAdditionalContact.value.trim()
    if (val && !additionalContactNumbers.value.includes(val)) {
      additionalContactNumbers.value.push(val)
      newAdditionalContact.value = ''
    }
  }

  const removeContactNumber = (idx: number) => {
    additionalContactNumbers.value.splice(idx, 1)
  }

  // ─── STEP 2: DOLE Status & Classifications ───
  const employmentStatus = ref('Unemployed')
  const employmentType = ref<'Wage employed' | 'Self-employed'>('Wage employed')
  const unemployedReason = ref('Fresh Graduate')
  const monthsLookingForWork = ref<number | undefined>(undefined)
  const selfEmployedType = ref('')

  // Beneficiary flags
  const is4psBeneficiary = ref(false)
  const householdId4ps = ref('')
  const hasDisability = ref(false)
  const selectedDisabilities = ref<string[]>([])
  const disabilityOthers = ref('')
  const isOfw = ref(false)
  const ofwCountry = ref('')
  const isFormerOfw = ref(false)
  const formerOfwCountry = ref('')
  const formerOfwReturnDate = ref('')

  const toggleDisability = (opt: string) => {
    const idx = selectedDisabilities.value.indexOf(opt)
    if (idx >= 0) {
      selectedDisabilities.value.splice(idx, 1)
    } else {
      selectedDisabilities.value.push(opt)
    }
  }

  // ─── STEP 3: Educational Background ───
  const currentlyInSchool = ref(false)
  const educationalBackground = ref<EducationalBackgroundItem[]>([
    {
      level: 'College / Tertiary',
      school: '',
      course: '',
      year_graduated: '',
      awards: '',
      undergraduate_level_reached: '',
    },
  ])

  const addEducationRow = () => {
    educationalBackground.value.push({
      level: 'College / Tertiary',
      school: '',
      course: '',
      year_graduated: '',
      awards: '',
      undergraduate_level_reached: '',
    })
  }

  const removeEducationRow = (index: number) => {
    if (educationalBackground.value.length > 1) {
      educationalBackground.value.splice(index, 1)
    }
  }

  // ─── STEP 4: Work Experience & Vocational Trainings ───
  const workExperiences = ref<WorkExperienceItem[]>([
    {
      company_name: '',
      position: '',
      job_title: '',
      inclusive_dates: '',
      monthly_salary: '',
      status_of_appointment: 'Permanent',
    },
  ])

  const addWorkRow = () => {
    workExperiences.value.push({
      company_name: '',
      position: '',
      job_title: '',
      inclusive_dates: '',
      monthly_salary: '',
      status_of_appointment: 'Permanent',
    })
  }

  const removeWorkRow = (index: number) => {
    workExperiences.value.splice(index, 1)
  }

  const vocationalTrainings = ref<VocationalTrainingItem[]>([])

  const addVocationalRow = () => {
    vocationalTrainings.value.push({
      course_training_title: '',
      duration: '',
      training_institution: '',
      certificates_received: '',
    })
  }

  const removeVocationalRow = (index: number) => {
    vocationalTrainings.value.splice(index, 1)
  }

  // ─── STEP 5: Eligibilities, Skills & Languages ───
  const eligibilities = ref<EligibilityItem[]>([])

  const addEligibilityRow = () => {
    eligibilities.value.push({
      eligibility_title: '',
      rating: '',
      date_of_examination: '',
      place_of_examination: '',
    })
  }

  const removeEligibilityRow = (index: number) => {
    eligibilities.value.splice(index, 1)
  }

  // Skills tags
  const otherSkills = ref<string[]>([
    'Computer Literacy',
    'Customer Service',
  ])
  const newSkillTag = ref('')
  const otherSkillsSpecified = ref('')

  const addSkillTag = () => {
    const s = newSkillTag.value.trim()
    if (s && !otherSkills.value.includes(s)) {
      otherSkills.value.push(s)
      newSkillTag.value = ''
    }
  }

  const removeSkillTag = (idx: number) => {
    otherSkills.value.splice(idx, 1)
  }

  // Language proficiencies
  const languageProficiencies = ref<LanguageProficiencyItem[]>([
    { language: 'English', read: true, write: true, speak: true, understand: true },
    { language: 'Tagalog / Filipino', read: true, write: true, speak: true, understand: true },
    { language: 'Cebuano / Bisaya', read: true, write: true, speak: true, understand: true },
  ])

  const newLanguageName = ref('')
  const addLanguage = () => {
    const l = newLanguageName.value.trim()
    if (l && !languageProficiencies.value.some((item) => item.language?.toLowerCase() === l.toLowerCase())) {
      languageProficiencies.value.push({
        language: l,
        read: true,
        write: false,
        speak: true,
        understand: true,
      })
      newLanguageName.value = ''
    }
  }

  const removeLanguage = (index: number) => {
    languageProficiencies.value.splice(index, 1)
  }

  // ─── STEP 6: Job Preferences & PESO Assessment ───
  const preferredOccupations = ref<string[]>([
    'Administrative Assistant',
  ])
  const newOccupationTag = ref('')

  const addOccupation = () => {
    const o = newOccupationTag.value.trim()
    if (o && !preferredOccupations.value.includes(o)) {
      preferredOccupations.value.push(o)
      newOccupationTag.value = ''
    }
  }

  const removeOccupation = (idx: number) => {
    preferredOccupations.value.splice(idx, 1)
  }

  const preferredLocalLocations = ref<string[]>([
    'Agusan del Sur',
    'Prosperidad',
  ])
  const newLocalLocationTag = ref('')

  const addLocalLocation = () => {
    const l = newLocalLocationTag.value.trim()
    if (l && !preferredLocalLocations.value.includes(l)) {
      preferredLocalLocations.value.push(l)
      newLocalLocationTag.value = ''
    }
  }

  const removeLocalLocation = (idx: number) => {
    preferredLocalLocations.value.splice(idx, 1)
  }

  const preferredOverseasLocations = ref<string[]>([])
  const newOverseasLocationTag = ref('')

  const addOverseasLocation = () => {
    const o = newOverseasLocationTag.value.trim()
    if (o && !preferredOverseasLocations.value.includes(o)) {
      preferredOverseasLocations.value.push(o)
      newOverseasLocationTag.value = ''
    }
  }

  const removeOverseasLocation = (idx: number) => {
    preferredOverseasLocations.value.splice(idx, 1)
  }

  const jobTypePreference = ref<string[]>(['Full-Time'])

  const toggleJobType = (opt: string) => {
    const idx = jobTypePreference.value.indexOf(opt)
    if (idx >= 0) {
      jobTypePreference.value.splice(idx, 1)
    } else {
      jobTypePreference.value.push(opt)
    }
  }

  const referredPrograms = ref<string[]>(['GIP'])

  const toggleProgram = (p: string) => {
    const idx = referredPrograms.value.indexOf(p)
    if (idx >= 0) {
      referredPrograms.value.splice(idx, 1)
    } else {
      referredPrograms.value.push(p)
    }
  }

  const assessedByName = ref('Provincial PESO Evaluator')
  const assessmentDate = ref(new Date().toISOString().split('T')[0])
  const profileId = ref('')

  // ─── Step Navigation & Validation ───
  const validateStep = (stepNum: number): boolean => {
    if (stepNum === 1) {
      if (!firstName.value.trim()) {
        toastAlert.error('Validation Error', 'First Name is required.')
        return false
      }
      if (!surname.value.trim()) {
        toastAlert.error('Validation Error', 'Surname is required.')
        return false
      }
      if (!dateOfBirth.value) {
        toastAlert.error('Validation Error', 'Date of Birth is required.')
        return false
      }
      if (!selectedCity.value) {
        toastAlert.error('Validation Error', 'Municipality / City is required.')
        return false
      }
      if (!selectedBarangay.value) {
        toastAlert.error('Validation Error', 'Barangay is required.')
        return false
      }
      if (!primaryContactNumber.value.trim()) {
        toastAlert.error('Validation Error', 'Primary Contact Number is required.')
        return false
      }
    }
    return true
  }

  const nextStep = () => {
    if (validateStep(currentStep.value)) {
      if (currentStep.value < steps.length) {
        currentStep.value++
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }

  const prevStep = () => {
    if (currentStep.value > 1) {
      currentStep.value--
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const goToStep = (stepNum: number) => {
    if (stepNum < currentStep.value) {
      currentStep.value = stepNum
    } else if (validateStep(currentStep.value)) {
      currentStep.value = stepNum
    }
  }

  // ─── Final Payload Construction ───
  const buildPayload = (): ApplicantInsert | null => {
    if (!validateStep(1)) {
      currentStep.value = 1
      return null
    }

    // Compile contact numbers
    const allContacts: string[] = []
    if (primaryContactNumber.value.trim()) {
      allContacts.push(primaryContactNumber.value.trim())
    }
    for (const c of additionalContactNumbers.value) {
      if (c.trim() && !allContacts.includes(c.trim())) {
        allContacts.push(c.trim())
      }
    }

    // Compile structured address
    const addressPayload = {
      houseNumber: houseNumber.value.trim() || undefined,
      street: street.value.trim() || undefined,
      village: village.value.trim() || undefined,
      barangay: selectedBarangay.value?.name?.trim() || '',
      municipality: selectedCity.value?.name?.trim() || '',
      province: selectedProvince.value?.name?.trim() || 'Agusan del Sur',
      region: selectedRegion.value?.name?.trim() || 'Region XIII (Caraga)',
    }

    // Clean arrays
    const cleanEducation = educationalBackground.value
      .filter((e) => e.school?.trim() || e.course?.trim())
      .map((e) => ({
        level: e.level?.trim() || 'Education',
        school: e.school?.trim() || '',
        course: e.course?.trim() || 'N/A',
        year_graduated: e.year_graduated || '',
        awards: e.awards?.trim() || '',
        undergraduate_level_reached: e.undergraduate_level_reached?.trim() || '',
      }))

    const cleanWork = workExperiences.value
      .filter((w) => w.company_name?.trim() || w.position?.trim() || w.job_title?.trim())
      .map((w) => ({
        company_name: w.company_name?.trim() || '',
        position: w.position?.trim() || w.job_title?.trim() || 'Staff',
        job_title: w.job_title?.trim() || w.position?.trim() || 'Staff',
        inclusive_dates: w.inclusive_dates?.trim() || 'N/A',
        monthly_salary: w.monthly_salary ? Number(w.monthly_salary) : null,
        status_of_appointment: w.status_of_appointment?.trim() || 'Permanent',
      }))

    const cleanVocational = vocationalTrainings.value
      .filter((v) => v.course_training_title?.trim())
      .map((v) => ({
        course_training_title: v.course_training_title?.trim() || '',
        duration: v.duration?.trim() || '',
        training_institution: v.training_institution?.trim() || '',
        certificates_received: v.certificates_received?.trim() || '',
      }))

    const cleanEligibilities = eligibilities.value
      .filter((el) => el.eligibility_title?.trim())
      .map((el) => ({
        eligibility_title: el.eligibility_title?.trim() || '',
        rating: el.rating || '',
        date_of_examination: el.date_of_examination || '',
        place_of_examination: el.place_of_examination?.trim() || '',
      }))

    return {
      // Identity & Demographics
      first_name: firstName.value.trim(),
      middle_name: middleName.value.trim() || null,
      surname: surname.value.trim(),
      suffix: suffix.value.trim() || null,
      date_of_birth: dateOfBirth.value,
      age: age.value ?? null,
      sex: sex.value || null,
      civil_status: civilStatus.value || null,
      religion: religion.value.trim() || null,
      height_ft: heightFt.value ?? null,
      tin: tin.value.trim() || null,
      contact_numbers: allContacts.length > 0 ? allContacts : null,
      email: email.value.trim() || null,

      // Address
      address: addressPayload,

      // DOLE Employment Classification
      employment_status: employmentStatus.value || null,
      employment_type:
        employmentStatus.value === 'Employed'
          ? (employmentType.value || 'Wage employed')
          : employmentStatus.value === 'Self-Employed'
            ? 'Self-employed'
            : null,
      unemployed_reason: employmentStatus.value === 'Unemployed' ? unemployedReason.value || null : null,
      months_looking_for_work: employmentStatus.value === 'Unemployed' ? (monthsLookingForWork.value ?? null) : null,
      self_employed_type: employmentStatus.value === 'Self-Employed' ? selfEmployedType.value || null : null,

      // Special Categories
      is_4ps_beneficiary: is4psBeneficiary.value,
      household_id_4ps: is4psBeneficiary.value ? householdId4ps.value.trim() || null : null,
      has_disability: hasDisability.value,
      disabilities: hasDisability.value ? selectedDisabilities.value : null,
      disability_others: hasDisability.value && disabilityOthers.value.trim() ? disabilityOthers.value.trim() : null,
      is_ofw: isOfw.value,
      ofw_country: isOfw.value ? ofwCountry.value.trim() || null : null,
      is_former_ofw: isFormerOfw.value,
      former_ofw_country: isFormerOfw.value ? formerOfwCountry.value.trim() || null : null,
      former_ofw_return_date: isFormerOfw.value && formerOfwReturnDate.value ? formerOfwReturnDate.value : null,

      // Education
      currently_in_school: currentlyInSchool.value,
      educational_background: cleanEducation.length > 0 ? cleanEducation : null,

      // Experience & Trainings
      work_experiences: cleanWork.length > 0 ? cleanWork : null,
      vocational_trainings: cleanVocational.length > 0 ? cleanVocational : null,

      // Eligibilities & Skills
      eligibilities: cleanEligibilities.length > 0 ? cleanEligibilities : null,
      language_proficiencies: languageProficiencies.value.length > 0 ? languageProficiencies.value : null,
      other_skills: otherSkills.value.length > 0 ? otherSkills.value : null,
      other_skills_specified: otherSkillsSpecified.value.trim() || null,

      // Preferences & Programs
      preferred_occupations: preferredOccupations.value.length > 0 ? preferredOccupations.value : null,
      preferred_local_locations: preferredLocalLocations.value.length > 0 ? preferredLocalLocations.value : null,
      preferred_overseas_locations: preferredOverseasLocations.value.length > 0 ? preferredOverseasLocations.value : null,
      job_type_preference: jobTypePreference.value.length > 0 ? jobTypePreference.value : null,
      referred_programs: referredPrograms.value.length > 0 ? referredPrograms.value : null,

      // Assessment & Metadata
      assessed_by_name: assessedByName.value.trim() || 'Provincial PESO Staff',
      assessment_date: assessmentDate.value || new Date().toISOString().split('T')[0],
      profile_id: profileId.value.trim() || null,
    }
  }

  const resetForm = () => {
    currentStep.value = 1
    firstName.value = ''
    middleName.value = ''
    surname.value = ''
    suffix.value = ''
    dateOfBirth.value = ''
    age.value = undefined
    sex.value = 'Male'
    civilStatus.value = 'Single'
    religion.value = ''
    heightFt.value = undefined
    tin.value = ''
    primaryContactNumber.value = ''
    additionalContactNumbers.value = []
    newAdditionalContact.value = ''
    email.value = ''
    houseNumber.value = ''
    street.value = ''
    village.value = ''

    employmentStatus.value = 'Unemployed'
    employmentType.value = 'Wage employed'
    unemployedReason.value = 'Fresh Graduate / First Time Jobseeker'
    monthsLookingForWork.value = undefined
    selfEmployedType.value = ''
    is4psBeneficiary.value = false
    householdId4ps.value = ''
    hasDisability.value = false
    selectedDisabilities.value = []
    disabilityOthers.value = ''
    isOfw.value = false
    ofwCountry.value = ''
    isFormerOfw.value = false
    formerOfwCountry.value = ''
    formerOfwReturnDate.value = ''

    currentlyInSchool.value = false
    educationalBackground.value = [
      {
        level: 'Tertiary / College',
        school: '',
        course: '',
        year_graduated: '',
        awards: '',
        undergraduate_level_reached: '',
      },
    ]

    workExperiences.value = []
    vocationalTrainings.value = []
    eligibilities.value = []
    otherSkills.value = []
    newSkillTag.value = ''
    otherSkillsSpecified.value = ''
    languageProficiencies.value = [
      { language: 'English', read: true, write: true, speak: true, understand: true },
      { language: 'Filipino / Tagalog', read: true, write: true, speak: true, understand: true },
      { language: 'Cebuano / Bisaya', read: true, write: true, speak: true, understand: true },
    ]

    preferredOccupations.value = []
    newOccupationTag.value = ''
    preferredLocalLocations.value = ['Agusan del Sur']
    newLocalLocationTag.value = ''
    preferredOverseasLocations.value = []
    newOverseasLocationTag.value = ''
    jobTypePreference.value = ['Full-Time']
    referredPrograms.value = ['GIP']
    assessedByName.value = 'Provincial PESO Evaluator'
    assessmentDate.value = new Date().toISOString().split('T')[0]
    profileId.value = ''
  }

  const handleSubmit = () => {
    const payload = buildPayload()
    if (payload && options?.emit) {
      options.emit('submit', payload)
    }
    return payload
  }

  return {
    steps,
    currentStep,
    nextStep,
    prevStep,
    goToStep,
    validateStep,
    buildPayload,
    handleSubmit,
    resetForm,

    // PSGC
    psgcProvinces,
    psgcCities,
    psgcBarangays,
    selectedRegion,
    selectedProvince,
    selectedCity,
    selectedBarangay,
    onProvinceChange,
    onCityChange,
    onBarangayChange,

    // Step 1
    firstName,
    middleName,
    surname,
    suffix,
    dateOfBirth,
    age,
    sex,
    civilStatus,
    religion,
    heightFt,
    tin,
    primaryContactNumber,
    additionalContactNumbers,
    newAdditionalContact,
    email,
    houseNumber,
    street,
    village,
    addContactNumber,
    removeContactNumber,

    // Step 2
    employmentStatus,
    employmentType,
    unemployedReason,
    monthsLookingForWork,
    selfEmployedType,
    is4psBeneficiary,
    householdId4ps,
    hasDisability,
    selectedDisabilities,
    disabilityOthers,
    isOfw,
    ofwCountry,
    isFormerOfw,
    formerOfwCountry,
    formerOfwReturnDate,
    toggleDisability,
    disabilityOptions: DISABILITY_OPTIONS,

    // Step 3
    currentlyInSchool,
    educationalBackground,
    addEducationRow,
    removeEducationRow,

    // Step 4
    workExperiences,
    addWorkRow,
    removeWorkRow,
    vocationalTrainings,
    addVocationalRow,
    removeVocationalRow,

    // Step 5
    eligibilities,
    addEligibilityRow,
    removeEligibilityRow,
    otherSkills,
    newSkillTag,
    otherSkillsSpecified,
    addSkillTag,
    removeSkillTag,
    languageProficiencies,
    newLanguageName,
    addLanguage,
    removeLanguage,

    // Step 6
    preferredOccupations,
    newOccupationTag,
    addOccupation,
    removeOccupation,
    preferredLocalLocations,
    newLocalLocationTag,
    addLocalLocation,
    removeLocalLocation,
    preferredOverseasLocations,
    newOverseasLocationTag,
    addOverseasLocation,
    removeOverseasLocation,
    jobTypePreference,
    toggleJobType,
    jobTypeOptions: JOB_TYPE_OPTIONS,
    referredPrograms,
    toggleProgram,
    programOptions: PROGRAM_OPTIONS,
    assessedByName,
    assessmentDate,
    profileId,
  }
}
