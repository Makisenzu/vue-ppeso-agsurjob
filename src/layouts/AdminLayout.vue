<script setup lang="ts">
import AppSidebar from '@/components/AppSidebar.vue'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { useColorMode } from '@vueuse/core'
import { Sun, Moon } from '@lucide/vue'

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
      <AppSidebar />
      
      <main class="flex-1 flex flex-col">
        <header class="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border/40 px-4 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 transition-colors duration-200">
          <SidebarTrigger class="-ml-1 text-muted-foreground" />
          <span class="text-sm font-semibold text-muted-foreground px-2">Admin Panel</span>

          <button 
            @click="toggleTheme" 
            class="ml-auto flex size-8 items-center justify-center rounded-md bg-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            title="Toggle color theme"
          >
            <component :is="mode === 'dark' ? Sun : Moon" class="size-4 shrink-0" />
          </button>
        </header>

        <div class="flex-1 p-6 bg-background text-foreground transition-colors duration-200">
          <RouterView/>
        </div>
      </main>
    </SidebarProvider>
  </div>
</template>
