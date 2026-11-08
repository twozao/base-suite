<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  let { data, form } = $props()

  const CATEGORIES = [
    "Website",
    "Engage",
    "Sell",
    "Customers",
    "Operate",
    "Insights",
  ] as const
  const nameOf = (id: string) =>
    data.modules.find((m) => m.id === id)?.name ?? id
</script>

<PageHeader
  title="Modules"
  subtitle="Switch features on or off for your site. Turning a module off hides its pages and admin screens; its data is kept."
/>
<Flash {form} />

{#each CATEGORIES as cat}
  {@const mods = data.modules.filter((m) => m.category === cat)}
  {@const planned = data.planned.filter((m) => m.category === cat)}
  {#if mods.length || planned.length}
    <section class="mb-10">
      <h2
        class="text-sm font-semibold uppercase tracking-wider text-base-content/60 mb-3"
      >
        {cat}
      </h2>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {#each mods as m (m.id)}
          <article
            class="card bg-base-100 border {m.active
              ? 'border-primary/40'
              : 'border-base-300'}"
          >
            <div class="card-body gap-3">
              <div class="flex items-start justify-between gap-3">
                <h3 class="font-semibold text-lg">{m.name}</h3>
                <form method="POST" action="?/toggle" use:enhance>
                  <input type="hidden" name="id" value={m.id} />
                  <input
                    type="hidden"
                    name="on"
                    value={String(!m.switchedOn)}
                  />
                  <button
                    class="btn btn-sm {m.switchedOn
                      ? 'btn-outline'
                      : 'btn-primary'}"
                    aria-label="{m.switchedOn ? 'Disable' : 'Enable'} {m.name}"
                  >
                    {m.switchedOn ? "Disable" : "Enable"}
                  </button>
                </form>
              </div>
              <p class="text-sm text-base-content/70">{m.summary}</p>
              <ul class="text-xs text-base-content/60 space-y-1">
                {#each m.provides as p}<li>- {p}</li>{/each}
              </ul>
              <div class="flex flex-wrap gap-1 mt-auto">
                {#if m.active}<span class="badge badge-success badge-sm"
                    >Active</span
                  >
                {:else if m.switchedOn && m.blockedBy.length}<span
                    class="badge badge-warning badge-sm"
                    >Needs {m.blockedBy.map(nameOf).join(", ")}</span
                  >
                {:else}<span class="badge badge-ghost badge-sm">Off</span>{/if}
                {#each m.dependsOn as d}<span
                    class="badge badge-outline badge-sm"
                    >requires {nameOf(d)}</span
                  >{/each}
              </div>
            </div>
          </article>
        {/each}
        {#each planned as m (m.id)}
          <article
            class="card bg-base-200/60 border border-dashed border-base-300"
          >
            <div class="card-body gap-3">
              <div class="flex items-start justify-between gap-3">
                <h3 class="font-semibold text-lg text-base-content/70">
                  {m.name}
                </h3>
                <span class="badge badge-ghost badge-sm">Planned</span>
              </div>
              <p class="text-sm text-base-content/60">{m.summary}</p>
              {#if m.dependsOn.length}<div class="flex gap-1">
                  {#each m.dependsOn as d}<span
                      class="badge badge-outline badge-sm">requires {d}</span
                    >{/each}
                </div>{/if}
            </div>
          </article>
        {/each}
      </div>
    </section>
  {/if}
{/each}

<p class="text-sm text-base-content/60">
  Want to build a planned module? See <code>docs/ARCHITECTURE.md</code> -> "Building
  a module".
</p>
