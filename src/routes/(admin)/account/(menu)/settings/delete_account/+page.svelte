<script lang="ts">
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"
  import SettingsModule from "../settings_module.svelte"

  let adminSection: Writable<string> = getContext("adminSection")
  adminSection.set("settings")

  let { data } = $props()
</script>

<svelte:head>
  <title>Delete Account</title>
</svelte:head>

<h1 class="text-2xl font-bold mb-6">Settings</h1>

<SettingsModule
  title="Delete Account"
  editable={true}
  dangerous={true}
  message="Deleting your account can not be undone. You are currently signed in as '{data
    .user.email}'"
  saveButtonTitle="Delete Account"
  successTitle="Account deleted"
  successBody="Your account has been deleted."
  formTarget="/account/api?/deleteAccount"
  fields={data.hasPassword
    ? [
        {
          id: "currentPassword",
          label: "Current Password",
          initialValue: "",
          inputType: "password",
        },
      ]
    : [
        {
          id: "confirmEmail",
          label: "Type your email to confirm",
          initialValue: "",
        },
      ]}
/>
