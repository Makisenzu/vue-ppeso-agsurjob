<script setup lang="ts">
// ApplicantNewEntry.vue — step 4: work experience and vocational trainings
import ReferencePicker from '@/components/ReferencePicker.vue'
import SkillTextPicker from '@/components/SkillTextPicker.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Award, Briefcase, Plus, Trash2 } from '@lucide/vue'
import { useApplicantNewEntryPageContext } from '@/composables/peso/provincialPeso/applicantNewEntryPageContext'

const {
  currentStep,
  trainingOptions,
  isLoadingReferenceLists,
  formResetCount,
  workExperiences,
  addWorkRow,
  removeWorkRow,
  vocationalTrainings,
  addVocationalRow,
  removeVocationalRow,
} = useApplicantNewEntryPageContext()
</script>

<template>
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
                <span class="text-[11px] text-muted-foreground">Address (City / Municipality)</span>
                <Input v-model="work.address" placeholder="e.g. Prosperidad, Agusan del Sur" class="h-8 text-xs" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="space-y-1">
                <span class="text-[11px] text-muted-foreground">Job Position / Title</span>
                <Input v-model="work.position" placeholder="e.g. Administrative Officer" class="h-8 text-xs" />
              </div>
              <div class="space-y-1">
                <span class="text-[11px] text-muted-foreground">Inclusive Dates</span>
                <Input v-model="work.inclusive_dates" placeholder="e.g. Jan 2022 - Dec 2023" class="h-8 text-xs" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="space-y-1">
                <span class="text-[11px] text-muted-foreground">Number of Months</span>
                <Input v-model="work.number_of_months" type="number" min="0" placeholder="e.g. 24" class="h-8 text-xs font-mono" />
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
                <ReferencePicker
                  :key="`training-${formResetCount}-${idx}`"
                  v-model="voc.course_training_title"
                  :options="trainingOptions"
                  :loading="isLoadingReferenceLists"
                  placeholder="Select TESDA qualification"
                  search-placeholder="Search qualification (e.g. NC II)..."
                  specify-placeholder="Specify course / training title"
                  class="h-8 text-xs"
                />
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
                <span class="text-[11px] text-muted-foreground">Skills Acquired</span>
                <SkillTextPicker v-model="voc.skills_acquired" placeholder="e.g. SMAW, Gas Welding" size="sm" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
</template>
