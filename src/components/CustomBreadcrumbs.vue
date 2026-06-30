<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

const route = useRoute()
const breadcrumbs = computed(() => {
  return route.matched
    .filter(r => r.name && r.meta?.breadcrumb !== false)
    .map((r) => {
      const title = typeof r.meta?.title === 'string' 
        ? r.meta.title 
        : String(r.name)
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')

      return {
        title,
        to: r.path === '/app' ? { name: 'dashboard' } : { name: r.name }
      }
    })
})
</script>

<template>
  <Breadcrumb v-if="breadcrumbs.length" class="mb-2">
    <BreadcrumbList>
      <template v-for="(crumb, index) in breadcrumbs" :key="crumb.title">
        <BreadcrumbItem>
          <BreadcrumbPage v-if="index === breadcrumbs.length - 1">
            {{ crumb.title }}
          </BreadcrumbPage>

          <BreadcrumbLink v-else as-child>
            <RouterLink :to="crumb.to">{{ crumb.title }}</RouterLink>
          </BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbSeparator v-if="index < breadcrumbs.length - 1" />
      </template>
    </BreadcrumbList>
  </Breadcrumb>
</template>
