<script setup lang="ts">
import { computed } from 'vue'
import { useFieldValue } from 'vee-validate'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import SearchSelect from '@/components/SearchSelect.vue'
import { Constants } from '@/types/database.types'

/**
 * NSRP Form 2 (Establishment Registration) fields. Renders inside a parent vee-validate form whose
 * values follow `EstablishmentFormValues` (see establishmentHelper for the schema and payload).
 * `namePrefix` nests them, e.g. 'establishment.' in the signup form, whose own street / barangay /
 * province / tin belong to the person. `sections` renders part of the form, e.g. one signup step.
 */
type Form2Section = 'employer' | 'contact' | 'address'

const props = withDefaults(defineProps<{ disabled?: boolean; namePrefix?: string; sections?: Form2Section[] }>(), {
  namePrefix: '',
  sections: () => ['employer', 'contact', 'address'],
})

const shows = (section: Form2Section) => props.sections.includes(section)

const fieldName = (name: string) => `${props.namePrefix}${name}`

const categoryOptions = Constants.esmdd.Enums.employer_category_enum
const publicTypeOptions = Constants.esmdd.Enums.public_employer_type_enum
const privateTypeOptions = Constants.esmdd.Enums.private_employer_type_enum
const workforceOptions = Constants.esmdd.Enums.total_workforce_enum

const employerCategory = useFieldValue<string>(fieldName('employerCategory'))
const isPublicEmployer = computed(() => employerCategory.value === 'Public')

const textFields = {
  employer: [
    { name: 'tradeName', label: 'Trade Name', placeholder: 'Brand or trade name', optional: true },
    { name: 'acronym', label: 'Acronym', placeholder: 'e.g. ABC', optional: true },
    { name: 'industryLine', label: 'Line of Industry', placeholder: 'e.g. Manufacturing' },
    { name: 'tin', label: 'TIN', placeholder: '000-000-000-000' },
    { name: 'ownerPresidentName', label: 'Owner / President', placeholder: 'Full name' },
  ],
  contact: [
    { name: 'contactPersonName', label: 'Contact Person', placeholder: 'Full name' },
    { name: 'contactPersonPosition', label: 'Position', placeholder: 'e.g. HR Officer' },
    { name: 'emailAddress', label: 'Email Address', placeholder: 'name@company.com', type: 'email' },
    { name: 'mobileNumber', label: 'Mobile Number', placeholder: '09XX XXX XXXX', type: 'tel' },
    { name: 'telephoneNumber', label: 'Telephone Number', placeholder: '(085) 000-0000', type: 'tel' },
    { name: 'faxNumber', label: 'Fax Number', placeholder: 'Fax number', type: 'tel', optional: true },
  ],
  address: [
    { name: 'street', label: 'Street', placeholder: 'House no., street', optional: true },
    { name: 'barangay', label: 'Barangay', placeholder: 'Barangay' },
    { name: 'cityMunicipality', label: 'City / Municipality', placeholder: 'e.g. Prosperidad' },
    { name: 'province', label: 'Province', placeholder: 'e.g. Agusan del Sur' },
  ],
} as const
</script>

<template>
  <div class="grid gap-5">
    <!-- Employer -->
    <section v-if="shows('employer')" class="grid gap-4">
      <h4 class="text-sm font-medium text-muted-foreground">Employer Information</h4>

      <FormField v-slot="{ componentField }" :name="fieldName('businessName')">
        <FormItem>
          <FormLabel>Business Name</FormLabel>
          <FormControl>
            <Input v-bind="componentField" placeholder="Registered business name" :disabled="disabled" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <div class="grid gap-4 sm:grid-cols-2">
        <FormField v-slot="{ componentField }" :name="fieldName('employerCategory')">
          <FormItem>
            <FormLabel>Employer Category</FormLabel>
            <FormControl>
              <SearchSelect
                v-bind="componentField"
                :disabled="disabled"
                :options="categoryOptions"
                placeholder="Select category"
                class="w-full"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-if="isPublicEmployer" v-slot="{ componentField }" :name="fieldName('publicEmployerType')">
          <FormItem>
            <FormLabel>Public Employer Type</FormLabel>
            <FormControl>
              <SearchSelect
                v-bind="componentField"
                :disabled="disabled"
                :options="publicTypeOptions"
                placeholder="Select type"
                class="w-full"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-else v-slot="{ componentField }" :name="fieldName('privateEmployerType')">
          <FormItem>
            <FormLabel>Private Employer Type</FormLabel>
            <FormControl>
              <SearchSelect
                v-bind="componentField"
                :disabled="disabled"
                :options="privateTypeOptions"
                placeholder="Select type"
                class="w-full"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-for="field in textFields.employer" :key="field.name" v-slot="{ componentField }" :name="fieldName(field.name)">
          <FormItem>
            <FormLabel>
              {{ field.label }}
              <span v-if="'optional' in field" class="font-normal text-muted-foreground">(optional)</span>
            </FormLabel>
            <FormControl>
              <Input v-bind="componentField" :placeholder="field.placeholder" :disabled="disabled" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" :name="fieldName('totalWorkforce')">
          <FormItem>
            <FormLabel>Total Workforce</FormLabel>
            <FormControl>
              <SearchSelect
                v-bind="componentField"
                :disabled="disabled"
                :options="workforceOptions"
                placeholder="Select size"
                class="w-full"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
      </div>
    </section>

    <!-- Contact -->
    <section v-if="shows('contact')" class="grid gap-4">
      <h4 class="text-sm font-medium text-muted-foreground">Contact</h4>
      <div class="grid gap-4 sm:grid-cols-2">
        <FormField v-for="field in textFields.contact" :key="field.name" v-slot="{ componentField }" :name="fieldName(field.name)">
          <FormItem>
            <FormLabel>
              {{ field.label }}
              <span v-if="'optional' in field" class="font-normal text-muted-foreground">(optional)</span>
            </FormLabel>
            <FormControl>
              <Input v-bind="componentField" :type="'type' in field ? field.type : 'text'" :placeholder="field.placeholder" :disabled="disabled" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
      </div>
      <p class="text-xs text-muted-foreground">A mobile or telephone number is required.</p>
    </section>

    <!-- Address -->
    <section v-if="shows('address')" class="grid gap-4">
      <h4 class="text-sm font-medium text-muted-foreground">Address</h4>
      <div class="grid gap-4 sm:grid-cols-2">
        <FormField v-for="field in textFields.address" :key="field.name" v-slot="{ componentField }" :name="fieldName(field.name)">
          <FormItem>
            <FormLabel>
              {{ field.label }}
              <span v-if="'optional' in field" class="font-normal text-muted-foreground">(optional)</span>
            </FormLabel>
            <FormControl>
              <Input v-bind="componentField" :placeholder="field.placeholder" :disabled="disabled" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
      </div>

      <FormField v-slot="{ value, handleChange }" :name="fieldName('isMainOffice')">
        <FormItem class="flex flex-row items-center justify-between gap-4 rounded-md border p-3">
          <div class="space-y-0.5">
            <FormLabel>Main Office</FormLabel>
            <FormDescription>Turn off if this is a branch office.</FormDescription>
          </div>
          <FormControl>
            <Switch :model-value="value" :disabled="disabled" @update:model-value="handleChange" />
          </FormControl>
        </FormItem>
      </FormField>
    </section>
  </div>
</template>
