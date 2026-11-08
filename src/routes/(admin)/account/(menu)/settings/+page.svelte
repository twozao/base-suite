<script lang="ts">
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"
  import { page } from "$app/stores"
  import { OAUTH_ERRORS } from "$lib/signin_providers"
  import SettingsModule from "./settings_module.svelte"

  let adminSection: Writable<string> = getContext("adminSection")
  adminSection.set("settings")

  let { data } = $props()
  let profile = $derived(data.profile)
  let user = $derived(data.user)
  // Shows connected providers even if the site has since turned them off, so they can be removed.
  const LABELS: Record<string, string> = { google: "Google", github: "GitHub" }
  let methods = $derived([
    ...data.signinProviders.map((p) => p.id),
    ...data.linked.filter(
      (id) => !data.signinProviders.some((p) => p.id === id),
    ),
  ])
  let oauthError = $derived(
    OAUTH_ERRORS[$page.url.searchParams.get("oauth_error") ?? ""],
  )
  let oauthNote = $derived($page.url.searchParams.get("oauth"))
</script>

<svelte:head>
  <title>Settings</title>
</svelte:head>

<h1 class="text-2xl font-bold mb-6">Settings</h1>

<SettingsModule
  title="Profile"
  editable={false}
  fields={[
    { id: "fullName", label: "Name", initialValue: profile?.full_name ?? "" },
    {
      id: "companyName",
      label: "Company Name",
      initialValue: profile?.company_name ?? "",
    },
    {
      id: "website",
      label: "Company Website",
      initialValue: profile?.website ?? "",
    },
  ]}
  editButtonTitle="Edit Profile"
  editLink="/account/settings/edit_profile"
/>

<SettingsModule
  title="Email"
  editable={false}
  fields={[{ id: "email", initialValue: user?.email || "" }]}
  editButtonTitle="Change Email"
  editLink="/account/settings/change_email"
/>

{#if data.passwordSignIn}
  <SettingsModule
    title="Password"
    editable={false}
    fields={[
      {
        id: "password",
        initialValue: data.hasPassword ? "****************" : "Not set",
      },
    ]}
    editButtonTitle={data.hasPassword ? "Change Password" : "Set Password"}
    editLink="/account/settings/change_password"
  />
{/if}

<SettingsModule
  title="Security"
  editable={false}
  fields={[
    { id: "security", initialValue: "Two-step sign-in, passkeys and devices" },
  ]}
  editButtonTitle="Manage security"
  editLink="/account/settings/security"
/>

{#if methods.length}
  <div class="card p-6 pb-7 mt-8 max-w-xl flex flex-col md:flex-row shadow-sm">
    <div class="w-48 flex-none text-xl font-bold mb-3 md:mb-0">
      Connected accounts
    </div>
    <div class="w-full min-w-48 space-y-3">
      {#if oauthError}<p class="text-error text-sm" role="alert">
          {oauthError}
        </p>{/if}
      {#if oauthNote === "connected"}<p
          class="text-success text-sm"
          role="status"
        >
          Account connected.
        </p>{/if}
      {#if oauthNote === "disconnected"}<p
          class="text-success text-sm"
          role="status"
        >
          Account disconnected.
        </p>{/if}
      {#each methods as id (id)}
        <div class="flex items-center justify-between gap-3">
          <span>{LABELS[id]}</span>
          {#if data.linked.includes(id)}
            <form
              method="POST"
              action="/account/api?/unlinkOAuth"
              data-sveltekit-reload
            >
              <input type="hidden" name="provider" value={id} />
              <button class="btn btn-outline btn-sm">Disconnect</button>
            </form>
          {:else}
            <form method="POST" action="/auth/oauth/{id}" data-sveltekit-reload>
              <button class="btn btn-outline btn-sm">Connect</button>
            </form>
          {/if}
        </div>
      {/each}
    </div>
  </div>
{/if}

<SettingsModule
  title="Email Subscription"
  editable={false}
  fields={[
    {
      id: "subscriptionStatus",
      initialValue: profile?.unsubscribed ? "Unsubscribed" : "Subscribed",
    },
  ]}
  editButtonTitle="Change Subscription"
  editLink="/account/settings/change_email_subscription"
/>

<SettingsModule
  title="Danger Zone"
  editable={false}
  dangerous={true}
  fields={[]}
  editButtonTitle="Delete Account"
  editLink="/account/settings/delete_account"
/>
