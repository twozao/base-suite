import { sveltekit } from "@sveltejs/kit/vite"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [sveltekit()],
  define: {
    __CLOUDFLARE__: JSON.stringify(
      process.env.BUILD_TARGET?.startsWith("cloudflare") ?? false,
    ),
  },
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}", "packages/**/*.test.ts"],
    globals: true, // allows skipping the import of describe, it, expect and friends
    // Tests on a shared Postgres database (TEST_DATABASE_URL) must not run files side by side.
    fileParallelism: !process.env.TEST_DATABASE_URL,
  },
})
