# How ModelRouter works

ModelRouter never touches the network, never wraps your API traffic, and
never patches Claude Code. It is built entirely from documented plugin
extension points: hooks, skills, and agents. This page walks through the
machinery, including the parts that only exist because the obvious
approach failed.

## Model resolution order

For a delegated task (an `Agent` tool call), the model is resolved in
this order — first match wins:

1. `CLAUDE_CODE_SUBAGENT_MODEL` — verified live: with this environment
   variable set, a haiku-pinned worker ran the variable's model
   instead. If you set it, the workers' tier pins stop meaning
   anything (see Known limits).
2. The per-invocation `model` parameter on the Agent tool call — this is
   the field the router's PreToolUse hook rewrites.
3. The agent's `model:` frontmatter — each of the four worker agents
   (`haiku-worker`, `sonnet-worker`, `opus-worker`, `fable-architect`)
   pins its tier here. This is how ordinary down-routing works: the
   rubric picks the agent, the agent pins the model.
4. The session default.

For the main session itself there is exactly one lever: a skill's
`model:` frontmatter, which overrides the model for the rest of the
current turn and reverts automatically on the next prompt.

## Door #1: the `updatedInput` rewrite

A PreToolUse hook registered on the `Agent` matcher receives every
delegation before it runs. The router's enforcer acts only on
delegations to its own four worker agents — anything else passes
through untouched, unannounced, and outside the learned rules. To
change the model, the hook replies:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "updatedInput": { "...every original field...": "...", "model": "opus" }
  }
}
```

**The gotcha:** `updatedInput` replaces the *entire* tool input, not
just the fields you mention. Return only `{ "model": "opus" }` and the
delegation loses its prompt, its description, everything. The router's
enforcer therefore always echoes the full input with one field changed:

```js
updatedInput: { ...toolInput, model: best.tier }
```

If no learned rule applies to a router-worker delegation, the hook
returns only a `systemMessage` (the announcement line) and leaves the
tool input untouched — no `hookSpecificOutput`, no permission decision,
default flow.

## Door #2: skill `model:` turn-override

The escalation skills are ordinary plugin skills with model frontmatter:

```yaml
---
name: architect
description: Multi-file architecture change or system redesign - ...
model: fable
---
```

The description is written so Claude auto-invokes the skill when the
request is architecture-shaped. Invocation escalates the rest of the
turn to `fable`; the next prompt is back on your configured model. No
state, no cleanup — the revert is platform behavior, not plugin code.

## Why a hook prints the announcements

The routing one-liner —

```
→ haiku-worker · fix typo in README · /router:redo to escalate
```

— was originally the model's job: the injected directive said "print
this line before every delegation." That failed. Twice. Under
terse-output prompt shaping (the kind of hook that tells a model to
stop wasting tokens), the model reliably delegated *without* the
announcement — the exact silent routing the line exists to prevent. Two
rounds of increasingly emphatic directive wording did not fix it.

So the line went mechanical. The same PreToolUse hook that enforces
learned rules now emits the announcement for every router-worker
delegation as a `systemMessage` — a hook
output field that surfaces directly to the user, bypassing the model
entirely. The model's only remaining duty is to give every Agent call a
plain-ASCII `description` of at most 32 characters, which becomes the
announcement text and the log entry. An instruction can be argued with;
a hook cannot.

## The audit classifier

In audit mode (`/router:audit on`) nothing delegates — the injected
directive tells the session to handle everything itself — and the
router logs what it *would* have routed. That classification is a
deterministic table in the UserPromptSubmit hook, not a model call.
Tokens are the lowercased words of the prompt; the first matching row
wins:

| # | rule                                                          | would_route |
|---|---------------------------------------------------------------|-------------|
| 1 | any of: architecture, design, plan, migrate, split, redesign  | fable       |
| 2 | any of: refactor, debug, performance                          | opus        |
| 3 | any of: feature, add, implement, bug, test                    | sonnet      |
| 4 | any of: fix, typo, rename, comment, format, docs              | haiku       |
| 5 | no keyword hit AND word count ≥ 30                            | sonnet      |
| 6 | no keyword hit AND word count < 30                            | haiku       |

Rows 1–4 partition the same 20-keyword list the prompt fingerprint
already tracks — audit mode adds no new vocabulary. Prompts starting
with `/` are skipped (slash commands are not delegable work). Each
classified prompt appends an `audit: true` entry to `.router/log.jsonl`;
the stats renderer keeps audit entries and real routing entries in
strictly separate views.

## The learned-rule grammar

Rules live in `~/.router/memory.md`, one per line, newest last — prose
to a human, grammar to the enforcer:

```
- 2026-07-12: auth files → opus (redone twice from haiku)
```

The parser is one shared regex, byte-identical in the memory file's own
header and in the enforcer:

```
/^- (\d{4}-\d{2}-\d{2}): (.+?) → (haiku|sonnet|opus|fable) \((.+)\)$/
```

Matching is deliberately dumb: the rule's pattern is tokenized
(lowercase, tokens shorter than 3 characters and a small stopword list
dropped), and a rule applies when any token appears at a word boundary
in the delegation's description, prompt, or the current prompt's
fingerprint (mentioned files, keywords, excerpt). If several rules
match, the highest tier wins. The enforcer only ever escalates — a rule
naming a *lower* tier than the delegation already has is ignored, so a
learned rule can never quietly downgrade your work. Every enforcement
prints its own line:

```
↑ escalated to opus · learned rule: auth files (2026-07-12)
```

`/router:reflect` is what writes new rules: it reads the recent decision
log (redos are the strongest signal — each one is you saying "that tier
was wrong"), then rewrites memory.md, adding dated rules for repeated
corrections and pruning stale ones. You can also just edit the file; it
is yours.

## Why OAuth proxying is off the table

There is a tempting shortcut this plugin refuses: run a local proxy,
point the CLI at it, and rewrite the `model` field of every API request
in flight. It would give total control — main-session model included —
and it is a trap. It means intercepting authenticated traffic of a
subscription product (a terms-of-service problem, and the kind that
gets an ecosystem tool killed), and it breaks silently the moment auth,
transport, or endpoint shape changes. ModelRouter's hard constraint is
that it only does things the plugin API is documented to allow. That
costs one capability (see below) and buys everything else: no wire
risk, no ToS risk, no breakage when internals change.

## Known limits

- **`CLAUDE_CODE_SUBAGENT_MODEL` overrides the workers' pinned
  tiers** (verified live). With it set, every router worker runs the
  variable's model regardless of its tier, so routing is moot. The
  router does not fight it — unset the variable to use the router.
- **The main-session model is out of scope — by design.** The router's
  enforcement hook only edits `Agent` tool calls, so it cannot rewrite
  the model you are talking to; only turn-scoped skill escalation
  (Door #2) touches the main session, visibly.
- **Headless audit/mode toggles need a permission rule.** The
  `/router:audit` and `/router:mode` skills write config through a
  script executed at skill-expansion time. In *headless* runs
  (`claude -p`), auto-mode routes that command through a permission
  classifier that denies `config-set.js audit off` as audit-log
  tampering (while `audit on` passes) and aborts the whole prompt. The
  denial is specific to that headless classifier; in an interactive
  session, if Claude Code asks permission for the config-set command,
  approving it once is enough. Broad allow rules do not help headless;
  the one working fix is a tight rule in the working directory's
  `.claude/settings.local.json`:

  ```json
  {
    "permissions": {
      "allow": [
        "Bash(node *config-set.js* audit *)",
        "Bash(node *config-set.js* mode *)"
      ]
    }
  }
  ```

  Scripted CI or demo harnesses that toggle audit/mode headlessly must
  seed that file first.
