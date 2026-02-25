# AI Playbook

Operational rules and protocols for the AI assistant working in this repo.

---

## Behaviour Rules

- **Never auto-commit.** Do not run `git commit` unless the prompt explicitly says to commit. Always let the human review changes before committing.

---

## Decision Documentation Rule

Whenever a meaningful technical or business decision is made, document it **before closing the task**:

1. Find the most relevant existing document (`docs/crm-technical-plan.md` for technical, `docs/product-north-star.md` for product)
2. Add a decision section: **what** was chosen, **why**, **alternatives considered**, **trade-offs** — comparison table where options exist
3. If no document fits, create one and register it in `CLAUDE.md` under the correct section
4. See `docs/way-of-work.md` for the full decision format and document structure rules

---

## Server Validation Protocol

After making any frontend or backend change, the AI **must** verify the result is working before returning to the user.

### Service URLs

| Service | URL |
|---------|-----|
| Home Page (`web-home-page`) | `http://localhost:3000` |
| Web App (`web-app`) | `http://localhost:3001` |
| API (`api`) | `http://localhost:8000` |
| GraphQL Playground | `http://localhost:8000/graphql` |

### Steps

1. **Identify which service(s) were changed** — determine which of the three services above is affected by the change.
2. **Check if the server is already running** — only start it if not already up:
   ```bash
   curl -sf http://localhost:<PORT>/ > /dev/null 2>&1 || bin/start_cura &
   ```
   Skipping an unnecessary restart saves significant startup time.
3. **Wait for readiness** — poll the relevant service URL until it returns HTTP 200 (retry every 3 s, timeout after 60 s). Example for the home page:
   ```bash
   until curl -sf http://localhost:3000/ > /dev/null; do sleep 3; done
   ```
4. **Verify the change:**
   - **Frontend services** (`web-home-page`, `web-app`): use the **Playwright skill** to screenshot the relevant URL and visually confirm the change is rendered correctly.
   - **API / backend**: use `curl` or `WebFetch` to confirm the expected response at the relevant endpoint.
5. **Do not respond to the user** until step 4 passes. If verification fails after the timeout, report the failure with the actual error rather than claiming success.
