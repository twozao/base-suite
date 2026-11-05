<script lang="ts">
  import { onMount } from "svelte"

  let form: HTMLFormElement
  onMount(() => form.requestSubmit())
</script>

<svelte:head>
  <title>Signing out</title>
</svelte:head>

<form method="POST" bind:this={form} class="m-6 mx-auto text-center">
  <h1 class="text-2xl font-bold mb-4">Signing out...</h1>
  <button class="btn btn-outline">Sign out</button>
</form>
