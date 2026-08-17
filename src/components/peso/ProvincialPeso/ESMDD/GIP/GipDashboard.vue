<script setup lang="ts">
import { computed } from 'vue'
import { VisAxis, VisGroupedBar, VisXYContainer } from '@unovis/vue'
import type { ChartConfig } from '@/components/ui/chart'
import {
  ChartContainer,
  ChartCrosshair,
  ChartTooltip,
  ChartTooltipContent,
  componentToString,
} from '@/components/ui/chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import pgasLogo from '@/assets/images/agsur.png'
import doleLogo from '@/assets/images/dole.png'
import { Building2, Landmark, Users } from '@lucide/vue'

type GenderDataPoint = {
  year: number
  male: number
  female: number
}

// ─── Chart Configs ───
const pgasConfig: ChartConfig = {
  male: {
    label: 'Male',
    color: '#2563eb',
  },
  female: {
    label: 'Female',
    color: '#dc14ea',
  },
}

const doleConfig: ChartConfig = {
  male: {
    label: 'Male',
    color: '#2563eb',
  },
  female: {
    label: 'Female',
    color: '#dc14ea',
  },
}

// ─── GIP PGAS Yearly Dataset (2021 - 2026) ───
const pgasData: GenderDataPoint[] = [
  { year: 2021, male: 538, female: 614 },
  { year: 2022, male: 880, female: 990 },
  { year: 2023, male: 1300, female: 1440 },
  { year: 2024, male: 1735, female: 1908 },
  { year: 2025, male: 2080, female: 2295 },
  { year: 2026, male: 1465, female: 1625 },
]

// ─── GIP DOLE Yearly Dataset (2021 - 2026) ───
const doleData: GenderDataPoint[] = [
  { year: 2021, male: 445, female: 530 },
  { year: 2022, male: 728, female: 838 },
  { year: 2023, male: 1085, female: 1230 },
  { year: 2024, male: 1470, female: 1665 },
  { year: 2025, male: 1795, female: 2015 },
  { year: 2026, male: 1275, female: 1415 },
]

// ─── Totals ───
const totalPgas = computed(() => ({
  male: pgasData.reduce((acc, curr) => acc + curr.male, 0),
  female: pgasData.reduce((acc, curr) => acc + curr.female, 0),
}))

const totalDole = computed(() => ({
  male: doleData.reduce((acc, curr) => acc + curr.male, 0),
  female: doleData.reduce((acc, curr) => acc + curr.female, 0),
}))

// ─── Year Formatter ───
const formatTickYear = (dataList: GenderDataPoint[]) => (i: number) => {
  const item = dataList[i]
  if (!item) return ''
  return `${item.year}`
}

// ─── Tooltip Formatter ───
const formatTooltipLabel = (dataList: GenderDataPoint[]) => (d: number | Date) => {
  const idx = typeof d === 'number' ? d : 0
  const item = dataList[idx]
  return item ? `Year ${item.year}` : ''
}
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
              {{ (totalPgas.male + totalPgas.female).toLocaleString() }}
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
              {{ (totalDole.male + totalDole.female).toLocaleString() }}
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
              {{ (totalPgas.male + totalDole.male).toLocaleString() }}
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
              {{ (totalPgas.female + totalDole.female).toLocaleString() }}
            </p>
          </div>
        </div>
      </Card>
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
                <span class="text-sm font-bold font-mono">{{ totalPgas.male.toLocaleString() }}</span>
              </div>
            </div>
            <div class="flex items-center gap-2 border-l pl-4">
              <span class="h-3 w-3 rounded-xs bg-[#dc14ea]" />
              <div class="flex flex-col">
                <span class="text-xs text-muted-foreground">Female</span>
                <span class="text-sm font-bold font-mono">{{ totalPgas.female.toLocaleString() }}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent class="px-2 pt-4 sm:p-6">
          <ChartContainer :config="pgasConfig" :cursor="true" class="aspect-auto h-\[280px\] w-full">
            <VisXYContainer :data="pgasData" :height="280">
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
                :tick-format="formatTickYear(pgasData)"
                :grid-line="false"
                :tick-line="false"
                :num-ticks="pgasData.length"
              />
              <ChartCrosshair
                :template="componentToString(pgasConfig, ChartTooltipContent, {
                  labelFormatter: formatTooltipLabel(pgasData),
                })"
                :color="() => 'transparent'"
              />
              <ChartTooltip />
            </VisXYContainer>
          </ChartContainer>
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
                <span class="text-sm font-bold font-mono">{{ totalDole.male.toLocaleString() }}</span>
              </div>
            </div>
            <div class="flex items-center gap-2 border-l pl-4">
              <span class="h-3 w-3 rounded-xs bg-[#dc14ea]" />
              <div class="flex flex-col">
                <span class="text-xs text-muted-foreground">Female</span>
                <span class="text-sm font-bold font-mono">{{ totalDole.female.toLocaleString() }}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent class="px-2 pt-4 sm:p-6">
          <ChartContainer :config="doleConfig" :cursor="true" class="aspect-auto h-\[280px\] w-full">
            <VisXYContainer :data="doleData" :height="280">
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
                :tick-format="formatTickYear(doleData)"
                :grid-line="false"
                :tick-line="false"
                :num-ticks="doleData.length"
              />
              <ChartCrosshair
                :template="componentToString(doleConfig, ChartTooltipContent, {
                  labelFormatter: formatTooltipLabel(doleData),
                })"
                :color="() => 'transparent'"
              />
              <ChartTooltip />
            </VisXYContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  </div>
</template>