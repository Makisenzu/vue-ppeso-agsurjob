<script setup lang="ts">
import { AlertCircle, ArrowLeft, Download, Eye, Loader2, Printer } from '@lucide/vue'
import SearchSelect from '@/components/SearchSelect.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useSkillsDemandCourse } from '@/composables/peso/provincialPeso/useSkillsDemandCourse'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useApplicantNsrpPreview } from '@/composables/peso/provincialPeso/useApplicantNsrpPreview'

const {
  filters,
  supplyOptions,
  course,
  isLoadingCourse,
  courseError,
  levelLabel,
  stats,
  places,
  isLoadingPlaces,
  placesError,
  placeStatus,
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
  goBack,
} = useSkillsDemandCourse()

const {
  isOpen: isNsrpOpen,
  applicant: nsrpApplicant,
  fullName: nsrpName,
  pages: nsrpPages,
  isRendering: isNsrpRendering,
  error: nsrpError,
  busy: nsrpBusy,
  open: openNsrp,
  retry: retryNsrp,
  print: printNsrp,
  download: downloadNsrp,
} = useApplicantNsrpPreview()
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header ─── -->
    <div class="min-w-0 space-y-1">
      <Button variant="ghost" size="sm" class="-ml-2 cursor-pointer" @click="goBack">
        <ArrowLeft class="size-4 shrink-0" />
        Back to Skills Demand
      </Button>
      <Skeleton v-if="isLoadingCourse && !course" class="h-8 w-72 max-w-full" />
      <template v-else-if="course">
        <h1 class="text-2xl font-bold tracking-tight break-words sm:text-3xl">{{ course.course }}</h1>
        <p class="text-sm text-muted-foreground">{{ levelLabel }}</p>
      </template>
    </div>

    <!-- Who is counted, as on Skills Demand -->
    <SearchSelect v-model="filters.supply" :options="supplyOptions" class="w-full sm:w-64" aria-label="Who counts as supply" />

    <Alert v-if="courseError" :variant="course ? 'destructive' : 'default'">
      <AlertCircle />
      <AlertTitle>{{ courseError }}</AlertTitle>
      <AlertDescription>Go back to Skills Demand to pick another course.</AlertDescription>
    </Alert>

    <!-- ─── Demand, supply, gap ─── -->
    <dl v-if="course" class="grid grid-cols-3 gap-4">
      <Card v-for="stat in stats" :key="stat.label" class="py-4">
        <CardContent class="px-4">
          <dt class="text-xs text-muted-foreground sm:text-sm">{{ stat.label }}</dt>
          <dd :class="['text-2xl font-bold tabular-nums', stat.alert && 'text-destructive']">{{ stat.value.toLocaleString() }}</dd>
          <dd class="truncate text-xs text-muted-foreground">{{ stat.hint }}</dd>
        </CardContent>
      </Card>
    </dl>

    <!-- ─── By municipality ─── -->
    <section class="grid gap-3">
      <h2 class="text-base font-semibold">By municipality</h2>
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
          <p v-else-if="places.length === 0" class="p-8 text-center text-sm text-muted-foreground">No municipality needs or has this course.</p>
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
                      Demand {{ place.demand.toLocaleString() }} · Supply {{ place.supply.toLocaleString() }} · Surplus
                      {{ place.surplus.toLocaleString() }}
                    </span>
                  </span>
                  <Badge
                    variant="outline"
                    :class="[
                      'shrink-0',
                      placeStatus(place).tone === 'gap' && 'border-destructive/30 bg-destructive/10 text-destructive',
                      placeStatus(place).tone === 'surplus' && 'border-success/30 bg-success/10 text-success',
                    ]"
                  >
                    {{ placeStatus(place).label }}
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
                    <TableCell class="text-right tabular-nums">{{ place.supply.toLocaleString() }}</TableCell>
                    <TableCell :class="['text-right tabular-nums', place.surplus > 0 ? 'font-semibold text-success' : 'text-muted-foreground']">
                      {{ place.surplus.toLocaleString() }}
                    </TableCell>
                    <TableCell class="text-right">
                      <Badge
                        variant="outline"
                        :class="[
                          placeStatus(place).tone === 'gap' && 'border-destructive/30 bg-destructive/10 text-destructive',
                          placeStatus(place).tone === 'surplus' && 'border-success/30 bg-success/10 text-success',
                        ]"
                      >
                        {{ placeStatus(place).label }}
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

    <!-- ─── Supply: who has the course ─── -->
    <section class="grid gap-3">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 class="text-base font-semibold">Jobseekers who have it</h2>
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
          <p v-else-if="suppliers.length === 0" class="p-8 text-center text-sm text-muted-foreground">No jobseeker here has this course.</p>
          <template v-else>
            <!-- Mobile: one line per person -->
            <ul class="divide-y border-b md:hidden">
              <li v-for="person in suppliers" :key="person.applicant_id">
                <button
                  type="button"
                  class="grid w-full cursor-pointer gap-0.5 px-4 py-2.5 text-left hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  @click="openNsrp(person.applicant_id)"
                >
                  <span class="truncate text-sm font-medium">
                    {{ person.surname }}, {{ [person.first_name, person.middle_name, person.suffix].filter(Boolean).join(' ') }}
                  </span>
                  <span class="truncate text-xs text-muted-foreground">
                    {{ [person.contact_number, person.email, person.municipality].filter(Boolean).join(' · ') || '—' }}
                  </span>
                </button>
              </li>
            </ul>

            <!-- Desktop: table -->
            <div class="hidden overflow-x-auto border-b md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Last Name</TableHead>
                    <TableHead>First Name</TableHead>
                    <TableHead>Middle Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Municipality</TableHead>
                    <TableHead class="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="person in suppliers" :key="person.applicant_id" class="cursor-pointer" @click="openNsrp(person.applicant_id)">
                    <TableCell class="font-medium">{{ person.surname }}</TableCell>
                    <TableCell>{{ [person.first_name, person.suffix].filter(Boolean).join(' ') }}</TableCell>
                    <TableCell>{{ person.middle_name ?? '—' }}</TableCell>
                    <TableCell class="whitespace-nowrap tabular-nums">{{ person.contact_number ?? '—' }}</TableCell>
                    <TableCell>
                      <span class="block max-w-[240px] truncate" :title="person.email ?? undefined">{{ person.email ?? '—' }}</span>
                    </TableCell>
                    <TableCell>{{ person.municipality ?? '—' }}</TableCell>
                    <TableCell class="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        class="size-8 cursor-pointer"
                        title="View NSRP form"
                        aria-label="View NSRP form"
                        @click.stop="openNsrp(person.applicant_id)"
                      >
                        <Eye class="size-4 shrink-0" />
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </template>

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

    <!-- ─── A jobseeker's NSRP Form 1, as it prints ─── -->
    <Dialog v-model:open="isNsrpOpen">
      <DialogContent class="flex max-h-[90vh] flex-col sm:max-w-5xl">
        <DialogHeader class="shrink-0">
          <div class="flex items-center justify-between gap-2 pr-8">
            <DialogTitle>NSRP Form 1</DialogTitle>
            <div class="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                class="size-8 cursor-pointer"
                title="Print"
                aria-label="Print"
                :disabled="!!nsrpBusy || !nsrpApplicant || nsrpPages.length === 0"
                @click="printNsrp"
              >
                <Loader2 v-if="nsrpBusy === 'print'" class="size-4 shrink-0 animate-spin" />
                <Printer v-else class="size-4 shrink-0" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                class="size-8 cursor-pointer"
                title="Download PDF"
                aria-label="Download PDF"
                :disabled="!!nsrpBusy || !nsrpApplicant || nsrpPages.length === 0"
                @click="downloadNsrp"
              >
                <Loader2 v-if="nsrpBusy === 'download'" class="size-4 shrink-0 animate-spin" />
                <Download v-else class="size-4 shrink-0" />
              </Button>
            </div>
          </div>
          <DialogDescription>{{ nsrpName || 'Loading the jobseeker...' }}</DialogDescription>
        </DialogHeader>

        <!-- The pages the PDF has; only this part scrolls, so the buttons stay in view -->
        <div class="grid min-h-0 gap-4 overflow-y-auto">
          <Alert v-if="nsrpError" variant="destructive">
            <AlertCircle />
            <AlertTitle>Couldn't show the NSRP form</AlertTitle>
            <AlertDescription>
              {{ nsrpError }}
              <Button variant="link" size="sm" class="h-auto cursor-pointer p-0" @click="retryNsrp">Try again</Button>
            </AlertDescription>
          </Alert>
          <Skeleton v-else-if="isNsrpRendering || nsrpPages.length === 0" class="aspect-[210/297] w-full rounded-md" />
          <div v-else class="overflow-x-auto rounded-md border bg-muted/40 p-2 sm:p-4">
            <div class="mx-auto grid max-w-[860px] min-w-[600px] gap-4">
              <img
                v-for="(page, index) in nsrpPages"
                :key="index"
                :src="page"
                :alt="`NSRP Form 1 of ${nsrpName}, page ${index + 1} of ${nsrpPages.length}`"
                class="block h-auto w-full border bg-white shadow-sm"
              >
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
