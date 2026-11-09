<script setup lang="ts">
// ApplicantNsrpDetails.vue — Section II: job preference (view / edit)
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Globe, Loader2, MapPin, Pencil, Plus, Save, X } from '@lucide/vue'
import { useApplicantNsrpDetailsContext } from '@/composables/peso/provincialPeso/applicantNsrpDetailsContext'

const {
  applicant,
  editingSection,
  isSaving,
  startEdit,
  cancelEdit,
  saveSection,
  jobTypeOptions,
  editPreferredOccupations,
  editNewOccupationTag,
  editPreferredLocalLocations,
  editNewLocalLocationTag,
  editPreferredOverseasLocations,
  editNewOverseasLocationTag,
  editJobTypePreference,
  addEditOccupation,
  removeEditOccupation,
  addEditLocalLocation,
  removeEditLocalLocation,
  addEditOverseasLocation,
  removeEditOverseasLocation,
  toggleEditJobType,
} = useApplicantNsrpDetailsContext()
</script>

<template>
  <Card v-if="applicant" class="border shadow-xs">
    <CardHeader class="pb-3 border-b bg-muted/20">
      <div class="flex items-center justify-between">
        <CardTitle class="text-sm font-semibold flex items-center gap-2">
          <span>II. Job Preference</span>
        </CardTitle>

        <Button
          v-if="editingSection !== 'preferences'"
          variant="ghost"
          size="sm"
          class="gap-1.5 text-xs cursor-pointer print:hidden h-7 px-2 hover:bg-muted"
          @click="startEdit('preferences')"
        >
          <Pencil class="h-3.5 w-3.5 text-muted-foreground" />
          <span>Edit</span>
        </Button>
        <div v-else class="flex items-center gap-1.5 print:hidden">
          <Button
            variant="ghost"
            size="sm"
            class="gap-1 text-xs h-7 px-2 cursor-pointer"
            :disabled="isSaving"
            @click="cancelEdit"
          >
            <X class="h-3.5 w-3.5" />
            <span>Cancel</span>
          </Button>
          <Button
            variant="default"
            size="sm"
            class="gap-1 text-xs h-7 px-2.5 cursor-pointer shadow-xs"
            :disabled="isSaving"
            @click="saveSection('preferences')"
          >
            <Loader2 v-if="isSaving" class="h-3.5 w-3.5 animate-spin" />
            <Save v-else class="h-3.5 w-3.5" />
            <span>Save</span>
          </Button>
        </div>
      </div>
    </CardHeader>

    <!-- VIEW MODE -->
    <CardContent v-if="editingSection !== 'preferences'" class="p-4 space-y-3.5 text-xs">
      <!-- Preferred Occupations -->
      <div class="space-y-1.5">
        <span class="text-muted-foreground block text-[11px] font-semibold">Preferred Occupations</span>
        <div v-if="applicant.preferredOccupations.length > 0" class="flex flex-wrap gap-1">
          <Badge
            v-for="occ in applicant.preferredOccupations"
            :key="occ"
            variant="secondary"
            class="text-[11px]"
          >
            {{ occ }}
          </Badge>
        </div>
        <p v-else class="text-[11px] text-muted-foreground italic">None specified</p>
      </div>

      <!-- Preferred Local Locations -->
      <div class="space-y-1.5 pt-2 border-t">
        <span class="text-muted-foreground block text-[11px] font-semibold flex items-center gap-1">
          <MapPin class="h-3 w-3 text-primary" />
          Preferred Local Work Locations
        </span>
        <div v-if="applicant.preferredLocalLocations.length > 0" class="flex flex-wrap gap-1">
          <Badge
            v-for="loc in applicant.preferredLocalLocations"
            :key="loc"
            variant="outline"
            class="text-[11px]"
          >
            {{ loc }}
          </Badge>
        </div>
        <p v-else class="text-[11px] text-muted-foreground italic">Within Agusan del Sur</p>
      </div>

      <!-- Preferred Overseas Locations -->
      <div class="space-y-1.5 pt-2 border-t">
        <span class="text-muted-foreground block text-[11px] font-semibold flex items-center gap-1">
          <Globe class="h-3 w-3 text-primary" />
          Preferred Overseas Locations
        </span>
        <div v-if="applicant.preferredOverseasLocations.length > 0" class="flex flex-wrap gap-1">
          <Badge
            v-for="osLoc in applicant.preferredOverseasLocations"
            :key="osLoc"
            variant="outline"
            class="text-[11px] bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20"
          >
            {{ osLoc }}
          </Badge>
        </div>
        <p v-else class="text-[11px] text-muted-foreground italic">Local employment only</p>
      </div>

      <!-- Preferred Job Type -->
      <div v-if="applicant.jobTypePreference.length > 0" class="space-y-1.5 pt-2 border-t">
        <span class="text-muted-foreground block text-[11px] font-semibold">Job Type Preference</span>
        <div class="flex flex-wrap gap-1">
          <Badge
            v-for="jt in applicant.jobTypePreference"
            :key="jt"
            variant="secondary"
            class="text-[11px]"
          >
            {{ jt }}
          </Badge>
        </div>
      </div>
    </CardContent>

    <!-- EDIT MODE -->
    <CardContent v-else class="p-4 space-y-4 text-xs">
      <!-- Preferred Occupations -->
      <div class="space-y-1.5">
        <span class="font-semibold text-foreground text-xs block">Preferred Occupations</span>
        <div class="flex items-center gap-2">
          <Input
            v-model="editNewOccupationTag"
            placeholder="e.g. Accounting Clerk, Driver"
            class="h-8 text-xs"
            @keyup.enter="addEditOccupation"
          />
          <Button size="sm" variant="outline" class="h-8 text-xs gap-1 cursor-pointer" @click="addEditOccupation">
            <Plus class="h-3 w-3" />
            <span>Add</span>
          </Button>
        </div>
        <div class="flex flex-wrap gap-1 pt-1">
          <Badge
            v-for="(occ, idx) in editPreferredOccupations"
            :key="idx"
            variant="secondary"
            class="text-[11px] gap-1 py-0.5"
          >
            <span>{{ occ }}</span>
            <button
              type="button"
              class="inline-flex items-center justify-center text-muted-foreground hover:text-destructive cursor-pointer transition-colors focus:outline-none"
              @click.stop="removeEditOccupation(idx)"
            >
              <X class="h-3 w-3" />
            </button>
          </Badge>
        </div>
      </div>

      <!-- Preferred Local Locations -->
      <div class="space-y-1.5 pt-3 border-t">
        <span class="font-semibold text-foreground text-xs block flex items-center gap-1">
          <MapPin class="h-3 w-3 text-primary" />
          Preferred Local Locations
        </span>
        <div class="flex items-center gap-2">
          <Input
            v-model="editNewLocalLocationTag"
            placeholder="e.g. Bayugan City, San Francisco"
            class="h-8 text-xs"
            @keyup.enter="addEditLocalLocation"
          />
          <Button size="sm" variant="outline" class="h-8 text-xs gap-1 cursor-pointer" @click="addEditLocalLocation">
            <Plus class="h-3 w-3" />
            <span>Add</span>
          </Button>
        </div>
        <div class="flex flex-wrap gap-1 pt-1">
          <Badge
            v-for="(loc, idx) in editPreferredLocalLocations"
            :key="idx"
            variant="outline"
            class="text-[11px] gap-1"
          >
            <span>{{ loc }}</span>
            <button
              type="button"
              class="inline-flex items-center justify-center text-muted-foreground hover:text-destructive cursor-pointer transition-colors focus:outline-none"
              @click.stop="removeEditLocalLocation(idx)"
            >
              <X class="h-3 w-3" />
            </button>
          </Badge>
        </div>
      </div>

      <!-- Preferred Overseas Locations -->
      <div class="space-y-1.5 pt-3 border-t">
        <span class="font-semibold text-foreground text-xs block flex items-center gap-1">
          <Globe class="h-3 w-3 text-primary" />
          Preferred Overseas Locations
        </span>
        <div class="flex items-center gap-2">
          <Input
            v-model="editNewOverseasLocationTag"
            placeholder="e.g. Japan, Canada, UAE"
            class="h-8 text-xs"
            @keyup.enter="addEditOverseasLocation"
          />
          <Button size="sm" variant="outline" class="h-8 text-xs gap-1 cursor-pointer" @click="addEditOverseasLocation">
            <Plus class="h-3 w-3" />
            <span>Add</span>
          </Button>
        </div>
        <div class="flex flex-wrap gap-1 pt-1">
          <Badge
            v-for="(os, idx) in editPreferredOverseasLocations"
            :key="idx"
            variant="outline"
            class="text-[11px] bg-primary/10 text-primary border-primary/30 gap-1"
          >
            <span>{{ os }}</span>
            <button
              type="button"
              class="inline-flex items-center justify-center text-primary/70 hover:text-destructive cursor-pointer transition-colors focus:outline-none"
              @click.stop="removeEditOverseasLocation(idx)"
            >
              <X class="h-3 w-3" />
            </button>
          </Badge>
        </div>
      </div>

      <!-- Job Type Preferences -->
      <div class="space-y-1.5 pt-3 border-t">
        <span class="font-semibold text-foreground text-xs block">Employment Type Preferences</span>
        <div class="flex flex-wrap gap-1.5">
          <label
            v-for="jt in jobTypeOptions"
            :key="jt"
            class="flex items-center gap-1.5 p-1.5 rounded-lg border cursor-pointer text-xs"
            :class="editJobTypePreference.includes(jt) ? 'bg-primary/10 border-primary/40 font-medium' : ''"
          >
            <input
              type="checkbox"
              :checked="editJobTypePreference.includes(jt)"
              class="h-3.5 w-3.5 rounded accent-primary text-primary cursor-pointer"
              @change="toggleEditJobType(jt)"
            />
            <span>{{ jt }}</span>
          </label>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
