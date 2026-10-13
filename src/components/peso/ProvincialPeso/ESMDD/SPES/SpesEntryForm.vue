<script setup lang="ts">
import { CheckIcon, ChevronsUpDownIcon } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Combobox,
  ComboboxAnchor,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList,
  ComboboxTrigger,
  ComboboxViewport,
} from '@/components/ui/combobox'
import SpesFormSteps from '@/components/SpesFormSteps.vue'
import { useSpesEntryForm } from '@/composables/peso/provincialPeso/useSpesEntryForm'
import { getSpesApplicantStatusBadgeClass } from '@/helpers/peso/provincialPeso/spesHelper'

const {
  form,
  isEditMode,
  isLoading,
  isSubmitting,
  loadError,
  applicantStatus,
  selectedJobseeker,
  jobseekerSearch,
  jobseekerError,
  filteredJobseekers,
  isLoadingJobseekers,
  formatJobseekerName,
  selectJobseeker,
  backToList,
  submitEntry,
} = useSpesEntryForm()
</script>

<template>
  <div class="flex flex-col gap-6 pb-16">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {{ isEditMode ? 'Edit SPES Applicant' : 'Add SPES Applicant' }}
        </h1>
        <p class="text-sm text-muted-foreground">
          Encode the student's Special Program for Employment of Students application form.
        </p>
      </div>
      <div class="flex items-center gap-2 self-start sm:self-auto">
        <Badge v-if="applicantStatus" variant="outline" :class="getSpesApplicantStatusBadgeClass(applicantStatus)">
          {{ applicantStatus }}
        </Badge>
        <Button type="button" variant="outline" :disabled="isSubmitting" @click="backToList">Cancel</Button>
      </div>
    </div>

    <Alert v-if="loadError" variant="destructive">
      <AlertTitle>SPES form not available</AlertTitle>
      <AlertDescription class="flex flex-col items-start gap-2">
        {{ loadError }}
        <Button type="button" variant="outline" size="sm" @click="backToList">Back to SPES Applicants</Button>
      </AlertDescription>
    </Alert>

    <div v-else-if="isLoading" class="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div class="space-y-4 lg:col-span-4 xl:col-span-3">
        <Skeleton v-for="i in 5" :key="i" class="h-12 w-full" />
      </div>
      <Skeleton class="h-96 w-full lg:col-span-8 xl:col-span-9" />
    </div>

    <template v-else>
      <!-- ─── Linked jobseeker account ─── -->
      <Card>
        <CardHeader>
          <CardTitle class="text-base">Jobseeker Account</CardTitle>
          <CardDescription>
            Every SPES form belongs to a registered jobseeker. Pick the student from Entry of Applicants — their
            details fill in the blank fields below.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-2">
          <Label>Student <span class="text-destructive">*</span></Label>
          <Combobox
            :model-value="selectedJobseeker"
            v-model:search-term="jobseekerSearch"
            :ignore-filter="true"
            by="id"
            @update:model-value="(val) => selectJobseeker((val as typeof selectedJobseeker) ?? null)"
          >
            <ComboboxAnchor as-child>
              <ComboboxTrigger as-child>
                <Button
                  type="button"
                  variant="outline"
                  class="w-full justify-between overflow-hidden font-normal sm:max-w-md"
                  :disabled="isLoadingJobseekers || isSubmitting"
                >
                  <span class="min-w-0 flex-1 truncate text-left">
                    <template v-if="isLoadingJobseekers">Loading jobseekers...</template>
                    <template v-else-if="selectedJobseeker">{{ formatJobseekerName(selectedJobseeker) }}</template>
                    <span v-else class="text-muted-foreground">Search by name, email or contact number...</span>
                  </span>
                  <ChevronsUpDownIcon class="size-4 shrink-0 opacity-50" />
                </Button>
              </ComboboxTrigger>
            </ComboboxAnchor>

            <ComboboxList>
              <ComboboxInput
                placeholder="Search jobseekers..."
                @input="jobseekerSearch = ($event.target as HTMLInputElement).value"
              />
              <ComboboxViewport>
                <ComboboxEmpty>No jobseeker with an account matches.</ComboboxEmpty>
                <ComboboxGroup>
                  <ComboboxItem v-for="jobseeker in filteredJobseekers" :key="jobseeker.id" :value="jobseeker">
                    <span class="min-w-0 flex-1">
                      <span class="block truncate">{{ formatJobseekerName(jobseeker) }}</span>
                      <span v-if="jobseeker.email" class="block truncate text-xs text-muted-foreground">
                        {{ jobseeker.email }}
                      </span>
                    </span>
                    <ComboboxItemIndicator>
                      <CheckIcon class="size-4 shrink-0" />
                    </ComboboxItemIndicator>
                  </ComboboxItem>
                </ComboboxGroup>
              </ComboboxViewport>
            </ComboboxList>
          </Combobox>
          <p v-if="jobseekerError" class="text-sm text-destructive">{{ jobseekerError }}</p>
          <p v-else class="text-xs text-muted-foreground">
            Not listed? Register the student first in Entry of Applicants with an account.
          </p>
        </CardContent>
      </Card>

      <!-- ─── SPES form steps ─── -->
      <SpesFormSteps
        :form="form"
        :is-submitting="isSubmitting"
        :submit-label="isEditMode ? 'Save Changes' : 'Add Applicant'"
        submitting-label="Saving..."
        certification-label="I have checked this form against the student's signed SPES application and supporting documents."
        @submit="submitEntry"
      >
        <template #review>
          <div class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <div>
              <span class="text-xs text-muted-foreground">Jobseeker Account</span>
              <p class="text-sm font-medium">
                {{ selectedJobseeker ? formatJobseekerName(selectedJobseeker) : 'Not selected' }}
              </p>
            </div>
          </div>
        </template>
      </SpesFormSteps>
    </template>
  </div>
</template>
