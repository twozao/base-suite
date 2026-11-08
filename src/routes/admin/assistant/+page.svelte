<script lang="ts">
  import { onMount } from "svelte"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"

  // The admin screen ships with the assistant package, so it works the same in any host.
  onMount(() => {
    if (document.getElementById("assistant-admin-script")) return
    const s = document.createElement("script")
    s.id = "assistant-admin-script"
    s.src = "/assistant/admin.js"
    document.body.append(s)
  })
</script>

<PageHeader
  title="AI assistant"
  subtitle="What it knows, its instructions, models, tools and rules. Every change goes to the audit log."
/>

<assistant-admin base="/assistant"></assistant-admin>
