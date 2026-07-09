<script setup lang="ts">
import { RouterView } from 'vue-router'
import ToastAlert from '@/components/ToastAlert.vue'
</script>

<template>
  <RouterView v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </RouterView>
  <ToastAlert />
</template>