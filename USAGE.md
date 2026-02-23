# Cura — Usage Guide

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with Docker Compose v2
- [zsh](https://www.zsh.org/) (macOS default)

---

## Quick Start

### 1. Add the project bin to your PATH

Add this line to your `~/.zshrc`:

```bash
export PATH="$HOME/Workspace/cura/bin:$PATH"
```

Then reload your shell:

```bash
source ~/.zshrc
```

### 2. Start the services

```bash
start_cura          # start all services (foreground)
start_cura -d       # start all services (detached / background)
```

---

## `bin/` Scripts

| Script | Description |
|--------|-------------|
| `start_cura` | Start Cura services via Docker Compose |

### `start_cura` usage

```bash
start_cura                        # start all services
start_cura -d                     # detached mode
start_cura postgres redis soketi  # start specific services only
start_cura --build                # rebuild images before starting
```

Forwards all arguments directly to `docker compose up`, so any Docker Compose flag works.

---

## Services

| Service | Default Port | Credentials |
|---------|-------------|-------------|
| PostgreSQL 16 | `5432` | user: `cura` / pass: `cura` / db: `cura_dev` |
| Redis 7 | `6379` | password: `cura` |
| Soketi (WebSocket) | `6001` | app-id: `cura-app` / key: `cura-key` / secret: `cura-secret` |
| API (NestJS) | `3001` | — |

Defaults can be overridden with a `.env` file alongside `infra/docker-compose.yml`.

---

## Stopping Services

```bash
# If running in foreground: Ctrl+C

# If running detached:
docker compose -f infra/docker-compose.yml down

# Remove volumes (wipes database data):
docker compose -f infra/docker-compose.yml down -v
```
