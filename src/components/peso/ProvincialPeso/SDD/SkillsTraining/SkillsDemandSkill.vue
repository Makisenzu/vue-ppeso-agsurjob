<script setup lang="ts">
import { AlertCircle, ArrowLeft, Plus } from '@lucide/vue'
import SearchSelect from '@/components/SearchSelect.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useSkillsDemandSkill } from '@/composables/peso/provincialPeso/useSkillsDemandSkill'

const {
  filters,
  supplyOptions,
  skill,
  isLoadingSkill,
  skillError,
  recommendation,
  stats,
  places,
  isLoadingPlaces,
  placesError,
  placeAction,
  showPlaceSuppliers,
  suppliers,
  supplierMunicipality,
  supplierMunicipalityOptions,
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

    <!-- Who is counted, as on Skills Demand -->
    <SearchSelect v-model="filters.supply" :options="supplyOptions" class="w-full sm:w-64" aria-label="Who counts as supply" />

    <Alert v-if="skillError" :variant="skill ? 'destructive' : 'default'">
      <AlertCircle />
      <AlertTitle>{{ skillError }}</AlertTitle>
      <AlertDescription>Go back to Skills Demand to pick another skill.</AlertDescription>
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

    <!-- ─── By municipality: where it is short, where people could come from ─── -->
    <section class="grid gap-3">
      <div class="space-y-1">
        <h2 class="text-base font-semibold">By municipality</h2>
      </div>
    <Card class="gap-0 overflow-hidden py-0">
      <CardContent class="p-0">
        <Alert v-if="placesError" variant="destructive" class="m-4 w-auto">
          <AlertCircle />
          <AlertTitle>Couldn't load the municipalities</AlertTitle>
          <AlertDescription>{{ placesError }}</AlertDescription>
        </Alert>
        <div v-else-if="isLoadingPlaces && places.length === 0" class="grid gap-2 p-4" aria-busy="true">
          <Skeleton v-for="i in 4" :key="i" class="h-10 w-full" />
        </div>
        <p v-else-if="places.length === 0" class="p-8 text-center text-sm text-muted-foreground">No municipality needs or has this skill.</p>
        <template v-else>
          <!-- Mobile: one line per municipality -->
          <ul class="divide-y md:hidden">
            <li v-for="place in places" :key="place.place_key">
              <button
                type="button"
                class="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                @click="showPlaceSuppliers(place)"
              >
                <span class="grid min-w-0 gap-0.5">
                  <span class="truncate text-sm font-medium">{{ place.place }}</span>
                  <span class="text-xs text-muted-foreground tabular-nums">
                    Demand {{ place.demand.toLocaleString() }} · Supply {{ (place.supply + place.trained).toLocaleString() }}
                  </span>
                </span>
                <Badge
                  variant="outline"
                  :class="[
                    'shrink-0',
                    placeAction(place).tone === 'gap' && 'border-destructive/30 bg-destructive/10 text-destructive',
                    placeAction(place).tone === 'surplus' && 'border-success/30 bg-success/10 text-success',
                  ]"
                >
                  {{ placeAction(place).label }}
                </Badge>
              </button>
            </li>
          </ul>

          <!-- Desktop: table; a row lists that municipality's jobseekers below -->
          <div class="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Municipality</TableHead>
                  <TableHead class="text-right">Demand</TableHead>
                  <TableHead class="text-right">Supply</TableHead>
                  <TableHead class="text-right">Gap</TableHead>
                  <TableHead class="text-right">Surplus</TableHead>
                  <TableHead class="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="place in places"
                  :key="place.place_key"
                  class="cursor-pointer"
                  :data-state="supplierMunicipality === place.place ? 'selected' : undefined"
                  @click="showPlaceSuppliers(place)"
                >
                  <TableCell class="font-medium">{{ place.place }}</TableCell>
                  <TableCell class="text-right tabular-nums">
                    {{ place.demand.toLocaleString() }}
                    <span v-if="place.vacancies" class="ml-1 text-xs text-muted-foreground">
                      ({{ place.vacancies }} vacanc{{ place.vacancies === 1 ? 'y' : 'ies' }})
                    </span>
                  </TableCell>
                  <TableCell class="text-right tabular-nums">{{ (place.supply + place.trained).toLocaleString() }}</TableCell>
                  <TableCell :class="['text-right tabular-nums', place.gap > 0 ? 'font-semibold text-destructive' : 'text-muted-foreground']">
                    {{ place.gap.toLocaleString() }}
                  </TableCell>
                  <TableCell :class="['text-right tabular-nums', place.surplus > 0 ? 'font-semibold text-success' : 'text-muted-foreground']">
                    {{ place.surplus.toLocaleString() }}
                  </TableCell>
                  <TableCell class="text-right">
                    <Badge
                      variant="outline"
                      :class="[
                        placeAction(place).tone === 'gap' && 'border-destructive/30 bg-destructive/10 text-destructive',
                        placeAction(place).tone === 'surplus' && 'border-success/30 bg-success/10 text-success',
                      ]"
                    >
                      {{ placeAction(place).label }}
                    </Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </template>
      </CardContent>
    </Card>
    </section>

    <!-- ─── Supply: who has the skill ─── -->
    <section class="grid gap-3">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div class="space-y-1">
          <h2 class="text-base font-semibold">Jobseekers who have it</h2>
        </div>
        <SearchSelect
          v-model="supplierMunicipality"
          :options="supplierMunicipalityOptions"
          class="w-full sm:w-60"
          aria-label="Jobseekers from which municipality"
        />
      </div>
    <Card class="gap-0 overflow-hidden py-0">
      <CardContent class="p-0">
        <Alert v-if="suppliersError" variant="destructive" class="m-4 w-auto">
          <AlertCircle />
          <AlertTitle>Couldn't load the jobseekers</AlertTitle>
          <AlertDescription>{{ suppliersError }}</AlertDescription>
        </Alert>
        <div v-else-if="isLoadingSuppliers && suppliers.length === 0" class="grid gap-2 p-4" aria-busy="true">
          <Skeleton v-for="i in 4" :key="i" class="h-10 w-full" />
        </div>
        <p v-else-if="suppliers.length === 0" class="p-8 text-center text-sm text-muted-foreground">No jobseeker here has this skill.</p>
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
    </section>

    <Alert v-if="evidenceError" variant="destructive">
      <AlertCircle />
      <AlertTitle>Couldn't load the vacancies and trainings</AlertTitle>
      <AlertDescription>{{ evidenceError }}</AlertDescription>
    </Alert>

    <div v-else class="grid gap-6 lg:grid-cols-2">
      <!-- ─── Demand: the vacancies that require it ─── -->
      <section class="grid content-start gap-3">
        <div class="space-y-1">
          <h2 class="text-base font-semibold">Open vacancies that require it</h2>
        </div>
      <Card class="gap-0 overflow-hidden py-0">
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
      </section>

      <!-- ─── What has been done: trainings conducted ─── -->
      <section class="grid content-start gap-3">
        <div class="space-y-1">
          <h2 class="text-base font-semibold">Trainings conducted</h2>
        </div>
      <Card class="gap-0 overflow-hidden py-0">
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
      </section>
    </div>
  </div>
</template>
