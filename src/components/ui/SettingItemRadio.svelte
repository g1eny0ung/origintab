<script lang="ts">
  let {
    id,
    name,
    title,
    description,
    value,
    checkedValue,
    onChange,
  }: {
    id: string
    name: string
    title: string
    description: string
    value: string
    checkedValue: string
    onChange: (value: any) => void
  } = $props()

  const handleOnChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    onChange(target.value)
  }
</script>

<label
  class="flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 cursor-pointer transition-colors"
  for={id}
>
  <input
    type="radio"
    {id}
    {name}
    class="radio radio-sm radio-primary"
    value={checkedValue}
    checked={value === checkedValue}
    onchange={handleOnChange}
  />
  <div>
    <div class="font-medium">
      {title}
    </div>
    <div class="text-sm text-base-content/60">
      {description}
    </div>
  </div>
</label>
