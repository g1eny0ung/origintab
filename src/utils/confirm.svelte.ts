type ConfirmHandler = () => void | Promise<void>

type ConfirmOptions = {
  title: string
  message: string
  onConfirm: ConfirmHandler
}

export const confirmDialog = $state({
  isOpen: false,
  title: '',
  message: '',
  onConfirm: null as ConfirmHandler | null,
})

export function openConfirm(options: ConfirmOptions) {
  confirmDialog.title = options.title
  confirmDialog.message = options.message
  confirmDialog.onConfirm = options.onConfirm
  confirmDialog.isOpen = true
}

export function closeConfirm() {
  confirmDialog.isOpen = false
  confirmDialog.onConfirm = null
  setTimeout(() => {
    confirmDialog.title = ''
    confirmDialog.message = ''
  }, 300)
}

export async function confirmCurrent() {
  const handler = confirmDialog.onConfirm

  await handler?.()
  closeConfirm()
}
