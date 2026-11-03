<script lang="ts">
  // Labelled text input / textarea bound to a value.
  let {
    label,
    value = $bindable(),
    multiline = false,
    rows = 3,
    placeholder = "",
    hint = "",
    max = 500,
    mono = false,
    type = "text",
  }: {
    label: string
    value: string
    multiline?: boolean
    rows?: number
    placeholder?: string
    hint?: string
    max?: number
    mono?: boolean
    type?: string
  } = $props()
</script>

<label class="block">
  <span class="mb-1 block text-sm font-medium">{label}</span>
  {#if multiline}
    <textarea
      class="textarea w-full {mono ? 'font-mono text-sm' : ''}"
      {rows}
      {placeholder}
      maxlength={max}
      bind:value
    ></textarea>
  {:else}
    <input
      class="input w-full {mono ? 'font-mono text-sm' : ''}"
      {type}
      {placeholder}
      maxlength={max}
      bind:value
    />
  {/if}
  {#if hint}<span class="mt-1 block text-xs text-base-content/60">{hint}</span
    >{/if}
</label>
