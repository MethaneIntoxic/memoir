# Security and Privacy: Current Prototype

## Honest Privacy Statement

Memoir currently keeps its work inside a browser client and a local HTTP server that you run yourself. The repo does not contain a hosted memoir backend, account system, or cloud sync path.

That is the limit of the current privacy story. The prototype does not implement encrypted storage, secure deletion, or release-grade device protection.

## Current Data Boundary

### What the browser does

- imports photos,
- resizes and re-encodes them into JPEG working copies,
- stores saved memoirs in browser IndexedDB,
- and renders exports directly in the browser.

### What the local server does

- receives the browser working copies and text inputs,
- calls Ollama when available,
- or returns fallback text when Ollama is unavailable.

### What is not part of the current code path

- remote upload service,
- encrypted database,
- secure key store,
- hardened media vault,
- or managed backup pipeline.

## What Is Stored Today

Saved memoirs include:

- title,
- summary,
- quote,
- sections,
- note and music cue text,
- image data URLs,
- timestamps,
- and lightweight diagnostics.

They are stored in browser IndexedDB for the current site origin.

## Import and Metadata Reality

The browser draws imported images onto a canvas and re-encodes them as resized JPEGs before sending them to the local server. In practice, that strips most embedded source metadata.

This is still a prototype implementation, not a formal metadata-handling guarantee. The repo does not currently include:

- metadata verification tests,
- a secure asset pipeline,
- or a documented forensic deletion policy.

## Network Boundary Warning

The Local AI URL is user-configurable. If it points at another machine, the browser sends image data and text to that server over plain HTTP unless the operator adds their own transport security.

The honest default support path is same-machine local development.

## Export Boundary

HTML downloads and printed PDFs leave the browser-local boundary. Once exported, those files are user-managed artifacts and no longer covered by the prototype's limited local-only story.

## What This Prototype Does Not Promise

- No encryption at rest.
- No secure deletion or wipe semantics.
- No OS-backed key management.
- No voice note privacy flow.
- No protection against a compromised device or shared browser profile.
- No guarantee that clearing the archive removes every browser cache artifact or downloaded file.

## Current User-Control Surface

The only built-in local data control in the current UI is clearing the archive stored for the site. That removes the saved archive record from IndexedDB and any legacy archive keys from `localStorage`; it is not a comprehensive secure erase feature.

## Minimum Safe Framing

When describing the prototype, use wording like this:

- photos are processed in the browser and sent only to the configured local server,
- saved memoirs stay in browser storage for this prototype,
- exports are explicit user actions,
- and stronger privacy guarantees are not implemented yet.