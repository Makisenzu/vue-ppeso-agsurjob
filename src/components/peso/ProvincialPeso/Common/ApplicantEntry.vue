<script setup lang="ts">
import {
  BookMarked,
  CheckCircle2,
  Download,
  Eye,
  Filter,
  Hammer,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Users,
  UserX,
  UserPlus,
  X,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useApplicantEntry } from '@/composables/peso/provincialPeso/useApplicantEntry'

const {
  applicants,
  filteredApplicants,
  paginatedApplicants,
  availableMunicipalities,
  totalPages,
  statsSummary,
  isLoading,
  searchQuery,
  selectedGenderFilter,
  selectedEmploymentStatusFilter,
  selectedProgramFilter,
  selectedMunicipalityFilter,
  currentPage,
  pageSize,
  openDetails,
  openAddApplicant,
  resetFilters,
  refreshApplicants,
  exportCsv,
  formatDateDisplay,
} = useApplicantEntry()
</script>

<template>
  <!-- ─── Registry Table View ─── -->
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header & Title ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
          Applicant Master Registry
        </h1>
        <p class="text-sm text-muted-foreground">
          Comprehensive database of registered jobseekers across Agusan del Sur.
        </p>
      </div>

      <!-- Quick Action Buttons -->
      <div class="flex items-center gap-2 self-start sm:self-auto flex-wrap">
        <Button
          size="sm"
          class="gap-1.5 text-xs cursor-pointer shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
          @click="openAddApplicant"
        >
          <UserPlus class="h-3.5 w-3.5" />
          <span>New Applicant</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="gap-1.5 text-xs cursor-pointer shadow-xs"
          @click="exportCsv"
        >
          <Download class="h-3.5 w-3.5" />
          <span>Export CSV</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="gap-1.5 text-xs cursor-pointer shadow-xs"
          :disabled="isLoading"
          @click="refreshApplicants"
        >
          <RefreshCw :class="['h-3.5 w-3.5', isLoading && 'animate-spin']" />
          <span>Refresh</span>
        </Button>
      </div>
    </div>

    <!-- ─── Metric Cards: Total Entry, GIP Applicants, TUPAD, SPES ─── -->
    <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
      <!-- 1. Total Entry -->
      <Card
        class="border shadow-xs bg-card/60 backdrop-blur-xs hover:border-primary/40 transition-all cursor-pointer"
        :class="selectedProgramFilter === 'ALL' ? 'border-primary ring-2 ring-primary/20 shadow-sm' : ''"
        @click="selectedProgramFilter = 'ALL'"
      >
        <CardContent class="p-4 flex items-center justify-between">
          <div class="space-y-0.5 min-w-0">
            <p class="text-xs font-medium text-muted-foreground truncate">Total Entry</p>
            <p class="text-2xl font-bold tracking-tight font-mono text-foreground">
              {{ statsSummary.total.toLocaleString() }}
            </p>
            <p class="text-[11px] text-muted-foreground truncate">
              All Registered Applicants
            </p>
          </div>
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <!-- 2. GIP Applicants -->
      <Card
        class="border shadow-xs bg-card/60 backdrop-blur-xs hover:border-blue-500/40 transition-all cursor-pointer"
        :class="selectedProgramFilter === 'GIP' ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-sm' : ''"
        @click="selectedProgramFilter = selectedProgramFilter === 'GIP' ? 'ALL' : 'GIP'"
      >
        <CardContent class="p-4 flex items-center justify-between">
          <div class="space-y-0.5 min-w-0">
            <p class="text-xs font-medium text-muted-foreground truncate">GIP Applicants</p>
            <p class="text-2xl font-bold tracking-tight font-mono text-blue-600 dark:text-blue-400">
              {{ statsSummary.gip.toLocaleString() }}
            </p>
            <p class="text-[11px] text-muted-foreground truncate">
              Government Internship Program
            </p>
          </div>
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Users class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <!-- 3. TUPAD -->
      <Card
        class="border shadow-xs bg-card/60 backdrop-blur-xs hover:border-emerald-500/40 transition-all cursor-pointer"
        :class="selectedProgramFilter === 'TUPAD' ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm' : ''"
        @click="selectedProgramFilter = selectedProgramFilter === 'TUPAD' ? 'ALL' : 'TUPAD'"
      >
        <CardContent class="p-4 flex items-center justify-between">
          <div class="space-y-0.5 min-w-0">
            <p class="text-xs font-medium text-muted-foreground truncate">TUPAD</p>
            <p class="text-2xl font-bold tracking-tight font-mono text-emerald-600 dark:text-emerald-400">
              {{ statsSummary.tupad.toLocaleString() }}
            </p>
            <p class="text-[11px] text-muted-foreground truncate">
              TUPAD Applicants
            </p>
          </div>
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Hammer class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <!-- 4. SPES -->
      <Card
        class="border shadow-xs bg-card/60 backdrop-blur-xs hover:border-amber-500/40 transition-all cursor-pointer"
        :class="selectedProgramFilter === 'SPES' ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-sm' : ''"
        @click="selectedProgramFilter = selectedProgramFilter === 'SPES' ? 'ALL' : 'SPES'"
      >
        <CardContent class="p-4 flex items-center justify-between">
          <div class="space-y-0.5 min-w-0">
            <p class="text-xs font-medium text-muted-foreground truncate">SPES</p>
            <p class="text-2xl font-bold tracking-tight font-mono text-amber-600 dark:text-amber-400">
              {{ statsSummary.spes.toLocaleString() }}
            </p>
            <p class="text-[11px] text-muted-foreground truncate">
              Student Employment
            </p>
          </div>
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <BookMarked class="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- ─── Main Data Table Card ─── -->
    <Card class="border shadow-xs">
      <CardHeader class="pb-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle class="text-lg font-semibold flex items-center gap-2">
              Registered Jobseekers
            </CardTitle>
            <CardDescription class="text-xs">
              Showing {{ filteredApplicants.length }} of {{ applicants.length }} applicant records
            </CardDescription>
          </div>
        </div>

        <!-- ─── Search & Multi-Filter Bar ─── -->
        <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <!-- Search input -->
          <div class="sm:col-span-2 relative">
            <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              v-model="searchQuery"
              placeholder="Search by name, email, course, occupation, program..."
              class="pl-9 text-xs h-9"
            />
            <button
              v-if="searchQuery"
              class="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
              @click="searchQuery = ''"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <!-- Municipality Filter -->
          <div>
            <select
              v-model="selectedMunicipalityFilter"
              class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">All Municipalities</option>
              <option v-for="muni in availableMunicipalities" :key="muni" :value="muni">
                {{ muni }}
              </option>
            </select>
          </div>

          <!-- Employment Status Filter -->
          <div>
            <select
              v-model="selectedEmploymentStatusFilter"
              class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">All Employment Status</option>
              <option value="Employed">Employed</option>
              <option value="Unemployed">Unemployed</option>
              <option value="Self-Employed">Self-Employed</option>
            </select>
          </div>

          <!-- Sex / Gender Filter -->
          <div>
            <select
              v-model="selectedGenderFilter"
              class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <!-- Program Filter (GIP, TUPAD, SPES) -->
          <div>
            <select
              v-model="selectedProgramFilter"
              class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">All Programs (GIP/TUPAD/SPES)</option>
              <option value="GIP">GIP (Govt Internship)</option>
              <option value="TUPAD">TUPAD (Emergency Emp.)</option>
              <option value="SPES">SPES (Student Emp.)</option>
              <option value="NONE">No Program Assigned</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent class="p-0">
        <!-- ─── Table ─── -->
        <div class="relative overflow-x-auto border-t">
          <Table>
            <TableHeader class="bg-muted/40">
              <TableRow>
                <TableHead class="w-60 text-xs font-semibold">Applicant Profile</TableHead>
                <TableHead class="text-xs font-semibold">Sex & Age</TableHead>
                <TableHead class="text-xs font-semibold">Municipality & Barangay</TableHead>
                <TableHead class="text-xs font-semibold">Employment Status</TableHead>
                <TableHead class="text-xs font-semibold">Highest Educational Attainment</TableHead>
                <TableHead class="text-xs font-semibold">Programs & Categories</TableHead>
                <TableHead class="text-right text-xs font-semibold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <!-- Loading State -->
              <template v-if="isLoading">
                <TableRow>
                  <TableCell colspan="7" class="h-44 text-center text-muted-foreground">
                    <div class="flex flex-col items-center justify-center gap-2 py-6">
                      <Loader2 class="h-8 w-8 animate-spin text-primary" />
                      <p class="text-xs text-muted-foreground">Loading applicants from applicants.applicants...</p>
                    </div>
                  </TableCell>
                </TableRow>
              </template>

              <!-- Data Rows -->
              <template v-else-if="paginatedApplicants.length > 0">
                <TableRow
                  v-for="applicant in paginatedApplicants"
                  :key="applicant.id"
                  class="transition-colors hover:bg-muted/30"
                >
                  <!-- Applicant Profile -->
                  <TableCell class="py-3">
                    <div class="flex items-center gap-3">
                      <div class="flex flex-col min-w-0">
                        <span class="font-semibold text-xs sm:text-sm text-foreground truncate">
                          {{ applicant.fullName }}
                        </span>
                        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                          <Phone v-if="applicant.contactNumber && applicant.contactNumber !== 'N/A'" class="h-3 w-3 shrink-0" />
                          <span class="font-mono truncate">{{ applicant.contactNumber }}</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <!-- Sex & Age -->
                  <TableCell class="py-3">
                    <div class="flex flex-col text-xs">
                      <span class="font-medium text-foreground">{{ applicant.sex }}</span>
                      <span class="text-[11px] text-muted-foreground">
                        {{ applicant.age ? `${applicant.age} yrs old` : formatDateDisplay(applicant.dateOfBirth) }}
                      </span>
                    </div>
                  </TableCell>

                  <!-- Location -->
                  <TableCell class="py-3">
                    <div class="flex flex-col text-xs">
                      <span class="font-medium text-foreground flex items-center gap-1">
                        <MapPin class="h-3 w-3 text-muted-foreground shrink-0" />
                        {{ applicant.address.municipality }}
                      </span>
                      <span class="text-[11px] text-muted-foreground pl-4 truncate max-w-40">
                        Brgy. {{ applicant.address.barangay }}
                      </span>
                    </div>
                  </TableCell>

                  <!-- Employment Status -->
                  <TableCell class="py-3">
                    <div class="flex flex-col gap-1">
                      <Badge
                        v-if="applicant.employmentStatus.toLowerCase().includes('employed') && !applicant.employmentStatus.toLowerCase().includes('unemployed')"
                        variant="outline"
                        class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] gap-1 w-fit"
                      >
                        <CheckCircle2 class="h-3 w-3" />
                        {{ applicant.employmentStatus }}
                      </Badge>
                      <Badge
                        v-else
                        variant="outline"
                        class="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[11px] gap-1 w-fit"
                      >
                        <UserX class="h-3 w-3" />
                        {{ applicant.employmentStatus }}
                      </Badge>
                      <span v-if="applicant.employmentType" class="text-[10px] text-muted-foreground">
                        {{ applicant.employmentType }}
                      </span>
                    </div>
                  </TableCell>

                  <!-- Highest Educational Attainment -->
                  <TableCell class="py-3">
                    <div class="flex flex-col text-xs max-w-48">
                      <span class="font-medium text-foreground truncate" :title="applicant.highestEducationalAttainment">
                        {{ applicant.highestEducationalAttainment }}
                      </span>
                      <span v-if="applicant.currentlyInSchool" class="text-[10px] text-primary font-medium">
                        • Currently in school
                      </span>
                    </div>
                  </TableCell>

                  <!-- Programs & Special Categories (GIP, TUPAD, SPES, 4Ps, PWD, OFW) -->
                  <TableCell class="py-3">
                    <div class="flex flex-wrap items-center gap-1 max-w-48">
                      <!-- GIP -->
                      <Badge
                        v-if="applicant.referredPrograms.some((p) => p.toUpperCase().includes('GIP'))"
                        variant="secondary"
                        class="text-[10px] px-1.5 py-0 bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 font-semibold"
                      >
                        GIP
                      </Badge>
                      <!-- TUPAD -->
                      <Badge
                        v-if="applicant.referredPrograms.some((p) => p.toUpperCase().includes('TUPAD'))"
                        variant="secondary"
                        class="text-[10px] px-1.5 py-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold"
                      >
                        TUPAD
                      </Badge>
                      <!-- SPES -->
                      <Badge
                        v-if="applicant.referredPrograms.some((p) => p.toUpperCase().includes('SPES'))"
                        variant="secondary"
                        class="text-[10px] px-1.5 py-0 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold"
                      >
                        SPES
                      </Badge>
                      <!-- 4Ps -->
                      <Badge
                        v-if="applicant.is4psBeneficiary"
                        variant="outline"
                        class="text-[10px] px-1.5 py-0 bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20"
                      >
                        4Ps
                      </Badge>
                      <!-- PWD -->
                      <Badge
                        v-if="applicant.hasDisability"
                        variant="outline"
                        class="text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
                      >
                        PWD
                      </Badge>
                      <!-- OFW -->
                      <Badge
                        v-if="applicant.isOfw || applicant.isFormerOfw"
                        variant="outline"
                        class="text-[10px] px-1.5 py-0 bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20"
                      >
                        OFW
                      </Badge>
                      <!-- General -->
                      <span
                        v-if="
                          !applicant.referredPrograms.some((p) =>
                            ['GIP', 'TUPAD', 'SPES'].some((key) => p.toUpperCase().includes(key))
                          ) &&
                          !applicant.is4psBeneficiary &&
                          !applicant.hasDisability &&
                          !applicant.isOfw &&
                          !applicant.isFormerOfw
                        "
                        class="text-[11px] text-muted-foreground"
                      >
                        General
                      </span>
                    </div>
                  </TableCell>

                  <!-- Action -->
                  <TableCell class="py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      class="h-8 gap-1.5 text-xs cursor-pointer"
                      @click="openDetails(applicant)"
                    >
                      <Eye class="h-3.5 w-3.5" />
                      <span>Details</span>
                    </Button>
                  </TableCell>
                </TableRow>
              </template>

              <!-- Empty State: Zero matches -->
              <TableRow v-else>
                <TableCell colspan="7" class="h-44 text-center text-muted-foreground">
                  <div class="flex flex-col items-center justify-center gap-2 py-6">
                    <Filter class="h-8 w-8 text-muted-foreground/50" />
                    <p class="text-sm font-semibold text-foreground">
                      {{ applicants.length === 0 ? 'No applicants registered yet' : 'No matching applicant records' }}
                    </p>
                    <p class="text-xs text-muted-foreground max-w-sm">
                      {{ applicants.length === 0
                        ? 'Applicant records will appear here as they sign up and complete their DOLE NSRP profiles.'
                        : 'Try adjusting your search query or filter selections.'
                      }}
                    </p>
                    <Button
                      v-if="applicants.length > 0"
                      size="sm"
                      variant="outline"
                      class="mt-2 text-xs cursor-pointer"
                      @click="resetFilters"
                    >
                      Clear Filters
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <!-- ─── Table Pagination ─── -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t text-xs text-muted-foreground">
          <div>
            Showing <span class="font-medium text-foreground">{{ filteredApplicants.length === 0 ? 0 : (currentPage - 1) * pageSize + 1 }}</span>
            to <span class="font-medium text-foreground">{{ Math.min(currentPage * pageSize, filteredApplicants.length) }}</span>
            of <span class="font-medium text-foreground">{{ filteredApplicants.length }}</span> applicants
          </div>

          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              class="h-8 text-xs px-2.5 cursor-pointer"
              :disabled="currentPage <= 1"
              @click="currentPage--"
            >
              Previous
            </Button>
            <div class="flex items-center gap-1">
              <Button
                v-for="p in Math.min(totalPages, 5)"
                :key="p"
                size="sm"
                :variant="currentPage === p ? 'default' : 'outline'"
                class="h-8 w-8 p-0 text-xs cursor-pointer"
                @click="currentPage = p"
              >
                {{ p }}
              </Button>
              <span v-if="totalPages > 5" class="text-xs px-1">...</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              class="h-8 text-xs px-2.5 cursor-pointer"
              :disabled="currentPage >= totalPages"
              @click="currentPage++"
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>