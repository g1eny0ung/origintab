export let toasts = $state<{
  value: {
    id: number
    message: string
    type: ToastType
  }[]
}>({
  value: [],
})

export function showToast(message: string, type: ToastType = 'success') {
  const id = Date.now()
  toasts.value = [...toasts.value, { id, message, type }]
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 3000)
}
