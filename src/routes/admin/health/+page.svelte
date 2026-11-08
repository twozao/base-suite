<script lang="ts">
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  let { data } = $props()
</script>

<PageHeader
  title="Site health"
  subtitle="What is set up, and what needs attention."
/>
<ul class="space-y-2 max-w-3xl mb-8">
  {#each data.checks as c (c.label)}
    <li
      class="flex items-start gap-3 rounded-box border border-base-300 bg-base-100 p-3"
    >
      <span
        class="badge badge-sm mt-0.5 {c.ok ? 'badge-success' : 'badge-warning'}"
        >{c.ok ? "OK" : "Check"}</span
      >
      <span
        ><strong class="text-sm">{c.label}</strong><br /><span
          class="text-sm opacity-70">{c.detail}</span
        ></span
      >
    </li>
  {/each}
</ul>
<dl class="grid max-w-3xl grid-cols-[14rem_1fr] gap-y-1 text-sm">
  {#each data.facts as [k, v] (k)}<dt class="opacity-60">{k}</dt>
    <dd>{v}</dd>{/each}
</dl>
