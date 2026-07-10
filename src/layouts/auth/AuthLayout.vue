<script setup lang="ts">
import Aurora from '@/components/Aurora.vue'
import Plasma from '@/components/Plasma.vue'
import { RouterView } from 'vue-router'
import { onMounted, onUnmounted } from 'vue'
import { useColorMode } from '@vueuse/core'

const mode = useColorMode()
let previousMode: string

onMounted(() => {
  previousMode = mode.value
  mode.value = 'light'

  // Prevent white flash during auth route transitions by giving
  // the body a dark backdrop that matches the Aurora background.
  document.body.style.backgroundColor = '#0e0014'
})

onUnmounted(() => {
  mode.value = previousMode as 'light' | 'dark'

  // Restore the default body background when leaving auth pages.
  document.body.style.backgroundColor = ''
})
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
    <div class="relative z-10 flex min-h-screen items-center justify-center p-6">
      <RouterView v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </div>
  </div>
</template>