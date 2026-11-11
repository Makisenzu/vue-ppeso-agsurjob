<script setup lang="ts">
import { AlertCircle, ArrowLeft, Plus } from '@lucide/vue'
import SearchSelect from '@/components/SearchSelect.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSkillsDemandSkill } from '@/composables/peso/provincialPeso/useSkillsDemandSkill'

const {
  filters,
  municipalityOptions,
  supplyOptions,
  skill,
  isLoadingSkill,
  skillError,
  recommendation,
  stats,
  suppliers,
  isLoadingSuppliers,
  suppliersError,
  canPreviousSuppliers,
  canNextSuppliers,
  previousSuppliers,
  nextSuppliers,
  supplierRangeLabel,
  vacancies,
  skillTrainings,
  isLoadingEvidence,
  evidenceError,
  formatTrainingDates,
  formatDisplayDate,
  goBack,
  addTraining,
  openTraining,
} = useSkillsDemandSkill()
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0 space-y-1">
        <Button variant="ghost" size="sm" class="-ml-2 cursor-pointer" @click="goBack">
          <ArrowLeft class="size-4 shrink-0" />
          Back to Skills Demand
        </Button>
        <Skeleton v-if="isLoadingSkill && !skill" class="h-8 w-72 max-w-full" />
        <template v-else-if="skill">
          <h1 class="text-2xl font-bold tracking-tight break-words sm:text-3xl">{{ skill.skill_name }}</h1>
          <p class="text-sm text-muted-foreground">{{ skill.category }} · {{ recommendation }}</p>
        </template>
      </div>
      <Button size="sm" class="cursor-pointer self-start sm:self-auto" @click="addTraining">
        <Plus class="size-4 shrink-0" />
        Add Training for This Skill
      </Button>
    </div>

    <!-- Where and who is counted, as on Skills Demand -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-xl">
      <SearchSelect v-model="filters.municipality" :options="municipalityOptions" class="w-full" aria-label="Filter by municipality" />
      <SearchSelect v-model="filters.supply" :options="supplyOptions" class="w-full" aria-label="Who counts as supply" />
    </div>

    <Alert v-if="skillError" :variant="skill ? 'destructive' : 'default'">
      <AlertCircle />
      <AlertTitle>{{ skillError }}</AlertTitle>
      <AlertDescription>Try another municipality, or go back to Skills Demand.</AlertDescription>
    </Alert>

    <!-- ─── Demand, supply, gap ─── -->
    <dl v-if="skill" class="grid grid-cols-3 gap-4">
      <Card v-for="stat in stats" :key="stat.label" class="py-4">
        <CardContent class="px-4">
          <dt class="text-xs text-muted-foreground sm:text-sm">{{ stat.label }}</dt>
          <dd :class="['text-2xl font-bold tabular-nums', stat.alert && 'text-destructive']">{{ stat.value.toLocaleString() }}</dd>
          <dd class="truncate text-xs text-muted-foreground">{{ stat.hint }}</dd>
        </CardContent>
      </Card>
    </dl>

    <!-- ─── Supply: who has the skill ─── -->
    <Card class="gap-0 py-0">
      <CardHeader class="border-b py-4 [.border-b]:pb-4">
        <CardTitle class="text-base">Jobseekers who have it</CardTitle>
        <CardDescription>The supply, by name.</CardDescription>
      </CardHeader>
      <CardContent class="p-0">
        <Alert v-if="suppliersError" variant="destructive" class="m-4 w-auto">
          <AlertCircle />
          <AlertTitle>Couldn't load the jobseekers</AlertTitle>
          <AlertDescription>{{ suppliersError }}</AlertDescription>
        </Alert>
        <div v-else-if="isLoadingSuppliers && suppliers.length === 0" class="grid gap-2 p-4" aria-busy="true">
          <Skeleton v-for="i in 4" :key="i" class="h-10 w-full" />
        </div>
        <p v-else-if="suppliers.length === 0" class="p-8 text-center text-sm text-muted-foreground">No jobseeker has this skill yet.</p>
        <ul v-else class="divide-y border-b">
          <li v-for="person in suppliers" :key="person.applicant_id" class="flex items-center justify-between gap-3 px-4 py-2.5">
            <div class="grid min-w-0 gap-0.5">
              <span class="truncate text-sm font-medium">{{ person.full_name }}</span>
              <span class="truncate text-xs text-muted-foreground">
                {{ [person.municipality, person.employment_status].filter(Boolean).join(' · ') }}
              </span>
            </div>
            <Badge v-if="person.from_training" variant="outline" class="shrink-0 border-info/30 bg-info/10 text-info">From training</Badge>
          </li>
        </ul>

        <div class="flex flex-col-reverse gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-center text-xs text-muted-foreground tabular-nums sm:text-left sm:text-sm">{{ supplierRangeLabel }}</p>
          <div class="flex justify-center gap-2 sm:justify-end">
            <Button variant="outline" size="sm" class="cursor-pointer" :disabled="!canPreviousSuppliers || isLoadingSuppliers" @click="previousSuppliers">
              Previous
            </Button>
            <Button variant="outline" size="sm" class="cursor-pointer" :disabled="!canNextSuppliers || isLoadingSuppliers" @click="nextSuppliers">
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <Alert v-if="evidenceError" variant="destructive">
      <AlertCircle />
      <AlertTitle>Couldn't load the vacancies and trainings</AlertTitle>
      <AlertDescription>{{ evidenceError }}</AlertDescription>
    </Alert>

    <div v-else class="grid gap-6 lg:grid-cols-2">
      <!-- ─── Demand: the vacancies that require it ─── -->
      <Card class="gap-0 py-0">
        <CardHeader class="border-b py-4 [.border-b]:pb-4">
          <CardTitle class="text-base">Open vacancies that require it</CardTitle>
          <CardDescription>The demand, most slots first.</CardDescription>
        </CardHeader>
        <CardContent class="p-0">
          <div v-if="isLoadingEvidence" class="grid gap-2 p-4" aria-busy="true">
            <Skeleton v-for="i in 3" :key="i" class="h-10 w-full" />
          </div>
          <p v-else-if="vacancies.length === 0" class="p-8 text-center text-sm text-muted-foreground">No open vacancies.</p>
          <ul v-else class="divide-y">
            <li v-for="vacancy in vacancies" :key="vacancy.vacancy_id" class="flex items-center justify-between gap-3 px-4 py-2.5">
              <div class="grid min-w-0 gap-0.5">
                <span class="truncate text-sm font-medium">{{ vacancy.position_title }}</span>
                <span class="truncate text-xs text-muted-foreground">
                  {{ vacancy.employer_name }} · {{ vacancy.place }}
                  <template v-if="vacancy.valid_until"> · until {{ formatDisplayDate(vacancy.valid_until) }}</template>
                </span>
              </div>
              <span class="shrink-0 text-sm tabular-nums">{{ vacancy.slots.toLocaleString() }} slot{{ vacancy.slots === 1 ? '' : 's' }}</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <!-- ─── What has been done: trainings conducted ─── -->
      <Card class="gap-0 py-0">
        <CardHeader class="border-b py-4 [.border-b]:pb-4">
          <CardTitle class="text-base">Trainings conducted</CardTitle>
          <CardDescription>Trainings that taught this skill.</CardDescription>
        </CardHeader>
        <CardContent class="p-0">
          <div v-if="isLoadingEvidence" class="grid gap-2 p-4" aria-busy="true">
            <Skeleton v-for="i in 3" :key="i" class="h-10 w-full" />
          </div>
          <p v-else-if="skillTrainings.length === 0" class="p-8 text-center text-sm text-muted-foreground">None yet.</p>
          <ul v-else class="divide-y">
            <li v-for="training in skillTrainings" :key="training.id">
              <button
                type="button"
                class="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                @click="openTraining(training.id)"
              >
                <span class="grid min-w-0 gap-0.5">
                  <span class="truncate text-sm font-medium">{{ training.title }}</span>
                  <span class="truncate text-xs text-muted-foreground tabular-nums">{{ training.agency }} · {{ formatTrainingDates(training) }}</span>
                </span>
                <span class="shrink-0 text-sm tabular-nums">
                  {{ training.completed_count.toLocaleString() }} / {{ training.participant_count.toLocaleString() }} completed
                </span>
              </button>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
