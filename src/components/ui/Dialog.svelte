<script lang="ts">
  let {
    id,
    children,
    disableConfirm,
    onConfirm,
    onClose,
  }: {
    id: string
    children: () => any
    disableConfirm?: boolean
    onConfirm?: () => void | null | Promise<void | null>
    onClose?: () => void
  } = $props()

  let dialog: HTMLDialogElement
</script>

<dialog {id} class="modal" bind:this={dialog} onclose={onClose}>
  <div class="modal-box max-w-2xl">
    {@render children?.()}
    <div class="modal-action">
      <button
        class="btn btn-ghost"
        onclick={() => {
          dialog.close()
        }}
      >
        {browser.i18n.getMessage('cancel')}
      </button>
      <button
        class="btn btn-primary"
        disabled={disableConfirm}
        onclick={async () => {
          const result = await onConfirm?.()
          if (result === null) {
            return
          }

          dialog.close()
        }}
      >
        {browser.i18n.getMessage('confirm')}
      </button>
    </div>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button>close</button>
  </form>
</dialog>
