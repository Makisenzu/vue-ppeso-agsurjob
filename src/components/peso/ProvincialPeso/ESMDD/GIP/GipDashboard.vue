<script setup lang="ts">
import { VisGroupedBar, VisXYContainer } from '@unovis/vue'
import type { ChartConfig } from '@/components/ui/chart'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  componentToString,
} from '@/components/ui/chart'

type GipDataPoint = {
  month: string
  value: number
}

const chartConfig: ChartConfig = {
  value: {
    label: 'Interns',
    color: 'hsl(var(--primary))',
  },
}

const data: GipDataPoint[] = [
  { month: 'Jan', value: 12 },
  { month: 'Feb', value: 18 },
  { month: 'Mar', value: 15 },
  { month: 'Apr', value: 22 },
  { month: 'May', value: 28 },
  { month: 'Jun', value: 24 },
]
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Government Internship Program</h1>
        <p class="text-sm text-muted-foreground">
          Government Internship Program (GIP) monitoring and management dashboard.
        </p>
      </div>
    </div>

    <ChartContainer :config="chartConfig" class="min-h-80">
      <VisXYContainer :data="data">
        <VisGroupedBar :x="(d: GipDataPoint) => d.month" :y="(d: GipDataPoint) => d.value" />
        <ChartTooltip :template="componentToString(chartConfig, ChartTooltipContent)" />
      </VisXYContainer>
    </ChartContainer>
  </div>
</template>