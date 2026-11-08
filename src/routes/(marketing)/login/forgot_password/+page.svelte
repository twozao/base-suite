<script lang="ts">
  import { enhance } from "$app/forms"

  let { data, form } = $props()
  let loading = $state(false)
</script>

<svelte:head>
  <title>Forgot password</title>
</svelte:head>

<h1 class="text-2xl font-bold mb-6">Forgot password</h1>
{#if !data.mailConfigured}
  <div role="alert" class="alert alert-warning mb-5 text-left">
    <span
      >Email is not set up on this site yet, so a reset link cannot be sent. Ask
      the site owner to reset your password.</span
    >
  </div>
{:else if form?.sent}
  <div role="alert" class="alert alert-success mb-5 text-left">
    <span
      >If an account exists for {form.email}, a reset link is on its way. It is
      valid for one hour.</span
    >
  </div>
{:else}
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
    {#if form?.error}
      <p class="text-error text-sm">{form.error}</p>
    {/if}
    <button class="btn btn-primary mt-2" disabled={loading}>
      {loading ? "Sending..." : "Send reset link"}
    </button>
  </form>
{/if}
<div class="text-base-content/80 mt-4">
  Remember your password? <a class="underline" href="/login/sign_in">Sign in</a
  >.
</div>
