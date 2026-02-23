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

After making any frontend or backend change, the AI **must** verify the result is working before returning to the user:

1. **Start the server** — run `bin/start_cura` in the background if not already running:
   ```bash
   bin/start_cura &
   ```
2. **Wait for readiness** — poll `http://localhost:3000/` until it returns HTTP 200 (retry every 3 s, timeout after 60 s):
   ```bash
   until curl -sf http://localhost:3000/ > /dev/null; do sleep 3; done
   ```
3. **Verify the change** — use `curl` or `WebFetch` to confirm the expected content/behaviour is present at the relevant URL.
4. **Do not respond to the user** until step 3 passes. If verification fails after the timeout, report the failure with the actual error rather than claiming success.
