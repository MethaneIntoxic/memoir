# Memoir App

This app is a mobile-first React client for the memoir prototype.

## Current Vertical Slice

- archive view,
- create flow with photo selection,
- tone, note, and music inputs,
- local AI draft request to `/api/generate`,
- inline memoir editing,
- save to archive,
- HTML download,
- print-to-PDF path.

## Local Development

Start the browser prototype from the repo root:

- repo root: `npm run dev:app`

That command starts the local API server when one is not already healthy, then starts Vite. By default the app uses `/api`, which the Vite dev proxy forwards to `http://localhost:8787`.

For split-terminal debugging, use `npm run dev:server` from the repo root and `npm run dev:vite` from the repo root, or `npm run dev` from this app folder.
