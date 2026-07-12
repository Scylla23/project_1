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
3. Always announce with the one-liner below before delegating.

## When NOT to delegate

Do not delegate interactive or back-and-forth work, ambiguous specs needing
user questions, conversational answers, or tasks taking under about 30
seconds.

## One-liner contract

```
→ <agent> · <task summary ≤40 chars> · /router:redo to escalate
```
