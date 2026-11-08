<script lang="ts">
  import { enhance } from "$app/forms"
  import { startAuthentication } from "@simplewebauthn/browser"
  let { form } = $props()
  let recovery = $state(false)
  let passkeyError = $state("")

  async function passkey() {
    passkeyError = ""
    try {
      const options = await (
        await fetch("/login/passkey", { method: "POST" })
      ).json()
      const response = await startAuthentication({ optionsJSON: options })
      const res = await fetch("/login/passkey", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ response }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok)
        throw new Error(data.message || "That passkey could not be used")
      location.href = data.next
    } catch (e) {
      passkeyError =
        e instanceof Error && e.name !== "NotAllowedError"
          ? e.message
          : "Passkey sign-in was cancelled"
    }
  }
</script>

<svelte:head><title>Two-step sign-in</title></svelte:head>

<h1 class="text-2xl font-bold mb-2">Two-step sign-in</h1>
<p class="text-sm text-base-content/70 mb-6">
  {recovery
    ? "Enter one of your recovery codes."
    : "Enter the 6-digit code from your authenticator app, or use your passkey."}
</p>
<form method="POST" use:enhance class="flex flex-col gap-3 text-left">
  <label class="form-control">
    <span class="label-text">{recovery ? "Recovery code" : "Code"}</span>
    <!-- svelte-ignore a11y_autofocus -->
    <input
      name="code"
      class="input input-bordered w-full font-mono tracking-widest"
      autocomplete="one-time-code"
      inputmode={recovery ? "text" : "numeric"}
      maxlength="20"
      autofocus
      required
    />
  </label>
  {#if form?.error}<p class="text-error text-sm" role="alert">
      {form.error}
    </p>{/if}
  <button class="btn btn-primary mt-2">Continue</button>
</form>
<button type="button" class="btn btn-outline w-full mt-4" onclick={passkey}
  >Use a passkey</button
>
{#if passkeyError}<p class="text-error text-sm mt-2" role="alert">
    {passkeyError}
  </p>{/if}
<button
  type="button"
  class="btn btn-link btn-sm mt-3 px-0"
  onclick={() => (recovery = !recovery)}
>
  {recovery ? "Use the authenticator app" : "Use a recovery code instead"}
</button>
