<script setup lang="ts">
import { EllipsisVertical, Link2, ListChecks, Loader2, Plus, Search, X } from '@lucide/vue'
import CustomBreadcrumbs from '@/components/CustomBreadcrumbs.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSkillList } from '@/composables/peso/provincialPeso/useSkillList'

/** PESO's Skill List: wordings to review, and the skills employers and applicants pick from */
const {
  tab,
  coverageCards,
  isSaving,
  queue,
  isLoadingQueue,
  queueSearchInput,
  queueRangeLabel,
  queuePageCount,
  canPreviousQueuePage,
  canNextQueuePage,
  previousQueuePage,
  nextQueuePage,
  usageLabel,
  openMapDialog,
  openAddFromWording,
  ignoreWording,
  skills,
  filteredSkills,
  isLoadingSkills,
  skillsError,
  reloadSkills,
  skillSearch,
  skillMeta,
  aliasDrafts,
  onAliasKeydown,
  removeAlias,
  toggleSkillActive,
  openCreateSkill,
  openEditSkill,
  openMergeDialog,
  categoryOptions,
  activeSkillOptions,
  skillDialog,
  skillDialogTitle,
  saveSkillDialog,
  mapDialog,
  mapSkillModel,
  saveMapDialog,
  mergeDialog,
  mergeTargetOptions,
  mergeTargetModel,
  saveMergeDialog,
} = useSkillList()
</script>

<template>
  <div class="mx-auto w-full min-w-0 max-w-6xl flex-1 space-y-6 overflow-x-hidden px-0 sm:px-6 lg:px-8">
    <CustomBreadcrumbs />

    <div class="space-y-1">
      <h1 class="text-2xl font-bold tracking-tight text-pretty sm:text-3xl">Skill List</h1>
      <p class="max-w-prose text-sm text-pretty text-muted-foreground">
        Employers and applicants pick skills from this list, so the same skill always matches. Wordings people typed
        that the list doesn't know wait in To review.
      </p>
    </div>

    <!-- Coverage: the share of typed skills that match the list -->
    <div class="grid gap-3 sm:grid-cols-2">
      <div v-for="card in coverageCards" :key="card.key" class="rounded-lg border bg-card p-4">
        <p class="text-xs text-muted-foreground">{{ card.label }}</p>
        <p class="mt-1 text-2xl font-semibold tabular-nums">{{ card.percent }}</p>
        <p class="text-xs text-muted-foreground">{{ card.detail }}</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="inline-flex rounded-lg border bg-muted/40 p-1" role="tablist" aria-label="Skill List sections">
      <button
        v-for="item in [
          { key: 'review', label: 'To review' },
          { key: 'skills', label: `Skills (${skills.length})` },
        ] as const"
        :key="item.key"
        type="button"
        role="tab"
        :aria-selected="tab === item.key"
        class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        :class="tab === item.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
        @click="tab = item.key"
      >
        {{ item.label }}
      </button>
    </div>

    <!-- ═══ To review ═══ -->
    <section v-if="tab === 'review'" class="space-y-4" role="tabpanel" aria-label="To review">
      <div class="relative w-full sm:max-w-xs">
        <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input v-model="queueSearchInput" type="search" placeholder="Search wordings" class="pl-9" aria-label="Search wordings" />
      </div>

      <div v-if="isLoadingQueue && queue.length === 0" class="space-y-2" aria-busy="true">
        <Skeleton v-for="i in 5" :key="i" class="h-14 w-full" />
      </div>

      <Empty v-else-if="queue.length === 0" class="rounded-md border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><ListChecks /></EmptyMedia>
          <EmptyTitle>Nothing to review</EmptyTitle>
          <EmptyDescription>Every skill employers and applicants typed is on the list or ignored.</EmptyDescription>
        </EmptyHeader>
      </Empty>

      <ul v-else class="divide-y rounded-md border" :class="isLoadingQueue ? 'opacity-60' : ''">
        <li
          v-for="row in queue"
          :key="row.wording_key"
          class="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="min-w-0">
            <p class="truncate text-sm font-medium" :title="row.example_text">{{ row.example_text }}</p>
            <p class="text-xs text-muted-foreground">Typed in {{ usageLabel(row) }}</p>
          </div>
          <div class="flex shrink-0 flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" class="h-10 flex-1 sm:h-8 sm:flex-none" :disabled="isSaving" @click="openMapDialog(row)">
              <Link2 class="size-4" /> Map to…
            </Button>
            <Button type="button" variant="outline" size="sm" class="h-10 flex-1 sm:h-8 sm:flex-none" :disabled="isSaving" @click="openAddFromWording(row)">
              <Plus class="size-4" /> Add as new
            </Button>
            <Button type="button" variant="ghost" size="sm" class="h-10 flex-1 sm:h-8 sm:flex-none" :disabled="isSaving" @click="ignoreWording(row)">
              Ignore
            </Button>
          </div>
        </li>
      </ul>

      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">{{ queueRangeLabel }}</p>
        <div v-if="queuePageCount > 1" class="flex justify-center gap-2 sm:justify-end">
          <Button variant="outline" class="h-10 sm:h-8" size="sm" :disabled="!canPreviousQueuePage || isLoadingQueue" @click="previousQueuePage">
            Previous
          </Button>
          <Button variant="outline" class="h-10 sm:h-8" size="sm" :disabled="!canNextQueuePage || isLoadingQueue" @click="nextQueuePage">
            Next
          </Button>
        </div>
      </div>
    </section>

    <!-- ═══ Skills ═══ -->
    <section v-else class="space-y-4" role="tabpanel" aria-label="Skills">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div class="relative w-full sm:max-w-xs">
          <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input v-model="skillSearch" type="search" placeholder="Search skills or wordings" class="pl-9" aria-label="Search skills" />
        </div>
        <Button type="button" class="h-10 sm:h-9" :disabled="isSaving" @click="openCreateSkill">
          <Plus class="size-4" /> Add skill
        </Button>
      </div>

      <Alert v-if="skillsError" variant="destructive">
        <AlertTitle>The skill list could not be loaded</AlertTitle>
        <AlertDescription class="flex flex-col items-start gap-2">
          {{ skillsError }}
          <Button type="button" variant="outline" size="sm" @click="reloadSkills">Try again</Button>
        </AlertDescription>
      </Alert>

      <div v-else-if="isLoadingSkills && skills.length === 0" class="space-y-2" aria-busy="true">
        <Skeleton v-for="i in 5" :key="i" class="h-20 w-full" />
      </div>

      <p v-else-if="filteredSkills.length === 0" class="rounded-md border p-6 text-center text-sm text-muted-foreground">
        No skills match “{{ skillSearch }}”.
      </p>

      <ul v-else class="divide-y rounded-md border">
        <li v-for="skill in filteredSkills" :key="skill.id" class="flex flex-col gap-2 p-3" :class="skill.is_active ? '' : 'bg-muted/30'">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-medium" :class="skill.is_active ? '' : 'text-muted-foreground'">{{ skill.name }}</p>
              <p class="text-xs text-muted-foreground">{{ skillMeta(skill) }}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button type="button" variant="ghost" size="icon" class="size-10 shrink-0 sm:size-8" :aria-label="`Actions for ${skill.name}`" :disabled="isSaving">
                  <EllipsisVertical class="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem @select="openEditSkill(skill)">Edit</DropdownMenuItem>
                <DropdownMenuItem @select="openMergeDialog(skill)">Merge into another skill…</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem @select="toggleSkillActive(skill)">
                  {{ skill.is_active ? 'Hide from pickers' : 'Show in pickers' }}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <!-- Other wordings: each one links what people typed to this skill -->
          <div class="flex flex-wrap items-center gap-1.5">
            <Badge v-for="alias in skill.skill_aliases" :key="alias.id" variant="outline" class="gap-1 font-normal">
              {{ alias.alias }}
              <button
                type="button"
                class="rounded-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                :disabled="isSaving"
                :aria-label="`Remove the wording ${alias.alias}`"
                @click="removeAlias(alias.id)"
              >
                <X class="size-3" />
              </button>
            </Badge>
            <Input
              v-model="aliasDrafts[skill.id]"
              placeholder="Add another wording"
              maxlength="80"
              class="h-8 w-full text-xs sm:w-48"
              :disabled="isSaving"
              :aria-label="`Add another wording for ${skill.name}`"
              @keydown="onAliasKeydown($event, skill)"
            />
          </div>
        </li>
      </ul>
    </section>

    <!-- Add / edit skill -->
    <Dialog v-model:open="skillDialog.open">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ skillDialogTitle }}</DialogTitle>
          <DialogDescription v-if="skillDialog.mode === 'from-wording'">
            “{{ skillDialog.wording }}” is kept as another wording, so the people who typed it match right away.
          </DialogDescription>
          <DialogDescription v-else-if="skillDialog.mode === 'edit'">
            The old name is kept as another wording, so nothing stops matching.
          </DialogDescription>
          <DialogDescription v-else>Employers and applicants see it in the skill pickers.</DialogDescription>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="saveSkillDialog">
          <div class="space-y-2">
            <Label for="skill-name">Name</Label>
            <Input id="skill-name" v-model="skillDialog.name" maxlength="80" :aria-invalid="!!skillDialog.error" />
            <p v-if="skillDialog.error" class="text-sm text-destructive">{{ skillDialog.error }}</p>
          </div>
          <div class="space-y-2">
            <Label for="skill-category">Category</Label>
            <SearchSelect id="skill-category" v-model="skillDialog.category" :options="categoryOptions" placeholder="Select category" class="w-full" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" @click="skillDialog.open = false">Cancel</Button>
            <Button type="submit" :disabled="isSaving">
              <Loader2 v-if="isSaving" class="size-4 animate-spin" />
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Map a wording to a skill -->
    <Dialog v-model:open="mapDialog.open">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Map “{{ mapDialog.wording }}”</DialogTitle>
          <DialogDescription>It becomes another wording of the skill you pick. Postings and applicants that used it match at once.</DialogDescription>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="saveMapDialog">
          <div class="space-y-2">
            <Label for="map-skill">Skill</Label>
            <SearchSelect id="map-skill" v-model="mapSkillModel" :options="activeSkillOptions" placeholder="Search skills" class="w-full" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" @click="mapDialog.open = false">Cancel</Button>
            <Button type="submit" :disabled="isSaving || mapDialog.skillId == null">
              <Loader2 v-if="isSaving" class="size-4 animate-spin" />
              Map
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Merge skills -->
    <Dialog v-model:open="mergeDialog.open">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Merge “{{ mergeDialog.from?.name }}”</DialogTitle>
          <DialogDescription>
            Its wordings and links move to the skill you pick, and its name becomes another wording of that skill. It is then removed.
          </DialogDescription>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="saveMergeDialog">
          <div class="space-y-2">
            <Label for="merge-skill">Merge into</Label>
            <SearchSelect id="merge-skill" v-model="mergeTargetModel" :options="mergeTargetOptions" placeholder="Search skills" class="w-full" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" @click="mergeDialog.open = false">Cancel</Button>
            <Button type="submit" variant="destructive" :disabled="isSaving || mergeDialog.intoId == null">
              <Loader2 v-if="isSaving" class="size-4 animate-spin" />
              Merge
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>
