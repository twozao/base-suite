<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Field from "$lib/components/admin/Field.svelte"
  import ImageField from "$lib/components/admin/ImageField.svelte"
  import ListEditor from "$lib/components/admin/ListEditor.svelte"
  import SaveBar from "$lib/components/admin/SaveBar.svelte"
  import Icon from "$lib/components/site/Icon.svelte"

  let { data, form } = $props()
  // svelte-ignore state_referenced_locally
  let home = $state(structuredClone(data.home))
  let saving = $state(false)
  // svelte-ignore state_referenced_locally
  let saved = $state(JSON.stringify(data.home))
  const dirty = $derived(JSON.stringify(home) !== saved)
</script>

{#snippet sectionHead(
  title: string,
  desc: string,
  toggle?: { get: () => boolean; set: (v: boolean) => void },
)}
  <div class="flex items-start justify-between gap-4">
    <div>
      <h2 class="font-semibold text-lg">{title}</h2>
      <p class="text-sm text-base-content/60">{desc}</p>
    </div>
    {#if toggle}
      <label class="flex items-center gap-2 text-sm shrink-0">
        Show
        <input
          type="checkbox"
          class="toggle toggle-primary toggle-sm"
          checked={toggle.get()}
          onchange={(e) => toggle.set(e.currentTarget.checked)}
        />
      </label>
    {/if}
  </div>
{/snippet}

<PageHeader
  title="Homepage"
  subtitle="Edit every section of your homepage. Changes go live when you save."
>
  {#snippet actions()}<a class="btn btn-sm" href="/" target="_blank"
      >Open homepage ↗</a
    >{/snippet}
</PageHeader>

<form
  method="POST"
  class="space-y-6 max-w-4xl"
  use:enhance={() => {
    saving = true
    return async ({ update, result }) => {
      await update({ reset: false })
      if (result.type === "success") saved = JSON.stringify(home)
      saving = false
    }
  }}
>
  <input type="hidden" name="payload" value={JSON.stringify(home)} />

  <section class="card bg-base-100 border border-base-300">
    <div class="card-body gap-4">
      {@render sectionHead("Hero", "The first thing visitors see.")}
      <div class="grid gap-4 sm:grid-cols-2">
        <Field
          label="Eyebrow"
          bind:value={home.hero.eyebrow}
          max={80}
          placeholder="Small label above the title"
        />
        <Field
          label="Highlighted words"
          bind:value={home.hero.highlight}
          max={60}
          hint="Shown after the title in your brand colour"
        />
      </div>
      <Field label="Title" bind:value={home.hero.title} max={120} />
      <Field
        label="Subtitle"
        bind:value={home.hero.subtitle}
        multiline
        max={300}
      />
      <div class="grid gap-4 sm:grid-cols-2">
        <Field
          label="Primary button text"
          bind:value={home.hero.primaryCta.label}
          max={60}
        />
        <Field
          label="Primary button link"
          bind:value={home.hero.primaryCta.href}
          max={500}
          mono
          placeholder="/login/sign_up"
        />
        <Field
          label="Secondary button text"
          bind:value={home.hero.secondaryCta.label}
          max={60}
        />
        <Field
          label="Secondary button link"
          bind:value={home.hero.secondaryCta.href}
          max={500}
          mono
          placeholder="/book"
        />
      </div>
      <ImageField
        label="Hero image (optional)"
        bind:value={home.hero.imageUrl}
        hint="Leave empty to show the built-in product preview."
      />
    </div>
  </section>

  <section class="card bg-base-100 border border-base-300">
    <div class="card-body gap-4">
      {@render sectionHead("Stats bar", "Up to four headline numbers.", {
        get: () => home.stats.show,
        set: (v) => (home.stats.show = v),
      })}
      <ListEditor
        bind:items={home.stats.items}
        max={4}
        addLabel="Add stat"
        create={() => ({ value: "", label: "" })}
        label={(s) => s.value || "New stat"}
      >
        {#snippet item(s)}
          <div class="grid gap-3 sm:grid-cols-[8rem_1fr]">
            <Field label="Value" bind:value={s.value} max={20} />
            <Field label="Label" bind:value={s.label} max={60} />
          </div>
        {/snippet}
      </ListEditor>
    </div>
  </section>

  <section class="card bg-base-100 border border-base-300">
    <div class="card-body gap-4">
      {@render sectionHead("Features", "What you offer, as a grid of cards.", {
        get: () => home.features.show,
        set: (v) => (home.features.show = v),
      })}
      <Field label="Section title" bind:value={home.features.title} max={120} />
      <Field
        label="Section subtitle"
        bind:value={home.features.subtitle}
        multiline
        rows={2}
        max={300}
      />
      <ListEditor
        bind:items={home.features.items}
        max={12}
        addLabel="Add feature"
        create={() => ({ icon: "sparkles" as const, title: "", body: "" })}
        label={(f) => f.title || "New feature"}
      >
        {#snippet item(f)}
          <div class="grid gap-3 sm:grid-cols-[10rem_1fr]">
            <label class="block">
              <span class="mb-1 block text-sm font-medium">Icon</span>
              <div class="flex items-center gap-2">
                <span
                  class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"
                  ><Icon name={f.icon} class="h-5 w-5" /></span
                >
                <select class="select select-sm" bind:value={f.icon}>
                  {#each data.icons as ic}<option value={ic}>{ic}</option
                    >{/each}
                </select>
              </div>
            </label>
            <Field label="Title" bind:value={f.title} max={80} />
          </div>
          <Field
            label="Description"
            bind:value={f.body}
            multiline
            rows={2}
            max={300}
          />
        {/snippet}
      </ListEditor>
    </div>
  </section>

  <section class="card bg-base-100 border border-base-300">
    <div class="card-body gap-4">
      {@render sectionHead("How it works", "Numbered steps.", {
        get: () => home.steps.show,
        set: (v) => (home.steps.show = v),
      })}
      <Field label="Section title" bind:value={home.steps.title} max={120} />
      <ListEditor
        bind:items={home.steps.items}
        max={6}
        addLabel="Add step"
        create={() => ({ title: "", body: "" })}
        label={(s, i) => `${i + 1}. ${s.title || "New step"}`}
      >
        {#snippet item(s)}
          <Field label="Title" bind:value={s.title} max={80} />
          <Field
            label="Description"
            bind:value={s.body}
            multiline
            rows={2}
            max={300}
          />
        {/snippet}
      </ListEditor>
    </div>
  </section>

  <section class="card bg-base-100 border border-base-300">
    <div class="card-body gap-4">
      {@render sectionHead("Testimonials", "Quotes from happy customers.", {
        get: () => home.testimonials.show,
        set: (v) => (home.testimonials.show = v),
      })}
      <Field
        label="Section title"
        bind:value={home.testimonials.title}
        max={120}
      />
      <ListEditor
        bind:items={home.testimonials.items}
        max={9}
        addLabel="Add testimonial"
        create={() => ({ quote: "", name: "", role: "", avatarUrl: "" })}
        label={(t) => t.name || "New testimonial"}
      >
        {#snippet item(t)}
          <Field
            label="Quote"
            bind:value={t.quote}
            multiline
            rows={3}
            max={500}
          />
          <div class="grid gap-3 sm:grid-cols-2">
            <Field label="Name" bind:value={t.name} max={80} />
            <Field label="Role / company" bind:value={t.role} max={120} />
          </div>
          <ImageField label="Photo (optional)" bind:value={t.avatarUrl} />
        {/snippet}
      </ListEditor>
    </div>
  </section>

  <section class="card bg-base-100 border border-base-300">
    <div class="card-body gap-4">
      {@render sectionHead("FAQ", "Questions and answers.", {
        get: () => home.faq.show,
        set: (v) => (home.faq.show = v),
      })}
      <Field label="Section title" bind:value={home.faq.title} max={120} />
      <ListEditor
        bind:items={home.faq.items}
        max={20}
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

  <section class="card bg-base-100 border border-base-300">
    <div class="card-body gap-4">
      {@render sectionHead("Call to action", "The closing banner.", {
        get: () => home.cta.show,
        set: (v) => (home.cta.show = v),
      })}
      <Field label="Title" bind:value={home.cta.title} max={120} />
      <Field label="Subtitle" bind:value={home.cta.subtitle} max={300} />
      <div class="grid gap-4 sm:grid-cols-2">
        <Field
          label="Button text"
          bind:value={home.cta.button.label}
          max={60}
        />
        <Field
          label="Button link"
          bind:value={home.cta.button.href}
          max={500}
          mono
        />
      </div>
    </div>
  </section>

  <SaveBar {form} {saving} {dirty} previewHref="/" />
</form>
