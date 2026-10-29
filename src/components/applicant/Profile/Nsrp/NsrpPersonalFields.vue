<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useNsrpFormContext } from '@/composables/applicant/useNsrpForm'
import NsrpFieldGroup from '@/components/applicant/Profile/Nsrp/NsrpFieldGroup.vue'
import SearchSelect from '@/components/SearchSelect.vue'

defineProps<{
  /** Groups render flat inside a parent card (profile editor) instead of as separate cards (wizard). */
  flat?: boolean
  aboutDescription?: string
}>()

const {
  values,
  age,
  isEmployed,
  isUnemployed,
  isSelfEmployed,
  needsPersonal,
  maxDate,
  toggleDisability,
  sexOptions,
  civilStatusOptions,
  employmentStatusOptions,
  employmentTypeOptions,
  unemployedReasonOptions,
  disabilityOptions,
} = useNsrpFormContext()

const optional = '(optional)'
const checkRow =
  'flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 text-sm transition-colors hover:bg-muted/60 sm:min-h-9'
</script>

<template>
  <div :class="flat ? 'space-y-8' : 'space-y-4 sm:space-y-6'">
    <NsrpFieldGroup
      title="About you"
      :description="aboutDescription"
      content-class="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 sm:gap-x-4"
      :flat="flat"
    >
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
            <SearchSelect v-bind="componentField" class="w-full" :options="sexOptions" placeholder="Select" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
      <FormField v-if="needsPersonal('civil_status')" v-slot="{ componentField }" name="civil_status">
        <FormItem>
          <FormLabel>Civil status</FormLabel>
          <FormControl>
            <SearchSelect v-bind="componentField" class="w-full" :options="civilStatusOptions" placeholder="Select" />
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
    </NsrpFieldGroup>

    <NsrpFieldGroup
      title="Employment status"
      description="Your current work situation."
      content-class="grid grid-cols-1 gap-4 sm:grid-cols-2"
      :flat="flat"
    >
      <FormField v-slot="{ componentField }" name="employment_status">
        <FormItem>
          <FormLabel>Employment status</FormLabel>
          <FormControl>
            <SearchSelect
              v-bind="componentField"
              class="w-full"
              :options="employmentStatusOptions"
              placeholder="Select status"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <template v-if="isEmployed">
        <FormField v-slot="{ componentField }" name="employment_type">
          <FormItem>
            <FormLabel>Employment type</FormLabel>
            <FormControl>
              <SearchSelect
                v-bind="componentField"
                class="w-full"
                :options="employmentTypeOptions"
                placeholder="Select type"
              />
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
              <SearchSelect
                v-bind="componentField"
                class="w-full"
                :options="unemployedReasonOptions"
                placeholder="Select reason"
              />
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
    </NsrpFieldGroup>

    <NsrpFieldGroup
      title="Special categories"
      description="Used to match you with PESO programs. Leave off if they don't apply."
      content-class="divide-y"
      :flat="flat"
    >
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
    </NsrpFieldGroup>
  </div>
</template>
