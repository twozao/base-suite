<script lang="ts">
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import { formatDate } from "$lib/format"
  let { data } = $props()
  const max = $derived(Math.max(1, ...data.series.map((d) => d.views)))
  const W = 720
  const H = 180
  const bar = $derived(W / data.series.length)
</script>

<PageHeader
  title="Analytics"
  subtitle="Cookie-free page views. No personal data is collected; visitors with Do Not Track are not counted."
>
  {#snippet actions()}
    <div class="join">
      {#each data.ranges as r}<a
          class="join-item btn btn-sm {data.days === r ? 'btn-active' : ''}"
          href="?days={r}">{r} days</a
        >{/each}
    </div>
  {/snippet}
</PageHeader>

<div
  class="stats stats-vertical sm:stats-horizontal bg-base-100 border border-base-300 mb-6 w-full"
>
  <div class="stat">
    <div class="stat-title">Page views ({data.days} days)</div>
    <div class="stat-value text-3xl">{data.total.toLocaleString()}</div>
    {#if data.trend !== null}<div
        class="stat-desc {data.trend >= 0 ? 'text-success' : 'text-error'}"
      >
        {data.trend >= 0 ? "up" : "down"}
        {Math.abs(data.trend)}% vs previous half
      </div>{/if}
  </div>
  <div class="stat">
    <div class="stat-title">Daily average</div>
    <div class="stat-value text-3xl">
      {Math.round(data.total / data.days).toLocaleString()}
    </div>
  </div>
</div>

<section class="card bg-base-100 border border-base-300 mb-6">
  <div class="card-body">
    <h2 class="card-title text-base">Views per day</h2>
    <svg
      viewBox="0 0 {W} {H + 20}"
      class="w-full h-auto"
      role="img"
      aria-label="Page views per day for the last {data.days} days"
    >
      {#each data.series as d, i (d.day)}
        {@const h = (d.views / max) * H}
        <rect
          x={i * bar + 1}
          y={H - h}
          width={Math.max(1, bar - 2)}
          height={h}
          rx="2"
          class="fill-primary/80 hover:fill-primary"
          ><title>{formatDate(d.day)}: {d.views} views</title></rect
        >
      {/each}
      <line x1="0" y1={H} x2={W} y2={H} class="stroke-base-300" />
      <text x="0" y={H + 15} class="fill-base-content/50 text-[11px]"
        >{formatDate(data.series[0]?.day)}</text
      >
      <text
        x={W}
        y={H + 15}
        text-anchor="end"
        class="fill-base-content/50 text-[11px]"
        >{formatDate(data.series.at(-1)?.day)}</text
      >
    </svg>
  </div>
</section>

<div class="grid gap-6 lg:grid-cols-2">
  {#each [["Top pages", data.topPages, true], ["Top referrers", data.topReferrers, false]] as [title, rows, isPath]}
    {@const list = rows as { key: string; views: number }[]}
    {@const top = Math.max(1, ...list.map((r) => r.views))}
    <section class="card bg-base-100 border border-base-300">
      <div class="card-body">
        <h2 class="card-title text-base">{title}</h2>
        <ul class="space-y-1">
          {#each list as r (r.key)}
            <li
              class="relative flex justify-between gap-3 rounded px-2 py-1.5 text-sm"
            >
              <span
                class="absolute inset-y-0 left-0 rounded bg-primary/10"
                style="width:{(r.views / top) * 100}%"
              ></span>
              {#if isPath}<a
                  class="relative truncate link-hover"
                  href={r.key}
                  target="_blank">{r.key}</a
                >{:else}<span class="relative truncate">{r.key}</span>{/if}
              <span class="relative tabular-nums"
                >{r.views.toLocaleString()}</span
              >
            </li>
          {:else}
            <li class="text-sm text-base-content/60">No data yet.</li>
          {/each}
        </ul>
      </div>
    </section>
  {/each}
</div>
