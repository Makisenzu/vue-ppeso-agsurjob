<script setup lang="ts">
import ApplicantHeader from '@/components/applicant/ApplicantHeader.vue'
import LandingFooter from '@/components/landing/LandingFooter.vue'
import { usePrefetchApplicantPages } from '@/composables/applicant/useApplicantNavigation'

usePrefetchApplicantPages()
</script>

<template>
  <div class="flex min-h-screen w-full flex-col bg-background text-foreground">
    <!-- Top navigation replaces the sidebar for applicants (same pattern as the landing page header) -->
    <ApplicantHeader />

    <!-- fullWidth pages (home and the About pages) bring their own section padding -->
    <main class="w-full flex-1" :class="{ 'mx-auto max-w-7xl p-4 sm:p-6': !$route.meta.fullWidth }">
      <RouterView />
    </main>

    <!-- Same footer as the public pages -->
    <LandingFooter />
  </div>
</template>
