#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const OPTIONS = {
  mode: ["frugal", "balanced", "performance"],
  audit: ["on", "off"],
};
const CONFIRM = {
  mode: {
    frugal: "[router] mode: frugal · Max plan is now on a diet.",
    balanced: "[router] mode: balanced · Every task gets exactly the tier it deserves.",
    performance: "[router] mode: performance · Quota is no object today. Sending it.",
  },
  audit: {
    on: "[router] audit: on · Watching, not touching. Nothing delegates; I take notes.",
    off: "[router] audit: off · Audit over. Hands back on the wheel.",
  },
};

function width(value) {
  return [...value].reduce(
    (n, c) => n + (/\p{Extended_Pictographic}/u.test(c) ? 2 : 1),
    0,
  );
}

function displayValue(value, room) {
  let shown = "";
  for (const char of [...value].slice(0, 20)) {
    if (width(shown + char) > room) break;
    shown += char;
  }
  return shown;
}

function main() {
  const key = process.argv[2];
  const value = process.argv[3];
  const options = OPTIONS[key];
  if (!options) return;

  const file = path.join(os.homedir(), ".router", "config.json");
  let config = { mode: "balanced", audit: false };
  try {
    const loaded = JSON.parse(fs.readFileSync(file, "utf8"));
    if (loaded && typeof loaded === "object" && !Array.isArray(loaded)) {
      config = loaded;
    }
  } catch (error) {
    if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
  }

  const choices = options.join(" | ");
  if (!value) {
    const current = key === "audit" ? (config.audit ? "on" : "off") :
      (options.includes(config.mode) ? config.mode : "balanced");
    console.log(`[router] ${key} is ${current} · options: ${choices}`);
    return;
  }
  if (!options.includes(value)) {
    const frame = `[router] unknown ${key} "" · options: ${choices}`;
    const shown = displayValue(value, 80 - width(frame));
    console.log(`[router] unknown ${key} "${shown}" · options: ${choices}`);
    return;
  }

  config[key] = key === "audit" ? value === "on" : value;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(config, null, 2) + "\n");
  console.log(CONFIRM[key][value]);
}

try {
  main();
} catch {
  console.log("[router] could not write ~/.router/config.json");
  process.exitCode = 0;
}
