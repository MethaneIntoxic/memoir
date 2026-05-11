# Story Map Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Memoir draft one cohesive day story from the full ordered photo set.

**Architecture:** Keep the existing server compose API and staged generation pipeline. Expand asset analysis into a compact story-map contract, then make the draft prompt and fallback path consume that story map.

**Tech Stack:** Node.js ESM server, Node test runner, Ollama chat API, llama.cpp OpenAI-compatible chat API.

---

### Task 1: Story Map Tests

**Files:**
- Modify: `tests/server-fallback.test.mjs`

- [x] Add assertions that asset analysis prompts include `dayContext`, `theme`, `storyArc`, `storyRole`, and `captionSeed`.
- [x] Add assertions that draft prompts pass those fields into the drafting input.
- [x] Add fallback assertions that repeated sections share one day-story thread.

### Task 2: Server Story Map Contract

**Files:**
- Modify: `server/server.mjs`

- [x] Normalize optional story-map fields from live model responses.
- [x] Expand fallback asset analysis with a day context, theme, four-part arc, story roles, and caption seeds.
- [x] Expand draft prompt requirements so captions are ordered story beats and bodies move the same story forward.
- [x] Keep grounding guard behavior unchanged.

### Task 3: Runtime Context Options

**Files:**
- Modify: `server/runtime/ollama.mjs`
- Modify: `server/runtime/embedded-llama.mjs`
- Modify: `tests/server-fallback.test.mjs`

- [x] Send `num_ctx` to Ollama using `MEMOIR_MODEL_CONTEXT_SIZE`, defaulting to `8192`.
- [x] Send `n_ctx` to the embedded OpenAI-compatible chat request using the manifest context size.
- [x] Add test coverage through mocked `fetch`.

### Task 4: Verification

**Commands:**
- [x] `npm test`
- [x] `npm --prefix app run test`
- [x] `npm run build`
- [x] `npm run lint`

Expected result: all commands pass.
