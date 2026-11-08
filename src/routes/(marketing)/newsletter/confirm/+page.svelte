<script lang="ts">
  let { data } = $props()
</script>

<svelte:head
  ><title>Subscription</title><meta
    name="robots"
    content="noindex"
  /></svelte:head
>
<section class="min-h-[60vh] grid place-items-center px-4 py-20 text-center">
  <div class="max-w-md">
    <h1 class="text-3xl font-bold">
      {data.ok ? "You're subscribed" : "Link expired"}
    </h1>
    <p class="mt-3 text-base-content/70">
      {data.ok
        ? `Thanks for confirming. You'll hear from ${data.site.brand.siteName} soon.`
        : "This confirmation link is invalid or was already used. Try signing up again."}
    </p>
    <a href={data.ok ? "/blog" : "/newsletter"} class="btn btn-primary mt-8"
      >{data.ok ? "Read the blog" : "Sign up"}</a
    >
  </div>
</section>
