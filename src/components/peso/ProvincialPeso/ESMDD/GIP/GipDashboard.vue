<script setup lang="ts">
import { computed } from 'vue'
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import pgasLogo from '@/assets/images/agsur.png'
import gipLogo from '@/assets/images/gip.png'
import doleLogo from '@/assets/images/dole.png'
import { AlertTriangle, ChevronRight, RefreshCw } from '@lucide/vue'
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
  pendingDecisionCount,
  expiringAppointmentsCount,
  expiredAppointmentsCount,
  isLoading,
  pgasConfig,
  doleConfig,
  applicantsConfig,
  formatTickYear,
  formatTooltipLabel,
  navigateToDetails,
  navigateToPendingAppointments,
  navigateToApplicants,
  navigateToPriority,
  refreshDashboardData,
} = useGipDashboard()

const quickStats = computed(() => [
  { label: 'GIP PGAS Total', value: totalPgasYearly.value.total },
  { label: 'GIP DOLE Total', value: totalDoleYearly.value.total },
  { label: 'Overall Male Interns', value: overallMaleInterns.value },
  { label: 'Overall Female Interns', value: overallFemaleInterns.value },
])

const programCharts = computed(() => [
  {
    key: 'pgas',
    title: 'GIP - PGAS',
    description: "Provincial Gov't of Agusan del Sur",
    logo: pgasLogo,
    fallback: 'PGAS',
    data: pgasYearlyData.value,
    config: pgasConfig,
    totals: totalPgasYearly.value,
    emptyLabel: 'No PGAS demographic records found',
  },
  {
    key: 'dole',
    title: 'GIP - DOLE',
    description: 'Department of Labor and Employment',
    logo: doleLogo,
    fallback: 'DOLE',
    data: doleYearlyData.value,
    config: doleConfig,
    totals: totalDoleYearly.value,
    emptyLabel: 'No DOLE demographic records found',
  },
])

const applicantsChart = computed(() => ({
  key: 'applicants',
  title: 'GIP - All Applicants',
  description: 'Overall applicant pool by gender',
  logo: gipLogo,
  fallback: 'GIP',
  data: applicantsYearlyData.value,
  config: applicantsConfig,
  totals: totalApplicantsYearly.value,
  emptyLabel: 'No applicant demographic records found',
}))
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Government Internship Program (GIP)</h1>
        <p class="text-sm text-muted-foreground">
          Monitoring and comparative demographic distribution of deployed interns for PGAS and DOLE.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" class="cursor-pointer" @click="navigateToPriority">
          Priority Applicants
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="cursor-pointer"
          :disabled="isLoading"
          @click="refreshDashboardData"
        >
          <RefreshCw :class="['size-4 shrink-0', isLoading && 'animate-spin']" />
          {{ isLoading ? 'Refreshing...' : 'Refresh Data' }}
        </Button>
      </div>
    </div>

    <!-- Appointment Renewal Attention -->
    <Alert v-if="pendingDecisionCount > 0" class="border-warning/40 bg-warning/10 *:[svg]:text-warning">
      <AlertTriangle />
      <AlertTitle>
        {{ pendingDecisionCount }} intern appointment{{ pendingDecisionCount > 1 ? 's' : '' }} need a renewal decision
      </AlertTitle>
      <AlertDescription>
        <p>
          <template v-if="expiredAppointmentsCount > 0">
            {{ expiredAppointmentsCount }} reached the end of term
          </template>
          <template v-if="expiredAppointmentsCount > 0 && expiringAppointmentsCount > 0"> and </template>
          <template v-if="expiringAppointmentsCount > 0">
            {{ expiringAppointmentsCount }} expiring within 30 days
          </template>.
          Evaluate interns to renew their appointment or conclude service.
        </p>
        <Button size="sm" class="mt-2 cursor-pointer" @click="navigateToPendingAppointments">
          Manage Appointments
        </Button>
      </AlertDescription>
    </Alert>

    <!-- Quick Stats -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card v-for="stat in quickStats" :key="stat.label">
        <CardHeader>
          <CardDescription>{{ stat.label }}</CardDescription>
          <Skeleton v-if="isLoading" class="h-8 w-20" />
          <CardTitle v-else class="text-2xl font-semibold tabular-nums">
            {{ stat.value.toLocaleString() }}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>

    <!-- Intern Demographics -->
    <section class="space-y-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-lg font-semibold tracking-tight">Intern Demographics</h2>
          <p class="text-sm text-muted-foreground">Yearly distribution by gender for PGAS and DOLE</p>
        </div>
        <Button variant="outline" size="sm" class="self-start cursor-pointer sm:self-auto" @click="navigateToDetails()">
          View Details
          <ChevronRight class="size-4 shrink-0" />
        </Button>
      </div>

      <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <Card v-for="chart in programCharts" :key="chart.key" class="gap-0 py-0">
          <CardHeader class="flex flex-col items-stretch gap-0 border-b p-0 sm:flex-row [.border-b]:pb-0">
            <div class="flex flex-1 items-center gap-3 px-4 py-4 sm:px-6">
              <Avatar class="size-10 rounded-lg border bg-background">
                <AvatarImage :src="chart.logo" :alt="`${chart.fallback} logo`" class="object-cover" />
                <AvatarFallback class="rounded-lg text-xs font-semibold">{{ chart.fallback }}</AvatarFallback>
              </Avatar>
              <div class="space-y-1">
                <CardTitle class="text-base">{{ chart.title }}</CardTitle>
                <CardDescription>{{ chart.description }}</CardDescription>
              </div>
            </div>
            <div class="flex divide-x border-t sm:border-t-0 sm:border-l">
              <div class="flex flex-col justify-center gap-0.5 px-4 py-3 sm:px-6">
                <span class="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span class="size-2.5 shrink-0 rounded-[2px] bg-chart-1" />
                  Male
                </span>
                <span class="text-lg font-semibold tabular-nums">{{ chart.totals.male.toLocaleString() }}</span>
              </div>
              <div class="flex flex-col justify-center gap-0.5 px-4 py-3 sm:px-6">
                <span class="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span class="size-2.5 shrink-0 rounded-[2px] bg-chart-2" />
                  Female
                </span>
                <span class="text-lg font-semibold tabular-nums">{{ chart.totals.female.toLocaleString() }}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent class="px-2 py-4 sm:p-6">
            <Skeleton v-if="isLoading" class="h-70 w-full" />
            <ChartContainer v-else-if="chart.data.length > 0" :config="chart.config" :cursor="true" class="aspect-auto h-70 w-full">
              <VisXYContainer :data="chart.data" :height="280">
                <VisGroupedBar
                  :x="(_d: GenderDataPoint, i: number) => i"
                  :y="[(d: GenderDataPoint) => d.male, (d: GenderDataPoint) => d.female]"
                  :color="[chart.config.male.color!, chart.config.female.color!]"
                  :rounded-corners="4"
                  :bar-padding="0.08"
                  :group-padding="0.25"
                />
                <VisAxis type="y" :grid-line="true" :tick-line="false" :domain-line="false" :num-ticks="5" />
                <VisAxis
                  type="x"
                  :tick-format="formatTickYear(chart.data)"
                  :grid-line="false"
                  :tick-line="false"
                  :num-ticks="chart.data.length"
                />
                <ChartCrosshair
                  :template="componentToString(chart.config, ChartTooltipContent, {
                    labelFormatter: formatTooltipLabel(chart.data),
                  })"
                  :color="() => 'transparent'"
                />
                <ChartTooltip />
              </VisXYContainer>
            </ChartContainer>
            <Empty v-else class="h-70">
              <EmptyHeader>
                <EmptyTitle>No data yet</EmptyTitle>
                <EmptyDescription>{{ chart.emptyLabel }}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      </div>
    </section>

    <!-- GIP Applicants -->
    <section class="space-y-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-lg font-semibold tracking-tight">GIP Applicants</h2>
          <p class="text-sm text-muted-foreground">Yearly distribution of all GIP applicants across Agusan del Sur</p>
        </div>
        <Button variant="outline" size="sm" class="self-start cursor-pointer sm:self-auto" @click="navigateToApplicants()">
          View Details
          <ChevronRight class="size-4 shrink-0" />
        </Button>
      </div>

      <Card class="gap-0 py-0">
        <CardHeader class="flex flex-col items-stretch gap-0 border-b p-0 sm:flex-row [.border-b]:pb-0">
          <div class="flex flex-1 items-center gap-3 px-4 py-4 sm:px-6">
            <Avatar class="size-10 rounded-lg border bg-background">
              <AvatarImage :src="applicantsChart.logo" alt="GIP logo" class="object-cover" />
              <AvatarFallback class="rounded-lg text-xs font-semibold">{{ applicantsChart.fallback }}</AvatarFallback>
            </Avatar>
            <div class="space-y-1">
              <CardTitle class="text-base">{{ applicantsChart.title }}</CardTitle>
              <CardDescription>{{ applicantsChart.description }}</CardDescription>
            </div>
          </div>
          <div class="flex divide-x border-t sm:border-t-0 sm:border-l">
            <div class="flex flex-col justify-center gap-0.5 px-4 py-3 sm:px-6">
              <span class="text-xs text-muted-foreground">Total</span>
              <span class="text-lg font-semibold tabular-nums">{{ applicantsChart.totals.total.toLocaleString() }}</span>
            </div>
            <div class="flex flex-col justify-center gap-0.5 px-4 py-3 sm:px-6">
              <span class="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span class="size-2.5 shrink-0 rounded-[2px] bg-chart-1" />
                Male
              </span>
              <span class="text-lg font-semibold tabular-nums">{{ applicantsChart.totals.male.toLocaleString() }}</span>
            </div>
            <div class="flex flex-col justify-center gap-0.5 px-4 py-3 sm:px-6">
              <span class="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span class="size-2.5 shrink-0 rounded-[2px] bg-chart-2" />
                Female
              </span>
              <span class="text-lg font-semibold tabular-nums">{{ applicantsChart.totals.female.toLocaleString() }}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent class="px-2 py-4 sm:p-6">
          <Skeleton v-if="isLoading" class="h-70 w-full" />
          <ChartContainer v-else-if="applicantsChart.data.length > 0" :config="applicantsChart.config" :cursor="true" class="aspect-auto h-70 w-full">
            <VisXYContainer :data="applicantsChart.data" :height="280">
              <VisGroupedBar
                :x="(_d: GenderDataPoint, i: number) => i"
                :y="[(d: GenderDataPoint) => d.male, (d: GenderDataPoint) => d.female]"
                :color="[applicantsChart.config.male.color!, applicantsChart.config.female.color!]"
                :rounded-corners="4"
                :bar-padding="0.08"
                :group-padding="0.25"
              />
              <VisAxis type="y" :grid-line="true" :tick-line="false" :domain-line="false" :num-ticks="5" />
              <VisAxis
                type="x"
                :tick-format="formatTickYear(applicantsChart.data)"
                :grid-line="false"
                :tick-line="false"
                :num-ticks="applicantsChart.data.length"
              />
              <ChartCrosshair
                :template="componentToString(applicantsChart.config, ChartTooltipContent, {
                  labelFormatter: formatTooltipLabel(applicantsChart.data),
                })"
                :color="() => 'transparent'"
              />
              <ChartTooltip />
            </VisXYContainer>
          </ChartContainer>
          <Empty v-else class="h-70">
            <EmptyHeader>
              <EmptyTitle>No data yet</EmptyTitle>
              <EmptyDescription>{{ applicantsChart.emptyLabel }}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    </section>
  </div>
</template>
