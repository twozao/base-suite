<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  import EmailTabs from "../../EmailTabs.svelte"
  let { data, form } = $props()
  const t = $derived(data.template)
  let tab: "html" | "text" = $state("html")
</script>

<PageHeader
  title={data.isNew ? "New email template" : t.name}
  back="/admin/email/templates"
/>
<EmailTabs />
<Flash {form} />

{#if data.builtIn}
  <p class="text-sm opacity-70 mb-4 max-w-3xl">
    {data.saved
      ? "You have customized this built-in email. Remove your version to go back to the original."
      : "This is the built-in version. Saving makes it your own; the site keeps sending it at the same moments."}
    Use <code>{"{{subject}}"}</code> for the subject the site would normally
    use.
    {#if data.builtIn.sensitive}It carries a sign-in or reset link, so its body
      is never kept in the log.{/if}
  </p>
{/if}
{#if data.extensionId}
  <p class="text-sm opacity-70 mb-4">
    Added by the <a href="/admin/extensions" class="link">{data.extensionId}</a>
    extension.
  </p>
{/if}

<div class="grid gap-6 xl:grid-cols-2">
  <form method="POST" action="?/save" use:enhance class="space-y-3">
    <div class="grid gap-3 sm:grid-cols-2">
      <label class="text-sm"
        >Name<input
          name="name"
          class="input input-sm w-full"
          value={t.name}
          maxlength="120"
          required
        /></label
      >
      <label class="text-sm"
        >Id<input
          name="slug"
          class="input input-sm w-full font-mono"
          value={t.slug}
          maxlength="60"
          pattern="[a-z][a-z0-9_]+"
          placeholder="order_confirmation"
          disabled={!data.isNew}
          required
        /></label
      >
    </div>
    <label class="text-sm block"
      >Description<input
        name="description"
        class="input input-sm w-full"
        value={t.description}
        maxlength="500"
      /></label
    >
    <label class="text-sm block"
      >Subject<input
        name="subject"
        class="input input-sm w-full"
        value={t.subject}
        maxlength="300"
        required
      /></label
    >
    <div role="tablist" class="tabs tabs-box tabs-sm w-fit">
      <button
        type="button"
        role="tab"
        class="tab {tab === 'html' ? 'tab-active' : ''}"
        onclick={() => (tab = "html")}>HTML</button
      >
      <button
        type="button"
        role="tab"
        class="tab {tab === 'text' ? 'tab-active' : ''}"
        onclick={() => (tab = "text")}>Plain text</button
      >
    </div>
    <textarea
      name="html"
      class="textarea w-full font-mono text-xs h-80 {tab === 'html'
        ? ''
        : 'hidden'}"
      aria-label="HTML body"
      maxlength="100000">{t.html}</textarea
    >
    <textarea
      name="text"
      class="textarea w-full font-mono text-xs h-80 {tab === 'text'
        ? ''
        : 'hidden'}"
      aria-label="Plain text body"
      maxlength="20000">{t.text}</textarea
    >
    <p class="text-xs opacity-60">
      Insert values with <code>{"{{name}}"}</code>, show a part only when a
      value is set with <code>{"{{#if name}}...{{/if}}"}</code>. Values are
      always escaped in HTML.
    </p>
    <button class="btn btn-primary btn-sm">Save template</button>
  </form>

  {#if data.preview}
    <section class="space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="font-semibold">Preview, with sample values</h2>
        <div class="flex gap-2">
          <form method="POST" action="?/test" use:enhance>
            <button class="btn btn-sm">Send me a test</button>
          </form>
          {#if data.saved}
            <form
              method="POST"
              action="?/remove"
              use:enhance={({ cancel }) => {
                if (
                  !confirm(
                    data.builtIn
                      ? "Remove your version and go back to the built-in email?"
                      : "Delete this template?",
                  )
                )
                  cancel()
              }}
            >
              <button class="btn btn-sm btn-error btn-outline"
                >{data.builtIn ? "Reset to built-in" : "Delete"}</button
              >
            </form>
          {/if}
        </div>
      </div>
      <p class="text-sm"><strong>Subject:</strong> {data.preview.subject}</p>
      {#if data.variables.length}<p class="text-xs opacity-70">
          Values: {#each data.variables as v (v)}<code class="mr-1">{v}</code
            >{/each}
        </p>{/if}
      {#if data.preview.html}
        <iframe
          title="Email preview"
          sandbox=""
          srcdoc={data.preview.html}
          class="w-full h-96 rounded-box border border-base-300 bg-white"
        ></iframe>
      {/if}
      {#if data.preview.text}<pre
          class="whitespace-pre-wrap rounded-box bg-base-200 p-3 text-xs">{data
            .preview.text}</pre>{/if}
    </section>
  {/if}
</div>
