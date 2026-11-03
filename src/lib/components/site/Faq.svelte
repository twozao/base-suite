<script lang="ts">
  let { items }: { items: { q: string; a: string }[] } = $props()
</script>

<div class="divide-y divide-base-300 border-y border-base-300">
  {#each items as item}
    <details class="group py-5">
      <summary
        class="flex cursor-pointer list-none items-center justify-between gap-4 font-medium"
      >
        {item.q}
        <span
          class="text-xl text-base-content/50 transition group-open:rotate-45"
          aria-hidden="true">+</span
        >
      </summary>
      <p class="mt-3 text-base-content/70 leading-relaxed whitespace-pre-line">
        {item.a}
      </p>
    </details>
  {/each}
</div>
