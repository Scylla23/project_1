---
name: routing-policy
description: >-
  Model-routing rubric. Use when deciding which worker agent (haiku-worker,
  sonnet-worker, opus-worker, fable-architect) should handle a task, whether
  to delegate at all, or which model tier a prompt deserves.
---

# Routing policy

Use this rubric to choose the cheapest worker capable of completing the task.

| Task type | Trivial | Standard | Complex |
| --- | --- | --- | --- |
| Mechanical edit | haiku-worker | haiku-worker | sonnet-worker |
| Doc/comment change | haiku-worker | haiku-worker | sonnet-worker |
| Single-file bugfix | haiku-worker | sonnet-worker | opus-worker |
| Feature, few files | sonnet-worker | sonnet-worker | opus-worker |
| Multi-file refactor | sonnet-worker | opus-worker | opus-worker |
| Debugging unknown cause | sonnet-worker | opus-worker | opus-worker |
| Architecture/design | fable-architect | fable-architect | fable-architect |
| Planning/review | sonnet-worker | sonnet-worker | fable-architect |

## Delegation rules

1. The cheapest capable tier wins.
2. When in doubt between two tiers, pick the lower and note that escalation
   is one `/router:redo` away.
3. Always print the one-liner below as a plain-text line (not a code
   block) immediately before delegating. Never delegate silently.

## When NOT to delegate

Do not delegate interactive or back-and-forth work, ambiguous specs needing
user questions, conversational answers, or tasks taking under about 30
seconds.

## One-liner contract

→ <agent> · <task summary ≤32 chars> · /router:redo to escalate

`<agent>` is the basename without the `router:` prefix.

Exactly one glyph (`→`); the whole line must fit in 80 columns.

Print it for every delegation, including auto-escalations via the
architect/design skills.
