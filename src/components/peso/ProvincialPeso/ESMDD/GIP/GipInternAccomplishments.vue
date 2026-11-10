<script setup lang="ts">
import { toRef } from 'vue'
import { Check, ChevronDown, Download, Eye, FileDown, Loader2, Printer, RefreshCw, Undo2 } from '@lucide/vue'
import GipAccomplishmentDays from '@/components/GipAccomplishmentDays.vue'
import GipAccomplishmentActivities from '@/components/GipAccomplishmentActivities.vue'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { GipInternRecord } from '@/types/peso/provincialPeso/gip'
import { useGipInternAccomplishments } from '@/composables/peso/provincialPeso/useGipInternAccomplishments'

const props = defineProps<{ intern: GipInternRecord | null }>()

const {
  termGroups,
  pendingCount,
  draftCount,
  isLoading,
  hasError,
  reload,
  openIds,
  toggleOpen,
  downloadingId,
  viewFile,
  downloadFile,
  generatingId,
  generateReport,
  reviewingId,
  markReviewed,
  reportToReturn,
  returnRemarks,
  returnRemarksError,
  openReturn,
  closeReturn,
  confirmReturn,
  badgeClass,
  formatPeriod,
  formatDate,
  formatSize,
  formatPesoAmount,
} = useGipInternAccomplishments(toRef(props, 'intern'))
</script>

<template>
  <Card class="min-w-0">
    <CardHeader>
      <CardTitle class="flex items-center gap-2 text-base">
        Accomplishments
        <Badge v-if="pendingCount > 0" variant="outline" :class="badgeClass.Submitted">{{ pendingCount }} to review</Badge>
      </CardTitle>
      <CardDescription>
        Half-month reports from the GIP portal: DOLE interns write what they did each day; PGAS interns list their
        activities and their pay for the half.
      </CardDescription>
      <CardAction>
        <Button variant="ghost" size="icon-sm" class="cursor-pointer" aria-label="Refresh reports" title="Refresh" :disabled="isLoading" @click="reload">
          <RefreshCw :class="['size-4', isLoading && 'animate-spin']" />
        </Button>
      </CardAction>
    </CardHeader>

    <CardContent class="grid gap-4">
      <div v-if="isLoading && !termGroups.length" class="grid gap-2">
        <Skeleton v-for="n in 2" :key="n" class="h-24 w-full" />
      </div>

      <p v-else-if="hasError" class="text-sm text-destructive">
        The reports could not be loaded. Use refresh to try again.
      </p>

      <p v-else-if="!termGroups.length" class="text-sm text-muted-foreground">No accomplishment reports submitted yet.</p>

      <div v-for="group in termGroups" v-else :key="group.term.id" class="grid gap-2">
        <p class="text-sm font-medium text-muted-foreground">
          Term {{ group.term.termNumber }} · {{ group.term.program }} · {{ formatPeriod(group.term.startDate, group.term.endDate) }}
        </p>

        <ul class="divide-y rounded-lg border">
          <li v-for="report in group.reports" :key="report.id" class="grid gap-2 px-4 py-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-sm font-semibold">{{ formatPeriod(report.period_start, report.period_end) }}</p>
              <Badge variant="outline" :class="badgeClass[report.status]">{{ report.status }}</Badge>
            </div>

            <!-- What the form carries, at a glance -->
            <p class="text-xs text-muted-foreground">
              <template v-if="report.program === 'DOLE'">
                {{ report.daily_entries.length }} daily entr{{ report.daily_entries.length === 1 ? 'y' : 'ies' }}
              </template>
              <template v-else>
                {{ report.activities.length }} activit{{ report.activities.length === 1 ? 'y' : 'ies' }}
                <template v-if="report.amount != null"> · Pay ₱{{ formatPesoAmount(report.amount) }}</template>
              </template>
              <template v-if="report.supervisor_name"> · Supervisor: {{ report.supervisor_name }}</template>
            </p>

            <p v-if="report.program === 'PGAS' && report.amount_in_words" class="text-xs text-muted-foreground uppercase">
              {{ report.amount_in_words }}
            </p>

            <template v-if="report.activities.length || report.daily_entries.length">
              <Button
                variant="link"
                size="sm"
                class="h-auto w-fit cursor-pointer p-0 text-muted-foreground"
                :aria-expanded="openIds.has(report.id)"
                @click="toggleOpen(report.id)"
              >
                {{ openIds.has(report.id) ? 'Hide report' : 'Show report' }}
                <ChevronDown :class="['size-4 transition-transform', openIds.has(report.id) && 'rotate-180']" />
              </Button>
              <div v-if="openIds.has(report.id)" class="grid gap-3">
                <GipAccomplishmentActivities v-if="report.activities.length" :activities="report.activities" />
                <GipAccomplishmentDays v-if="report.daily_entries.length" :days="report.daily_entries" />
              </div>
            </template>

            <div v-if="report.status === 'Returned' && report.review_remarks" class="border-l-2 border-warning pl-3">
              <p class="text-xs font-semibold text-warning uppercase">Your remarks</p>
              <p class="text-sm text-pretty">{{ report.review_remarks }}</p>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-xs text-muted-foreground">
                Submitted {{ formatDate(report.submitted_at) }}
                <template v-if="report.reviewed_at"> · {{ report.status }} {{ formatDate(report.reviewed_at) }}</template>
              </p>

              <div class="flex flex-wrap items-center gap-1">
                <!-- The official form -->
                <Button
                  variant="ghost"
                  size="icon-sm"
                  class="cursor-pointer"
                  aria-label="Download the report form as PDF"
                  title="Download form (PDF)"
                  :disabled="generatingId !== null"
                  @click="generateReport(report, 'download')"
                >
                  <Loader2 v-if="generatingId === report.id" class="size-4 animate-spin" />
                  <FileDown v-else class="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  class="cursor-pointer"
                  aria-label="Print the report form"
                  title="Print form"
                  :disabled="generatingId !== null"
                  @click="generateReport(report, 'print')"
                >
                  <Printer class="size-4" />
                </Button>

                <!-- The signed copy the intern attached -->
                <template v-if="report.file_path">
                  <Button
                    variant="ghost"
                    size="sm"
                    class="cursor-pointer"
                    :title="report.file_name ?? undefined"
                    @click="viewFile(report)"
                  >
                    <Eye class="size-4" /> Signed copy<template v-if="report.file_size != null"> · {{ formatSize(report.file_size) }}</template>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    class="cursor-pointer"
                    aria-label="Download the signed copy"
                    title="Download signed copy"
                    :disabled="downloadingId !== null"
                    @click="downloadFile(report)"
                  >
                    <Loader2 v-if="downloadingId === report.id" class="size-4 animate-spin" />
                    <Download v-else class="size-4" />
                  </Button>
                </template>

                <template v-if="report.status === 'Submitted'">
                  <Button variant="outline" size="sm" class="cursor-pointer" :disabled="reviewingId !== null" @click="openReturn(report)">
                    <Undo2 class="size-4" /> Return
                  </Button>
                  <Button size="sm" class="cursor-pointer" :disabled="reviewingId !== null" @click="markReviewed(report)">
                    <Loader2 v-if="reviewingId === report.id" class="size-4 animate-spin" />
                    <Check v-else class="size-4" />
                    Mark reviewed
                  </Button>
                </template>
              </div>
            </div>
          </li>
        </ul>
      </div>

      <p v-if="draftCount > 0 && !hasError" class="text-xs text-muted-foreground">
        {{ draftCount }} report{{ draftCount > 1 ? 's are' : ' is' }} still a draft; it shows here once the intern submits it.
      </p>
    </CardContent>
  </Card>

  <!-- ─── Return with remarks (short form → Dialog, DESIGN.md §5.1) ─── -->
  <Dialog :open="!!reportToReturn" @update:open="(open) => { if (!open) closeReturn() }">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Return report</DialogTitle>
        <DialogDescription>
          {{ reportToReturn ? formatPeriod(reportToReturn.period_start, reportToReturn.period_end) : '' }} ·
          the intern sees your remarks, updates the report and submits it again.
        </DialogDescription>
      </DialogHeader>
      <div class="grid gap-2">
        <Label for="returnRemarks">Remarks</Label>
        <Textarea
          id="returnRemarks"
          v-model="returnRemarks"
          rows="4"
          placeholder="e.g. Please complete the entries for 08/12 and 08/13, and correct the amount."
          :aria-invalid="!!returnRemarksError"
          :disabled="reviewingId !== null"
        />
        <p v-if="returnRemarksError" class="text-sm text-destructive">{{ returnRemarksError }}</p>
      </div>
      <DialogFooter>
        <Button variant="outline" class="cursor-pointer" :disabled="reviewingId !== null" @click="closeReturn">Cancel</Button>
        <Button class="cursor-pointer" :disabled="reviewingId !== null" @click="confirmReturn">
          <Loader2 v-if="reviewingId !== null" class="size-4 animate-spin" />
          {{ reviewingId !== null ? 'Returning...' : 'Return report' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
