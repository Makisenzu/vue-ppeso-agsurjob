import { h } from 'vue'
import { Eye, Pencil, Trash2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'

interface RowActionHandlers {
  onView?: () => void
  viewLabel?: string
  onEdit: () => void
  onDelete: () => void
}

/**
 * Renders the inline View / Edit / Delete icon buttons shared by the
 * job fair, participant and vacancy data tables.
 */
export function renderRowActions({ onView, viewLabel = 'View', onEdit, onDelete }: RowActionHandlers) {
  const iconButton = (label: string, icon: typeof Eye, onClick: () => void, extraClass = '') =>
    h(
      Button,
      { variant: 'ghost', size: 'icon', class: `size-8 ${extraClass}`, title: label, 'aria-label': label, onClick },
      () => h(icon, { class: 'size-4' })
    )

  return h('div', { class: 'flex items-center justify-end gap-1' }, [
    onView ? iconButton(viewLabel, Eye, onView) : null,
    iconButton('Edit', Pencil, onEdit),
    iconButton('Delete', Trash2, onDelete, 'text-destructive hover:bg-destructive/10 hover:text-destructive'),
  ])
}
