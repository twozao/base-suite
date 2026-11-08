<script lang="ts">
  import { enhance } from "$app/forms"
  import { page } from "$app/stores"
  import { onMount, tick } from "svelte"
  import Icon from "$lib/components/site/Icon.svelte"
  import type { SubmitFunction } from "@sveltejs/kit"

  let { data, form } = $props()
  const c = $derived(data.contact)

  type Values = Record<string, string>
  // svelte-ignore state_referenced_locally
  const initial = (form as { values?: Values } | null)?.values
  // svelte-ignore state_referenced_locally
  let values: Values = $state({
    name: initial?.name ?? data.prefill.name,
    email: initial?.email ?? data.prefill.email,
    company: initial?.company ?? "",
    phone: initial?.phone ?? "",
    topic: initial?.topic ?? "",
    preferred_contact: initial?.preferred_contact ?? "email",
    message: initial?.message ?? "",
  })
  // svelte-ignore state_referenced_locally
  let errors: Record<string, string> = $state(
    (form as { errors?: Record<string, string> } | null)?.errors ?? {},
  )
  let loading = $state(false)
  let shownAt = $state("")
  let fromPath = $state("")
  // svelte-ignore state_referenced_locally
  let reference = $state(
    (form as { reference?: string } | null)?.reference ?? "",
  )

  onMount(() => {
    shownAt = String(Date.now())
    const wanted = $page.url.searchParams.get("topic")
    if (wanted && !values.topic && c.topics.includes(wanted))
      values.topic = wanted
    try {
      const ref = new URL(document.referrer)
      if (ref.origin === location.origin) fromPath = ref.pathname
    } catch {
      /* no referrer */
    }
  })

  const checks: Record<string, () => string> = {
    name: () => (values.name.trim() ? "" : "Please enter your name"),
    email: () =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())
        ? ""
        : "Enter a valid email address",
    topic: () =>
      !c.topics.length || values.topic
        ? ""
        : "Please choose what this is about",
    phone: () => {
      const v = values.phone.trim()
      if (values.preferred_contact === "phone" && !v)
        return "Add a number so we can call you"
      return !v || /^[+\d\s().-]{5,}$/.test(v)
        ? ""
        : "Enter a valid phone number"
    },
    message: () =>
      values.message.trim().length >= data.messageMin
        ? ""
        : `Please tell us a little more (at least ${data.messageMin} characters)`,
  }
  /** Checks when someone leaves a field, and clears the message as soon as it is fixed. */
  const validate = (id: string) => {
    const problem = checks[id]?.() ?? ""
    if (problem) errors[id] = problem
    else delete errors[id]
  }
  const revalidate = (id: string) => {
    if (errors[id]) validate(id)
  }
  const focusFirstError = async () => {
    await tick()
    document
      .querySelector<HTMLElement>('#contact-form [aria-invalid="true"]')
      ?.focus()
  }

  const handleSubmit: SubmitFunction = ({ cancel }) => {
    for (const id of Object.keys(checks)) validate(id)
    if (Object.keys(errors).length) {
      cancel()
      void focusFirstError()
      return
    }
    loading = true
    return async ({ update, result }) => {
      await update({ reset: false })
      loading = false
      if (result.type === "success") {
        reference = String(result.data?.reference ?? "")
      } else if (result.type === "failure") {
        errors = result.data?.errors ?? {}
        void focusFirstError()
      } else if (result.type === "error") {
        errors = { _: "Something went wrong. Please try again." }
      }
    }
  }
  const remaining = $derived(data.messageMax - values.message.length)
</script>

{#snippet detail(icon: string, title: string, body: import("svelte").Snippet)}
  <li class="flex gap-4">
    <span
      class="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"
      ><Icon name={icon} /></span
    >
    <span
      ><span class="block font-semibold">{title}</span><span
        class="text-base-content/70">{@render body()}</span
      ></span
    >
  </li>
{/snippet}
{#snippet problem(id: string)}
  {#if errors[id]}<span id="{id}-error" class="mt-1 block text-sm text-error"
      >{errors[id]}</span
    >{/if}
{/snippet}

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
      <p class="mt-4 text-lg text-base-content/70 max-w-md">{c.intro}</p>
      <ul class="mt-10 space-y-6">
        {#if data.site.modules.booking}
          {#snippet book()}Prefer to talk? <a class="link" href="/book"
              >Pick a time</a
            > that suits you.{/snippet}
          {@render detail("calendar", "Book a call", book)}
        {/if}
        {#if data.site.modules.chat}
          {#snippet chat()}Use the chat button in the corner for a quick answer.{/snippet}
          {@render detail("chat", "Live chat", chat)}
        {/if}
        {#if data.supportEmail}
          {#snippet mail()}<a class="link" href="mailto:{data.supportEmail}"
              >{data.supportEmail}</a
            >{/snippet}
          {@render detail("mail", "Email", mail)}
        {/if}
        {#if c.phone}
          {#snippet tel()}<a
              class="link"
              href="tel:{c.phone.replace(/[^+\d]/g, '')}">{c.phone}</a
            >{/snippet}
          {@render detail("phone", "Phone", tel)}
        {/if}
        {#if c.address}
          {#snippet where()}{c.address}{/snippet}
          {@render detail("pin", "Where we are", where)}
        {/if}
        {#if c.hours}
          {#snippet hours()}{c.hours}{/snippet}
          {@render detail("clock", "Hours", hours)}
        {/if}
      </ul>
    </div>

    <div>
      {#if reference}
        <div
          class="rounded-box border border-base-300 bg-base-100 p-8 shadow-xl"
          role="status"
        >
          <span
            class="grid h-12 w-12 place-items-center rounded-full bg-success/15 text-success"
            ><Icon name="check" /></span
          >
          <h2 class="mt-4 text-2xl font-bold">
            Thank you{values.name.trim()
              ? `, ${values.name.trim().split(/\s+/)[0]}`
              : ""}
          </h2>
          <p class="mt-2 text-base-content/70">{c.successMessage}</p>
          <p class="mt-4 text-sm text-base-content/60">
            Your reference is <span class="font-mono">{reference}</span>.
          </p>
          {#if data.site.modules.booking}
            <a class="btn btn-primary btn-sm mt-6" href="/book"
              >Book a call as well</a
            >
          {/if}
        </div>
      {:else}
        <form
          id="contact-form"
          class="rounded-box border border-base-300 bg-base-100 p-6 sm:p-8 shadow-xl grid gap-4 sm:grid-cols-2"
          method="POST"
          action="?/submitContactUs"
          novalidate
          use:enhance={handleSubmit}
        >
          <div class="hidden" aria-hidden="true">
            <label
              >Leave this empty <input
                type="text"
                name="website_url"
                tabindex="-1"
                autocomplete="off"
              /></label
            >
          </div>
          <input type="hidden" name="shown_at" value={shownAt} />
          <input type="hidden" name="from" value={fromPath} />

          <label class="block sm:col-span-2">
            <span class="mb-1 block text-sm font-medium">Your name *</span>
            <input
              name="name"
              autocomplete="name"
              maxlength="200"
              class="input w-full {errors.name ? 'input-error' : ''}"
              bind:value={values.name}
              onblur={() => validate("name")}
              oninput={() => revalidate("name")}
              aria-required="true"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            {@render problem("name")}
          </label>
          <label class="block sm:col-span-2">
            <span class="mb-1 block text-sm font-medium">Email *</span>
            <input
              name="email"
              type="email"
              autocomplete="email"
              maxlength="320"
              class="input w-full {errors.email ? 'input-error' : ''}"
              bind:value={values.email}
              onblur={() => validate("email")}
              oninput={() => revalidate("email")}
              aria-required="true"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {@render problem("email")}
          </label>
          {#if c.askCompany}
            <label class="block {c.askPhone ? '' : 'sm:col-span-2'}">
              <span class="mb-1 block text-sm font-medium">Company</span>
              <input
                name="company"
                autocomplete="organization"
                maxlength="200"
                class="input w-full {errors.company ? 'input-error' : ''}"
                bind:value={values.company}
                aria-invalid={!!errors.company}
                aria-describedby={errors.company ? "company-error" : undefined}
              />
              {@render problem("company")}
            </label>
          {/if}
          {#if c.askPhone}
            <label class="block {c.askCompany ? '' : 'sm:col-span-2'}">
              <span class="mb-1 block text-sm font-medium"
                >Phone{values.preferred_contact === "phone" ? " *" : ""}</span
              >
              <input
                name="phone"
                type="tel"
                autocomplete="tel"
                maxlength="60"
                class="input w-full {errors.phone ? 'input-error' : ''}"
                bind:value={values.phone}
                onblur={() => validate("phone")}
                oninput={() => revalidate("phone")}
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "phone-error" : undefined}
              />
              {@render problem("phone")}
            </label>
          {/if}
          {#if c.topics.length}
            <label class="block sm:col-span-2">
              <span class="mb-1 block text-sm font-medium"
                >What is this about? *</span
              >
              <select
                name="topic"
                class="select w-full {errors.topic ? 'select-error' : ''}"
                bind:value={values.topic}
                onchange={() => validate("topic")}
                aria-required="true"
                aria-invalid={!!errors.topic}
                aria-describedby={errors.topic ? "topic-error" : undefined}
              >
                <option value="">Choose a topic...</option>
                {#each c.topics as t}<option value={t}>{t}</option>{/each}
              </select>
              {@render problem("topic")}
            </label>
          {/if}
          <label class="block sm:col-span-2">
            <span class="mb-1 flex justify-between text-sm font-medium">
              <span>Message *</span>
              <span
                class="font-normal {remaining < 100
                  ? 'text-warning'
                  : 'text-base-content/50'}"
                aria-live="polite"
                >{remaining < 300 ? `${remaining} left` : ""}</span
              >
            </span>
            <textarea
              name="message"
              rows="5"
              maxlength={data.messageMax}
              class="textarea w-full {errors.message ? 'textarea-error' : ''}"
              bind:value={values.message}
              onblur={() => validate("message")}
              oninput={() => revalidate("message")}
              aria-required="true"
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? "message-error" : undefined}
            ></textarea>
            {@render problem("message")}
          </label>
          {#if c.askPhone}
            <fieldset class="sm:col-span-2">
              <legend class="mb-1 text-sm font-medium"
                >Best way to reach you</legend
              >
              <div class="flex gap-6">
                {#each [["email", "Email"], ["phone", "Phone"]] as [v, l]}
                  <label class="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      class="radio radio-sm"
                      name="preferred_contact"
                      value={v}
                      bind:group={values.preferred_contact}
                      onchange={() => revalidate("phone")}
                    />
                    {l}
                  </label>
                {/each}
              </div>
            </fieldset>
          {/if}
          {#if errors._}<p
              class="text-error text-sm sm:col-span-2"
              role="alert"
            >
              {errors._}
            </p>{/if}
          <button class="btn btn-primary sm:col-span-2" disabled={loading}
            >{loading ? "Sending..." : "Send message"}</button
          >
          <p class="text-xs text-base-content/60 sm:col-span-2">
            We only use these details to reply to you.{#if data.hasPrivacyPage}{" "}<a
                class="link"
                href="/privacy">Privacy</a
              >.{/if}
          </p>
        </form>
      {/if}
    </div>
  </div>
</section>
