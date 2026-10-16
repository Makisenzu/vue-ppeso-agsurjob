<script setup lang="ts">
import { ref } from 'vue'
import { Trash2 } from '@lucide/vue'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useNsrpFormContext } from '@/composables/applicant/useNsrpForm'
import NsrpFieldGroup from '@/components/applicant/Profile/Nsrp/NsrpFieldGroup.vue'

defineProps<{
  /** Groups render flat inside a parent card (profile editor) instead of as separate cards (wizard). */
  flat?: boolean
}>()

const {
  values,
  listError,
  workFields,
  addWork,
  removeWork,
  languageFields,
  addLanguage,
  removeLanguage,
  toggleSkill,
  appointmentStatusOptions,
  skillOptions,
  languageAbilities,
} = useNsrpFormContext()

// ─── Add a language by name (PESO entry style) ───
const newLanguage = ref('')
const languageError = ref('')

function handleAddLanguage() {
  if (!newLanguage.value.trim()) {
    languageError.value = 'Type a language or dialect first.'
    return
  }
  if (!addLanguage(newLanguage.value)) {
    languageError.value = `${newLanguage.value.trim()} is already in the list.`
    return
  }
  newLanguage.value = ''
  languageError.value = ''
}

const optional = '(optional)'
const checkRow =
  'flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 text-sm transition-colors hover:bg-muted/60 sm:min-h-9'
</script>

<template>
  <div :class="flat ? 'space-y-8' : 'space-y-4 sm:space-y-6'">
    <NsrpFieldGroup
      title="Work experience"
      description="Start with your most recent job. Skip if you haven't worked yet."
      content-class="space-y-3"
      :flat="flat"
    >
      <template #action>
        <Button type="button" variant="outline" size="sm" class="max-sm:h-10" @click="addWork">Add job</Button>
      </template>
      <p
        v-if="workFields.length === 0"
        class="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground"
      >
        No work experience added.
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
    </NsrpFieldGroup>

    <!-- Laid out like the PESO applicant entry form: type a language, Add, then tick abilities in the table -->
    <NsrpFieldGroup
      title="Language / dialect proficiency"
      description="Tick what you can do in each language."
      content-class="space-y-3"
      :flat="flat"
    >
      <template #action>
        <div class="flex items-center gap-2">
          <Input
            v-model="newLanguage"
            aria-label="Language or dialect to add"
            placeholder="Add language"
            class="h-9 w-32 sm:w-44 max-sm:h-10"
            @keydown.enter.prevent="handleAddLanguage"
          />
          <Button type="button" variant="outline" size="sm" class="max-sm:h-10" @click="handleAddLanguage">Add</Button>
        </div>
      </template>
      <p v-if="languageError" class="text-sm text-destructive">{{ languageError }}</p>
      <p v-if="listError('language_proficiencies')" data-list-error class="text-sm text-destructive">
        {{ listError('language_proficiencies') }}
      </p>
      <div class="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader class="bg-muted/40">
            <TableRow>
              <TableHead class="min-w-36 text-xs font-semibold">Language / dialect</TableHead>
              <TableHead v-for="ability in languageAbilities" :key="ability" class="w-20 text-center text-xs font-semibold capitalize">
                {{ ability }}
              </TableHead>
              <TableHead class="w-12"><span class="sr-only">Remove</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="(entry, index) in languageFields" :key="entry.key">
              <TableCell class="font-medium text-foreground">{{ entry.value.language }}</TableCell>
              <TableCell v-for="ability in languageAbilities" :key="ability" class="p-0">
                <FormField v-slot="{ value, handleChange }" :name="`language_proficiencies[${index}].${ability}`">
                  <label class="mx-auto flex size-11 cursor-pointer items-center justify-center sm:size-9">
                    <Checkbox
                      :model-value="value"
                      :aria-label="`${entry.value.language}: ${ability}`"
                      @update:model-value="handleChange"
                    />
                  </label>
                </FormField>
              </TableCell>
              <TableCell class="p-0 text-right">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  class="size-9 text-muted-foreground hover:text-destructive max-sm:size-11"
                  :aria-label="`Remove ${entry.value.language}`"
                  @click="removeLanguage(index)"
                >
                  <Trash2 class="size-4 shrink-0" />
                </Button>
              </TableCell>
            </TableRow>
            <TableRow v-if="languageFields.length === 0">
              <TableCell :colspan="languageAbilities.length + 2" class="py-6 text-center text-sm text-muted-foreground">
                No languages added.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </NsrpFieldGroup>

    <NsrpFieldGroup
      title="Skills"
      description="Select at least one skill you have, even without formal training."
      content-class="space-y-4"
      :flat="flat"
    >
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
    </NsrpFieldGroup>
  </div>
</template>
