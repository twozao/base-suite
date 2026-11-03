<script lang="ts">
  // Sticky save bar for rich editors. Shows the last action result.
  let {
    form,
    saving = false,
    dirty = false,
    previewHref = "",
  }: {
    form: { message?: string; error?: string } | null | undefined
    saving?: boolean
    dirty?: boolean
    previewHref?: string
  } = $props()
</script>

<div
  class="sticky bottom-0 z-20 -mx-4 lg:-mx-8 mt-8 border-t border-base-300 bg-base-100/95 backdrop-blur px-4 lg:px-8 py-3 flex flex-wrap items-center gap-3"
>
  <button class="btn btn-primary" disabled={saving}
    >{saving ? "Saving…" : "Save changes"}</button
  >
  {#if previewHref}<a class="btn btn-ghost" href={previewHref} target="_blank"
      >View on site ↗</a
    >{/if}
  <span class="text-sm" role="status">
    {#if form?.error}<span class="text-error">{form.error}</span>
    {:else if dirty}<span class="text-base-content/60">Unsaved changes</span>
    {:else if form?.message}<span class="text-success">✓ {form.message}</span
      >{/if}
  </span>
</div>
