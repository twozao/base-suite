<script lang="ts">
  let { status }: { status: string | null | undefined } = $props()
  const tone: Record<string, string> = {
    new: "badge-info",
    open: "badge-warning",
    pending: "badge-warning",
    closed: "badge-ghost",
    spam: "badge-error",
    draft: "badge-ghost",
    published: "badge-success",
    archived: "badge-neutral",
    scheduled: "badge-success",
    canceled: "badge-error",
    active: "badge-success",
    trialing: "badge-info",
    past_due: "badge-warning",
    unpaid: "badge-error",
    incomplete: "badge-warning",
    incomplete_expired: "badge-ghost",
    paused: "badge-neutral",
    admin: "badge-primary",
    editor: "badge-secondary",
    support: "badge-accent",
  }
</script>

<span
  class="badge badge-sm whitespace-nowrap {tone[status ?? ''] ?? 'badge-ghost'}"
>
  {(status ?? "none").replace(/_/g, " ")}
</span>
