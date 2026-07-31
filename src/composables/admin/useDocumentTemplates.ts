import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useDocumentTemplateStore } from '@/stores/admin/documentTemplateStore'
import type { DocumentTemplateRow } from '@/types/admin/documentTemplate'

export function useDocumentTemplates() {
  const store = useDocumentTemplateStore()
  const { templates, isLoading, isSubmitting, errorMessage, successMessage } = storeToRefs(store)
  const { loadTemplates, saveTemplate, removeTemplate, toggleStatus, downloadTemplate } = store

  // Filtering
  const searchQuery = ref<string>('')
  const selectedCategory = ref<string>('all')
  const selectedTargetRole = ref<string>('all')

  // Modal state
  const isFormModalOpen = ref<boolean>(false)
  const isDeleteModalOpen = ref<boolean>(false)
  const editingTemplate = ref<DocumentTemplateRow | null>(null)
  const deletingTemplate = ref<DocumentTemplateRow | null>(null)

  // Drag & Drop State
  const isDraggingOverPage = ref(false)
  const isDraggingOverModal = ref(false)

  // Counters to track nested DOM elements during drag events cleanly
  let pageDragCounter = 0
  let modalDragCounter = 0

  // Form state
  const formTitle = ref<string>('')
  const formDescription = ref<string>('')
  const formCategory = ref<string>('General')
  const formTargetRole = ref<string>('all')
  const formIsActive = ref<boolean>(true)
  const selectedFile = ref<File | null>(null)
  const fileInputRef = ref<HTMLInputElement | null>(null)

  const categories = ['Requirements', 'Forms', 'Guidelines', 'Contracts', 'General']
  const targetRoles = [
    { value: 'all', label: 'All Users' },
    { value: 'applicant', label: 'Applicants' },
    { value: 'employer', label: 'Employers' },
    { value: 'admin', label: 'Admins' },
  ]

  const isFiltered = computed(() => {
    return (
      searchQuery.value.trim() !== '' ||
      selectedCategory.value !== 'all' ||
      selectedTargetRole.value !== 'all'
    )
  })

  const filteredTemplates = computed(() => {
    return templates.value.filter((tmpl) => {
      const matchesSearch =
        tmpl.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        (tmpl.description && tmpl.description.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
        (tmpl.file_name && tmpl.file_name.toLowerCase().includes(searchQuery.value.toLowerCase()))

      const matchesCategory =
        selectedCategory.value === 'all' || tmpl.category === selectedCategory.value

      const matchesRole =
        selectedTargetRole.value === 'all' || tmpl.target_role === selectedTargetRole.value

      return matchesSearch && matchesCategory && matchesRole
    })
  })

  function openCreateModal(initialFile: File | null = null) {
    editingTemplate.value = null
    formTitle.value = initialFile ? initialFile.name.replace(/\.[^/.]+$/, '') : ''
    formDescription.value = ''
    formCategory.value = 'General'
    formTargetRole.value = 'all'
    formIsActive.value = true
    selectedFile.value = initialFile

    if (fileInputRef.value) fileInputRef.value.value = ''
    isFormModalOpen.value = true
  }

  function openEditModal(tmpl: DocumentTemplateRow) {
    editingTemplate.value = tmpl
    formTitle.value = tmpl.title
    formDescription.value = tmpl.description || ''
    formCategory.value = tmpl.category || 'General'
    formTargetRole.value = tmpl.target_role || 'all'
    formIsActive.value = tmpl.is_active ?? true
    selectedFile.value = null
    if (fileInputRef.value) fileInputRef.value.value = ''
    isFormModalOpen.value = true
  }

  function openDeleteModal(tmpl: DocumentTemplateRow) {
    deletingTemplate.value = tmpl
    isDeleteModalOpen.value = true
  }

  function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement
    if (target.files && target.files.length > 0) {
      selectedFile.value = target.files[0]
      if (!formTitle.value) {
        formTitle.value = target.files[0].name.replace(/\.[^/.]+$/, '')
      }
    }
  }

  // Counter-based Page Drag & Drop Handlers
  const handlePageDragEnter = (e: DragEvent) => {
    e.preventDefault()
    pageDragCounter++
    if (e.dataTransfer?.types?.includes('Files')) {
      isDraggingOverPage.value = true
    }
  }

  const handlePageDragLeave = (e: DragEvent) => {
    e.preventDefault()
    pageDragCounter--
    if (pageDragCounter <= 0) {
      pageDragCounter = 0
      isDraggingOverPage.value = false
    }
  }

  const handlePageDragOver = (e: DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy'
    }
  }

  const handlePageDrop = (e: DragEvent) => {
    e.preventDefault()
    pageDragCounter = 0
    isDraggingOverPage.value = false

    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      openCreateModal(files[0])
    }
  }

  // Counter-based Modal Drag & Drop Handlers
  const handleModalDragEnter = (e: DragEvent) => {
    e.preventDefault()
    modalDragCounter++
    isDraggingOverModal.value = true
  }

  const handleModalDragLeave = (e: DragEvent) => {
    e.preventDefault()
    modalDragCounter--
    if (modalDragCounter <= 0) {
      modalDragCounter = 0
      isDraggingOverModal.value = false
    }
  }

  const handleModalDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    modalDragCounter = 0
    isDraggingOverModal.value = false

    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      selectedFile.value = files[0]
      if (!formTitle.value) {
        formTitle.value = files[0].name.replace(/\.[^/.]+$/, '')
      }
    }
  }

  async function handleSaveTemplate() {
    if (!formTitle.value.trim()) return
    if (!editingTemplate.value && !selectedFile.value) return

    const payload = {
      title: formTitle.value.trim(),
      description: formDescription.value.trim() || null,
      category: formCategory.value,
      target_role: formTargetRole.value,
      is_active: formIsActive.value,
    }

    const success = await saveTemplate(
      payload,
      selectedFile.value,
      editingTemplate.value?.id ?? null,
      editingTemplate.value?.file_path ?? null
    )

    if (success) {
      isFormModalOpen.value = false
    }
  }

  async function handleDeleteTemplate() {
    if (!deletingTemplate.value) return

    const success = await removeTemplate(
      deletingTemplate.value.id,
      deletingTemplate.value.file_path
    )

    if (success) {
      isDeleteModalOpen.value = false
      deletingTemplate.value = null
    }
  }

  function getFileExtension(tmpl: { mime_type?: string | null; file_name?: string | null }) {
    if (tmpl.file_name?.includes('.')) {
      return tmpl.file_name.split('.').pop()?.toUpperCase() || ''
    }
    if (!tmpl.mime_type) return ''
    const sub = tmpl.mime_type.split('/').pop() || ''
    if (sub.includes('spreadsheetml') || sub.includes('excel')) return 'XLSX'
    if (sub.includes('wordprocessingml') || sub.includes('word')) return 'DOCX'
    return sub.toUpperCase()
  }

  function formatBytes(bytes?: number | null): string {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  function formatDate(dateStr?: string | null): string {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  onMounted(() => {
    loadTemplates()
  })

  return {
    templates,
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
    isDraggingOverPage,
    isDraggingOverModal,
    isFiltered,
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
    handlePageDragEnter,
    handlePageDragLeave,
    handlePageDragOver,
    handlePageDrop,
    handleModalDragEnter,
    handleModalDragLeave,
    handleModalDrop,
    handleSaveTemplate,
    handleDeleteTemplate,
    getFileExtension,
    toggleStatus,
    downloadTemplate,
    formatBytes,
    formatDate,
  }
}