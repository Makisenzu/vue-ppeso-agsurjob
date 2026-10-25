<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ChevronDown, ExternalLink, Loader2, Pencil, Plus, RefreshCw, Trash2, UserRound } from '@lucide/vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import SiteContentSection from '@/components/peso/ProvincialPeso/Administrative/SiteContents/SiteContentSection.vue'
import OrgUnitDialog from '@/components/peso/ProvincialPeso/Administrative/SiteContents/OrgUnitDialog.vue'
import OrgPositionDialog from '@/components/peso/ProvincialPeso/Administrative/SiteContents/OrgPositionDialog.vue'
import { useOrgChartManager } from '@/composables/peso/provincialPeso/useOrgChartManager'

const {
  groups,
  isGroupOpen,
  setGroupOpen,
  positionCount,
  vacantCount,
  isLoading,
  errorMessage,
  isDeleting,
  isDeletingUnit,
  deleteTargetName,
  isDeleteDialogOpen,
  refreshChart,
  confirmDelete,
  openUnitDialog,
  openPositionDialog,
  requestDeleteUnit,
  requestDeletePosition,
} = useOrgChartManager()
</script>

<template>
  <SiteContentSection section-id="org-chart" title="Organizational chart">
    <template #description>
      Divisions, positions, who holds them and their photos, shown on the What is PESO? page.
      <template v-if="!isLoading">
        {{ positionCount }} {{ positionCount === 1 ? 'position' : 'positions' }}, {{ vacantCount }} vacant.
      </template>
    </template>

    <!-- Toolbar -->
    <div class="flex flex-wrap justify-end gap-2">
      <Button variant="ghost" as-child>
        <RouterLink to="/what-is-peso" target="_blank">
          View page
          <ExternalLink class="size-4" />
        </RouterLink>
      </Button>
      <Button variant="outline" :disabled="isLoading" @click="refreshChart">
        <RefreshCw class="size-4" :class="{ 'animate-spin': isLoading }" />
        <span class="hidden sm:inline">Refresh</span>
      </Button>
      <Button @click="openUnitDialog()">
        <Plus class="size-4" />
        New Division
      </Button>
    </div>

    <div
      v-if="errorMessage"
      class="rounded border border-destructive/20 bg-destructive/10 p-4 text-center text-sm text-destructive"
    >
      {{ errorMessage }}
    </div>

    <template v-if="isLoading && !positionCount && !errorMessage">
      <Skeleton v-for="i in 3" :key="i" class="h-48 w-full rounded-lg" />
    </template>

    <!-- One collapsible block per group: the top of the chart, then each division. Accordion pattern like
         SiteContentSection: the heading holds the toggle; the action buttons stay outside it -->
    <template v-else>
      <Collapsible
        v-for="group in groups"
        :key="group.key"
        as="section"
        :open="isGroupOpen(group.key)"
        class="group/org rounded-lg border border-border"
        :aria-labelledby="`org-group-${group.key}`"
        @update:open="(open: boolean) => setGroupOpen(group.key, open)"
      >
        <div class="flex flex-col gap-3 p-4 group-data-[state=open]/org:border-b group-data-[state=open]/org:border-border sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0 flex-1">
            <h3 :id="`org-group-${group.key}`" class="font-semibold text-pretty">
              <CollapsibleTrigger
                class="group flex w-full cursor-pointer items-start gap-2 rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <ChevronDown
                  class="mt-0.5 size-5 shrink-0 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90"
                  aria-hidden="true"
                />
                {{ group.title }}
              </CollapsibleTrigger>
            </h3>
            <p class="pl-7 text-sm text-muted-foreground">
              <template v-if="group.subtitle">{{ group.subtitle }} · </template>
              {{ group.positions.length }} {{ group.positions.length === 1 ? 'position' : 'positions' }}
            </p>
          </div>
          <div class="flex shrink-0 flex-wrap gap-2">
            <template v-if="group.unit">
              <Button variant="ghost" size="sm" :aria-label="`Edit ${group.title}`" @click="openUnitDialog(group.unit)">
                <Pencil class="size-4" />
                <span class="hidden sm:inline">Edit</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                class="text-destructive hover:bg-destructive/10 hover:text-destructive"
                :aria-label="`Delete ${group.title}`"
                @click="requestDeleteUnit(group.unit)"
              >
                <Trash2 class="size-4" />
                <span class="hidden sm:inline">Delete</span>
              </Button>
            </template>
            <Button variant="outline" size="sm" @click="openPositionDialog(null, group.unit?.id ?? null)">
              <Plus class="size-4" />
              Add Position
            </Button>
          </div>
        </div>

        <CollapsibleContent>
          <ul v-if="group.positions.length" class="divide-y divide-border">
            <li v-for="position in group.positions" :key="position.id" class="flex items-center gap-3 p-4">
              <Avatar class="size-10 shrink-0">
                <AvatarImage v-if="position.photo_url" :src="position.photo_url" :alt="position.holder_name ?? ''" class="object-cover" />
                <AvatarFallback class="text-xs font-semibold">
                  <UserRound v-if="!position.holder_name" class="size-4 text-muted-foreground" aria-hidden="true" />
                  <span v-else aria-hidden="true">{{ position.initials }}</span>
                </AvatarFallback>
              </Avatar>

              <div class="min-w-0 flex-1">
                <p class="truncate text-sm" :class="position.holder_name ? 'font-medium' : 'text-muted-foreground italic'">
                  {{ position.holder_name ?? 'Vacant' }}
                </p>
                <p class="text-xs text-pretty text-muted-foreground">{{ position.title }}</p>
                <div class="mt-1 flex flex-wrap gap-1.5">
                  <Badge variant="outline" :class="position.statusClass">{{ position.statusLabel }}</Badge>
                  <Badge v-if="position.is_head" variant="outline">{{ group.unit ? 'Head' : 'Office head' }}</Badge>
                </div>
              </div>

              <div class="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  :aria-label="`Edit ${position.holder_name ?? position.title}`"
                  @click="openPositionDialog(position)"
                >
                  <Pencil class="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  class="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  :aria-label="`Delete ${position.holder_name ?? position.title}`"
                  @click="requestDeletePosition(position)"
                >
                  <Trash2 class="size-4" />
                </Button>
              </div>
            </li>
          </ul>
          <p v-else class="p-4 text-center text-sm text-muted-foreground">No positions yet.</p>
        </CollapsibleContent>
      </Collapsible>
    </template>
  </SiteContentSection>

  <OrgUnitDialog />
  <OrgPositionDialog />

  <!-- Delete a division or a position -->
  <AlertDialog v-model:open="isDeleteDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ isDeletingUnit ? 'Delete division?' : 'Delete position?' }}</AlertDialogTitle>
        <AlertDialogDescription>
          <strong class="font-medium text-foreground">{{ deleteTargetName }}</strong>
          <template v-if="isDeletingUnit"> will be removed from the chart. Move or delete its positions first.</template>
          <template v-else> will be removed from the chart, with its photo. To keep the position, edit it and clear the name instead.</template>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel class="cursor-pointer" :disabled="isDeleting">Cancel</AlertDialogCancel>
        <Button variant="destructive" class="cursor-pointer" :disabled="isDeleting" @click="confirmDelete">
          <Loader2 v-if="isDeleting" class="size-4 shrink-0 animate-spin" />
          {{ isDeleting ? 'Deleting...' : isDeletingUnit ? 'Delete Division' : 'Delete Position' }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
