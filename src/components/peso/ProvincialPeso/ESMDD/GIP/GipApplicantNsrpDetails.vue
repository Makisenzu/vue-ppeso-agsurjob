<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  ArrowLeft,
  Award,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  Globe,
  Languages,
  Loader2,
  Mail,
  MapPin,
  Mountain,
  Phone,
  Printer,
  TreePine,
  UserX,
  Waves,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { GipApplicantRecord } from '@/types/peso/provincialPeso/gip'
import type { ApplicantEntryRecord } from '@/types/peso/provincialPeso/applicantEntry'
import {
  LPII_CONFIG,
  convertGipApplicantToEntryRecord,
  getInitials,
} from '@/helpers/peso/provincialPeso/gipHelper'
import { formatDateDisplay } from '@/helpers/peso/provincialPeso/applicantEntryHelper'
import {
  downloadNsrpFormPdf,
  printNsrpForm,
} from '@/helpers/peso/provincialPeso/nsrpTemplateHelper'
import { useToastAlert } from '@/composables/common/useToastAlert'

interface Props {
  applicant: GipApplicantRecord
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'back'): void
}>()

const toastAlert = useToastAlert()

const isGeneratingPdf = ref(false)
const isPrintingPdf = ref(false)

const applicantRecord = computed<ApplicantEntryRecord>(() => {
  return convertGipApplicantToEntryRecord(props.applicant)
})

const handleBack = () => {
  emit('back')
}

const handleDownloadForm = async () => {
  try {
    isGeneratingPdf.value = true
    await downloadNsrpFormPdf(applicantRecord.value)
    toastAlert.success('PDF Downloaded', 'The NSRP Form 1 PDF has been generated and downloaded.')
  } catch (error: any) {
    console.error('Failed to generate NSRP PDF:', error)
    toastAlert.error('PDF Generation Failed', error?.message || 'Unable to generate PDF. Please try again.')
  } finally {
    isGeneratingPdf.value = false
  }
}

const handlePrint = async () => {
  try {
    isPrintingPdf.value = true
    await printNsrpForm(applicantRecord.value)
  } catch (error: any) {
    console.error('Failed to prepare NSRP print:', error)
    toastAlert.error('Print Preparation Failed', error?.message || 'Unable to prepare PDF for printing.')
  } finally {
    isPrintingPdf.value = false
  }
}

const formattedDob = computed(() => formatDateDisplay(applicantRecord.value.dateOfBirth))
const formattedRegisteredDate = computed(() => formatDateDisplay(props.applicant.createdAt || applicantRecord.value.createdAt))
const formattedUpdatedDate = computed(() => formatDateDisplay(applicantRecord.value.updatedAt))
const formattedAssessmentDate = computed(() => formatDateDisplay(applicantRecord.value.assessmentDate))
</script>

<template>
  <div class="flex flex-col gap-6 pb-16 print:p-0 print:gap-4">
    <!-- ─── Navigation & Actions Header ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
      <div class="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          class="gap-1.5 text-xs cursor-pointer shadow-xs hover:bg-muted"
          @click="handleBack"
        >
          <ArrowLeft class="h-3.5 w-3.5" />
          <span>Back to Applicants</span>
        </Button>
      </div>

      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          class="gap-1.5 text-xs cursor-pointer shadow-xs hover:bg-muted"
          :disabled="isGeneratingPdf"
          @click="handleDownloadForm"
        >
          <Loader2 v-if="isGeneratingPdf" class="h-3.5 w-3.5 animate-spin text-primary" />
          <Download v-else class="h-3.5 w-3.5 text-primary" />
          <span>{{ isGeneratingPdf ? 'Generating PDF...' : 'Download PDF Form' }}</span>
        </Button>
        <Button
          variant="default"
          size="sm"
          class="gap-1.5 text-xs cursor-pointer shadow-xs"
          :disabled="isPrintingPdf"
          @click="handlePrint"
        >
          <Loader2 v-if="isPrintingPdf" class="h-3.5 w-3.5 animate-spin" />
          <Printer v-else class="h-3.5 w-3.5" />
          <span>{{ isPrintingPdf ? 'Preparing Print...' : 'Print NSRP Form' }}</span>
        </Button>
      </div>
    </div>

    <!-- ─── Hero Overview Card ─── -->
    <Card class="border shadow-xs bg-linear-to-br from-card via-card/95 to-muted/30 overflow-hidden">
      <CardContent class="p-6">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <!-- Avatar and Core Identity -->
          <div class="flex items-start sm:items-center gap-4">
            <Avatar class="h-16 w-16 sm:h-20 sm:w-20 border-2 border-primary/20 bg-muted shrink-0 shadow-xs">
              <AvatarFallback class="font-bold text-xl sm:text-2xl text-primary">
                {{ getInitials(applicant.fullName) }}
              </AvatarFallback>
            </Avatar>

            <div class="space-y-1.5 min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {{ applicant.fullName }}
                </h2>
                <!-- GIP Application Status Badge -->
                <Badge
                  v-if="applicant.status === 'Approved'"
                  variant="outline"
                  class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs gap-1 py-0.5"
                >
                  <CheckCircle2 class="h-3 w-3" />
                  GIP Approved
                </Badge>
                <Badge
                  v-else-if="applicant.status === 'Hired'"
                  variant="outline"
                  class="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-xs gap-1 py-0.5"
                >
                  <CheckCircle2 class="h-3 w-3" />
                  GIP Hired
                </Badge>
                <Badge
                  v-else-if="applicant.status === 'Pending'"
                  variant="outline"
                  class="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs gap-1 py-0.5"
                >
                  <Clock class="h-3 w-3" />
                  GIP Pending
                </Badge>
                <Badge
                  v-else
                  variant="outline"
                  class="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-xs gap-1 py-0.5"
                >
                  <UserX class="h-3 w-3" />
                  {{ applicant.status }}
                </Badge>

                <!-- DOLE Employment Status Badge -->
                <Badge
                  v-if="applicantRecord.employmentStatus.toLowerCase().includes('employed') && !applicantRecord.employmentStatus.toLowerCase().includes('unemployed')"
                  variant="outline"
                  class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs gap-1 py-0.5"
                >
                  {{ applicantRecord.employmentStatus }}
                </Badge>
                <Badge
                  v-else
                  variant="outline"
                  class="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs gap-1 py-0.5"
                >
                  {{ applicantRecord.employmentStatus }}
                </Badge>
              </div>

              <!-- Demographics Line -->
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span class="font-medium text-foreground">{{ applicantRecord.sex }}</span>
                <span>•</span>
                <span>{{ applicantRecord.age ? `${applicantRecord.age} yrs old` : 'Age N/A' }} ({{ formattedDob }})</span>
                <span>•</span>
                <span>{{ applicantRecord.civilStatus }}</span>
                <template v-if="applicantRecord.religion">
                  <span>•</span>
                  <span>{{ applicantRecord.religion }}</span>
                </template>
                <span>•</span>
                <span class="font-mono text-primary font-medium">{{ applicant.code }}</span>
              </div>

              <!-- Contact & Location Highlights -->
              <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                <div class="flex items-center gap-1.5">
                  <MapPin class="h-3.5 w-3.5 text-primary shrink-0" />
                  <span class="text-foreground font-medium">{{ applicantRecord.fullAddressString }}</span>
                </div>
                <div v-if="applicantRecord.contactNumber && applicantRecord.contactNumber !== 'N/A'" class="flex items-center gap-1.5 font-mono">
                  <Phone class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{{ applicantRecord.contactNumber }}</span>
                </div>
                <div v-if="applicantRecord.email" class="flex items-center gap-1.5 font-mono">
                  <Mail class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{{ applicantRecord.email }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Programs and Badges Group -->
          <div class="flex flex-wrap md:flex-col items-start md:items-end gap-2 shrink-0 border-t md:border-t-0 pt-4 md:pt-0">
            <div class="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
              Applied Programs
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <!-- GIP Intern badge -->
              <Badge
                variant="secondary"
                class="text-xs px-2.5 py-0.5 bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 font-semibold"
              >
                GIP Intern (Batch {{ applicant.batchYear }})
              </Badge>
              <!-- 4Ps -->
              <Badge
                v-if="applicantRecord.is4psBeneficiary"
                variant="outline"
                class="text-xs px-2 py-0.5 bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20"
              >
                4Ps Beneficiary
              </Badge>
              <!-- PWD -->
              <Badge
                v-if="applicantRecord.hasDisability"
                variant="outline"
                class="text-xs px-2 py-0.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
              >
                PWD
              </Badge>
              <!-- OFW -->
              <Badge
                v-if="applicantRecord.isOfw || applicantRecord.isFormerOfw"
                variant="outline"
                class="text-xs px-2 py-0.5 bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20"
              >
                {{ applicantRecord.isOfw ? 'Current OFW' : 'Former OFW' }}
              </Badge>
            </div>
            <div class="text-[11px] text-muted-foreground mt-1">
              Registered on: <span class="font-mono text-foreground">{{ formattedRegisteredDate }}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- ─── GIP ECOSYSTEM & LPII CLASSIFICATION BANNER ─── -->
    <div
      :class="[
        'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl p-4 border shadow-xs',
        LPII_CONFIG[applicant.lpiiTag].bgClass,
        LPII_CONFIG[applicant.lpiiTag].badgeClass,
      ]"
    >
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-lg bg-background/80 shadow-xs shrink-0">
          <TreePine v-if="applicant.lpiiTag === 'LOWLAND'" class="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <Mountain v-else-if="applicant.lpiiTag === 'UPLAND'" class="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <Waves v-else class="h-5 w-5 text-sky-600 dark:text-sky-400" />
        </div>
        <div>
          <span class="font-bold text-sm uppercase tracking-wider block">
            {{ LPII_CONFIG[applicant.lpiiTag].label }} Ecosystem Classification
          </span>
          <p class="text-xs opacity-90">
            Registered for Barangay {{ applicant.barangay }}, {{ applicant.municipality }} • Batch {{ applicant.batchYear }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2 self-end sm:self-auto">
        <Badge variant="outline" class="bg-background text-foreground font-mono text-xs px-2.5 py-1">
          AgSur LPII Zone
        </Badge>
      </div>
    </div>

    <!-- ─── DOLE NSRP FORM 1 DETAILS SECTIONS ─── -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- ─── LEFT COLUMN (2 Columns on Large Screens) ─── -->
      <div class="lg:col-span-2 space-y-6">
        <!-- ─── Section I: Personal Information ─── -->
        <Card class="border shadow-xs">
          <CardHeader class="pb-3 border-b bg-muted/20">
            <div class="flex items-center justify-between">
              <CardTitle class="text-sm font-semibold flex items-center gap-2">
                <span>I. Personal Information</span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent class="p-4 space-y-4 text-xs">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="p-3 rounded-lg border bg-card/60">
                <span class="text-muted-foreground block text-[11px]">First Name</span>
                <span class="font-semibold text-foreground mt-0.5 block text-sm">{{ applicantRecord.firstName }}</span>
              </div>
              <div class="p-3 rounded-lg border bg-card/60">
                <span class="text-muted-foreground block text-[11px]">Middle Name</span>
                <span class="font-semibold text-foreground mt-0.5 block text-sm">{{ applicantRecord.middleName || 'N/A' }}</span>
              </div>
              <div class="p-3 rounded-lg border bg-card/60">
                <span class="text-muted-foreground block text-[11px]">Surname</span>
                <span class="font-semibold text-foreground mt-0.5 block text-sm">{{ applicantRecord.surname }}</span>
              </div>
              <div class="p-3 rounded-lg border bg-card/60">
                <span class="text-muted-foreground block text-[11px]">Suffix</span>
                <span class="font-semibold text-foreground mt-0.5 block text-sm">{{ applicantRecord.suffix || 'None' }}</span>
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="p-3 rounded-lg border bg-card/60">
                <span class="text-muted-foreground block text-[11px]">Date of Birth</span>
                <span class="font-medium text-foreground mt-0.5 block">{{ formattedDob }}</span>
              </div>
              <div class="p-3 rounded-lg border bg-card/60">
                <span class="text-muted-foreground block text-[11px]">Age</span>
                <span class="font-medium text-foreground mt-0.5 block">{{ applicantRecord.age ? `${applicantRecord.age} years old` : 'N/A' }}</span>
              </div>
              <div class="p-3 rounded-lg border bg-card/60">
                <span class="text-muted-foreground block text-[11px]">Sex</span>
                <span class="font-medium text-foreground mt-0.5 block">{{ applicantRecord.sex }}</span>
              </div>
              <div class="p-3 rounded-lg border bg-card/60">
                <span class="text-muted-foreground block text-[11px]">Civil Status</span>
                <span class="font-medium text-foreground mt-0.5 block">{{ applicantRecord.civilStatus }}</span>
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div class="p-3 rounded-lg border bg-card/60">
                <span class="text-muted-foreground block text-[11px]">Religion</span>
                <span class="font-medium text-foreground mt-0.5 block">{{ applicantRecord.religion || 'Not Specified' }}</span>
              </div>
              <div class="p-3 rounded-lg border bg-card/60">
                <span class="text-muted-foreground block text-[11px]">Height</span>
                <span class="font-medium text-foreground mt-0.5 block font-mono">
                  {{ applicantRecord.heightFt ? `${applicantRecord.heightFt} ft` : 'Not Specified' }}
                </span>
              </div>
              <div class="p-3 rounded-lg border bg-card/60">
                <span class="text-muted-foreground block text-[11px]">Tax Identification No. (TIN)</span>
                <span class="font-medium text-foreground mt-0.5 block font-mono">{{ applicantRecord.tin || 'N/A' }}</span>
              </div>
            </div>

            <!-- Address Breakdown -->
            <div class="p-3.5 rounded-lg border bg-muted/10 space-y-2">
              <span class="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                <MapPin class="h-3.5 w-3.5 text-primary" />
                Permanent Residential Address Breakdown
              </span>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs pt-1">
                <div>
                  <span class="text-muted-foreground text-[10px]">House / Street / Village</span>
                  <p class="font-medium text-foreground">
                    {{ [applicantRecord.address.houseNumber, applicantRecord.address.street, applicantRecord.address.village].filter(Boolean).join(', ') || 'N/A' }}
                  </p>
                </div>
                <div>
                  <span class="text-muted-foreground text-[10px]">Barangay</span>
                  <p class="font-medium text-foreground">{{ applicantRecord.address.barangay }}</p>
                </div>
                <div>
                  <span class="text-muted-foreground text-[10px]">Municipality / City</span>
                  <p class="font-medium text-foreground">{{ applicantRecord.address.municipality }}</p>
                </div>
                <div>
                  <span class="text-muted-foreground text-[10px]">Province</span>
                  <p class="font-medium text-foreground">{{ applicantRecord.address.province }}</p>
                </div>
                <div>
                  <span class="text-muted-foreground text-[10px]">Region</span>
                  <p class="font-medium text-foreground">{{ applicantRecord.address.region || 'Region XIII (Caraga)' }}</p>
                </div>
                <div>
                  <span class="text-muted-foreground text-[10px]">Full Address</span>
                  <p class="font-medium text-foreground truncate" :title="applicantRecord.fullAddressString">
                    {{ applicantRecord.fullAddressString }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Contact Numbers & Email -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="p-3 rounded-lg border bg-card/60">
                <span class="text-muted-foreground block text-[11px]">Primary Contact Number</span>
                <span class="font-semibold text-foreground mt-0.5 block font-mono text-sm">
                  {{ applicantRecord.contactNumber }}
                </span>
                <div v-if="applicantRecord.allContactNumbers.length > 1" class="mt-2 pt-2 border-t text-[11px]">
                  <span class="text-muted-foreground block text-[10px]">Other Contact Numbers:</span>
                  <div class="flex flex-wrap gap-1 mt-1">
                    <Badge
                      v-for="(cn, idx) in applicantRecord.allContactNumbers"
                      :key="idx"
                      variant="outline"
                      class="text-[10px] font-mono"
                    >
                      {{ cn }}
                    </Badge>
                  </div>
                </div>
              </div>
              <div class="p-3 rounded-lg border bg-card/60">
                <span class="text-muted-foreground block text-[11px]">Email Address</span>
                <span class="font-semibold text-foreground mt-0.5 block font-mono text-sm">
                  {{ applicantRecord.email || 'No email provided' }}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- ─── Section III: Educational Background ─── -->
        <Card class="border shadow-xs">
          <CardHeader class="pb-3 border-b bg-muted/20">
            <div class="flex items-center justify-between">
              <CardTitle class="text-sm font-semibold flex items-center gap-2">
                <span>III. Educational Background</span>
              </CardTitle>
              <Badge variant="secondary" class="text-[10px] font-normal">
                Highest: {{ applicantRecord.highestEducationalAttainment }}
              </Badge>
            </div>
          </CardHeader>
          <CardContent class="p-4 space-y-3">
            <div v-if="applicantRecord.currentlyInSchool" class="p-2.5 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-2 text-xs text-primary font-medium">
              <BookOpen class="h-4 w-4" />
              <span>Applicant is currently enrolled in school.</span>
            </div>

            <div v-if="applicantRecord.educationalBackground.length > 0" class="space-y-2.5">
              <div
                v-for="(edu, idx) in applicantRecord.educationalBackground"
                :key="idx"
                class="p-3.5 rounded-lg border bg-card/60 space-y-1.5 transition-colors hover:bg-muted/20"
              >
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div class="flex items-center gap-2">
                    <Badge variant="outline" class="text-[10px] uppercase bg-muted">
                      {{ edu.level || 'Education' }}
                    </Badge>
                    <span class="font-bold text-xs sm:text-sm text-foreground">
                      {{ edu.course && edu.course !== 'N/A' ? edu.course : edu.level }}
                    </span>
                  </div>
                  <Badge variant="secondary" class="text-[11px] font-mono w-fit">
                    Year Graduated: {{ edu.year_graduated }}
                  </Badge>
                </div>
                <p class="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Building2 class="h-3.5 w-3.5 shrink-0" />
                  <span>{{ edu.school }}</span>
                </p>
                <div v-if="edu.awards" class="flex items-center gap-1.5 text-xs text-primary pt-1">
                  <Award class="h-3.5 w-3.5 shrink-0" />
                  <span>Honors / Awards: {{ edu.awards }}</span>
                </div>
                <div v-if="edu.undergraduate_level_reached" class="text-[11px] text-muted-foreground">
                  Undergraduate Level Reached: <span class="font-medium text-foreground">{{ edu.undergraduate_level_reached }}</span>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-6 text-xs text-muted-foreground italic border rounded-lg bg-muted/10">
              No educational background records found for this applicant.
            </div>
          </CardContent>
        </Card>

        <!-- ─── Section IV: Work Experience ─── -->
        <Card class="border shadow-xs">
          <CardHeader class="pb-3 border-b bg-muted/20">
            <div class="flex items-center justify-between">
              <CardTitle class="text-sm font-semibold flex items-center gap-2">
                <span>IV. Work Experience</span>
              </CardTitle>
              <Badge variant="outline" class="text-[10px] font-mono">
                {{ applicantRecord.workExperiences.length }} Record(s)
              </Badge>
            </div>
          </CardHeader>
          <CardContent class="p-4 space-y-3">
            <div v-if="applicantRecord.workExperiences.length > 0" class="space-y-2.5">
              <div
                v-for="(work, idx) in applicantRecord.workExperiences"
                :key="idx"
                class="p-3.5 rounded-lg border bg-card/60 space-y-1.5 transition-colors hover:bg-muted/20"
              >
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span class="font-bold text-xs sm:text-sm text-foreground">
                    {{ work.position || work.job_title || 'Position Not Specified' }}
                  </span>
                  <Badge variant="outline" class="text-[11px] font-mono w-fit bg-muted">
                    {{ work.inclusive_dates || 'Dates N/A' }}
                  </Badge>
                </div>
                <p class="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Building2 class="h-3.5 w-3.5 shrink-0" />
                  <span class="font-medium text-foreground">{{ work.company_name }}</span>
                </p>
                <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                  <span v-if="work.monthly_salary">
                    Monthly Salary: <span class="font-mono text-foreground font-medium">₱{{ Number(work.monthly_salary).toLocaleString() }}</span>
                  </span>
                  <span v-if="work.status_of_appointment">
                    Appointment: <span class="text-foreground font-medium">{{ work.status_of_appointment }}</span>
                  </span>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-6 text-xs text-muted-foreground italic border rounded-lg bg-muted/10">
              No previous work experiences recorded.
            </div>
          </CardContent>
        </Card>

        <!-- ─── Section V: Technical / Vocational & Other Trainings ─── -->
        <Card class="border shadow-xs">
          <CardHeader class="pb-3 border-b bg-muted/20">
            <div class="flex items-center justify-between">
              <CardTitle class="text-sm font-semibold flex items-center gap-2">
                <span>V. Technical / Vocational Trainings</span>
              </CardTitle>
              <Badge variant="outline" class="text-[10px] font-mono">
                {{ applicantRecord.vocationalTrainings.length }} Training(s)
              </Badge>
            </div>
          </CardHeader>
          <CardContent class="p-4 space-y-3">
            <div v-if="applicantRecord.vocationalTrainings.length > 0" class="space-y-2.5">
              <div
                v-for="(voc, idx) in applicantRecord.vocationalTrainings"
                :key="idx"
                class="p-3.5 rounded-lg border bg-card/60 space-y-1.5"
              >
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span class="font-bold text-xs sm:text-sm text-foreground">
                    {{ voc.course_training_title }}
                  </span>
                  <Badge variant="secondary" class="text-[10px] font-mono w-fit">
                    {{ voc.duration || 'Duration N/A' }}
                  </Badge>
                </div>
                <p class="text-xs text-muted-foreground">
                  Institution: <span class="text-foreground font-medium">{{ voc.training_institution }}</span>
                </p>
                <p v-if="voc.certificates_received" class="text-xs text-primary font-medium">
                  Certificate: {{ voc.certificates_received }}
                </p>
              </div>
            </div>
            <div v-else class="text-center py-6 text-xs text-muted-foreground italic border rounded-lg bg-muted/10">
              No technical or vocational trainings recorded.
            </div>
          </CardContent>
        </Card>

        <!-- ─── Section VI: Eligibility & Professional Licenses ─── -->
        <Card class="border shadow-xs">
          <CardHeader class="pb-3 border-b bg-muted/20">
            <div class="flex items-center justify-between">
              <CardTitle class="text-sm font-semibold flex items-center gap-2">
                <span>VI. Eligibility & Professional Licenses</span>
              </CardTitle>
              <Badge variant="outline" class="text-[10px] font-mono">
                {{ applicantRecord.eligibilities.length }} Eligibility
              </Badge>
            </div>
          </CardHeader>
          <CardContent class="p-4 space-y-3">
            <div v-if="applicantRecord.eligibilities.length > 0" class="space-y-2.5">
              <div
                v-for="(el, idx) in applicantRecord.eligibilities"
                :key="idx"
                class="p-3.5 rounded-lg border bg-card/60 space-y-1.5"
              >
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span class="font-bold text-xs sm:text-sm text-foreground">
                    {{ el.eligibility_title }}
                  </span>
                  <Badge variant="outline" class="text-[10px] font-mono bg-primary/10 text-primary border-primary/20 w-fit">
                    Rating: {{ el.rating }}
                  </Badge>
                </div>
                <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span v-if="el.date_of_examination">
                    Exam Date: <span class="text-foreground font-medium">{{ formatDateDisplay(el.date_of_examination) }}</span>
                  </span>
                  <span v-if="el.place_of_examination">
                    Exam Place: <span class="text-foreground font-medium">{{ el.place_of_examination }}</span>
                  </span>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-6 text-xs text-muted-foreground italic border rounded-lg bg-muted/10">
              No civil service or professional board eligibilities recorded.
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- ─── RIGHT COLUMN (1 Column on Large Screens) ─── -->
      <div class="space-y-6">
        <!-- ─── GIP Application Specifics (Documents Submitted & Evaluation Remarks) ─── -->
        <Card class="border shadow-xs bg-linear-to-b from-card to-muted/20">
          <CardHeader class="pb-3 border-b bg-muted/20">
            <CardTitle class="text-sm font-semibold flex items-center gap-2">
              <FileCheck class="h-4 w-4 text-primary" />
              <span>GIP Documents & Evaluation</span>
            </CardTitle>
          </CardHeader>
          <CardContent class="p-4 space-y-3.5 text-xs">
            <!-- Documents Submitted -->
            <div class="space-y-1.5">
              <span class="text-muted-foreground block text-[11px] font-semibold">
                Documents Submitted
              </span>
              <div v-if="applicant.documentsSubmitted && applicant.documentsSubmitted.length > 0" class="flex flex-wrap gap-1.5 pt-0.5">
                <Badge
                  v-for="doc in applicant.documentsSubmitted"
                  :key="doc"
                  variant="secondary"
                  class="text-[11px] font-medium"
                >
                  <FileCheck class="h-3 w-3 mr-1 text-primary" />
                  {{ doc }}
                </Badge>
              </div>
              <p v-else class="text-[11px] text-muted-foreground italic">
                No documents uploaded yet.
              </p>
            </div>

            <!-- Evaluation Remarks -->
            <div v-if="applicant.remarks && applicant.remarks.length > 0" class="space-y-1.5 pt-2 border-t">
              <span class="text-muted-foreground block text-[11px] font-semibold">
                Evaluation Remarks
              </span>
              <ul class="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                <li v-for="(rem, idx) in applicant.remarks" :key="idx" class="leading-relaxed">
                  <span class="text-foreground">{{ rem }}</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <!-- ─── Section II: Employment & Beneficiary Status ─── -->
        <Card class="border shadow-xs">
          <CardHeader class="pb-3 border-b bg-muted/20">
            <CardTitle class="text-sm font-semibold flex items-center gap-2">
              <span>II. DOLE Status & Classifications</span>
            </CardTitle>
          </CardHeader>
          <CardContent class="p-4 space-y-3 text-xs">
            <div class="p-3 rounded-lg border bg-card/60 space-y-1">
              <span class="text-muted-foreground block text-[11px]">Employment Status</span>
              <p class="font-semibold text-foreground text-sm">{{ applicantRecord.employmentStatus }}</p>
              <p v-if="applicantRecord.employmentType" class="text-[11px] text-muted-foreground">
                Type: <span class="font-medium text-foreground">{{ applicantRecord.employmentType }}</span>
              </p>
            </div>

            <div v-if="applicantRecord.unemployedReason" class="p-3 rounded-lg border bg-card/60 space-y-1">
              <span class="text-muted-foreground block text-[11px]">Unemployment Reason</span>
              <p class="font-medium text-foreground">{{ applicantRecord.unemployedReason }}</p>
              <p v-if="applicantRecord.monthsLookingForWork !== null" class="text-[11px] text-muted-foreground">
                Looking for Work: <span class="font-medium text-foreground font-mono">{{ applicantRecord.monthsLookingForWork }} month(s)</span>
              </p>
            </div>

            <div v-if="applicantRecord.selfEmployedType" class="p-3 rounded-lg border bg-card/60 space-y-1">
              <span class="text-muted-foreground block text-[11px]">Self-Employed Category</span>
              <p class="font-medium text-foreground">{{ applicantRecord.selfEmployedType }}</p>
            </div>

            <!-- Beneficiary Badges Card -->
            <div class="p-3 rounded-lg border bg-card/60 space-y-2">
              <span class="text-muted-foreground block text-[11px] font-semibold">Special Classifications</span>
              <div class="space-y-2 pt-1">
                <!-- 4Ps -->
                <div class="flex items-center justify-between">
                  <span class="text-muted-foreground">4Ps Beneficiary</span>
                  <Badge :variant="applicantRecord.is4psBeneficiary ? 'default' : 'outline'" class="text-[10px]">
                    {{ applicantRecord.is4psBeneficiary ? `Yes (ID: ${applicantRecord.householdId4ps || 'N/A'})` : 'No' }}
                  </Badge>
                </div>

                <!-- PWD -->
                <div class="flex items-center justify-between">
                  <span class="text-muted-foreground">Person with Disability</span>
                  <Badge :variant="applicantRecord.hasDisability ? 'default' : 'outline'" class="text-[10px]">
                    {{ applicantRecord.hasDisability ? 'Yes' : 'No' }}
                  </Badge>
                </div>
                <div v-if="applicantRecord.hasDisability && applicantRecord.disabilities.length > 0" class="pl-2 text-[11px] text-muted-foreground">
                  Disabilities: <span class="font-medium text-foreground">{{ applicantRecord.disabilities.join(', ') }}</span>
                </div>

                <!-- OFW -->
                <div class="flex items-center justify-between">
                  <span class="text-muted-foreground">OFW Status</span>
                  <Badge :variant="applicantRecord.isOfw || applicantRecord.isFormerOfw ? 'default' : 'outline'" class="text-[10px]">
                    {{ applicantRecord.isOfw ? 'Current OFW' : applicantRecord.isFormerOfw ? 'Former OFW' : 'No' }}
                  </Badge>
                </div>
                <div v-if="applicantRecord.isOfw" class="pl-2 text-[11px] text-muted-foreground">
                  Country: <span class="font-medium text-foreground">{{ applicantRecord.ofwCountry || 'N/A' }}</span>
                </div>
                <div v-if="applicantRecord.isFormerOfw" class="pl-2 text-[11px] text-muted-foreground">
                  Former Country: <span class="font-medium text-foreground">{{ applicantRecord.formerOfwCountry || 'N/A' }}</span>
                  <span v-if="applicantRecord.formerOfwReturnDate"> (Returned: {{ formatDateDisplay(applicantRecord.formerOfwReturnDate) }})</span>
                </div>
              </div>
            </div>

            <!-- Referred Programs -->
            <div class="p-3 rounded-lg border bg-card/60 space-y-1.5">
              <span class="text-muted-foreground block text-[11px] font-semibold">Referred Programs</span>
              <div v-if="applicantRecord.referredPrograms.length > 0" class="flex flex-wrap gap-1">
                <Badge
                  v-for="prog in applicantRecord.referredPrograms"
                  :key="prog"
                  variant="secondary"
                  class="text-[11px] font-medium"
                >
                  {{ prog }}
                </Badge>
              </div>
              <p v-else class="text-[11px] text-muted-foreground italic">No specific program assigned</p>
            </div>
          </CardContent>
        </Card>

        <!-- ─── Section VII: Skills & Languages ─── -->
        <Card class="border shadow-xs">
          <CardHeader class="pb-3 border-b bg-muted/20">
            <CardTitle class="text-sm font-semibold flex items-center gap-2">
              <span>VII. Skills & Languages</span>
            </CardTitle>
          </CardHeader>
          <CardContent class="p-4 space-y-4 text-xs">
            <!-- Other Skills -->
            <div class="space-y-1.5">
              <span class="text-muted-foreground block text-[11px] font-semibold">Acquired Skills</span>
              <div v-if="applicantRecord.otherSkills.length > 0" class="flex flex-wrap gap-1">
                <Badge
                  v-for="skill in applicantRecord.otherSkills"
                  :key="skill"
                  variant="outline"
                  class="text-[11px] bg-muted/40 font-normal"
                >
                  {{ skill }}
                </Badge>
              </div>
              <p v-else class="text-[11px] text-muted-foreground italic">No skills specified</p>

              <div v-if="applicantRecord.otherSkillsSpecified" class="pt-1.5">
                <span class="text-muted-foreground text-[10px]">Other Specified Skills:</span>
                <p class="font-medium text-foreground text-xs">{{ applicantRecord.otherSkillsSpecified }}</p>
              </div>
            </div>

            <!-- Language Proficiencies -->
            <div class="space-y-2 pt-2 border-t">
              <span class="text-muted-foreground block text-[11px] font-semibold flex items-center gap-1.5">
                <Languages class="h-3.5 w-3.5 text-primary" />
                Language Proficiencies
              </span>
              <div v-if="applicantRecord.languageProficiencies.length > 0" class="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader class="bg-muted/40">
                    <TableRow>
                      <TableHead class="text-[10px] font-semibold h-7 py-1">Language</TableHead>
                      <TableHead class="text-[10px] font-semibold h-7 py-1 text-center">Read</TableHead>
                      <TableHead class="text-[10px] font-semibold h-7 py-1 text-center">Write</TableHead>
                      <TableHead class="text-[10px] font-semibold h-7 py-1 text-center">Speak</TableHead>
                      <TableHead class="text-[10px] font-semibold h-7 py-1 text-center">Understand</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow
                      v-for="(lang, idx) in applicantRecord.languageProficiencies"
                      :key="idx"
                      class="text-xs"
                    >
                      <TableCell class="py-1.5 font-medium">{{ lang.language }}</TableCell>
                      <TableCell class="py-1.5 text-center">
                        <CheckCircle2 v-if="lang.read" class="h-3.5 w-3.5 text-emerald-500 mx-auto" />
                        <span v-else class="text-muted-foreground text-[10px]">-</span>
                      </TableCell>
                      <TableCell class="py-1.5 text-center">
                        <CheckCircle2 v-if="lang.write" class="h-3.5 w-3.5 text-emerald-500 mx-auto" />
                        <span v-else class="text-muted-foreground text-[10px]">-</span>
                      </TableCell>
                      <TableCell class="py-1.5 text-center">
                        <CheckCircle2 v-if="lang.speak" class="h-3.5 w-3.5 text-emerald-500 mx-auto" />
                        <span v-else class="text-muted-foreground text-[10px]">-</span>
                      </TableCell>
                      <TableCell class="py-1.5 text-center">
                        <CheckCircle2 v-if="lang.understand" class="h-3.5 w-3.5 text-emerald-500 mx-auto" />
                        <span v-else class="text-muted-foreground text-[10px]">-</span>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <p v-else class="text-[11px] text-muted-foreground italic">No language proficiencies recorded</p>
            </div>
          </CardContent>
        </Card>

        <!-- ─── Section VIII: Job Preferences ─── -->
        <Card class="border shadow-xs">
          <CardHeader class="pb-3 border-b bg-muted/20">
            <CardTitle class="text-sm font-semibold flex items-center gap-2">
              <span>VIII. Job & Location Preferences</span>
            </CardTitle>
          </CardHeader>
          <CardContent class="p-4 space-y-3.5 text-xs">
            <!-- Preferred Occupations -->
            <div class="space-y-1.5">
              <span class="text-muted-foreground block text-[11px] font-semibold">Preferred Occupations</span>
              <div v-if="applicantRecord.preferredOccupations.length > 0" class="flex flex-wrap gap-1">
                <Badge
                  v-for="occ in applicantRecord.preferredOccupations"
                  :key="occ"
                  variant="secondary"
                  class="text-[11px]"
                >
                  {{ occ }}
                </Badge>
              </div>
              <p v-else class="text-[11px] text-muted-foreground italic">None specified</p>
            </div>

            <!-- Preferred Local Locations -->
            <div class="space-y-1.5 pt-2 border-t">
              <span class="text-muted-foreground block text-[11px] font-semibold flex items-center gap-1">
                <MapPin class="h-3 w-3 text-primary" />
                Preferred Local Work Locations
              </span>
              <div v-if="applicantRecord.preferredLocalLocations.length > 0" class="flex flex-wrap gap-1">
                <Badge
                  v-for="loc in applicantRecord.preferredLocalLocations"
                  :key="loc"
                  variant="outline"
                  class="text-[11px]"
                >
                  {{ loc }}
                </Badge>
              </div>
              <p v-else class="text-[11px] text-muted-foreground italic">Within Agusan del Sur</p>
            </div>

            <!-- Preferred Overseas Locations -->
            <div class="space-y-1.5 pt-2 border-t">
              <span class="text-muted-foreground block text-[11px] font-semibold flex items-center gap-1">
                <Globe class="h-3 w-3 text-primary" />
                Preferred Overseas Locations
              </span>
              <div v-if="applicantRecord.preferredOverseasLocations.length > 0" class="flex flex-wrap gap-1">
                <Badge
                  v-for="osLoc in applicantRecord.preferredOverseasLocations"
                  :key="osLoc"
                  variant="outline"
                  class="text-[11px] bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20"
                >
                  {{ osLoc }}
                </Badge>
              </div>
              <p v-else class="text-[11px] text-muted-foreground italic">Local employment only</p>
            </div>

            <!-- Preferred Job Type -->
            <div v-if="applicantRecord.jobTypePreference.length > 0" class="space-y-1.5 pt-2 border-t">
              <span class="text-muted-foreground block text-[11px] font-semibold">Job Type Preference</span>
              <div class="flex flex-wrap gap-1">
                <Badge
                  v-for="jt in applicantRecord.jobTypePreference"
                  :key="jt"
                  variant="secondary"
                  class="text-[11px]"
                >
                  {{ jt }}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- ─── Section IX: Administrative Assessment & Metadata ─── -->
        <Card class="border shadow-xs bg-muted/20">
          <CardHeader class="pb-2">
            <CardTitle class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Registry Assessment Metadata
            </CardTitle>
          </CardHeader>
          <CardContent class="p-4 pt-0 space-y-2 text-xs">
            <div class="flex items-center justify-between border-b pb-1.5">
              <span class="text-muted-foreground">Assessed By</span>
              <span class="font-medium text-foreground">{{ applicantRecord.assessedByName || 'Provincial PESO Officer' }}</span>
            </div>
            <div class="flex items-center justify-between border-b pb-1.5">
              <span class="text-muted-foreground">Assessment Date</span>
              <span class="font-mono text-foreground">{{ formattedAssessmentDate }}</span>
            </div>
            <div class="flex items-center justify-between border-b pb-1.5">
              <span class="text-muted-foreground">GIP Application ID</span>
              <span class="font-mono text-muted-foreground truncate max-w-45" :title="applicant.id">{{ applicant.id }}</span>
            </div>
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-muted-foreground">Last Updated</span>
              <span class="font-mono text-muted-foreground">{{ formattedUpdatedDate }}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
