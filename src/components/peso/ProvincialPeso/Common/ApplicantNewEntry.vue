<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Briefcase,
  Check,
  CheckCircle2,
  Compass,
  FileCheck,
  GraduationCap,
  Languages,
  Loader2,
  MapPin,
  Plus,
  Save,
  Sparkles,
  Trash2,
  User,
  Wrench,
  X,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToastAlert } from '@/composables/common/useToastAlert'
import type {
  ApplicantInsert,
  EducationalBackgroundItem,
  EligibilityItem,
  LanguageProficiencyItem,
  VocationalTrainingItem,
  WorkExperienceItem,
} from '@/types/peso/provincialPeso/applicantEntry'
import { usePsgc } from '@/composables/common/usePsgc'

const props = defineProps<{
  isSubmitting?: boolean
}>()

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'submit', payload: ApplicantInsert): void
}>()

const toastAlert = useToastAlert()

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

// ─── PSGC change handlers ───
const onProvinceChange = (code: string) => {
  const province = psgcProvinces.value.find((p: any) => p.code === code)
  if (province) selectedProvince.value = province
}

const onCityChange = (code: string) => {
  const city = psgcCities.value.find((c: any) => c.code === code)
  if (city) selectedCity.value = city
}

const onBarangayChange = (code: string) => {
  const barangay = psgcBarangays.value.find((b: any) => b.code === code)
  if (barangay) selectedBarangay.value = barangay
}

// ─── Vertical Stepper Steps Definition ───
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

// Address (province, municipality, barangay come from PSGC selections)
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

const DISABILITY_OPTIONS = [
  'Visual',
  'Hearing',
  'Speech',
  'Physical / Orthopedic',
  'Mental / Psychosocial',
  'Chronic Illness / Learning Disability',
]

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

const JOB_TYPE_OPTIONS = ['Full-Time', 'Part-Time', 'Contractual', 'Project-Based', 'Remote / Work From Home']
const jobTypePreference = ref<string[]>(['Full-Time'])

const toggleJobType = (opt: string) => {
  const idx = jobTypePreference.value.indexOf(opt)
  if (idx >= 0) {
    jobTypePreference.value.splice(idx, 1)
  } else {
    jobTypePreference.value.push(opt)
  }
}

const PROGRAM_OPTIONS = ['GIP', 'TUPAD', 'SPES', 'Special Recruitment', 'PESO Job Fair']
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

// ─── Final Payload Construction (ALL COLUMNS IN applicants.applicants) ───
const handleSubmit = () => {
  // Validate required step 1 fields
  if (!validateStep(1)) {
    currentStep.value = 1
    return
  }

  // Compile all contact numbers
  const allContacts: string[] = []
  if (primaryContactNumber.value.trim()) {
    allContacts.push(primaryContactNumber.value.trim())
  }
  for (const c of additionalContactNumbers.value) {
    if (c.trim() && !allContacts.includes(c.trim())) {
      allContacts.push(c.trim())
    }
  }

  // Compile structured address JSON from PSGC selections
  const addressPayload = {
    houseNumber: houseNumber.value.trim() || undefined,
    street: street.value.trim() || undefined,
    village: village.value.trim() || undefined,
    barangay: selectedBarangay.value?.name?.trim() || '',
    municipality: selectedCity.value?.name?.trim() || '',
    province: selectedProvince.value?.name?.trim() || 'Agusan del Sur',
    region: selectedRegion.value?.name?.trim() || 'Region XIII (Caraga)',
  }

  // Filter out empty rows from arrays
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

  // Construct complete payload filling all columns in applicants.applicants
  const payload: ApplicantInsert = {
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

  emit('submit', payload)
}
</script>

<template>
  <div class="flex flex-col gap-6 pb-16">
    <!-- ─── Header & Navigation ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            class="h-8 gap-1.5 text-xs cursor-pointer shadow-xs"
            @click="emit('back')"
          >
            <ArrowLeft class="h-3.5 w-3.5" />
            <span>Back to Registry</span>
          </Button>
          <Badge variant="outline" class="text-[11px] font-mono bg-primary/10 text-primary border-primary/20">
            DOLE NSRP Form 1
          </Badge>
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl mt-1">
          Register New Jobseeker
        </h1>
        <p class="text-xs sm:text-sm text-muted-foreground">
          Fill in the applicant's complete profile and DOLE National Skills Registration Program details.
        </p>
      </div>

      <!-- Action Save Button in Header -->
      <div class="flex items-center gap-2 self-start sm:self-auto">
        <Button
          variant="outline"
          size="sm"
          class="h-9 text-xs cursor-pointer shadow-xs"
          @click="emit('back')"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          class="h-9 gap-1.5 text-xs font-semibold cursor-pointer shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
          :disabled="props.isSubmitting"
          @click="handleSubmit"
        >
          <Loader2 v-if="props.isSubmitting" class="h-4 w-4 animate-spin" />
          <Save v-else class="h-4 w-4" />
          <span>Save & Register</span>
        </Button>
      </div>
    </div>

    <!-- ─── Two-Column Form Layout with Vertical Stepper ─── -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- ─── Left Column: Vertical Stepper Navigation (Sticky) ─── -->
      <div class="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-20 z-10">
        <div class="bg-transparent p-2 sm:p-3">
          <!-- Step Counter / Title without divider -->
          <div class="flex items-center justify-between mb-6 px-1">
            <span class="text-sm font-bold tracking-tight text-foreground">Registration Steps</span>
            <span class="text-xs font-mono text-muted-foreground">
              Step {{ currentStep }} of {{ steps.length }}
            </span>
          </div>

          <!-- Custom Vertical Stepper Matching Design -->
          <div class="flex flex-col w-full">
            <div
              v-for="(s, idx) in steps"
              :key="s.step"
              class="flex items-start gap-3.5 group cursor-pointer select-none"
              @click="goToStep(s.step)"
            >
              <!-- Left: Indicator & Connecting Line -->
              <div class="flex flex-col items-center self-stretch shrink-0">
                <!-- Node Circle Indicator -->
                <!-- ACTIVE STATE: concentric dark ring + vibrant emerald green fill + dark center -->
                <div
                  v-if="currentStep === s.step"
                  class="size-8 rounded-full border border-zinc-700/80 dark:border-zinc-700 bg-zinc-950 dark:bg-zinc-900 flex items-center justify-center shrink-0 shadow-sm"
                >
                  <div class="size-5.5 rounded-full bg-emerald-500 flex items-center justify-center shadow-xs">
                    <div class="size-2 rounded-full bg-zinc-950 dark:bg-black border border-emerald-600/70" />
                  </div>
                </div>

                <!-- COMPLETED STATE: green badge with check icon -->
                <div
                  v-else-if="currentStep > s.step"
                  class="size-8 rounded-full border border-emerald-500/30 bg-zinc-950 dark:bg-zinc-900 flex items-center justify-center shrink-0"
                >
                  <div class="size-5.5 rounded-full bg-emerald-500 flex items-center justify-center text-zinc-950 font-bold shadow-xs">
                    <Check class="size-3.5 stroke-3" />
                  </div>
                </div>

                <!-- PENDING / INACTIVE STATE: dark circle with centered light dot -->
                <div
                  v-else
                  class="size-8 rounded-full border border-zinc-700/70 dark:border-zinc-800 bg-zinc-900/80 dark:bg-zinc-950 flex items-center justify-center shrink-0 transition-colors group-hover:border-zinc-600"
                >
                  <div class="size-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                </div>

                <!-- Vertical Connecting Line -->
                <div
                  v-if="idx < steps.length - 1"
                  class="w-0.5 flex-1 min-h-10 my-1 transition-colors duration-200"
                  :class="currentStep > s.step ? 'bg-emerald-500/60' : 'bg-zinc-700/50 dark:bg-zinc-800'"
                />
              </div>

              <!-- Right: Title & Description -->
              <div class="pt-0.5 pb-6 text-left flex-1 min-w-0">
                <h3
                  class="text-sm tracking-tight transition-colors"
                  :class="
                    currentStep === s.step
                      ? 'text-emerald-500 dark:text-emerald-400 font-bold'
                      : 'text-foreground font-semibold group-hover:text-foreground/90'
                  "
                >
                  {{ s.title }}
                </h3>
                <p
                  class="text-xs leading-relaxed mt-1"
                  :class="currentStep === s.step ? 'text-muted-foreground' : 'text-muted-foreground/80'"
                >
                  {{ s.description }}
                </p>
              </div>
            </div>
          </div>

          <!-- Quick Form Progress Footer without dividing line -->
          <div class="mt-2 pt-2 text-[11px] text-muted-foreground space-y-1.5 px-1">
            <div class="flex items-center justify-between">
              <span>Progress</span>
              <span class="font-mono font-semibold text-foreground">
                {{ Math.round((currentStep / steps.length) * 100) }}%
              </span>
            </div>
            <div class="h-1.5 w-full bg-zinc-800/60 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                class="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                :style="{ width: `${(currentStep / steps.length) * 100}%` }"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- ─── Right Column: Active Form Step ─── -->
      <div class="lg:col-span-8 xl:col-span-9 space-y-6">
        <!-- ════════════════════════════════════════════════════════════════ -->
        <!-- STEP 1: Personal Information & Residential Address             -->
        <!-- ════════════════════════════════════════════════════════════════ -->
        <Card v-show="currentStep === 1" class="border shadow-xs">
          <CardHeader class="pb-4 border-b bg-muted/20">
            <CardTitle class="text-base font-semibold flex items-center gap-2">
              <span>Step 1: Personal Information & Permanent Address</span>
            </CardTitle>
            <CardDescription class="text-xs">
              Primary identification, birth records, and residential address details.
            </CardDescription>
          </CardHeader>
          <CardContent class="p-5 space-y-5 text-xs">
            <!-- Full Name Section -->
            <div class="space-y-2">
              <label class="font-semibold text-foreground text-xs">Full Name</label>
              <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div class="space-y-1">
                  <span class="text-[11px] text-muted-foreground">First Name <span class="text-destructive">*</span></span>
                  <Input v-model="firstName" placeholder="e.g. Juan" class="h-9 text-xs" />
                </div>
                <div class="space-y-1">
                  <span class="text-[11px] text-muted-foreground">Middle Name</span>
                  <Input v-model="middleName" placeholder="e.g. Santos" class="h-9 text-xs" />
                </div>
                <div class="space-y-1">
                  <span class="text-[11px] text-muted-foreground">Surname <span class="text-destructive">*</span></span>
                  <Input v-model="surname" placeholder="e.g. Dela Cruz" class="h-9 text-xs" />
                </div>
                <div class="space-y-1">
                  <span class="text-[11px] text-muted-foreground">Suffix</span>
                  <Input v-model="suffix" placeholder="e.g. Jr., III" class="h-9 text-xs" />
                </div>
              </div>
            </div>

            <!-- Birth & Demographics -->
            <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div class="space-y-1">
                <span class="text-[11px] text-muted-foreground">Date of Birth <span class="text-destructive">*</span></span>
                <Input v-model="dateOfBirth" type="date" class="h-9 text-xs" />
              </div>
              <div class="space-y-1">
                <span class="text-[11px] text-muted-foreground">Age (years)</span>
                <Input v-model.number="age" type="number" placeholder="Calculated" class="h-9 text-xs" />
              </div>
              <div class="space-y-1">
                <span class="text-[11px] text-muted-foreground">Sex / Gender</span>
                <select
                  v-model="sex"
                  class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div class="space-y-1">
                <span class="text-[11px] text-muted-foreground">Civil Status</span>
                <select
                  v-model="civilStatus"
                  class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Widowed">Widowed</option>
                  <option value="Separated">Separated</option>
                  <option value="Solo Parent">Solo Parent</option>
                </select>
              </div>
            </div>

            <!-- Physical & Tax Info -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="space-y-1">
                <span class="text-[11px] text-muted-foreground">Religion</span>
                <Input v-model="religion" placeholder="e.g. Roman Catholic, Christian, Islam" class="h-9 text-xs" />
              </div>
              <div class="space-y-1">
                <span class="text-[11px] text-muted-foreground">Height (feet)</span>
                <Input v-model.number="heightFt" type="number" step="0.1" placeholder="e.g. 5.5" class="h-9 text-xs" />
              </div>
              <div class="space-y-1">
                <span class="text-[11px] text-muted-foreground">Tax Identification Number (TIN)</span>
                <Input v-model="tin" placeholder="e.g. 123-456-789-000" class="h-9 text-xs font-mono" />
              </div>
            </div>

            <!-- Permanent Address Breakdown (PSGC-powered) -->
            <div class="p-4 rounded-xl border bg-muted/10 space-y-3">
              <div class="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                <MapPin class="h-3.5 w-3.5 text-primary" />
                <span>Permanent Residential Address</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="space-y-1">
                  <span class="text-[11px] text-muted-foreground">Province <span class="text-destructive">*</span></span>
                  <select
                    :value="selectedProvince?.code ?? ''"
                    class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    :disabled="!selectedRegion"
                    @change="onProvinceChange(($event.target as HTMLSelectElement).value)"
                  >
                    <option value="" disabled>{{ psgcProvinces.length === 0 ? 'Loading...' : 'Select province' }}</option>
                    <option v-for="p in psgcProvinces" :key="p.code" :value="p.code">
                      {{ p.name }}
                    </option>
                  </select>
                </div>
                <div class="space-y-1">
                  <span class="text-[11px] text-muted-foreground">Municipality / City <span class="text-destructive">*</span></span>
                  <select
                    :value="selectedCity?.code ?? ''"
                    class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    :disabled="!selectedProvince"
                    @change="onCityChange(($event.target as HTMLSelectElement).value)"
                  >
                    <option value="" disabled>{{ !selectedProvince ? 'Select province first' : psgcCities.length === 0 ? 'Loading...' : 'Select municipality / city' }}</option>
                    <option v-for="c in psgcCities" :key="c.code" :value="c.code">
                      {{ c.name }}
                    </option>
                  </select>
                </div>
                <div class="space-y-1">
                  <span class="text-[11px] text-muted-foreground">Barangay <span class="text-destructive">*</span></span>
                  <select
                    :value="selectedBarangay?.code ?? ''"
                    class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    :disabled="!selectedCity"
                    @change="onBarangayChange(($event.target as HTMLSelectElement).value)"
                  >
                    <option value="" disabled>{{ !selectedCity ? 'Select municipality first' : psgcBarangays.length === 0 ? 'Loading...' : 'Select barangay' }}</option>
                    <option v-for="b in psgcBarangays" :key="b.code" :value="b.code">
                      {{ b.name }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="space-y-1">
                  <span class="text-[11px] text-muted-foreground">House No. / Street</span>
                  <Input v-model="street" placeholder="e.g. Purok 4, Maharlika Hwy" class="h-9 text-xs" />
                </div>
                <div class="space-y-1">
                  <span class="text-[11px] text-muted-foreground">Village / Sitio</span>
                  <Input v-model="village" placeholder="Optional" class="h-9 text-xs" />
                </div>
                <div class="space-y-1">
                  <span class="text-[11px] text-muted-foreground">Region</span>
                  <span class="text-xs font-medium text-foreground h-9 flex items-center">{{ selectedRegion?.name || 'Region XIII (Caraga)' }}</span>
                </div>
              </div>
            </div>

            <!-- Contacts & Email -->
            <div class="space-y-2">
              <label class="font-semibold text-foreground text-xs">Contact & Communication</label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="space-y-1">
                  <span class="text-[11px] text-muted-foreground">Primary Mobile Number <span class="text-destructive">*</span></span>
                  <Input v-model="primaryContactNumber" placeholder="e.g. 09123456789" class="h-9 text-xs font-mono" />
                </div>
                <div class="space-y-1">
                  <span class="text-[11px] text-muted-foreground">Email Address</span>
                  <Input v-model="email" type="email" placeholder="e.g. applicant@gmail.com" class="h-9 text-xs font-mono" />
                </div>
              </div>

              <!-- Additional contact numbers -->
              <div class="pt-2 space-y-2">
                <span class="text-[11px] text-muted-foreground">Secondary / Alternate Contact Numbers</span>
                <div class="flex items-center gap-2 max-w-sm">
                  <Input
                    v-model="newAdditionalContact"
                    placeholder="Add telephone or alt number"
                    class="h-8 text-xs font-mono"
                    @keyup.enter="addContactNumber"
                  />
                  <Button size="sm" variant="outline" class="h-8 text-xs cursor-pointer gap-1" @click="addContactNumber">
                    <Plus class="h-3 w-3" />
                    <span>Add</span>
                  </Button>
                </div>
                <div v-if="additionalContactNumbers.length > 0" class="flex flex-wrap gap-1.5 pt-1">
                  <Badge
                    v-for="(cn, idx) in additionalContactNumbers"
                    :key="idx"
                    variant="secondary"
                    class="text-[11px] font-mono gap-1"
                  >
                    <span>{{ cn }}</span>
                    <X class="h-3 w-3 cursor-pointer hover:text-destructive" @click="removeContactNumber(idx)" />
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- ════════════════════════════════════════════════════════════════ -->
        <!-- STEP 2: DOLE Status & Beneficiary Classifications             -->
        <!-- ════════════════════════════════════════════════════════════════ -->
        <Card v-show="currentStep === 2" class="border shadow-xs">
          <CardHeader class="pb-4 border-b bg-muted/20">
            <CardTitle class="text-base font-semibold flex items-center gap-2">
              <Briefcase class="h-4 w-4 text-primary" />
              <span>Step 2: DOLE Status & Beneficiary Classifications</span>
            </CardTitle>
            <CardDescription class="text-xs">
              Current employment disposition, 4Ps beneficiary, disability status, and OFW history.
            </CardDescription>
          </CardHeader>
          <CardContent class="p-5 space-y-5 text-xs">
            <!-- Employment Disposition -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="space-y-1">
                <span class="text-[11px] text-muted-foreground">Employment Status <span class="text-destructive">*</span></span>
                <select
                  v-model="employmentStatus"
                  class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="Unemployed">Unemployed</option>
                  <option value="Employed">Employed</option>
                  <option value="Self-Employed">Self-Employed</option>
                </select>
              </div>
              <div v-if="employmentStatus === 'Employed'" class="space-y-1">
                <span class="text-[11px] text-muted-foreground">Employment Type <span class="text-destructive">*</span></span>
                <select
                  v-model="employmentType"
                  class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="Wage employed">Wage Employed</option>
                  <option value="Self-employed">Self-Employed</option>
                </select>
              </div>
            </div>

            <!-- Conditional: Unemployed Details -->
            <div v-if="employmentStatus === 'Unemployed'" class="p-3.5 rounded-xl border bg-muted/15 space-y-3">
              <span class="font-semibold text-foreground text-xs block">Unemployment Background</span>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="space-y-1">
                  <span class="text-[11px] text-muted-foreground">Reason for Unemployment</span>
                  <select
                    v-model="unemployedReason"
                    class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="Fresh Graduate">Fresh Graduate</option>
                    <option value="Finished Contract">Finished Contract</option>
                    <option value="Resigned">Resigned</option>
                    <option value="Laid Off / Terminated">Laid Off / Terminated</option>
                    <option value="Retired">Retired</option>
                    <option value="Family Responsibilities">Family Responsibilities</option>
                    <option value="Other">Other Reasons</option>
                  </select>
                </div>
                <div class="space-y-1">
                  <span class="text-[11px] text-muted-foreground">Months Looking for Work</span>
                  <Input v-model.number="monthsLookingForWork" type="number" min="0" placeholder="e.g. 6" class="h-9 text-xs" />
                </div>
              </div>
            </div>

            <!-- Conditional: Self-Employed Details -->
            <div v-if="employmentStatus === 'Self-Employed'" class="p-3.5 rounded-xl border bg-muted/15 space-y-2">
              <span class="font-semibold text-foreground text-xs block">Self-Employment Classification</span>
              <Input v-model="selfEmployedType" placeholder="e.g. Sari-sari Store Vendor, Farmer, Freelance Programmer" class="h-9 text-xs" />
            </div>

            <!-- 4Ps Beneficiary Section -->
            <div class="p-4 rounded-xl border space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <span class="font-semibold text-foreground text-xs block">Pantawid Pamilyang Pilipino Program (4Ps)</span>
                  <span class="text-[11px] text-muted-foreground">Is the applicant an active 4Ps beneficiary?</span>
                </div>
                <input
                  type="checkbox"
                  v-model="is4psBeneficiary"
                  class="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
                />
              </div>
              <div v-if="is4psBeneficiary" class="pt-2 border-t space-y-1">
                <span class="text-[11px] text-muted-foreground">Household ID No.</span>
                <Input v-model="householdId4ps" placeholder="e.g. 4PS-CARAGA-ADS-12345" class="h-9 text-xs font-mono max-w-sm" />
              </div>
            </div>

            <!-- Disability / PWD Section -->
            <div class="p-4 rounded-xl border space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <span class="font-semibold text-foreground text-xs block">Person with Disability (PWD)</span>
                  <span class="text-[11px] text-muted-foreground">Does the applicant possess any physical or visual impairment?</span>
                </div>
                <input
                  type="checkbox"
                  v-model="hasDisability"
                  class="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
                />
              </div>
              <div v-if="hasDisability" class="pt-2 border-t space-y-3">
                <span class="text-[11px] text-muted-foreground block">Disability Types (Select all that apply)</span>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <label
                    v-for="d in DISABILITY_OPTIONS"
                    :key="d"
                    class="flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors hover:bg-muted/40"
                    :class="selectedDisabilities.includes(d) ? 'bg-primary/10 border-primary/40 font-medium' : ''"
                  >
                    <input
                      type="checkbox"
                      :checked="selectedDisabilities.includes(d)"
                      class="h-3.5 w-3.5 rounded text-primary"
                      @change="toggleDisability(d)"
                    />
                    <span class="text-[11px]">{{ d }}</span>
                  </label>
                </div>
                <div class="space-y-1">
                  <span class="text-[11px] text-muted-foreground">Other Disability Specifications</span>
                  <Input v-model="disabilityOthers" placeholder="Additional details or specific condition" class="h-8 text-xs" />
                </div>
              </div>
            </div>

            <!-- OFW History Section -->
            <div class="p-4 rounded-xl border space-y-4">
              <span class="font-semibold text-foreground text-xs block">Overseas Filipino Worker (OFW) Profile</span>

              <!-- Current OFW -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-muted-foreground">Currently an Active OFW?</span>
                  <input type="checkbox" v-model="isOfw" class="h-4 w-4 rounded text-primary cursor-pointer" />
                </div>
                <div v-if="isOfw" class="pt-1">
                  <span class="text-[11px] text-muted-foreground">Country of Deployment</span>
                  <Input v-model="ofwCountry" placeholder="e.g. United Arab Emirates, Saudi Arabia" class="h-8 text-xs max-w-sm mt-0.5" />
                </div>
              </div>

              <!-- Former OFW -->
              <div class="space-y-2 pt-2 border-t">
                <div class="flex items-center justify-between">
                  <span class="text-muted-foreground">Former / Returned OFW?</span>
                  <input type="checkbox" v-model="isFormerOfw" class="h-4 w-4 rounded text-primary cursor-pointer" />
                </div>
                <div v-if="isFormerOfw" class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div class="space-y-1">
                    <span class="text-[11px] text-muted-foreground">Previous Country</span>
                    <Input v-model="formerOfwCountry" placeholder="e.g. Taiwan, Singapore" class="h-8 text-xs" />
                  </div>
                  <div class="space-y-1">
                    <span class="text-[11px] text-muted-foreground">Date of Return to Philippines</span>
                    <Input v-model="formerOfwReturnDate" type="date" class="h-8 text-xs" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- ════════════════════════════════════════════════════════════════ -->
        <!-- STEP 3: Educational Background                                 -->
        <!-- ════════════════════════════════════════════════════════════════ -->
        <Card v-show="currentStep === 3" class="border shadow-xs">
          <CardHeader class="pb-4 border-b bg-muted/20">
            <div class="flex items-center justify-between">
              <div>
                <CardTitle class="text-base font-semibold flex items-center gap-2">
                  <GraduationCap class="h-4 w-4 text-primary" />
                  <span>Step 3: Educational Background</span>
                </CardTitle>
                <CardDescription class="text-xs">
                  Academic records from primary, secondary, tertiary, and post-graduate levels.
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" class="h-8 text-xs gap-1.5 cursor-pointer" @click="addEducationRow">
                <Plus class="h-3.5 w-3.5" />
                <span>Add Record</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent class="p-5 space-y-5 text-xs">
            <!-- Currently in school checkbox -->
            <div class="flex items-center gap-2 p-3 rounded-lg border bg-muted/10">
              <input type="checkbox" v-model="currentlyInSchool" id="inSchool" class="h-4 w-4 rounded text-primary cursor-pointer" />
              <label for="inSchool" class="font-medium text-foreground cursor-pointer">
                Applicant is currently enrolled in school / pursuing a degree
              </label>
            </div>

            <!-- Dynamic Education Rows -->
            <div class="space-y-4">
              <div
                v-for="(edu, idx) in educationalBackground"
                :key="idx"
                class="p-4 rounded-xl border bg-card/60 space-y-3 relative group"
              >
                <div class="flex items-center justify-between border-b pb-2">
                  <span class="font-semibold text-primary text-xs">Record #{{ idx + 1 }}</span>
                  <Button
                    v-if="educationalBackground.length > 1"
                    variant="ghost"
                    size="sm"
                    class="h-7 w-7 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                    @click="removeEducationRow(idx)"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div class="space-y-1">
                    <span class="text-[11px] text-muted-foreground">Education Level</span>
                    <select
                      v-model="edu.level"
                      class="w-full h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs"
                    >
                      <option value="Elementary">Elementary</option>
                      <option value="Secondary / High School">Secondary / High School</option>
                      <option value="Senior High School">Senior High School</option>
                      <option value="Technical-Vocational">Technical-Vocational</option>
                      <option value="College / Tertiary">College / Tertiary</option>
                      <option value="Post-Graduate / Masteral">Post-Graduate / Masteral</option>
                    </select>
                  </div>
                  <div class="space-y-1 sm:col-span-2">
                    <span class="text-[11px] text-muted-foreground">School / University Name</span>
                    <Input v-model="edu.school" placeholder="e.g. Agusan del Sur State College of Agriculture and Technology (ASSCAT)" class="h-8 text-xs" />
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div class="space-y-1 sm:col-span-2">
                    <span class="text-[11px] text-muted-foreground">Course / Degree / Track</span>
                    <Input v-model="edu.course" placeholder="e.g. BS in Information Technology" class="h-8 text-xs" />
                  </div>
                  <div class="space-y-1">
                    <span class="text-[11px] text-muted-foreground">Year Graduated</span>
                    <Input v-model="edu.year_graduated" placeholder="e.g. 2023" class="h-8 text-xs font-mono" />
                  </div>
                  <div class="space-y-1">
                    <span class="text-[11px] text-muted-foreground">Awards / Honors</span>
                    <Input v-model="edu.awards" placeholder="e.g. Cum Laude" class="h-8 text-xs" />
                  </div>
                </div>

                <div class="space-y-1">
                  <span class="text-[11px] text-muted-foreground">Undergraduate Level Reached (if non-graduate)</span>
                  <Input v-model="edu.undergraduate_level_reached" placeholder="e.g. 3rd Year Completed" class="h-8 text-xs" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- ════════════════════════════════════════════════════════════════ -->
        <!-- STEP 4: Work Experience & Vocational Trainings                 -->
        <!-- ════════════════════════════════════════════════════════════════ -->
        <Card v-show="currentStep === 4" class="border shadow-xs">
          <CardHeader class="pb-4 border-b bg-muted/20">
            <CardTitle class="text-base font-semibold flex items-center gap-2">
              <Wrench class="h-4 w-4 text-primary" />
              <span>Step 4: Work Experience & Technical / Vocational Trainings</span>
            </CardTitle>
            <CardDescription class="text-xs">
              Employment track record and certified skills training (TESDA/TVET).
            </CardDescription>
          </CardHeader>
          <CardContent class="p-5 space-y-6 text-xs">
            <!-- Work Experience Section -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-foreground text-xs flex items-center gap-1.5">
                  <Briefcase class="h-3.5 w-3.5 text-primary" />
                  Previous Work History
                </span>
                <Button size="sm" variant="outline" class="h-7 text-xs gap-1 cursor-pointer" @click="addWorkRow">
                  <Plus class="h-3 w-3" />
                  <span>Add Work Experience</span>
                </Button>
              </div>

              <div v-if="workExperiences.length === 0" class="text-center py-4 text-muted-foreground italic border rounded-lg">
                No previous work experience added (Fresh graduate or first-time jobseeker).
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="(work, idx) in workExperiences"
                  :key="idx"
                  class="p-3.5 rounded-xl border bg-card/60 space-y-2.5"
                >
                  <div class="flex items-center justify-between border-b pb-1.5">
                    <span class="font-semibold text-primary text-xs">Experience #{{ idx + 1 }}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      class="h-6 w-6 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                      @click="removeWorkRow(idx)"
                    >
                      <Trash2 class="h-3 w-3" />
                    </Button>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="space-y-1">
                      <span class="text-[11px] text-muted-foreground">Company / Employer Name</span>
                      <Input v-model="work.company_name" placeholder="e.g. San Francisco Agro-Industrial Corp." class="h-8 text-xs" />
                    </div>
                    <div class="space-y-1">
                      <span class="text-[11px] text-muted-foreground">Job Position / Title</span>
                      <Input v-model="work.position" placeholder="e.g. Administrative Officer" class="h-8 text-xs" />
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div class="space-y-1">
                      <span class="text-[11px] text-muted-foreground">Inclusive Dates</span>
                      <Input v-model="work.inclusive_dates" placeholder="e.g. Jan 2022 - Dec 2023" class="h-8 text-xs" />
                    </div>
                    <div class="space-y-1">
                      <span class="text-[11px] text-muted-foreground">Monthly Salary (PHP)</span>
                      <Input v-model="work.monthly_salary" type="number" placeholder="e.g. 18000" class="h-8 text-xs font-mono" />
                    </div>
                    <div class="space-y-1">
                      <span class="text-[11px] text-muted-foreground">Status of Appointment</span>
                      <select
                        v-model="work.status_of_appointment"
                        class="w-full h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs"
                      >
                        <option value="Permanent">Permanent</option>
                        <option value="Contractual">Contractual</option>
                        <option value="Casual">Casual</option>
                        <option value="Job Order">Job Order</option>
                        <option value="Part-Time">Part-Time</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Technical & Vocational Trainings Section -->
            <div class="space-y-3 pt-4 border-t">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-foreground text-xs flex items-center gap-1.5">
                  <Award class="h-3.5 w-3.5 text-primary" />
                  Technical / Vocational Trainings & Certifications (TESDA)
                </span>
                <Button size="sm" variant="outline" class="h-7 text-xs gap-1 cursor-pointer" @click="addVocationalRow">
                  <Plus class="h-3 w-3" />
                  <span>Add Training</span>
                </Button>
              </div>

              <div v-if="vocationalTrainings.length === 0" class="text-center py-4 text-muted-foreground italic border rounded-lg">
                No technical/vocational trainings added yet.
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="(voc, idx) in vocationalTrainings"
                  :key="idx"
                  class="p-3.5 rounded-xl border bg-card/60 space-y-2.5"
                >
                  <div class="flex items-center justify-between border-b pb-1.5">
                    <span class="font-semibold text-primary text-xs">Training #{{ idx + 1 }}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      class="h-6 w-6 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                      @click="removeVocationalRow(idx)"
                    >
                      <Trash2 class="h-3 w-3" />
                    </Button>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="space-y-1">
                      <span class="text-[11px] text-muted-foreground">Course / Training Title</span>
                      <Input v-model="voc.course_training_title" placeholder="e.g. Shielded Metal Arc Welding (SMAW)" class="h-8 text-xs" />
                    </div>
                    <div class="space-y-1">
                      <span class="text-[11px] text-muted-foreground">Training Institution</span>
                      <Input v-model="voc.training_institution" placeholder="e.g. Agusan del Sur School of Arts and Trades" class="h-8 text-xs" />
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="space-y-1">
                      <span class="text-[11px] text-muted-foreground">Duration (Hours / Months)</span>
                      <Input v-model="voc.duration" placeholder="e.g. 268 Hours" class="h-8 text-xs" />
                    </div>
                    <div class="space-y-1">
                      <span class="text-[11px] text-muted-foreground">Certificates Received</span>
                      <Input v-model="voc.certificates_received" placeholder="e.g. National Certificate II (NC II)" class="h-8 text-xs" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- ════════════════════════════════════════════════════════════════ -->
        <!-- STEP 5: Eligibilities, Skills & Languages                     -->
        <!-- ════════════════════════════════════════════════════════════════ -->
        <Card v-show="currentStep === 5" class="border shadow-xs">
          <CardHeader class="pb-4 border-b bg-muted/20">
            <CardTitle class="text-base font-semibold flex items-center gap-2">
              <Sparkles class="h-4 w-4 text-primary" />
              <span>Step 5: Eligibilities, Skills & Language Proficiencies</span>
            </CardTitle>
            <CardDescription class="text-xs">
              Civil Service / Professional Board eligibilities, acquired skills, and dialect fluency.
            </CardDescription>
          </CardHeader>
          <CardContent class="p-5 space-y-6 text-xs">
            <!-- Eligibilities Section -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-foreground text-xs flex items-center gap-1.5">
                  <FileCheck class="h-3.5 w-3.5 text-primary" />
                  Civil Service & Professional Board Eligibilities
                </span>
                <Button size="sm" variant="outline" class="h-7 text-xs gap-1 cursor-pointer" @click="addEligibilityRow">
                  <Plus class="h-3 w-3" />
                  <span>Add Eligibility</span>
                </Button>
              </div>

              <div v-if="eligibilities.length === 0" class="text-center py-4 text-muted-foreground italic border rounded-lg">
                No formal civil service or board eligibilities recorded.
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="(el, idx) in eligibilities"
                  :key="idx"
                  class="p-3.5 rounded-xl border bg-card/60 space-y-2.5"
                >
                  <div class="flex items-center justify-between border-b pb-1.5">
                    <span class="font-semibold text-primary text-xs">Eligibility #{{ idx + 1 }}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      class="h-6 w-6 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                      @click="removeEligibilityRow(idx)"
                    >
                      <Trash2 class="h-3 w-3" />
                    </Button>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="space-y-1">
                      <span class="text-[11px] text-muted-foreground">Title / Exam Name</span>
                      <Input v-model="el.eligibility_title" placeholder="e.g. Career Service Professional" class="h-8 text-xs" />
                    </div>
                    <div class="space-y-1">
                      <span class="text-[11px] text-muted-foreground">Rating Obtained (%)</span>
                      <Input v-model="el.rating" placeholder="e.g. 84.50" class="h-8 text-xs font-mono" />
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="space-y-1">
                      <span class="text-[11px] text-muted-foreground">Date of Examination</span>
                      <Input v-model="el.date_of_examination" type="date" class="h-8 text-xs" />
                    </div>
                    <div class="space-y-1">
                      <span class="text-[11px] text-muted-foreground">Place of Examination</span>
                      <Input v-model="el.place_of_examination" placeholder="e.g. Butuan City" class="h-8 text-xs" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Acquired Skills Tags -->
            <div class="space-y-2.5 pt-4 border-t">
              <span class="font-semibold text-foreground text-xs block">Other Acquired Skills</span>
              <div class="flex items-center gap-2 max-w-sm">
                <Input
                  v-model="newSkillTag"
                  placeholder="e.g. Driving (Prof), Welding, Cooking"
                  class="h-8 text-xs"
                  @keyup.enter="addSkillTag"
                />
                <Button size="sm" variant="outline" class="h-8 text-xs gap-1 cursor-pointer" @click="addSkillTag">
                  <Plus class="h-3 w-3" />
                  <span>Add</span>
                </Button>
              </div>

              <div class="flex flex-wrap gap-1.5 pt-1">
                <Badge
                  v-for="(skill, idx) in otherSkills"
                  :key="idx"
                  variant="secondary"
                  class="text-[11px] gap-1 py-0.5"
                >
                  <span>{{ skill }}</span>
                  <X class="h-3 w-3 cursor-pointer hover:text-destructive" @click="removeSkillTag(idx)" />
                </Badge>
              </div>

              <div class="pt-2 space-y-1">
                <span class="text-[11px] text-muted-foreground">Other Specific Skills / Description</span>
                <Input v-model="otherSkillsSpecified" placeholder="Additional specialized talents, tools, or machinery operated" class="h-8 text-xs" />
              </div>
            </div>

            <!-- Language Proficiencies Table -->
            <div class="space-y-3 pt-4 border-t">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-foreground text-xs flex items-center gap-1.5">
                  <Languages class="h-3.5 w-3.5 text-primary" />
                  Language & Dialect Proficiencies
                </span>
                <div class="flex items-center gap-2">
                  <Input
                    v-model="newLanguageName"
                    placeholder="Add dialect/language"
                    class="h-7 text-xs w-40"
                    @keyup.enter="addLanguage"
                  />
                  <Button size="sm" variant="outline" class="h-7 text-xs gap-1 cursor-pointer" @click="addLanguage">
                    <Plus class="h-3 w-3" />
                    <span>Add</span>
                  </Button>
                </div>
              </div>

              <div class="overflow-x-auto border rounded-xl">
                <Table>
                  <TableHeader class="bg-muted/40">
                    <TableRow>
                      <TableHead class="text-[11px] font-semibold h-8 py-1">Language / Dialect</TableHead>
                      <TableHead class="text-[11px] font-semibold h-8 py-1 text-center w-20">Read</TableHead>
                      <TableHead class="text-[11px] font-semibold h-8 py-1 text-center w-20">Write</TableHead>
                      <TableHead class="text-[11px] font-semibold h-8 py-1 text-center w-20">Speak</TableHead>
                      <TableHead class="text-[11px] font-semibold h-8 py-1 text-center w-20">Understand</TableHead>
                      <TableHead class="text-[11px] font-semibold h-8 py-1 text-right w-14">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-for="(lang, idx) in languageProficiencies" :key="idx">
                      <TableCell class="py-2 font-medium">{{ lang.language }}</TableCell>
                      <TableCell class="py-2 text-center">
                        <input type="checkbox" v-model="lang.read" class="h-4 w-4 rounded text-primary cursor-pointer" />
                      </TableCell>
                      <TableCell class="py-2 text-center">
                        <input type="checkbox" v-model="lang.write" class="h-4 w-4 rounded text-primary cursor-pointer" />
                      </TableCell>
                      <TableCell class="py-2 text-center">
                        <input type="checkbox" v-model="lang.speak" class="h-4 w-4 rounded text-primary cursor-pointer" />
                      </TableCell>
                      <TableCell class="py-2 text-center">
                        <input type="checkbox" v-model="lang.understand" class="h-4 w-4 rounded text-primary cursor-pointer" />
                      </TableCell>
                      <TableCell class="py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          class="h-6 w-6 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                          @click="removeLanguage(idx)"
                        >
                          <Trash2 class="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- ════════════════════════════════════════════════════════════════ -->
        <!-- STEP 6: Job Preferences & Evaluation Assessment                -->
        <!-- ════════════════════════════════════════════════════════════════ -->
        <Card v-show="currentStep === 6" class="border shadow-xs">
          <CardHeader class="pb-4 border-b bg-muted/20">
            <CardTitle class="text-base font-semibold flex items-center gap-2">
              <Compass class="h-4 w-4 text-primary" />
              <span>Step 6: Job Preferences & PESO Assessment Evaluation</span>
            </CardTitle>
            <CardDescription class="text-xs">
              Target job roles, location preferences, program enrollment, and assessment certification.
            </CardDescription>
          </CardHeader>
          <CardContent class="p-5 space-y-6 text-xs">
            <!-- Preferred Occupations -->
            <div class="space-y-2">
              <span class="font-semibold text-foreground text-xs block">Preferred Occupations</span>
              <div class="flex items-center gap-2 max-w-sm">
                <Input
                  v-model="newOccupationTag"
                  placeholder="e.g. Accounting Clerk, Cashier, Driver"
                  class="h-8 text-xs"
                  @keyup.enter="addOccupation"
                />
                <Button size="sm" variant="outline" class="h-8 text-xs gap-1 cursor-pointer" @click="addOccupation">
                  <Plus class="h-3 w-3" />
                  <span>Add</span>
                </Button>
              </div>
              <div class="flex flex-wrap gap-1.5 pt-1">
                <Badge
                  v-for="(occ, idx) in preferredOccupations"
                  :key="idx"
                  variant="secondary"
                  class="text-[11px] gap-1 py-0.5"
                >
                  <span>{{ occ }}</span>
                  <X class="h-3 w-3 cursor-pointer hover:text-destructive" @click="removeOccupation(idx)" />
                </Badge>
              </div>
            </div>

            <!-- Locations: Local and Overseas -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
              <!-- Local Locations -->
              <div class="space-y-2">
                <span class="font-semibold text-foreground text-xs block">Preferred Local Locations</span>
                <div class="flex items-center gap-2">
                  <Input
                    v-model="newLocalLocationTag"
                    placeholder="e.g. Bayugan City, Davao City"
                    class="h-8 text-xs"
                    @keyup.enter="addLocalLocation"
                  />
                  <Button size="sm" variant="outline" class="h-8 text-xs gap-1 cursor-pointer" @click="addLocalLocation">
                    <Plus class="h-3 w-3" />
                    <span>Add</span>
                  </Button>
                </div>
                <div class="flex flex-wrap gap-1.5 pt-1">
                  <Badge
                    v-for="(loc, idx) in preferredLocalLocations"
                    :key="idx"
                    variant="outline"
                    class="text-[11px] gap-1"
                  >
                    <span>{{ loc }}</span>
                    <X class="h-3 w-3 cursor-pointer hover:text-destructive" @click="removeLocalLocation(idx)" />
                  </Badge>
                </div>
              </div>

              <!-- Overseas Locations -->
              <div class="space-y-2">
                <span class="font-semibold text-foreground text-xs block">Preferred Overseas Locations</span>
                <div class="flex items-center gap-2">
                  <Input
                    v-model="newOverseasLocationTag"
                    placeholder="e.g. Japan, Canada, Saudi Arabia"
                    class="h-8 text-xs"
                    @keyup.enter="addOverseasLocation"
                  />
                  <Button size="sm" variant="outline" class="h-8 text-xs gap-1 cursor-pointer" @click="addOverseasLocation">
                    <Plus class="h-3 w-3" />
                    <span>Add</span>
                  </Button>
                </div>
                <div class="flex flex-wrap gap-1.5 pt-1">
                  <Badge
                    v-for="(os, idx) in preferredOverseasLocations"
                    :key="idx"
                    variant="outline"
                    class="text-[11px] bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20 gap-1"
                  >
                    <span>{{ os }}</span>
                    <X class="h-3 w-3 cursor-pointer hover:text-destructive" @click="removeOverseasLocation(idx)" />
                  </Badge>
                </div>
              </div>
            </div>

            <!-- Job Type Preferences -->
            <div class="space-y-2 pt-4 border-t">
              <span class="font-semibold text-foreground text-xs block">Employment Type Preferences</span>
              <div class="flex flex-wrap gap-2">
                <label
                  v-for="jt in JOB_TYPE_OPTIONS"
                  :key="jt"
                  class="flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors hover:bg-muted/40"
                  :class="jobTypePreference.includes(jt) ? 'bg-primary/10 border-primary/40 font-medium' : ''"
                >
                  <input
                    type="checkbox"
                    :checked="jobTypePreference.includes(jt)"
                    class="h-3.5 w-3.5 rounded text-primary cursor-pointer"
                    @change="toggleJobType(jt)"
                  />
                  <span class="text-xs">{{ jt }}</span>
                </label>
              </div>
            </div>

            <!-- DOLE Programs Referral Selection -->
            <div class="space-y-2 pt-4 border-t">
              <span class="font-semibold text-foreground text-xs block">Referred DOLE Programs & Assistance</span>
              <div class="flex flex-wrap gap-2">
                <label
                  v-for="prog in PROGRAM_OPTIONS"
                  :key="prog"
                  class="flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors hover:bg-muted/40"
                  :class="referredPrograms.includes(prog) ? 'bg-primary/15 border-primary/40 font-bold text-primary' : ''"
                >
                  <input
                    type="checkbox"
                    :checked="referredPrograms.includes(prog)"
                    class="h-3.5 w-3.5 rounded text-primary cursor-pointer"
                    @change="toggleProgram(prog)"
                  />
                  <span class="text-xs">{{ prog }}</span>
                </label>
              </div>
            </div>

            <!-- Evaluator Assessment Metadata -->
            <div class="p-4 rounded-xl border bg-muted/15 space-y-3 pt-4 border-t">
              <span class="font-semibold text-foreground text-xs block">PESO Staff Assessment Certification</span>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="space-y-1">
                  <span class="text-[11px] text-muted-foreground">Assessed By (Evaluator Name)</span>
                  <Input v-model="assessedByName" placeholder="PESO Officer Name" class="h-9 text-xs" />
                </div>
                <div class="space-y-1">
                  <span class="text-[11px] text-muted-foreground">Assessment Date</span>
                  <Input v-model="assessmentDate" type="date" class="h-9 text-xs" />
                </div>
              </div>
              <div class="space-y-1 pt-1">
                <span class="text-[11px] text-muted-foreground">Linked User Profile UUID (Optional)</span>
                <Input v-model="profileId" placeholder="Leave blank if registering walk-in jobseeker" class="h-8 text-xs font-mono" />
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- ─── Bottom Navigation Actions Bar ─── -->
        <div class="flex items-center justify-between gap-3 pt-2">
          <Button
            variant="outline"
            class="gap-1.5 text-xs h-9 cursor-pointer"
            :disabled="currentStep === 1"
            @click="prevStep"
          >
            <ArrowLeft class="h-3.5 w-3.5" />
            <span>Previous Step</span>
          </Button>

          <div class="flex items-center gap-2">
            <Button
              v-if="currentStep < steps.length"
              class="gap-1.5 text-xs h-9 font-semibold cursor-pointer shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
              @click="nextStep"
            >
              <span>Next Step</span>
              <ArrowRight class="h-3.5 w-3.5" />
            </Button>

            <Button
              v-else
              class="gap-1.5 text-xs h-9 font-semibold cursor-pointer shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
              :disabled="props.isSubmitting"
              @click="handleSubmit"
            >
              <Loader2 v-if="props.isSubmitting" class="h-4 w-4 animate-spin" />
              <CheckCircle2 v-else class="h-4 w-4" />
              <span>Complete & Submit Registration</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
