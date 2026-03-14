<script lang="ts">
  let {
    id,
    children,
    onConfirm,
    onClose,
  }: {
    id: string
    children: any
    onConfirm?: () => void
    onClose?: () => void
  } = $props()

  let dialog: HTMLDialogElement
</script>

<dialog {id} class="modal" bind:this={dialog} onclose={onClose}>
  <div class="modal-box">
    {@render children?.()}
    <div class="modal-action">
      <button
        class="btn btn-sm btn-primary"
        onclick={() => {
          const result = onConfirm?.()
          if (result === null) {
            return
          }

          dialog.close()
        }}
      >
        {browser.i18n.getMessage('confirm')}
      </button>
      <button
        class="btn btn-sm"
        onclick={() => {
          dialog.close()
        }}
      >
        {browser.i18n.getMessage('cancel')}
      </button>
    </div>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button>close</button>
  </form>
</dialog>
