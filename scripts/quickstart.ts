import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_FILE = join(ROOT, ".env.quickstart");

const BRAND = "Agent Inovasi";
const ORG = process.env.QUICKSTART_ORG?.trim() || "agentinovasi";
const PRINCIPAL = process.env.QUICKSTART_PRINCIPAL?.trim() || "admin";
const CORE_PORT = Number(process.env.QUICKSTART_CORE_PORT ?? 8080);
const WEB_PORT = Number(process.env.QUICKSTART_WEB_PORT ?? 8096);
const ADMIN_PORT = Number(process.env.QUICKSTART_ADMIN_PORT ?? 8090);
const DB_PORT = Number(process.env.QUICKSTART_DB_PORT ?? 5432);
const DB_CONTAINER = "agent-inovasi-postgres";
const DB_VOLUME = "agent-inovasi-pgdata";
const DB_USER = "qm";
const DB_NAME = "qm";
const SANDBOX_IMAGE = "qm-sandbox-local:latest";
const MIN_NODE = [24, 15, 0] as const;
const STRIP_ENV = [
  "CORE_SIGNING_SECRET",
  "CAPABILITY_SECRET",
  "PORTAL_IDENTITY_SECRET",
  "SKILL_SIGNING_SECRET",
  "NODE_ENV",
];

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

function tryExec(command: string, args: string[]): { ok: boolean; out: string } {
  try {
    return {
      ok: true,
      out: execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(),
    };
  } catch (error) {
    const out =
      error && typeof error === "object" && "stderr" in error
        ? String((error as { stderr?: unknown }).stderr ?? "")
        : "";
    return { ok: false, out };
  }
}

function readEnvFile(): Map<string, string> {
  const entries = new Map<string, string>();
  if (!existsSync(ENV_FILE)) return entries;
  for (const line of readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (match) entries.set(match[1]!, match[2]!);
  }
  return entries;
}

function writeEnvFile(entries: Map<string, string>): void {
  const body = [...entries].map(([key, value]) => `${key}=${value}`).join("\n");
  writeFileSync(ENV_FILE, `${body}\n`, { mode: 0o600 });
}

function checkNode(): void {
  const parts = process.versions.node.split(".").map(Number);
  const ok = parts[0]! > MIN_NODE[0] || (parts[0] === MIN_NODE[0] && parts[1]! >= MIN_NODE[1]);
  if (!ok)
    fail(
      `${BRAND} needs Node >=${MIN_NODE.join(".")}, but this is Node ${process.versions.node}. Install Node 24+ (e.g. \`nvm install 24\`) and retry.`,
    );
}

function checkDocker(): void {
  if (!tryExec("docker", ["version", "--format", "{{.Server.Version}}"]).ok) {
    fail(
      "Docker is required (it runs the agent's isolated sandbox and Postgres) but its daemon is not reachable. Start Docker Desktop / the docker service and retry.",
    );
  }
}

async function ensureConfig(): Promise<{ deepseekApiKey: string; connectorSecretKey: string; dbPassword: string }> {
  const entries = readEnvFile();
  let deepseekApiKey = process.env.DEEPSEEK_API_KEY?.trim() || entries.get("DEEPSEEK_API_KEY") || "";
  if (!deepseekApiKey) {
    if (!process.stdin.isTTY)
      fail(`No DeepSeek API key. Set DEEPSEEK_API_KEY in ${ENV_FILE} or the environment, then retry.`);
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    deepseekApiKey = (await rl.question("DeepSeek API key (from platform.deepseek.com): ")).trim();
    rl.close();
    if (!deepseekApiKey) fail("A DeepSeek API key is required.");
  }
  const connectorSecretKey = entries.get("CONNECTOR_SECRET_KEY") || randomBytes(32).toString("hex");
  const dbPassword = entries.get("QUICKSTART_DB_PASSWORD") || randomBytes(18).toString("hex");
  entries.set("DEEPSEEK_API_KEY", deepseekApiKey);
  entries.set("CONNECTOR_SECRET_KEY", connectorSecretKey);
  entries.set("QUICKSTART_DB_PASSWORD", dbPassword);
  writeEnvFile(entries);
  return { deepseekApiKey, connectorSecretKey, dbPassword };
}

function containerState(): "running" | "stopped" | "absent" {
  if (tryExec("docker", ["ps", "--filter", `name=^${DB_CONTAINER}$`, "--format", "{{.Names}}"]).out === DB_CONTAINER)
    return "running";
  if (
    tryExec("docker", ["ps", "-a", "--filter", `name=^${DB_CONTAINER}$`, "--format", "{{.Names}}"]).out === DB_CONTAINER
  )
    return "stopped";
  return "absent";
}

async function ensurePostgres(dbPassword: string): Promise<string> {
  const state = containerState();
  if (state === "absent") {
    console.log("• Starting local Postgres (Docker)…");
    const run = tryExec("docker", [
      "run",
      "-d",
      "--name",
      DB_CONTAINER,
      "-e",
      `POSTGRES_USER=${DB_USER}`,
      "-e",
      `POSTGRES_PASSWORD=${dbPassword}`,
      "-e",
      `POSTGRES_DB=${DB_NAME}`,
      "-p",
      `${DB_PORT}:5432`,
      "-v",
      `${DB_VOLUME}:/var/lib/postgresql/data`,
      "postgres:16",
    ]);
    if (!run.ok) fail(`Could not start Postgres (is port ${DB_PORT} already in use?):\n${run.out}`);
  } else if (state === "stopped") {
    console.log("• Restarting existing Postgres container…");
    tryExec("docker", ["start", DB_CONTAINER]);
  } else {
    console.log("• Reusing running Postgres container.");
  }
  for (let attempt = 0; attempt < 60; attempt++) {
    if (tryExec("docker", ["exec", DB_CONTAINER, "pg_isready", "-U", DB_USER, "-d", DB_NAME]).ok) {
      verifyPostgresAuth(dbPassword);
      return `postgres://${DB_USER}:${dbPassword}@localhost:${DB_PORT}/${DB_NAME}`;
    }
    await sleep(1000);
  }
  return fail("Postgres did not become ready in time.");
}

function verifyPostgresAuth(dbPassword: string): void {
  const check = tryExec("docker", [
    "exec",
    "-e",
    `PGPASSWORD=${dbPassword}`,
    DB_CONTAINER,
    "psql",
    "-U",
    DB_USER,
    "-d",
    DB_NAME,
    "-tAc",
    "select 1",
  ]);
  if (!check.ok) {
    fail(
      `Postgres rejected the stored credential. The ${DB_VOLUME} volume was initialized with a different password (deleting .env.quickstart while keeping the volume does this). Run \`npm run quickstart:down\` then \`docker volume rm ${DB_VOLUME}\` to reset, or restore the original .env.quickstart.`,
    );
  }
}

function runInherit(command: string, args: string[], cwd: string): boolean {
  try {
    execFileSync(command, args, { cwd, stdio: "inherit" });
    return true;
  } catch {
    return false;
  }
}

function ensureSandboxImage(): void {
  if (tryExec("docker", ["image", "inspect", SANDBOX_IMAGE]).ok) return;
  console.log("• Building the agent sandbox image (one-time, this can take several minutes)…");
  if (!runInherit("npm", ["run", "sandbox:local:build"], ROOT)) {
    console.warn(
      `\n⚠ Sandbox image build failed. The web UI still works, but the agent cannot run commands until you run \`npm run sandbox:local:build\` successfully.\n`,
    );
  }
}

function ensureDeps(): void {
  if (!existsSync(join(ROOT, "node_modules"))) {
    console.log("• Installing core dependencies…");
    if (!runInherit("npm", ["install"], ROOT)) fail("`npm install` failed at the repo root.");
  }
  for (const plugin of ["web-ui", "admin"]) {
    const dir = join(ROOT, "plugins", plugin);
    if (!existsSync(join(dir, "node_modules"))) {
      console.log(`• Installing ${plugin} dependencies…`);
      if (!runInherit("npm", ["install"], dir)) fail(`\`npm install\` failed in plugins/${plugin}.`);
    }
  }
}

function ensureWebBuild(): void {
  if (existsSync(join(ROOT, "plugins", "web-ui", "dist-web", "index.html"))) return;
  console.log("• Building the web UI…");
  if (!runInherit("npm", ["run", "build"], join(ROOT, "plugins", "web-ui"))) fail("web-ui build failed.");
}

function childEnv(extra: Record<string, string>): NodeJS.ProcessEnv {
  const base: NodeJS.ProcessEnv = { ...process.env };
  for (const key of STRIP_ENV) delete base[key];
  return { ...base, ...extra };
}

const children: ChildProcess[] = [];

function startService(label: string, args: string[], cwd: string, env: NodeJS.ProcessEnv): void {
  const child = spawn("node", args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  const prefix = (line: string): void => {
    if (line.trim()) console.log(`[${label}] ${line}`);
  };
  child.stdout?.setEncoding("utf8").on("data", (chunk: string) => chunk.split(/\r?\n/).forEach(prefix));
  child.stderr?.setEncoding("utf8").on("data", (chunk: string) => chunk.split(/\r?\n/).forEach(prefix));
  child.on("exit", (code) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.error(`\n✗ ${label} exited unexpectedly (code ${code ?? "null"}). Stopping the rest.`);
    for (const other of children) if (other !== child) other.kill("SIGTERM");
    process.exit(1);
  });
}

async function waitForHttp(url: string, label: string): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      await fetch(url);
      return;
    } catch {
      await sleep(1000);
    }
  }
  fail(`${label} did not answer at ${url} in time.`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let shuttingDown = false;

function shutdown(): void {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("\n• Stopping services…");
  for (const child of children) child.kill("SIGTERM");
  setTimeout(() => process.exit(0), 1500);
}

async function up(): Promise<void> {
  console.log(`\n${BRAND} — local quickstart\n`);
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  checkNode();
  checkDocker();
  const config = await ensureConfig();
  ensureDeps();
  const databaseUrl = await ensurePostgres(config.dbPassword);
  ensureSandboxImage();
  ensureWebBuild();

  console.log("• Booting core, web UI, and admin…\n");
  startService(
    "core",
    [join(ROOT, "src", "index.ts")],
    ROOT,
    childEnv({
      ALLOW_UNAUTHENTICATED_CORE: "1",
      ORG_ID: ORG,
      HARNESS: "pi",
      MODEL_PROVIDER: "deepseek",
      DEEPSEEK_API_KEY: config.deepseekApiKey,
      SANDBOX_BACKEND: "local",
      DATABASE_URL: databaseUrl,
      SESSION_STORE: "postgres",
      CONNECTOR_SECRET_KEY: config.connectorSecretKey,
      ADMIN_GRANTS: `${PRINCIPAL}:org_admin`,
      PORT: String(CORE_PORT),
    }),
  );
  await waitForHttp(`http://localhost:${CORE_PORT}/`, "core");

  const surfaceEnv = { CORE_API_URL: `http://localhost:${CORE_PORT}`, CORE_ORG_ID: ORG };
  startService(
    "web-ui",
    ["server/index.ts"],
    join(ROOT, "plugins", "web-ui"),
    childEnv({ ...surfaceEnv, PORT: String(WEB_PORT) }),
  );
  startService(
    "admin",
    ["src/index.ts"],
    join(ROOT, "plugins", "admin"),
    childEnv({ ...surfaceEnv, PORT: String(ADMIN_PORT) }),
  );
  await waitForHttp(`http://localhost:${WEB_PORT}/healthz`, "web-ui");
  await waitForHttp(`http://localhost:${ADMIN_PORT}/healthz`, "admin");

  console.log(`
✓ ${BRAND} is running.

  Chat UI    http://localhost:${WEB_PORT}      → sign in as "${PRINCIPAL}"
  Admin      http://localhost:${ADMIN_PORT}      → in the browser console run:
                                    document.cookie = "admin=${PRINCIPAL};path=/"; location.reload()

  Model: DeepSeek · sandbox: local Docker · data: Postgres (container ${DB_CONTAINER})

  Press Ctrl-C to stop. Postgres keeps running; \`npm run quickstart:down\` removes it.
`);
}

function down(): void {
  console.log(`• Stopping and removing the ${BRAND} Postgres container…`);
  tryExec("docker", ["rm", "-f", DB_CONTAINER]);
  console.log("Done. The data volume is preserved; `docker volume rm " + DB_VOLUME + "` erases it.");
}

async function main(): Promise<void> {
  const { positionals } = parseArgs({ allowPositionals: true });
  const command = positionals[0] ?? "up";
  if (command === "down") return down();
  if (command !== "up") fail(`Unknown command "${command}". Use \`up\` (default) or \`down\`.`);
  await up();
}

await main();
