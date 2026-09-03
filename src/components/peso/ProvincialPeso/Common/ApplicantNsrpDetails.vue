<script setup lang="ts">
import { computed } from 'vue'
import {
  ArrowLeft,
  Award,
  BookOpen,
  Building2,
  CheckCircle2,
  Globe,
  Languages,
  Mail,
  MapPin,
  Phone,
  Printer,
  UserX,
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
import { formatDateDisplay, getInitials } from '@/helpers/peso/provincialPeso/applicantEntryHelper'
import type { ApplicantEntryRecord } from '@/types/peso/provincialPeso/applicantEntry'

interface Props {
  applicant: ApplicantEntryRecord
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'back'): void
}>()

const handlePrint = () => {
  window.print()
}

// Age or DOB formatted
const formattedDob = computed(() => formatDateDisplay(props.applicant.dateOfBirth))
const formattedRegisteredDate = computed(() => formatDateDisplay(props.applicant.createdAt))
const formattedUpdatedDate = computed(() => formatDateDisplay(props.applicant.updatedAt))
const formattedAssessmentDate = computed(() => formatDateDisplay(props.applicant.assessmentDate))
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
          @click="emit('back')"
        >
          <ArrowLeft class="h-3.5 w-3.5" />
          <span>Back to Registry</span>
        </Button>
      </div>

      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          class="gap-1.5 text-xs cursor-pointer shadow-xs"
          @click="handlePrint"
        >
          <Printer class="h-3.5 w-3.5" />
          <span>Print / Export Form</span>
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
                <!-- Employment Status Badge -->
                <Badge
                  v-if="applicant.employmentStatus.toLowerCase().includes('employed') && !applicant.employmentStatus.toLowerCase().includes('unemployed')"
                  variant="outline"
                  class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs gap-1 py-0.5"
                >
                  <CheckCircle2 class="h-3 w-3" />
                  {{ applicant.employmentStatus }}
                </Badge>
                <Badge
                  v-else
                  variant="outline"
                  class="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs gap-1 py-0.5"
                >
                  <UserX class="h-3 w-3" />
                  {{ applicant.employmentStatus }}
                </Badge>
              </div>

              <!-- Demographics Line -->
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span class="font-medium text-foreground">{{ applicant.sex }}</span>
                <span>•</span>
                <span>{{ applicant.age ? `${applicant.age} yrs old` : 'Age N/A' }} ({{ formattedDob }})</span>
                <span>•</span>
                <span>{{ applicant.civilStatus }}</span>
                <template v-if="applicant.religion">
                  <span>•</span>
                  <span>{{ applicant.religion }}</span>
                </template>
              </div>

              <!-- Contact & Location Highlights -->
              <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                <div class="flex items-center gap-1.5">
                  <MapPin class="h-3.5 w-3.5 text-primary shrink-0" />
                  <span class="text-foreground font-medium">{{ applicant.fullAddressString }}</span>
                </div>
                <div v-if="applicant.contactNumber && applicant.contactNumber !== 'N/A'" class="flex items-center gap-1.5 font-mono">
                  <Phone class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{{ applicant.contactNumber }}</span>
                </div>
                <div v-if="applicant.email" class="flex items-center gap-1.5 font-mono">
                  <Mail class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{{ applicant.email }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Programs and Badges Group -->
          <div class="flex flex-wrap md:flex-col items-start md:items-end gap-2 shrink-0 border-t md:border-t-0 pt-4 md:pt-0">
            <div class="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
              Enrolled Programs & Status
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <!-- GIP -->
              <Badge
                v-if="applicant.referredPrograms.some((p) => p.toUpperCase().includes('GIP'))"
                variant="secondary"
                class="text-xs px-2.5 py-0.5 bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 font-semibold"
              >
                GIP Intern
              </Badge>
              <!-- TUPAD -->
              <Badge
                v-if="applicant.referredPrograms.some((p) => p.toUpperCase().includes('TUPAD'))"
                variant="secondary"
                class="text-xs px-2.5 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold"
              >
                TUPAD Worker
              </Badge>
              <!-- SPES -->
              <Badge
                v-if="applicant.referredPrograms.some((p) => p.toUpperCase().includes('SPES'))"
                variant="secondary"
                class="text-xs px-2.5 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold"
              >
                SPES Student
              </Badge>
              <!-- 4Ps -->
              <Badge
                v-if="applicant.is4psBeneficiary"
                variant="outline"
                class="text-xs px-2 py-0.5 bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20"
              >
                4Ps Beneficiary
              </Badge>
              <!-- PWD -->
              <Badge
                v-if="applicant.hasDisability"
                variant="outline"
                class="text-xs px-2 py-0.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
              >
                PWD
              </Badge>
              <!-- OFW -->
              <Badge
                v-if="applicant.isOfw || applicant.isFormerOfw"
                variant="outline"
                class="text-xs px-2 py-0.5 bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20"
              >
                {{ applicant.isOfw ? 'Current OFW' : 'Former OFW' }}
              </Badge>
              <!-- General -->
              <Badge
                v-if="
                  !applicant.referredPrograms.some((p) =>
                    ['GIP', 'TUPAD', 'SPES'].some((key) => p.toUpperCase().includes(key))
                  ) &&
                  !applicant.is4psBeneficiary &&
                  !applicant.hasDisability &&
                  !applicant.isOfw &&
                  !applicant.isFormerOfw
                "
                variant="outline"
                class="text-xs text-muted-foreground"
              >
                General Applicant
              </Badge>
            </div>
            <div class="text-[11px] text-muted-foreground mt-1">
              Registered on: <span class="font-mono text-foreground">{{ formattedRegisteredDate }}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

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
                <span class="font-semibold text-foreground mt-0.5 block text-sm">{{ applicant.firstName }}</span>
              </div>
              <div class="p-3 rounded-lg border bg-card/60">
                <span class="text-muted-foreground block text-[11px]">Middle Name</span>
                <span class="font-semibold text-foreground mt-0.5 block text-sm">{{ applicant.middleName || 'N/A' }}</span>
              </div>
              <div class="p-3 rounded-lg border bg-card/60">
                <span class="text-muted-foreground block text-[11px]">Surname</span>
                <span class="font-semibold text-foreground mt-0.5 block text-sm">{{ applicant.surname }}</span>
              </div>
              <div class="p-3 rounded-lg border bg-card/60">
                <span class="text-muted-foreground block text-[11px]">Suffix</span>
                <span class="font-semibold text-foreground mt-0.5 block text-sm">{{ applicant.suffix || 'None' }}</span>
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="p-3 rounded-lg border bg-card/60">
                <span class="text-muted-foreground block text-[11px]">Date of Birth</span>
                <span class="font-medium text-foreground mt-0.5 block">{{ formattedDob }}</span>
              </div>
              <div class="p-3 rounded-lg border bg-card/60">
                <span class="text-muted-foreground block text-[11px]">Age</span>
                <span class="font-medium text-foreground mt-0.5 block">{{ applicant.age ? `${applicant.age} years old` : 'N/A' }}</span>
              </div>
              <div class="p-3 rounded-lg border bg-card/60">
                <span class="text-muted-foreground block text-[11px]">Sex</span>
                <span class="font-medium text-foreground mt-0.5 block">{{ applicant.sex }}</span>
              </div>
              <div class="p-3 rounded-lg border bg-card/60">
                <span class="text-muted-foreground block text-[11px]">Civil Status</span>
                <span class="font-medium text-foreground mt-0.5 block">{{ applicant.civilStatus }}</span>
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div class="p-3 rounded-lg border bg-card/60">
                <span class="text-muted-foreground block text-[11px]">Religion</span>
                <span class="font-medium text-foreground mt-0.5 block">{{ applicant.religion || 'Not Specified' }}</span>
              </div>
              <div class="p-3 rounded-lg border bg-card/60">
                <span class="text-muted-foreground block text-[11px]">Height</span>
                <span class="font-medium text-foreground mt-0.5 block font-mono">
                  {{ applicant.heightFt ? `${applicant.heightFt} ft` : 'Not Specified' }}
                </span>
              </div>
              <div class="p-3 rounded-lg border bg-card/60">
                <span class="text-muted-foreground block text-[11px]">Tax Identification No. (TIN)</span>
                <span class="font-medium text-foreground mt-0.5 block font-mono">{{ applicant.tin || 'N/A' }}</span>
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
                    {{ [applicant.address.houseNumber, applicant.address.street, applicant.address.village].filter(Boolean).join(', ') || 'N/A' }}
                  </p>
                </div>
                <div>
                  <span class="text-muted-foreground text-[10px]">Barangay</span>
                  <p class="font-medium text-foreground">{{ applicant.address.barangay }}</p>
                </div>
                <div>
                  <span class="text-muted-foreground text-[10px]">Municipality / City</span>
                  <p class="font-medium text-foreground">{{ applicant.address.municipality }}</p>
                </div>
                <div>
                  <span class="text-muted-foreground text-[10px]">Province</span>
                  <p class="font-medium text-foreground">{{ applicant.address.province }}</p>
                </div>
                <div>
                  <span class="text-muted-foreground text-[10px]">Region</span>
                  <p class="font-medium text-foreground">{{ applicant.address.region || 'Region XIII (Caraga)' }}</p>
                </div>
                <div>
                  <span class="text-muted-foreground text-[10px]">Full Address</span>
                  <p class="font-medium text-foreground truncate" :title="applicant.fullAddressString">
                    {{ applicant.fullAddressString }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Contact Numbers & Email -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="p-3 rounded-lg border bg-card/60">
                <span class="text-muted-foreground block text-[11px]">Primary Contact Number</span>
                <span class="font-semibold text-foreground mt-0.5 block font-mono text-sm">
                  {{ applicant.contactNumber }}
                </span>
                <div v-if="applicant.allContactNumbers.length > 1" class="mt-2 pt-2 border-t text-[11px]">
                  <span class="text-muted-foreground block text-[10px]">Other Contact Numbers:</span>
                  <div class="flex flex-wrap gap-1 mt-1">
                    <Badge
                      v-for="(cn, idx) in applicant.allContactNumbers"
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
                  {{ applicant.email || 'No email provided' }}
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
                Highest: {{ applicant.highestEducationalAttainment }}
              </Badge>
            </div>
          </CardHeader>
          <CardContent class="p-4 space-y-3">
            <div v-if="applicant.currentlyInSchool" class="p-2.5 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-2 text-xs text-primary font-medium">
              <BookOpen class="h-4 w-4" />
              <span>Applicant is currently enrolled in school.</span>
            </div>

            <div v-if="applicant.educationalBackground.length > 0" class="space-y-2.5">
              <div
                v-for="(edu, idx) in applicant.educationalBackground"
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
                {{ applicant.workExperiences.length }} Record(s)
              </Badge>
            </div>
          </CardHeader>
          <CardContent class="p-4 space-y-3">
            <div v-if="applicant.workExperiences.length > 0" class="space-y-2.5">
              <div
                v-for="(work, idx) in applicant.workExperiences"
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
                {{ applicant.vocationalTrainings.length }} Training(s)
              </Badge>
            </div>
          </CardHeader>
          <CardContent class="p-4 space-y-3">
            <div v-if="applicant.vocationalTrainings.length > 0" class="space-y-2.5">
              <div
                v-for="(voc, idx) in applicant.vocationalTrainings"
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
                {{ applicant.eligibilities.length }} Eligibility
              </Badge>
            </div>
          </CardHeader>
          <CardContent class="p-4 space-y-3">
            <div v-if="applicant.eligibilities.length > 0" class="space-y-2.5">
              <div
                v-for="(el, idx) in applicant.eligibilities"
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
              <p class="font-semibold text-foreground text-sm">{{ applicant.employmentStatus }}</p>
              <p v-if="applicant.employmentType" class="text-[11px] text-muted-foreground">
                Type: <span class="font-medium text-foreground">{{ applicant.employmentType }}</span>
              </p>
            </div>

            <div v-if="applicant.unemployedReason" class="p-3 rounded-lg border bg-card/60 space-y-1">
              <span class="text-muted-foreground block text-[11px]">Unemployment Reason</span>
              <p class="font-medium text-foreground">{{ applicant.unemployedReason }}</p>
              <p v-if="applicant.monthsLookingForWork !== null" class="text-[11px] text-muted-foreground">
                Looking for Work: <span class="font-medium text-foreground font-mono">{{ applicant.monthsLookingForWork }} month(s)</span>
              </p>
            </div>

            <div v-if="applicant.selfEmployedType" class="p-3 rounded-lg border bg-card/60 space-y-1">
              <span class="text-muted-foreground block text-[11px]">Self-Employed Category</span>
              <p class="font-medium text-foreground">{{ applicant.selfEmployedType }}</p>
            </div>

            <!-- Beneficiary Badges Card -->
            <div class="p-3 rounded-lg border bg-card/60 space-y-2">
              <span class="text-muted-foreground block text-[11px] font-semibold">Special Classifications</span>
              <div class="space-y-2 pt-1">
                <!-- 4Ps -->
                <div class="flex items-center justify-between">
                  <span class="text-muted-foreground">4Ps Beneficiary</span>
                  <Badge :variant="applicant.is4psBeneficiary ? 'default' : 'outline'" class="text-[10px]">
                    {{ applicant.is4psBeneficiary ? `Yes (ID: ${applicant.householdId4ps || 'N/A'})` : 'No' }}
                  </Badge>
                </div>

                <!-- PWD -->
                <div class="flex items-center justify-between">
                  <span class="text-muted-foreground">Person with Disability</span>
                  <Badge :variant="applicant.hasDisability ? 'default' : 'outline'" class="text-[10px]">
                    {{ applicant.hasDisability ? 'Yes' : 'No' }}
                  </Badge>
                </div>
                <div v-if="applicant.hasDisability && applicant.disabilities.length > 0" class="pl-2 text-[11px] text-muted-foreground">
                  Disabilities: <span class="font-medium text-foreground">{{ applicant.disabilities.join(', ') }}</span>
                </div>

                <!-- OFW -->
                <div class="flex items-center justify-between">
                  <span class="text-muted-foreground">OFW Status</span>
                  <Badge :variant="applicant.isOfw || applicant.isFormerOfw ? 'default' : 'outline'" class="text-[10px]">
                    {{ applicant.isOfw ? 'Current OFW' : applicant.isFormerOfw ? 'Former OFW' : 'No' }}
                  </Badge>
                </div>
                <div v-if="applicant.isOfw" class="pl-2 text-[11px] text-muted-foreground">
                  Country: <span class="font-medium text-foreground">{{ applicant.ofwCountry || 'N/A' }}</span>
                </div>
                <div v-if="applicant.isFormerOfw" class="pl-2 text-[11px] text-muted-foreground">
                  Former Country: <span class="font-medium text-foreground">{{ applicant.formerOfwCountry || 'N/A' }}</span>
                  <span v-if="applicant.formerOfwReturnDate"> (Returned: {{ formatDateDisplay(applicant.formerOfwReturnDate) }})</span>
                </div>
              </div>
            </div>

            <!-- Referred Programs -->
            <div class="p-3 rounded-lg border bg-card/60 space-y-1.5">
              <span class="text-muted-foreground block text-[11px] font-semibold">Referred Programs</span>
              <div v-if="applicant.referredPrograms.length > 0" class="flex flex-wrap gap-1">
                <Badge
                  v-for="prog in applicant.referredPrograms"
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
              <div v-if="applicant.otherSkills.length > 0" class="flex flex-wrap gap-1">
                <Badge
                  v-for="skill in applicant.otherSkills"
                  :key="skill"
                  variant="outline"
                  class="text-[11px] bg-muted/40 font-normal"
                >
                  {{ skill }}
                </Badge>
              </div>
              <p v-else class="text-[11px] text-muted-foreground italic">No skills specified</p>

              <div v-if="applicant.otherSkillsSpecified" class="pt-1.5">
                <span class="text-muted-foreground text-[10px]">Other Specified Skills:</span>
                <p class="font-medium text-foreground text-xs">{{ applicant.otherSkillsSpecified }}</p>
              </div>
            </div>

            <!-- Language Proficiencies -->
            <div class="space-y-2 pt-2 border-t">
              <span class="text-muted-foreground block text-[11px] font-semibold flex items-center gap-1.5">
                <Languages class="h-3.5 w-3.5 text-primary" />
                Language Proficiencies
              </span>
              <div v-if="applicant.languageProficiencies.length > 0" class="overflow-x-auto border rounded-lg">
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
                      v-for="(lang, idx) in applicant.languageProficiencies"
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
              <div v-if="applicant.preferredOccupations.length > 0" class="flex flex-wrap gap-1">
                <Badge
                  v-for="occ in applicant.preferredOccupations"
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
              <div v-if="applicant.preferredLocalLocations.length > 0" class="flex flex-wrap gap-1">
                <Badge
                  v-for="loc in applicant.preferredLocalLocations"
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
              <div v-if="applicant.preferredOverseasLocations.length > 0" class="flex flex-wrap gap-1">
                <Badge
                  v-for="osLoc in applicant.preferredOverseasLocations"
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
            <div v-if="applicant.jobTypePreference.length > 0" class="space-y-1.5 pt-2 border-t">
              <span class="text-muted-foreground block text-[11px] font-semibold">Job Type Preference</span>
              <div class="flex flex-wrap gap-1">
                <Badge
                  v-for="jt in applicant.jobTypePreference"
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
              <span class="font-medium text-foreground">{{ applicant.assessedByName || 'Provincial PESO Officer' }}</span>
            </div>
            <div class="flex items-center justify-between border-b pb-1.5">
              <span class="text-muted-foreground">Assessment Date</span>
              <span class="font-mono text-foreground">{{ formattedAssessmentDate }}</span>
            </div>
            <div class="flex items-center justify-between border-b pb-1.5">
              <span class="text-muted-foreground">System ID</span>
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
