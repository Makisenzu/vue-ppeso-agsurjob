<script setup lang="ts">
import { Trash2 } from '@lucide/vue'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useNsrpFormContext } from '@/composables/applicant/useNsrpForm'
import NsrpFieldGroup from '@/components/applicant/Profile/Nsrp/NsrpFieldGroup.vue'
import NsrpSupportingDocField from '@/components/applicant/Profile/Nsrp/NsrpSupportingDocField.vue'
import SearchSelect from '@/components/SearchSelect.vue'

defineProps<{
  /** Groups render flat inside a parent card (profile editor) instead of as separate cards (wizard). */
  flat?: boolean
}>()

const {
  listError,
  maxDate,
  educationFields,
  addEducation,
  removeEducation,
  trainingFields,
  addTraining,
  removeTraining,
  eligibilityFields,
  addEligibility,
  removeEligibility,
  educationLevelOptions,
} = useNsrpFormContext()

const optional = '(optional)'
</script>

<template>
  <div :class="flat ? 'space-y-8' : 'space-y-4 sm:space-y-6'">
    <NsrpFieldGroup
      title="Educational background"
      description="Add every level you attended, starting with the highest."
      content-class="space-y-4"
      :flat="flat"
    >
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
                <SearchSelect
                  v-bind="componentField"
                  class="w-full"
                  :options="educationLevelOptions"
                  placeholder="Select level"
                />
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
    </NsrpFieldGroup>

    <!-- Optional lists, laid out like the PESO applicant entry form: header + Add, empty state, entries -->
    <NsrpFieldGroup
      title="Technical / vocational training"
      description="TESDA or other skills trainings and certifications. Each training needs its certificate uploaded. Skip if none."
      content-class="space-y-3"
      :flat="flat"
    >
      <template #action>
        <Button type="button" variant="outline" size="sm" class="max-sm:h-10" @click="addTraining">Add training</Button>
      </template>
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
          <div class="sm:col-span-2">
            <NsrpSupportingDocField list="vocational_trainings" :index="index" label="Training certificate" />
          </div>
        </div>
      </div>
    </NsrpFieldGroup>

    <NsrpFieldGroup
      title="Eligibility / professional license"
      description="Civil service eligibility or PRC board license. Each one needs its license or certificate uploaded. Skip if none."
      content-class="space-y-3"
      :flat="flat"
    >
      <template #action>
        <Button type="button" variant="outline" size="sm" class="max-sm:h-10" @click="addEligibility">Add eligibility</Button>
      </template>
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
          <div class="col-span-2">
            <NsrpSupportingDocField list="eligibilities" :index="index" label="License / certificate of eligibility" />
          </div>
        </div>
      </div>
    </NsrpFieldGroup>
  </div>
</template>
