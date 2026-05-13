# Web3D Designer

A lightweight browser-based 3D editor for simple box-based design, with woodworking-friendly presets, direct manipulation, snapping, and browser-local project storage.

## Features

- Box-based scene model for fast rectangular object design plus flat shapes (rectangle, circle) and free-axis cube
- Direct manipulation with move, rotate, and resize tools
- Grid snapping for translation, rotation, and face-handle resizing
- Configurable ground grid (size, origin offset) per project
- Locale-based default units with metric and imperial switching
- Per-project material library with built-in folders for Sheet, Timber, Cladding, and Glass
- Cut-list / material overview grouped by library material
- Object families for sheet goods, structural timber, cladding, and glazing profiles
- STL, glTF, USDZ, and `.web3d` (timestamped) export
- IndexedDB-backed local project autosave and recent-project loading
- Undo/redo for editor actions and transient drag commits
- Lower-corner object origin so new objects start on the floor at `0 / 0 / 0`

## Documentation

- [`docs/requirements.md`](docs/requirements.md) — captured product decisions, schema version log, refactor progress, and planned features (overlap detection, y-up/z-up toggle, inspector polish).
- [`docs/generic-part-concepts.md`](docs/generic-part-concepts.md) — design exploration and current implementation status of the profiles-out-of-code refactor.

## Stack

- Vite
- React + TypeScript
- Three.js via `@react-three/fiber` and `@react-three/drei`
- Zustand
- Vitest

## Getting Started

Install a current Node.js LTS release first. Then run:

```bash
npm install
npm run dev
```

Run the test suite with:

```bash
npm test
```

## GitHub Pages

This repository is configured for GitHub Pages deployment through GitHub Actions and a `gh-pages` branch.

- Pushes to `main` build the app and publish the `dist/` folder to `gh-pages`.
- For this repository, the published site path is `/web3D/`.
- Live site: [https://zehrer.github.io/web3D/](https://zehrer.github.io/web3D/)

(c) Stephan Zehrer
https://de.linkedin.com/in/stephanzehrer

