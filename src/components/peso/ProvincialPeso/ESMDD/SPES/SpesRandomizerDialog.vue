<script setup lang="ts">
import { Dices, Loader2, RefreshCw } from '@lucide/vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useSpesDraw } from '@/composables/peso/provincialPeso/useSpesDraw'

/**
 * Randomizer draw of SPES applicants per municipality (wheel or instant draw). The drawn
 * applicants are approved on confirmation and then appointed from the SPES dashboard.
 */
const {
  isDrawOpen,
  isLoadingDrawPool,
  isSubmitting,
  municipalityOptions,
  selectedMunicipality,
  selectedGroup,
  isUnspecifiedMunicipality,
  slots,
  maxSlots,
  slotsLeft,
  winners,
  lastDrawn,
  remaining,
  rotation,
  isSpinning,
  wheelSegments,
  canDraw,
  canConfirm,
  setSlots,
  spin,
  drawRemaining,
  resetDraw,
  confirmWinners,
  refreshPool,
  onOpenChange,
} = useSpesDraw()
</script>

<template>
  <Dialog :open="isDrawOpen" @update:open="onOpenChange">
    <DialogContent class="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>SPES Randomizer Draw</DialogTitle>
        <DialogDescription>
          Draw SPES beneficiaries at random per municipality. Only Pending applicants who attached all 5 documentary
          requirements are in the draw. Drawn applicants are approved and can then be appointed; everyone else stays
          Pending.
        </DialogDescription>
      </DialogHeader>

      <!-- Loading -->
      <div v-if="isLoadingDrawPool && !municipalityOptions.length" class="grid gap-6 md:grid-cols-2">
        <Skeleton class="aspect-square w-full rounded-full" />
        <div class="space-y-3">
          <Skeleton v-for="i in 4" :key="i" class="h-10 w-full" />
        </div>
      </div>

      <!-- Nobody to draw -->
      <Empty v-else-if="!municipalityOptions.length" class="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Dices />
          </EmptyMedia>
          <EmptyTitle>No applicants to draw</EmptyTitle>
          <EmptyDescription>
            Applicants enter the draw once their form is Pending and all 5 documentary requirements have a file
            attached.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>

      <div v-else class="space-y-6">
        <!-- Draw settings -->
        <div class="grid gap-4 sm:grid-cols-[1fr_160px_auto] sm:items-end">
          <div class="space-y-2">
            <Label for="spes-draw-municipality">Municipality</Label>
            <Select v-model="selectedMunicipality" :disabled="isSpinning || isSubmitting">
              <SelectTrigger id="spes-draw-municipality" class="w-full">
                <SelectValue placeholder="Select a municipality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in municipalityOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label for="spes-draw-slots">Slots to fill</Label>
            <Input
              id="spes-draw-slots"
              type="number"
              min="1"
              :max="maxSlots"
              :model-value="slots"
              :disabled="isSpinning || isSubmitting || winners.length > 0"
              @update:model-value="setSlots"
            />
          </div>
          <Button variant="outline" :disabled="isLoadingDrawPool || isSpinning || isSubmitting" @click="refreshPool">
            <RefreshCw class="size-4" :class="{ 'animate-spin': isLoadingDrawPool }" />
            <span class="sm:sr-only">Refresh</span>
          </Button>
        </div>

        <Alert v-if="isUnspecifiedMunicipality">
          <AlertTitle>These applicants have no municipality</AlertTitle>
          <AlertDescription>
            Set the municipality on their SPES forms so they are drawn with the right municipality.
          </AlertDescription>
        </Alert>

        <div class="grid gap-6 md:grid-cols-2">
          <!-- Wheel -->
          <div class="flex flex-col items-center gap-4">
            <div class="relative w-full max-w-xs">
              <svg viewBox="-100 -108 200 208" class="w-full" role="img" :aria-label="`Wheel with ${remaining.length} applicant(s)`">
                <g :transform="`rotate(${rotation})`">
                  <circle r="98" class="fill-muted stroke-border" stroke-width="1" />
                  <template v-for="segment in wheelSegments" :key="segment.id">
                    <path v-if="segment.path" :d="segment.path" :class="segment.colorClass" class="stroke-background" stroke-width="0.75" />
                    <circle v-else r="96" :class="segment.colorClass" />
                    <text
                      :transform="segment.labelTransform"
                      text-anchor="middle"
                      dominant-baseline="middle"
                      class="fill-background text-[7px] font-semibold"
                    >
                      {{ segment.label }}
                    </text>
                  </template>
                </g>
                <circle r="12" class="fill-background stroke-border" stroke-width="1" />
                <!-- Pointer -->
                <path d="M -7 -106 L 7 -106 L 0 -90 Z" class="fill-foreground" />
              </svg>
            </div>

            <p class="min-h-5 text-center text-sm" aria-live="polite">
              <template v-if="isSpinning">Drawing…</template>
              <template v-else-if="lastDrawn">
                Drawn: <strong class="font-semibold">{{ lastDrawn.name }}</strong>
              </template>
              <template v-else-if="!remaining.length">Everyone in {{ selectedMunicipality }} has been drawn.</template>
              <template v-else>{{ remaining.length }} applicant(s) on the wheel</template>
            </p>

            <div class="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              <Button :disabled="!canDraw" @click="spin">
                <Loader2 v-if="isSpinning" class="size-4 shrink-0 animate-spin" />
                {{ isSpinning ? 'Spinning...' : 'Spin the Wheel' }}
              </Button>
              <Button variant="outline" :disabled="!canDraw" @click="drawRemaining">
                Draw {{ slotsLeft }} at Once
              </Button>
            </div>
          </div>

          <!-- Results -->
          <div class="space-y-4">
            <div class="flex items-center justify-between gap-2">
              <h3 class="text-base font-semibold">Drawn Applicants</h3>
              <span class="text-sm tabular-nums text-muted-foreground">{{ winners.length }} / {{ slots }} slots</span>
            </div>

            <p v-if="!winners.length" class="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              Spin the wheel or draw all slots at once. The order of the draw is kept.
            </p>
            <ol v-else class="divide-y rounded-lg border">
              <li v-for="(winner, index) in winners" :key="winner.form.id" class="flex items-center gap-3 p-3">
                <span class="w-6 text-right text-sm tabular-nums text-muted-foreground">{{ index + 1 }}.</span>
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium">{{ winner.name }}</p>
                  <p class="truncate text-xs text-muted-foreground">
                    {{ winner.form.student_category || 'Category not set' }}
                    <template v-if="winner.form.contact_number"> · {{ winner.form.contact_number }}</template>
                  </p>
                </div>
              </li>
            </ol>

            <details v-if="selectedGroup" class="text-sm">
              <summary class="cursor-pointer text-muted-foreground">
                {{ selectedGroup.candidates.length }} eligible applicant(s) in {{ selectedGroup.municipality }}
              </summary>
              <ul class="mt-2 max-h-48 space-y-1 overflow-y-auto">
                <li v-for="candidate in selectedGroup.candidates" :key="candidate.form.id" class="truncate">
                  {{ candidate.name }}
                </li>
              </ul>
            </details>
          </div>
        </div>
      </div>

      <DialogFooter v-if="municipalityOptions.length" class="gap-2 sm:justify-between">
        <Button variant="ghost" :disabled="isSpinning || isSubmitting || !winners.length" @click="resetDraw">
          Reset Draw
        </Button>
        <div class="flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" :disabled="isSpinning || isSubmitting" @click="onOpenChange(false)">Close</Button>
          <Button :disabled="!canConfirm" @click="confirmWinners">
            <Loader2 v-if="isSubmitting" class="size-4 shrink-0 animate-spin" />
            {{ isSubmitting ? 'Approving...' : `Approve ${winners.length} Drawn Applicant(s)` }}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
