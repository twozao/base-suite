<script lang="ts">
  import { enhance } from "$app/forms"

  let { data, form } = $props()
  let loading = $state(false)
</script>

<svelte:head>
  <title>Choose a new password</title>
</svelte:head>

<h1 class="text-2xl font-bold mb-6">Choose a new password</h1>
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
  <input type="hidden" name="token" value={data.token} />
  <label class="form-control">
    <span class="label-text">New password</span>
    <input
      name="newPassword1"
      type="password"
      autocomplete="new-password"
      required
      minlength="8"
      class="input input-bordered w-full"
    />
  </label>
  <label class="form-control">
    <span class="label-text">Confirm new password</span>
    <input
      name="newPassword2"
      type="password"
      autocomplete="new-password"
      required
      class="input input-bordered w-full"
    />
  </label>
  {#if form?.error}
    <p class="text-error text-sm">{form.error}</p>
  {/if}
  <button class="btn btn-primary mt-2" disabled={loading}>
    {loading ? "Saving..." : "Set password"}
  </button>
</form>
<div class="text-base-content/80 mt-4">
  <a class="underline" href="/login/forgot_password">Request a new link</a>
</div>
