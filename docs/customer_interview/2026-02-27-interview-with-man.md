# Customer Interview — 2026-02-27

**Interviewee:** Herman (Recruitment firm boss)
**Role:** Recruiter (agency context implied)
**Format:** Unstructured conversation
**Recorded by:** Charles Wong

---

## Raw Transcript (verbatim)

> I think if we're talking about the most essential feature, this is how I see it.
>
> If I receive a client's requirement telling me what they're looking for, I should be able to take that spec — or even just the job title — and drop it into the system. The system would then generate the job spec automatically. After that, it would use this spec to match against our existing local database, and also link to external databases such as LinkedIn, Lusha, ContactOut, and so on.
>
> It would then directly source potential profiles from all these different channels.
>
> The logic behind it should be: once I provide the company and job spec, the system identifies target companies and job titles, and then runs searches to pull those people into a potential candidate list. From there, it's just click, click, click — and the system lets me start outreach.
>
> Outreach would basically be email, or using a contact number if available, or accessing external databases where we may need to pay for data. Those paid SaaS tools are separate costs anyway. But once we have the contact details, message drafting isn't really a problem — even without a built-in system, people can already use Gemini or Claude to generate messages. So I don't think the system needs to be an all-in-one tool that does absolutely everything.
>
> As for calendar features — if it links with iPhone or Google Calendar, then a one-click sync should handle everything. These things are simple and not really must-have requirements.
>
> What really needs to be solved is whether we can integrate with all the channels we need, whether we can do outreach in one click, and whether our database stays linked and continuously updated from those channels.
>
> Does the system automatically keep profiles updated, or do I need to click to refresh them? Or does each new search automatically renew and enrich existing profiles in the local database?
>
> If we can achieve these things, that would make life genuinely much easier.

---

## Key Themes Extracted

### 1. Job spec generation from minimal input
Drop in a client brief or just a job title → system generates a full job spec automatically. This is the entry point to the whole workflow. He sees this as the trigger for everything downstream.

### 2. Multi-channel sourcing as the core value
The essential job is: take the spec → identify target companies and job titles → pull matching profiles from **local DB + external channels** (LinkedIn, Lusha, ContactOut, etc.) into a unified candidate list. This is what he considers the hardest and most valuable problem to solve.

### 3. One-click outreach pipeline
Once candidates are surfaced, the friction should collapse to "click, click, click." He's not asking for complex automation — just: contact found → message ready → send. He values speed of action once sourcing is done.

### 4. Database auto-enrichment / continuous sync
He explicitly asked: does the system auto-update profiles, or does the recruiter need to manually refresh? He wants searches to **automatically renew and enrich** existing local profiles rather than creating stale duplicates.

### 5. Message drafting is a solved problem — he doesn't need it built in
He directly called out that LLMs (Gemini, Claude) already handle message drafting well enough. He does **not** see AI drafting as a differentiator or must-have inside the product.

### 6. Calendar sync is nice-to-have, not essential
One-click sync to iPhone/Google Calendar is sufficient. He doesn't consider this a priority problem.

---

## Alignment vs. Current North Star & Website

### Surface alignment (but be careful — these are weaker than they look)

| Apparent match | Reality check |
|---|---|
| "One brain. Not five tools." | Herman explicitly said he's **fine paying separately** for Lusha, ContactOut, etc. He wants workflow integration, not tool replacement. The "5 tools replaced" stat probably doesn't land for him. |
| Speed / "click, click, click" | We agree on reducing friction, but his friction is in **sourcing**, not in pipeline stage management. We're solving the wrong click problem. |

### Real disalignment — our core value props are his nice-to-haves

| Our current hero feature | Herman's actual view |
|---|---|
| **Autonomous Pipeline** — AI advances stages, drafts briefing notes | He never asked for this. Pipeline management is downstream of sourcing. If you don't have the right candidates yet, better stage automation doesn't help. |
| **Zero-Loss Memory** — Zoom transcripts, email history, timeline | He didn't mention this as a pain at all. His memory problem is about **profile data currency** (is the candidate's info stale?), not relationship history. |
| **Human-in-the-Loop AI drafting** — "AI drafts. You decide." | He explicitly said this is already solved: *"people can already use Gemini or Claude to generate messages."* He is telling us our third pillar is a non-differentiator. |
| **"AI Runs the ATS"** | He doesn't frame his problem as an ATS problem. His problem is sourcing. An AI-run ATS is only useful once you have people to put in it. |
| Pain point: "The Endless Click" (11 clicks to move a candidate) | His endless click problem is in **sourcing and outreach initiation** — not in moving candidates between pipeline stages. |

---

## Interpretation & Notes

Herman is describing a fundamentally different job-to-be-done from what Cura is currently solving.

**His workflow:**
```
Client brief → Auto job spec → Search target companies/titles across all channels → Pull profiles → One-click outreach
```

**Our product's assumed workflow:**
```
Candidates already flowing in → Manage pipeline → AI briefings → AI drafts message → Human approves
```

The gap is not a feature gap — it is a **starting-point gap**. Our product assumes the hard work of finding candidates is already done, and helps manage what comes next. Herman's hard work IS the finding. Everything we've built sits after his biggest pain point.

### What he is actually asking for

1. **A sourcing engine** — spec in, candidates out, pulled live from LinkedIn, Lusha, ContactOut, internal DB, all at once
2. **Auto-enrichment as a default** — profiles should update themselves; stale data is a real problem he lives with
3. **Minimal-click outreach launcher** — once the list is ready, it should take seconds to initiate contact
4. **Job spec generation** — even a job title should be enough to kick off the whole flow

### What this tells us about our target persona

Herman represents a **headhunter / active sourcing recruiter**. His model is: hunt first, pipeline is short, speed-to-outreach is everything.

Our current positioning speaks to a **pipeline-management recruiter** — someone juggling many candidates already in motion, who loses context between touchpoints and needs better memory and automation to manage relationships at scale.

These are different people with different problems. Before changing the product or the north star, we need to decide: which persona are we building for? Herman is clear feedback that our current story does not speak to his world.

---

## Reference Tags

`sourcing-first` `active-headhunting` `multi-channel-sourcing` `auto-enrichment` `job-spec-generation` `one-click-outreach` `wrong-persona-fit` `pipeline-management-not-his-pain` `ai-drafting-dismissed`
