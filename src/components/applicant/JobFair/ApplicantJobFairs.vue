<script setup lang="ts">
import JobFairsLanding from '@/components/JobFairsLanding.vue'
import { useApplicantJobFairs } from '@/composables/applicant/useApplicantJobFairs'

const { hero, about, facts, steps, scopeModel, searchInput, hasSearch, clearSearch, cards, isLoading, errorMessage, reload } = useApplicantJobFairs()
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
