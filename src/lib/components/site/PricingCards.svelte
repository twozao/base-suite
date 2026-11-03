<script lang="ts">
  import Icon from "./Icon.svelte"

  type Plan = {
    id: string
    name: string
    description: string
    price: string
    interval: string
    features: string[]
    highlighted: boolean
    ctaLabel: string
    href: string
  }
  let { plans, currentPlanId = "" }: { plans: Plan[]; currentPlanId?: string } =
    $props()
  // Static class names so Tailwind can see them
  const COLS = [
    "lg:grid-cols-1",
    "lg:grid-cols-1",
    "lg:grid-cols-2",
    "lg:grid-cols-3",
  ]
  const cols = $derived(COLS[Math.min(plans.length, 3)])
</script>

<div class="grid gap-6 md:grid-cols-2 {cols} items-stretch">
  {#each plans as plan (plan.id)}
    <div
      class="relative flex flex-col rounded-box border bg-base-100 p-8 {plan.highlighted
        ? 'border-primary shadow-xl ring-1 ring-primary'
        : 'border-base-300'}"
    >
      {#if plan.highlighted}
        <span class="badge badge-primary absolute -top-3 left-8"
          >Most popular</span
        >
      {/if}
      <h3 class="text-lg font-semibold">{plan.name}</h3>
      <p class="mt-1 text-sm text-base-content/70 min-h-10">
        {plan.description}
      </p>
      <p class="mt-6 flex items-baseline gap-1">
        <span class="text-4xl font-bold tracking-tight">{plan.price}</span>
        <span class="text-sm text-base-content/60">{plan.interval}</span>
      </p>
      <ul class="mt-6 space-y-3 text-sm grow">
        {#each plan.features as f}
          <li class="flex gap-2">
            <Icon name="check" class="h-5 w-5 text-primary shrink-0" />{f}
          </li>
        {/each}
      </ul>
      {#if plan.id === currentPlanId}
        <span
          class="btn btn-outline btn-success mt-8 no-animation cursor-default"
          >Current plan</span
        >
      {:else}
        <a
          href={plan.href}
          class="btn mt-8 {plan.highlighted ? 'btn-primary' : 'btn-outline'}"
          >{plan.ctaLabel || "Choose plan"}</a
        >
      {/if}
    </div>
  {/each}
</div>
