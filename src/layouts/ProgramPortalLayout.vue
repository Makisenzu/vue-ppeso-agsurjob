<script setup lang="ts">
import { Moon, Sun } from '@lucide/vue'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import ProgramPortalSidebar from '@/components/sidebars/ProgramPortalSidebar.vue'
import CustomBreadcrumbs from '@/components/CustomBreadcrumbs.vue'
import NotificationBell from '@/components/NotificationBell.vue'
import { useProgramPortalLayout } from '@/composables/applicant/useProgramPortal'

const { isDark, isFullWidth, toggleTheme } = useProgramPortalLayout()
</script>

<template>
  <!-- Applicant program portal (GIP for now): opened from "View my application", with its own sidebar instead of ApplicantHeader. DESIGN.md §7.1 -->
  <div class="w-full">
    <SidebarProvider :default-open="true" storage-key="program-sidebar" class="flex min-h-screen">
      <ProgramPortalSidebar />

      <SidebarInset class="flex min-w-0 flex-1 flex-col">
        <header
          class="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border/40 bg-background/95 px-3 backdrop-blur transition-colors duration-200 supports-backdrop-filter:bg-background/60 sm:px-4"
        >
          <SidebarTrigger class="-ml-1 text-muted-foreground" />
          <CustomBreadcrumbs />
          <div class="ml-auto">
            <NotificationBell :to="{ name: 'notification' }" />
          </div>
          <button
            type="button"
            class="flex size-8 cursor-pointer items-center justify-center rounded-md bg-transparent text-muted-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
            title="Toggle color theme"
            aria-label="Toggle color theme"
            @click="toggleTheme"
          >
            <component :is="isDark ? Sun : Moon" class="size-4 shrink-0" />
          </button>
        </header>

        <div
          class="flex-1 overflow-x-hidden bg-background text-foreground transition-colors duration-200"
          :class="{ 'p-4 sm:p-6': !isFullWidth }"
        >
          <RouterView />
        </div>
      </SidebarInset>
    </SidebarProvider>
  </div>
</template>
