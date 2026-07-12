#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// relative cost weight per delegated task; opus is the quota unit (T6.4
// replaces these with data/pricing.json)
const COST_WEIGHT = { haiku: 1, sonnet: 3, opus: 15, fable: 25 };
const OPUS_WEIGHT = COST_WEIGHT.opus;
const TIERS = Object.keys(COST_WEIGHT);
const WEEK = 7 * 24 * 60 * 60 * 1000;
const BADGE = "[![🧭 routed by ModelRouter](https://img.shields.io/badge/🧭_routed_by-ModelRouter-blue)](https://github.com/pavankushnure/modelrouter)";

function width(line) {
  return [...line].reduce(
    (n, c) => n + (/\p{Extended_Pictographic}/u.test(c) ? 2 : 1),
    0,
  );
}

function rule(label = "") {
  const start = label ? `── ${label} ` : "";
  return start + "─".repeat(60 - width(start));
}

function row(tier, count, total) {
  const filled = count ? Math.max(1, Math.round(count / total * 22)) : 0;
  const bar = "▓".repeat(filled) + "░".repeat(22 - filled);
  const pct = Math.round(count / total * 100) + "%";
  return "  " + tier.padEnd(9) + bar + String(count).padStart(4) +
    pct.padStart(5);
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function readLog(file) {
  try {
    return fs.readFileSync(file, "utf8").split("\n").filter(Boolean).flatMap(
      (line) => {
        try {
          return [JSON.parse(line)];
        } catch {
          return [];
        }
      },
    );
  } catch {
    return [];
  }
}

function learnedRules(file) {
  try {
    return fs.readFileSync(file, "utf8").split("\n")
      .filter((line) => /^- \d{4}-\d{2}-\d{2}:/.test(line)).slice(-3)
      .map((line) => {
        let text = "  " + line.slice(2);
        if (width(text) > 78) text = text.replace(/ \([^()]*(?:\([^)]*\)[^()]*)*\)$/, "");
        return text;
      });
  } catch {
    return [];
  }
}

function shareRules(file) {
  try {
    return fs.readFileSync(file, "utf8").split("\n").flatMap((line) => {
      const match = line.match(/^- \d{4}-\d{2}-\d{2}: (.+?) → (haiku|sonnet|opus|fable) \(.+\)$/);
      return match ? [`- ${match[1]} → ${match[2]}`] : [];
    }).slice(-3);
  } catch {
    return [];
  }
}

function main() {
  const share = process.argv.includes("--share");

  const state = path.join(process.cwd(), ".router");
  const userState = path.join(os.homedir(), ".router");
  const config = readJson(path.join(userState, "config.json"), {
    mode: "balanced",
    audit: false,
  });
  void config.mode;

  const env = process.env.ROUTER_NOW;
  let now = env ? new Date(env) : new Date();
  if (isNaN(now.getTime())) now = new Date();

  const entries = readLog(path.join(state, "log.jsonl"));
  const real = entries.filter((entry) => entry.audit !== true);
  const audit = entries.filter((entry) => entry.audit === true);
  const current = (config.audit ? audit : real).filter((entry) => {
    const ts = new Date(entry.ts);
    return !isNaN(ts.getTime()) && now - ts < WEEK && ts <= now;
  });

  if (!current.length) {
    console.log([
      rule("router · stats"),
      "  Not enough data yet - route a few tasks and check back.",
      "  Zero-risk trial: /router:audit on just watches.",
      rule(),
    ].join("\n"));
    if (share) console.log("not enough data for a share card yet");
    return;
  }

  const modelOf = (entry) => config.audit ? entry.would_route : entry.model;
  const counts = Object.fromEntries(TIERS.map((tier) => [tier, 0]));
  let cost = 0;
  for (const entry of current) {
    const model = modelOf(entry);
    if (Object.hasOwn(counts, model)) counts[model]++;
    cost += Object.hasOwn(COST_WEIGHT, model) ? COST_WEIGHT[model] : OPUS_WEIGHT;
  }

  const total = current.length;
  const saved = Math.round(100 * (1 - cost / (total * OPUS_WEIGHT)));
  const redos = current.filter((entry) => entry.flags?.redo).length;
  const escalations = current.filter((entry) => entry.flags?.enforced).length;
  const down = Math.round(100 * (counts.haiku + counts.sonnet) / total);
  const redoRate = Math.round(100 * redos / total);
  const learned = learnedRules(path.join(userState, "memory.md"));

  console.log([
    config.audit
      ? `🔍 audit: ~${saved}% of Opus quota would have been saved`
      : `🎯 ~${saved}% of Opus quota saved this week`,
    "",
    rule(config.audit ? "router · stats · audit mode" : "router · stats"),
    config.audit
      ? `  audited: ${total} ${total === 1 ? "prompt" : "prompts"} classified, nothing delegated`
      : `  this week: ${total} routed · ${redos} ${redos === 1 ? "redo" : "redos"} · ` +
        `${escalations} rule ${escalations === 1 ? "escalation" : "escalations"}`,
    ...TIERS.map((tier) => row(tier, counts[tier], total)),
    config.audit
      ? "  would-route mix over the last 7 days"
      : `  down-routed ${down}% · redo rate ${redoRate}%`,
    rule("what I've learned about you"),
    ...(learned.length ? learned : ["  (nothing yet - /router:redo trains me)"]),
    rule(),
  ].join("\n"));

  if (share) {
    const summary = config.audit
      ? `**~${saved}% of Opus quota would have been saved** · ${total} prompts audited`
      : `**~${saved}% of Opus quota saved** · ${total} tasks routed · ${redos} ${redos === 1 ? "redo" : "redos"}`;
    const card = [
      "## 🧭 ModelRouter — my week",
      "",
      summary,
      "",
      "| tier   | tasks | share |",
      "|--------|------:|------:|",
      ...TIERS.map((tier) => `| ${tier.padEnd(7)}| ${String(counts[tier]).padStart(5)} | ${(Math.round(counts[tier] / total * 100) + "%").padStart(5)} |`),
      "",
      "What it learned about me:",
      "",
      ...shareRules(path.join(userState, "memory.md")),
      "",
      BADGE,
      "",
    ].join("\n");
    fs.mkdirSync(state, { recursive: true });
    fs.writeFileSync(path.join(state, "stats-card.md"), card);
    console.log("stats card written to .router/stats-card.md");
  }
}

try {
  main();
} catch {
  console.log("[router] could not render stats");
  process.exitCode = 0;
}
