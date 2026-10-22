import { h } from 'vue'
import { Eye, Pencil, Trash2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type { SwipeAction } from '@/components/SwipeRow.vue'

export interface RowActionHandlers {
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

/**
 * The same handlers as swipe actions for the mobile card view (DESIGN.md 13.2). Delete first (primary
 * edge); none collapses the card, since delete is confirmed by an AlertDialog and the rest aren't destructive.
 */
export function toSwipeActions({ onView, viewLabel = 'View', onEdit, onDelete }: RowActionHandlers): SwipeAction[] {
  const actions: SwipeAction[] = [{ id: 'delete', label: 'Delete', icon: Trash2, dismiss: false, onSelect: onDelete }]
  if (onView) actions.push({ id: 'view', label: viewLabel.split(' ')[0], icon: Eye, dismiss: false, onSelect: onView })
  actions.push({ id: 'edit', label: 'Edit', icon: Pencil, dismiss: false, onSelect: onEdit })
  return actions
}
