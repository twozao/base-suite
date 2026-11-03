<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import StatusBadge from "$lib/components/admin/StatusBadge.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  import Icon from "$lib/components/site/Icon.svelte"
  import { formatDate, formatDateTime } from "$lib/format"
  import { DEAL_STAGES, formatMoney } from "$lib/crm"
  let { data, form } = $props()
  const c = $derived(data.contact)
  const keep =
    () =>
    async ({
      update,
    }: {
      update: (o?: { reset?: boolean }) => Promise<void>
    }) =>
      update({ reset: false })

  const KIND: Record<string, { icon: string; label: string }> = {
    note: { icon: "layers", label: "Note" },
    call: { icon: "users", label: "Call" },
    email: { icon: "mail", label: "Email" },
    meeting: { icon: "calendar", label: "Meeting" },
    chat: { icon: "chat", label: "Live chat" },
    contact_form: { icon: "mail", label: "Contact form" },
    booking: { icon: "calendar", label: "Booking" },
    signup: { icon: "users", label: "Signed up" },
    newsletter: { icon: "mail", label: "Newsletter" },
    deal: { icon: "card", label: "Deal" },
    subscription: { icon: "card", label: "Subscription" },
  }
  const refHref = (t: string | null, id: string | null) =>
    t === "chat" && id
      ? `/admin/support/${id}`
      : t === "deal"
        ? "/admin/crm/deals"
        : null
  const stageLabel = (s: string) =>
    DEAL_STAGES.find((x) => x.id === s)?.label ?? s
</script>

<PageHeader
  title={c.name || c.email || "Contact"}
  subtitle={[c.company, c.email].filter(Boolean).join(" · ")}
  back="/admin/crm"
>
  {#snippet actions()}
    <StatusBadge status={c.status} />
    {#if c.email}<a class="btn btn-sm" href="mailto:{c.email}">Email</a>{/if}
    {#if c.user_id}<a class="btn btn-sm" href="/admin/users/{c.user_id}"
        >User account</a
      >{/if}
  {/snippet}
</PageHeader>
<Flash {form} />

<div class="grid gap-6 lg:grid-cols-[1fr_22rem]">
  <div class="space-y-6">
    <form
      method="POST"
      action="?/log"
      use:enhance
      class="card bg-base-100 border border-base-300"
    >
      <div class="card-body gap-3">
        <div class="flex gap-2 flex-wrap">
          {#each ["note", "call", "email", "meeting"] as k, i}
            <label class="btn btn-sm has-[:checked]:btn-primary"
              ><input
                type="radio"
                name="kind"
                value={k}
                class="hidden"
                checked={i === 0}
              />{KIND[k].label}</label
            >
          {/each}
        </div>
        <textarea
          name="body"
          class="textarea w-full"
          rows="3"
          maxlength="5000"
          placeholder="Log a note, call or meeting…"
          required
        ></textarea>
        <button class="btn btn-primary btn-sm w-fit">Add to timeline</button>
      </div>
    </form>

    <section class="card bg-base-100 border border-base-300">
      <div class="card-body">
        <h2 class="card-title text-base">Timeline</h2>
        <ol class="relative border-l border-base-300 ml-3 mt-2 space-y-5">
          {#each data.activities as a (a.id)}
            {@const href = refHref(a.ref_type, a.ref_id)}
            <li class="ml-6">
              <span
                class="absolute -left-3.5 grid h-7 w-7 place-items-center rounded-full bg-base-200 text-primary"
                ><Icon
                  name={KIND[a.kind]?.icon ?? "sparkles"}
                  class="h-4 w-4"
                /></span
              >
              <div class="text-sm">
                <span class="font-medium">{KIND[a.kind]?.label ?? a.kind}</span>
                <span class="text-base-content/60"
                  >· {formatDateTime(a.created_at)}</span
                >
                {#if href}<a class="link text-xs ml-1" {href}>open</a>{/if}
              </div>
              {#if a.body}<p
                  class="mt-1 whitespace-pre-wrap break-words text-base-content/80"
                >
                  {a.body}
                </p>{/if}
            </li>
          {:else}
            <li class="ml-6 text-base-content/60">No activity yet.</li>
          {/each}
        </ol>
      </div>
    </section>
  </div>

  <aside class="space-y-6">
    <form
      method="POST"
      action="?/save"
      use:enhance={keep}
      class="card bg-base-100 border border-base-300"
    >
      <div class="card-body gap-3">
        <h2 class="card-title text-base">Details</h2>
        <label class="block"
          ><span class="text-sm">Name</span><input
            class="input input-sm w-full"
            name="name"
            value={c.name ?? ""}
            maxlength="200"
          /></label
        >
        <label class="block"
          ><span class="text-sm">Company</span><input
            class="input input-sm w-full"
            name="company"
            value={c.company ?? ""}
            maxlength="200"
          /></label
        >
        <label class="block"
          ><span class="text-sm">Phone</span><input
            class="input input-sm w-full"
            name="phone"
            value={c.phone ?? ""}
            maxlength="60"
          /></label
        >
        <label class="block"
          ><span class="text-sm">Status</span>
          <select class="select select-sm w-full" name="status" value={c.status}
            >{#each ["lead", "customer", "archived"] as s}<option value={s}
                >{s}</option
              >{/each}</select
          ></label
        >
        <label class="block"
          ><span class="text-sm">Tags</span><input
            class="input input-sm w-full"
            name="tags"
            value={c.tags.join(", ")}
            maxlength="400"
            placeholder="vip, wholesale"
          /></label
        >
        <label class="block"
          ><span class="text-sm">Notes</span><textarea
            class="textarea textarea-sm w-full"
            name="notes"
            rows="4"
            maxlength="20000">{c.notes ?? ""}</textarea
          ></label
        >
        <p class="text-xs text-base-content/60">
          Source: {c.source ?? "—"} · Added {formatDate(c.created_at)}
        </p>
        <button class="btn btn-primary btn-sm">Save</button>
      </div>
    </form>

    <section class="card bg-base-100 border border-base-300">
      <div class="card-body gap-3">
        <h2 class="card-title text-base">Deals</h2>
        {#each data.deals as d (d.id)}
          <a
            href="/admin/crm/deals"
            class="flex justify-between gap-2 text-sm hover:bg-base-200 -mx-2 px-2 py-1 rounded"
          >
            <span class="truncate">{d.title}</span>
            <span class="shrink-0"
              >{formatMoney(d.value_cents, d.currency)} ·
              <span class="text-base-content/60">{stageLabel(d.stage)}</span
              ></span
            >
          </a>
        {:else}<p class="text-sm text-base-content/60">No deals yet.</p>{/each}
        <form
          method="POST"
          action="?/addDeal"
          use:enhance
          class="grid grid-cols-[1fr_6rem] gap-2 mt-2"
        >
          <input
            class="input input-sm col-span-2 w-full"
            name="title"
            placeholder="New deal title"
            maxlength="200"
            required
          />
          <input
            class="input input-sm w-full"
            name="value"
            type="number"
            min="0"
            step="1"
            placeholder="Value"
          />
          <input
            class="input input-sm w-full uppercase"
            name="currency"
            value="USD"
            maxlength="3"
            aria-label="Currency"
          />
          <input
            class="input input-sm col-span-2 w-full"
            name="expected_close"
            type="date"
            aria-label="Expected close"
          />
          <button class="btn btn-sm col-span-2">Add deal</button>
        </form>
      </div>
    </section>
  </aside>
</div>
