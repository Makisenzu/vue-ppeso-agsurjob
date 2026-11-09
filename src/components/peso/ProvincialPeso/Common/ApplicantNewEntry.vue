<script setup lang="ts">
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  Save,
  AlertTriangle,
  Link2,
  UserPlus,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type {
  ApplicantInsert,
} from '@/types/peso/provincialPeso/applicantEntry'
import { useApplicantNewEntryPage } from '@/composables/peso/provincialPeso/useApplicantNewEntryPage'
import { provideApplicantNewEntryPage } from '@/composables/peso/provincialPeso/applicantNewEntryPageContext'
import NewEntryPersonalStep from '@/components/peso/ProvincialPeso/Common/NewEntry/NewEntryPersonalStep.vue'
import NewEntryEmploymentStep from '@/components/peso/ProvincialPeso/Common/NewEntry/NewEntryEmploymentStep.vue'
import NewEntryEducationStep from '@/components/peso/ProvincialPeso/Common/NewEntry/NewEntryEducationStep.vue'
import NewEntryWorkStep from '@/components/peso/ProvincialPeso/Common/NewEntry/NewEntryWorkStep.vue'
import NewEntrySkillsStep from '@/components/peso/ProvincialPeso/Common/NewEntry/NewEntrySkillsStep.vue'
import NewEntryPreferencesStep from '@/components/peso/ProvincialPeso/Common/NewEntry/NewEntryPreferencesStep.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const props = defineProps<{
  isSubmitting?: boolean
}>()

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'submit', payload: ApplicantInsert): void
}>()

const page = useApplicantNewEntryPage({ props, emit })
// The step components (NewEntry/*.vue) read and edit the same form
provideApplicantNewEntryPage(page)

const {
  isFormSubmitting,
  handleCancel,
  handleSubmit,
  steps,
  currentStep,
  nextStep,
  prevStep,
  goToStep,
  duplicateMatch,
  isDuplicateModalOpen,
  firstName,
  surname,
  programOptions,
  duplicateAction,
  duplicateProgram,
  confirmDuplicateResolution,
} = page
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
          class="h-9 gap-1.5 text-xs font-semibold cursor-pointer shadow-xs"
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
        <NewEntryPersonalStep />

        <!-- ════════════════════════════════════════════════════════════════ -->
        <!-- STEP 2: DOLE Status & Beneficiary Classifications             -->
        <!-- ════════════════════════════════════════════════════════════════ -->
        <NewEntryEmploymentStep />

        <!-- ════════════════════════════════════════════════════════════════ -->
        <!-- STEP 3: Educational Background                                 -->
        <!-- ════════════════════════════════════════════════════════════════ -->
        <NewEntryEducationStep />

        <!-- ════════════════════════════════════════════════════════════════ -->
        <!-- STEP 4: Work Experience & Vocational Trainings                 -->
        <!-- ════════════════════════════════════════════════════════════════ -->
        <NewEntryWorkStep />

        <!-- ════════════════════════════════════════════════════════════════ -->
        <!-- STEP 5: Eligibilities, Skills & Languages                     -->
        <!-- ════════════════════════════════════════════════════════════════ -->
        <NewEntrySkillsStep />

        <!-- ════════════════════════════════════════════════════════════════ -->
        <!-- STEP 6: Job Preferences & Evaluation Assessment                -->
        <!-- ════════════════════════════════════════════════════════════════ -->
        <NewEntryPreferencesStep />

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
              class="gap-1.5 text-xs h-9 font-semibold cursor-pointer shadow-xs"
              @click="nextStep"
            >
              <span>Next Step</span>
              <ArrowRight class="h-3.5 w-3.5" />
            </Button>

            <Button
              v-else
              class="gap-1.5 text-xs h-9 font-semibold cursor-pointer shadow-xs"
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

    <!-- ─── Existing Applicant Match Modal (shadcn Dialog) ─── -->
    <Dialog v-model:open="isDuplicateModalOpen">
      <DialogContent class="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div class="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle class="h-5 w-5 shrink-0" />
            <DialogTitle class="text-base font-semibold">Existing Applicant Record Found</DialogTitle>
          </div>
          <DialogDescription class="text-xs">
            An applicant matching <strong class="text-foreground">{{ firstName }} {{ surname }}</strong> already exists in the provincial database.
          </DialogDescription>
        </DialogHeader>

        <div v-if="duplicateMatch" class="space-y-3 py-2 text-xs">
          <!-- Existing Record Details Card -->
          <div class="rounded-lg border bg-muted/30 p-3 space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-foreground">
                {{ duplicateMatch.existingApplicant.surname }}, {{ duplicateMatch.existingApplicant.first_name }} {{ duplicateMatch.existingApplicant.middle_name || '' }}
              </span>
              <Badge variant="outline" class="text-[10px]">
                {{ duplicateMatch.confidence === 'exact' ? 'Exact Match' : duplicateMatch.confidence === 'high' ? 'High Match' : 'Possible Match' }}
              </Badge>
            </div>
            <div class="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
              <div>
                <span>DOB:</span> <strong class="text-foreground">{{ duplicateMatch.existingApplicant.date_of_birth || 'N/A' }}</strong>
              </div>
              <div>
                <span>Sex:</span> <strong class="text-foreground">{{ duplicateMatch.existingApplicant.sex || 'N/A' }}</strong>
              </div>
              <div class="col-span-2">
                <span>Existing Programs:</span>
                <div class="flex flex-wrap gap-1 mt-1">
                  <template v-if="duplicateMatch.existingPrograms?.length">
                    <Badge v-for="p in duplicateMatch.existingPrograms" :key="p" variant="secondary" class="text-[10px] py-0">
                      {{ p }}
                    </Badge>
                  </template>
                  <span v-else class="italic text-[10px]">None</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Chooser -->
          <div class="space-y-2 pt-1">
            <label class="font-semibold text-xs text-foreground block">Select Action:</label>

            <!-- Option 1: Link to program -->
            <label
              :class="[
                'flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-colors space-y-2',
                duplicateAction === 'link_program' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30',
              ]"
            >
              <div class="flex items-start gap-2">
                <input
                  type="radio"
                  name="applicant-duplicate-action"
                  value="link_program"
                  v-model="duplicateAction"
                  class="mt-0.5 text-primary"
                />
                <div>
                  <span class="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <Link2 class="h-3.5 w-3.5 text-primary" />
                    Link Existing Applicant to Program
                    <Badge variant="outline" class="text-[9px] py-0 px-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                      Recommended
                    </Badge>
                  </span>
                  <p class="text-[11px] text-muted-foreground">
                    Connects this application to their existing profile and registers them in the program queue without duplicating records.
                  </p>
                </div>
              </div>

              <!-- Program Selector -->
              <div v-if="duplicateAction === 'link_program'" class="pl-6 pt-1 flex items-center gap-2" @click.stop>
                <span class="text-[11px] font-medium text-foreground whitespace-nowrap">Target Program:</span>
                <SearchSelect
                  v-model="duplicateProgram"
                  :options="programOptions"
                  placeholder="Select program"
                  class="h-8 text-xs w-48"
                />
              </div>
            </label>

            <!-- Option 2: Create new anyway -->
            <label
              :class="[
                'flex items-start gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors',
                duplicateAction === 'create_new' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30',
              ]"
            >
              <input
                type="radio"
                name="applicant-duplicate-action"
                value="create_new"
                v-model="duplicateAction"
                class="mt-0.5 text-primary"
              />
              <div>
                <span class="font-semibold text-xs text-foreground flex items-center gap-1.5">
                  <UserPlus class="h-3.5 w-3.5 text-muted-foreground" />
                  Create New Master Profile Anyway
                </span>
                <p class="text-[11px] text-muted-foreground">
                  Creates a separate new entry (use only if verified to be a different individual with the same name).
                </p>
              </div>
            </label>
          </div>
        </div>

        <DialogFooter class="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" class="text-xs cursor-pointer" @click="isDuplicateModalOpen = false">
            Cancel
          </Button>
          <Button size="sm" class="text-xs font-semibold cursor-pointer" @click="confirmDuplicateResolution">
            {{ duplicateAction === 'link_program' ? `Link to ${duplicateProgram}` : 'Create New Record' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
