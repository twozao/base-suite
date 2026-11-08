<script lang="ts">
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Pagination from "$lib/components/admin/Pagination.svelte"
  import SearchBar from "$lib/components/admin/SearchBar.svelte"
  import StatusBadge from "$lib/components/admin/StatusBadge.svelte"
  import { formatDate, timeAgo } from "$lib/format"
  let { data } = $props()
</script>

<PageHeader title="Users" subtitle="Everyone with an account" />
<SearchBar q={data.q} placeholder="Search email, name or company" />

<div class="overflow-x-auto bg-base-100 border border-base-300 rounded-box">
  <table class="table">
    <thead>
      <tr
        ><th>User</th><th>Roles</th><th>Subscription</th><th>Joined</th><th
          >Last sign in</th
        ></tr
      >
    </thead>
    <tbody>
      {#each data.users as u (u.id)}
        <tr class="hover:bg-base-200">
          <td>
            <a class="font-medium link link-hover" href="/admin/users/{u.id}"
              >{u.email}</a
            >
            <div class="text-xs opacity-70">
              {[u.full_name, u.company_name].filter(Boolean).join(" - ")}
            </div>
          </td>
          <td
            ><div class="flex gap-1 flex-wrap">
              {#each u.roles as r}<StatusBadge status={r} />{/each}
            </div></td
          >
          <td
            >{#if u.subscription_status}<StatusBadge
                status={u.subscription_status}
              />{:else}<span class="opacity-50">Free</span>{/if}</td
          >
          <td class="whitespace-nowrap">{formatDate(u.created_at)}</td>
          <td class="whitespace-nowrap">{timeAgo(u.last_sign_in_at)}</td>
        </tr>
      {:else}
        <tr
          ><td colspan="5" class="text-center opacity-60 py-10"
            >No users found.</td
          ></tr
        >
      {/each}
    </tbody>
  </table>
</div>
<Pagination page={data.page} size={data.size} total={data.total} />
