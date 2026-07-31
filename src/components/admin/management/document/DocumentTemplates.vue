<script setup lang="ts">
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Edit,
  Plus,
  Search,
  RefreshCw,
  Loader2,
} from '@lucide/vue'

import { useDocumentTemplates } from '@/composables/admin/useDocumentTemplates'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'

const {
  filteredTemplates,
  isLoading,
  isSubmitting,
  searchQuery,
  selectedCategory,
  selectedTargetRole,
  categories,
  targetRoles,
  isFormModalOpen,
  isDeleteModalOpen,
  editingTemplate,
  deletingTemplate,

  formTitle,
  formDescription,
  formCategory,
  formTargetRole,
  formIsActive,
  selectedFile,
  fileInputRef,
  loadTemplates,
  openCreateModal,
  openEditModal,
  openDeleteModal,
  handleFileChange,
  handleSaveTemplate,
  handleDeleteTemplate,
  toggleStatus,
  downloadTemplate,
  formatBytes,
  formatDate,
} = useDocumentTemplates()
</script>

<template>
  <div class="w-full min-w-0 space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Document Templates</h1>
        <p class="text-sm text-muted-foreground">
          Upload and manage downloadable document templates for applicants, employers, and system users.
        </p>
      </div>
    </div>

    <!-- Filters & Toolbar -->
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-4">
      <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto flex-1 max-w-4xl">
        <div class="relative w-full sm:w-72">
          <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            type="search"
            placeholder="Search templates or files..."
            class="pl-8"
          />
        </div>

        <!-- Category Filter -->
        <Select v-model="selectedCategory">
          <SelectTrigger class="w-full sm:w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem v-for="cat in categories" :key="cat" :value="cat">
              {{ cat }}
            </SelectItem>
          </SelectContent>
        </Select>

        <!-- Role Filter -->
        <Select v-model="selectedTargetRole">
          <SelectTrigger class="w-full sm:w-40">
            <SelectValue placeholder="Target Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="role in targetRoles" :key="role.value" :value="role.value">
              {{ role.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="flex items-center gap-2">
        <Button variant="outline" @click="loadTemplates" :disabled="isLoading">
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
          <span class="hidden sm:inline ml-2">Refresh</span>
        </Button>
        <Button @click="openCreateModal">
          <Plus class="h-4 w-4" />
          <span class="hidden sm:inline ml-2">Upload Template</span>
        </Button>
      </div>
    </div>

    <!-- Standalone Empty Component when no templates available -->
    <div v-if="!isLoading && filteredTemplates.length === 0" class="rounded-md border bg-card p-8">
      <Empty class="border-0 shadow-none">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileText class="h-6 w-6 text-muted-foreground" />
          </EmptyMedia>
          <EmptyTitle>No document templates available</EmptyTitle>
          <EmptyDescription>
            There are currently no document templates matching your criteria. Upload a new template to get started.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent class="mt-4 flex justify-center">
          <Button @click="openCreateModal">
            <Plus class="mr-2 h-4 w-4" />
            Upload Template
          </Button>
        </EmptyContent>
      </Empty>
    </div>

    <!-- Templates Table -->
    <div v-else class="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Target Role</TableHead>
            <TableHead>File</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead class="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="isLoading">
            <TableCell colspan="8" class="h-32 text-center">
              <div class="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 class="h-5 w-5 animate-spin" />
                <span>Loading document templates...</span>
              </div>
            </TableCell>
          </TableRow>

          <TableRow v-for="tmpl in filteredTemplates" :key="tmpl.id">
            <TableCell class="font-medium">
              <div class="flex items-center gap-2">
                <FileText class="h-4 w-4 text-primary shrink-0" />
                <span class="font-semibold">{{ tmpl.title }}</span>
              </div>
            </TableCell>
            <TableCell>
              <span v-if="tmpl.description" class="text-xs text-muted-foreground line-clamp-2 max-w-48">
                {{ tmpl.description }}
              </span>
              <span v-else class="text-xs text-muted-foreground italic">—</span>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{{ tmpl.category || 'General' }}</Badge>
            </TableCell>
            <TableCell class="capitalize">
              {{ tmpl.target_role || 'All Users' }}
            </TableCell>
            <TableCell>
              <div v-if="tmpl.file_name" class="text-xs">
                <div class="font-mono truncate max-w-36">{{ tmpl.file_name }}</div>
                <div class="text-muted-foreground">{{ formatBytes(tmpl.file_size) }} · {{ tmpl.mime_type?.split('/').pop() || '—' }}</div>
              </div>
              <span v-else class="text-xs text-muted-foreground italic">No file</span>
            </TableCell>
            <TableCell>
              <button @click="toggleStatus(tmpl)" class="cursor-pointer">
                <Badge :variant="tmpl.is_active ? 'default' : 'secondary'">
                  {{ tmpl.is_active ? 'Active' : 'Inactive' }}
                </Badge>
              </button>
            </TableCell>
            <TableCell class="text-xs text-muted-foreground whitespace-nowrap">
              {{ formatDate(tmpl.created_at) }}
            </TableCell>
            <TableCell class="text-right">
              <div class="flex items-center justify-end gap-1">
                <Button
                  v-if="tmpl.file_path"
                  variant="ghost"
                  size="icon"
                  title="Download File"
                  @click="downloadTemplate(tmpl)"
                >
                  <Download class="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Edit Template"
                  @click="openEditModal(tmpl)"
                >
                  <Edit class="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  class="text-destructive hover:text-destructive"
                  title="Delete Template"
                  @click="openDeleteModal(tmpl)"
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Create / Edit Dialog -->
    <Dialog :open="isFormModalOpen" @update:open="isFormModalOpen = $event">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{{ editingTemplate ? 'Edit Template' : 'Upload Document Template' }}</DialogTitle>
          <DialogDescription>
            {{ editingTemplate ? 'Update document template details or replace the attached file.' : 'Fill in template details and upload the file.' }}
          </DialogDescription>
        </DialogHeader>

        <form @submit.prevent="handleSaveTemplate" class="space-y-4 py-2">
          <!-- title -->
          <div class="space-y-2">
            <Label for="title">Title <span class="text-destructive">*</span></Label>
            <Input id="title" v-model="formTitle" placeholder="e.g., Standard Application Form" required />
          </div>

          <!-- description -->
          <div class="space-y-2">
            <Label for="description">Description</Label>
            <Textarea id="description" v-model="formDescription" placeholder="Brief description of when to use this template..." rows="3" />
          </div>

          <!-- category + target_role -->
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="category">Category</Label>
              <Select v-model="formCategory">
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="cat in categories" :key="cat" :value="cat">
                    {{ cat }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="space-y-2">
              <Label for="target_role">Target Role</Label>
              <Select v-model="formTargetRole">
                <SelectTrigger id="target_role">
                  <SelectValue placeholder="Target Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="role in targetRoles" :key="role.value" :value="role.value">
                    {{ role.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <!-- is_active -->
          <div class="flex items-center justify-between rounded-lg border p-3">
            <div class="space-y-0.5">
              <Label for="is_active" class="cursor-pointer">Active Status</Label>
              <p class="text-xs text-muted-foreground">
                When active, this template will be visible and available for download.
              </p>
            </div>
            <Switch
              id="is_active"
              :checked="formIsActive"
              @update:checked="formIsActive = $event"
            />
          </div>

          <!-- file upload -->
          <div class="space-y-2">
            <Label for="file">Template File {{ editingTemplate ? '(Optional — replaces current)' : '' }}<span v-if="!editingTemplate" class="text-destructive"> *</span></Label>
            <div class="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors" @click="fileInputRef?.click()">
              <input
                ref="fileInputRef"
                id="file"
                type="file"
                class="hidden"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                @change="handleFileChange"
              />
              <Upload class="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <div v-if="selectedFile" class="text-sm font-medium text-primary">
                {{ selectedFile.name }} ({{ formatBytes(selectedFile.size) }})
              </div>
              <div v-else-if="editingTemplate?.file_name" class="text-sm text-muted-foreground">
                Current: <span class="font-medium text-foreground">{{ editingTemplate.file_name }}</span> · Click to replace
              </div>
              <div v-else class="text-sm text-muted-foreground">
                Click to browse or drop file here (PDF, DOC, DOCX, PNG, JPG)
              </div>
            </div>
          </div>

          <DialogFooter class="pt-4">
            <Button type="button" variant="outline" @click="isFormModalOpen = false">Cancel</Button>
            <Button type="submit" :disabled="isSubmitting">
              <Loader2 v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
              {{ editingTemplate ? 'Update Template' : 'Upload Template' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog :open="isDeleteModalOpen" @update:open="isDeleteModalOpen = $event">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Template</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <span class="font-semibold text-foreground">{{ deletingTemplate?.title }}</span>? This will permanently remove the template and its stored file.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="pt-4">
          <Button variant="outline" @click="isDeleteModalOpen = false">Cancel</Button>
          <Button variant="destructive" :disabled="isSubmitting" @click="handleDeleteTemplate">
            <Loader2 v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>