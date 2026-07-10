<script setup lang="ts">
import Aurora from '@/components/Aurora.vue'
import { onMounted, onUnmounted } from 'vue'
import { useColorMode } from '@vueuse/core'

const mode = useColorMode()
let previousMode: string

onMounted(() => {
  previousMode = mode.value
  mode.value = 'light'
})

onUnmounted(() => {
  mode.value = previousMode as 'light' | 'dark'
})
</script>

<template>
  <div class="relative min-h-screen overflow-hidden">
    <!-- Aurora Background -->
    <Aurora
      class="absolute inset-0"
      :color-stops="['#4000f2', '#c00008', '#4000f2']"
      :blend="0.5"
      :amplitude="1.0"
      :speed="1"
    />

    <!-- Optional dark overlay -->
    <div class="absolute inset-0 bg-black/10"></div>

    <!-- Login Card -->
    <div class="relative z-10 flex min-h-screen items-center justify-center p-6">
      <slot />
    </div>
  </div>
</template>