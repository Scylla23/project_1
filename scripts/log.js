#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const models = {
  "haiku-worker": "haiku",
  "sonnet-worker": "sonnet",
  "opus-worker": "opus",
  "fable-architect": "fable",
};

async function main() {
  let stdin = "";
  for await (const chunk of process.stdin) stdin += chunk;
  const input = JSON.parse(stdin);
  if (Object.hasOwn(input, "tool_name") && input.tool_name !== "Agent") return;

  const toolInput = input.tool_input || {};
  const state = path.join(input.cwd || process.cwd(), ".router");
  fs.mkdirSync(state, { recursive: true });

  let fingerprint = null;
  try {
    fingerprint = JSON.parse(
      fs.readFileSync(path.join(state, "last-prompt.json"), "utf8"),
    );
  } catch {}

  const agent = toolInput.subagent_type || "unknown";
  const agentName = agent.slice(agent.lastIndexOf(":") + 1);
  const event = {
    ts: new Date().toISOString(),
    model:
      toolInput.model ||
      (Object.hasOwn(models, agentName) ? models[agentName] : "inherit"),
    agent,
    task: toolInput.description || String(toolInput.prompt || "").slice(0, 60),
    fingerprint,
    flags: { redo: false, escalated: false, enforced: false },
  };
  fs.appendFileSync(path.join(state, "log.jsonl"), JSON.stringify(event) + "\n");
}

main().catch(() => {
  process.exitCode = 0;
});
