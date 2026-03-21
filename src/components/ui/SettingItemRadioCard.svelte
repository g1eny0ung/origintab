<script lang="ts">
  import type { Component } from 'svelte'

  let {
    Icon,
    title,
    description,
    children,
  }: {
    Icon: Component
    title: string
    description: string
    children: () => any
  } = $props()
</script>

<div class="card bg-base-100 shadow-sm border border-base-200">
  <div class="card-body">
    <div class="flex items-center gap-2">
      <Icon size={18} aria-hidden="true" />
      <h3 class="font-medium">
        {title}
      </h3>
    </div>
    <p class="text-sm text-base-content/60">
      {description}
    </p>
    <div class="space-y-2">
      {@render children?.()}
    </div>
  </div>
</div>
