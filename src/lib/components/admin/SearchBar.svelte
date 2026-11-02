<script lang="ts">
  import type { Snippet } from "svelte"
  let {
    q = "",
    placeholder = "Search…",
    children,
  }: { q?: string; placeholder?: string; children?: Snippet } = $props()
</script>

<form method="GET" class="flex flex-wrap gap-2 mb-4" data-sveltekit-keepfocus>
  <label class="input input-sm grow max-w-md">
    <svg
      class="h-4 w-4 opacity-50"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      aria-hidden="true"
      ><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg
    >
    <input
      type="search"
      name="q"
      value={q}
      {placeholder}
      maxlength="100"
      aria-label="Search"
    />
  </label>
  {@render children?.()}
  <button class="btn btn-sm">Search</button>
</form>
