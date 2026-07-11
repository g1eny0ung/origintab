<script lang="ts">
  import { toasts } from '@/utils/toast.svelte'
  import { CircleCheck, CircleX } from '@lucide/svelte'
</script>

<div class="toast toast-center toast-top z-50">
  {#each toasts.value as toast (toast.id)}
    <div
      role="alert"
      class="alert alert-soft"
      class:alert-success={toast.type === 'success'}
      class:alert-error={toast.type === 'error'}
    >
      {#if toast.type === 'success'}
        <CircleCheck size={16} />
      {:else}
        <CircleX size={16} />
      {/if}
      <span>{toast.message}</span>
    </div>
  {/each}
</div>
