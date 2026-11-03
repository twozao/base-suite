<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  let { data, form } = $props()

  // svelte-ignore state_referenced_locally
  let eventTypes = $state(
    data.settings.booking.eventTypes.length
      ? data.settings.booking.eventTypes.map((t) => ({ ...t }))
      : [{ label: "", description: "", durationMinutes: 30, url: "" }],
  )
  const keep =
    () =>
    async ({
      update,
    }: {
      update: (o?: { reset?: boolean }) => Promise<void>
    }) =>
      update({ reset: false })
</script>

{#snippet status(section: string)}
  {#if form?.section === section}
    {#if form.error}<p class="text-error text-sm" role="alert">{form.error}</p>
    {:else if form.message}<p class="text-success text-sm" role="status">
        ✓ {form.message}
      </p>{/if}
  {/if}
{/snippet}

<PageHeader
  title="Settings"
  subtitle="Changes apply within ~30 seconds, no redeploy needed"
/>

<div class="space-y-6 max-w-3xl">
  <p class="text-sm text-base-content/70">
    Site name, logo, colours, menus and the announcement bar are in
    <a class="link" href="/admin/site">Brand & navigation</a>.
  </p>

  {#if data.modules.chat}
    <form
      id="chat"
      method="POST"
      action="?/chat"
      use:enhance={keep}
      class="card bg-base-100 border border-base-300"
    >
      <div class="card-body gap-4">
        <h2 class="card-title">Live chat</h2>
        <label class="flex items-center gap-3"
          ><input
            type="checkbox"
            class="toggle toggle-primary"
            name="enabled"
            checked={data.settings.chat.enabled}
          /> Chat widget enabled</label
        >
        <label class="block"
          ><span class="label text-sm whitespace-normal mb-1">Greeting</span>
          <input
            class="input w-full"
            name="greeting"
            value={data.settings.chat.greeting}
            maxlength="300"
            required
          /></label
        >
        <label class="block"
          ><span class="label text-sm whitespace-normal mb-1"
            >Availability note (optional)</span
          >
          <input
            class="input w-full"
            name="offlineMessage"
            value={data.settings.chat.offlineMessage}
            maxlength="300"
            placeholder="e.g. We're online Mon–Fri, 9am–5pm CET"
          /></label
        >
        <label class="flex items-center gap-3"
          ><input
            type="checkbox"
            class="checkbox checkbox-sm"
            name="requireEmail"
            checked={data.settings.chat.requireEmail}
          /> Ask guests for an email so you can follow up</label
        >
        <label class="flex items-center gap-3"
          ><input
            type="checkbox"
            class="checkbox checkbox-sm"
            name="notifyAdminOnNew"
            checked={data.settings.chat.notifyAdminOnNew}
          /> Email the admin address when a new chat starts</label
        >
        <div class="flex items-center gap-4">
          <button class="btn btn-primary btn-sm">Save</button>{@render status(
            "chat",
          )}
        </div>
      </div>
    </form>
  {/if}

  {#if data.modules.booking}
    <form
      id="booking"
      method="POST"
      action="?/booking"
      use:enhance={keep}
      class="card bg-base-100 border border-base-300"
    >
      <div class="card-body gap-4">
        <h2 class="card-title">Booking (Calendly)</h2>
        <label class="flex items-center gap-3"
          ><input
            type="checkbox"
            class="toggle toggle-primary"
            name="enabled"
            checked={data.settings.booking.enabled}
          />
          Booking page enabled at
          <a class="link" href="/book" target="_blank">/book</a></label
        >
        <label class="block"
          ><span class="label text-sm whitespace-normal mb-1">Intro text</span>
          <textarea class="textarea w-full" name="intro" maxlength="500"
            >{data.settings.booking.intro}</textarea
          ></label
        >
        <div class="space-y-3">
          <span class="label text-sm whitespace-normal"
            >Event types (copy each link from Calendly → Event types → Copy
            link)</span
          >
          {#each eventTypes as t, i}
            <fieldset
              class="grid gap-2 sm:grid-cols-[1fr_6rem] border border-base-300 rounded-box p-3"
            >
              <input
                class="input input-sm w-full"
                name="et_label"
                placeholder="Label, e.g. 30-minute intro call"
                bind:value={t.label}
                maxlength="100"
              />
              <input
                class="input input-sm w-full"
                name="et_duration"
                type="number"
                min="5"
                max="480"
                bind:value={t.durationMinutes}
                aria-label="Duration in minutes"
              />
              <input
                class="input input-sm w-full sm:col-span-2 font-mono"
                name="et_url"
                placeholder="https://calendly.com/your-name/intro"
                bind:value={t.url}
                maxlength="500"
              />
              <input
                class="input input-sm w-full sm:col-span-2"
                name="et_description"
                placeholder="Short description (optional)"
                bind:value={t.description}
                maxlength="300"
              />
              <button
                type="button"
                class="btn btn-ghost btn-xs justify-self-start"
                onclick={() => eventTypes.splice(i, 1)}>Remove</button
              >
            </fieldset>
          {/each}
          {#if eventTypes.length < 12}
            <button
              type="button"
              class="btn btn-sm"
              onclick={() =>
                eventTypes.push({
                  label: "",
                  description: "",
                  durationMinutes: 30,
                  url: "",
                })}>+ Add event type</button
            >
          {/if}
        </div>
        <div class="flex items-center gap-4">
          <button class="btn btn-primary btn-sm">Save</button>{@render status(
            "booking",
          )}
        </div>
      </div>
    </form>
  {/if}

  {#if data.modules.contact}
    <form
      id="contact"
      method="POST"
      action="?/contact"
      use:enhance={keep}
      class="card bg-base-100 border border-base-300"
    >
      <div class="card-body gap-4">
        <h2 class="card-title">Contact form</h2>
        <label class="flex items-center gap-3"
          ><input
            type="checkbox"
            class="checkbox checkbox-sm"
            name="notifyAdmin"
            checked={data.settings.contact.notifyAdmin}
          /> Email the admin address for each new message</label
        >
        <label class="block"
          ><span class="label text-sm whitespace-normal mb-1"
            >Success message</span
          >
          <input
            class="input w-full"
            name="successMessage"
            value={data.settings.contact.successMessage}
            maxlength="300"
            required
          /></label
        >
        <div class="flex items-center gap-4">
          <button class="btn btn-primary btn-sm">Save</button>{@render status(
            "contact",
          )}
        </div>
      </div>
    </form>
  {/if}
</div>
