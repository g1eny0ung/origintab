<script lang="ts">
  import { CircleQuestionMark } from '@lucide/svelte'

  let {
    children,
    legend,
    tooltip,
    error,
    hint,
  }: {
    children: any
    legend?: string
    tooltip?: string
    error?: string
    hint?: string
  } = $props()
</script>

<fieldset class="fieldset">
  {#if legend}
    {#if tooltip}
      <div class="flex items-center gap-1">
        <legend class="fieldset-legend">{legend}</legend>
        <div class="tooltip tooltip-right" data-tip={tooltip}>
          <CircleQuestionMark class="w-4 h-4 mt-1" />
        </div>
      </div>
    {:else}
      <legend class="fieldset-legend">{legend}</legend>
    {/if}
  {/if}
  {@render children?.()}
  {#if error}
    <p class="label text-error">{error}</p>
  {:else if hint}
    <p class="label text-wrap">{hint}</p>
  {/if}
</fieldset>
