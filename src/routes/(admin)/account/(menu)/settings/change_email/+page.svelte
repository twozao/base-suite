<script lang="ts">
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"
  import SettingsModule from "../settings_module.svelte"

  let adminSection: Writable<string> = getContext("adminSection")
  adminSection.set("settings")

  let { data } = $props()

  let user = $derived(data.user)
</script>

<svelte:head>
  <title>Change Email</title>
</svelte:head>

<h1 class="text-2xl font-bold mb-6">Settings</h1>

<SettingsModule
  title="Change Email"
  editable={true}
  successTitle="Email changed"
  successBody="Sign in with the new address from now on. If email is set up on this site, a verification link was sent to it."
  formTarget="/account/api?/updateEmail"
  fields={[
    {
      id: "email",
      label: "Email",
      initialValue: user?.email ?? "",
      placeholder: "Email address",
    },
    {
      id: "currentPassword",
      label: "Current Password",
      initialValue: "",
      inputType: "password",
    },
  ]}
/>
