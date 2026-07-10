<script setup lang="ts">
import Plasma from '@/components/Plasma.vue'
import { RouterView } from 'vue-router'
import { onMounted, onUnmounted } from 'vue'
import { useColorMode } from '@vueuse/core'
import { Sun, Moon } from '@lucide/vue'

const mode = useColorMode()
let previousMode: string

onMounted(() => {
  previousMode = mode.value
  mode.value = 'light'
  document.body.style.backgroundColor = '#0e0014'
})

onUnmounted(() => {
  mode.value = previousMode as 'light' | 'dark'
  document.body.style.backgroundColor = ''
})

function toggleTheme() {
  mode.value = mode.value === 'dark' ? 'light' : 'dark'
}


</script>

<template>
  <div class="relative min-h-screen overflow-hidden">
    <!-- Aurora Background -->
    <!-- <Aurora
      class="absolute inset-0"
      :color-stops="['#4000f2', '#c00008', '#4000f2']"
      :blend="0.5"
      :amplitude="1.0"
      :speed="1"
    /> -->
    <Plasma
      class="absolute inset-0"
      :colors="['#070074', '#a60000']"
      :speed1="0.05"
      :speed2="0.05"
      :focal-length="0.8"
      :bend1="1"
      :bend2="0.5"
      :dir2="1.0"
      :rotation-deg="0"
    />

    <!-- Optional dark overlay -->
    <div class="absolute inset-0 bg-black/10"></div>

    <!-- Auth Card (swapped via nested RouterView) -->
      <button 
        @click="toggleTheme" 
        class="absolute top-4 right-4 z-50 flex size-8 items-center justify-center rounded-md bg-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        title="Toggle color theme"
      >
        <component :is="mode === 'dark' ? Sun : Moon" class="size-4 shrink-0 text-white" />
      </button>
    <div class="relative z-10 flex min-h-screen items-center justify-center p-6">
      <RouterView v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </div>
  </div>
</template>