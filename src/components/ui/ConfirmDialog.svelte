<script lang="ts">
  import {
    closeConfirm,
    confirmCurrent,
    confirmDialog,
  } from '@/utils/confirm.svelte'

  import Dialog from '../ui/Dialog.svelte'
</script>

<Dialog
  id="global-confirm-dialog"
  isOpen={confirmDialog.isOpen}
  title={confirmDialog.title}
  message={confirmDialog.message}
  onConfirm={confirmCurrent}
  onClose={closeConfirm}
/>
