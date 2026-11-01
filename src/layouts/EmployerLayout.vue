<script setup lang="ts">
import EmployerHeader from '@/components/employer/EmployerHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
</script>

<template>
  <div class="flex min-h-screen w-full flex-col bg-background text-foreground">
    <!-- Top navigation replaces the sidebar for employers (same pattern as the applicant layout) -->
    <EmployerHeader />

    <main class="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
      <RouterView />
    </main>

    <!-- Compact footer for signed-in pages; the public pages keep LandingFooter -->
    <AppFooter />
  </div>
</template>
