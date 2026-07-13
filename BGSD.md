# BGSD.md — bgsd settings

This file configures how bgsd (the Conductor, "Kiwi") runs in this repo. Every
knob lives in the `bgsd-settings` block below and ships with a sensible default.
Edit the block to override; Kiwi reads it at the start of every sesh. You can
also write prose preferences (tone, risk appetite, "always ask before X") in the
Notes section and Kiwi will respect them.

## Settings

- **integration_branch** — the standing branch that acts as the rehearsal /
  integration mirror of `main`. Worktree branches merge here; `integration ->
  main` is always a manual, human-only merge.
- **base_branch** — `null` auto-detects from `origin/HEAD` (falls back to
  `main`, then `master`). Set explicitly to pin it.
- **git.sync_integration_from_base** — ff-update the integration branch from the
  base branch at the start of every sesh, so it never falls behind production.
- **git.integration_to_main** — kept `manual`: no agent ever commits to
  `main`. Kiwi only suggests the merge command for you to run.
- **github.issues** — file one atomic issue per work unit plus one epic issue
  per sesh; each PR closes its issue on merge.
- **github.require_remote** — when there's no GitHub remote, skip all issue/PR
  machinery and just branch + merge locally.
- **env.propagate / env.files** — git worktrees don't carry gitignored files, so
  Kiwi copies these env files from the repo root into every worktree (and onto
  the integration branch) so your apps actually run. Edit the globs to match
  this repo's env files.
- **model_contract** — the v2 Conductor/build/evaluation contract. The live
  Claude Code or Codex session is the Conductor and Advisor. The build lane owns
  Pipeline Agents, nested GSD phases, internal review, and repairs. The evaluation
  lane owns Loop 1/Loop 2 verification and final fresh review. `routing: fixed`
  pins every unit to the build model. `routing: adaptive` lets the Conductor
  explicitly assign a validated heavy or light model per unit and records why;
  unassigned work stays heavy. Evaluation remains fixed by default.
- **model_contract.auth** — always `subscription-only`. BGSD Doctor verifies
  Claude and Codex subscription login, and child processes scrub provider API-key
  variables. The optional proxy changes transport, not billing, and never becomes
  a silent fallback.
- **verification.usage_testing** — `true` runs the full Tester ladder including
  the Playwright/vision rung (driving the real app). `false` skips that UI
  usage-testing but STILL runs the goal-backward code verification
  (gsd-verifier), so quick fixes and non-UI changes don't pay for browser
  testing. Toggle per-session with `--no-usage-verification`, or tell Kiwi
  ("stop UI-testing quick fixes") and it sets this for you. It never disables
  code verification — "no silent green" still holds.
- **verification.headless** — `true` drives Playwright headless, no visible
  browser or server window pops up on your machine (discreet). `false` lets it
  run headed. Toggle per-session with `--headless-ui`, or tell Kiwi ("always
  verify headless").
- **gui.auto** — start and open the live web dashboard automatically for
  feature- and project-scale seshs; quick seshs stay terminal-only. Opt out for
  one session with `--no-gui`, or set `false` here to keep it manual
  (`/bgsd-gui` still opens it on demand).
- **notifications.os** — fire a native macOS notification the moment the
  pipeline needs your input (an escalated question, a human gate), so you can
  walk away from long seshs and still get pinged. Fail-silent, and a no-op off
  macOS.
- **remote.enabled / remote.host / remote.port** — expose a local HTTP bridge
  (`/bgsd-remote`) so you can watch and steer a live sesh from a phone app:
  stream the Conductor's output, send it messages, and answer its questions
  remotely. `host` is `loopback` (127.0.0.1, tunnel it for true remote) or
  `lan` (0.0.0.0 on your network); a token is generated at start and required
  for any non-loopback bind. `port: 0` lets the OS pick. Off by default.
- **modes.pipeline / modes.verifier** — how much work each role does, three
  levels: `fast` (pipeline skips research; verifier code-only), `thorough`
  (pipeline researches every unit; verifier full driver ladder), or `adaptive`
  (the Conductor decides per unit and adapts). `adaptive` is the default and
  recommended. Override per-session with `--mode` / `--verify-mode`, or
  persist here. A manually-passed flag always wins over this file.
- **conductor** — the Conductor's identity + behavior. `name` and `emoji`
  are the name pill on every message it sends (default `🥝` `Kiwi`); you pick
  them at `/bgsd-init`, and can change them any time here, via
  `/bgsd-modify-memory` ("rename yourself to Jarvis", "change your emoji to
  🤖"), or by just asking the
  Conductor. The Conductor runs on whatever model you launched the session with
  (bgsd detects and records the model contract but never replaces the session model).
  `narrate` streams stage-aware live updates; `suggest_gate_commands`
  makes it hand you the exact command at every human gate. `self_compact_at` is
  the context fraction (0–1) at which the Conductor — the one human-facing
  session — auto-compacts itself and continues, so a long sesh never runs out of
  room.
- **context** — per-subagent context-window management. `max_window_tokens`
  is the model's full window (Pipeline Agents run on ~1M tokens). When an
  agent's usage crosses `compact_at` (fraction of the window) Kiwi compacts it
  proactively; crossing `relaunch_at` clears and relaunches the agent from its
  handoff manifest, into a fresh small window. Raise the fractions to let agents
  run longer before Kiwi intervenes.

```json bgsd-settings
{
  "version": 2,
  "integration_branch": "next",
  "base_branch": null,
  "git": {
    "sync_integration_from_base": true,
    "integration_to_main": "manual"
  },
  "env": {
    "propagate": true,
    "files": [
      ".env",
      ".env.local",
      ".env.*.local"
    ]
  },
  "github": {
    "issues": true,
    "require_remote": true
  },
  "model_contract": {
    "profile": "claude",
    "routing": "fixed",
    "build": {
      "provider": "claude",
      "model": "claude-opus-4-8",
      "effort": "high"
    },
    "evaluate": {
      "provider": "claude",
      "model": "claude-opus-4-8",
      "effort": "high"
    },
    "adaptive": {
      "heavy": {
        "model": "claude-opus-4-8",
        "effort": "high"
      },
      "light": {
        "model": "sonnet",
        "effort": "high"
      }
    },
    "transport": "direct",
    "auth": "subscription-only"
  },
  "verification": {
    "usage_testing": true,
    "headless": false
  },
  "gui": {
    "auto": true
  },
  "notifications": {
    "os": true
  },
  "remote": {
    "enabled": false,
    "host": "loopback",
    "port": 0
  },
  "modes": {
    "pipeline": "adaptive",
    "verifier": "adaptive"
  },
  "conductor": {
    "name": "Kiwi",
    "emoji": "💪",
    "persona": "kiwi",
    "narrate": true,
    "suggest_gate_commands": true,
    "advisor": "auto",
    "self_compact_at": 0.9
  },
  "context": {
    "max_window_tokens": 1000000,
    "compact_at": 0.7,
    "relaunch_at": 0.9
  }
}
```

## Notes

<!-- Free-form preferences for Kiwi. Examples:
- Never use haiku for verification.
- Always ask before deleting files.
- Prefer terse PR descriptions. -->
