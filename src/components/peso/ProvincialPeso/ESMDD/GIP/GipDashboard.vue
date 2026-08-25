<script setup lang="ts">
import { VisAxis, VisGroupedBar, VisXYContainer } from '@unovis/vue'
import {
  ChartContainer,
  ChartCrosshair,
  ChartTooltip,
  ChartTooltipContent,
  componentToString,
} from '@/components/ui/chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import pgasLogo from '@/assets/images/agsur.png'
import gipLogo from '@/assets/images/gip.png'
import doleLogo from '@/assets/images/dole.png'
import { Building2, ChevronRight, Landmark, Loader2, RefreshCw, Users } from '@lucide/vue'
import type { GenderDataPoint } from '@/types/peso/provincialPeso/gip'
import { useGipDashboard } from '@/composables/peso/provincialPeso/useGipDashboard'

const {
  pgasYearlyData,
  doleYearlyData,
  applicantsYearlyData,
  totalPgasYearly,
  totalDoleYearly,
  totalApplicantsYearly,
  overallMaleInterns,
  overallFemaleInterns,
  isLoading,
  pgasConfig,
  doleConfig,
  applicantsConfig,
  formatTickYear,
  formatTooltipLabel,
  navigateToDetails,
  navigateToApplicants,
  fetchDashboardData,
} = useGipDashboard()
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Header -->
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Government Internship Program (GIP)</h1>
        <p class="text-sm text-muted-foreground">
          Monitoring and comparative demographic distribution of deployed interns for PGAS and DOLE.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        class="gap-1.5 self-start sm:self-auto cursor-pointer"
        :disabled="isLoading"
        @click="fetchDashboardData"
      >
        <RefreshCw :class="['h-4 w-4', isLoading && 'animate-spin']" />
        <span>Refresh Data</span>
      </Button>
    </div>

    <!-- Quick Stats -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card class="p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Landmark class="h-5 w-5" />
          </div>
          <div>
            <p class="text-xs text-muted-foreground">GIP PGAS Total</p>
            <p class="text-xl font-bold font-mono">
              {{ totalPgasYearly.total.toLocaleString() }}
            </p>
          </div>
        </div>
      </Card>
      <Card class="p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Building2 class="h-5 w-5" />
          </div>
          <div>
            <p class="text-xs text-muted-foreground">GIP DOLE Total</p>
            <p class="text-xl font-bold font-mono">
              {{ totalDoleYearly.total.toLocaleString() }}
            </p>
          </div>
        </div>
      </Card>
      <Card class="p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users class="h-5 w-5" />
          </div>
          <div>
            <p class="text-xs text-muted-foreground">Overall Male Interns</p>
            <p class="text-xl font-bold font-mono">
              {{ overallMaleInterns.toLocaleString() }}
            </p>
          </div>
        </div>
      </Card>
      <Card class="p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users class="h-5 w-5" />
          </div>
          <div>
            <p class="text-xs text-muted-foreground">Overall Female Interns</p>
            <p class="text-xl font-bold font-mono">
              {{ overallFemaleInterns.toLocaleString() }}
            </p>
          </div>
        </div>
      </Card>
    </div>

    <!-- ─── Section Header: Dual Charts ─── -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-lg font-semibold tracking-tight">Intern Demographics</h2>
        <p class="text-xs text-muted-foreground">
          Yearly demographic distribution by gender for PGAS and DOLE
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        class="gap-1.5 self-start sm:self-auto cursor-pointer"
        @click="navigateToDetails()"
      >
        <span>View Details</span>
        <ChevronRight class="h-4 w-4" />
      </Button>
    </div>

    <!-- ─── 1 Row: Dual Charts ─── -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <!-- ─── Chart 1: GIP PGAS ─── -->
      <Card class="overflow-hidden">
        <CardHeader class="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
          <div class="flex flex-1 items-center gap-3 px-4 py-4 sm:px-6 sm:py-5">
            <Avatar class="h-15 w-15 rounded-lg border bg-background">
              <AvatarImage :src="pgasLogo" alt="PGAS logo" class="object-cover" />
              <AvatarFallback class="rounded-lg text-xs font-semibold">PGAS</AvatarFallback>
            </Avatar>
            <div class="flex flex-col justify-center gap-1">
              <CardTitle class="text-base font-semibold">GIP - PGAS</CardTitle>
              <CardDescription class="text-xs">
                Provincial Gov't of Agusan del Sur
              </CardDescription>
            </div>
          </div>
          <div class="flex items-center gap-4 px-4 py-3 sm:px-6 sm:py-4 border-t sm:border-t-0 sm:border-l bg-muted/20">
            <div class="flex items-center gap-2">
              <span class="h-3 w-3 rounded-xs bg-[#2563eb]" />
              <div class="flex flex-col">
                <span class="text-xs text-muted-foreground">Male</span>
                <span class="text-sm font-bold font-mono">{{ totalPgasYearly.male.toLocaleString() }}</span>
              </div>
            </div>
            <div class="flex items-center gap-2 border-l pl-4">
              <span class="h-3 w-3 rounded-xs bg-[#dc14ea]" />
              <div class="flex flex-col">
                <span class="text-xs text-muted-foreground">Female</span>
                <span class="text-sm font-bold font-mono">{{ totalPgasYearly.female.toLocaleString() }}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent class="px-2 pt-4 sm:p-6">
          <div v-if="isLoading" class="flex h-70 w-full items-center justify-center">
            <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
          <ChartContainer v-else-if="pgasYearlyData.length > 0" :config="pgasConfig" :cursor="true" class="aspect-auto h-70 w-full">
            <VisXYContainer :data="pgasYearlyData" :height="280">
              <VisGroupedBar
                :x="(_d: GenderDataPoint, i: number) => i"
                :y="[(d: GenderDataPoint) => d.male, (d: GenderDataPoint) => d.female]"
                :color="[pgasConfig.male.color!, pgasConfig.female.color!]"
                :rounded-corners="4"
                :bar-padding="0.08"
                :group-padding="0.25"
              />
              <VisAxis
                type="y"
                :grid-line="true"
                :tick-line="false"
                :domain-line="false"
                :num-ticks="5"
              />
              <VisAxis
                type="x"
                :tick-format="formatTickYear(pgasYearlyData)"
                :grid-line="false"
                :tick-line="false"
                :num-ticks="pgasYearlyData.length"
              />
              <ChartCrosshair
                :template="componentToString(pgasConfig, ChartTooltipContent, {
                  labelFormatter: formatTooltipLabel(pgasYearlyData),
                })"
                :color="() => 'transparent'"
              />
              <ChartTooltip />
            </VisXYContainer>
          </ChartContainer>
          <div v-else class="flex h-70 w-full flex-col items-center justify-center text-xs text-muted-foreground">
            <p>No PGAS demographic records found</p>
          </div>
        </CardContent>
      </Card>

      <!-- ─── Chart 2: GIP DOLE ─── -->
      <Card class="overflow-hidden">
        <CardHeader class="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
          <div class="flex flex-1 items-center gap-3 px-4 py-4 sm:px-6 sm:py-5">
            <Avatar class="h-15 w-15 rounded-lg border bg-background">
              <AvatarImage :src="doleLogo" alt="DOLE logo" class="object-cover" />
              <AvatarFallback class="rounded-lg text-xs font-semibold">DOLE</AvatarFallback>
            </Avatar>
            <div class="flex flex-col justify-center gap-1">
              <CardTitle class="text-base font-semibold">GIP - DOLE</CardTitle>
              <CardDescription class="text-xs">
                Department of Labor and Employment
              </CardDescription>
            </div>
          </div>
          <div class="flex items-center gap-4 px-4 py-3 sm:px-6 sm:py-4 border-t sm:border-t-0 sm:border-l bg-muted/20">
            <div class="flex items-center gap-2">
              <span class="h-3 w-3 rounded-xs bg-[#2563eb]" />
              <div class="flex flex-col">
                <span class="text-xs text-muted-foreground">Male</span>
                <span class="text-sm font-bold font-mono">{{ totalDoleYearly.male.toLocaleString() }}</span>
              </div>
            </div>
            <div class="flex items-center gap-2 border-l pl-4">
              <span class="h-3 w-3 rounded-xs bg-[#dc14ea]" />
              <div class="flex flex-col">
                <span class="text-xs text-muted-foreground">Female</span>
                <span class="text-sm font-bold font-mono">{{ totalDoleYearly.female.toLocaleString() }}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent class="px-2 pt-4 sm:p-6">
          <div v-if="isLoading" class="flex h-70 w-full items-center justify-center">
            <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
          <ChartContainer v-else-if="doleYearlyData.length > 0" :config="doleConfig" :cursor="true" class="aspect-auto h-70 w-full">
            <VisXYContainer :data="doleYearlyData" :height="280">
              <VisGroupedBar
                :x="(_d: GenderDataPoint, i: number) => i"
                :y="[(d: GenderDataPoint) => d.male, (d: GenderDataPoint) => d.female]"
                :color="[doleConfig.male.color!, doleConfig.female.color!]"
                :rounded-corners="4"
                :bar-padding="0.08"
                :group-padding="0.25"
              />
              <VisAxis
                type="y"
                :grid-line="true"
                :tick-line="false"
                :domain-line="false"
                :num-ticks="5"
              />
              <VisAxis
                type="x"
                :tick-format="formatTickYear(doleYearlyData)"
                :grid-line="false"
                :tick-line="false"
                :num-ticks="doleYearlyData.length"
              />
              <ChartCrosshair
                :template="componentToString(doleConfig, ChartTooltipContent, {
                  labelFormatter: formatTooltipLabel(doleYearlyData),
                })"
                :color="() => 'transparent'"
              />
              <ChartTooltip />
            </VisXYContainer>
          </ChartContainer>
          <div v-else class="flex h-70 w-full flex-col items-center justify-center text-xs text-muted-foreground">
            <p>No DOLE demographic records found</p>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- ─── Section Header: All Applicants ─── -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-lg font-semibold tracking-tight">GIP Applicants</h2>
        <p class="text-xs text-muted-foreground">
          Yearly demographic distribution of all GIP applicants across Agusan del Sur
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        class="gap-1.5 self-start sm:self-auto cursor-pointer"
        @click="navigateToApplicants()"
      >
        <span>View Details</span>
        <ChevronRight class="h-4 w-4" />
      </Button>
    </div>

    <!-- ─── Chart 3: All GIP Applicants ─── -->
    <Card class="overflow-hidden">
      <CardHeader class="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
        <div class="flex flex-1 items-center gap-3 px-4 py-4 sm:px-6 sm:py-5">
          <Avatar class="h-15 w-15 rounded-lg border bg-background">
            <AvatarImage :src="gipLogo" alt="GIP logo" class="object-cover" />
            <AvatarFallback class="rounded-lg text-xs font-semibold">GIP</AvatarFallback>
          </Avatar>
          <div class="flex flex-col justify-center gap-1">
            <CardTitle class="text-base font-semibold">GIP - All Applicants</CardTitle>
            <CardDescription class="text-xs">
              Overall applicant pool demographic distribution by gender
            </CardDescription>
          </div>
        </div>
        <div class="flex items-center gap-4 px-4 py-3 sm:px-6 sm:py-4 border-t sm:border-t-0 sm:border-l bg-muted/20">
          <div class="flex items-center gap-2">
            <span class="h-3 w-3 rounded-xs bg-primary" />
            <div class="flex flex-col">
              <span class="text-xs text-muted-foreground">Total</span>
              <span class="text-sm font-bold font-mono">{{ totalApplicantsYearly.total.toLocaleString() }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2 border-l pl-4">
            <span class="h-3 w-3 rounded-xs bg-[#2563eb]" />
            <div class="flex flex-col">
              <span class="text-xs text-muted-foreground">Male</span>
              <span class="text-sm font-bold font-mono">{{ totalApplicantsYearly.male.toLocaleString() }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2 border-l pl-4">
            <span class="h-3 w-3 rounded-xs bg-[#dc14ea]" />
            <div class="flex flex-col">
              <span class="text-xs text-muted-foreground">Female</span>
              <span class="text-sm font-bold font-mono">{{ totalApplicantsYearly.female.toLocaleString() }}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent class="px-2 pt-4 sm:p-6">
        <div v-if="isLoading" class="flex h-70 w-full items-center justify-center">
          <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <ChartContainer v-else-if="applicantsYearlyData.length > 0" :config="applicantsConfig" :cursor="true" class="aspect-auto h-70 w-full">
          <VisXYContainer :data="applicantsYearlyData" :height="280">
            <VisGroupedBar
              :x="(_d: GenderDataPoint, i: number) => i"
              :y="[(d: GenderDataPoint) => d.male, (d: GenderDataPoint) => d.female]"
              :color="[applicantsConfig.male.color!, applicantsConfig.female.color!]"
              :rounded-corners="4"
              :bar-padding="0.08"
              :group-padding="0.25"
            />
            <VisAxis
              type="y"
              :grid-line="true"
              :tick-line="false"
              :domain-line="false"
              :num-ticks="5"
            />
            <VisAxis
              type="x"
              :tick-format="formatTickYear(applicantsYearlyData)"
              :grid-line="false"
              :tick-line="false"
              :num-ticks="applicantsYearlyData.length"
            />
            <ChartCrosshair
              :template="componentToString(applicantsConfig, ChartTooltipContent, {
                labelFormatter: formatTooltipLabel(applicantsYearlyData),
              })"
              :color="() => 'transparent'"
            />
            <ChartTooltip />
          </VisXYContainer>
        </ChartContainer>
        <div v-else class="flex h-70 w-full flex-col items-center justify-center text-xs text-muted-foreground">
          <p>No applicant demographic records found</p>
        </div>
      </CardContent>
    </Card>
  </div>
</template>