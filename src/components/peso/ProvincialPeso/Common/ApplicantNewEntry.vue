<script setup lang="ts">
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Briefcase,
  Check,
  CheckCircle2,
  FileCheck,
  Languages,
  Loader2,
  MapPin,
  Plus,
  Save,
  Trash2,
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
import type { ApplicantInsert } from '@/types/peso/provincialPeso/applicantEntry'
import { useApplicantNewEntry } from '@/composables/peso/provincialPeso/useApplicantNewEntry'

const props = defineProps<{
  isSubmitting?: boolean
}>()

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'submit', payload: ApplicantInsert): void
}>()

const {
  isFormSubmitting,
  handleCancel,
  handleSubmit,
  steps,
  currentStep,
  nextStep,
  prevStep,
  goToStep,

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
  disabilityOptions,

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
  jobTypeOptions,
  referredPrograms,
  toggleProgram,
  programOptions,
  assessedByName,
  assessmentDate,
  profileId,
} = useApplicantNewEntry({ props, emit })
</script>

<template>
  <div class="flex flex-col gap-6 pb-16">
    <!-- ─── Header & Navigation ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl mt-1">
          Register New Jobseeker
        </h1>
        <p class="text-xs sm:text-sm text-muted-foreground">
          Fill in the applicant's complete profile and DOLE National Skills Registration Program details.
        </p>
      </div>

      <!-- Action Buttons in Header -->
      <div class="flex items-center gap-2 self-start sm:self-auto">
        <Button
          variant="outline"
          size="sm"
          class="h-9 text-xs cursor-pointer shadow-xs"
          @click="handleCancel"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          class="h-9 gap-1.5 text-xs font-semibold cursor-pointer shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
          :disabled="isFormSubmitting"
          @click="handleSubmit"
        >
          <Loader2 v-if="isFormSubmitting" class="h-4 w-4 animate-spin" />
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
          <!-- Step Counter / Title -->
          <div class="flex items-center justify-between mb-6 px-1">
            <span class="text-sm font-bold tracking-tight text-foreground">Registration Steps</span>
            <span class="text-xs font-mono text-muted-foreground">
              Step {{ currentStep }} of {{ steps.length }}
            </span>
          </div>

          <!-- Vertical Stepper with Semantic Tokens -->
          <div class="flex flex-col w-full">
            <div
              v-for="(s, idx) in steps"
              :key="s.step"
              class="flex items-start gap-3.5 group cursor-pointer select-none"
              @click="goToStep(s.step)"
            >
              <!-- Left: Indicator & Connecting Line -->
              <div class="flex flex-col items-center self-stretch shrink-0">
                <!-- Node Circle Indicator: ACTIVE STATE -->
                <div
                  v-if="currentStep === s.step"
                  class="size-8 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center shrink-0 shadow-xs ring-4 ring-primary/15 transition-all"
                >
                  <div class="size-3 rounded-full bg-primary" />
                </div>

                <!-- COMPLETED STATE: Primary badge with check icon -->
                <div
                  v-else-if="currentStep > s.step"
                  class="size-8 rounded-full border border-primary bg-primary flex items-center justify-center text-primary-foreground shadow-xs shrink-0 transition-all"
                >
                  <Check class="size-3.5 stroke-3" />
                </div>

                <!-- PENDING / INACTIVE STATE -->
                <div
                  v-else
                  class="size-8 rounded-full border border-border bg-muted/40 flex items-center justify-center shrink-0 transition-colors group-hover:border-foreground/30"
                >
                  <div class="size-1.5 rounded-full bg-muted-foreground/60" />
                </div>

                <!-- Vertical Connecting Line -->
                <div
                  v-if="idx < steps.length - 1"
                  class="w-0.5 flex-1 min-h-10 my-1 transition-colors duration-200"
                  :class="currentStep > s.step ? 'bg-primary' : 'bg-border'"
                />
              </div>

              <!-- Right: Title & Description -->
              <div class="pt-0.5 pb-6 text-left flex-1 min-w-0">
                <h3
                  class="text-sm tracking-tight transition-colors"
                  :class="
                    currentStep === s.step
                      ? 'text-primary font-bold'
                      : 'text-foreground font-semibold group-hover:text-foreground/90'
                  "
                >
                  {{ s.title }}
                </h3>
                <p
                  class="text-xs leading-relaxed mt-1"
                  :class="currentStep === s.step ? 'text-foreground/80' : 'text-muted-foreground'"
                >
                  {{ s.description }}
                </p>
              </div>
            </div>
          </div>

          <!-- Quick Form Progress Footer -->
          <div class="mt-2 pt-2 text-[11px] text-muted-foreground space-y-1.5 px-1">
            <div class="flex items-center justify-between">
              <span>Progress</span>
              <span class="font-mono font-semibold text-foreground">
                {{ Math.round((currentStep / steps.length) * 100) }}%
              </span>
            </div>
            <div class="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                class="h-full bg-primary transition-all duration-300 rounded-full"
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
                  class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div class="space-y-1">
                <span class="text-[11px] text-muted-foreground">Civil Status</span>
                <select
                  v-model="civilStatus"
                  class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
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
                    class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
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
                    class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
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
                    class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
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
                  class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
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
                  class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
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
                    class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
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
                  class="h-4 w-4 rounded accent-primary text-primary focus:ring-ring cursor-pointer"
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
                  class="h-4 w-4 rounded accent-primary text-primary focus:ring-ring cursor-pointer"
                />
              </div>
              <div v-if="hasDisability" class="pt-2 border-t space-y-3">
                <span class="text-[11px] text-muted-foreground block">Disability Types (Select all that apply)</span>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <label
                    v-for="d in disabilityOptions"
                    :key="d"
                    class="flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors hover:bg-muted/40"
                    :class="selectedDisabilities.includes(d) ? 'bg-primary/10 border-primary/40 font-medium' : ''"
                  >
                    <input
                      type="checkbox"
                      :checked="selectedDisabilities.includes(d)"
                      class="h-3.5 w-3.5 rounded accent-primary text-primary"
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
                  <input type="checkbox" v-model="isOfw" class="h-4 w-4 rounded accent-primary text-primary cursor-pointer" />
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
                  <input type="checkbox" v-model="isFormerOfw" class="h-4 w-4 rounded accent-primary text-primary cursor-pointer" />
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
              <input
                type="checkbox"
                v-model="currentlyInSchool"
                id="inSchool"
                class="h-4 w-4 rounded accent-primary text-primary cursor-pointer"
              />
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
                      class="w-full h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
                        class="w-full h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
                        <input type="checkbox" v-model="lang.read" class="h-4 w-4 rounded accent-primary text-primary cursor-pointer" />
                      </TableCell>
                      <TableCell class="py-2 text-center">
                        <input type="checkbox" v-model="lang.write" class="h-4 w-4 rounded accent-primary text-primary cursor-pointer" />
                      </TableCell>
                      <TableCell class="py-2 text-center">
                        <input type="checkbox" v-model="lang.speak" class="h-4 w-4 rounded accent-primary text-primary cursor-pointer" />
                      </TableCell>
                      <TableCell class="py-2 text-center">
                        <input type="checkbox" v-model="lang.understand" class="h-4 w-4 rounded accent-primary text-primary cursor-pointer" />
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
                    class="text-[11px] bg-primary/10 text-primary border-primary/30 gap-1"
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
                  v-for="jt in jobTypeOptions"
                  :key="jt"
                  class="flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors hover:bg-muted/40"
                  :class="jobTypePreference.includes(jt) ? 'bg-primary/10 border-primary/40 font-medium' : ''"
                >
                  <input
                    type="checkbox"
                    :checked="jobTypePreference.includes(jt)"
                    class="h-3.5 w-3.5 rounded accent-primary text-primary cursor-pointer"
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
                  v-for="prog in programOptions"
                  :key="prog"
                  class="flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors hover:bg-muted/40"
                  :class="referredPrograms.includes(prog) ? 'bg-primary/15 border-primary/40 font-bold text-primary' : ''"
                >
                  <input
                    type="checkbox"
                    :checked="referredPrograms.includes(prog)"
                    class="h-3.5 w-3.5 rounded accent-primary text-primary cursor-pointer"
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
              :disabled="isFormSubmitting"
              @click="handleSubmit"
            >
              <Loader2 v-if="isFormSubmitting" class="h-4 w-4 animate-spin" />
              <CheckCircle2 v-else class="h-4 w-4" />
              <span>Complete & Submit Registration</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
