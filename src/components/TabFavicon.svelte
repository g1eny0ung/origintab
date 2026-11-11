<script lang="ts">
  import { urlHostname } from '~/utils/helpers'
  import type { TabItem } from '~/utils/types'

  let { tab }: { tab: Pick<TabItem, 'favicon' | 'url'> } = $props()

  let src = $derived(
    tab.favicon ||
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(urlHostname(tab.url))}&sz=32`,
  )
</script>

<span class="favicon-container">
  <img
    {src}
    alt=""
    width="16"
    height="16"
    loading="lazy"
    onerror={(event) =>
      ((event.currentTarget as HTMLImageElement).style.display = 'none')}
  />
</span>
