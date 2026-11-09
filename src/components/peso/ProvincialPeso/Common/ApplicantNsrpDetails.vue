<script setup lang="ts">
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Printer,
  UserX,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { ApplicantEntryRecord } from '@/types/peso/provincialPeso/applicantEntry'
import { useApplicantNsrpDetails } from '@/composables/peso/provincialPeso/useApplicantNsrpDetails'
import { provideApplicantNsrpDetails } from '@/composables/peso/provincialPeso/applicantNsrpDetailsContext'
import NsrpPersonalSection from '@/components/peso/ProvincialPeso/Common/NsrpDetails/NsrpPersonalSection.vue'
import NsrpEducationSection from '@/components/peso/ProvincialPeso/Common/NsrpDetails/NsrpEducationSection.vue'
import NsrpVocationalSection from '@/components/peso/ProvincialPeso/Common/NsrpDetails/NsrpVocationalSection.vue'
import NsrpEligibilitySection from '@/components/peso/ProvincialPeso/Common/NsrpDetails/NsrpEligibilitySection.vue'
import NsrpWorkExperienceSection from '@/components/peso/ProvincialPeso/Common/NsrpDetails/NsrpWorkExperienceSection.vue'
import NsrpEmploymentStatusSection from '@/components/peso/ProvincialPeso/Common/NsrpDetails/NsrpEmploymentStatusSection.vue'
import NsrpJobPreferenceSection from '@/components/peso/ProvincialPeso/Common/NsrpDetails/NsrpJobPreferenceSection.vue'
import NsrpLanguageSection from '@/components/peso/ProvincialPeso/Common/NsrpDetails/NsrpLanguageSection.vue'
import NsrpSkillsSection from '@/components/peso/ProvincialPeso/Common/NsrpDetails/NsrpSkillsSection.vue'

interface Props {
  applicant?: ApplicantEntryRecord
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'back'): void
}>()

const nsrp = useApplicantNsrpDetails({ props, emit })
// The section components (NsrpDetails/*.vue) read and edit the same state
provideApplicantNsrpDetails(nsrp)

const {
  // Renamed: `applicant` is also a prop name (vue/no-dupe-keys); this one falls back to the store
  applicant: record,
  isLoading,
  isGeneratingPdf,
  isPrintingPdf,
  handleBack,
  handlePrint,
  handleDownloadForm,
  formattedDob,
  formattedRegisteredDate,
  formattedUpdatedDate,
  formattedAssessmentDate,
  getInitials,
  avatarUrl,
  isSaving,
} = nsrp
</script>

<template>
  <div v-if="record" class="flex flex-col gap-6 pb-16 print:p-0 print:gap-4">
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
          <span>Back to Registry</span>
        </Button>
      </div>

      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          class="gap-1.5 text-xs cursor-pointer shadow-xs hover:bg-muted"
          :disabled="isGeneratingPdf || isSaving"
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
          :disabled="isPrintingPdf || isSaving"
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
              <AvatarImage v-if="avatarUrl" :src="avatarUrl" :alt="record.fullName" class="object-cover" />
              <AvatarFallback class="font-bold text-xl sm:text-2xl text-primary">
                {{ getInitials(record.fullName) }}
              </AvatarFallback>
            </Avatar>

            <div class="space-y-1.5 min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {{ record.fullName }}
                </h2>
                <!-- Employment Status Badge -->
                <Badge
                  v-if="record.employmentStatus.toLowerCase().includes('employed') && !record.employmentStatus.toLowerCase().includes('unemployed')"
                  variant="outline"
                  class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs gap-1 py-0.5"
                >
                  <CheckCircle2 class="h-3 w-3" />
                  {{ record.employmentStatus }}
                </Badge>
                <Badge
                  v-else
                  variant="outline"
                  class="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs gap-1 py-0.5"
                >
                  <UserX class="h-3 w-3" />
                  {{ record.employmentStatus }}
                </Badge>
              </div>

              <!-- Demographics Line -->
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span class="font-medium text-foreground">{{ record.sex }}</span>
                <span>•</span>
                <span>{{ record.age ? `${record.age} yrs old` : 'Age N/A' }} ({{ formattedDob }})</span>
                <span>•</span>
                <span>{{ record.civilStatus }}</span>
                <template v-if="record.religion">
                  <span>•</span>
                  <span>{{ record.religion }}</span>
                </template>
              </div>

              <!-- Contact & Location Highlights -->
              <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                <div class="flex items-center gap-1.5">
                  <MapPin class="h-3.5 w-3.5 text-primary shrink-0" />
                  <span class="text-foreground font-medium">{{ record.fullAddressString }}</span>
                </div>
                <div v-if="record.contactNumber && record.contactNumber !== 'N/A'" class="flex items-center gap-1.5 font-mono">
                  <Phone class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{{ record.contactNumber }}</span>
                </div>
                <div v-if="record.email" class="flex items-center gap-1.5 font-mono">
                  <Mail class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{{ record.email }}</span>
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
              <!-- GIP -->
              <Badge
                v-if="record.referredPrograms.some((p) => p.toUpperCase().includes('GIP'))"
                variant="secondary"
                class="text-xs px-2.5 py-0.5 bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 font-semibold"
              >
                GIP Intern
              </Badge>
              <!-- TUPAD -->
              <Badge
                v-if="record.referredPrograms.some((p) => p.toUpperCase().includes('TUPAD'))"
                variant="secondary"
                class="text-xs px-2.5 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold"
              >
                TUPAD Worker
              </Badge>
              <!-- SPES -->
              <Badge
                v-if="record.referredPrograms.some((p) => p.toUpperCase().includes('SPES'))"
                variant="secondary"
                class="text-xs px-2.5 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold"
              >
                SPES Student
              </Badge>
              <!-- JobStart -->
              <Badge
                v-if="record.referredPrograms.some((p) => p.toUpperCase().includes('JOBSTART'))"
                variant="secondary"
                class="text-xs px-2.5 py-0.5 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 font-semibold"
              >
                JobStart
              </Badge>
              <!-- DILEEP -->
              <Badge
                v-if="record.referredPrograms.some((p) => p.toUpperCase().includes('DILEEP'))"
                variant="secondary"
                class="text-xs px-2.5 py-0.5 bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30 font-semibold"
              >
                DILEEP
              </Badge>
              <!-- TESDA -->
              <Badge
                v-if="record.referredPrograms.some((p) => p.toUpperCase().includes('TESDA'))"
                variant="secondary"
                class="text-xs px-2.5 py-0.5 bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 font-semibold"
              >
                TESDA Training
              </Badge>
              <!-- 4Ps -->
              <Badge
                v-if="record.is4psBeneficiary"
                variant="outline"
                class="text-xs px-2 py-0.5 bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20"
              >
                4Ps Beneficiary
              </Badge>
              <!-- PWD -->
              <Badge
                v-if="record.hasDisability"
                variant="outline"
                class="text-xs px-2 py-0.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
              >
                PWD
              </Badge>
              <!-- OFW -->
              <Badge
                v-if="record.isOfw || record.isFormerOfw"
                variant="outline"
                class="text-xs px-2 py-0.5 bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20"
              >
                {{ record.isOfw ? 'Current OFW' : 'Former OFW' }}
              </Badge>
              <!-- General -->
              <Badge
                v-if="
                  !record.referredPrograms.some((p) =>
                    ['SPES', 'GIP', 'TUPAD', 'JOBSTART', 'DILEEP', 'TESDA'].some((key) => p.toUpperCase().includes(key))
                  ) &&
                  !record.is4psBeneficiary &&
                  !record.hasDisability &&
                  !record.isOfw &&
                  !record.isFormerOfw
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
        <NsrpPersonalSection />

        <!-- ─── Section IV: Educational Background ─── -->
      <NsrpEducationSection />

        <!-- ─── Section V: Technical/Vocational ─── -->
      <NsrpVocationalSection />

        <!-- ─── Section VI: Eligibility ─── -->
      <NsrpEligibilitySection />

        <!-- ─── Section VII: Work Experience ─── -->
      <NsrpWorkExperienceSection />
      </div>

      <!-- ─── RIGHT COLUMN (1 Column on Large Screens) ─── -->
      <div class="space-y-6">
        <!-- ─── Employment Status & Special Classifications ─── -->
        <NsrpEmploymentStatusSection />

        <!-- ─── Section II: Job Preference ─── -->
        <NsrpJobPreferenceSection />

        <!-- ─── Section III: Language / Dialect ─── -->
        <NsrpLanguageSection />

        <!-- ─── Section VIII: Other Skills Acquired ─── -->
        <NsrpSkillsSection />

        <!-- ─── Registry Assessment Metadata ─── -->
        <Card class="border shadow-xs bg-muted/20 print:hidden">
          <CardHeader class="pb-2">
            <CardTitle class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Registry Assessment Metadata
            </CardTitle>
          </CardHeader>
          <CardContent class="p-4 pt-0 space-y-2 text-xs">
            <div class="flex items-center justify-between border-b pb-1.5">
              <span class="text-muted-foreground">Assessed By</span>
              <span class="font-medium text-foreground">{{ record.assessedByName || "Provincial PESO Officer" }}</span>
            </div>
            <div class="flex items-center justify-between border-b pb-1.5">
              <span class="text-muted-foreground">Assessment Date</span>
              <span class="font-mono text-foreground">{{ formattedAssessmentDate }}</span>
            </div>
            <div class="flex items-center justify-between border-b pb-1.5">
              <span class="text-muted-foreground">Registry System ID</span>
              <span class="font-mono text-muted-foreground truncate max-w-45" :title="record.id">{{ record.id }}</span>
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

  <!-- Loading State Fallback -->
  <div v-else-if="isLoading" class="flex flex-col items-center justify-center min-h-[400px] gap-3">
    <Loader2 class="h-8 w-8 animate-spin text-primary" />
    <p class="text-sm text-muted-foreground">Loading applicant profile...</p>
  </div>

  <!-- Not Found State Fallback -->
  <div v-else class="flex flex-col items-center justify-center min-h-[400px] gap-4">
    <UserX class="h-12 w-12 text-muted-foreground" />
    <div class="text-center">
      <h3 class="font-semibold text-lg">Applicant Record Not Found</h3>
      <p class="text-sm text-muted-foreground">The requested applicant profile could not be located in the registry.</p>
    </div>
    <Button variant="outline" size="sm" class="gap-2 cursor-pointer" @click="handleBack">
      <ArrowLeft class="h-4 w-4" />
      <span>Back to Registry</span>
    </Button>
  </div>
</template>

