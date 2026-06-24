import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    prerender: {
      enabled: true,
      failOnError: true,
    },
    spa: {
      enabled: true,
      maskPath: "/",
      prerender: {
        outputPath: "/index",
        crawlLinks: false,
      },
    },
  },
});
