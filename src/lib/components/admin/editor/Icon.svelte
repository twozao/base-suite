<script lang="ts">
  let { d, class: cls = "size-4" }: { d: string; class?: string } = $props()
</script>

<svg
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  class={cls}
  aria-hidden="true"><path {d} /></svg
>
