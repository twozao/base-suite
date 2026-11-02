<script lang="ts">
  // Shows the result of the last form action ({ message } or { error }).
  let {
    form,
  }: { form: { message?: string; error?: string } | null | undefined } =
    $props()
</script>

{#if form?.error}
  <div role="alert" class="alert alert-error mb-4">
    <span>{form.error}</span>
  </div>
{:else if form?.message}
  <div role="status" class="alert alert-success mb-4">
    <span>{form.message}</span>
  </div>
{/if}
