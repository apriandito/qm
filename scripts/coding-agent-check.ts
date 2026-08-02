import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultModelForProvider } from "../src/model/pi-models.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let ok = true;
function check(label: string, pass: boolean, detail = ""): void {
  console.log(`${pass ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) ok = false;
}

const provider = (process.env.MODEL_PROVIDER ?? "deepseek").trim();
const codingModel = defaultModelForProvider("pi", provider as Parameters<typeof defaultModelForProvider>[1]);
check(
  `A coding harness (pi) can serve MODEL_PROVIDER=${provider}`,
  Boolean(codingModel),
  codingModel ?? "no serviceable model",
);

const dockerfile = readFileSync(join(ROOT, "fly", "Dockerfile"), "utf8");
for (const tool of ["git", "node", "python3"]) {
  check(`The agent sandbox ships ${tool}`, new RegExp(`\\b${tool}\\b`).test(dockerfile));
}

const piTools = readFileSync(join(ROOT, "src", "harness", "pi-tools.ts"), "utf8");
check("The execute tool is wired (the agent can run commands)", /name:\s*"execute"/.test(piTools));

const config = readFileSync(join(ROOT, "src", "config.ts"), "utf8");
check(
  "SANDBOX_BACKEND=local is available for a self-hosted sandbox",
  /SANDBOX_BACKEND/.test(config) && /["|]local\b/.test(config),
);

console.log(ok ? "\nCoding-agent readiness: PASS" : "\nCoding-agent readiness: FAIL");
console.log("Note: this checks configuration coherence, not live model quality on a real coding task.");
process.exit(ok ? 0 : 1);
