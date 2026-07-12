# Contributing to ModelRouter

Small plugin, strict rules. Everything below exists because breaking it
broke a real gate at some point.

## Dev install

```
git clone https://github.com/Scylla23/modelrouter
cd modelrouter
claude plugin marketplace add ./
claude plugin install router@modelrouter
```

Notes that save you an afternoon:

- `claude plugin marketplace add ./` — the trailing slash matters; bare
  `.` fails.
- The install references your working tree, so **edits to scripts and
  skills are live** — no reinstall. Start a new Claude Code session
  after changing `hooks/hooks.json` or the `.claude-plugin/` manifests.
- Confirm with `claude plugin list` (expect `router@modelrouter`,
  enabled). On a machine that has never run the plugin, a fresh session
  prints the first-run greeting once (it creates `~/.router`); if
  `~/.router` already exists the greeting is deliberately silent —
  verify instead by routing something trivial and watching for the
  `→ haiku-worker · …` hook line.

## Ground rules

- **Zero dependencies.** Node stdlib only, every script a single
  `#!/usr/bin/env node` file. No shared helper lib — tiny render
  helpers (pad, bar, rule) are duplicated per script, deliberately.
- **80 columns, printed surfaces only.** Every line the plugin prints
  must fit 80 terminal columns; cards use a 60-column grid (learned-rule
  lines may run to 78). This applies to PRINTED OUTPUT, not source
  wrapping — never reflow YAML frontmatter or long `description:`
  values to satisfy it. Width is measured as:

  ```js
  const w = l => [...l].reduce((n, c) =>
    n + (/\p{Extended_Pictographic}/u.test(c) ? 2 : 1), 0);
  ```

- **Never crash the session.** Hooks exit 0 silently on error; report
  scripts print one `[router] <what failed>` line (≤80 cols) and exit 0.
- **All date/time math in UTC.** Golden files must not depend on the
  machine's timezone.

## Testing rules — read before running anything

`~/.router` is real user state on any machine that has run the plugin.
The rules are non-negotiable:

- **Scripted node tests** run with `HOME=$(mktemp -d)`. Never point a
  test at your real home directory.
- **Live tests** (anything invoking `claude`) cannot fake `HOME` — auth
  lives there. Instead: `mv` the real `~/.router` to a backup dir and
  restore it with an EXIT trap that runs on success *and* failure.
  `.route/checkpoint-t24.sh` is the template. Keep the backup dir under
  a known scratch location (not bare `mktemp`) so strays are findable,
  and end every live gate by diffing the restored
  `~/.router/memory.md` against a pre-gate copy.
- **Headless audit/mode toggles** (`claude -p "/router:audit off"` etc.)
  are denied by the headless permission classifier unless the working
  directory's `.claude/settings.local.json` contains these allow rules:

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

  Details in [docs/how-it-works.md](docs/how-it-works.md), Known limits.

## The checkpoint (run this before and after your change)

The Phase-1 checkpoint is three prompts in a scratch repo — it exercises
down-routing, standard routing, and auto-escalation end to end.

1. Make a scratch dir containing `NOTES.md` (with a deliberate `teh`
   typo), a trivial `cli.js`, and a `package.json`.
2. In that dir, prompt:
   `Fix the typo in NOTES.md: change 'teh' to 'the'. Delegate per your
   routing directive.` → expect a `→ haiku-worker · … · /router:redo to
   escalate` line, printed by the hook.
3. Prompt: `Implement --version (read from package.json) and --help
   with usage text in cli.js, and add a test file covering both flags.
   Delegate per your routing directive.` → expect `→ sonnet-worker · …`.
4. Prompt: `We will grow this CLI into a service with a REST API, a
   background job queue, and a web dashboard. Plan the target
   architecture and the migration steps. Delegate per your routing
   directive.` → expect `→ fable-architect · …`.
5. Check `.router/log.jsonl` in the scratch dir: exactly three entries,
   models haiku / sonnet / fable.

If you have the maintainers' harness scripts (`.route/` is gitignored —
they ship separately), the same sequence is automated:
`.route/checkpoint-t17.sh` prints the commands; `RUN_LIVE=1
.route/checkpoint-t17.sh` executes and asserts them. The deeper gates
are `checkpoint-t24.sh` (greeting → route → redo), `checkpoint-t34.sh`
(the full learning loop), and `showcase-p4.sh` (every printed surface
against golden files, `ROUTER_NOW` frozen).

## Sending a change

Conventional commits, one logical change per commit. If your change
touches any printed surface, include a real terminal screenshot at 80
columns (before and after) in the PR description — pasted text hides
emoji-width and wrapping faults that only show in a terminal. A passing
diff with ugly output is a fail here. Good starter tasks live in
[issues/](issues/).
