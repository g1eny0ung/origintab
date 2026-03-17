<script lang="ts">
  let {
    title,
    description,
    children,
  }: { title: string; description: string; children: () => any } = $props()
</script>

<div class="card bg-base-100 shadow-sm border border-base-300">
  <div class="card-body">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="font-medium">
          {title}
        </h3>
        <p class="text-sm text-base-content/60">
          {description}
        </p>
      </div>
      {@render children?.()}
    </div>
  </div>
</div>
