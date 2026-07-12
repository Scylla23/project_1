# ModelRouter

[![🧭 routed by ModelRouter](https://img.shields.io/badge/🧭_routed_by-ModelRouter-blue)](https://github.com/Scylla23/modelrouter)

**Make your Max plan last the whole week.**

ModelRouter is a Claude Code plugin that routes every task to the
cheapest Claude model that can nail it — and says so, out loud, every
time. Wrong call? One command re-runs it a tier up, and the router
remembers the correction.

```
🎯 ~70% of Opus quota saved this week

── router · stats ──────────────────────────────────────────
  this week: 23 routed · 2 redos · 1 rule escalation
  haiku    ▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░  12  52%
  sonnet   ▓▓▓▓▓▓▓░░░░░░░░░░░░░░░   7  30%
  opus     ▓▓▓░░░░░░░░░░░░░░░░░░░   3  13%
  fable    ▓░░░░░░░░░░░░░░░░░░░░░   1   4%
  down-routed 83% · redo rate 9%
── what I've learned about you ─────────────────────────────
  2026-07-12: test file updates → haiku (mechanical test edits)
  2026-07-12: auth files → opus (redone twice from haiku)
  2026-07-12: api handlers → sonnet (implementation, not architecture)
────────────────────────────────────────────────────────────
```

*Rendered by `/router:stats` from a seeded 14-day routing log — 23
routed tasks in the pictured week. Re-derive the headline yourself from
the cost weights at the top of `scripts/stats.js`.*

<!-- TODO(launch): record the 30-second GIF from DEMO.md and embed it here -->
▶ 30-second demo GIF coming with launch — the script it records is
[DEMO.md](DEMO.md).

## Install

```
claude plugin marketplace add Scylla23/modelrouter && claude plugin install router@modelrouter
```

That's it. No API keys, no dependencies, no configuration. Open Claude
Code and the router introduces itself on first run.

## What you get

- **Visible routing.** Every delegation to a router worker is announced
  with a one-liner — `→ haiku-worker · fix typo in README ·
  /router:redo to escalate` — printed by a hook, not by the model, so
  the announcement never depends on the model remembering to speak up.
- **An undo button.** `/router:redo` re-runs the last routed task one
  model tier up. No arguments, no ceremony.
- **A router that learns.** Corrections become dated, human-readable
  rules in `~/.router/memory.md`. `/router:reflect` studies your redos
  and writes new rules; a hook enforces them on future delegations and
  announces every escalation it makes.
- **Report cards.** `/router:stats` for the savings headline,
  `/router:week` for the trend, `/router:memory` for what it has
  learned about you.

## How it works

Three small, native pieces — hooks, skills, and agents, the same
extension points Claude Code documents for every plugin:

1. **A rubric picks the tier.** On every prompt, a hook injects a short
   routing directive: delegate each task to the cheapest capable worker
   agent — haiku, sonnet, opus, or fable, each pinned to its model.
   That's how work routes down.
2. **A hook enforces your learned rules.** Before a delegation runs, a
   PreToolUse hook checks it against `~/.router/memory.md`; when a rule
   calls for a bigger model, it rewrites the delegation's `model`
   parameter upward and prints the escalation line. It never downgrades
   a delegation.
3. **Skills escalate a single turn.** Architecture-shaped requests
   auto-invoke a skill whose `model:` frontmatter runs the rest of the
   turn on a bigger model — visibly, and it reverts on the next prompt.

No proxy, no man-in-the-middle, no API-key middleman. Nothing intercepts
or rewrites network traffic — no terms-of-service gray area.

Deep dive: [docs/how-it-works.md](docs/how-it-works.md).

## Privacy

Everything the router knows lives in two local directories you can open
in any editor: `~/.router/` (its learned rules and config) and
`.router/` per repo — its decision log, any stats cards you export, and
a fingerprint of your latest prompt (length, keywords, files mentioned,
and a short verbatim excerpt; audit entries keep a short excerpt too).
All of it is human-readable markdown and JSON. Nothing leaves your
machine. Zero dependencies — the whole plugin is a handful of
single-file Node scripts on the standard library. Don't want routing
metadata in version control? Add `.router/` to your repo's
`.gitignore`.

## Commands

| Command | What it does |
|---|---|
| `/router:stats` | The report card: quota saved, tier mix, learned rules. Add `--share` to write a postable markdown card. |
| `/router:redo` | Re-run the last routed task one tier up. |
| `/router:audit on\|off` | Watch-only mode: routes nothing, logs what it *would* have routed. |
| `/router:mode frugal\|balanced\|performance` | Shift how ambiguous tasks tiebreak between tiers. |
| `/router:week` | Your week in routing: tier mix, trend vs last week, personal best. |
| `/router:memory` | The taste profile: every routing rule it has learned about you. |
| `/router:reflect` | Study recent corrections and update the learned rules. |

## FAQ

**Will this make my code worse?**
It routes to the cheapest tier that can *nail* the task — not the
cheapest tier, full stop — and it is never silent about the choice. If a
call misses, `/router:redo` re-runs it one tier up, and the router
learns from the correction. Still skeptical? `/router:audit on` is the
zero-risk trial: the router stops delegating, classifies each prompt
instead, and logs what routing would have saved.

**Can it change my main model?**
Your model setting is never touched — the hooks only rewrite subagent
delegations, and only upward. The one thing that runs higher is an
escalation skill on architecture-shaped requests: visible when it
happens, scoped to that single turn, reverted on the next prompt.
Nothing changes your configuration, silently or otherwise.

**Do I need an API key or a proxy?**
No. ModelRouter is plugin-native: hooks, skills, and agents. It works
with your existing Claude Code login and whatever plan you're on.

---

MIT — [LICENSE](LICENSE) · [DEMO.md](DEMO.md) ·
[docs/how-it-works.md](docs/how-it-works.md) ·
[CONTRIBUTING.md](CONTRIBUTING.md)
