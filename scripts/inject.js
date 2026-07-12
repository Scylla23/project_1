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
const AUDIT_BUCKETS = {
  fable: ["architecture", "design", "plan", "migrate", "split", "redesign"],
  opus: ["refactor", "debug", "performance"],
  sonnet: ["feature", "add", "implement", "bug", "test"],
  haiku: ["fix", "typo", "rename", "comment", "format", "docs"],
};

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
    .slice(-3);
  const routingDirective = [
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
    "Before EVERY delegation, print exactly this plain-text line, then delegate:",
    "  → <agent> · <task summary ≤32 chars> · /router:redo to escalate",
    "<agent> is the basename (haiku-worker), never the namespaced form. Summary is",
    "plain ASCII. Whole line fits 80 columns. Never delegate silently or skip it.",
    "Consult the routing-policy skill when unsure.",
    "Learned rules (top 3):",
    ...(rules.length
      ? rules.map((rule) => `  ${rule}`.slice(0, 78))
      : ["  (none yet)"]),
  ].join("\n");
  const auditDirective = [
    `[router] mode: ${config.mode || "balanced"} · audit: ON · routing paused`,
    "AUDIT MODE: do NOT delegate anything. Do not use the Agent tool at all.",
    "Handle every task yourself in this session, at the main tier.",
    "The router is watching: each prompt is logged with the tier it WOULD have",
    "routed to. /router:stats shows what routing would have saved.",
    "/router:audit off resumes real routing.",
  ].join("\n");
  const directive = config.audit ? auditDirective : routingDirective;

  const words = prompt.toLowerCase().match(/\b\w+\b/g) || [];
  const fileMatches = prompt.match(/\b[\w./-]+\.\w{1,10}\b/g) || [];
  const state = path.join(input.cwd || process.cwd(), ".router");
  const fingerprint = {
    ts: new Date().toISOString(),
    chars: prompt.length,
    words: prompt.trim() ? prompt.trim().split(/\s+/).length : 0,
    keywords: keywords.filter((word) => words.includes(word)),
    files: [...new Set(fileMatches)].slice(0, 10),
    excerpt: prompt.slice(0, 80),
  };
  try {
    fs.mkdirSync(state, { recursive: true });
    fs.writeFileSync(
      path.join(state, "last-prompt.json"),
      JSON.stringify(fingerprint, null, 2) + "\n",
    );
    if (config.audit && !prompt.trim().startsWith("/")) {
      const wouldRoute = Object.entries(AUDIT_BUCKETS).find(([, bucket]) =>
        bucket.some((word) => words.includes(word)))?.[0] ||
        (fingerprint.words >= 30 ? "sonnet" : "haiku");
      fs.appendFileSync(path.join(state, "log.jsonl"), JSON.stringify({
        ts: fingerprint.ts,
        audit: true,
        would_route: wouldRoute,
        task: prompt.slice(0, 60),
        fingerprint,
      }) + "\n");
    }
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
