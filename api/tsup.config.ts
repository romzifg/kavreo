import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  // Prisma Client hasil generate (src/generated) ikut ter-bundle,
  // sedangkan paket di node_modules tetap external.
});
