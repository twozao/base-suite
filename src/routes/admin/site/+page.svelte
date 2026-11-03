<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Field from "$lib/components/admin/Field.svelte"
  import ImageField from "$lib/components/admin/ImageField.svelte"
  import ListEditor from "$lib/components/admin/ListEditor.svelte"

  let { data, form } = $props()
  // svelte-ignore state_referenced_locally
  let brand = $state(structuredClone(data.brand))
  // svelte-ignore state_referenced_locally
  let nav = $state(structuredClone(data.navigation))
  // svelte-ignore state_referenced_locally
  let general = $state(structuredClone(data.general))
  let saving = $state("")

  const PLATFORMS = [
    "x",
    "linkedin",
    "github",
    "instagram",
    "facebook",
    "youtube",
  ] as const
  const quickLinks = $derived([
    { label: "Home", href: "/" },
    { label: "Features", href: "/#features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact_us" },
    { label: "Book a call", href: "/book" },
    ...data.pages.map((p) => ({ label: p.title, href: `/${p.slug}` })),
  ])

  const submit = (section: string) => () => {
    saving = section
    return async ({
      update,
    }: {
      update: (o?: { reset?: boolean }) => Promise<void>
    }) => {
      await update({ reset: false })
      saving = ""
    }
  }
  const sectionForm = $derived(
    form as { section?: string; message?: string; error?: string } | null,
  )
</script>

{#snippet status(section: string)}
  {#if sectionForm?.section === section}
    {#if sectionForm.error}<span class="text-error text-sm" role="alert"
        >{sectionForm.error}</span
      >
    {:else if sectionForm.message}<span
        class="text-success text-sm"
        role="status">✓ {sectionForm.message}</span
      >{/if}
  {/if}
{/snippet}

{#snippet linkFields(l: { label: string; href: string })}
  <div class="grid gap-3 sm:grid-cols-[1fr_1.4fr]">
    <Field label="Label" bind:value={l.label} max={60} />
    <label class="block">
      <span class="mb-1 block text-sm font-medium">Link</span>
      <input
        class="input w-full font-mono text-sm"
        list="quick-links"
        bind:value={l.href}
        maxlength="500"
        placeholder="/pricing or https://…"
      />
    </label>
  </div>
{/snippet}

<datalist id="quick-links">
  {#each quickLinks as q}<option value={q.href}>{q.label}</option>{/each}
</datalist>

<PageHeader
  title="Brand & navigation"
  subtitle="Your name, logo, colours, menus and footer — used across the whole site."
/>

<div class="space-y-6 max-w-4xl">
  <form
    method="POST"
    action="?/brand"
    use:enhance={submit("brand")}
    class="card bg-base-100 border border-base-300"
  >
    <input type="hidden" name="payload" value={JSON.stringify(brand)} />
    <div class="card-body gap-4">
      <h2 class="card-title">Brand</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <Field label="Site name" bind:value={brand.siteName} max={60} />
        <Field label="Tagline" bind:value={brand.tagline} max={120} />
      </div>
      <Field
        label="Description (used for search engines and link previews)"
        bind:value={brand.description}
        multiline
        rows={2}
        max={300}
      />
      <div class="grid gap-4 sm:grid-cols-2">
        {#each [["Primary colour", "primaryColor"], ["Accent colour", "accentColor"]] as [label, key]}
          {@const k = key as "primaryColor" | "accentColor"}
          <label class="block">
            <span class="mb-1 block text-sm font-medium">{label}</span>
            <div class="flex items-center gap-2">
              <input
                type="color"
                class="h-10 w-14 cursor-pointer rounded border border-base-300 bg-base-100"
                bind:value={brand[k]}
                aria-label="{label} picker"
              />
              <input
                class="input w-full font-mono"
                bind:value={brand[k]}
                maxlength="7"
                pattern="#[0-9a-fA-F]{'{6}'}"
              />
            </div>
          </label>
        {/each}
      </div>
      <div
        class="rounded-box border border-base-300 p-4 flex flex-wrap items-center gap-3"
        aria-label="Preview"
      >
        <span class="text-sm text-base-content/60">Preview:</span>
        <span
          class="btn btn-sm border-0"
          style="background:{brand.primaryColor};color:white"
          >Primary button</span
        >
        <span class="badge" style="background:{brand.accentColor}">Accent</span>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <ImageField
          label="Logo"
          bind:value={brand.logoUrl}
          hint="Shown in the header and footer. SVG not supported; use PNG or WebP about 64px tall."
        />
        <ImageField
          label="Social share image"
          bind:value={brand.ogImageUrl}
          hint="1200×630 image used when your site is shared."
        />
      </div>
      <div class="flex items-center gap-4">
        <button class="btn btn-primary btn-sm" disabled={saving === "brand"}
          >Save brand</button
        >{@render status("brand")}
      </div>
    </div>
  </form>

  <form
    method="POST"
    action="?/navigation"
    use:enhance={submit("navigation")}
    class="card bg-base-100 border border-base-300"
  >
    <input type="hidden" name="payload" value={JSON.stringify(nav)} />
    <div class="card-body gap-4">
      <h2 class="card-title">Header menu</h2>
      <ListEditor
        bind:items={nav.header}
        max={8}
        addLabel="Add menu link"
        create={() => ({ label: "", href: "" })}
        label={(l) => l.label || "New link"}
      >
        {#snippet item(l)}{@render linkFields(l)}{/snippet}
      </ListEditor>
      <div class="grid gap-4 sm:grid-cols-2">
        <Field
          label="Header button text"
          bind:value={nav.ctaLabel}
          max={40}
          hint="Leave empty to hide the button"
        />
        <Field
          label="Header button link"
          bind:value={nav.ctaHref}
          max={500}
          mono
        />
      </div>

      <h2 class="card-title mt-4">Footer</h2>
      <ListEditor
        bind:items={nav.footerColumns}
        max={4}
        addLabel="Add footer column"
        create={() => ({ title: "", links: [] })}
        label={(c) => c.title || "New column"}
      >
        {#snippet item(col)}
          <Field label="Column title" bind:value={col.title} max={40} />
          <ListEditor
            bind:items={col.links}
            max={8}
            addLabel="Add link"
            create={() => ({ label: "", href: "" })}
            label={(l) => l.label || "New link"}
          >
            {#snippet item(l)}{@render linkFields(l)}{/snippet}
          </ListEditor>
        {/snippet}
      </ListEditor>
      <ListEditor
        bind:items={nav.social}
        max={6}
        addLabel="Add social link"
        create={() => ({ platform: "x" as const, url: "" })}
        label={(s) => s.platform}
      >
        {#snippet item(s)}
          <div class="grid gap-3 sm:grid-cols-[10rem_1fr]">
            <label class="block"
              ><span class="mb-1 block text-sm font-medium">Platform</span>
              <select class="select w-full" bind:value={s.platform}
                >{#each PLATFORMS as p}<option value={p}>{p}</option
                  >{/each}</select
              ></label
            >
            <Field
              label="Profile URL"
              bind:value={s.url}
              max={300}
              mono
              placeholder="https://…"
            />
          </div>
        {/snippet}
      </ListEditor>
      <Field
        label="Footer note"
        bind:value={nav.footerNote}
        max={200}
        placeholder="e.g. Made in Chennai"
      />
      <div class="flex items-center gap-4">
        <button
          class="btn btn-primary btn-sm"
          disabled={saving === "navigation"}>Save navigation</button
        >{@render status("navigation")}
      </div>
    </div>
  </form>

  <form
    method="POST"
    action="?/general"
    use:enhance={submit("general")}
    class="card bg-base-100 border border-base-300"
  >
    <input type="hidden" name="payload" value={JSON.stringify(general)} />
    <div class="card-body gap-4">
      <h2 class="card-title">Announcement & contact</h2>
      <Field
        label="Announcement bar"
        bind:value={general.announcement}
        max={300}
        hint="Shown above the header on every page. Leave empty to hide."
        placeholder="🎉 New: online booking is live"
      />
      <Field
        label="Public support email"
        bind:value={general.supportEmail}
        type="email"
        max={320}
        hint="Shown on the contact page."
      />
      <div class="flex items-center gap-4">
        <button class="btn btn-primary btn-sm" disabled={saving === "general"}
          >Save</button
        >{@render status("general")}
      </div>
    </div>
  </form>
</div>
