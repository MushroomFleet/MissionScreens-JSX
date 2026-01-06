# MissionScreens Integration Guide

This document provides comprehensive instructions for integrating the `StarfoxMenuSystem.jsx` component into an existing Three.js game application. The guide covers assessment, adaptation, and integration phases.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Phase 1: Target Application Assessment](#phase-1-target-application-assessment)
3. [Phase 2: Component Adaptation](#phase-2-component-adaptation)
4. [Phase 3: Integration Steps](#phase-3-integration-steps)
5. [Phase 4: Level Connection](#phase-4-level-connection)
6. [Phase 5: Data Persistence](#phase-5-data-persistence)
7. [Phase 6: Testing & Validation](#phase-6-testing--validation)
8. [API Reference](#api-reference)
9. [Customization Guide](#customization-guide)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before beginning integration, ensure you have:

- [ ] React 18+ with hooks support
- [ ] A working Three.js game application
- [ ] IndexedDB support in target browsers
- [ ] Understanding of your game's level loading system
- [ ] Font resources (Orbitron, Rajdhani) or alternatives

---

## Phase 1: Target Application Assessment

### Step 1.1: Document Existing Architecture

Create a checklist of your current application structure:

```markdown
## Architecture Assessment Checklist

### Rendering System
- [ ] What renderer is used? (WebGLRenderer, etc.)
- [ ] How are scenes managed? (single scene, scene manager)
- [ ] What is the render loop structure?
- [ ] How is the canvas/DOM structured?

### State Management
- [ ] Is Redux/MobX/Zustand used?
- [ ] How is game state currently stored?
- [ ] What events trigger state changes?
- [ ] Is there existing save/load functionality?

### Level System
- [ ] How are levels defined? (JSON, classes, modules)
- [ ] What is the level loading process?
- [ ] How is level completion detected?
- [ ] What data is passed between levels?

### UI Layer
- [ ] Is there an existing UI framework?
- [ ] How do UI overlays interact with the canvas?
- [ ] Are there existing menu systems?
- [ ] What styling approach is used? (CSS-in-JS, modules, etc.)
```

### Step 1.2: Identify Integration Points

Map out where the menu system will connect:

```javascript
// Document these functions in your codebase:

// 1. Game initialization point
// Where: src/Game.js or similar
// Function: init(), start(), or constructor

// 2. Level loading mechanism
// Where: src/LevelManager.js or similar  
// Function: loadLevel(levelId), switchLevel(), etc.

// 3. Level completion callback
// Where: src/Level.js or game loop
// Event: onComplete, onWin, onLose

// 4. Score/stats collection
// Where: src/ScoreManager.js or similar
// Data: { score, hits, accuracy, time, etc. }

// 5. Pause/resume controls
// Where: src/Game.js
// Functions: pause(), resume(), isPaused
```

### Step 1.3: Create Interface Contracts

Define the data contracts between systems:

```typescript
// Types for integration (create types.ts or similar)

interface LevelStartData {
  levelId: string;
  wingmen: string[];
  options: GameOptions;
  completedLevels: string[];
}

interface LevelResults {
  completed: boolean;
  score: number;
  hits: number;
  accuracy: number;
  time: string;
  rank: string;
  wingmenStatus: WingmanStatus[];
  bonuses: string[];
}

interface WingmanStatus {
  id: string;
  name: string;
  portrait: string;
  alive: boolean;
}

interface GameOptions {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  voiceVolume: number;
  showFPS: boolean;
  screenShake: boolean;
  subtitles: boolean;
  difficulty: 'normal' | 'hard' | 'expert';
}
```

---

## Phase 2: Component Adaptation

### Step 2.1: Copy Component Files

```bash
# Copy the menu system to your project
cp StarfoxMenuSystem.jsx src/components/menu/

# Create supporting directories
mkdir -p src/components/menu/screens
mkdir -p src/components/menu/styles
mkdir -p src/components/menu/data
```

### Step 2.2: Adapt Campaign Data

Modify `CAMPAIGN_DATA` to match your game's levels:

```javascript
// src/components/menu/data/campaignData.js

export const CAMPAIGN_DATA = {
  levels: {
    // Adapt to your game's levels
    'level-1': {
      id: 'level-1',
      name: 'YOUR_LEVEL_NAME',
      subtitle: 'Your Subtitle',
      description: 'Your level description...',
      difficulty: 1,
      nextChoices: ['level-2a', 'level-2b'],
      environment: 'your-environment',
      
      // Add custom properties your game needs:
      assetBundle: 'levels/level1',
      musicTrack: 'level1_theme',
      prerequisites: [],
    },
    // ... more levels
  },
  
  // Update map positions for your campaign structure
  mapPositions: {
    'level-1': { x: 10, y: 50 },
    // ... your positions
  },
  
  // Update connections
  connections: [
    { from: 'level-1', to: 'level-2a' },
    // ... your connections
  ],
};
```

### Step 2.3: Adapt Wingmen/Characters

Modify `WINGMEN_DATA` for your game's characters:

```javascript
// src/components/menu/data/wingmenData.js

export const WINGMEN_DATA = [
  {
    id: 'character-1',
    name: 'YOUR CHARACTER NAME',
    callsign: 'CALLSIGN',
    specialty: 'Character specialty',
    description: 'Character description...',
    stats: { attack: 4, defense: 3, support: 3 },
    
    // Your custom portrait system:
    portrait: '🎮', // Or use image path
    portraitImage: '/assets/characters/char1.png',
    
    // Add abilities or other game-specific data:
    abilities: ['ability1', 'ability2'],
    unlockRequirement: null,
  },
  // ... more characters
];
```

### Step 2.4: Adapt Styling

Update styles for your game's visual identity:

```javascript
// src/components/menu/styles/menuStyles.js

export const styles = {
  container: {
    // Adapt colors to your game
    background: 'linear-gradient(180deg, #YOUR_COLOR 0%, #YOUR_COLOR 100%)',
    fontFamily: '"YourFont", sans-serif',
  },
  
  title: {
    // Your title styling
    background: 'linear-gradient(180deg, #YOUR_PRIMARY 0%, #YOUR_SECONDARY 100%)',
  },
  
  // ... adapt other styles
};
```

### Step 2.5: Update New Game+ Features

Customize NG+ unlocks for your game:

```javascript
// src/components/menu/data/ngPlusData.js

export const NEW_GAME_PLUS_UNLOCKS = {
  1: { 
    name: 'Your First Unlock', 
    description: 'Description...',
    effect: 'DOUBLE_DAMAGE', // For game logic
  },
  // ... more unlocks
};
```

---

## Phase 3: Integration Steps

### Step 3.1: Create Root Integration Component

```jsx
// src/App.jsx or src/Game.jsx

import React, { useState, useCallback, useRef } from 'react';
import StarfoxMenuSystem from './components/menu/StarfoxMenuSystem';
import YourThreeJSGame from './game/YourThreeJSGame';

function App() {
  const [levelInProgress, setLevelInProgress] = useState(false);
  const [levelResults, setLevelResults] = useState(null);
  const gameRef = useRef(null);
  
  // Handler called when menu requests level start
  const handleStartLevel = useCallback((levelId, gameState) => {
    console.log('Starting level:', levelId, gameState);
    
    // Store game state for the level
    window.__currentGameState = gameState;
    
    // Start the Three.js level
    setLevelInProgress(true);
    setLevelResults(null);
    
    // Initialize your Three.js game with level data
    if (gameRef.current) {
      gameRef.current.loadLevel(levelId, {
        wingmen: gameState.wingmen,
        options: gameState.options,
        onComplete: handleLevelComplete,
      });
    }
  }, []);
  
  // Handler called when Three.js level completes
  const handleLevelComplete = useCallback((results) => {
    console.log('Level complete:', results);
    
    // Stop the level
    setLevelInProgress(false);
    
    // Pass results to menu system
    setLevelResults(results);
  }, []);
  
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Three.js Game Layer */}
      <YourThreeJSGame
        ref={gameRef}
        visible={levelInProgress}
        onComplete={handleLevelComplete}
      />
      
      {/* Menu System Layer */}
      <StarfoxMenuSystem
        onStartLevel={handleStartLevel}
        externalLevelResults={levelResults}
        levelInProgress={levelInProgress}
      />
    </div>
  );
}

export default App;
```

### Step 3.2: Create Game Bridge Component

```jsx
// src/game/YourThreeJSGame.jsx

import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
// Import your existing game modules

const YourThreeJSGame = forwardRef(({ visible, onComplete }, ref) => {
  const containerRef = useRef(null);
  const gameInstanceRef = useRef(null);
  
  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    loadLevel: (levelId, config) => {
      if (gameInstanceRef.current) {
        gameInstanceRef.current.loadLevel(levelId, config);
      }
    },
    pause: () => {
      if (gameInstanceRef.current) {
        gameInstanceRef.current.pause();
      }
    },
    resume: () => {
      if (gameInstanceRef.current) {
        gameInstanceRef.current.resume();
      }
    },
  }));
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Initialize your Three.js game
    // This is where your existing game initialization code goes
    
    /*
    gameInstanceRef.current = new YourGame({
      container: containerRef.current,
      onLevelComplete: (results) => {
        // Transform your game's results to the expected format
        const formattedResults = {
          completed: results.victory,
          score: results.score,
          hits: results.enemiesDestroyed,
          accuracy: Math.round((results.hits / results.shots) * 100),
          time: formatTime(results.timeElapsed),
          rank: calculateRank(results),
          wingmenStatus: results.wingmen.map(w => ({
            id: w.id,
            name: w.name,
            portrait: w.portrait,
            alive: w.health > 0,
          })),
          bonuses: results.achievements || [],
        };
        
        onComplete(formattedResults);
      },
    });
    */
    
    return () => {
      if (gameInstanceRef.current) {
        gameInstanceRef.current.dispose();
      }
    };
  }, [onComplete]);
  
  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        display: visible ? 'block' : 'none',
      }}
    />
  );
});

export default YourThreeJSGame;
```

### Step 3.3: Update Index/Entry Point

```jsx
// src/index.jsx

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Add required fonts
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Rajdhani:wght@300;400;500;600;700&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

// Global styles
const style = document.createElement('style');
style.textContent = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { width: 100%; height: 100%; overflow: hidden; }
`;
document.head.appendChild(style);

const root = createRoot(document.getElementById('root'));
root.render(<App />);
```

---

## Phase 4: Level Connection

### Step 4.1: Create Level Loader Adapter

```javascript
// src/game/adapters/LevelLoaderAdapter.js

import { CAMPAIGN_DATA } from '../components/menu/data/campaignData';

export class LevelLoaderAdapter {
  constructor(threeJSLevelLoader) {
    this.loader = threeJSLevelLoader;
    this.currentLevel = null;
    this.onCompleteCallback = null;
  }
  
  async loadLevel(levelId, config) {
    const levelData = CAMPAIGN_DATA.levels[levelId];
    
    if (!levelData) {
      throw new Error(`Level not found: ${levelId}`);
    }
    
    this.currentLevel = levelId;
    this.onCompleteCallback = config.onComplete;
    
    // Adapt to your existing level loading system
    await this.loader.load({
      id: levelId,
      assetBundle: levelData.assetBundle,
      music: levelData.musicTrack,
      environment: levelData.environment,
      
      // Pass wingmen configuration
      teammates: config.wingmen,
      
      // Pass options
      difficulty: config.options.difficulty,
      sfxVolume: config.options.sfxVolume,
      musicVolume: config.options.musicVolume,
    });
  }
  
  completeLevel(results) {
    if (this.onCompleteCallback) {
      this.onCompleteCallback(results);
    }
  }
}
```

### Step 4.2: Create Results Formatter

```javascript
// src/game/adapters/ResultsFormatter.js

export class ResultsFormatter {
  static format(rawGameResults, wingmenData) {
    return {
      completed: rawGameResults.victory === true,
      score: rawGameResults.score || 0,
      hits: rawGameResults.enemiesDestroyed || 0,
      accuracy: this.calculateAccuracy(rawGameResults),
      time: this.formatTime(rawGameResults.timeElapsed),
      rank: this.calculateRank(rawGameResults),
      wingmenStatus: this.formatWingmenStatus(rawGameResults, wingmenData),
      bonuses: this.collectBonuses(rawGameResults),
    };
  }
  
  static calculateAccuracy(results) {
    if (!results.shotsFired || results.shotsFired === 0) return 0;
    return Math.round((results.shotsHit / results.shotsFired) * 100);
  }
  
  static formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }
  
  static calculateRank(results) {
    const score = results.score || 0;
    const accuracy = this.calculateAccuracy(results);
    
    // Customize rank calculation for your game
    if (score >= 20000 && accuracy >= 90) return 'S';
    if (score >= 15000 && accuracy >= 80) return 'A';
    if (score >= 10000 && accuracy >= 70) return 'B';
    if (score >= 5000 && accuracy >= 50) return 'C';
    return 'D';
  }
  
  static formatWingmenStatus(results, wingmenData) {
    return (results.wingmenState || []).map(ws => {
      const wingmanInfo = wingmenData.find(w => w.id === ws.id) || {};
      return {
        id: ws.id,
        name: wingmanInfo.name || ws.id,
        portrait: wingmanInfo.portrait || '👤',
        alive: ws.health > 0,
      };
    });
  }
  
  static collectBonuses(results) {
    const bonuses = [];
    
    if (results.noHitsTaken) bonuses.push('Untouchable');
    if (results.allEnemiesDestroyed) bonuses.push('Perfect Clear');
    if (results.secretFound) bonuses.push('Explorer');
    if (results.speedBonus) bonuses.push('Speed Demon');
    
    return bonuses;
  }
}
```

---

## Phase 5: Data Persistence

### Step 5.1: Database Schema Extension

If you need to extend the IndexedDB schema:

```javascript
// src/services/GameDatabase.js

const DB_NAME = 'YourGameDB';
const DB_VERSION = 2; // Increment for schema changes

export const openDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Core game progress store (from menu system)
      if (!db.objectStoreNames.contains('gameProgress')) {
        db.createObjectStore('gameProgress', { keyPath: 'id' });
      }
      
      // Additional stores for your game
      if (!db.objectStoreNames.contains('levelStats')) {
        const store = db.createObjectStore('levelStats', { keyPath: 'levelId' });
        store.createIndex('byScore', 'highScore');
      }
      
      if (!db.objectStoreNames.contains('achievements')) {
        db.createObjectStore('achievements', { keyPath: 'id' });
      }
    };
  });
};
```

### Step 5.2: Extended Save System

```javascript
// src/services/SaveManager.js

import { openDatabase, saveGameProgress, loadGameProgress } from './GameDatabase';

export class SaveManager {
  static async saveFullState(menuState, gameStats) {
    const db = await openDatabase();
    
    // Save menu system state
    await saveGameProgress(menuState);
    
    // Save additional game stats
    const transaction = db.transaction(['levelStats'], 'readwrite');
    const store = transaction.objectStore('levelStats');
    
    for (const [levelId, stats] of Object.entries(gameStats)) {
      await new Promise((resolve, reject) => {
        const request = store.put({ levelId, ...stats });
        request.onsuccess = resolve;
        request.onerror = reject;
      });
    }
  }
  
  static async loadFullState() {
    const menuState = await loadGameProgress();
    
    const db = await openDatabase();
    const transaction = db.transaction(['levelStats'], 'readonly');
    const store = transaction.objectStore('levelStats');
    
    const gameStats = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const stats = {};
        request.result.forEach(s => { stats[s.levelId] = s; });
        resolve(stats);
      };
      request.onerror = reject;
    });
    
    return { menuState, gameStats };
  }
}
```

---

## Phase 6: Testing & Validation

### Step 6.1: Unit Test Template

```javascript
// src/components/menu/__tests__/StarfoxMenuSystem.test.jsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StarfoxMenuSystem from '../StarfoxMenuSystem';

describe('StarfoxMenuSystem', () => {
  beforeEach(() => {
    // Mock IndexedDB
    indexedDB.deleteDatabase('StarfoxGameDB');
  });
  
  test('renders main menu on load', async () => {
    render(<StarfoxMenuSystem />);
    
    await waitFor(() => {
      expect(screen.getByText(/new game/i)).toBeInTheDocument();
    });
  });
  
  test('navigates to wingman selection on new game', async () => {
    render(<StarfoxMenuSystem />);
    
    await waitFor(() => {
      fireEvent.click(screen.getByText(/new game/i));
    });
    
    expect(screen.getByText(/select your wingmen/i)).toBeInTheDocument();
  });
  
  test('calls onStartLevel with correct data', async () => {
    const onStartLevel = jest.fn();
    render(<StarfoxMenuSystem onStartLevel={onStartLevel} />);
    
    // Navigate through to mission start
    // ... (test navigation flow)
    
    expect(onStartLevel).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        wingmen: expect.any(Array),
        options: expect.any(Object),
      })
    );
  });
});
```

### Step 6.2: Integration Test Checklist

```markdown
## Integration Test Checklist

### Menu Flow Tests
- [ ] Main menu displays correctly
- [ ] New Game starts wingman selection
- [ ] Continue loads saved progress
- [ ] Options persist across sessions
- [ ] Back navigation works correctly

### Wingman Selection Tests
- [ ] Can select exactly 2 wingmen
- [ ] Selection is highlighted
- [ ] Confirm button enables with 2 selected
- [ ] Selection persists to mission screen

### Mission Screen Tests
- [ ] Displays correct level data
- [ ] Shows selected wingmen
- [ ] Launch Mission triggers callback
- [ ] Back returns to correct screen

### Results Screen Tests
- [ ] Shows victory state correctly
- [ ] Shows defeat state correctly
- [ ] All stats display properly
- [ ] Continue advances progress
- [ ] Retry returns to mission

### Campaign Map Tests
- [ ] Completed levels marked correctly
- [ ] Available paths highlighted
- [ ] Locked levels not clickable
- [ ] Selection navigates to mission

### Persistence Tests
- [ ] Progress saves automatically
- [ ] Refresh preserves progress
- [ ] Continue loads all state
- [ ] NG+ counter increments

### Performance Tests
- [ ] Menu renders in < 100ms
- [ ] Transitions are smooth (60fps)
- [ ] No memory leaks on navigation
- [ ] IndexedDB operations < 50ms
```

### Step 6.3: Manual Testing Protocol

```markdown
## Manual Testing Protocol

### Test Run 1: Fresh Start
1. Clear browser data for the application
2. Load application
3. Click "New Game"
4. Select 2 wingmen
5. Verify mission screen shows correct data
6. Click "Launch Mission"
7. Verify onStartLevel callback received

### Test Run 2: Full Campaign
1. Complete Test Run 1
2. Simulate level completion with success
3. Verify results screen shows correct data
4. Click "Continue"
5. Verify campaign map shows progress
6. Select next level
7. Repeat until game complete
8. Verify game complete screen

### Test Run 3: Save/Load
1. Start new game
2. Progress to level 2
3. Refresh browser
4. Click "Continue"
5. Verify progress restored
6. Complete game
7. Verify NG+ unlocked

### Test Run 4: Edge Cases
1. Try to continue with no save
2. Try to select 3+ wingmen
3. Navigate back from all screens
4. Change options and verify persistence
5. Test all difficulty levels
```

---

## API Reference

### StarfoxMenuSystem Props

| Prop | Type | Description |
|------|------|-------------|
| `onStartLevel` | `(levelId: string, gameState: GameState) => void` | Called when player launches a mission |
| `externalLevelResults` | `LevelResults \| null` | Results from completed level |
| `levelInProgress` | `boolean` | True while level is being played |

### GameState Object

```typescript
interface GameState {
  wingmen: string[];           // Selected wingman IDs
  options: GameOptions;        // Current game options
  completedLevels: string[];   // IDs of completed levels
}
```

### LevelResults Object

```typescript
interface LevelResults {
  completed: boolean;          // True if level was won
  score: number;               // Points earned
  hits: number;                // Enemies destroyed
  accuracy: number;            // Hit percentage (0-100)
  time: string;                // Formatted time (M:SS)
  rank: string;                // Performance rank (S/A/B/C/D)
  wingmenStatus: WingmanStatus[];
  bonuses: string[];           // Achievement bonuses earned
}
```

### Exported Utilities

```javascript
import {
  CAMPAIGN_DATA,      // Level definitions and map structure
  WINGMEN_DATA,       // Character definitions
  NEW_GAME_PLUS_UNLOCKS,
  saveGameProgress,   // Save to IndexedDB
  loadGameProgress,   // Load from IndexedDB
  clearGameProgress,  // Reset all progress
} from './StarfoxMenuSystem';
```

---

## Customization Guide

### Adding New Screens

```jsx
// 1. Create the screen component
const NewScreen = ({ data, onAction }) => (
  <div style={styles.screenContent}>
    {/* Screen content */}
  </div>
);

// 2. Add to screen state
const [screen, setScreen] = useState('loading');

// 3. Add to renderScreen switch
case 'newScreen':
  return <NewScreen data={...} onAction={...} />;

// 4. Add navigation handlers
const handleGoToNewScreen = () => setScreen('newScreen');
```

### Modifying the Campaign Structure

```javascript
// For non-branching linear campaign:
const CAMPAIGN_DATA = {
  levels: {
    '1': { nextChoices: ['2'] },
    '2': { nextChoices: ['3'] },
    '3': { nextChoices: ['4'], isFinal: true },
  },
  // ...
};

// For complex branching:
const CAMPAIGN_DATA = {
  levels: {
    '1': { nextChoices: ['2a', '2b', '2c'] },
    '2a': { nextChoices: ['3a'] },
    '2b': { nextChoices: ['3a', '3b'] },
    '2c': { nextChoices: ['3b'] },
    // ...
  },
  // ...
};
```

### Custom Styling Themes

```javascript
// Create theme variants
const themes = {
  starfox: { /* original styles */ },
  
  cyberpunk: {
    primary: '#ff00ff',
    secondary: '#00ffff',
    background: '#1a0a2e',
  },
  
  military: {
    primary: '#4a5c3e',
    secondary: '#c9b896',
    background: '#1a1a1a',
  },
};

// Apply theme
const getThemedStyles = (theme) => ({
  ...styles,
  title: {
    ...styles.title,
    background: `linear-gradient(180deg, ${theme.primary}, ${theme.secondary})`,
  },
});
```

---

## Troubleshooting

### Common Issues

#### Menu doesn't appear after level ends
```javascript
// Ensure levelInProgress is set to false
setLevelInProgress(false);

// Ensure results are set
setLevelResults(formattedResults);
```

#### Save data not persisting
```javascript
// Check IndexedDB permissions
// Check for quota exceeded errors
try {
  await saveGameProgress(progress);
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    // Handle storage quota
  }
}
```

#### Styles not applying correctly
```javascript
// Ensure fonts are loaded
// Check for CSS conflicts
// Verify z-index layering
```

#### Level results not showing
```javascript
// Verify results object format
console.log('Results:', externalLevelResults);

// Check for required fields
const isValid = results && 
  typeof results.completed === 'boolean' &&
  typeof results.score === 'number';
```

### Debug Mode

```javascript
// Enable debug logging
const DEBUG = process.env.NODE_ENV === 'development';

const log = (...args) => {
  if (DEBUG) console.log('[MenuSystem]', ...args);
};

// Use throughout component
log('Screen changed to:', screen);
log('Level starting:', levelId, gameState);
```

---

## Support

For additional support or bug reports, please refer to:

- Component source: `StarfoxMenuSystem.jsx`
- Demo file: `demo.html`
- This integration guide

---

*Document Version: 1.0.0*
*Last Updated: January 2025*
