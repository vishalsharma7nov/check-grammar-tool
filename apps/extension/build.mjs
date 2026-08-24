import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const entry = join(here, "../../packages/engine/src/browser.ts");

await build({
  absWorkingDir: here,
  entryPoints: [entry],
  bundle: true,
  format: "iife",
  globalName: "CheckGrammar",
  outfile: join(here, "engine.js"),
  platform: "browser",
  target: "es2020",
  logLevel: "info",
});
