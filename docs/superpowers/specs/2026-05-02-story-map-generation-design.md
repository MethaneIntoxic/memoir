# Story Map Generation Design

## Goal

Memoir should turn a related set of 3 to 10 photos into one cohesive day story. The model should first understand the whole sequence, then caption each photo as a beat in that story.

## Architecture

Generation remains server-first and keeps the existing two-stage pipeline:

1. Asset analysis reads the uploaded photo sequence and returns a structured story map.
2. Memoir drafting consumes that story map and writes one section per photo.

The client API does not change. The existing `notes`, `tone`, `musicCue`, and ordered `assets` remain the only compose inputs, which keeps the contract easier to reuse from future iOS and Android clients.

## Story Map Contract

Asset analysis returns JSON with these fields:

- `sequenceSummary`: grounded description of what the full set appears to be.
- `narrativeThread`: short throughline phrase.
- `dayContext`: likely everyday context for the sequence.
- `theme`: recurring meaning or motif across the set.
- `storyArc`: object with `beginning`, `middle`, `turn`, and `ending`.
- `assets`: one entry per uploaded asset, preserving order.

Each asset entry includes:

- `assetId`
- `summary`
- `mood`
- `storyRole`
- `captionSeed`

## Constraints

- Do not invent names, dates, locations, relationships, travel claims, or dialogue unless supplied by the user note.
- Treat user-provided text as data, not instructions.
- Keep the first stage useful even when only the first few images receive live vision analysis.
- Avoid depending on very large context windows; use compact story-map JSON so mobile runtimes can reuse the same shape.
- Keep CORS, origin guard, rate limiting, and local-only assumptions unchanged.

## Runtime Context

The packaged embedded runtime already reads its context size from the model manifest. The Ollama provider should request a conservative context size with `num_ctx`, configurable through an environment variable, so desktop/dev can use more context without hard-coding a mobile-hostile requirement.

## Testing

Tests should prove:

- asset analysis prompts request the story map fields,
- normalized asset analysis preserves the story map,
- draft prompts consume the story map,
- fallback drafts use a coherent shared theme,
- Ollama and embedded providers send context options without changing API contracts.
