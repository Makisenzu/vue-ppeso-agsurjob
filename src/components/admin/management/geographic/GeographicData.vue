<script setup lang="ts">
import MapboxMap from './MapboxMap.vue'
</script>

<template>
  <!-- 1. Height constrained to available viewport height -->
  <div class="flex h-[calc(100vh-7.5rem)] flex-col gap-4">
    <!-- Header section -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Geographic Data</h1>
        <p class="text-sm text-muted-foreground">
          View and manage geographic data for geographic locations.
        </p>
      </div>
    </div>

    <!-- 2. Map wrapper configured to grow and occupy all remaining bottom height -->
    <div class="min-h-0 w-full flex-1">
      <MapboxMap height-class="h-full" />
    </div>
  </div>
</template>