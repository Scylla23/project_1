#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const rulePattern =
  /^- (\d{4}-\d{2}-\d{2}): (.+?) → (haiku|sonnet|opus|fable) \((.+)\)$/;

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

function main() {
  let memory = "";
  try {
    memory = fs.readFileSync(
      path.join(os.homedir(), ".router", "memory.md"),
      "utf8",
    );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const rules = memory.split(/\r?\n/).flatMap((line) => {
    const match = line.match(rulePattern);
    if (!match) return [];
    const full = line.slice(2);
    return [width(`  ${full}`) <= 78
      ? `  ${full}`
      : `  ${match[1]}: ${match[2]} → ${match[3]}`];
  });
  const count = rules.length;

  console.log([
    "🧭 what the router knows about you",
    "",
    rule(`taste profile · ${count} ${count === 1 ? "rule" : "rules"} · newest last`),
    ...(count
      ? rules
      : ["  No rules yet. Redos teach me; /router:reflect commits."]),
    rule("teach it"),
    "  /router:redo when a call misses · /router:reflect to learn",
    rule(),
  ].join("\n"));
}

try {
  main();
} catch {
  console.log("[router] could not render memory");
  process.exitCode = 0;
}
