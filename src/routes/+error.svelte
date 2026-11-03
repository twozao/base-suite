<script lang="ts">
  import "../app.css"
  import { page } from "$app/stores"
  const notFound = $derived($page.status === 404)
</script>

<svelte:head
  ><title>{notFound ? "Page not found" : "Something went wrong"}</title
  ></svelte:head
>

<div class="min-h-[100vh] grid place-items-center bg-brand-glow px-4">
  <div class="max-w-lg text-center">
    <p class="text-sm font-semibold text-primary">{$page.status}</p>
    <h1 class="mt-2 text-4xl sm:text-5xl font-bold tracking-tight">
      {notFound ? "Page not found" : "Something went wrong"}
    </h1>
    <p class="mt-4 text-lg text-base-content/70">
      {notFound
        ? "Sorry, we couldn't find the page you were looking for."
        : ($page.error?.message ?? "Please try again in a moment.")}
    </p>
    <div class="mt-8 flex justify-center gap-3">
      <a href="/" class="btn btn-primary">Go home</a>
      <a href="/contact_us" class="btn btn-ghost">Contact us</a>
    </div>
  </div>
</div>
