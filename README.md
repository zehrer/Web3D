# Web3D Designer

A lightweight browser-based 3D editor for simple box-based design, with woodworking-friendly presets, direct manipulation, snapping, and browser-local project storage.

## Features

- Box-only scene model for fast rectangular object design
- Direct manipulation with move, rotate, and resize tools
- Grid snapping for translation, rotation, and face-handle resizing
- Locale-based default units with metric and imperial switching
- Object families for sheet goods and structural timber profiles
- IndexedDB-backed local project autosave and recent-project loading
- Undo/redo for editor actions and transient drag commits
- Lower-corner object origin so new objects start on the floor at `0 / 0 / 0`

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

## Next Release

- STL export for sharing and fabrication workflows
