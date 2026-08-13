<script setup lang="ts">
import MunicipalPesoSidebar from '@/components/sidebars/MunicipalPesoSidebar.vue'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { useColorMode } from '@vueuse/core'
import { Sun, Moon } from '@lucide/vue'
import CustomBreadcrumbs from '@/components/CustomBreadcrumbs.vue'

const mode = useColorMode()

function toggleTheme() {
  mode.value = mode.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <div class="w-full">
    <SidebarProvider  
      :default-open="true"
      storage-key="sidebar"
      class="flex min-h-screen"
    >
      <MunicipalPesoSidebar />
      
      <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header class="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border/40 px-3 sm:px-4 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 transition-colors duration-200">
          <SidebarTrigger class="-ml-1 text-muted-foreground" />
          <CustomBreadcrumbs/>
          <button 
            @click="toggleTheme" 
            class="ml-auto flex size-8 items-center justify-center rounded-md bg-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            title="Toggle color theme"
          >
            <component :is="mode === 'dark' ? Sun : Moon" class="size-4 shrink-0" />
          </button>
        </header>

        <div class="flex-1 p-4 sm:p-6 bg-background text-foreground transition-colors duration-200 overflow-x-hidden">
          <RouterView/>
        </div>
      </main>
    </SidebarProvider>
  </div>
</template>
