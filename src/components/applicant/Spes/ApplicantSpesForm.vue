<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import SpesFormSteps from '@/components/SpesFormSteps.vue'
import SpesCompletionReportList from '@/components/SpesCompletionReportList.vue'
import { useSpesFormEntry } from '@/composables/applicant/useSpesFormEntry'
import {
  formatSpesAssignment,
  formatSpesFormDate,
  getSpesApplicationStatusBadgeClass,
} from '@/helpers/common/spesFormHelper'

const {
  form,
  applicationRecord,
  currentAppointment,
  completionReports,
  busyReportType,
  canSubmitReports,
  onReportPicked,
  onReportRemoved,
  isLoading,
  isSubmitting,
  errorMessage,
  isLocked,
  isEditMode,
  reloadForm,
  submitForm,
} = useSpesFormEntry()
</script>

<template>
  <div class="flex flex-col gap-6 pb-16">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">SPES Application Form</h1>
        <p class="text-sm text-muted-foreground">
          Special Program for Employment of Students — fill up the form so PESO can review your application.
        </p>
      </div>
      <Badge
        v-if="applicationRecord"
        variant="outline"
        class="self-start sm:self-auto"
        :class="getSpesApplicationStatusBadgeClass(applicationRecord.status)"
      >
        {{ applicationRecord.status || 'Pending' }}
      </Badge>
    </div>

    <!-- ─── Status ─── -->
    <Alert v-if="errorMessage" variant="destructive">
      <AlertTitle>Your SPES application could not be loaded</AlertTitle>
      <AlertDescription class="flex flex-col items-start gap-2">
        {{ errorMessage }}
        <Button type="button" variant="outline" size="sm" @click="reloadForm">Try again</Button>
      </AlertDescription>
    </Alert>
    <Alert v-else-if="isLocked">
      <AlertTitle>Your application has been reviewed</AlertTitle>
      <AlertDescription>
        PESO marked your application as <strong>{{ applicationRecord?.status }}</strong>, so it can no longer be
        edited.<template v-if="applicationRecord?.remarks"> Remarks: {{ applicationRecord.remarks }}</template>
      </AlertDescription>
    </Alert>
    <Alert v-else-if="applicationRecord">
      <AlertTitle>Your application is under review</AlertTitle>
      <AlertDescription>You can still update your answers while PESO reviews your application.</AlertDescription>
    </Alert>
    <Alert v-else-if="isEditMode">
      <AlertTitle>Application submitted</AlertTitle>
      <AlertDescription>PESO has received your form. You can update your answers until it is reviewed.</AlertDescription>
    </Alert>

    <!-- ─── Appointment: submit DTR & Accomplishment Report ─── -->
    <Card v-if="!isLoading && currentAppointment">
      <CardHeader>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <CardTitle class="text-base">Your SPES {{ currentAppointment.spes_year }} Appointment</CardTitle>
          <Badge variant="outline">{{ currentAppointment.status }}</Badge>
        </div>
        <CardDescription>
          <template v-if="currentAppointment.status === 'Active'">
            Upload your Daily Time Record and Accomplishment Report as PDF files. PESO marks your SPES as completed once
            both are submitted.
          </template>
          <template v-else-if="currentAppointment.status === 'Completed'">
            PESO has marked your SPES appointment as completed.
          </template>
          <template v-else>Your SPES appointment has ended.</template>
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <div>
            <span class="text-xs text-muted-foreground">Assignment</span>
            <p class="text-sm font-medium">{{ formatSpesAssignment(currentAppointment) }}</p>
          </div>
          <div>
            <span class="text-xs text-muted-foreground">Period</span>
            <p class="text-sm font-medium">
              {{ formatSpesFormDate(currentAppointment.start_date) }} – {{ formatSpesFormDate(currentAppointment.end_date) }}
              <span class="text-muted-foreground">({{ currentAppointment.days_duration }} days)</span>
            </p>
          </div>
          <div>
            <span class="text-xs text-muted-foreground">Appointment Code</span>
            <p class="font-mono text-sm font-medium">{{ currentAppointment.appointment_code }}</p>
          </div>
        </div>

        <SpesCompletionReportList
          :reports="completionReports"
          :busy-type="busyReportType"
          :readonly="!canSubmitReports"
          @upload="onReportPicked"
          @remove="onReportRemoved"
        />
      </CardContent>
    </Card>

    <!-- ─── Loading ─── -->
    <div v-if="isLoading" class="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div class="space-y-4 lg:col-span-4 xl:col-span-3">
        <Skeleton v-for="i in 5" :key="i" class="h-12 w-full" />
      </div>
      <Skeleton class="h-96 w-full lg:col-span-8 xl:col-span-9" />
    </div>

    <SpesFormSteps
      v-else
      :form="form"
      :is-submitting="isSubmitting"
      :readonly="isLocked"
      :submit-label="isEditMode ? 'Save Changes' : 'Submit Application'"
      certification-label="I certify that the information I provided is true and correct, and I authorize PESO to verify it."
      @submit="submitForm"
    />
  </div>
</template>
