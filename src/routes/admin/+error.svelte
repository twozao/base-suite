<script lang="ts">
  import { page } from "$app/stores"
</script>

<div class="hero min-h-[50vh]">
  <div class="hero-content text-center">
    <div>
      <h1 class="text-5xl font-bold">{$page.status}</h1>
      <p class="py-4">{$page.error?.message}</p>
      <a href="/admin" class="btn btn-primary">Back to dashboard</a>
    </div>
  </div>
</div>
