<script setup lang="ts">
import { RouterView } from 'vue-router'
import ApplicantLayout from '@/layouts/ApplicantLayout.vue'
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <component :is="route.meta.layout === 'applicant' ? ApplicantLayout : 'div'">
      <transition name="fade" mode="out-in">
        <component :is="Component" :key="route.path" />
      </transition>
    </component>
  </RouterView>
</template>