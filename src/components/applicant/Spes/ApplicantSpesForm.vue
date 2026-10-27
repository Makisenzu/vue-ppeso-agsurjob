<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import SpesFormSteps from '@/components/SpesFormSteps.vue'
import { useSpesFormEntry } from '@/composables/applicant/useSpesFormEntry'

const { form, backLink, isLoading, isSubmitting, errorMessage, reload, saveDetails } = useSpesFormEntry()
</script>

<template>
  <div class="flex flex-col gap-6 pb-16">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-4">
      <RouterLink
        :to="backLink"
        class="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft class="size-4" /> SPES Application
      </RouterLink>
      <div class="flex flex-col gap-1">
        <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">My SPES Details</h1>
        <p class="text-sm text-pretty text-muted-foreground">Used for this and your future SPES applications.</p>
      </div>
    </div>

    <Alert v-if="errorMessage" variant="destructive">
      <AlertTitle>Your SPES details could not be loaded</AlertTitle>
      <AlertDescription class="flex flex-col items-start gap-2">
        {{ errorMessage }}
        <Button type="button" variant="outline" size="sm" @click="reload">Try again</Button>
      </AlertDescription>
    </Alert>

    <div v-else-if="isLoading" class="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div class="space-y-4 lg:col-span-4 xl:col-span-3">
        <Skeleton v-for="i in 5" :key="i" class="h-12 w-full" />
      </div>
      <Skeleton class="h-96 w-full lg:col-span-8 xl:col-span-9" />
    </div>

    <SpesFormSteps
      v-else
      :form="form"
      :is-submitting="isSubmitting"
      submit-label="Save details"
      submitting-label="Saving..."
      certification-label="I certify that the information I provided is true and correct, and I authorize PESO to verify it."
      @submit="saveDetails"
    />
  </div>
</template>
