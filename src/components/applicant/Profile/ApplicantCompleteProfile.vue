<script setup lang="ts">
import { Check, Loader2, Trash2 } from '@lucide/vue'
import { useApplicantCompletion } from '@/composables/applicant/useApplicantCompletion'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@/components/ui/stepper'

const {
  steps,
  currentStep,
  reachedStep,
  currentStepKey,
  currentStepMeta,
  isLastStep,
  prevStep,
  goToStep,
  saveAndContinue,
  record,
  isLoading,
  isSubmitting,
  values,
  age,
  isEmployed,
  isUnemployed,
  isSelfEmployed,
  needsPersonal,
  listError,
  maxDate,
  displayName,
  educationFields,
  addEducation,
  removeEducation,
  trainingFields,
  addTraining,
  removeTraining,
  eligibilityFields,
  addEligibility,
  removeEligibility,
  workFields,
  addWork,
  removeWork,
  languageFields,
  addLanguage,
  removeLanguage,
  toggleDisability,
  toggleJobType,
  toggleSkill,
  sexOptions,
  civilStatusOptions,
  employmentStatusOptions,
  employmentTypeOptions,
  unemployedReasonOptions,
  educationLevelOptions,
  appointmentStatusOptions,
  disabilityOptions,
  jobTypeOptions,
  skillOptions,
  languageAbilities,
} = useApplicantCompletion()

const optional = '(optional)'
const checkRow =
  'flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 text-sm transition-colors hover:bg-muted/60 sm:min-h-9'
</script>

<template>
  <!--
    Mobile: tighter card padding, 44px inputs, 16px select text (no iOS zoom),
    and a fixed action bar so Save stays in reach on long steps.
  -->
  <div
    class="mx-auto w-full max-w-3xl space-y-5 sm:space-y-6 **:data-[slot=native-select-wrapper]:w-full!
      max-sm:**:data-[slot=card]:gap-4 max-sm:**:data-[slot=card]:py-5 max-sm:**:data-[slot=card-header]:px-4 max-sm:**:data-[slot=card-content]:px-4
      max-sm:**:data-[slot=input]:h-11 max-sm:**:data-[slot=native-select]:h-11 max-sm:**:data-[slot=native-select]:text-base"
  >
    <header class="space-y-1">
      <p class="text-xs font-medium text-muted-foreground">Step {{ currentStep + 1 }} of {{ steps.length }}</p>
      <h1 class="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Complete your NSRP profile</h1>
      <p class="text-sm text-muted-foreground">
        Welcome, {{ displayName }}. PESO Agusan del Sur needs your full NSRP details before you can search jobs and
        apply to programs. Your answers are saved after every step.
      </p>
    </header>

    <!-- ─── Progress ─── -->
    <Stepper :model-value="currentStep + 1" class="flex w-full items-start gap-1 sm:gap-2">
      <StepperItem
        v-for="(step, index) in steps"
        :key="step.key"
        :step="index + 1"
        :disabled="index > reachedStep + 1"
        class="relative flex flex-1 flex-col items-center"
      >
        <StepperSeparator
          v-if="index !== steps.length - 1"
          class="absolute left-[calc(50%+14px)] right-[calc(-50%+14px)] top-4 h-0.5 rounded-full bg-border transition-colors duration-300 group-data-[state=completed]:bg-primary sm:left-[calc(50%+18px)] sm:right-[calc(-50%+18px)]"
        />
        <StepperTrigger class="z-10 gap-1.5" @click="goToStep(index)">
          <StepperIndicator
            class="size-7 border border-border bg-background text-xs font-semibold text-muted-foreground transition-colors duration-300 group-data-[state=active]:border-primary group-data-[state=active]:ring-4 group-data-[state=active]:ring-primary/15 group-data-[state=completed]:border-primary group-data-[state=completed]:bg-primary group-data-[state=completed]:text-primary-foreground sm:size-8"
          >
            <Check v-if="index < currentStep" class="size-3.5 shrink-0" />
            <span v-else>{{ index + 1 }}</span>
          </StepperIndicator>
          <StepperTitle class="hidden text-xs font-medium text-muted-foreground sm:block group-data-[state=active]:text-foreground">
            {{ step.title }}
          </StepperTitle>
        </StepperTrigger>
      </StepperItem>
    </Stepper>

    <div class="sm:hidden">
      <h2 class="text-base font-semibold text-foreground">{{ currentStepMeta.title }}</h2>
      <p class="text-sm text-muted-foreground">{{ currentStepMeta.description }}</p>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-6">
      <Skeleton v-for="n in 3" :key="n" class="h-48 w-full rounded-xl" />
    </div>

    <form v-else class="pb-24 sm:pb-0" @submit.prevent="saveAndContinue">
      <div
        :key="currentStepKey"
        class="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none sm:space-y-6"
      >
        <!-- ═══════════════ Step 1: Personal & employment ═══════════════ -->
        <template v-if="currentStepKey === 'personal'">
          <Card>
            <CardHeader>
              <CardTitle class="text-base">About you</CardTitle>
              <CardDescription>
                {{ record ? 'Details not yet on your record.' : 'We could not find your applicant record, so please confirm these details.' }}
              </CardDescription>
            </CardHeader>
            <CardContent class="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 sm:gap-x-4">
              <FormField v-if="needsPersonal('date_of_birth')" v-slot="{ componentField }" name="date_of_birth">
                <FormItem class="col-span-2 sm:col-span-1">
                  <FormLabel>Date of birth</FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" type="date" :max="maxDate" class="block" />
                  </FormControl>
                  <FormDescription v-if="age !== null">Age: {{ age }}</FormDescription>
                  <FormMessage />
                </FormItem>
              </FormField>
              <FormField v-if="needsPersonal('sex')" v-slot="{ componentField }" name="sex">
                <FormItem>
                  <FormLabel>Sex</FormLabel>
                  <FormControl>
                    <NativeSelect v-bind="componentField" class="w-full">
                      <NativeSelectOption value="" disabled>Select</NativeSelectOption>
                      <NativeSelectOption v-for="opt in sexOptions" :key="opt" :value="opt">{{ opt }}</NativeSelectOption>
                    </NativeSelect>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
              <FormField v-if="needsPersonal('civil_status')" v-slot="{ componentField }" name="civil_status">
                <FormItem>
                  <FormLabel>Civil status</FormLabel>
                  <FormControl>
                    <NativeSelect v-bind="componentField" class="w-full">
                      <NativeSelectOption value="" disabled>Select</NativeSelectOption>
                      <NativeSelectOption v-for="opt in civilStatusOptions" :key="opt" :value="opt">{{ opt }}</NativeSelectOption>
                    </NativeSelect>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
              <FormField v-slot="{ componentField }" name="religion">
                <FormItem>
                  <FormLabel>Religion</FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" placeholder="Roman Catholic" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
              <FormField v-slot="{ componentField }" name="height_ft">
                <FormItem>
                  <FormLabel>Height (ft)</FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" type="number" inputmode="decimal" step="0.1" min="3" max="8" placeholder="5.4" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
              <FormField v-slot="{ componentField }" name="tin">
                <FormItem class="col-span-2 sm:col-span-1">
                  <FormLabel>TIN <span class="font-normal text-muted-foreground">{{ optional }}</span></FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" inputmode="numeric" placeholder="123-456-789-000" />
                  </FormControl>
                  <FormDescription>Leave blank if you don't have one yet.</FormDescription>
                  <FormMessage />
                </FormItem>
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle class="text-base">Employment status</CardTitle>
              <CardDescription>Your current work situation.</CardDescription>
            </CardHeader>
            <CardContent class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField v-slot="{ componentField }" name="employment_status">
                <FormItem>
                  <FormLabel>Employment status</FormLabel>
                  <FormControl>
                    <NativeSelect v-bind="componentField" class="w-full">
                      <NativeSelectOption value="" disabled>Select status</NativeSelectOption>
                      <NativeSelectOption v-for="opt in employmentStatusOptions" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                      </NativeSelectOption>
                    </NativeSelect>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>

              <template v-if="isEmployed">
                <FormField v-slot="{ componentField }" name="employment_type">
                  <FormItem>
                    <FormLabel>Employment type</FormLabel>
                    <FormControl>
                      <NativeSelect v-bind="componentField" class="w-full">
                        <NativeSelectOption value="" disabled>Select type</NativeSelectOption>
                        <NativeSelectOption v-for="opt in employmentTypeOptions" :key="opt.value" :value="opt.value">
                          {{ opt.label }}
                        </NativeSelectOption>
                      </NativeSelect>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
                <FormField v-if="isSelfEmployed" v-slot="{ componentField }" name="self_employed_type">
                  <FormItem class="sm:col-span-2">
                    <FormLabel>Type of self-employment</FormLabel>
                    <FormControl>
                      <Input v-bind="componentField" placeholder="Sari-sari store, farmer, freelancer" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
              </template>

              <template v-if="isUnemployed">
                <FormField v-slot="{ componentField }" name="unemployed_reason">
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <NativeSelect v-bind="componentField" class="w-full">
                        <NativeSelectOption value="" disabled>Select reason</NativeSelectOption>
                        <NativeSelectOption v-for="opt in unemployedReasonOptions" :key="opt" :value="opt">{{ opt }}</NativeSelectOption>
                      </NativeSelect>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
                <FormField v-slot="{ componentField }" name="months_looking_for_work">
                  <FormItem>
                    <FormLabel>Months looking for work <span class="font-normal text-muted-foreground">{{ optional }}</span></FormLabel>
                    <FormControl>
                      <Input v-bind="componentField" type="number" inputmode="numeric" min="0" step="1" placeholder="0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
              </template>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle class="text-base">Special categories</CardTitle>
              <CardDescription>Used to match you with PESO programs. Leave off if they don't apply.</CardDescription>
            </CardHeader>
            <CardContent class="divide-y">
              <div class="space-y-4 pb-5">
                <FormField v-slot="{ value, handleChange }" name="is_4ps_beneficiary">
                  <FormItem class="flex min-h-11 items-center justify-between gap-4">
                    <FormLabel class="font-normal">4Ps beneficiary</FormLabel>
                    <FormControl>
                      <Switch :model-value="value" @update:model-value="handleChange" />
                    </FormControl>
                  </FormItem>
                </FormField>
                <FormField v-if="values.is_4ps_beneficiary" v-slot="{ componentField }" name="household_id_4ps">
                  <FormItem class="sm:max-w-xs">
                    <FormLabel>Household ID</FormLabel>
                    <FormControl>
                      <Input v-bind="componentField" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
              </div>

              <div class="space-y-4 py-5">
                <FormField v-slot="{ value, handleChange }" name="has_disability">
                  <FormItem class="flex min-h-11 items-center justify-between gap-4">
                    <FormLabel class="font-normal">Person with disability (PWD)</FormLabel>
                    <FormControl>
                      <Switch :model-value="value" @update:model-value="handleChange" />
                    </FormControl>
                  </FormItem>
                </FormField>
                <template v-if="values.has_disability">
                  <FormField name="disabilities">
                    <FormItem>
                      <FormLabel>Type of disability</FormLabel>
                      <div class="-mx-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                        <label v-for="opt in disabilityOptions" :key="opt" :class="checkRow">
                          <Checkbox
                            :model-value="values.disabilities.includes(opt)"
                            @update:model-value="(checked) => toggleDisability(opt, checked)"
                          />
                          {{ opt }}
                        </label>
                      </div>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                  <FormField v-slot="{ componentField }" name="disability_others">
                    <FormItem>
                      <FormLabel>Others <span class="font-normal text-muted-foreground">{{ optional }}</span></FormLabel>
                      <FormControl>
                        <Input v-bind="componentField" placeholder="Describe if not listed above" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                </template>
              </div>

              <div class="space-y-4 py-5">
                <FormField v-slot="{ value, handleChange }" name="is_ofw">
                  <FormItem class="flex min-h-11 items-center justify-between gap-4">
                    <FormLabel class="font-normal">Currently an OFW</FormLabel>
                    <FormControl>
                      <Switch :model-value="value" @update:model-value="handleChange" />
                    </FormControl>
                  </FormItem>
                </FormField>
                <FormField v-if="values.is_ofw" v-slot="{ componentField }" name="ofw_country">
                  <FormItem class="sm:max-w-xs">
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input v-bind="componentField" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
              </div>

              <div class="space-y-4 pt-5">
                <FormField v-slot="{ value, handleChange }" name="is_former_ofw">
                  <FormItem class="flex min-h-11 items-center justify-between gap-4">
                    <FormLabel class="font-normal">Former OFW</FormLabel>
                    <FormControl>
                      <Switch :model-value="value" @update:model-value="handleChange" />
                    </FormControl>
                  </FormItem>
                </FormField>
                <div v-if="values.is_former_ofw" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField v-slot="{ componentField }" name="former_ofw_country">
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input v-bind="componentField" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                  <FormField v-slot="{ componentField }" name="former_ofw_return_date">
                    <FormItem>
                      <FormLabel>Date returned</FormLabel>
                      <FormControl>
                        <Input v-bind="componentField" type="date" :max="maxDate" class="block" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                </div>
              </div>
            </CardContent>
          </Card>
        </template>

        <!-- ═══════════════ Step 2: Education & training ═══════════════ -->
        <template v-if="currentStepKey === 'education'">
          <Card>
            <CardHeader>
              <CardTitle class="text-base">Educational background</CardTitle>
              <CardDescription>Add every level you attended, starting with the highest.</CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <p v-if="listError('educational_background')" data-list-error class="text-sm text-destructive">
                {{ listError('educational_background') }}
              </p>
              <div v-for="(entry, index) in educationFields" :key="entry.key" class="space-y-4 rounded-lg border p-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-semibold text-foreground">School {{ index + 1 }}</h3>
                  <Button
                    v-if="educationFields.length > 1"
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="-mr-2 size-9 text-muted-foreground hover:text-destructive"
                    :aria-label="`Remove school ${index + 1}`"
                    @click="removeEducation(index)"
                  >
                    <Trash2 class="size-4 shrink-0" />
                  </Button>
                </div>
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField v-slot="{ componentField }" :name="`educational_background[${index}].level`">
                    <FormItem>
                      <FormLabel>Level</FormLabel>
                      <FormControl>
                        <NativeSelect v-bind="componentField" class="w-full">
                          <NativeSelectOption value="" disabled>Select level</NativeSelectOption>
                          <NativeSelectOption v-for="opt in educationLevelOptions" :key="opt" :value="opt">{{ opt }}</NativeSelectOption>
                        </NativeSelect>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                  <FormField v-slot="{ componentField }" :name="`educational_background[${index}].school`">
                    <FormItem>
                      <FormLabel>School</FormLabel>
                      <FormControl>
                        <Input v-bind="componentField" placeholder="Agusan del Sur State College" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                  <FormField v-slot="{ componentField }" :name="`educational_background[${index}].course`">
                    <FormItem>
                      <FormLabel>Course / Strand <span class="font-normal text-muted-foreground">{{ optional }}</span></FormLabel>
                      <FormControl>
                        <Input v-bind="componentField" placeholder="BS Information Technology" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                  <div class="grid grid-cols-2 gap-3">
                    <FormField v-slot="{ componentField }" :name="`educational_background[${index}].year_graduated`">
                      <FormItem>
                        <FormLabel>Year graduated</FormLabel>
                        <FormControl>
                          <Input v-bind="componentField" inputmode="numeric" maxlength="4" placeholder="2024" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </FormField>
                    <FormField v-slot="{ componentField }" :name="`educational_background[${index}].undergraduate_level_reached`">
                      <FormItem>
                        <FormLabel>Level reached</FormLabel>
                        <FormControl>
                          <Input v-bind="componentField" placeholder="3rd year" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </FormField>
                  </div>
                  <FormField v-slot="{ componentField }" :name="`educational_background[${index}].awards`">
                    <FormItem class="sm:col-span-2">
                      <FormLabel>Awards <span class="font-normal text-muted-foreground">{{ optional }}</span></FormLabel>
                      <FormControl>
                        <Input v-bind="componentField" placeholder="With Honors" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                </div>
                <p class="text-xs text-muted-foreground">Leave "Year graduated" blank if you didn't finish; fill in "Level reached" instead.</p>
              </div>
              <Button type="button" variant="outline" class="h-11 w-full sm:h-9 sm:w-auto" @click="addEducation">Add school</Button>

              <FormField v-slot="{ value, handleChange }" name="currently_in_school">
                <FormItem class="flex min-h-11 items-center gap-3">
                  <FormControl>
                    <Checkbox :model-value="value" @update:model-value="handleChange" />
                  </FormControl>
                  <FormLabel class="font-normal">I am currently in school</FormLabel>
                </FormItem>
              </FormField>
            </CardContent>
          </Card>

          <!-- Optional lists, laid out like the PESO applicant entry form: header + Add, empty state, entries -->
          <Card>
            <CardHeader>
              <CardTitle class="text-base">Technical / vocational training</CardTitle>
              <CardDescription>TESDA or other skills trainings and certifications. Skip if none.</CardDescription>
              <CardAction>
                <Button type="button" variant="outline" size="sm" class="max-sm:h-10" @click="addTraining">Add training</Button>
              </CardAction>
            </CardHeader>
            <CardContent class="space-y-3">
              <p
                v-if="trainingFields.length === 0"
                class="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground"
              >
                No trainings added.
              </p>
              <div v-for="(entry, index) in trainingFields" :key="entry.key" class="space-y-4 rounded-lg border p-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-semibold text-foreground">Training {{ index + 1 }}</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="-mr-2 size-9 text-muted-foreground hover:text-destructive"
                    :aria-label="`Remove training ${index + 1}`"
                    @click="removeTraining(index)"
                  >
                    <Trash2 class="size-4 shrink-0" />
                  </Button>
                </div>
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField v-slot="{ componentField }" :name="`vocational_trainings[${index}].course_training_title`">
                    <FormItem>
                      <FormLabel>Course / training title</FormLabel>
                      <FormControl>
                        <Input v-bind="componentField" placeholder="Shielded Metal Arc Welding (SMAW)" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                  <FormField v-slot="{ componentField }" :name="`vocational_trainings[${index}].training_institution`">
                    <FormItem>
                      <FormLabel>Training institution</FormLabel>
                      <FormControl>
                        <Input v-bind="componentField" placeholder="Agusan del Sur School of Arts and Trades" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                  <FormField v-slot="{ componentField }" :name="`vocational_trainings[${index}].duration`">
                    <FormItem>
                      <FormLabel>Duration <span class="font-normal text-muted-foreground">{{ optional }}</span></FormLabel>
                      <FormControl>
                        <Input v-bind="componentField" placeholder="268 hours" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                  <FormField v-slot="{ componentField }" :name="`vocational_trainings[${index}].skills_acquired`">
                    <FormItem>
                      <FormLabel>Skills acquired <span class="font-normal text-muted-foreground">{{ optional }}</span></FormLabel>
                      <FormControl>
                        <Input v-bind="componentField" placeholder="SMAW, gas welding" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                  <FormField v-slot="{ componentField }" :name="`vocational_trainings[${index}].certificates_received`">
                    <FormItem>
                      <FormLabel>Certificates received <span class="font-normal text-muted-foreground">{{ optional }}</span></FormLabel>
                      <FormControl>
                        <Input v-bind="componentField" placeholder="National Certificate II (NC II)" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle class="text-base">Eligibility / professional license</CardTitle>
              <CardDescription>Civil service eligibility or PRC board license. Skip if none.</CardDescription>
              <CardAction>
                <Button type="button" variant="outline" size="sm" class="max-sm:h-10" @click="addEligibility">Add eligibility</Button>
              </CardAction>
            </CardHeader>
            <CardContent class="space-y-3">
              <p
                v-if="eligibilityFields.length === 0"
                class="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground"
              >
                No eligibilities added.
              </p>
              <div v-for="(entry, index) in eligibilityFields" :key="entry.key" class="space-y-4 rounded-lg border p-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-semibold text-foreground">Eligibility {{ index + 1 }}</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="-mr-2 size-9 text-muted-foreground hover:text-destructive"
                    :aria-label="`Remove eligibility ${index + 1}`"
                    @click="removeEligibility(index)"
                  >
                    <Trash2 class="size-4 shrink-0" />
                  </Button>
                </div>
                <div class="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-x-4">
                  <FormField v-slot="{ componentField }" :name="`eligibilities[${index}].eligibility_title`">
                    <FormItem class="col-span-2 sm:col-span-1">
                      <FormLabel>Title / exam name</FormLabel>
                      <FormControl>
                        <Input v-bind="componentField" placeholder="Career Service Professional" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                  <FormField v-slot="{ componentField }" :name="`eligibilities[${index}].rating`">
                    <FormItem class="col-span-2 sm:col-span-1">
                      <FormLabel>Rating (%) <span class="font-normal text-muted-foreground">{{ optional }}</span></FormLabel>
                      <FormControl>
                        <Input v-bind="componentField" inputmode="decimal" placeholder="84.50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                  <FormField v-slot="{ componentField }" :name="`eligibilities[${index}].date_of_examination`">
                    <FormItem>
                      <FormLabel>Exam date <span class="font-normal text-muted-foreground">(opt.)</span></FormLabel>
                      <FormControl>
                        <Input v-bind="componentField" type="date" :max="maxDate" class="block" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                  <FormField v-slot="{ componentField }" :name="`eligibilities[${index}].place_of_examination`">
                    <FormItem>
                      <FormLabel>Exam place <span class="font-normal text-muted-foreground">(opt.)</span></FormLabel>
                      <FormControl>
                        <Input v-bind="componentField" placeholder="Butuan City" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                </div>
              </div>
            </CardContent>
          </Card>
        </template>

        <!-- ═══════════════ Step 3: Work & skills ═══════════════ -->
        <template v-if="currentStepKey === 'experience'">
          <Card>
            <CardHeader>
              <CardTitle class="text-base">Work experience</CardTitle>
              <CardDescription>Start with your most recent job.</CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <FormField v-slot="{ value, handleChange }" name="no_work_experience">
                <FormItem class="flex min-h-11 items-center gap-3">
                  <FormControl>
                    <Checkbox :model-value="value" @update:model-value="handleChange" />
                  </FormControl>
                  <FormLabel class="font-normal">I have no work experience yet</FormLabel>
                </FormItem>
              </FormField>
              <template v-if="!values.no_work_experience">
                <p v-if="listError('work_experiences')" data-list-error class="text-sm text-destructive">
                  {{ listError('work_experiences') }}
                </p>
                <div v-for="(entry, index) in workFields" :key="entry.key" class="space-y-4 rounded-lg border p-4">
                  <div class="flex items-center justify-between">
                    <h3 class="text-sm font-semibold text-foreground">Job {{ index + 1 }}</h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      class="-mr-2 size-9 text-muted-foreground hover:text-destructive"
                      :aria-label="`Remove job ${index + 1}`"
                      @click="removeWork(index)"
                    >
                      <Trash2 class="size-4 shrink-0" />
                    </Button>
                  </div>
                  <div class="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-x-4">
                    <FormField v-slot="{ componentField }" :name="`work_experiences[${index}].company_name`">
                      <FormItem class="col-span-2 sm:col-span-1">
                        <FormLabel>Company</FormLabel>
                        <FormControl>
                          <Input v-bind="componentField" placeholder="San Francisco Agro-Industrial Corp." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </FormField>
                    <FormField v-slot="{ componentField }" :name="`work_experiences[${index}].position`">
                      <FormItem class="col-span-2 sm:col-span-1">
                        <FormLabel>Position</FormLabel>
                        <FormControl>
                          <Input v-bind="componentField" placeholder="Administrative Aide" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </FormField>
                    <FormField v-slot="{ componentField }" :name="`work_experiences[${index}].address`">
                      <FormItem class="col-span-2 sm:col-span-1">
                        <FormLabel>Company address <span class="font-normal text-muted-foreground">{{ optional }}</span></FormLabel>
                        <FormControl>
                          <Input v-bind="componentField" placeholder="Prosperidad, Agusan del Sur" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </FormField>
                    <FormField v-slot="{ componentField }" :name="`work_experiences[${index}].inclusive_dates`">
                      <FormItem class="col-span-2 sm:col-span-1">
                        <FormLabel>Inclusive dates</FormLabel>
                        <FormControl>
                          <Input v-bind="componentField" placeholder="Jan 2022 – Dec 2023" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </FormField>
                    <FormField v-slot="{ componentField }" :name="`work_experiences[${index}].number_of_months`">
                      <FormItem>
                        <FormLabel>Months <span class="font-normal text-muted-foreground">(opt.)</span></FormLabel>
                        <FormControl>
                          <Input v-bind="componentField" inputmode="numeric" placeholder="24" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </FormField>
                    <FormField v-slot="{ componentField }" :name="`work_experiences[${index}].monthly_salary`">
                      <FormItem>
                        <FormLabel>Salary (₱) <span class="font-normal text-muted-foreground">(opt.)</span></FormLabel>
                        <FormControl>
                          <Input v-bind="componentField" inputmode="decimal" placeholder="15000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </FormField>
                    <FormField v-slot="{ componentField }" :name="`work_experiences[${index}].status_of_appointment`">
                      <FormItem class="col-span-2 sm:col-span-1">
                        <FormLabel>Status <span class="font-normal text-muted-foreground">{{ optional }}</span></FormLabel>
                        <FormControl>
                          <NativeSelect v-bind="componentField" class="w-full">
                            <NativeSelectOption value="">Select status</NativeSelectOption>
                            <NativeSelectOption v-for="opt in appointmentStatusOptions" :key="opt" :value="opt">{{ opt }}</NativeSelectOption>
                          </NativeSelect>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </FormField>
                  </div>
                </div>
                <Button type="button" variant="outline" class="h-11 w-full sm:h-9 sm:w-auto" @click="addWork">Add job</Button>
              </template>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle class="text-base">Language / dialect proficiency</CardTitle>
              <CardDescription>Tick what you can do in each language.</CardDescription>
            </CardHeader>
            <CardContent class="space-y-3">
              <p v-if="listError('language_proficiencies')" data-list-error class="text-sm text-destructive">
                {{ listError('language_proficiencies') }}
              </p>
              <div v-for="(entry, index) in languageFields" :key="entry.key" class="space-y-3 rounded-lg border p-3 sm:p-4">
                <div class="flex items-start gap-2">
                  <FormField v-slot="{ componentField }" :name="`language_proficiencies[${index}].language`">
                    <FormItem class="flex-1">
                      <FormLabel class="sr-only">Language {{ index + 1 }}</FormLabel>
                      <FormControl>
                        <Input v-bind="componentField" placeholder="Language" class="font-medium" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="size-9 shrink-0 text-muted-foreground hover:text-destructive max-sm:size-11"
                    :aria-label="`Remove language ${index + 1}`"
                    @click="removeLanguage(index)"
                  >
                    <Trash2 class="size-4 shrink-0" />
                  </Button>
                </div>
                <div class="-mx-2 grid grid-cols-2 gap-1 sm:grid-cols-4">
                  <FormField
                    v-for="ability in languageAbilities"
                    :key="ability"
                    v-slot="{ value, handleChange }"
                    :name="`language_proficiencies[${index}].${ability}`"
                  >
                    <label :class="checkRow">
                      <Checkbox :model-value="value" @update:model-value="handleChange" />
                      <span class="capitalize">{{ ability }}</span>
                    </label>
                  </FormField>
                </div>
              </div>
              <Button type="button" variant="outline" class="h-11 w-full sm:h-9 sm:w-auto" @click="addLanguage">Add language</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle class="text-base">Skills</CardTitle>
              <CardDescription>Skills you have even without formal training.</CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <FormField name="other_skills">
                <FormItem>
                  <FormLabel class="sr-only">Skills</FormLabel>
                  <div class="-mx-2 grid grid-cols-1 gap-1 sm:grid-cols-3">
                    <label v-for="opt in skillOptions" :key="opt" :class="checkRow">
                      <Checkbox
                        :model-value="values.other_skills.includes(opt)"
                        @update:model-value="(checked) => toggleSkill(opt, checked)"
                      />
                      {{ opt }}
                    </label>
                  </div>
                  <FormMessage />
                </FormItem>
              </FormField>
              <FormField v-slot="{ componentField }" name="other_skills_specified">
                <FormItem>
                  <FormLabel>Other skills <span class="font-normal text-muted-foreground">{{ optional }}</span></FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" placeholder="Welding, bookkeeping, video editing" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
            </CardContent>
          </Card>
        </template>

        <!-- ═══════════════ Step 4: Job preference ═══════════════ -->
        <template v-if="currentStepKey === 'preferences'">
          <Card>
            <CardHeader>
              <CardTitle class="text-base">Job preference</CardTitle>
              <CardDescription>Helps PESO and employers match you with openings.</CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <FormField v-slot="{ componentField }" name="preferred_occupations">
                <FormItem>
                  <FormLabel>Preferred occupations</FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" placeholder="Office clerk, cashier, web developer" />
                  </FormControl>
                  <FormDescription>Separate with commas.</FormDescription>
                  <FormMessage />
                </FormItem>
              </FormField>
              <FormField name="job_type_preference">
                <FormItem>
                  <FormLabel>Job type</FormLabel>
                  <div class="-mx-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                    <label v-for="opt in jobTypeOptions" :key="opt" :class="checkRow">
                      <Checkbox
                        :model-value="values.job_type_preference.includes(opt)"
                        @update:model-value="(checked) => toggleJobType(opt, checked)"
                      />
                      {{ opt }}
                    </label>
                  </div>
                  <FormMessage />
                </FormItem>
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle class="text-base">Preferred work locations</CardTitle>
              <CardDescription>Leave blank if you're open to anywhere.</CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <FormField v-slot="{ componentField }" name="preferred_local_locations">
                <FormItem>
                  <FormLabel>Local <span class="font-normal text-muted-foreground">{{ optional }}</span></FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" placeholder="Prosperidad, San Francisco, Butuan City" />
                  </FormControl>
                  <FormDescription>Cities or municipalities, separated with commas.</FormDescription>
                  <FormMessage />
                </FormItem>
              </FormField>
              <FormField v-slot="{ componentField }" name="preferred_overseas_locations">
                <FormItem>
                  <FormLabel>Overseas <span class="font-normal text-muted-foreground">{{ optional }}</span></FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" placeholder="Japan, Canada" />
                  </FormControl>
                  <FormDescription>Countries, separated with commas.</FormDescription>
                  <FormMessage />
                </FormItem>
              </FormField>
            </CardContent>
          </Card>
        </template>
      </div>

      <!-- ─── Actions (fixed on mobile, inline on desktop) ─── -->
      <div
        class="fixed inset-x-0 bottom-0 z-40 grid grid-cols-[auto_1fr] gap-3 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur supports-backdrop-filter:bg-background/80
          sm:static sm:z-auto sm:mt-6 sm:flex sm:justify-between sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none"
      >
        <Button
          type="button"
          variant="outline"
          class="h-11 px-5 sm:h-9 sm:px-4"
          :class="currentStep === 0 && 'invisible'"
          :disabled="isSubmitting"
          @click="prevStep"
        >
          Back
        </Button>
        <Button type="submit" class="h-11 text-base sm:h-9 sm:text-sm" :disabled="isSubmitting">
          <Loader2 v-if="isSubmitting" class="size-4 shrink-0 animate-spin" />
          {{ isSubmitting ? 'Saving...' : isLastStep ? 'Finish' : 'Save and continue' }}
        </Button>
      </div>
    </form>
  </div>
</template>
