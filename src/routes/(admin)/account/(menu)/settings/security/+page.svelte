<script lang="ts">
  import { enhance } from "$app/forms"
  import { invalidateAll } from "$app/navigation"
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"
  import { startRegistration } from "@simplewebauthn/browser"
  import { formatDateTime } from "$lib/format"

  let adminSection: Writable<string> = getContext("adminSection")
  adminSection.set("settings")

  let { data, form } = $props()
  let qr = $state("")
  let passkeyName = $state("")
  let passkeyError = $state("")
  let adding = $state(false)
  let passkeyCodes: string[] | null = $state(null)

  const setup = $derived(form && "setup" in form ? form.setup : null)
  const codes = $derived(
    form && "codes" in form ? (form.codes as string[]) : passkeyCodes,
  )

  $effect(() => {
    if (!setup) return
    void import("qrcode").then(async (QR) => {
      qr = await QR.toDataURL(setup.uri, { margin: 1, width: 200 })
    })
  })

  async function addPasskey() {
    passkeyError = ""
    adding = true
    try {
      const url = "/account/settings/security/passkey"
      const options = await (await fetch(url, { method: "POST" })).json()
      const response = await startRegistration({ optionsJSON: options })
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ response, name: passkeyName || "Passkey" }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.message || "The passkey was not saved")
      if (body.codes) passkeyCodes = body.codes
      passkeyName = ""
      await invalidateAll()
    } catch (e) {
      passkeyError =
        e instanceof Error && e.name !== "NotAllowedError"
          ? e.message
          : "Adding the passkey was cancelled"
    } finally {
      adding = false
    }
  }
  const device = (ua: string) => {
    const browser = /Edg\//.test(ua)
      ? "Edge"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Browser"
    const os = /iPhone|iPad/.test(ua)
      ? "iOS"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Windows/.test(ua)
            ? "Windows"
            : /Linux/.test(ua)
              ? "Linux"
              : ""
    return os ? `${browser} on ${os}` : browser
  }
</script>

<svelte:head><title>Security</title></svelte:head>

<h1 class="text-2xl font-bold mb-2">Security</h1>
{#if data.setupNeeded && !data.factors.totp && !data.passkeys.length}
  <div role="alert" class="alert alert-warning mb-4 max-w-2xl">
    <span
      >This site asks staff to turn on two-step sign-in or add a passkey before
      using the admin.</span
    >
  </div>
{/if}
{#if form && "message" in form && form.message}<div
    role="status"
    class="alert alert-success mb-4 max-w-2xl"
  >
    <span>{form.message}</span>
  </div>{/if}
{#if form && "error" in form && form.error}<div
    role="alert"
    class="alert alert-error mb-4 max-w-2xl"
  >
    <span>{form.error}</span>
  </div>{/if}

{#if codes}
  <section class="card bg-base-100 border border-warning mb-6 max-w-2xl">
    <div class="card-body gap-2">
      <h2 class="card-title text-base">Save your recovery codes</h2>
      <p class="text-sm">
        Each code signs you in once if you lose your phone. They are shown only
        now.
      </p>
      <ul
        class="grid grid-cols-2 gap-1 font-mono text-sm"
        data-testid="recovery-codes"
      >
        {#each codes as c (c)}<li>{c}</li>{/each}
      </ul>
    </div>
  </section>
{/if}

<section class="card bg-base-100 border border-base-300 mb-6 max-w-2xl">
  <div class="card-body gap-3">
    <h2 class="card-title text-base">
      Two-step sign-in <span
        class="badge badge-sm {data.factors.totp
          ? 'badge-success'
          : 'badge-ghost'}">{data.factors.totp ? "on" : "off"}</span
      >
    </h2>
    <p class="text-sm opacity-70">
      After your password, enter a code from an authenticator app such as Google
      Authenticator, 1Password or Authy.
    </p>
    {#if !data.factors.totp}
      {#if setup}
        <div class="flex flex-wrap gap-4 items-start">
          {#if qr}<img
              src={qr}
              alt="QR code for your authenticator app"
              width="200"
              height="200"
              class="rounded-box border border-base-300"
            />{/if}
          <div class="space-y-2 text-sm min-w-0">
            <p>Scan the code, or enter this key by hand:</p>
            <code
              class="block break-all rounded bg-base-200 p-2"
              data-testid="totp-secret">{setup.secret}</code
            >
            <form
              method="POST"
              action="?/totpConfirm"
              use:enhance
              class="flex gap-2"
            >
              <input
                name="code"
                class="input input-sm w-32 font-mono"
                inputmode="numeric"
                maxlength="6"
                placeholder="123456"
                autocomplete="one-time-code"
                required
              />
              <button class="btn btn-primary btn-sm">Turn on</button>
            </form>
          </div>
        </div>
      {:else}
        <form method="POST" action="?/totpStart" use:enhance>
          <button class="btn btn-primary btn-sm"
            >Set up an authenticator app</button
          >
        </form>
      {/if}
    {:else}
      <p class="text-sm">{data.factors.recoveryLeft} recovery codes left.</p>
      <div class="flex flex-wrap gap-4">
        <form method="POST" action="?/codes" use:enhance class="flex gap-2">
          <input
            name="code"
            class="input input-sm w-28 font-mono"
            inputmode="numeric"
            maxlength="6"
            placeholder="Code"
            required
          />
          <button class="btn btn-sm">New recovery codes</button>
        </form>
        <form
          method="POST"
          action="?/totpDisable"
          use:enhance
          class="flex gap-2"
        >
          <input
            name="code"
            class="input input-sm w-28 font-mono"
            inputmode="numeric"
            maxlength="6"
            placeholder="Code"
            required
          />
          <button class="btn btn-sm btn-error btn-outline">Turn off</button>
        </form>
      </div>
    {/if}
  </div>
</section>

<section class="card bg-base-100 border border-base-300 mb-6 max-w-2xl">
  <div class="card-body gap-3">
    <h2 class="card-title text-base">Passkeys</h2>
    <p class="text-sm opacity-70">
      Sign in with your fingerprint, face or device PIN instead of a password.
      Passkeys cannot be phished.
    </p>
    {#each data.passkeys as p (p.id)}
      <div
        class="flex items-center justify-between gap-2 border-b border-base-200 pb-2 text-sm"
      >
        <span
          ><strong>{p.name}</strong>
          <span class="opacity-60"
            >added {formatDateTime(p.created_at)}{p.last_used_at
              ? `, last used ${formatDateTime(p.last_used_at)}`
              : ""}</span
          ></span
        >
        <form method="POST" action="?/passkeyRemove" use:enhance>
          <input type="hidden" name="id" value={p.id} /><button
            class="btn btn-ghost btn-xs text-error">Remove</button
          >
        </form>
      </div>
    {/each}
    <div class="flex flex-wrap gap-2">
      <input
        class="input input-sm"
        placeholder="Name, e.g. MacBook"
        maxlength="80"
        bind:value={passkeyName}
      />
      <button
        type="button"
        class="btn btn-sm"
        onclick={addPasskey}
        disabled={adding}
        >{adding ? "Waiting for your device..." : "Add a passkey"}</button
      >
    </div>
    {#if passkeyError}<p class="text-error text-sm">{passkeyError}</p>{/if}
  </div>
</section>

<section class="card bg-base-100 border border-base-300 mb-6 max-w-2xl">
  <div class="card-body gap-3">
    <div class="flex items-center justify-between">
      <h2 class="card-title text-base">Where you're signed in</h2>
      {#if data.sessions.length > 1}<form
          method="POST"
          action="?/signOut"
          use:enhance
        >
          <input type="hidden" name="ref" value="others" /><button
            class="btn btn-xs">Sign out everywhere else</button
          >
        </form>{/if}
    </div>
    {#each data.sessions as s (s.ref)}
      <div
        class="flex items-center justify-between gap-2 border-b border-base-200 pb-2 text-sm"
      >
        <span
          >{device(s.device)}{#if s.current}
            <span class="badge badge-sm badge-primary">this device</span
            >{/if}{#if s.mfa}
            <span class="badge badge-sm badge-ghost">2-step</span>{/if}
          <span class="block text-xs opacity-60"
            >Signed in {formatDateTime(s.created)}{s.seen
              ? `, last active ${formatDateTime(s.seen)}`
              : ""}</span
          ></span
        >
        {#if !s.current}<form method="POST" action="?/signOut" use:enhance>
            <input type="hidden" name="ref" value={s.ref} /><button
              class="btn btn-ghost btn-xs">Sign out</button
            >
          </form>{/if}
      </div>
    {/each}
  </div>
</section>
