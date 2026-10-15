<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useNsrpFormContext } from '@/composables/applicant/useNsrpForm'
import NsrpFieldGroup from '@/components/applicant/Profile/Nsrp/NsrpFieldGroup.vue'

defineProps<{
  /** Groups render flat inside a parent card (profile editor) instead of as separate cards (wizard). */
  flat?: boolean
}>()

const {
  values,
  toggleJobType,
  jobTypeOptions,
} = useNsrpFormContext()

const optional = '(optional)'
const checkRow =
  'flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 text-sm transition-colors hover:bg-muted/60 sm:min-h-9'
</script>

<template>
  <div :class="flat ? 'space-y-8' : 'space-y-4 sm:space-y-6'">
    <NsrpFieldGroup
      title="Job preference"
      description="Helps PESO and employers match you with openings."
      content-class="space-y-4"
      :flat="flat"
    >
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
    </NsrpFieldGroup>

    <NsrpFieldGroup
      title="Preferred work locations"
      description="Leave blank if you're open to anywhere."
      content-class="space-y-4"
      :flat="flat"
    >
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
    </NsrpFieldGroup>
  </div>
</template>
