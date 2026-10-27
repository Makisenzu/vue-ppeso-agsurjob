<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeft, Check, Loader2, Printer } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { GipApplicantRecord } from '@/types/peso/provincialPeso/gip'
import { useGipApplicantNsrpDetails } from '@/composables/peso/provincialPeso/useGipApplicantNsrpDetails'
import { getGipStatusBadgeClass } from '@/helpers/peso/provincialPeso/gipHelper'

interface Props {
  applicant: GipApplicantRecord
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'back'): void
}>()

const {
  applicantRecord,
  isGeneratingPdf,
  isPrintingPdf,
  handleBack,
  handleDownloadForm,
  handlePrint,
  formattedDob,
  formattedRegisteredDate,
  formattedAssessmentDate,
  formattedUpdatedDate,
  displayDocumentsSubmitted,
  getInitials,
  formatDateDisplay,
  LPII_CONFIG,
  avatarUrl,
} = useGipApplicantNsrpDetails({ props, emit })

const isEmployed = computed(() => {
  const status = applicantRecord.value.employmentStatus.toLowerCase()
  return status.includes('employed') && !status.includes('unemployed')
})

const personalFields = computed(() => {
  const r = applicantRecord.value
  return [
    { label: 'First Name', value: r.firstName },
    { label: 'Middle Name', value: r.middleName || 'N/A' },
    { label: 'Surname', value: r.surname },
    { label: 'Suffix', value: r.suffix || 'None' },
    { label: 'Date of Birth', value: formattedDob.value },
    { label: 'Age', value: r.age ? `${r.age} years old` : 'N/A' },
    { label: 'Sex', value: r.sex },
    { label: 'Civil Status', value: r.civilStatus },
    { label: 'Religion', value: r.religion || 'Not specified' },
    { label: 'Height', value: r.heightFt ? `${r.heightFt} ft` : 'Not specified' },
    { label: 'TIN', value: r.tin || 'N/A', mono: true },
  ]
})

const addressFields = computed(() => {
  const a = applicantRecord.value.address
  return [
    { label: 'House / Street / Village', value: [a.houseNumber, a.street, a.village].filter(Boolean).join(', ') || 'N/A' },
    { label: 'Barangay', value: a.barangay },
    { label: 'Municipality / City', value: a.municipality },
    { label: 'Province', value: a.province },
    { label: 'Region', value: a.region || 'Region XIII (Caraga)' },
  ]
})

const languageSkills = ['read', 'write', 'speak', 'understand'] as const
</script>

<template>
  <div class="flex flex-col gap-6 pb-16 print:gap-4 print:p-0">
    <!-- ─── Navigation & Actions ─── -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
      <Button variant="ghost" size="sm" class="-ml-2 self-start cursor-pointer" @click="handleBack">
        <ArrowLeft class="size-4 shrink-0" />
        Back to Applicants
      </Button>

      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" class="cursor-pointer" :disabled="isGeneratingPdf" @click="handleDownloadForm">
          <Loader2 v-if="isGeneratingPdf" class="size-4 shrink-0 animate-spin" />
          {{ isGeneratingPdf ? 'Generating PDF...' : 'Download PDF Form' }}
        </Button>
        <Button size="sm" class="cursor-pointer" :disabled="isPrintingPdf" @click="handlePrint">
          <Loader2 v-if="isPrintingPdf" class="size-4 shrink-0 animate-spin" />
          <Printer v-else class="size-4 shrink-0" />
          {{ isPrintingPdf ? 'Preparing Print...' : 'Print NSRP Form' }}
        </Button>
      </div>
    </div>

    <!-- ─── Overview ─── -->
    <Card>
      <CardContent class="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div class="flex items-start gap-4">
          <Avatar class="size-16 shrink-0 border">
            <AvatarImage v-if="avatarUrl" :src="avatarUrl" :alt="applicant.fullName" class="object-cover" />
            <AvatarFallback class="text-xl font-semibold">
              {{ getInitials(applicant.fullName) }}
            </AvatarFallback>
          </Avatar>

          <div class="min-w-0 space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-2xl font-bold tracking-tight">{{ applicant.fullName }}</h1>
              <Badge variant="outline" :class="getGipStatusBadgeClass(applicant.status)">
                GIP {{ applicant.status }}
              </Badge>
              <Badge
                variant="outline"
                :class="isEmployed ? 'border-success/30 bg-success/10 text-success' : 'border-warning/30 bg-warning/10 text-warning'"
              >
                {{ applicantRecord.employmentStatus }}
              </Badge>
            </div>

            <p class="text-sm text-muted-foreground">
              {{ applicantRecord.sex }}
              · {{ applicantRecord.age ? `${applicantRecord.age} yrs old` : 'Age N/A' }} ({{ formattedDob }})
              · {{ applicantRecord.civilStatus }}
              <template v-if="applicantRecord.religion"> · {{ applicantRecord.religion }}</template>
              · <span class="font-mono">{{ applicant.code }}</span>
            </p>

            <p class="text-sm">
              {{ applicantRecord.fullAddressString }}
              <template v-if="applicantRecord.contactNumber && applicantRecord.contactNumber !== 'N/A'">
                <span class="text-muted-foreground"> · </span><span class="font-mono">{{ applicantRecord.contactNumber }}</span>
              </template>
              <template v-if="applicantRecord.email">
                <span class="text-muted-foreground"> · </span>{{ applicantRecord.email }}
              </template>
            </p>
          </div>
        </div>

        <div class="flex shrink-0 flex-col gap-2 border-t pt-4 md:items-end md:border-t-0 md:pt-0">
          <span class="text-xs text-muted-foreground">Applied Programs</span>
          <div class="flex flex-wrap gap-1.5 md:justify-end">
            <Badge variant="secondary">GIP Intern (Batch {{ applicant.batchYear }})</Badge>
            <Badge v-if="applicantRecord.is4psBeneficiary" variant="secondary">4Ps Beneficiary</Badge>
            <Badge v-if="applicantRecord.hasDisability" variant="secondary">PWD</Badge>
            <Badge v-if="applicantRecord.isOfw || applicantRecord.isFormerOfw" variant="secondary">
              {{ applicantRecord.isOfw ? 'Current OFW' : 'Former OFW' }}
            </Badge>
          </div>
          <span class="text-xs text-muted-foreground">
            Registered {{ formattedRegisteredDate }}
          </span>
        </div>
      </CardContent>
    </Card>

    <!-- ─── LPII Classification ─── -->
    <div class="flex flex-wrap items-center gap-2 text-sm">
      <Badge variant="outline" :class="LPII_CONFIG[applicant.lpiiTag].badgeClass">
        {{ LPII_CONFIG[applicant.lpiiTag].label }}
      </Badge>
      <span class="text-muted-foreground">
        LPII ecosystem classification for Brgy. {{ applicant.barangay }}, {{ applicant.municipality }} · Batch {{ applicant.batchYear }}
      </span>
    </div>

    <!-- ─── NSRP Form 1 Sections ─── -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Left column -->
      <div class="space-y-6 lg:col-span-2">
        <!-- I. Personal Information -->
        <Card>
          <CardHeader>
            <CardTitle class="text-base">I. Personal Information</CardTitle>
          </CardHeader>
          <CardContent class="grid gap-6">
            <div class="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              <div v-for="field in personalFields" :key="field.label">
                <span class="text-xs text-muted-foreground">{{ field.label }}</span>
                <p :class="['text-sm font-medium', field.mono && 'font-mono']">{{ field.value }}</p>
              </div>
            </div>

            <Separator />

            <div class="space-y-3">
              <h3 class="text-sm font-semibold">Permanent Residential Address</h3>
              <div class="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                <div v-for="field in addressFields" :key="field.label">
                  <span class="text-xs text-muted-foreground">{{ field.label }}</span>
                  <p class="text-sm font-medium">{{ field.value }}</p>
                </div>
              </div>
            </div>

            <Separator />

            <div class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <div>
                <span class="text-xs text-muted-foreground">Primary Contact Number</span>
                <p class="font-mono text-sm font-medium">{{ applicantRecord.contactNumber }}</p>
                <p v-if="applicantRecord.allContactNumbers.length > 1" class="mt-1 text-xs text-muted-foreground">
                  Other numbers: <span class="font-mono">{{ applicantRecord.allContactNumbers.join(', ') }}</span>
                </p>
              </div>
              <div>
                <span class="text-xs text-muted-foreground">Email Address</span>
                <p class="text-sm font-medium">{{ applicantRecord.email || 'No email provided' }}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- III. Educational Background -->
        <Card>
          <CardHeader>
            <CardTitle class="text-base">III. Educational Background</CardTitle>
            <CardDescription>Highest attainment: {{ applicantRecord.highestEducationalAttainment }}</CardDescription>
          </CardHeader>
          <CardContent class="grid gap-4">
            <p v-if="applicantRecord.currentlyInSchool" class="text-sm font-medium">
              Applicant is currently enrolled in school.
            </p>
            <ul v-if="applicantRecord.educationalBackground.length > 0" class="divide-y rounded-lg border">
              <li v-for="(edu, idx) in applicantRecord.educationalBackground" :key="idx" class="space-y-1 p-4">
                <div class="flex flex-col justify-between gap-1 sm:flex-row sm:items-baseline">
                  <p class="text-sm font-semibold">
                    {{ edu.course && edu.course !== 'N/A' ? edu.course : edu.level }}
                  </p>
                  <span class="text-xs text-muted-foreground">Graduated {{ edu.year_graduated }}</span>
                </div>
                <p class="text-sm text-muted-foreground">{{ edu.level || 'Education' }} · {{ edu.school }}</p>
                <p v-if="edu.awards" class="text-sm">Honors / Awards: {{ edu.awards }}</p>
                <p v-if="edu.undergraduate_level_reached" class="text-xs text-muted-foreground">
                  Undergraduate level reached: <span class="font-medium text-foreground">{{ edu.undergraduate_level_reached }}</span>
                </p>
              </li>
            </ul>
            <p v-else class="text-sm text-muted-foreground">No educational background records found.</p>
          </CardContent>
        </Card>

        <!-- IV. Work Experience -->
        <Card>
          <CardHeader>
            <CardTitle class="text-base">IV. Work Experience</CardTitle>
            <CardDescription>{{ applicantRecord.workExperiences.length }} record(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <ul v-if="applicantRecord.workExperiences.length > 0" class="divide-y rounded-lg border">
              <li v-for="(work, idx) in applicantRecord.workExperiences" :key="idx" class="space-y-1 p-4">
                <div class="flex flex-col justify-between gap-1 sm:flex-row sm:items-baseline">
                  <p class="text-sm font-semibold">{{ work.position || work.job_title || 'Position not specified' }}</p>
                  <span class="text-xs text-muted-foreground">{{ work.inclusive_dates || 'Dates N/A' }}</span>
                </div>
                <p class="text-sm text-muted-foreground">{{ work.company_name }}</p>
                <p v-if="work.monthly_salary || work.status_of_appointment" class="text-xs text-muted-foreground">
                  <template v-if="work.monthly_salary">
                    Monthly salary: <span class="font-mono font-medium text-foreground">₱{{ Number(work.monthly_salary).toLocaleString() }}</span>
                  </template>
                  <template v-if="work.monthly_salary && work.status_of_appointment"> · </template>
                  <template v-if="work.status_of_appointment">
                    Appointment: <span class="font-medium text-foreground">{{ work.status_of_appointment }}</span>
                  </template>
                </p>
              </li>
            </ul>
            <p v-else class="text-sm text-muted-foreground">No previous work experience recorded.</p>
          </CardContent>
        </Card>

        <!-- V. Technical / Vocational Trainings -->
        <Card>
          <CardHeader>
            <CardTitle class="text-base">V. Technical / Vocational Trainings</CardTitle>
            <CardDescription>{{ applicantRecord.vocationalTrainings.length }} training(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <ul v-if="applicantRecord.vocationalTrainings.length > 0" class="divide-y rounded-lg border">
              <li v-for="(voc, idx) in applicantRecord.vocationalTrainings" :key="idx" class="space-y-1 p-4">
                <div class="flex flex-col justify-between gap-1 sm:flex-row sm:items-baseline">
                  <p class="text-sm font-semibold">{{ voc.course_training_title }}</p>
                  <span class="text-xs text-muted-foreground">{{ voc.duration || 'Duration N/A' }}</span>
                </div>
                <p class="text-sm text-muted-foreground">{{ voc.training_institution }}</p>
                <p v-if="voc.certificates_received" class="text-sm">Certificate: {{ voc.certificates_received }}</p>
              </li>
            </ul>
            <p v-else class="text-sm text-muted-foreground">No technical or vocational trainings recorded.</p>
          </CardContent>
        </Card>

        <!-- VI. Eligibility & Licenses -->
        <Card>
          <CardHeader>
            <CardTitle class="text-base">VI. Eligibility & Professional Licenses</CardTitle>
            <CardDescription>{{ applicantRecord.eligibilities.length }} eligibility record(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <ul v-if="applicantRecord.eligibilities.length > 0" class="divide-y rounded-lg border">
              <li v-for="(el, idx) in applicantRecord.eligibilities" :key="idx" class="space-y-1 p-4">
                <div class="flex flex-col justify-between gap-1 sm:flex-row sm:items-baseline">
                  <p class="text-sm font-semibold">{{ el.eligibility_title }}</p>
                  <span class="text-xs text-muted-foreground">Rating: <span class="font-medium text-foreground">{{ el.rating }}</span></span>
                </div>
                <p v-if="el.date_of_examination || el.place_of_examination" class="text-xs text-muted-foreground">
                  <template v-if="el.date_of_examination">Exam date: <span class="font-medium text-foreground">{{ formatDateDisplay(el.date_of_examination) }}</span></template>
                  <template v-if="el.date_of_examination && el.place_of_examination"> · </template>
                  <template v-if="el.place_of_examination">Exam place: <span class="font-medium text-foreground">{{ el.place_of_examination }}</span></template>
                </p>
              </li>
            </ul>
            <p v-else class="text-sm text-muted-foreground">No civil service or professional board eligibilities recorded.</p>
          </CardContent>
        </Card>
      </div>

      <!-- Right column -->
      <div class="space-y-6">
        <!-- GIP Documents & Evaluation -->
        <Card>
          <CardHeader>
            <CardTitle class="text-base">GIP Documents & Evaluation</CardTitle>
          </CardHeader>
          <CardContent class="grid gap-4">
            <div class="space-y-2">
              <h3 class="text-xs text-muted-foreground">Documents Submitted</h3>
              <div v-if="displayDocumentsSubmitted.length > 0" class="flex flex-wrap gap-1.5">
                <Badge v-for="doc in displayDocumentsSubmitted" :key="doc" variant="secondary">{{ doc }}</Badge>
              </div>
              <p v-else class="text-sm text-muted-foreground">No documents uploaded yet.</p>
            </div>

            <template v-if="applicant.remarks && applicant.remarks.length > 0">
              <Separator />
              <div class="space-y-2">
                <h3 class="text-xs text-muted-foreground">Evaluation Remarks</h3>
                <ul class="list-inside list-disc space-y-1 text-sm">
                  <li v-for="(rem, idx) in applicant.remarks" :key="idx">{{ rem }}</li>
                </ul>
              </div>
            </template>
          </CardContent>
        </Card>

        <!-- II. DOLE Status & Classifications -->
        <Card>
          <CardHeader>
            <CardTitle class="text-base">II. DOLE Status & Classifications</CardTitle>
          </CardHeader>
          <CardContent class="grid gap-4">
            <div>
              <span class="text-xs text-muted-foreground">Employment Status</span>
              <p class="text-sm font-medium">{{ applicantRecord.employmentStatus }}</p>
              <p v-if="applicantRecord.employmentType" class="text-xs text-muted-foreground">
                Type: {{ applicantRecord.employmentType }}
              </p>
            </div>
            <div v-if="applicantRecord.unemployedReason">
              <span class="text-xs text-muted-foreground">Unemployment Reason</span>
              <p class="text-sm font-medium">{{ applicantRecord.unemployedReason }}</p>
              <p v-if="applicantRecord.monthsLookingForWork !== null" class="text-xs text-muted-foreground">
                Looking for work: {{ applicantRecord.monthsLookingForWork }} month(s)
              </p>
            </div>
            <div v-if="applicantRecord.selfEmployedType">
              <span class="text-xs text-muted-foreground">Self-Employed Category</span>
              <p class="text-sm font-medium">{{ applicantRecord.selfEmployedType }}</p>
            </div>

            <Separator />

            <dl class="grid gap-2 text-sm">
              <div class="flex items-center justify-between gap-4">
                <dt class="text-muted-foreground">4Ps Beneficiary</dt>
                <dd class="font-medium">
                  {{ applicantRecord.is4psBeneficiary ? `Yes (ID: ${applicantRecord.householdId4ps || 'N/A'})` : 'No' }}
                </dd>
              </div>
              <div class="flex items-center justify-between gap-4">
                <dt class="text-muted-foreground">Person with Disability</dt>
                <dd class="font-medium">{{ applicantRecord.hasDisability ? 'Yes' : 'No' }}</dd>
              </div>
              <p v-if="applicantRecord.hasDisability && applicantRecord.disabilities.length > 0" class="text-xs text-muted-foreground">
                Disabilities: {{ applicantRecord.disabilities.join(', ') }}
              </p>
              <div class="flex items-center justify-between gap-4">
                <dt class="text-muted-foreground">OFW Status</dt>
                <dd class="font-medium">
                  {{ applicantRecord.isOfw ? 'Current OFW' : applicantRecord.isFormerOfw ? 'Former OFW' : 'No' }}
                </dd>
              </div>
              <p v-if="applicantRecord.isOfw" class="text-xs text-muted-foreground">
                Country: {{ applicantRecord.ofwCountry || 'N/A' }}
              </p>
              <p v-if="applicantRecord.isFormerOfw" class="text-xs text-muted-foreground">
                Former country: {{ applicantRecord.formerOfwCountry || 'N/A' }}
                <template v-if="applicantRecord.formerOfwReturnDate"> (returned {{ formatDateDisplay(applicantRecord.formerOfwReturnDate) }})</template>
              </p>
            </dl>

            <Separator />

            <div class="space-y-2">
              <h3 class="text-xs text-muted-foreground">Referred Programs</h3>
              <div v-if="applicantRecord.referredPrograms.length > 0" class="flex flex-wrap gap-1.5">
                <Badge v-for="prog in applicantRecord.referredPrograms" :key="prog" variant="secondary">{{ prog }}</Badge>
              </div>
              <p v-else class="text-sm text-muted-foreground">No specific program assigned</p>
            </div>
          </CardContent>
        </Card>

        <!-- VII. Skills & Languages -->
        <Card>
          <CardHeader>
            <CardTitle class="text-base">VII. Skills & Languages</CardTitle>
          </CardHeader>
          <CardContent class="grid gap-4">
            <div class="space-y-2">
              <h3 class="text-xs text-muted-foreground">Acquired Skills</h3>
              <div v-if="applicantRecord.otherSkills.length > 0" class="flex flex-wrap gap-1.5">
                <Badge v-for="skill in applicantRecord.otherSkills" :key="skill" variant="outline">{{ skill }}</Badge>
              </div>
              <p v-else class="text-sm text-muted-foreground">No skills specified</p>
              <p v-if="applicantRecord.otherSkillsSpecified" class="text-sm">
                <span class="text-muted-foreground">Other:</span> {{ applicantRecord.otherSkillsSpecified }}
              </p>
            </div>

            <Separator />

            <div class="space-y-2">
              <h3 class="text-xs text-muted-foreground">Language Proficiencies</h3>
              <div v-if="applicantRecord.languageProficiencies.length > 0" class="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow class="bg-muted/40 hover:bg-muted/40">
                      <TableHead>Language</TableHead>
                      <TableHead v-for="skill in languageSkills" :key="skill" class="text-center capitalize">{{ skill }}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-for="(lang, idx) in applicantRecord.languageProficiencies" :key="idx">
                      <TableCell class="font-medium">{{ lang.language }}</TableCell>
                      <TableCell v-for="skill in languageSkills" :key="skill" class="text-center">
                        <Check v-if="lang[skill]" class="mx-auto size-4 text-success" :aria-label="`Can ${skill}`" />
                        <span v-else class="text-muted-foreground" :aria-label="`Cannot ${skill}`">—</span>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <p v-else class="text-sm text-muted-foreground">No language proficiencies recorded</p>
            </div>
          </CardContent>
        </Card>

        <!-- VIII. Job Preferences -->
        <Card>
          <CardHeader>
            <CardTitle class="text-base">VIII. Job & Location Preferences</CardTitle>
          </CardHeader>
          <CardContent class="grid gap-4">
            <div class="space-y-2">
              <h3 class="text-xs text-muted-foreground">Preferred Occupations</h3>
              <div v-if="applicantRecord.preferredOccupations.length > 0" class="flex flex-wrap gap-1.5">
                <Badge v-for="occ in applicantRecord.preferredOccupations" :key="occ" variant="secondary">{{ occ }}</Badge>
              </div>
              <p v-else class="text-sm text-muted-foreground">None specified</p>
            </div>

            <div class="space-y-2">
              <h3 class="text-xs text-muted-foreground">Preferred Local Work Locations</h3>
              <p class="text-sm">
                {{ applicantRecord.preferredLocalLocations.length > 0 ? applicantRecord.preferredLocalLocations.join(', ') : 'Within Agusan del Sur' }}
              </p>
            </div>

            <div class="space-y-2">
              <h3 class="text-xs text-muted-foreground">Preferred Overseas Locations</h3>
              <p class="text-sm">
                {{ applicantRecord.preferredOverseasLocations.length > 0 ? applicantRecord.preferredOverseasLocations.join(', ') : 'Local employment only' }}
              </p>
            </div>

            <div v-if="applicantRecord.jobTypePreference.length > 0" class="space-y-2">
              <h3 class="text-xs text-muted-foreground">Job Type Preference</h3>
              <p class="text-sm">{{ applicantRecord.jobTypePreference.join(', ') }}</p>
            </div>
          </CardContent>
        </Card>

        <!-- Registry Metadata -->
        <Card>
          <CardHeader>
            <CardTitle class="text-base">Registry Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <dl class="grid gap-2 text-sm">
              <div class="flex items-center justify-between gap-4">
                <dt class="text-muted-foreground">Assessed By</dt>
                <dd class="text-right font-medium">{{ applicantRecord.assessedByName || 'Provincial PESO Officer' }}</dd>
              </div>
              <div class="flex items-center justify-between gap-4">
                <dt class="text-muted-foreground">Assessment Date</dt>
                <dd class="font-medium">{{ formattedAssessmentDate }}</dd>
              </div>
              <div class="flex items-center justify-between gap-4">
                <dt class="text-muted-foreground">GIP Application ID</dt>
                <dd class="max-w-45 truncate font-mono text-xs text-muted-foreground" :title="applicant.id">{{ applicant.id }}</dd>
              </div>
              <div class="flex items-center justify-between gap-4">
                <dt class="text-muted-foreground">Last Updated</dt>
                <dd class="font-medium">{{ formattedUpdatedDate }}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
