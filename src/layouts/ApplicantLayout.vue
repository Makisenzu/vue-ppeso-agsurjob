<script setup lang="ts">
import ApplicantHeader from '@/components/applicant/ApplicantHeader.vue'
import { usePrefetchApplicantPages } from '@/composables/applicant/useApplicantNavigation'

usePrefetchApplicantPages()
</script>

<template>
  <div class="flex min-h-screen w-full flex-col bg-background text-foreground">
    <!-- Top navigation replaces the sidebar for applicants (same pattern as the landing page header) -->
    <ApplicantHeader />

    <main class="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
      <RouterView />
    </main>
  </div>
</template>
