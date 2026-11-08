<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  let { data, form } = $props()
</script>

<PageHeader title="Security" subtitle="How staff sign in to the admin." />
<Flash {form} />

<form
  method="POST"
  use:enhance
  class="card bg-base-100 border border-base-300 mb-6 max-w-2xl"
>
  <div class="card-body gap-3">
    <label class="flex items-start gap-3">
      <input
        type="checkbox"
        name="requireStaff2fa"
        class="checkbox checkbox-sm mt-1"
        checked={data.security.requireStaff2fa}
      />
      <span
        ><strong>Require two-step sign-in for staff</strong><br /><span
          class="text-sm opacity-70"
          >Staff without an authenticator app or passkey are sent to set one up
          before they can use the admin.</span
        ></span
      >
    </label>
    <button class="btn btn-primary btn-sm w-fit">Save</button>
  </div>
</form>

<section class="card bg-base-100 border border-base-300 mb-6 max-w-2xl">
  <div class="card-body gap-2">
    <h2 class="card-title text-base">
      Cloudflare Access <span
        class="badge badge-sm {data.access ? 'badge-success' : 'badge-ghost'}"
        >{data.access ? "on" : "off"}</span
      >
    </h2>
    <p class="text-sm opacity-70">
      Puts a Cloudflare login page in front of /admin, so attackers never reach
      the sign-in form. Free for up to 50 users. Create an Access application
      for /admin in the Cloudflare dashboard, then set the CF_ACCESS_TEAM_DOMAIN
      and CF_ACCESS_AUD secrets.
    </p>
  </div>
</section>

<section class="max-w-2xl">
  <h2 class="font-semibold mb-2">Staff</h2>
  <div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
    <table class="table table-sm">
      <thead
        ><tr><th>Email</th><th>Authenticator app</th><th>Passkeys</th></tr
        ></thead
      >
      <tbody>
        {#each data.staff as s (s.email)}
          <tr
            ><td>{s.email}</td><td>{s.totp ? "On" : "Off"}</td><td
              >{s.passkeys}</td
            ></tr
          >
        {/each}
      </tbody>
    </table>
  </div>
</section>
