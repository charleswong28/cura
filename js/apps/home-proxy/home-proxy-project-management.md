# Cura Proxy Agent — Project Management

## Project Status: 🔲 Not started (Phase 3)

**Goal:** Ship a macOS desktop app (Tauri 2.0) that turns a recruiter's home machine into a SOCKS5 proxy endpoint, routing Talon's browser traffic through the recruiter's residential ISP so LinkedIn sees a genuine home IP.

**Technical reference:** `docs/talon-technical-plan.md` Section 5.3.1 (Cura Proxy Agent)

**App identity:**
- Name: Cura Proxy Agent
- Bundle: `com.cura.proxy-agent`
- System-tray-only — no Dock icon (`LSUIElement = true`)
- Starts on login via LaunchAgent plist
- Ships as a signed, notarised `.dmg`

---

## ID Scheme

Tasks are prefixed `HP-` (Home Proxy):

| Prefix | Range | Used for |
|--------|-------|----------|
| `HP-` | 001–999 | All tasks in this plan |

---

## EPICs

### EPIC-HP-001: Project Scaffold & Build Pipeline

**Objective:** Tauri 2.0 project with Rust backend + React/TypeScript webview. Monorepo integration, CI build, and signed macOS artifact.

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| HP-001 | Initialise Tauri 2.0 project in `js/apps/home-proxy/` (`cargo tauri init`) | 🔲 |
| HP-002 | Configure `tauri.conf.json`: bundle id `com.cura.proxy-agent`, `LSUIElement=true`, no Dock icon | 🔲 |
| HP-003 | Add React + TypeScript frontend scaffold (Vite) | 🔲 |
| HP-004 | Add to pnpm workspace (`js/pnpm-workspace.yaml`) and Turborepo pipeline | 🔲 |
| HP-005 | Configure GitHub Actions workflow: build macOS `.dmg` on push to `main` | 🔲 |
| HP-006 | Apple Developer ID code-signing + notarisation step in CI | 🔲 |
| HP-007 | Bundle frpc binary for macOS (arm64 + x86_64 universal) inside Tauri `resources/` | 🔲 |
| HP-008 | Verify `.dmg` installs cleanly on a clean macOS 12+ machine | 🔲 |

---

### EPIC-HP-002: Authentication — OAuth2 PKCE via Webview

**Objective:** Recruiter signs in with their Cura account through a webview. App receives an access token and stores it in the macOS keychain. No separate login account needed.

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| HP-009 | Implement OAuth2 PKCE flow in Rust backend (code verifier, challenge, state param) | 🔲 |
| HP-010 | Open Tauri webview to CRM OAuth2 authorise URL on first launch | 🔲 |
| HP-011 | Capture redirect callback (`cura-proxy://callback`) and extract `code` param | 🔲 |
| HP-012 | Exchange `code` for access + refresh tokens via `POST /api/oauth/token` | 🔲 |
| HP-013 | Store access token and refresh token in macOS Keychain via `tauri-plugin-keychain` | 🔲 |
| HP-014 | Implement token refresh on 401 responses | 🔲 |
| HP-015 | Show "Sign in with Cura" button in tray menu when not authenticated | 🔲 |
| HP-016 | Show recruiter name + "Sign out" option in tray menu when authenticated | 🔲 |

---

### EPIC-HP-003: Proxy Agent Core — frpc Lifecycle

**Objective:** App manages frpc as a child process. Generates frpc config from CRM registration response, starts frpc on login, and restarts it if it exits unexpectedly.

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| HP-017 | Call `POST /api/proxy-agents/register` after first successful login; store `{ relayHost, relayPort, tunnelToken }` in Keychain | 🔲 |
| HP-018 | Write frpc config to `~/Library/Application Support/CuraProxy/frpc.ini` from stored registration | 🔲 |
| HP-019 | Spawn frpc binary as a child process using `std::process::Command` | 🔲 |
| HP-020 | Watch frpc stdout/stderr; log to `~/Library/Logs/CuraProxy/frpc.log` | 🔲 |
| HP-021 | Auto-restart frpc on unexpected exit (max 5 attempts with exponential backoff; tray shows ERROR after 5th) | 🔲 |
| HP-022 | Gracefully kill frpc when user signs out or app quits | 🔲 |
| HP-023 | On re-registration (token changed, port reallocated), regenerate frpc config and restart process | 🔲 |

---

### EPIC-HP-004: CRM Heartbeat & Status Sync

**Objective:** App sends a heartbeat to CRM every 30 s so Talon knows the proxy is online. CRM marks the agent OFFLINE if no heartbeat for 2 min.

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| HP-024 | Implement `PATCH /api/proxy-agents/{id}/heartbeat` call every 30 s in a background Tokio task | 🔲 |
| HP-025 | Cancel heartbeat loop when frpc is not running; resume when frpc restarts | 🔲 |
| HP-026 | Handle 401 (token expired) in heartbeat — trigger silent token refresh before retry | 🔲 |
| HP-027 | Handle network failures in heartbeat — retry with 5 s backoff; tray shows ERROR after 3 consecutive failures | 🔲 |
| HP-028 | On heartbeat success, update local status state → tray reflects ONLINE | 🔲 |

---

### EPIC-HP-005: System Tray UI

**Objective:** Minimal tray icon conveys connection state at a glance. Menu provides actionable controls. No Dock presence.

**Status states:** `CONNECTING` → `ONLINE` → `OFFLINE` → `ERROR`

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| HP-029 | Implement tray icon with 4 state variants (SVG → PNG at 22px, 44px retina) | 🔲 |
| HP-030 | Build tray menu: status label, relay endpoint, "Sign in" / "Sign out", "Quit" | 🔲 |
| HP-031 | Show `Connected — relay.cura.internal:<port>` in tray menu when ONLINE | 🔲 |
| HP-032 | Show `Reconnecting…` with spinner when CONNECTING | 🔲 |
| HP-033 | Show `Offline — proxy unavailable` with red icon when OFFLINE or ERROR | 🔲 |
| HP-034 | Native macOS notification on first successful connection after install | 🔲 |
| HP-035 | Native macOS notification when agent goes from ONLINE → ERROR (persists > 2 min) | 🔲 |

---

### EPIC-HP-006: macOS Platform Integration

**Objective:** App feels native on macOS. Starts on login without Dock presence. Survives system restarts and macOS upgrades.

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| HP-036 | Install LaunchAgent plist to `~/Library/LaunchAgents/com.cura.proxy-agent.plist` on first run | 🔲 |
| HP-037 | Plist configures `KeepAlive=false` (Tauri manages restart); `RunAtLoad=true` | 🔲 |
| HP-038 | On app update: remove old plist, install new plist, reload agent without requiring logout | 🔲 |
| HP-039 | Uninstaller: kill frpc, remove LaunchAgent plist, remove `~/Library/Application Support/CuraProxy/`, clear Keychain entries | 🔲 |
| HP-040 | Verify app does not appear in Dock or App Switcher (LSUIElement test) | 🔲 |
| HP-041 | Test on macOS 12 Monterey, 13 Ventura, 14 Sonoma (arm64 + x86_64) | 🔲 |

---

### EPIC-HP-007: CRM Backend — Proxy Agent API

**Objective:** CRM exposes the three endpoints Cura Proxy Agent needs. ProxyAgent DB model tracks per-recruiter port allocation and online status.

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| HP-042 | Add `ProxyAgent` model to Prisma schema (fields per talon-technical-plan.md §5.3.1) | 🔲 |
| HP-043 | `POST /api/proxy-agents/register` — allocate relay port (51000–51999), hash tunnel token, return `{ relayHost, relayPort, tunnelToken }` once | 🔲 |
| HP-044 | `PATCH /api/proxy-agents/{id}/heartbeat` — update `lastSeenAt`; mark ONLINE | 🔲 |
| HP-045 | Background job: mark agents OFFLINE if `lastSeenAt` > 2 min ago (runs every 30 s) | 🔲 |
| HP-046 | `GET /api/proxy-agents/me` — Talon uses this to fetch proxy config before opening browser session | 🔲 |
| HP-047 | Unit tests: port allocation uniqueness, heartbeat timeout, token hashing | 🔲 |
| HP-048 | Integration test: full register → heartbeat → offline-mark flow | 🔲 |

---

### EPIC-HP-008: Download & Onboarding UX (CRM Settings Page)

**Objective:** Recruiter discovers and installs the proxy agent from CRM Settings. Progress is shown inline — no docs to read.

**Tasks:**

| ID | Task | Status |
|----|------|--------|
| HP-049 | Add "Proxy Agent" tab to CRM Settings page | 🔲 |
| HP-050 | Show agent status card: ONLINE (green), OFFLINE (amber), NOT INSTALLED (grey) | 🔲 |
| HP-051 | "Download for macOS" button — links to latest signed `.dmg` from GitHub Releases | 🔲 |
| HP-052 | Step-by-step onboarding instructions inline (download → open → sign in → done) | 🔲 |
| HP-053 | Live status refresh (poll every 10 s) so recruiter sees ONLINE without page reload | 🔲 |
| HP-054 | Show relay endpoint and last-seen timestamp once ONLINE | 🔲 |

---

## Summary

| EPIC | Tasks | Status |
|------|-------|--------|
| EPIC-HP-001: Project Scaffold | 8 | 🔲 Not started |
| EPIC-HP-002: Authentication | 8 | 🔲 Not started |
| EPIC-HP-003: frpc Lifecycle | 7 | 🔲 Not started |
| EPIC-HP-004: CRM Heartbeat | 5 | 🔲 Not started |
| EPIC-HP-005: System Tray UI | 7 | 🔲 Not started |
| EPIC-HP-006: macOS Platform | 6 | 🔲 Not started |
| EPIC-HP-007: CRM Backend API | 7 | 🔲 Not started |
| EPIC-HP-008: Download & Onboarding UX | 6 | 🔲 Not started |
| **Total** | **54** | |

---

## Dependencies

| This plan depends on | Reason |
|---------------------|--------|
| `docs/talon-technical-plan.md` §5.3.1 | Architectural decisions: Tauri 2.0, frp, tunnel mechanism, CRM data model |
| CRM `Recruiter` model | `ProxyAgent` has a foreign key to `Recruiter` |
| CRM OAuth2 server | App uses CRM's OAuth2 PKCE endpoint |
| Relay EC2 (frps) | Must be provisioned before end-to-end testing (out of scope for this plan) |

## Out of Scope

- Windows and Ubuntu support (Phase 4 — see talon-technical-plan.md §5.3.1 platform table)
- Relay EC2 / frps server provisioning (infrastructure, tracked separately)
- Talon runner integration (tracked in Talon project plan)
