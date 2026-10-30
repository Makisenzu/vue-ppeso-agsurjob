<script setup lang="ts">
import { computed } from 'vue'
import { useFieldValue, useSetFieldValue } from 'vee-validate'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import SearchSelect from '@/components/SearchSelect.vue'
import JobVacancyCourseFields from '@/components/JobVacancyCourseFields.vue'
import JobVacancySkillsField from '@/components/JobVacancySkillsField.vue'
import {
  DISABILITY_TYPE_OPTIONS,
  NATURE_OF_WORK_OPTIONS,
  VACANCY_STATUSES,
  type DisabilityType,
} from '@/types/peso/provincialPeso/jobFair'

/**
 * Every `esmdd.job_vacancies` field. Renders inside a parent vee-validate form whose values follow
 * `JobVacancyFormValues` (see jobVacancyHelper for the schema and payload). The `position` slot adds
 * fields to the position grid (e.g. a job order's jobsite country).
 */
defineProps<{ disabled?: boolean }>()

const acceptsPwdValue = useFieldValue<boolean>('acceptsPwd')
const pwdDisabilities = useFieldValue<DisabilityType[]>('pwdDisabilities')
const setPwdDisabilities = useSetFieldValue<DisabilityType[]>('pwdDisabilities')

const acceptsPwd = computed(() => acceptsPwdValue.value === true)
const hasOtherDisability = computed(() => pwdDisabilities.value?.includes('Others') ?? false)

const toggleDisability = (option: DisabilityType, checked: boolean) => {
  const current = pwdDisabilities.value ?? []
  setPwdDisabilities(checked ? [...new Set([...current, option])] : current.filter((item) => item !== option))
}

const qualificationFields = [
  { name: 'educationalLevel', label: 'Educational Level', placeholder: 'e.g. College Graduate' },
  { name: 'eligibility', label: 'Eligibility', placeholder: 'e.g. CSC Professional, or None' },
  { name: 'license', label: 'License', placeholder: 'e.g. Professional Driver’s License, or None' },
  { name: 'certification', label: 'Certification', placeholder: 'e.g. TESDA NC II, or None' },
] as const
</script>

<template>
  <div class="grid gap-5">
    <!-- Position -->
    <section class="grid gap-4">
      <h3 class="text-sm font-semibold">Position</h3>

      <FormField v-slot="{ componentField }" name="positionTitle">
        <FormItem>
          <FormLabel>Position Title</FormLabel>
          <FormControl>
            <Input v-bind="componentField" placeholder="e.g. Production Operator" :disabled="disabled" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <div class="grid gap-4 sm:grid-cols-2">
        <FormField v-slot="{ componentField }" name="natureOfWork">
          <FormItem>
            <FormLabel>Nature of Work</FormLabel>
            <FormControl>
              <SearchSelect
                v-bind="componentField"
                :disabled="disabled"
                :options="NATURE_OF_WORK_OPTIONS"
                placeholder="Select nature of work"
                class="w-full"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="vacancyCount">
          <FormItem>
            <FormLabel>Number of Openings</FormLabel>
            <FormControl>
              <Input v-bind="componentField" type="number" min="1" step="1" :disabled="disabled" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="salary">
          <FormItem>
            <FormLabel>Salary</FormLabel>
            <FormControl>
              <Input v-bind="componentField" placeholder="e.g. ₱15,000 – ₱18,000 / month" :disabled="disabled" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="placeOfWork">
          <FormItem>
            <FormLabel>Place of Work</FormLabel>
            <FormControl>
              <Input v-bind="componentField" placeholder="e.g. San Francisco, Agusan del Sur" :disabled="disabled" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <slot name="position" />
      </div>

      <FormField v-slot="{ componentField }" name="jobDescription">
        <FormItem>
          <FormLabel>Job Description</FormLabel>
          <FormControl>
            <Textarea v-bind="componentField" rows="3" placeholder="Duties and responsibilities" :disabled="disabled" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
    </section>

    <Separator />

    <!-- Qualifications -->
    <section class="grid gap-4">
      <h3 class="text-sm font-semibold">Qualifications</h3>
      <div class="grid gap-4 sm:grid-cols-2">
        <FormField v-for="field in qualificationFields" :key="field.name" v-slot="{ componentField }" :name="field.name">
          <FormItem>
            <FormLabel>{{ field.label }}</FormLabel>
            <FormControl>
              <Input v-bind="componentField" :placeholder="field.placeholder" :disabled="disabled" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="workExperienceMonths">
          <FormItem>
            <FormLabel>Work Experience (months)</FormLabel>
            <FormControl>
              <Input v-bind="componentField" type="number" min="0" step="1" :disabled="disabled" />
            </FormControl>
            <FormDescription>Use 0 if no experience is required.</FormDescription>
            <FormMessage />
          </FormItem>
        </FormField>
      </div>

      <JobVacancyCourseFields :disabled="disabled" />

      <FormField v-slot="{ componentField }" name="languages">
        <FormItem>
          <FormLabel>Languages / Dialects Spoken</FormLabel>
          <FormControl>
            <Input v-bind="componentField" placeholder="e.g. English, Filipino, Cebuano" :disabled="disabled" />
          </FormControl>
          <FormDescription>Separate multiple entries with commas.</FormDescription>
          <FormMessage />
        </FormItem>
      </FormField>

      <FormField v-slot="{ componentField }" name="otherQualifications">
        <FormItem>
          <FormLabel>Other Qualifications</FormLabel>
          <FormControl>
            <Input v-bind="componentField" placeholder="e.g. Physically fit, Can work on shifts, or None" :disabled="disabled" />
          </FormControl>
          <FormDescription>Separate multiple entries with commas.</FormDescription>
          <FormMessage />
        </FormItem>
      </FormField>
    </section>

    <Separator />

    <!-- Skills (for applicant matching) -->
    <JobVacancySkillsField :disabled="disabled" />

    <Separator />

    <!-- Inclusivity -->
    <section class="grid gap-4">
      <h3 class="text-sm font-semibold">Inclusivity</h3>

      <FormField v-slot="{ value, handleChange }" name="acceptsReturningOfw">
        <FormItem class="flex flex-row items-center justify-between gap-4 rounded-md border p-3">
          <div class="space-y-0.5">
            <FormLabel>Open to Returning OFWs</FormLabel>
            <FormDescription>Overseas Filipino workers who have returned home.</FormDescription>
          </div>
          <FormControl>
            <Switch :model-value="value" :disabled="disabled" @update:model-value="handleChange" />
          </FormControl>
        </FormItem>
      </FormField>

      <FormField v-slot="{ value, handleChange }" name="acceptsPwd">
        <FormItem class="flex flex-row items-center justify-between gap-4 rounded-md border p-3">
          <div class="space-y-0.5">
            <FormLabel>Open to Persons with Disability</FormLabel>
            <FormDescription>Specify which disabilities can be accommodated.</FormDescription>
          </div>
          <FormControl>
            <Switch :model-value="value" :disabled="disabled" @update:model-value="handleChange" />
          </FormControl>
        </FormItem>
      </FormField>

      <div v-if="acceptsPwd" class="grid gap-3 rounded-md border border-dashed p-3">
        <FormField name="pwdDisabilities">
          <FormItem>
            <p class="text-sm font-medium">Disabilities Accommodated</p>
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div v-for="option in DISABILITY_TYPE_OPTIONS" :key="option" class="flex items-center gap-2">
                <Checkbox
                  :id="`pwd-${option}`"
                  :model-value="pwdDisabilities?.includes(option) ?? false"
                  :disabled="disabled"
                  @update:model-value="(checked) => toggleDisability(option, checked === true)"
                />
                <Label :for="`pwd-${option}`" class="font-normal">{{ option }}</Label>
              </div>
            </div>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-if="hasOtherDisability" v-slot="{ componentField }" name="pwdOtherDisability">
          <FormItem>
            <FormLabel>Other Disability</FormLabel>
            <FormControl>
              <Input v-bind="componentField" placeholder="Please specify" :disabled="disabled" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
      </div>
    </section>

    <Separator />

    <!-- Posting -->
    <section class="grid gap-4 sm:grid-cols-3">
      <FormField v-slot="{ componentField }" name="postingDate">
        <FormItem>
          <FormLabel>Posting Date</FormLabel>
          <FormControl>
            <Input v-bind="componentField" type="date" :disabled="disabled" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <FormField v-slot="{ componentField }" name="validUntil">
        <FormItem>
          <FormLabel>Valid Until</FormLabel>
          <FormControl>
            <Input v-bind="componentField" type="date" :disabled="disabled" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <FormField v-slot="{ componentField }" name="status">
        <FormItem>
          <FormLabel>Status</FormLabel>
          <FormControl>
            <SearchSelect
              v-bind="componentField"
              :disabled="disabled"
              :options="VACANCY_STATUSES"
              placeholder="Select status"
              class="w-full capitalize"
              content-class="capitalize"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
    </section>
  </div>
</template>
