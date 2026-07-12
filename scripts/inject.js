#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const keywords = [
  "fix", "typo", "rename", "comment", "format", "docs", "test",
  "feature", "add", "implement", "refactor", "bug", "debug",
  "performance", "architecture", "design", "plan", "migrate", "split",
  "redesign",
];

function optional(file, fallback, parse = (value) => value) {
  try {
    return parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function main() {
  let stdin = "";
  for await (const chunk of process.stdin) stdin += chunk;
  const input = JSON.parse(stdin);
  const prompt = String(input.prompt || "");
  const home = path.join(os.homedir(), ".router");
  const defaults = { mode: "balanced", audit: false };
  const loaded = optional(
    path.join(home, "config.json"),
    defaults,
    JSON.parse,
  );
  const config = loaded && typeof loaded === "object" &&
    !Array.isArray(loaded) ? loaded : defaults;
  const memory = optional(path.join(home, "memory.md"), "");
  const rules = memory
    .split(/\r?\n/)
    .filter((line) => /^- \d{4}-\d{2}-\d{2}:/.test(line))
    .slice(0, 3);
  const directive = [
    `[router] mode: ${config.mode || "balanced"} · audit: ` +
      (config.audit ? "on" : "off"),
    "Route every delegable task to the cheapest capable tier:",
    "  trivial/mechanical -> haiku-worker    " +
      "standard implementation -> sonnet-worker",
    "  complex multi-file -> opus-worker     " +
      "architecture/planning -> fable-architect",
    "Do not delegate interactive, ambiguous, or conversational work.",
    "Architecture, system design, and migration planning are ALWAYS delegated",
    "to fable-architect - never answer them at the main tier, however small.",
    "Before EVERY delegation print exactly one line, then delegate:",
    "  → <agent> · <task summary ≤40 chars> · /router:redo to escalate",
    "Never delegate silently. Consult the routing-policy skill when unsure.",
    "Learned rules (top 3):",
    ...(rules.length
      ? rules.map((rule) => `  ${rule}`.slice(0, 78))
      : ["  (none yet)"]),
  ].join("\n");

  const words = prompt.toLowerCase().match(/\b\w+\b/g) || [];
  const fileMatches = prompt.match(/\b[\w./-]+\.\w{1,10}\b/g) || [];
  const state = path.join(input.cwd || process.cwd(), ".router");
  try {
    fs.mkdirSync(state, { recursive: true });
    fs.writeFileSync(
      path.join(state, "last-prompt.json"),
      JSON.stringify({
        ts: new Date().toISOString(),
        chars: prompt.length,
        words: prompt.trim() ? prompt.trim().split(/\s+/).length : 0,
        keywords: keywords.filter((word) => words.includes(word)),
        files: [...new Set(fileMatches)].slice(0, 10),
        excerpt: prompt.slice(0, 80),
      }, null, 2) + "\n",
    );
  } catch {}
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: directive,
    },
  }));
}

main().catch(() => {
  process.exitCode = 0;
});
