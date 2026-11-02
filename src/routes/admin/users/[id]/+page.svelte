<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import StatusBadge from "$lib/components/admin/StatusBadge.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  import { formatDate, formatDateTime } from "$lib/format"
  let { data, form } = $props()
</script>

<PageHeader
  title={data.user.email ?? "User"}
  subtitle={data.profile?.full_name ?? ""}
  back="/admin/users"
/>
<Flash {form} />

<div class="grid gap-6 lg:grid-cols-3">
  <section class="card bg-base-100 border border-base-300 lg:col-span-1">
    <div class="card-body">
      <h2 class="card-title text-base">Profile</h2>
      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt class="opacity-60">Name</dt>
        <dd>{data.profile?.full_name ?? "—"}</dd>
        <dt class="opacity-60">Company</dt>
        <dd>{data.profile?.company_name ?? "—"}</dd>
        <dt class="opacity-60">Website</dt>
        <dd class="break-all">{data.profile?.website ?? "—"}</dd>
        <dt class="opacity-60">Email</dt>
        <dd>{data.user.confirmed ? "Verified" : "Unverified"}</dd>
        <dt class="opacity-60">Sign-in</dt>
        <dd>{data.user.providers.join(", ") || "email"}</dd>
        <dt class="opacity-60">Joined</dt>
        <dd>{formatDate(data.user.createdAt)}</dd>
        <dt class="opacity-60">Last seen</dt>
        <dd>{formatDateTime(data.user.lastSignInAt)}</dd>
        <dt class="opacity-60">Marketing</dt>
        <dd>{data.profile?.unsubscribed ? "Unsubscribed" : "Subscribed"}</dd>
      </dl>
    </div>
  </section>

  <section class="card bg-base-100 border border-base-300 lg:col-span-2">
    <div class="card-body">
      <h2 class="card-title text-base">Roles</h2>
      {#if data.canManageRoles}
        <form method="POST" action="?/setRoles" use:enhance class="space-y-2">
          {#each data.allRoles as r}
            <label class="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                class="checkbox checkbox-sm mt-0.5"
                name="roles"
                value={r.role}
                checked={data.roles.includes(r.role)}
                disabled={data.isSelf && r.role === "admin"}
              />
              {#if data.isSelf && r.role === "admin"}<input
                  type="hidden"
                  name="roles"
                  value="admin"
                />{/if}
              <span
                ><span class="font-medium capitalize">{r.role}</span><br /><span
                  class="text-sm opacity-70">{r.description}</span
                ></span
              >
            </label>
          {/each}
          <button class="btn btn-primary btn-sm mt-2">Save roles</button>
        </form>
      {:else}
        <div class="flex gap-1">
          {#each data.roles as r}<StatusBadge status={r} />{:else}<span
              class="opacity-60">No staff roles</span
            >{/each}
        </div>
      {/if}
    </div>
  </section>

  {#if data.subscriptions}
    <section class="card bg-base-100 border border-base-300 lg:col-span-3">
      <div class="card-body">
        <h2 class="card-title text-base">Subscriptions</h2>
        {#each data.subscriptions as s}
          <div
            class="flex flex-wrap justify-between gap-2 py-2 border-b border-base-200 last:border-0 text-sm"
          >
            <span class="font-mono">{s.id}</span>
            <span class="flex gap-3 items-center"
              ><StatusBadge status={s.status} />
              {s.cancel_at_period_end ? "Cancels" : "Renews"}
              {formatDate(s.current_period_end)}</span
            >
          </div>
        {:else}<p class="opacity-60 text-sm">No subscriptions.</p>{/each}
      </div>
    </section>
  {/if}

  {#if data.chats}
    <section class="card bg-base-100 border border-base-300">
      <div class="card-body">
        <h2 class="card-title text-base">Chats</h2>
        {#each data.chats as c}
          <a
            class="flex justify-between py-1 text-sm link-hover"
            href="/admin/support/{c.id}"
            ><span>{formatDateTime(c.last_message_at)}</span><StatusBadge
              status={c.status}
            /></a
          >
        {:else}<p class="opacity-60 text-sm">None.</p>{/each}
      </div>
    </section>
  {/if}
  {#if data.contacts}
    <section class="card bg-base-100 border border-base-300">
      <div class="card-body">
        <h2 class="card-title text-base">Contact requests</h2>
        {#each data.contacts as c}
          <a
            class="flex justify-between py-1 text-sm link-hover"
            href="/admin/contact/{c.id}"
            ><span>{formatDate(c.created_at)}</span><StatusBadge
              status={c.status}
            /></a
          >
        {:else}<p class="opacity-60 text-sm">None.</p>{/each}
      </div>
    </section>
  {/if}
  {#if data.bookings}
    <section class="card bg-base-100 border border-base-300">
      <div class="card-body">
        <h2 class="card-title text-base">Bookings</h2>
        {#each data.bookings as b}
          <div class="flex justify-between py-1 text-sm">
            <span>{b.event_name} · {formatDate(b.start_time)}</span><StatusBadge
              status={b.status}
            />
          </div>
        {:else}<p class="opacity-60 text-sm">None.</p>{/each}
      </div>
    </section>
  {/if}
</div>
