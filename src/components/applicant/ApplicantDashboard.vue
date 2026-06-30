<script setup lang="ts">
import { ref } from 'vue'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  MapPin,
  Search,
  Star,
  XCircle,
} from '@lucide/vue'

import CustomBreadcrumbs from '@/components/CustomBreadcrumbs.vue'

const profileCompletion = ref(85)

const stats = [
  { label: 'Total Applications', value: '12', icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-500/10 dark:bg-blue-500/20' },
  { label: 'Interviews Scheduled', value: '3', icon: CalendarDays, color: 'text-amber-500', bg: 'bg-amber-500/10 dark:bg-amber-500/20' },
  { label: 'Offers Received', value: '1', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20' },
  { label: 'Rejected', value: '2', icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-500/10 dark:bg-rose-500/20' },
]

const recentApplications = [
  {
    id: 1,
    role: 'Senior Frontend Developer',
    company: 'TechNova Inc.',
    location: 'Remote',
    appliedDate: '2 days ago',
    status: 'Interview',
    statusColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 dark:bg-amber-500/20',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=TN&backgroundColor=0284c7',
  },
  {
    id: 2,
    role: 'Vue.js Engineer',
    company: 'Creative Solutions',
    location: 'New York, NY',
    appliedDate: '5 days ago',
    status: 'In Review',
    statusColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 dark:bg-blue-500/20',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=CS&backgroundColor=8b5cf6',
  },
  {
    id: 3,
    role: 'Full Stack Developer',
    company: 'Global Systems',
    location: 'San Francisco, CA',
    appliedDate: '1 week ago',
    status: 'Offer',
    statusColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/20',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=GS&backgroundColor=10b981',
  },
  {
    id: 4,
    role: 'UI/UX Engineer',
    company: 'Designify',
    location: 'Remote',
    appliedDate: '2 weeks ago',
    status: 'Rejected',
    statusColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 dark:bg-rose-500/20',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=DS&backgroundColor=f43f5e',
  },
]

const recommendedJobs = [
  {
    id: 101,
    role: 'Lead Vue Developer',
    company: 'InnovateTech',
    salary: '$120k - $150k',
    type: 'Full-time',
    match: '95%'
  },
  {
    id: 102,
    role: 'Frontend Architect',
    company: 'CloudScale',
    salary: '$140k - $180k',
    type: 'Remote',
    match: '88%'
  }
]

</script>

<template>
  <div class="flex-1 space-y-6 w-full max-w-7xl mx-auto">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
    <CustomBreadcrumbs />
      <div class="flex items-center gap-3">
        <Button variant="outline" class="gap-2 rounded-xl">
          <Search class="h-4 w-4" />
          Find Jobs
        </Button>
        <Button class="gap-2 rounded-xl shadow-md hover:shadow-lg transition-shadow">
          <FileText class="h-4 w-4" />
          Update Resume
        </Button>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card v-for="(stat, index) in stats" :key="index" class="border-none shadow-sm hover:shadow-md transition-all duration-200 bg-linear-to-br from-card to-muted/20 dark:to-muted/10">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">
            {{ stat.label }}
          </CardTitle>
          <div :class="['p-2 rounded-xl', stat.bg]">
            <component :is="stat.icon" :class="['h-4 w-4', stat.color]" />
          </div>
        </CardHeader>
        <CardContent>
          <div class="text-3xl font-bold">{{ stat.value }}</div>
        </CardContent>
      </Card>
    </div>

    <!-- Main Content Grid -->
    <div class="grid gap-6 md:grid-cols-7 lg:grid-cols-12">
      <!-- Recent Applications -->
      <Card class="md:col-span-4 lg:col-span-8 border-none shadow-sm bg-linear-to-b from-card to-muted/5">
        <CardHeader class="flex flex-row items-center justify-between pb-4 border-b border-border/40">
          <div>
            <CardTitle class="text-xl">Recent Applications</CardTitle>
            <CardDescription class="mt-1.5">You have applied to 12 jobs this month.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" class="gap-1 text-primary hover:text-primary/80 hover:bg-primary/10 rounded-full">
            View All
            <ChevronRight class="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent class="p-0">
          <div class="divide-y divide-border/40">
            <div 
              v-for="app in recentApplications" 
              :key="app.id"
              class="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors group cursor-pointer"
            >
              <div class="flex items-center gap-5">
                <Avatar class="h-12 w-12 border border-border shadow-sm group-hover:scale-105 group-hover:shadow-md transition-all">
                  <AvatarImage :src="app.logo" :alt="app.company" />
                  <AvatarFallback>{{ app.company.substring(0, 2) }}</AvatarFallback>
                </Avatar>
                <div class="space-y-1">
                  <p class="font-semibold text-foreground/90 group-hover:text-primary transition-colors">
                    {{ app.role }}
                  </p>
                  <div class="flex flex-wrap items-center text-sm text-muted-foreground gap-3">
                    <span class="flex items-center gap-1.5">
                      <Building2 class="h-3.5 w-3.5" />
                      {{ app.company }}
                    </span>
                    <span class="hidden sm:flex items-center gap-1.5">
                      <MapPin class="h-3.5 w-3.5" />
                      {{ app.location }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-5">
                <div class="hidden md:flex flex-col items-end gap-1 text-sm text-muted-foreground">
                  <span class="flex items-center gap-1.5">
                    <Clock class="h-3.5 w-3.5" />
                    {{ app.appliedDate }}
                  </span>
                </div>
                <Badge variant="secondary" :class="['px-3 py-1 rounded-full font-medium border-0', app.statusColor]">
                  {{ app.status }}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Sidebar Area -->
      <div class="md:col-span-3 lg:col-span-4 space-y-6">
        <!-- Profile Completion -->
        <Card class="border-none shadow-sm relative overflow-hidden group">
          <div class="absolute inset-0 bg-linear-to-br from-primary/5 via-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardHeader class="relative z-10 pb-3">
            <CardTitle class="text-lg flex items-center justify-between">
              Profile Strength
              <span class="text-primary font-bold">{{ profileCompletion }}%</span>
            </CardTitle>
            <CardDescription>Complete your profile to stand out.</CardDescription>
          </CardHeader>
          <CardContent class="relative z-10 space-y-5">
            <Progress :model-value="profileCompletion" class="h-2.5 rounded-full" />
            <ul class="space-y-3 pt-1 text-sm">
              <li class="flex items-center gap-3 text-muted-foreground">
                <div class="bg-primary/10 p-1 rounded-full">
                  <CheckCircle2 class="h-3.5 w-3.5 text-primary" />
                </div>
                <span class="font-medium text-foreground/80">Upload Resume</span>
              </li>
              <li class="flex items-center gap-3 text-muted-foreground">
                <div class="bg-primary/10 p-1 rounded-full">
                  <CheckCircle2 class="h-3.5 w-3.5 text-primary" />
                </div>
                <span class="font-medium text-foreground/80">Add Work Experience</span>
              </li>
              <li class="flex items-center gap-3 text-muted-foreground group-hover:text-foreground/80 transition-colors">
                <div class="p-1 rounded-full border border-dashed border-muted-foreground/50 flex items-center justify-center">
                  <div class="h-3.5 w-3.5 rounded-full bg-transparent flex items-center justify-center">
                    <div class="h-1.5 w-1.5 rounded-full bg-muted-foreground/40"></div>
                  </div>
                </div>
                <span>Add Portfolio Links</span>
              </li>
            </ul>
            <Button class="w-full mt-2 rounded-xl" variant="outline">
              Complete Profile
            </Button>
          </CardContent>
        </Card>

        <!-- Recommended Jobs -->
        <Card class="border-none shadow-sm">
          <CardHeader class="pb-3 border-b border-border/40">
            <CardTitle class="text-lg flex items-center gap-2">
              <div class="bg-amber-500/10 p-1.5 rounded-lg">
                <Star class="h-4 w-4 text-amber-500 fill-amber-500" />
              </div>
              Recommended for You
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4 pt-4">
            <div v-for="job in recommendedJobs" :key="job.id" class="group space-y-3 p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer">
              <div class="flex justify-between items-start">
                <div>
                  <h4 class="font-semibold text-sm leading-tight mb-1 group-hover:text-primary transition-colors">{{ job.role }}</h4>
                  <p class="text-xs text-muted-foreground">{{ job.company }}</p>
                </div>
                <Badge variant="outline" class="text-xs bg-primary/10 text-primary border-primary/20 rounded-full font-medium">
                  {{ job.match }} Match
                </Badge>
              </div>
              <div class="flex items-center justify-between text-xs text-muted-foreground pt-1.5">
                <span class="font-medium text-foreground/80 bg-muted/50 px-2 py-1 rounded-md">{{ job.salary }}</span>
                <span class="flex items-center gap-1">
                  <Briefcase class="h-3 w-3" />
                  {{ job.type }}
                </span>
              </div>
            </div>
            <Button variant="ghost" class="w-full text-sm mt-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl">
              See all recommendations
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
