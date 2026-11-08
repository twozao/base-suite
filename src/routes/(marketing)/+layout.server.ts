import { structuredData } from "$lib/server/plugins/seo"
import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async ({ locals, url }) => ({
  // Escaped so the JSON can never close its script tag.
  jsonLd: (await structuredData(locals.db, url)).map((d) =>
    JSON.stringify(d).replace(/</g, "\\u003c"),
  ),
})
