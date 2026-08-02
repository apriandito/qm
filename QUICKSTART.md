# Quickstart — run Agent Inovasi locally

Get a working instance on your own machine with one command. The chat UI, admin
panel, model (DeepSeek), Postgres, and the agent's sandbox are all wired for you.

## Prerequisites

- **Node.js ≥ 24.15** — `node --version` (install with `nvm install 24`)
- **Docker** running — used for the agent's isolated sandbox and for Postgres
- A **DeepSeek API key** — from [platform.deepseek.com](https://platform.deepseek.com)

## Run it

```bash
git clone <your Agent Inovasi repo>
cd agent-inovasi
npm install
npm run quickstart
```

The first run asks for your DeepSeek API key (stored locally in `.env.quickstart`,
which is gitignored), then:

1. Checks Node and Docker
2. Generates local secrets and starts a Postgres container
3. Builds the agent sandbox image (one-time, a few minutes) and the web UI
4. Boots the core, the chat UI, and the admin panel
5. Prints the URLs

When it finishes you'll see:

```
✓ Agent Inovasi is running.

  Chat UI    http://localhost:8096   → sign in as "admin"
  Admin      http://localhost:8090   → set the admin cookie (see below)
```

## Signing in

- **Chat UI** (`http://localhost:8096`): open it and sign in with the name `admin`.
- **Admin panel** (`http://localhost:8090`): open it, then in the browser console run

  ```js
  document.cookie = "admin=admin;path=/";
  location.reload();
  ```

  (The admin panel normally gets its identity from the sign-in portal, which this
  local setup skips. `admin` is an org administrator via the generated grant.)

## Stopping

- `Ctrl-C` stops the services. Postgres keeps running so your data survives a restart.
- `npm run quickstart:down` removes the Postgres container (the data volume is kept;
  `docker volume rm agent-inovasi-pgdata` erases it).

## Configuration

Everything works with defaults. Override with environment variables if needed:

| Variable                | Default        | Purpose                                     |
| ----------------------- | -------------- | ------------------------------------------- |
| `DEEPSEEK_API_KEY`      | _(prompted)_   | Model key; also read from `.env.quickstart` |
| `QUICKSTART_ORG`        | `agentinovasi` | Organization id                             |
| `QUICKSTART_PRINCIPAL`  | `admin`        | The local admin user                        |
| `QUICKSTART_CORE_PORT`  | `8080`         | Core API port                               |
| `QUICKSTART_WEB_PORT`   | `8096`         | Chat UI port                                |
| `QUICKSTART_ADMIN_PORT` | `8090`         | Admin panel port                            |
| `QUICKSTART_DB_PORT`    | `5432`         | Host port for Postgres                      |

## Troubleshooting

- **"needs Node ≥ 24.15"** — upgrade Node (`nvm install 24 && nvm use 24`).
- **"Docker … not reachable"** — start Docker Desktop or the docker service.
- **"Could not start Postgres … port already in use"** — set `QUICKSTART_DB_PORT` to a
  free port and rerun.
- **Sandbox image build failed** — the chat UI still loads, but the agent can't run
  commands until `npm run sandbox:local:build` succeeds (needs Docker and network).

## What this is (and isn't)

This is a single-machine, single-operator setup for trying and self-hosting Agent
Inovasi. It intentionally skips the production sign-in portal and TLS, which also
turns off the signed control plane. In this local mode the agent can chat and run
commands in its sandbox, but the following are **disabled**: scheduled crons and
reminders, tools that authenticate through OAuth connectors, and publishing web apps.
Those need the signed deployment. For a public, multi-user deployment with the full
tool set, use the deployment CLI (`qm init --target fly|aws`) instead.
