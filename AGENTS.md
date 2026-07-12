# Repository Guidelines

## Project Structure & Module Organization

ModelRouter is a zero-dependency Claude Code plugin. Runtime logic lives in
`scripts/` as single-file CommonJS programs. `hooks/hooks.json` connects those
scripts to Claude Code events. Agent definitions are in `agents/`, while each
command or routing capability has its own `skills/<name>/SKILL.md`. Default
user state is copied from `defaults/`. Keep architectural documentation in
`docs/` and demo instructions in `DEMO.md`. Development fixtures live under
`.route/fixtures/`: `.router/` is per-repo runtime state (`log.jsonl`,
gitignored), while `.route/` is the gitignored dev harness (plans, fixtures,
checkpoints). Plugin metadata belongs in `.claude-plugin/plugin.json`.

## Build, Test, and Development Commands

There is no build step and no `npm install`; scripts use only Node.js built-ins.

- `claude plugin validate .` validates the plugin manifest and layout.
- `for f in scripts/*.js; do node --check "$f" || exit; done` checks JavaScript
  syntax across every hook script.
- `echo '{"prompt":"fix typo in README","hook_event_name":"UserPromptSubmit","cwd":"."}' | node scripts/inject.js`
  smoke-tests prompt routing from stdin.
- `node scripts/stats.js` renders statistics from `.router/log.jsonl`; set
  `ROUTER_NOW` when a deterministic date is needed.

Run the relevant script directly after changes, then exercise the matching
checkpoint documented in `CONTRIBUTING.md` using the `.route/*.sh` scripts with
`RUN_LIVE=1`.

## Coding Style & Naming Conventions

Use two-space indentation, semicolons, double-quoted strings, and CommonJS
`require()` with explicit `node:` prefixes. Prefer small functions and Node's
standard library over dependencies. Script filenames use kebab-case
(`memory-card.js`); skill directories use lowercase command names. Preserve
the hook contract: read JSON from stdin and emit only valid JSON or intentional
user-facing text. Keep Markdown direct and wrap prose near 80 columns.

## Testing Guidelines

The repository uses focused smoke checks instead of a test framework or formal
coverage target. Test valid input, malformed or missing local state, and the
empty-data path for any changed hook. Use temporary `HOME` and fixture data
when a script touches `~/.router` so development does not overwrite personal
rules. Add fixtures only when output must remain stable across runs.

## Commit & Pull Request Guidelines

Follow the existing Conventional Commit style: `feat:`, `fix:`, or `chore:`,
with a concise imperative summary; append a plan ID such as `(T4.2)` when
applicable. Pull requests should explain behavior changes, list commands run,
link the issue or plan task, and include screenshots for visible CLI or Claude
Code output. Never commit API keys, personal `~/.router` data, or generated
`.router/` logs and cards.
