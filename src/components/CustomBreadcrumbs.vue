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

import { formatRouteName } from '@/helpers/common/formatters'

const route = useRoute()
const breadcrumbs = computed(() => {
  return route.matched
    .filter(r => {
      if (r.meta?.breadcrumb === false) return false
      // Include if route has a name OR has an explicit breadcrumb string
      return r.name || typeof r.meta?.breadcrumb === 'string'
    })
    .map((r) => {
      const title = typeof r.meta?.breadcrumb === 'string'
        ? r.meta.breadcrumb
        : typeof r.meta?.title === 'string' 
        ? r.meta.title 
        : formatRouteName(String(r.name))

      const to = r.meta?.breadcrumbTo
        ? r.meta.breadcrumbTo
        : r.path === '/app' ? { name: 'dashboard' } : { name: r.name }

      return { title, to }
    })
})
</script>

<template>
  <Breadcrumb v-if="breadcrumbs.length">
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
