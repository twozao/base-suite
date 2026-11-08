<script lang="ts">
  import { enhance } from "$app/forms"
  import { page } from "$app/stores"
  import OAuthButtons from "$lib/components/site/OAuthButtons.svelte"
  import { OAUTH_ERRORS } from "$lib/signin_providers"
  import { startAuthentication } from "@simplewebauthn/browser"

  let { data, form } = $props()
  const oauthError = $derived(
    OAUTH_ERRORS[$page.url.searchParams.get("oauth_error") ?? ""],
  )
  let loading = $state(false)
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
        body: JSON.stringify({
          response,
          next: $page.url.searchParams.get("next"),
        }),
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

<svelte:head>
  <title>Sign in</title>
</svelte:head>

{#if $page.url.searchParams.get("verified") === "true"}
  <div role="alert" class="alert alert-success mb-5">
    <span>Email verified. Please sign in.</span>
  </div>
{/if}
{#if $page.url.searchParams.get("reset") === "true"}
  <div role="alert" class="alert alert-success mb-5">
    <span>Password changed. Please sign in.</span>
  </div>
{/if}
{#if oauthError}
  <div role="alert" class="alert alert-error mb-5 text-left">
    <span>{oauthError}</span>
  </div>
{/if}
<h1 class="text-2xl font-bold mb-6">Sign in</h1>
{#if !data.signin.enabled}
  <p class="text-sm text-base-content/70 mb-4">Sign-in is limited to staff.</p>
{/if}
<OAuthButtons
  providers={data.signin.providers}
  next={$page.url.searchParams.get("next")}
/>
{#if data.signin.providers.length && data.signin.password}
  <div class="divider text-sm text-base-content/60">or</div>
{/if}
{#if data.signin.password}
  <form
    method="POST"
    class="flex flex-col gap-3 text-left"
    use:enhance={() => {
      loading = true
      return async ({ update }) => {
        await update({ reset: false })
        loading = false
      }
    }}
  >
    <label class="form-control">
      <span class="label-text">Email</span>
      <input
        name="email"
        type="email"
        autocomplete="email"
        required
        class="input input-bordered w-full"
        value={form?.email ?? ""}
      />
    </label>
    <label class="form-control">
      <span class="label-text">Password</span>
      <input
        name="password"
        type="password"
        autocomplete="current-password"
        required
        class="input input-bordered w-full"
      />
    </label>
    {#if form?.error}
      <p class="text-error text-sm">{form.error}</p>
    {/if}
    <button class="btn btn-primary mt-2" disabled={loading}>
      {loading ? "Signing in..." : "Sign in"}
    </button>
  </form>
{/if}
<button type="button" class="btn btn-outline w-full mt-4" onclick={passkey}
  >Sign in with a passkey</button
>
{#if passkeyError}<p class="text-error text-sm mt-2" role="alert">
    {passkeyError}
  </p>{/if}
{#if $page.url.searchParams.get("mfa") === "expired"}<p
    class="text-warning text-sm mt-2"
  >
    The sign-in took too long. Please start again.
  </p>{/if}
{#if data.signin.password}
  <div class="text-base-content/80 mt-4">
    <a class="underline" href="/login/forgot_password">Forgot password?</a>
  </div>
{/if}
{#if data.signin.canSignUp}
  <div class="text-base-content/80 mt-3">
    Don't have an account? <a
      class="underline"
      href="/login/sign_up{$page.url.search}">Sign up</a
    >.
  </div>
{/if}
