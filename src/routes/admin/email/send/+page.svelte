<script lang="ts">
  import { enhance } from "$app/forms"
  import PageHeader from "$lib/components/admin/PageHeader.svelte"
  import Flash from "$lib/components/admin/Flash.svelte"
  import EmailTabs from "../EmailTabs.svelte"
  let { data, form } = $props()
  // svelte-ignore state_referenced_locally
  let slug = $state(
    data.templates.some((t) => t.slug === data.preselect)
      ? data.preselect
      : (data.templates[0]?.slug ?? ""),
  )
  const tpl = $derived(data.templates.find((t) => t.slug === slug))
  const defaults: Record<string, string> = $derived(data.defaults)
  const long = (v: string) => /details|intro|body|message/i.test(v)
</script>

<PageHeader title="Email" />
<EmailTabs />
<Flash {form} />

<form method="POST" use:enhance class="max-w-2xl space-y-3">
  <label class="text-sm block"
    >Template<select
      name="template"
      class="select select-sm w-full"
      bind:value={slug}
    >
      {#each data.templates as t (t.slug)}<option value={t.slug}
          >{t.name}</option
        >{/each}
    </select></label
  >
  <label class="text-sm block"
    >To<input
      name="to"
      class="input input-sm w-full"
      placeholder="name@example.com, other@example.com"
      maxlength="4000"
      required
    /><span class="text-xs opacity-60"
      >Up to 10 addresses. Each gets their own email.</span
    ></label
  >
  {#if tpl?.asksSubject}
    <label class="text-sm block"
      >Subject<input
        name="subject"
        class="input input-sm w-full"
        maxlength="300"
        required
      /></label
    >
  {:else}
    <p class="text-sm opacity-70">The subject comes from the template.</p>
  {/if}
  {#if tpl}
    {#key tpl.slug}
      {#each tpl.variables.filter((v) => v !== "subject") as v (v)}
        <label class="text-sm block"
          ><span class="font-mono">{v}</span>
          {#if long(v)}
            <textarea
              name="var_{v}"
              class="textarea textarea-sm w-full"
              maxlength="5000">{defaults[v] ?? ""}</textarea
            >
          {:else}
            <input
              name="var_{v}"
              class="input input-sm w-full"
              value={defaults[v] ?? ""}
              maxlength="5000"
            />
          {/if}
        </label>
      {/each}
    {/key}
    <a href="/admin/email/templates/{tpl.slug}" class="link text-sm"
      >Preview or edit this template</a
    >
  {/if}
  <div><button class="btn btn-primary btn-sm">Send</button></div>
</form>
