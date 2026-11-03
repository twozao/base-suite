<script lang="ts">
  import { enhance, applyAction } from "$app/forms"
  import Icon from "$lib/components/site/Icon.svelte"
  import type { SubmitFunction } from "@sveltejs/kit"
  import type { FullAutoFill } from "svelte/elements"

  let { data } = $props()
  let errors: { [fieldName: string]: string } = $state({})
  let loading = $state(false)
  let showSuccess = $state(false)

  interface FormField {
    id: string
    label: string
    inputType: string
    autocomplete: FullAutoFill
  }

  const formFields: FormField[] = [
    {
      id: "first_name",
      label: "First Name *",
      inputType: "text",
      autocomplete: "given-name",
    },
    {
      id: "last_name",
      label: "Last Name *",
      inputType: "text",
      autocomplete: "family-name",
    },
    {
      id: "email",
      label: "Email *",
      inputType: "email",
      autocomplete: "email",
    },
    {
      id: "phone",
      label: "Phone Number",
      inputType: "tel",
      autocomplete: "tel",
    },
    {
      id: "company",
      label: "Company Name",
      inputType: "text",
      autocomplete: "organization",
    },
    {
      id: "message",
      label: "Message",
      inputType: "textarea",
      autocomplete: "off",
    },
  ]

  const handleSubmit: SubmitFunction = () => {
    loading = true
    errors = {}
    return async ({ update, result }) => {
      await update({ reset: false })
      await applyAction(result)
      loading = false
      if (result.type === "success") {
        showSuccess = true
      } else if (result.type === "failure") {
        errors = result.data?.errors ?? {}
      } else if (result.type === "error") {
        errors = { _: "An error occurred. Please check inputs and try again." }
      }
    }
  }
</script>

<svelte:head>
  <title>Contact | {data.site.brand.siteName}</title>
  <meta
    name="description"
    content="Get in touch with {data.site.brand.siteName}."
  />
</svelte:head>

<section class="bg-brand-glow">
  <div
    class="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 py-16 sm:py-24 lg:grid-cols-2"
  >
    <div>
      <h1 class="text-4xl sm:text-5xl font-bold tracking-tight">
        Get in touch
      </h1>
      <p class="mt-4 text-lg text-base-content/70 max-w-md">
        Questions, a quote or a demo — send us a message and we'll get back to
        you, usually within one business day.
      </p>
      <ul class="mt-10 space-y-6">
        {#if data.site.modules.chat}
          <li class="flex gap-4">
            <span
              class="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"
              ><Icon name="chat" /></span
            >
            <span
              ><span class="block font-semibold">Live chat</span><span
                class="text-base-content/70"
                >Use the chat button in the corner for a quick answer.</span
              ></span
            >
          </li>
        {/if}
        {#if data.site.modules.booking}
          <li class="flex gap-4">
            <span
              class="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"
              ><Icon name="calendar" /></span
            >
            <span
              ><span class="block font-semibold">Book a call</span><span
                class="text-base-content/70"
                ><a class="link" href="/book">Pick a time</a> that suits you.</span
              ></span
            >
          </li>
        {/if}
        {#if data.supportEmail}
          <li class="flex gap-4">
            <span
              class="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"
              ><Icon name="mail" /></span
            >
            <span
              ><span class="block font-semibold">Email</span><a
                class="link text-base-content/70"
                href="mailto:{data.supportEmail}">{data.supportEmail}</a
              ></span
            >
          </li>
        {/if}
      </ul>
    </div>

    <div>
      {#if showSuccess}
        <div
          class="rounded-box border border-base-300 bg-base-100 p-8 shadow-xl"
          role="status"
        >
          <span
            class="grid h-12 w-12 place-items-center rounded-full bg-success/15 text-success"
            ><Icon name="check" /></span
          >
          <h2 class="mt-4 text-2xl font-bold">Thank you!</h2>
          <p class="mt-2 text-base-content/70">{data.successMessage}</p>
        </div>
      {:else}
        <form
          class="rounded-box border border-base-300 bg-base-100 p-6 sm:p-8 shadow-xl grid gap-4 sm:grid-cols-2"
          method="POST"
          action="?/submitContactUs"
          use:enhance={handleSubmit}
        >
          <!-- Honeypot: hidden from people, filled in by naive bots -->
          <div class="hidden" aria-hidden="true">
            <label>
              Leave this empty
              <input
                type="text"
                name="website_url"
                tabindex="-1"
                autocomplete="off"
              />
            </label>
          </div>
          {#each formFields as field}
            <label
              for={field.id}
              class={field.inputType === "textarea" ||
              field.inputType === "email"
                ? "sm:col-span-2"
                : ""}
            >
              <span class="flex justify-between text-sm font-medium mb-1">
                {field.label}
                {#if errors[field.id]}<span class="text-error font-normal"
                    >{errors[field.id]}</span
                  >{/if}
              </span>
              {#if field.inputType === "textarea"}
                <textarea
                  id={field.id}
                  name={field.id}
                  autocomplete={field.autocomplete}
                  rows={5}
                  class="textarea w-full {errors[field.id]
                    ? 'textarea-error'
                    : ''}"
                ></textarea>
              {:else}
                <input
                  id={field.id}
                  name={field.id}
                  type={field.inputType}
                  autocomplete={field.autocomplete}
                  class="input w-full {errors[field.id] ? 'input-error' : ''}"
                />
              {/if}
            </label>
          {/each}
          {#if errors._}<p
              class="text-error text-sm sm:col-span-2"
              role="alert"
            >
              {errors._}
            </p>{/if}
          <button
            class="btn btn-primary sm:col-span-2 {loading
              ? 'btn-disabled'
              : ''}">{loading ? "Sending…" : "Send message"}</button
          >
        </form>
      {/if}
    </div>
  </div>
</section>
