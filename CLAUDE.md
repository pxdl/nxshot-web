# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
pnpm dev      # Start development server (http://localhost:5173)
pnpm build    # TypeScript check + production build
pnpm preview  # Preview production build
pnpm lint     # Run ESLint
```

## Architecture

This is a single-page Vite + React application that organizes Nintendo Switch screenshots entirely client-side using the File System Access API.

### Tech Stack

- **Vite** - Build tool and dev server
- **React 19** - UI library
- **TypeScript** - Type safety with strict mode
- **Tailwind CSS v4** - Styling (configured via `@tailwindcss/vite` plugin)
- **JSZip** - ZIP file creation with correct file dates

### Project Structure

```
src/
├── App.tsx              # Main React component (UI and state)
├── main.tsx             # React entry point
├── data/
│   └── gameids.json     # Game ID to name mapping (41,000+ entries)
├── types/
│   └── index.ts         # TypeScript interfaces (Screenshot, GameIds)
├── utils/
│   ├── filesystem.ts    # File system traversal and capture detection
│   ├── screenshot.ts    # Screenshot filename parsing
│   └── zip.ts           # ZIP creation with date preservation
└── styles/
    └── globals.css      # Tailwind CSS import
```

### Core Flow

1. User selects `Nintendo/Album` folder from their SD card
2. `collectSwitchCaptures()` recursively scans for 53-character `.jpg`/`.mp4` files
3. `parseScreenshotFilename()` extracts timestamp and game ID from filename
4. Game name is looked up in `gameids.json`
5. User chooses:
   - **Download as ZIP** (recommended): Creates ZIP with correct file dates preserved
   - **Organize in place**: Copies to `Organized/{GameName}/` (dates not preserved)

### Nintendo Switch Filename Format

```
YYYYMMDDHHMMSS???GAMEID????????????.jpg
│─────────────│  │──────────────────│
0-14: timestamp  17-49: 32-char game ID
```

### Browser Requirement

Requires File System Access API support (Chrome, Edge, Opera).
