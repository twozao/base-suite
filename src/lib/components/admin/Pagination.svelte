<script lang="ts">
  import { page as pageStore } from "$app/stores"
  let { page, size, total }: { page: number; size: number; total: number } =
    $props()
  const pages = $derived(Math.max(1, Math.ceil(total / size)))
  const href = (p: number) => {
    const u = new URL($pageStore.url)
    u.searchParams.set("page", String(p))
    return u.pathname + u.search
  }
</script>

{#if pages > 1}
  <nav class="flex items-center justify-between mt-4" aria-label="Pagination">
    <span class="text-sm opacity-70">
      {total} total · page {page} of {pages}
    </span>
    <div class="join">
      <a
        class="join-item btn btn-sm {page <= 1 ? 'btn-disabled' : ''}"
        href={href(page - 1)}
        aria-disabled={page <= 1}>«</a
      >
      <a
        class="join-item btn btn-sm {page >= pages ? 'btn-disabled' : ''}"
        href={href(page + 1)}
        aria-disabled={page >= pages}>»</a
      >
    </div>
  </nav>
{:else if total > 0}
  <p class="text-sm opacity-70 mt-4">{total} total</p>
{/if}
