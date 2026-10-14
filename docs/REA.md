# REA environment inspection

REA 6.5.0 and rea-agents are installed at /Users/antunzebec/.npm-global/bin. Node v26.7.0, npm 11.19.0 and Git 2.54.0 were verified. `rea mcp doctor --json` passed: 207 tools, six prompts, matching server identity and a successful binary_session request. `codex mcp list` has no REA entry and this session exposes no REA MCP tools.

## Connect Codex

Verified from installed CLI help, not executed because it changes global configuration:

```sh
rtk proxy codex mcp add rea -- /Users/antunzebec/.npm-global/bin/rea --mcp
rtk proxy codex mcp list
```

Restart Codex after registration to load the tools. For diagnostics:

```sh
rtk proxy rea mcp doctor --json
rtk proxy rea doctor
rtk proxy rea capabilities
rtk proxy rea providers
```

General doctor reports missing agent registration and REA skill, and unavailable Hopper/Ghidra/IDA/jadx analysis engines. Native decompilation requires a separately configured engine. MCP connectivity and native decompiler readiness are different checks.

## Relevant capabilities and limits

REA offers artifact inventory, Mach-O metadata, signatures, architectures, plist parsing, compiled Interface Builder and asset catalog inspection, Swift demangling, static JavaScript analysis, browser observation and screenshot/scenario capture. It can inspect our own web build or a legitimately supplied software artifact within its available provider capabilities.

An App Store URL does not supply a binary. No authorized local DartCounter package or recording was supplied. Metadata inspection cannot reveal server logic or recover original source, and encrypted iOS code cannot be analyzed as plaintext. No DRM bypass, decrypted binary extraction, third-party instrumentation or private API access was attempted.

Public site research used official pages. The installed REA CLI was used for setup diagnostics only. Future UI analysis can use recordings or screenshots the user is authorized to supply. Development does not depend on connecting REA.

Toolkit reference: https://github.com/morluto/rea

## Claude Code handoff setup: 2026-10-14

At the user's request, ran the installed 6.5.0 setup for Claude Code only after reviewing its dry run:

```sh
rtk proxy rea setup --client claude_code --yes
```

Setup reported `status: ready` and a healthy scoped doctor. It added server `rea` to `~/.claude.json`, using `/Users/antunzebec/.npm-global/bin/rea mcp`, and installed `~/.claude/skills/reverse-engineer-anything`. The inspected plan preserved unrelated configuration and specified a config backup at `~/.claude.json.rea.backup`. Restart Claude Code to load the MCP registration and skill. This does not add REA tools to the already-running Codex session.

Impeccable is already present at `~/.claude/skills/impeccable`. For the next review, start with its critique workflow for design/UX, then audit for accessibility, responsive behavior and technical findings. Read the installed skill before invoking commands; do not assume slash aliases are registered. REA can inspect this owned web app and its build; native decompiler providers are optional and were not installed.
