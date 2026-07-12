#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

// relative cost weight per delegated task; opus is the quota unit (T6.4
// replaces these with data/pricing.json)
const COST_WEIGHT = { haiku: 1, sonnet: 3, opus: 15, fable: 25 };
const OPUS_WEIGHT = COST_WEIGHT.opus;
const TIERS = Object.keys(COST_WEIGHT);
const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

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

function readPricing(file) {
  try {
    const pricing = JSON.parse(fs.readFileSync(file, "utf8"));
    return pricing && !Array.isArray(pricing) &&
        Object.keys(pricing).every((key) => key.startsWith("_") || TIERS.includes(key)) &&
        TIERS.every((tier) => Number.isFinite(pricing[tier]) && pricing[tier] >= 0)
      ? pricing : null;
  } catch {
    return null;
  }
}

function savings(entries) {
  if (!entries.length) return 0;
  const cost = entries.reduce((sum, entry) => {
    return sum + (Object.hasOwn(COST_WEIGHT, entry.model) ?
      COST_WEIGHT[entry.model] : OPUS_WEIGHT);
  }, 0);
  return Math.round(100 * (1 - cost / (entries.length * OPUS_WEIGHT)));
}

function dateLabel(date) {
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

function dollarsSaved(entries, pricing) {
  const spent = entries.reduce((sum, entry) => sum +
    (TIERS.includes(entry.model) ? pricing[entry.model] : pricing.opus), 0);
  return entries.length * pricing.opus - spent;
}

function main() {
  const showCost = process.argv.includes("--cost");
  const pricing = showCost ? readPricing(path.join(
    __dirname, "..", "data", "pricing.json",
  )) : null;
  const env = process.env.ROUTER_NOW;
  let now = env ? new Date(env) : new Date();
  if (isNaN(now.getTime())) now = new Date();

  const real = readLog(path.join(process.cwd(), ".router", "log.jsonl"))
    .filter((entry) => entry.audit !== true);
  if (!real.length) {
    console.log([
      rule("router · week"),
      "  Not enough data yet - route a few tasks and check back.",
      "  Zero-risk trial: /router:audit on just watches.",
      rule(),
    ].join("\n"));
    if (showCost && !pricing) {
      console.log("[router] data/pricing.json missing or invalid - cost lines skipped");
    }
    return;
  }

  const dated = real.flatMap((entry) => {
    const ts = new Date(entry.ts);
    return isNaN(ts.getTime()) ? [] : [{ entry, ts }];
  });
  const current = dated.filter(({ ts }) => now - ts < WEEK && ts <= now)
    .map(({ entry }) => entry);
  const prior = dated.filter(({ ts }) => now - ts >= WEEK &&
      now - ts <= 2 * WEEK).map(({ entry }) => entry);
  const counts = Object.fromEntries(TIERS.map((tier) => [tier, 0]));
  for (const entry of current) {
    if (Object.hasOwn(counts, entry.model)) counts[entry.model]++;
  }

  const endDay = Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
  );
  const fableDays = new Set(dated.flatMap(({ entry, ts }) => {
    const day = Date.UTC(ts.getUTCFullYear(), ts.getUTCMonth(), ts.getUTCDate());
    return entry.model === "fable" && ts <= now &&
      day > endDay - 14 * DAY && day <= endDay ? [day] : [];
  }));
  let longest = 0;
  let streak = 0;
  for (let day = endDay - 13 * DAY; day <= endDay; day += DAY) {
    streak = fableDays.has(day) ? 0 : streak + 1;
    longest = Math.max(longest, streak);
  }

  const start = new Date(endDay - 6 * DAY);
  const end = new Date(endDay);
  const tierBody = current.length
    ? TIERS.map((tier) => row(tier, counts[tier], current.length))
    : ["  no routing this week yet - the card fills as you work"];
  let trend;
  let tasks;
  if (!prior.length) {
    trend = "  first tracked week - no trend yet";
    tasks = `  tasks routed ${current.length} (no history yet)`;
  } else {
    const saved = savings(current);
    const previous = savings(prior);
    const delta = saved - previous;
    const movement = delta === 0 ? "flat" :
      `${delta > 0 ? "up" : "down"} ${Math.abs(delta)} ` +
      `${Math.abs(delta) === 1 ? "point" : "points"}`;
    trend = `  quota saved ~${saved}% (last week ~${previous}%, ${movement})`;
    tasks = `  tasks routed ${current.length} (last week ${prior.length})`;
  }

  console.log([
    `📅 your week in routing · ${dateLabel(start)} - ${dateLabel(end)}`,
    "",
    rule(`tier mix · ${current.length} routed this week`),
    ...tierBody,
    rule("trend vs last week"),
    trend,
    tasks,
    ...(pricing ? [`  est. saved $${dollarsSaved(current, pricing).toFixed(2)} ` +
      `this week (${prior.length
        ? `last week $${dollarsSaved(prior, pricing).toFixed(2)}`
        : "no history yet"})`] : []),
    rule("personal best"),
    `  Longest streak without touching Fable: ${longest} ` +
      `${longest === 1 ? "day" : "days"}`,
    rule(),
  ].join("\n"));

  if (showCost && !pricing) {
    console.log("[router] data/pricing.json missing or invalid - cost lines skipped");
  }
}

try {
  main();
} catch {
  console.log("[router] could not render week");
  process.exitCode = 0;
}
