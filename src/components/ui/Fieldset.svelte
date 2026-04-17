<script lang="ts">
  let {
    children,
    legend,
    error,
    hint,
  }: {
    children: any
    legend?: string
    error?: string
    hint?: string
  } = $props()
</script>

<fieldset class="fieldset">
  {#if legend}
    <legend class="fieldset-legend">{legend}</legend>
  {/if}
  {@render children?.()}
  {#if error}
    <p class="label text-error">{error}</p>
  {:else if hint}
    <p class="label text-wrap">{hint}</p>
  {/if}
</fieldset>
