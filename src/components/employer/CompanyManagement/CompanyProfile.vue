<script setup lang="ts">
import { Loader2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useCompanyProfile } from '@/composables/employer/useCompanyProfile'
import { useCompanyProfileEditor } from '@/composables/employer/useCompanyProfileEditor'
import CompanyDocuments from '@/components/employer/Documents/CompanyDocuments.vue'
import CustomBreadcrumbs from '@/components/CustomBreadcrumbs.vue'
import NsrpForm2Fields from '@/components/NsrpForm2Fields.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import MapLocationPicker from '@/components/MapLocationPicker.vue'
import CompanyCover from './CompanyProfile/CompanyCover.vue'
import CompanySidebar from './CompanyProfile/CompanySidebar.vue'
import CompanyDetails from './CompanyProfile/CompanyDetails.vue'

const {
  isLoading,
  employer,
  displayCompanyName,
  displayIndustry,
  displayAddress,
  displayDescription,
  hasDescription,
  displayWebsite,
  hasWebsite,
  websiteHref,
  displayContact,
  displayEmail,
  displayCreatedDate,
  companyInitials,
  companyStatus,
  companyDetails,
  contactDetails,
  isLoadingDetails,
  coverUrl,
  logoUrl,
} = useCompanyProfile()

const {
  editingSection,
  isEditorOpen,
  editorMeta,
  isSaving,
  openEditor,
  saveSection,
  BUSINESS_TYPE_OPTIONS,
  pickedLocation,
  locationQuery,
  setPickedLocation,
  isUpdatingCover,
  onCoverSelected,
  removeCover,
  isUpdatingLogo,
  onLogoSelected,
  removeLogo,
} = useCompanyProfileEditor()
</script>

<template>
  <!-- Same layout as the employer Account page (EmployerAccount.vue), with a cover photo on top -->
  <div class="mx-auto w-full min-w-0 max-w-7xl flex-1 px-0 sm:px-6 lg:px-8">
    <div class="mb-4 sm:mb-6">
      <CustomBreadcrumbs />
    </div>

    <CompanyCover
      class="mb-6"
      :cover-url="coverUrl"
      :company-name="displayCompanyName"
      :is-updating="isUpdatingCover"
      @select="onCoverSelected"
      @remove="removeCover"
    />

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div class="min-w-0 lg:col-span-3">
        <div class="lg:sticky lg:top-6">
          <CompanySidebar
            :company-name="displayCompanyName"
            :company-initials="companyInitials"
            :logo-url="logoUrl"
            :is-updating-logo="isUpdatingLogo"
            :industry="displayIndustry"
            :company-status="companyStatus"
            :address="displayAddress"
            :email="displayEmail"
            :contact="displayContact"
            :website="displayWebsite"
            :website-href="websiteHref"
            :has-website="hasWebsite"
            :created-date="displayCreatedDate"
            :is-loading="isLoading"
            @select-logo="onLogoSelected"
            @remove-logo="removeLogo"
          />
        </div>
      </div>

      <div class="min-w-0 space-y-6 lg:col-span-9">
        <!-- Same place and flow as the applicant's Document Upload Progress on their account -->
        <CompanyDocuments />

        <CompanyDetails
          :details="companyDetails"
          :contact-details="contactDetails"
          :description="displayDescription"
          :has-description="hasDescription"
          :is-loading="isLoadingDetails"
          :latitude="employer?.latitude ?? null"
          :longitude="employer?.longitude ?? null"
          :company-name="displayCompanyName"
          @edit="openEditor"
        />
      </div>
    </div>
  </div>

  <!-- Per-section editor (DESIGN.md: long forms go in a Sheet with a sticky footer) -->
  <Sheet v-model:open="isEditorOpen">
    <SheetContent class="flex h-full flex-col p-0 sm:max-w-lg">
      <SheetHeader class="shrink-0 px-6 pt-6 pb-2">
        <SheetTitle>{{ editorMeta.title }}</SheetTitle>
        <SheetDescription>{{ editorMeta.description }}</SheetDescription>
      </SheetHeader>

      <form class="contents" @submit="saveSection">
        <div class="grid flex-1 grid-cols-1 content-start gap-5 overflow-y-auto px-6 py-4">
          <template v-if="editingSection === 'details'">
            <NsrpForm2Fields name-prefix="establishment." :sections="['employer']" :disabled="isSaving" />
            <FormField v-slot="{ componentField }" name="business_type">
              <FormItem>
                <FormLabel>Business type</FormLabel>
                <FormControl>
                  <SearchSelect
                    v-bind="componentField"
                    :options="BUSINESS_TYPE_OPTIONS"
                    :disabled="isSaving"
                    placeholder="Select business type"
                    class="w-full"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
            <FormField v-slot="{ componentField }" name="registration_number">
              <FormItem>
                <FormLabel>Registration number <span class="font-normal text-muted-foreground">(optional)</span></FormLabel>
                <FormControl>
                  <Input v-bind="componentField" placeholder="DTI / SEC / CDA number" :disabled="isSaving" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          </template>

          <template v-else-if="editingSection === 'contact'">
            <NsrpForm2Fields name-prefix="establishment." :sections="['contact', 'address']" :disabled="isSaving" />
            <FormField v-slot="{ componentField }" name="website">
              <FormItem>
                <FormLabel>Website <span class="font-normal text-muted-foreground">(optional)</span></FormLabel>
                <FormControl>
                  <Input
                    v-bind="componentField"
                    type="url"
                    inputmode="url"
                    autocapitalize="off"
                    placeholder="https://company.com"
                    :disabled="isSaving"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          </template>

          <MapLocationPicker
            v-else-if="editingSection === 'location'"
            :latitude="pickedLocation?.latitude"
            :longitude="pickedLocation?.longitude"
            :location-query="locationQuery"
            empty-hint="Click on the map to pin your office."
            :disabled="isSaving"
            @update:location="setPickedLocation"
          />

          <FormField v-else v-slot="{ componentField }" name="company_description">
            <FormItem>
              <FormLabel>About the company <span class="font-normal text-muted-foreground">(optional)</span></FormLabel>
              <FormControl>
                <Textarea
                  v-bind="componentField"
                  rows="8"
                  placeholder="What your company does, its culture and what it looks for in applicants"
                  :disabled="isSaving"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        </div>

        <div class="flex shrink-0 justify-end gap-3 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" :disabled="isSaving" @click="isEditorOpen = false">Cancel</Button>
          <Button type="submit" :disabled="isSaving">
            <Loader2 v-if="isSaving" class="size-4 animate-spin" />
            {{ isSaving ? 'Saving...' : 'Save Changes' }}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>
</template>
