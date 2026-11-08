<script lang="ts">
  // Small built-in icon set (24x24 outline). Names match ICONS in
  // $lib/server/content_schema so owners can pick them in the admin.
  let { name, class: klass = "h-6 w-6" }: { name: string; class?: string } =
    $props()

  const PATHS: Record<string, string> = {
    bolt: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    shield: "M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3zm-3 9l2 2 4-4",
    chat: "M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.4-4 8-9 8a9.8 9.8 0 01-4-.8L3 20l1.3-3.9A7.6 7.6 0 013 12c0-4.4 4-8 9-8s9 3.6 9 8z",
    calendar:
      "M8 7V3m8 4V3M4 11h16M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    chart: "M4 20V10m6 10V4m6 16v-7m4 7H2",
    users:
      "M17 20v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2m18 0v-2a4 4 0 00-3-3.9M14 4.1a4 4 0 010 7.8M14 8a4 4 0 11-8 0 4 4 0 018 0z",
    globe:
      "M12 21a9 9 0 100-18 9 9 0 000 18zm0 0c2.5-2.5 3.5-5.5 3.5-9S14.5 5.5 12 3m0 18c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3M3.5 9h17m-17 6h17",
    sparkles:
      "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3zm7 12l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z",
    heart:
      "M12 20s-7-4.4-9.3-9A5 5 0 0112 5.6 5 5 0 0121.3 11C19 15.6 12 20 12 20z",
    lock: "M6 11h12a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1v-8a1 1 0 011-1zm2 0V8a4 4 0 118 0v3",
    rocket:
      "M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2m-1-4l4 4m-6-1l-2-2 3-3h4m5 5v4l-3 3-2-2M14 4c3-1.5 6-1 6-1s.5 3-1 6l-7 7-5-5 7-7zm1 5a1 1 0 100-2 1 1 0 000 2z",
    star: "M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3z",
    clock: "M12 7v5l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z",
    mail: "M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1zm0 1l8 6 8-6",
    card: "M3 10h18M7 15h3M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    layers: "M12 3l9 5-9 5-9-5 9-5zm-9 9l9 5 9-5M3 16l9 5 9-5",
    check: "M5 12l5 5L20 7",
    search: "M21 21l-4.3-4.3M17 11a6 6 0 11-12 0 6 6 0 0112 0z",
    factory: "M3 21V11l5 3v-3l5 3v-3l5 3V5h3v16H3zm3-3h2m3 0h2m3 0h2",
    cog: "M12 15a3 3 0 100-6 3 3 0 000 6zm0-12v3m0 12v3m9-9h-3M6 12H3m15.4-6.4l-2.1 2.1M8.7 15.3l-2.1 2.1m0-10.8l2.1 2.1m6.6 6.6l2.1 2.1",
    plug: "M9 3v4m6-4v4M7 7h10v4a5 5 0 01-10 0V7zm5 9v5",
    truck:
      "M3 7h11v9H3zm11 3h4l3 3v3h-7zM7 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm10 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
    cpu: "M8 8h8v8H8zM5 5h14v14H5zM9 2v3m6-3v3M9 19v3m6-3v3M2 9h3m-3 6h3m14-6h3m-3 6h3",
    wrench:
      "M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4L15 12l-3-3 2.7-2.7z",
    leaf: "M5 19C5 9 11 5 20 4c-1 9-5 15-15 15zm0 0l9-9",
    document:
      "M14 3H6a1 1 0 00-1 1v16a1 1 0 001 1h12a1 1 0 001-1V8l-5-5zm0 0v5h5M9 13h6m-6 4h6",
    phone:
      "M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z",
    pin: "M12 21s-7-6.5-7-11.5a7 7 0 0114 0C19 14.5 12 21 12 21zm0-9a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
    award: "M12 15a6 6 0 100-12 6 6 0 000 12zm-3.5-1.5L7 22l5-3 5 3-1.5-8.5",
    briefcase:
      "M4 8h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1zm5 0V5h6v3M3 13h18",
    building:
      "M4 21V4a1 1 0 011-1h9a1 1 0 011 1v17m0-9h4a1 1 0 011 1v8M8 7h3m-3 4h3m-3 4h3m-3 4h3",
    pen: "M4 20l4-1 11-11-3-3L5 16l-1 4zm10-13l3 3",
    code: "M8 8l-4 4 4 4m8-8l4 4-4 4m-6 3l4-14",
    menu: "M4 6h16M4 12h16M4 18h16",
    close: "M6 6l12 12M18 6L6 18",
    arrow: "M5 12h14m-6-6l6 6-6 6",
    x: "M4 4l16 16M20 4L4 20",
  }
</script>

<svg
  class={klass}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.8"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"><path d={PATHS[name] ?? PATHS.sparkles} /></svg
>
