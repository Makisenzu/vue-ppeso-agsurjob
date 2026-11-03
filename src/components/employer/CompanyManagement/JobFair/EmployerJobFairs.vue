<script setup lang="ts">
import JobFairsLanding from '@/components/JobFairsLanding.vue'
import { useEmployerJobFairs } from '@/composables/employer/useEmployerJobFairs'

const { hero, about, facts, steps, scopeModel, searchInput, hasSearch, clearSearch, cards, isLoading, errorMessage, reload } = useEmployerJobFairs()
</script>

<template>
  <JobFairsLanding
    v-model:scope="scopeModel"
    v-model:search="searchInput"
    :hero="hero"
    :about="about"
    :facts="facts"
    :steps="steps"
    :cards="cards"
    :is-loading="isLoading"
    :error-message="errorMessage"
    :has-search="hasSearch"
    @reload="reload"
    @clear-search="clearSearch"
  />
</template>
