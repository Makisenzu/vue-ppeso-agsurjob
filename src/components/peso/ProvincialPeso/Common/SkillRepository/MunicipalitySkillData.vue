<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Eye,
  Filter,
  Mountain,
  RefreshCw,
  Search,
  TreePine,
  Users,
  Waves,
  Wrench,
  X,
  Phone,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useMunicipalitySkillData } from '@/composables/peso/provincialPeso/useMunicipalitySkillData'
import type { LpiiCategory } from '@/types/peso/provincialPeso/skillRepository'

const route = useRoute()
const router = useRouter()

const rawId = (route.params.id ?? '') as string
const municipalityParam = decodeURIComponent(rawId)

const {
  municipalityName,
  detail,
  isLoading,
  searchQuery,
  selectedCategory,
  selectedSkill,
  selectedLpii,
  filteredSkills,
  filteredBarangays,
  filteredApplicants,
  loadData,
  toggleSkillFilter,
  setLpiiFilter,
  setCategory,
  clearAllFilters,
} = useMunicipalitySkillData(municipalityParam)

onMounted(() => {
  void loadData()
})

function goBack() {
  void router.push({ name: 'provincial-peso-skills-repository' })
}

function handleRefresh() {
  void loadData(undefined, { forceRefresh: true })
}

function viewApplicantEntry(id: string) {
  void router.push({
    name: 'provincial-peso-entry-details',
    params: { id },
  })
}

function getLpiiBadgeProps(tag?: LpiiCategory | null) {
  switch (tag) {
    case 'UPLAND':
      return {
        class: 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-500/30',
        icon: Mountain,
        label: 'Upland',
      }
    case 'WETLAND':
      return {
        class: 'bg-sky-500/10 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 border-sky-500/30',
        icon: Waves,
        label: 'Wetland',
      }
    case 'LOWLAND':
      return {
        class: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-500/30',
        icon: TreePine,
        label: 'Lowland',
      }
    default:
      return {
        class: 'bg-muted text-muted-foreground border-border/50',
        icon: null,
        label: 'External (N/A)',
      }
  }
}
</script>

<template>
  <div class="space-y-6 pb-12">
    <!-- Header Section -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <Button variant="ghost" size="sm" class="h-8 gap-1 pl-2 pr-3 -ml-2 text-muted-foreground hover:text-foreground" @click="goBack">
            <ArrowLeft class="size-4" />
            <span class="text-xs font-semibold">Skills Repository</span>
          </Button>
          <span class="text-muted-foreground">/</span>
          <span class="text-xs font-medium text-muted-foreground">Municipality Dossier</span>
        </div>
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
            {{ municipalityName }}
          </h1>
          <Badge
            :variant="detail?.isAgusanDelSur ? 'outline' : 'secondary'"
            class="font-mono text-xs"
            :class="{ 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold': !detail?.isAgusanDelSur }"
          >
            {{ detail?.province || (detail?.isAgusanDelSur ? 'Agusan del Sur' : 'Outside Agusan del Sur') }}
          </Badge>
          <Badge v-if="detail && !detail.isAgusanDelSur" variant="outline" class="text-[10px] text-muted-foreground border-border/80">
            Outside Agusan del Sur
          </Badge>
        </div>
        <p class="text-sm text-muted-foreground">
          {{ detail?.isAgusanDelSur
            ? 'Skills repository, applicant origin, and barangay LPII ecosystem tagging for this municipality.'
            : 'Skills repository and applicant profile breakdown for this external municipality. LPII terrain tagging applies strictly to Agusan del Sur territory.'
          }}
        </p>
      </div>

      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" :disabled="isLoading" @click="handleRefresh">
          <RefreshCw class="size-3.5" :class="{ 'animate-spin': isLoading }" />
          <span class="ml-1.5">Refresh</span>
        </Button>
      </div>
    </div>

    <!-- Summary KPI Cards -->
    <div v-if="detail" class="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <Card class="p-3 shadow-2xs">
        <div class="flex items-center gap-2.5">
          <div class="rounded-lg bg-primary/10 p-2 text-primary dark:bg-primary/20">
            <Users class="size-4" />
          </div>
          <div>
            <p class="text-[11px] font-medium text-muted-foreground">Total Applicants</p>
            <p class="text-lg font-bold text-foreground">{{ detail.totalApplicants }}</p>
          </div>
        </div>
      </Card>

      <Card class="p-3 shadow-2xs">
        <div class="flex items-center gap-2.5">
          <div class="rounded-lg bg-secondary p-2 text-secondary-foreground">
            <Wrench class="size-4" />
          </div>
          <div>
            <p class="text-[11px] font-medium text-muted-foreground">Unique Skills</p>
            <p class="text-lg font-bold text-foreground">{{ detail.uniqueSkillsCount }}</p>
          </div>
        </div>
      </Card>

      <template v-if="detail.isAgusanDelSur">
        <Card class="p-3 shadow-2xs">
          <div class="flex items-center gap-2.5">
            <div class="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <TreePine class="size-4" />
            </div>
            <div>
              <p class="text-[11px] font-medium text-muted-foreground">Lowland Applicants</p>
              <p class="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {{ detail.lowlandApplicants }}
              </p>
            </div>
          </div>
        </Card>

        <Card class="p-3 shadow-2xs">
          <div class="flex items-center gap-2.5">
            <div class="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <Mountain class="size-4" />
            </div>
            <div>
              <p class="text-[11px] font-medium text-muted-foreground">Upland Applicants</p>
              <p class="text-lg font-bold text-amber-600 dark:text-amber-400">
                {{ detail.uplandApplicants }}
              </p>
            </div>
          </div>
        </Card>

        <Card class="p-3 shadow-2xs">
          <div class="flex items-center gap-2.5">
            <div class="rounded-lg bg-sky-500/10 p-2 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
              <Waves class="size-4" />
            </div>
            <div>
              <p class="text-[11px] font-medium text-muted-foreground">Wetland Applicants</p>
              <p class="text-lg font-bold text-sky-600 dark:text-sky-400">
                {{ detail.wetlandApplicants }}
              </p>
            </div>
          </div>
        </Card>
      </template>

      <template v-else>
        <Card class="p-3 shadow-2xs">
          <div>
            <p class="text-[11px] font-medium text-muted-foreground">Province / Origin</p>
            <p class="text-base font-bold text-foreground truncate">{{ detail.province }}</p>
          </div>
        </Card>

        <Card class="p-3 shadow-2xs">
          <div>
            <p class="text-[11px] font-medium text-muted-foreground">Barangays Represented</p>
            <p class="text-lg font-bold text-foreground">{{ detail.barangayRows.length }}</p>
          </div>
        </Card>

        <Card class="p-3 shadow-2xs">
          <div>
            <p class="text-[11px] font-medium text-muted-foreground">LPII Tagging</p>
            <p class="text-sm font-semibold text-muted-foreground">N/A (Outside Agusan)</p>
          </div>
        </Card>
      </template>
    </div>

    <!-- ─── What Skills This Municipality Has (Skills Inventory) ─── -->
    <Card class="shadow-xs overflow-hidden">
      <CardHeader class="border-b bg-muted/20 pb-3">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle class="text-base font-semibold flex items-center gap-2">
              <Wrench class="size-4 text-primary" />
              <span>Skills Inventory — {{ municipalityName }}</span>
            </CardTitle>
            <CardDescription class="text-xs">
              Explore skills present among applicants in this municipality. Click a skill to filter barangays and applicants below.
            </CardDescription>
          </div>

          <div v-if="selectedSkill" class="flex items-center gap-2">
            <Badge variant="default" class="gap-1.5 pl-2 pr-1.5 py-1 text-xs">
              <span>Filter: {{ selectedSkill }}</span>
              <button class="hover:opacity-75 cursor-pointer" @click="selectedSkill = ''">
                <X class="size-3" />
              </button>
            </Badge>
            <Button variant="ghost" size="sm" class="h-7 text-xs text-muted-foreground" @click="clearAllFilters">
              Reset All
            </Button>
          </div>
        </div>

        <!-- Category Filter Tabs -->
        <div v-if="detail && detail.categories.length > 0" class="flex flex-wrap items-center gap-1.5 pt-2">
          <Button
            size="sm"
            :variant="selectedCategory === 'All' ? 'default' : 'outline'"
            class="h-7 rounded-lg text-xs"
            @click="setCategory('All')"
          >
            All Categories ({{ detail.skillsBreakdown.length }})
          </Button>

          <Button
            v-for="cat in detail.categories"
            :key="cat"
            size="sm"
            :variant="selectedCategory === cat ? 'default' : 'outline'"
            class="h-7 rounded-lg text-xs"
            @click="setCategory(cat)"
          >
            {{ cat }}
          </Button>
        </div>
      </CardHeader>

      <CardContent class="p-4">
        <div v-if="filteredSkills.length > 0" class="flex flex-wrap gap-2">
          <button
            v-for="skill in filteredSkills"
            :key="skill.name"
            :class="[
              'inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-2xs',
              selectedSkill === skill.name
                ? 'bg-primary text-primary-foreground border-primary shadow-primary/20 scale-105 ring-2 ring-primary/30'
                : 'bg-background hover:bg-muted/70 text-foreground border-border hover:border-primary/40',
            ]"
            @click="toggleSkillFilter(skill.name)"
          >
            <span>{{ skill.name }}</span>
            <span
              :class="[
                'inline-flex items-center justify-center rounded-full px-1.5 py-0.2 text-[10px] font-bold leading-none',
                selectedSkill === skill.name
                  ? 'bg-primary-foreground text-primary'
                  : 'bg-muted text-muted-foreground',
              ]"
            >
              {{ skill.count }}
            </span>
          </button>
        </div>

        <div v-else class="py-8 text-center text-sm text-muted-foreground">
          No skills registered in this category for {{ municipalityName }}.
        </div>
      </CardContent>
    </Card>

    <!-- ─── Search & LPII Filter Toolbar ─── -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <!-- Search Input -->
      <div class="relative w-full sm:w-72">
        <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          v-model="searchQuery"
          placeholder="Search barangay, applicant, or skill..."
          class="h-8 pl-8 pr-7 text-xs"
        />
        <button
          v-if="searchQuery"
          class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          @click="searchQuery = ''"
        >
          <X class="size-3.5" />
        </button>
      </div>

      <!-- LPII Filter Buttons -->
      <div v-if="detail?.isAgusanDelSur" class="flex items-center gap-1.5">
        <span class="text-xs text-muted-foreground font-medium mr-1 flex items-center gap-1">
          <Filter class="size-3" />
          <span>LPII:</span>
        </span>
        <Button
          size="sm"
          :variant="selectedLpii === 'ALL' ? 'secondary' : 'ghost'"
          class="h-7 text-xs px-2.5"
          @click="setLpiiFilter('ALL')"
        >
          All
        </Button>
        <Button
          size="sm"
          :variant="selectedLpii === 'LOWLAND' ? 'secondary' : 'ghost'"
          class="h-7 text-xs px-2.5 text-emerald-600 dark:text-emerald-400 font-semibold"
          @click="setLpiiFilter('LOWLAND')"
        >
          <TreePine class="size-3 mr-1" />
          Lowland
        </Button>
        <Button
          size="sm"
          :variant="selectedLpii === 'UPLAND' ? 'secondary' : 'ghost'"
          class="h-7 text-xs px-2.5 text-amber-600 dark:text-amber-400 font-semibold"
          @click="setLpiiFilter('UPLAND')"
        >
          <Mountain class="size-3 mr-1" />
          Upland
        </Button>
        <Button
          size="sm"
          :variant="selectedLpii === 'WETLAND' ? 'secondary' : 'ghost'"
          class="h-7 text-xs px-2.5 text-sky-600 dark:text-sky-400 font-semibold"
          @click="setLpiiFilter('WETLAND')"
        >
          <Waves class="size-3 mr-1" />
          Wetland
        </Button>
      </div>
      <div v-else class="flex items-center gap-1.5">
        <Badge variant="outline" class="text-xs text-muted-foreground border-border/80">
          LPII Ecosystem Tagging: N/A (Outside Agusan del Sur)
        </Badge>
      </div>
    </div>

    <!-- ─── Two-Column Section: Barangays Breakdown & Registered Applicants ─── -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- 1. Barangays & LPII Distribution Table -->
      <Card class="shadow-xs overflow-hidden flex flex-col">
        <CardHeader class="border-b bg-muted/10 py-3">
          <div class="flex items-center justify-between">
            <CardTitle class="text-sm font-semibold">
              Barangays & LPII Classification ({{ filteredBarangays.length }})
            </CardTitle>
            <span class="text-xs text-muted-foreground">
              {{ detail?.isAgusanDelSur ? 'AgSur LPII Mapping' : 'Origin Barangays' }}
            </span>
          </div>
        </CardHeader>
        <div class="min-h-0 flex-1 overflow-auto max-h-115">
          <Table>
            <TableHeader class="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead>Barangay</TableHead>
                <TableHead class="text-center">LPII Classification</TableHead>
                <TableHead class="text-right">Applicants</TableHead>
                <TableHead>Top Skills</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="isLoading">
                <TableCell colspan="4" class="h-24 text-center text-muted-foreground">
                  Loading barangay data...
                </TableCell>
              </TableRow>

              <template v-else-if="filteredBarangays.length > 0">
                <TableRow v-for="b in filteredBarangays" :key="b.name">
                  <TableCell class="font-medium text-foreground">
                    {{ b.name }}
                  </TableCell>
                  <TableCell class="text-center">
                    <Badge
                      variant="outline"
                      :class="['gap-1 text-[10px] font-semibold uppercase', getLpiiBadgeProps(b.lpiiTag).class]"
                    >
                      <component :is="getLpiiBadgeProps(b.lpiiTag).icon" class="size-3" />
                      <span>{{ getLpiiBadgeProps(b.lpiiTag).label }}</span>
                    </Badge>
                  </TableCell>
                  <TableCell class="text-right font-bold tabular-nums">
                    {{ b.applicantsCount }}
                  </TableCell>
                  <TableCell>
                    <div class="flex flex-wrap gap-1 max-w-50">
                      <Badge
                        v-for="s in b.topSkills"
                        :key="s.name"
                        variant="secondary"
                        class="text-[10px] px-1 py-0 cursor-pointer hover:bg-primary hover:text-primary-foreground"
                        @click="toggleSkillFilter(s.name)"
                      >
                        {{ s.name }} ({{ s.count }})
                      </Badge>
                      <span v-if="b.topSkills.length === 0" class="text-xs text-muted-foreground/60 italic">
                        —
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              </template>

              <TableRow v-else>
                <TableCell colspan="4" class="h-24 text-center text-muted-foreground">
                  No barangays found matching criteria.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Card>

      <!-- 2. Registered Applicants Roster -->
      <Card class="shadow-xs overflow-hidden flex flex-col">
        <CardHeader class="border-b bg-muted/10 py-3">
          <div class="flex items-center justify-between">
            <CardTitle class="text-sm font-semibold">
              Applicants from {{ municipalityName }} ({{ filteredApplicants.length }})
            </CardTitle>
            <span class="text-xs text-muted-foreground">PESO Registry</span>
          </div>
        </CardHeader>
        <div class="min-h-0 flex-1 overflow-auto max-h-115">
          <Table>
            <TableHeader class="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead>Applicant Name</TableHead>
                <TableHead>Barangay</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead class="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="isLoading">
                <TableCell colspan="4" class="h-24 text-center text-muted-foreground">
                  Loading applicants...
                </TableCell>
              </TableRow>

              <template v-else-if="filteredApplicants.length > 0">
                <TableRow v-for="app in filteredApplicants" :key="app.id">
                  <TableCell>
                    <div class="font-medium text-foreground text-xs leading-tight">
                      {{ app.fullName }}
                    </div>
                    <div v-if="app.contactNumber" class="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone class="size-2.5" />
                      <span>{{ app.contactNumber }}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div class="text-xs font-medium">{{ app.barangay }}</div>
                    <Badge
                      variant="outline"
                      :class="['gap-1 text-[9px] font-semibold uppercase mt-0.5', getLpiiBadgeProps(app.lpiiTag).class]"
                    >
                      <component :is="getLpiiBadgeProps(app.lpiiTag).icon" class="size-2.5" />
                      <span>{{ getLpiiBadgeProps(app.lpiiTag).label }}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div class="flex flex-wrap gap-1 max-w-55">
                      <Badge
                        v-for="s in app.skillNames"
                        :key="s"
                        variant="secondary"
                        :class="[
                          'text-[10px] px-1.5 py-0 cursor-pointer',
                          selectedSkill === s ? 'bg-primary text-primary-foreground font-bold' : '',
                        ]"
                        @click="toggleSkillFilter(s)"
                      >
                        {{ s }}
                      </Badge>
                      <span v-if="app.skillNames.length === 0" class="text-xs text-muted-foreground/60 italic">
                        No skills listed
                      </span>
                    </div>
                  </TableCell>
                  <TableCell class="text-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      class="h-7 px-2 text-xs"
                      @click="viewApplicantEntry(app.id)"
                    >
                      <Eye class="size-3.5 mr-1" />
                      <span>Profile</span>
                    </Button>
                  </TableCell>
                </TableRow>
              </template>

              <TableRow v-else>
                <TableCell colspan="4" class="h-24 text-center text-muted-foreground">
                  No applicants found matching criteria.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  </div>
</template>
