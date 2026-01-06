# 🚀 MissionScreens-JSX

A **Star Fox 64-inspired** menu orchestration system for Three.js games. Complete React component providing retro-futuristic UI screens, branching campaign progression, and automatic save/load via IndexedDB.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18+-61DAFB.svg)
![Three.js](https://img.shields.io/badge/Three.js-Compatible-black.svg)

---

## ✨ Features

- **Complete Menu System** — Main menu, options, wingman selection, mission briefing, results, campaign map, and game complete screens
- **Branching Campaign** — Node-based level selection with multiple paths: `(1) → (2a/2b) → (3) → (4a/4b) → (5)`
- **New Game+ System** — 5 progressive unlocks rewarding replayability
- **Retro N64 Aesthetic** — Scanlines, CRT glow, animated starfield, bold sci-fi typography
- **IndexedDB Persistence** — Automatic save/load of game progress
- **Fully Customizable** — Adapt campaign structure, wingmen, styling, and screens to your game

---

## 🎮 Quick Preview

Open **`demo.html`** directly in your browser to experience the complete UI flow without any build step or gameplay implementation.

The demo includes a **Demo Controls** panel (bottom-right) allowing you to:
- ✓ Simulate mission completion with mock stats
- ✗ Simulate mission failure
- 🗺️ View the campaign branch selection map
- 🏆 Skip to game complete screen
- 🔄 Reset all progress

> **No dependencies required** — just open the HTML file and explore!

---

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/MushroomFleet/MissionScreens-JSX.git

# Copy the component to your project
cp StarfoxMenuSystem.jsx /your-project/src/components/
```

### Dependencies

The component requires React 18+ and uses Google Fonts (Orbitron, Rajdhani) for typography.

```jsx
// Import in your React application
import StarfoxMenuSystem from './components/StarfoxMenuSystem';
```

---

## 🔧 Basic Usage

```jsx
import React, { useState } from 'react';
import StarfoxMenuSystem from './StarfoxMenuSystem';

function App() {
  const [levelInProgress, setLevelInProgress] = useState(false);
  const [levelResults, setLevelResults] = useState(null);

  const handleStartLevel = (levelId, gameState) => {
    setLevelInProgress(true);
    // Load your Three.js level here
    loadLevel(levelId, gameState);
  };

  return (
    <>
      <StarfoxMenuSystem
        onStartLevel={handleStartLevel}
        externalLevelResults={levelResults}
        levelInProgress={levelInProgress}
      />
      {/* Your Three.js canvas renders here when levelInProgress is true */}
    </>
  );
}
```

---

## 📁 Project Structure

```
MissionScreens-JSX/
├── StarfoxMenuSystem.jsx      # Main React component
├── demo.html                  # Standalone demo (no build required)
├── MissionScreens-integration.md  # Comprehensive integration guide
└── README.md
```

---

## 🗺️ Campaign Flow

```
┌─────────┐
│ Level 1 │  CORNERIA
└────┬────┘
     │
  ┌──┴──┐
  ▼     ▼
┌───┐ ┌───┐
│2A │ │2B │  METEO / SECTOR Y
└─┬─┘ └─┬─┘
  │     │
  └──┬──┘
     ▼
┌─────────┐
│ Level 3 │  FICHINA
└────┬────┘
     │
  ┌──┴──┐
  ▼     ▼
┌───┐ ┌───┐
│4A │ │4B │  SOLAR / ZONESS
└─┬─┘ └─┬─┘
  │     │
  └──┬──┘
     ▼
┌─────────┐
│ Level 5 │  VENOM (Final)
└─────────┘
```

---

## 🎨 Screens Overview

| Screen | Description |
|--------|-------------|
| **Main Menu** | New Game, Continue, Options |
| **Options** | Audio levels, display settings, difficulty |
| **Wingman Choice** | Select 2 squadron members with unique stats |
| **Mission Briefing** | Level info, objectives, squad display |
| **Results** | Score, hits, accuracy, time, rank (S/A/B/C/D), bonuses |
| **Campaign Map** | Visual node-based path selection |
| **Game Complete** | Final stats, path taken, New Game+ unlocks |

---

## 📖 Integration Guide

For comprehensive integration instructions, see **[MissionScreens-integration.md](./MissionScreens-integration.md)**.

The guide covers:
1. **Target Assessment** — Architecture checklist and interface contracts
2. **Component Adaptation** — Customizing campaign data, wingmen, and styling
3. **Integration Steps** — Connecting to your game's root component
4. **Level Connection** — Bridging the menu system to your Three.js levels
5. **Data Persistence** — IndexedDB schema and save management
6. **Testing Protocol** — Unit tests, integration checklist, manual testing

---

## ⚙️ Customization

### Campaign Data
```jsx
const CAMPAIGN_DATA = {
  '1': {
    id: '1',
    name: 'YOUR LEVEL NAME',
    subtitle: 'Level Subtitle',
    description: 'Mission objectives...',
    difficulty: 1,
    nextChoices: ['2a', '2b'],
    mapPosition: { x: 10, y: 50 },
  },
  // ... more levels
};
```

### Wingmen
```jsx
const WINGMEN_DATA = {
  pilot1: {
    id: 'pilot1',
    name: 'Pilot Name',
    portrait: '🎯',
    stats: { attack: 8, defense: 5, support: 3 },
    description: 'Character background...',
  },
  // ... more wingmen
};
```

### Styling
The component uses a centralized `styles` object for easy theming. Modify colors, fonts, and effects to match your game's visual identity.

---

## 🎯 Props Reference

| Prop | Type | Description |
|------|------|-------------|
| `onStartLevel` | `(levelId, gameState) => void` | Called when player launches a mission |
| `externalLevelResults` | `LevelResults \| null` | Set when level completes to show results |
| `levelInProgress` | `boolean` | Hides menu system during gameplay |

### LevelResults Schema
```typescript
{
  completed: boolean;
  score: number;
  hits: number;
  accuracy: number;
  time: string;
  rank: 'S' | 'A' | 'B' | 'C' | 'D';
  wingmenStatus: { name: string; alive: boolean; portrait: string }[];
  bonuses: string[];
}
```

---

## 🆕 New Game+ Unlocks

| Run | Unlock |
|-----|--------|
| 1 | Expert Difficulty |
| 2 | Bonus Wingman |
| 3 | All Paths Unlocked |
| 4 | Score Multiplier (1.5x) |
| 5 | Boss Rush Mode |

---

## 📄 License

MIT License — feel free to use in personal and commercial projects.

---

## 📚 Citation

### Academic Citation

If you use this codebase in your research or project, please cite:

```bibtex
@software{missionscreens_jsx,
  title = {MissionScreens-JSX: Star Fox 64-Inspired Menu Orchestration for Three.js Games},
  author = {Drift Johnson},
  year = {2025},
  url = {https://github.com/MushroomFleet/MissionScreens-JSX},
  version = {1.0.0}
}
```

### Donate

[![Ko-Fi](https://cdn.ko-fi.com/cdn/kofi3.png?v=3)](https://ko-fi.com/driftjohnson)
