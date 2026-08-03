<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Eye } from '@lucide/vue'
import { useRoute, useRouter } from 'vue-router'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { useMunicipalityData } from '@/composables/admin/useMunicipalityData'

const route = useRoute()
const router = useRouter()
const rawId = (route.params.id ?? '') as string
const municipalityParam = decodeURIComponent(rawId)

const { municipality, barangayRows, isLoading, loadData } = useMunicipalityData(municipalityParam)

const showLoadingRow = computed(() => isLoading.value && barangayRows.value.length === 0)
const tableRows = computed(() =>
	barangayRows.value.map((row) => ({
		barangay: row.name,
		totalUsers: row.users,
		lowLand: '—',
		upLand: '—',
		actionLabel: 'View',
	}))
)

onMounted(() => {
  void loadData()
})

function goBack() {
  router.back()
}
</script>

<template>
	<div class="flex h-[calc(100vh-7.5rem)] flex-col gap-4">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="space-y-1">
				<h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{{ municipality }}</h1>
				<p class="text-sm text-muted-foreground">Barangays and user counts for this municipality.</p>
			</div>

			<div class="flex items-center gap-2">
				<Button variant="ghost" @click="goBack">Back</Button>
				<Button variant="outline" :disabled="isLoading" @click="loadData">
					Refresh
				</Button>
			</div>
		</div>

		<div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-background shadow-sm">
			<div class="min-h-0 flex-1 overflow-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Barangay</TableHead>
							<TableHead class="text-right">Total Users</TableHead>
							<TableHead class="text-center">LowLand</TableHead>
							<TableHead class="text-center">UpLand</TableHead>
							<TableHead class="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>

					<TableBody>
						<template v-if="showLoadingRow">
							<TableRow>
								<TableCell colspan="5" class="h-24 text-center text-muted-foreground">
									Loading barangay data...
								</TableCell>
							</TableRow>
						</template>

						<template v-else-if="tableRows.length">
							<TableRow v-for="row in tableRows" :key="row.barangay">
								<TableCell class="font-medium">{{ row.barangay }}</TableCell>
								<TableCell class="text-right">{{ row.totalUsers }}</TableCell>
								<TableCell class="text-center text-muted-foreground">{{ row.lowLand }}</TableCell>
								<TableCell class="text-center text-muted-foreground">{{ row.upLand }}</TableCell>
								<TableCell class="text-right">
									<Button size="sm" variant="ghost" disabled>
										<Eye class="h-4 w-4" />
										<span class="ml-2">{{ row.actionLabel }}</span>
									</Button>
								</TableCell>
							</TableRow>
						</template>

						<TableRow v-else>
							<TableCell colspan="5" class="h-24 text-center text-muted-foreground">
								No barangay data available.
							</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</div>
		</div>
	</div>
</template>