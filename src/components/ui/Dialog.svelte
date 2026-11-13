<script lang="ts">
  let {
    id,
    isOpen = false,
    children,
    title,
    message,
    confirmDisabled = false,
    onConfirm,
    onClose,
  }: {
    id: string
    isOpen?: boolean
    children?: () => any
    title?: string
    message?: string
    confirmDisabled?: boolean
    onConfirm?: () => void | null | Promise<void | null>
    onClose?: () => void
  } = $props()

  let dialog: HTMLDialogElement
  let confirming = $state(false)

  $effect(() => {
    if (!dialog) {
      return
    }

    if (isOpen && !dialog.open) {
      dialog.showModal()
    }

    if (!isOpen && dialog.open) {
      dialog.close()
    }
  })
</script>

<dialog
  {id}
  class="modal"
  bind:this={dialog}
  closedby={confirming ? 'none' : 'closerequest'}
  onclose={onClose}
  oncancel={(event) => {
    if (confirming) {
      event.preventDefault()
    }
  }}
>
  <div class="modal-box max-w-xl">
    {#if title}
      <h2 class="text-lg font-semibold">{title}</h2>
    {/if}
    {#if message}
      <p class="mt-4 text-sm">
        {message}
      </p>
    {/if}
    {@render children?.()}
    <div class="modal-action">
      <button
        class="btn btn-ghost"
        disabled={confirming}
        onclick={() => {
          dialog.close()
        }}
      >
        {browser.i18n.getMessage('cancel')}
      </button>
      <button
        class="btn btn-primary"
        disabled={confirmDisabled || confirming}
        onclick={async () => {
          if (confirming) {
            return
          }

          confirming = true
          try {
            const result = await onConfirm?.()
            if (result !== null) {
              dialog.close()
            }
          } finally {
            confirming = false
          }
        }}
      >
        {browser.i18n.getMessage('confirm')}
      </button>
    </div>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button disabled={confirming}>close</button>
  </form>
</dialog>
