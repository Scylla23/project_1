# ModelRouter — Build Plan

Working name: **ModelRouter**, plugin directory `router` → commands are `/router:*`.
Rename before launch is a directory rename + grep (tracked as T5.7).

**Stack decision (applies to every task):** all hook and report scripts are single-file
`#!/usr/bin/env node` scripts using stdlib only — no npm install, no deps, ever.
State: `~/.router/` (memory.md, config.json) and `.router/` per-repo (log.jsonl, stats-card.md).
All state human-readable. Nothing leaves the machine.

**Verified platform facts this plan builds on (STEP 0.1, docs 2026-07-12):**
- Agent frontmatter `model: haiku|sonnet|opus|fable` + `effort:` — supported in plugin agents.
- Agent-tool per-invocation `model` param outranks frontmatter → PreToolUse `updatedInput` rewrite wins.
- `updatedInput` replaces the ENTIRE tool input — hooks must echo unchanged fields.
- Skill `model:` frontmatter = rest-of-turn override, auto-reverts next prompt.
- UserPromptSubmit input field is `prompt`; context injected via `hookSpecificOutput.additionalContext`.
- `systemMessage` (universal hook output field) = user-visible line from any hook → our routing one-liners.
- Plugin skills surface as `/<plugin-dir>:<skill>`; `disable-model-invocation: true` for user-only commands.

---

## Phase 1: Skeleton & Routing Core (must ship)

- [ ] T1.1 — Repo + plugin skeleton
      What: `git init`, `.claude-plugin/plugin.json` (name `router`), directory tree with one-line
      placeholder comments per file (STEP 0.3), MIT LICENSE stub, local marketplace.json for dev installs.
      Files: .claude-plugin/plugin.json, agents/, skills/, hooks/, scripts/, defaults/, LICENSE, marketplace.json
      Test: `claude plugin validate .` passes; plugin installs from local marketplace and shows in /plugin.
      Demo value: none

- [x] T1.2 — Four pinned worker agents
      What: `haiku-worker`, `sonnet-worker`, `opus-worker`, `fable-architect` — tuned frontmatter
      (model, effort, focused description) + tier-scoped system prompts (haiku: mechanical edits only,
      escalate if unsure; sonnet: standard implementation; opus: complex multi-file; fable: architecture/planning, no code).
      Files: agents/haiku-worker.md, agents/sonnet-worker.md, agents/opus-worker.md, agents/fable-architect.md
      Test: agents listed after install; delegate a trivial edit to haiku-worker, confirm in transcript
      (ctrl+o) the subagent ran on haiku.
      Demo value: low

- [ ] T1.3 — Routing-policy skill with rubric table
      What: `skills/routing-policy/SKILL.md` — the full classification rubric as a readable markdown
      table (complexity × task type → tier), delegation rules, when NOT to delegate (interactive/ambiguous work).
      Auto-invocable so the main session pulls it when routing is in question.
      Files: skills/routing-policy/SKILL.md
      Test: fresh session, ask "refactor this function's variable names" → main session delegates to
      haiku-worker or sonnet-worker, cites the rubric.
      Demo value: low

- [ ] T1.4 — UserPromptSubmit inject hook
      What: `scripts/inject.js` on UserPromptSubmit — injects a compact (~10 line) routing directive
      via additionalContext: current mode, audit flag, top learned rules, and the one-liner output
      contract (T2.1). Also fingerprints the prompt (length, keywords, file mentions) to
      `.router/last-prompt.json` for the logger.
      Files: scripts/inject.js, hooks/hooks.json
      Test: `echo '{"prompt":"fix typo in README","hook_event_name":"UserPromptSubmit","cwd":"."}' | node scripts/inject.js`
      → valid JSON with additionalContext; live session shows routing behavior without invoking the skill manually.
      Demo value: low

- [ ] T1.5 — Auto-escalation skills
      What: `skills/architect/SKILL.md` (`model: fable`, description: "multi-file architecture change,
      system redesign") and `skills/design/SKILL.md` (`model: opus`, description: "system design /
      planning session"). Precise descriptions so Claude self-invokes them; model reverts next prompt.
      Files: skills/architect/SKILL.md, skills/design/SKILL.md
      Test: prompt "plan how to split this monolith into services" → skill auto-invokes, status line
      shows fable for the turn, reverts on next prompt.
      Demo value: HIGH — the "it escalated itself" moment in the demo video.

- [ ] T1.6 — Decision logging hook
      What: `scripts/log.js` on PostToolUse (matcher: `Agent`) — appends one JSONL event per delegation
      to `.router/log.jsonl`: ts, model, agent type, task description, prompt fingerprint (from
      last-prompt.json), flags (redo/escalated/enforced — flags wired in later tasks, schema now).
      Files: scripts/log.js, hooks/hooks.json
      Test: pipe a fake PostToolUse JSON through log.js → one well-formed JSONL line; live delegation
      appends a real one.
      Demo value: none

- [ ] T1.7 — Phase-1 demo checkpoint
      What: scripted 3-prompt session (trivial → standard → architecture) exercising down-route,
      normal route, and auto-escalation; fix whatever looks wrong.
      Files: none (verification only; fixes land in the tasks above)
      Test: all 3 prompts route to the expected tier and `.router/log.jsonl` has 3 correct entries.
      Demo value: HIGH — this session becomes the skeleton of DEMO.md.

## Phase 2: Visibility & Trust (must ship)

- [ ] T2.1 — Visible routing one-liners
      What: lock the one-line format `→ haiku-worker · single-file style tweak · /router:redo to escalate`
      into the injected directive (model prints it before every delegation — never silent). Design pass
      for screenshot: alignment, exactly one glyph, no wrapping at 80 cols.
      Files: scripts/inject.js, skills/routing-policy/SKILL.md
      Test: 5 varied prompts → 5 one-liners, correct format every time, zero silent delegations.
      Demo value: HIGH — this line is in every screenshot.

- [ ] T2.2 — First-run init hook
      What: `scripts/init.js` on SessionStart — if `~/.router/` missing: create it, copy
      `defaults/memory.md` + default config.json, print greeting via systemMessage (placeholder copy;
      characterful rewrite is T4.6). Idempotent, silent on later runs.
      Files: scripts/init.js, defaults/memory.md (stub), defaults/config.json, hooks/hooks.json
      Test: `rm -rf ~/.router && claude` → greeting prints once, files exist; second launch silent.
      Demo value: low (becomes HIGH after T4.6 copy pass)

- [ ] T2.3 — /router:redo
      What: `skills/redo/SKILL.md` (`disable-model-invocation: true`) + `scripts/last-task.js`.
      Dynamic-context line injects the last log entry; skill instructs: re-delegate same task one tier
      up (haiku→sonnet→opus→fable), and the re-delegation is logged with `redo: true` + original tier —
      the training signal for Phase 3.
      Files: skills/redo/SKILL.md, scripts/last-task.js, scripts/log.js (redo flag)
      Test: delegate to haiku → `/router:redo` → same task runs on sonnet; log shows paired entries.
      Demo value: HIGH — "undo my routing" is the trust feature; it's in the demo script.

- [ ] T2.4 — Phase-2 demo checkpoint
      What: run route → one-liner → redo → check log end-to-end; screenshot the one-liner + redo exchange.
      Files: none
      Test: sequence works cold, from a fresh `~/.router`.
      Demo value: HIGH

## Phase 3: Learning Loop (must ship — this is the differentiator)

- [ ] T3.1 — Cold-start memory.md + rule grammar
      What: ship `defaults/memory.md` with sensible dated first-person defaults ("2026-07-12: Test
      files and lockfile churn → haiku"). Define the dual-readable rule line:
      `- YYYY-MM-DD: <pattern> → <tier> (<reason>)` — prose to humans, grammar to the enforcer.
      Document the format in the file header itself.
      Files: defaults/memory.md
      Test: file reads naturally aloud AND every rule line parses with the T3.2 parser.
      Demo value: HIGH — this file gets screenshotted ("look what it learned").

- [ ] T3.2 — Enforcer hook (the updatedInput trick)
      What: `scripts/enforce.js` on PreToolUse (matcher: `Agent`) — parse memory.md rules, match
      against the delegation's task/files; on override, return full echoed input with new `model` +
      `permissionDecision: "allow"` + systemMessage:
      `↑ escalated to opus · learned rule: auth files (2026-07-12)`. No match → passthrough (no output).
      Files: scripts/enforce.js, hooks/hooks.json
      Test: scripted — fake Agent tool_input + a memory rule → assert updatedInput echoes all fields
      and only model changed; live — rule "auth → opus", delegate an auth task pinned to haiku,
      watch the escalation line.
      Demo value: HIGH — the "it remembered" moment.

- [ ] T3.3 — /router:reflect
      What: `skills/reflect/SKILL.md` with `context: fork`, `agent: haiku-worker` — reads recent
      log.jsonl (redos, overrides, escalations) + current memory.md, rewrites memory.md: adds dated
      rules for repeated signals, prunes stale ones. Strict output contract so rules stay parseable.
      Files: skills/reflect/SKILL.md
      Test: seed log with 3 redos on auth-touching tasks → `/router:reflect` → memory.md gains a
      dated auth rule that T3.2's parser accepts.
      Demo value: HIGH

- [ ] T3.4 — Phase-3 demo checkpoint: the full learning loop
      What: fresh state → auth task routes to haiku → redo → redo again next task → reflect →
      memory gains rule → next auth task auto-escalates with the learned-rule line. The core demo arc.
      Files: none
      Test: the arc completes with zero manual file edits.
      Demo value: HIGH — this IS the launch-post GIF.

## Phase 4: The Viral Layer (must ship — this is the marketing)

- [ ] T4.1 — /router:stats — the screenshot machine
      What: `scripts/stats.js` renders the report card from log.jsonl + memory.md: headline savings
      number first ("🎯 ~47% of Opus quota saved this week"), unicode-block prompts-per-tier bar chart,
      down-route %, override rate, 2–3 verbatim "What I've learned about you" lines. Skill prints
      script output verbatim via dynamic context injection. Two design passes: work, then beauty
      (alignment grid, ≤1 emoji per line, 60-col card width).
      Files: scripts/stats.js, skills/stats/SKILL.md
      Test: seeded log fixture → stable, aligned output (golden-file assert); empty log → graceful
      "not enough data yet" card.
      Demo value: HIGH — the single most shared artifact; final frame of the demo.

- [ ] T4.2 — /router:stats --share
      What: `--share` also writes `.router/stats-card.md` — clean markdown card for X/LinkedIn,
      with the badge snippet (T4.7) appended.
      Files: scripts/stats.js
      Test: card renders correctly pasted into a GitHub comment preview.
      Demo value: HIGH

- [ ] T4.3 — Audit mode
      What: `/router:audit on|off` flips config.json. When on: inject.js switches the directive to
      "route NOTHING, work normally" and logs a heuristic would-have-routed classification per prompt
      (deterministic keyword/length classifier in inject.js — no model dependence); stats.js renders
      the "would have saved" view. The zero-risk trial funnel.
      Files: skills/audit/SKILL.md, scripts/inject.js, scripts/stats.js, defaults/config.json
      Test: audit on → nothing delegates, log gains `audit: true` entries; `/router:stats` shows
      hypothetical savings; audit off restores routing.
      Demo value: HIGH — powers the "I ran it in audit mode for 2 days" post.

- [ ] T4.4 — /router:mode presets
      What: `frugal|balanced|performance` written to config.json; inject.js shifts the rubric
      thresholds one tier accordingly. Each switch prints a characterful confirmation
      (frugal: "Max plan is now on a diet.").
      Files: skills/mode/SKILL.md, scripts/inject.js, defaults/config.json
      Test: same ambiguous prompt routes one tier lower in frugal than in performance.
      Demo value: HIGH — frugal is the screenshot mode.

- [ ] T4.5 — /router:week digest
      What: `scripts/week.js` — "Your week in routing": 7-day tier mix, trend vs prior week, one
      personal-best line ("Longest streak without touching Fable: 3 days").
      Files: scripts/week.js, skills/week/SKILL.md
      Test: fixture spanning 14 days → correct week split + a personal best; <7 days of data degrades gracefully.
      Demo value: HIGH

- [ ] T4.6 — First-run greeting, real copy
      What: rewrite T2.2 greeting: short, characterful, sets the deal ("I'll route, I'll explain every
      choice, and /router:redo undoes me. Watch me learn."). The onboarding screenshot.
      Files: scripts/init.js
      Test: reads great in a fresh-install screenshot at default terminal width.
      Demo value: HIGH

- [ ] T4.7 — /router:memory + README badge
      What: `skills/memory/SKILL.md` pretty-prints memory.md as the "taste profile" card (same visual
      system as stats). Plus the shields.io "🧭 routed by ModelRouter" badge snippet in README and
      stats-card.md.
      Files: skills/memory/SKILL.md, scripts/memory-card.js, README.md
      Test: default memory renders pretty; badge renders on a scratch GitHub README.
      Demo value: HIGH — "look what it learned about me" is a share moment.

## Phase 5: Polish, Docs & Launch Assets

- [ ] T5.1 — README as landing page
      What: hero one-liner ("Make your Max plan last the whole week"), stats screenshot at top,
      30-sec GIF placeholder, one-line install, "How it works" (the two native doors, no proxy,
      no ToS risk), privacy note (all state local + human-readable), FAQ ("Will this make my code
      worse?" → redo + audit mode; "Can it change my main model?" → no, by design).
      Files: README.md
      Test: read top-to-bottom by a stranger persona: value clear in 10 seconds, install in 30.
      Demo value: HIGH — the landing page IS the launch.

- [ ] T5.2 — DEMO.md
      What: exact 30-second script — prompts to type, in order: down-route one-liner → auto-escalation
      → redo → /router:stats. Timed against a real run.
      Files: DEMO.md
      Test: execute verbatim from fresh state; every beat lands; ≤30s of typing.
      Demo value: HIGH

- [ ] T5.3 — docs/how-it-works.md
      What: technical deep-dive draft: PreToolUse updatedInput trick (with the full-replacement
      gotcha), skill model: frontmatter turn-override, model resolution order, why OAuth proxying
      is off the table, known limits (CLAUDE_CODE_SUBAGENT_MODEL trumps the hook).
      Files: docs/how-it-works.md
      Test: technically accurate against STEP 0.1 findings; readable as a standalone blog post.
      Demo value: low

- [ ] T5.4 — License, contributing, first issues
      What: MIT LICENSE (finalize), CONTRIBUTING.md (dev-install loop, no-deps rule, screenshot
      standard for terminal output), 3 good-first-issue drafts (e.g. new rubric keywords, a mode
      preset, stats color themes).
      Files: LICENSE, CONTRIBUTING.md, issues/*.md
      Test: a newcomer can dev-install and run the T1.7 checkpoint from CONTRIBUTING alone.
      Demo value: none

- [ ] T5.5 — Clean-machine install pass
      What: install via the one-liner on a machine/user with no dev setup; fix anything that prompts,
      errors, or looks wrong. Verify zero-dependency claim (node stdlib only).
      Files: whatever the pass surfaces
      Test: fresh user → install → first-run greeting → first routed prompt, no manual steps.
      Demo value: HIGH — install friction kills virality.

- [ ] T5.6 — Screenshot pass on every printed surface
      What: run every user-visible output (greeting, one-liners, escalation lines, stats, week,
      memory card, mode confirmations) at 80-col dark terminal; fix alignment, wrapping, emoji width.
      Files: scripts/*.js copy tweaks
      Test: each surface screenshotted; no misalignment, no wrapped lines.
      Demo value: HIGH

- [ ] T5.7 — Name decision + rename sweep
      What: final name call (ModelRouter vs Downshift vs other); if renamed: dir, plugin.json,
      command namespace, README, badge.
      Files: repo-wide grep
      Test: no stale name string anywhere; commands work under final namespace.
      Demo value: HIGH — the name is on every screenshot.

## Phase 6: Stretch (only if time remains)

- [ ] T6.1 — /router:stats --png
      What: render the stats card to PNG via a tiny self-contained HTML template + headless Chrome
      if present (skip gracefully if not).
      Files: scripts/stats-png.js, templates/card.html
      Test: PNG matches terminal card; absent Chrome → helpful message, no error.
      Demo value: HIGH

- [ ] T6.2 — Per-repo memory overlay
      What: `.router/memory.md` overrides/extends `~/.router/memory.md`; enforcer merges (repo wins).
      Files: scripts/enforce.js, scripts/inject.js
      Test: repo rule beats user rule for the same pattern.
      Demo value: low

- [ ] T6.3 — /router:redo --dry-run
      What: show what redo would re-run and on which tier, without running it.
      Files: skills/redo/SKILL.md, scripts/last-task.js
      Test: dry-run prints plan, log untouched.
      Demo value: none

- [ ] T6.4 — Cost-estimate lines
      What: optional $ estimates on stats/week using `data/pricing.json` (single editable file so
      prices never rot in code); off by default, `/router:stats --cost`.
      Files: data/pricing.json, scripts/stats.js
      Test: edit a price in JSON → next stats run reflects it, no code change.
      Demo value: HIGH — dollar numbers travel further than percentages.
