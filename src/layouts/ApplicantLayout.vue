<script setup lang="ts">
import AppSidebar from '@/components/AppSidebar.vue'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
</script>

<template>
  <div class="w-full">
    <SidebarProvider  
      :default-open="true"
      storage-key="sidebar"
      class="flex min-h-screen"
    >
      <AppSidebar />
      <main class="flex-1">
        <SidebarTrigger />
        <slot />
      </main>
    </SidebarProvider>
  </div>
</template>