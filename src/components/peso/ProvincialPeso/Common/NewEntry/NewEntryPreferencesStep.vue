<script setup lang="ts">
// ApplicantNewEntry.vue — step 6: job preferences and evaluation assessment
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FileText, Plus, X } from '@lucide/vue'
import { useApplicantNewEntryPageContext } from '@/composables/peso/provincialPeso/applicantNewEntryPageContext'

const {
  currentStep,
  todayMax,
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
  documentsSubmitted,
  toggleDocument,
  documentOptions,
  assessedByName,
  assessmentDate,
  profileId,
} = useApplicantNewEntryPageContext()
</script>

<template>
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
            <button
              type="button"
              class="inline-flex items-center justify-center text-muted-foreground hover:text-destructive cursor-pointer transition-colors focus:outline-none"
              @click.stop="removeOccupation(idx)"
            >
              <X class="h-3 w-3" />
            </button>
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
              <button
                type="button"
                class="inline-flex items-center justify-center text-muted-foreground hover:text-destructive cursor-pointer transition-colors focus:outline-none"
                @click.stop="removeLocalLocation(idx)"
              >
                <X class="h-3 w-3" />
              </button>
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
              <button
                type="button"
                class="inline-flex items-center justify-center text-primary/70 hover:text-destructive cursor-pointer transition-colors focus:outline-none"
                @click.stop="removeOverseasLocation(idx)"
              >
                <X class="h-3 w-3" />
              </button>
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

      <!-- Documents Submitted -->
      <div class="space-y-2 pt-4 border-t">
        <span class="font-semibold text-foreground text-xs flex items-center gap-1.5">
          <FileText class="h-3.5 w-3.5 text-primary" />
          Documents Submitted
        </span>
        <p class="text-[11px] text-muted-foreground">
          Select all documents submitted by the applicant. NSRP is auto-checked (integrated).
        </p>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="doc in documentOptions"
            :key="doc"
            class="flex items-center gap-2 p-2.5 rounded-lg border transition-colors"
            :class="[
              documentsSubmitted.includes(doc)
                ? 'bg-primary/15 border-primary/40 font-bold text-primary'
                : 'hover:bg-muted/40',
              doc === 'NSRP' ? 'cursor-default opacity-90' : 'cursor-pointer',
            ]"
          >
            <input
              type="checkbox"
              :checked="documentsSubmitted.includes(doc)"
              :disabled="doc === 'NSRP'"
              class="h-3.5 w-3.5 rounded accent-primary text-primary"
              :class="doc === 'NSRP' ? 'cursor-default' : 'cursor-pointer'"
              @change="toggleDocument(doc)"
            />
            <span class="text-xs">{{ doc }}</span>
            <Badge
              v-if="doc === 'NSRP'"
              variant="secondary"
              class="text-[9px] px-1.5 py-0 font-semibold"
            >
              Auto
            </Badge>
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
            <Input v-model="assessmentDate" type="date" :max="todayMax" class="h-9 text-xs" />
          </div>
        </div>
        <div class="space-y-1 pt-1">
          <span class="text-[11px] text-muted-foreground">Linked User Profile UUID (Optional)</span>
          <Input v-model="profileId" placeholder="Leave blank if registering walk-in jobseeker" class="h-8 text-xs font-mono" />
        </div>
      </div>
    </CardContent>
  </Card>
</template>
