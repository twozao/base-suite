<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Field from "$lib/components/admin/Field.svelte"
  import ListEditor from "$lib/components/admin/ListEditor.svelte"
  import SaveBar from "$lib/components/admin/SaveBar.svelte"

  let { data, form } = $props()
  // svelte-ignore state_referenced_locally
  let pricing = $state(structuredClone(data.pricing))
  let saving = $state(false)
  // svelte-ignore state_referenced_locally
  let saved = $state(JSON.stringify(data.pricing))
  const dirty = $derived(JSON.stringify(pricing) !== saved)

  // Features are edited as one-per-line text
  const featuresText = (p: { features: string[] }) => p.features.join("\n")
  const setFeatures = (p: { features: string[] }, v: string) =>
    (p.features = v
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 15))
</script>

<PageHeader
  title="Pricing plans"
  subtitle="Plans shown on /pricing, the homepage and in customer billing."
>
  {#snippet actions()}<a class="btn btn-sm" href="/pricing" target="_blank"
      >Open pricing page ↗</a
    >{/snippet}
</PageHeader>

{#if data.stripeMode === "missing"}
  <div class="alert alert-warning mb-4">
    <span
      >Set <code>PRIVATE_STRIPE_API_KEY</code> to take payments. Until then, paid
      plans send visitors to the contact form.</span
    >
  </div>
{:else}
  <div
    class="alert mb-4 {data.stripeMode === 'live'
      ? 'alert-success'
      : 'alert-info'}"
  >
    <span
      >Stripe is in <strong>{data.stripeMode}</strong> mode. Paste each plan's
      <em>price id</em>
      and <em>product id</em> from Stripe → Product catalogue. Plans without a price
      id are free (price $0) or go to the contact form.</span
    >
  </div>
{/if}

<form
  method="POST"
  class="space-y-6 max-w-4xl"
  use:enhance={() => {
    saving = true
    return async ({ update, result }) => {
      await update({ reset: false })
      if (result.type === "success") saved = JSON.stringify(pricing)
      saving = false
    }
  }}
>
  <input type="hidden" name="payload" value={JSON.stringify(pricing)} />

  <section class="card bg-base-100 border border-base-300">
    <div class="card-body gap-4">
      <h2 class="card-title">Page</h2>
      <Field label="Title" bind:value={pricing.title} max={120} />
      <Field label="Subtitle" bind:value={pricing.subtitle} max={300} />
    </div>
  </section>

  <section class="card bg-base-100 border border-base-300">
    <div class="card-body gap-4">
      <h2 class="card-title">Plans</h2>
      <ListEditor
        bind:items={pricing.plans}
        max={6}
        addLabel="Add plan"
        create={() => ({
          id: `plan-${pricing.plans.length + 1}`,
          name: "",
          description: "",
          price: "",
          interval: "per month",
          stripePriceId: "",
          stripeProductId: "",
          features: [],
          highlighted: false,
          ctaLabel: "",
        })}
        label={(p) =>
          `${p.name || "New plan"}${p.highlighted ? " ★" : ""}${p.stripePriceId ? "" : " · not connected to Stripe"}`}
      >
        {#snippet item(p)}
          <div class="grid gap-3 sm:grid-cols-3">
            <Field label="Name" bind:value={p.name} max={40} />
            <Field
              label="Price"
              bind:value={p.price}
              max={20}
              placeholder="$19"
            />
            <Field
              label="Billing period"
              bind:value={p.interval}
              max={30}
              placeholder="per month"
            />
          </div>
          <Field
            label="Short description"
            bind:value={p.description}
            max={200}
          />
          <label class="block">
            <span class="mb-1 block text-sm font-medium"
              >Features (one per line)</span
            >
            <textarea
              class="textarea w-full"
              rows="4"
              value={featuresText(p)}
              oninput={(e) => setFeatures(p, e.currentTarget.value)}
            ></textarea>
          </label>
          <div class="grid gap-3 sm:grid-cols-3">
            <Field
              label="Button text"
              bind:value={p.ctaLabel}
              max={40}
              placeholder="Choose plan"
            />
            <Field
              label="Plan id (used in URLs)"
              bind:value={p.id}
              max={40}
              mono
            />
            <label class="flex items-center gap-2 text-sm mt-6"
              ><input
                type="checkbox"
                class="checkbox checkbox-sm"
                bind:checked={p.highlighted}
              /> Highlight as “Most popular”</label
            >
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <Field
              label="Stripe price id"
              bind:value={p.stripePriceId}
              max={100}
              mono
              placeholder="price_…"
            />
            <Field
              label="Stripe product id"
              bind:value={p.stripeProductId}
              max={100}
              mono
              placeholder="prod_…"
              hint="Needed to recognise existing subscribers"
            />
          </div>
        {/snippet}
      </ListEditor>
    </div>
  </section>

  <section class="card bg-base-100 border border-base-300">
    <div class="card-body gap-4">
      <h2 class="card-title">Pricing FAQ</h2>
      <ListEditor
        bind:items={pricing.faq}
        max={12}
        addLabel="Add question"
        create={() => ({ q: "", a: "" })}
        label={(f) => f.q || "New question"}
      >
        {#snippet item(f)}
          <Field label="Question" bind:value={f.q} max={200} />
          <Field
            label="Answer"
            bind:value={f.a}
            multiline
            rows={3}
            max={1000}
          />
        {/snippet}
      </ListEditor>
    </div>
  </section>

  <SaveBar {form} {saving} {dirty} previewHref="/pricing" />
</form>
