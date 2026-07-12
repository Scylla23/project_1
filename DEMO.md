# The 30-second demo

Four prompts, 142 characters of typing — about 28 seconds at 60 wpm.
Model runtime doesn't count as typing, and neither does setup. Every
expected output below is captured from a real run of this exact script
from fresh state.

## Setup (before the recording starts)

- ModelRouter installed, and NO `~/.router` directory at all
  (`rm -rf ~/.router` on a scratch machine — the plugin creates and
  seeds it at session start; a pre-made empty directory suppresses
  that).
- A scratch repo containing:
  - `NOTES.md` — one line with a deliberate typo:
    `This is teh demo repo.`
  - `cli.js` — a small CLI (~45 lines of hand-rolled flag parsing), so
    beat 2 has something real to talk about.
- Open Claude Code in the scratch repo. The first-run greeting
  (`[router] First run: created ~/.router …`) prints as the session
  starts — make it your opening frame, then start typing.

## Beat 1 — the down-route

Type:

```
Fix the typo in NOTES.md: teh -> the. Route it.
```

Expected — and this line is printed **by the router's hook, not by the
model**, so it can't be forgotten:

```
→ haiku-worker · Fix typo teh->the NOTES.md · /router:redo to escalate
```

(The task summary between the dots is model-written, so its wording
varies run to run; the line's shape is hook-guaranteed. The agent is
the model's routing call — a one-line typo fix lands on haiku-worker;
it's the most rehearsed route in the plugin's test suite.)

## Beat 2 — the auto-escalation

Type:

```
Split this CLI into services - what boundaries? Sketch, we'll iterate.
```

The `architect` skill auto-invokes and the turn escalates to fable —
watch the status line flip. Because the prompt asks to iterate, the
sketch happens inline (that is the case the skill plans inline for): no
delegation, nothing new in the log, so the next beat still points at
the typo task.

*Contingency:* routing is a model decision, so on some runs the sketch
gets delegated instead — you'll see a `→ fable-architect · …` line. If
that happens, cut and restart from fresh state; beat 3 depends on the
inline path.

## Beat 3 — the undo button

Type:

```
/router:redo
```

The last routed task re-runs exactly one tier up, announced by the same
hook:

```
→ sonnet-worker · Fix typo teh->the NOTES.md · /router:redo to escalate
```

The typo is already fixed, so the worker verifies and says so — the
beat is the tier bump, not the edit. Every redo is logged; this is the
signal the router learns from.

## Beat 4 — the payoff

Type:

```
/router:stats
```

Expected (this exact card, captured from the verification run — two
routed tasks, honest small numbers):

```
🎯 ~87% of Opus quota saved this week

── router · stats ──────────────────────────────────────────
  this week: 2 routed · 1 redo · 0 rule escalations
  haiku    ▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░   1  50%
  sonnet   ▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░   1  50%
  opus     ░░░░░░░░░░░░░░░░░░░░░░   0   0%
  fable    ░░░░░░░░░░░░░░░░░░░░░░   0   0%
  down-routed 100% · redo rate 50%
── what I've learned about you ─────────────────────────────
  2026-07-12: typo fixes → haiku (mechanical single-file edits)
  2026-07-12: lockfile churn → haiku (generated files need no judgment)
  2026-07-12: test file updates → haiku (mechanical test edits)
────────────────────────────────────────────────────────────
```

## Typing budget

| beat | keystrokes |
|------|-----------:|
| 1    |         47 |
| 2    |         70 |
| 3    |         12 |
| 4    |         13 |
| —    | **142 ≈ 28 s at 60 wpm** |

Cut. That's the GIF.
