<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  import { DEAL_STAGES, formatMoney } from "$lib/crm"
  import { formatDate } from "$lib/format"
  let { data, form } = $props()

  const columns = $derived(
    DEAL_STAGES.map((s) => {
      const deals = data.deals.filter((d) => d.stage === s.id)
      const byCur = new Map<string, number>()
      for (const d of deals)
        byCur.set(d.currency, (byCur.get(d.currency) ?? 0) + d.value_cents)
      return {
        ...s,
        deals,
        totals: [...byCur].map(([c, v]) => formatMoney(v, c)).join(" + "),
      }
    }),
  )
</script>

<PageHeader
  title="Deals pipeline"
  subtitle="Move deals through your sales stages. Winning a deal marks the contact as a customer."
>
  {#snippet actions()}
    <a class="btn btn-sm" href={data.showClosed ? "?" : "?closed=1"}
      >{data.showClosed ? "Hide old closed deals" : "Show all closed deals"}</a
    >
    <a class="btn btn-sm" href="/admin/crm">Contacts</a>
  {/snippet}
</PageHeader>
<Flash {form} />

<div class="flex gap-4 overflow-x-auto pb-4">
  {#each columns as col (col.id)}
    <section
      class="w-72 shrink-0 rounded-box bg-base-100 border border-base-300 flex flex-col max-h-[75vh]"
      aria-label={col.label}
    >
      <header class="p-3 border-b border-base-300">
        <div class="flex justify-between font-semibold">
          <span>{col.label}</span><span class="badge badge-ghost"
            >{col.deals.length}</span
          >
        </div>
        <div class="text-xs text-base-content/60 mt-1">{col.totals || "-"}</div>
      </header>
      <div class="p-2 space-y-2 overflow-y-auto">
        {#each col.deals as d (d.id)}
          {@const ct = d.contact}
          <article
            class="rounded-lg border border-base-300 p-3 bg-base-100 shadow-sm"
          >
            <div class="font-medium text-sm">{d.title}</div>
            {#if ct}<a
                class="text-xs link link-hover text-base-content/70"
                href="/admin/crm/{ct.id}"
                >{ct.name || ct.email}{ct.company ? `, ${ct.company}` : ""}</a
              >{/if}
            <div class="mt-2 flex items-center justify-between text-xs">
              <span class="font-semibold"
                >{formatMoney(d.value_cents, d.currency)}</span
              >
              {#if d.expected_close}<span class="text-base-content/60"
                  >close {formatDate(d.expected_close)}</span
                >{/if}
            </div>
            <form method="POST" action="?/move" use:enhance class="mt-2">
              <input type="hidden" name="id" value={d.id} />
              <select
                name="stage"
                class="select select-xs w-full"
                value={d.stage}
                aria-label="Move {d.title}"
                onchange={(e) => e.currentTarget.form?.requestSubmit()}
              >
                {#each DEAL_STAGES as s}<option value={s.id}>{s.label}</option
                  >{/each}
              </select>
            </form>
          </article>
        {:else}
          <p class="text-xs text-base-content/50 p-2">No deals</p>
        {/each}
      </div>
    </section>
  {/each}
</div>
