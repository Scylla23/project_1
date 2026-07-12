---
name: audit
description: Turn audit mode on or off. On - the router routes nothing and logs what it WOULD have routed; off - resume real routing. Zero-risk trial.
disable-model-invocation: true
---

# Audit — watch without touching

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/config-set.js" audit $ARGUMENTS`

Relay the line above to the user exactly as printed - do not rephrase
it. If it says "audit is" or "unknown", the argument was missing or
invalid: relay it and stop. The change applies from the NEXT prompt
(this prompt's directive was built before the switch).
