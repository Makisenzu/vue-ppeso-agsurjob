<script setup lang="ts">
import EmployerHeader from '@/components/employer/EmployerHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
</script>

<template>
  <div class="flex min-h-screen w-full flex-col bg-background text-foreground">
    <!-- Top navigation replaces the sidebar for employers (same pattern as the applicant layout) -->
    <EmployerHeader />

    <!-- fullWidth pages (the Job Fairs pages) bring their own section padding -->
    <main class="w-full flex-1" :class="{ 'mx-auto max-w-7xl p-4 sm:p-6': !$route.meta.fullWidth }">
      <RouterView />
    </main>

    <!-- Compact footer for signed-in pages; the public pages keep LandingFooter -->
    <AppFooter />
  </div>
</template>
