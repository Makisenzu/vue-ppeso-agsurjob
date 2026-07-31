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
  CheckCircle2,
} from '@lucide/vue'

import { useDocumentTemplates } from '@/composables/admin/useDocumentTemplates'

import { Button } from '@/components/ui/button'
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

const {
  filteredTemplates,
  isLoading,
  isSubmitting,
  errorMessage,
  successMessage,
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
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" @click="loadTemplates" :disabled="isLoading">
          <RefreshCw :class="['mr-2 h-4 w-4', isLoading ? 'animate-spin' : '']" />
          Refresh
        </Button>
        <Button size="sm" @click="openCreateModal">
          <Plus class="mr-2 h-4 w-4" />
          Upload Template
        </Button>
      </div>
    </div>

    <!-- Alert Notifications -->
    <div v-if="errorMessage" class="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
      
      <span>{{ errorMessage }}</span>
    </div>

    <div v-if="successMessage" class="flex items-center gap-2 rounded-md bg-emerald-500/15 p-3 text-sm text-emerald-600 dark:text-emerald-400">
      <CheckCircle2 class="h-4 w-4 shrink-0" />
      <span>{{ successMessage }}</span>
    </div>

    <!-- Filters & Search -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="relative w-full sm:w-72">
        <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          v-model="searchQuery"
          type="search"
          placeholder="Search templates or files..."
          class="pl-8"
        />
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <!-- Category Filter -->
        <Select v-model="selectedCategory">
          <SelectTrigger class="w-37.5">
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
          <SelectTrigger class="w-37.5">
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

    <!-- Templates Table -->
    <div class="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Template Title</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Target Role</TableHead>
            <TableHead>File</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead class="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="isLoading">
            <TableCell colspan="7" class="h-32 text-center">
              <div class="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 class="h-5 w-5 animate-spin" />
                <span>Loading document templates...</span>
              </div>
            </TableCell>
          </TableRow>

          <TableRow v-else-if="filteredTemplates.length === 0">
            <TableCell colspan="7" class="h-32 text-center text-muted-foreground">
              No document templates found.
            </TableCell>
          </TableRow>

          <TableRow v-for="tmpl in filteredTemplates" :key="tmpl.id">
            <TableCell class="font-medium">
              <div class="flex items-center gap-2">
                <FileText class="h-4 w-4 text-primary shrink-0" />
                <div>
                  <div class="font-semibold">{{ tmpl.title }}</div>
                  <div v-if="tmpl.description" class="text-xs text-muted-foreground line-clamp-1">
                    {{ tmpl.description }}
                  </div>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{{ tmpl.category || 'General' }}</Badge>
            </TableCell>
            <TableCell class="capitalize">
              {{ tmpl.target_role || 'All Users' }}
            </TableCell>
            <TableCell>
              <div v-if="tmpl.file_name" class="text-xs">
                <div class="font-mono text-xs truncate max-w-37.5">{{ tmpl.file_name }}</div>
                <div class="text-muted-foreground">{{ formatBytes(tmpl.file_size) }}</div>
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
            <TableCell class="text-xs text-muted-foreground">
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
      <DialogContent class="sm:max-w-37.5">
        <DialogHeader>
          <DialogTitle>{{ editingTemplate ? 'Edit Template' : 'Upload Document Template' }}</DialogTitle>
          <DialogDescription>
            {{ editingTemplate ? 'Update document template details or replace the attached file.' : 'Fill in template details and upload the file.' }}
          </DialogDescription>
        </DialogHeader>

        <form @submit.prevent="handleSaveTemplate" class="space-y-4 py-2">
          <div class="space-y-2">
            <Label for="title">Title *</Label>
            <Input id="title" v-model="formTitle" placeholder="e.g., Standard Application Form" required />
          </div>

          <div class="space-y-2">
            <Label for="description">Description</Label>
            <Textarea id="description" v-model="formDescription" placeholder="Brief description of when to use this template..." rows="3" />
          </div>

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

          <div class="space-y-2">
            <Label for="file">Template File {{ editingTemplate ? '(Optional if replacing)' : '*' }}</Label>
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
                Current: <span class="font-medium text-foreground">{{ editingTemplate.file_name }}</span> (Click to replace)
              </div>
              <div v-else class="text-sm text-muted-foreground">
                Click to browse or drop file here (PDF, DOCX, PNG, JPG)
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
      <DialogContent class="sm:max-w-37.5">
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