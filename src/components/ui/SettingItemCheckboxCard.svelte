<script lang="ts">
  import { CircleQuestionMark } from '@lucide/svelte'

  let {
    title,
    description,
    tooltip,
    children,
  }: {
    title?: string
    description?: string
    tooltip?: string
    children: () => any
  } = $props()
</script>

<div class="card bg-base-100 shadow-sm border border-base-200">
  <div class="card-body">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="inline-flex items-center gap-1">
          <span class="font-medium">
            {title}
          </span>
          {#if tooltip}
            <span class="tooltip tooltip-right" data-tip={tooltip}>
              <CircleQuestionMark class="w-4 h-4" />
            </span>
          {/if}
        </h3>
        <p class="text-sm text-base-content/60">
          {description}
        </p>
      </div>
      {@render children?.()}
    </div>
  </div>
</div>
