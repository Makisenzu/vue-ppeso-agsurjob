import { ref } from 'vue'

export interface ToastAlertItem {
  id: number
  variant: 'default' | 'destructive'
  title: string
  description?: string
  type: 'success' | 'error' | 'info'
}

const alerts = ref<ToastAlertItem[]>([])
let nextId = 0

function addAlert(item: Omit<ToastAlertItem, 'id'>, duration = 4000) {
  const id = nextId++
  alerts.value.push({ ...item, id })

  setTimeout(() => {
    removeAlert(id)
  }, duration)
}

function removeAlert(id: number) {
  alerts.value = alerts.value.filter(a => a.id !== id)
}

export function useToastAlert() {
  return {
    alerts,
    success(title: string, description?: string) {
      addAlert({ variant: 'default', title, description, type: 'success' })
    },
    error(title: string, description?: string) {
      addAlert({ variant: 'destructive', title, description, type: 'error' })
    },
    info(title: string, description?: string) {
      addAlert({ variant: 'default', title, description, type: 'info' })
    },
    dismiss(id: number) {
      removeAlert(id)
    },
  }
}
