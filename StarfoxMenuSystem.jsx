/**
 * StarfoxMenuSystem.jsx
 * 
 * A comprehensive menu and level orchestration system inspired by Star Fox 64.
 * Handles main menu, options, wingman selection, mission briefings, results screens,
 * and branching campaign progression with IndexedDB persistence.
 * 
 * @version 1.0.0
 * @license MIT
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// DATABASE LAYER - IndexedDB Persistence
// ============================================================================

const DB_NAME = 'StarfoxGameDB';
const DB_VERSION = 1;
const STORE_NAME = 'gameProgress';

const openDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

const saveGameProgress = async (progress) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ id: 'currentProgress', ...progress });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const loadGameProgress = async () => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get('currentProgress');
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

const clearGameProgress = async () => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete('currentProgress');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// ============================================================================
// CAMPAIGN DATA - Level Definitions and Branching Paths
// ============================================================================

const CAMPAIGN_DATA = {
  levels: {
    '1': {
      id: '1',
      name: 'CORNERIA',
      subtitle: 'The Adventure Begins',
      description: 'Enemy forces have invaded Corneria. Destroy the attack carrier!',
      difficulty: 1,
      nextChoices: ['2a', '2b'],
      environment: 'city',
    },
    '2a': {
      id: '2a',
      name: 'METEO',
      subtitle: 'Asteroid Field',
      description: 'Navigate the treacherous asteroid belt. Watch for enemy ambushes!',
      difficulty: 2,
      nextChoices: ['3'],
      environment: 'space',
    },
    '2b': {
      id: '2b',
      name: 'SECTOR Y',
      subtitle: 'Combat Zone',
      description: 'Heavy enemy resistance detected. Eliminate all hostiles!',
      difficulty: 3,
      nextChoices: ['3'],
      environment: 'space',
    },
    '3': {
      id: '3',
      name: 'AQUAS',
      subtitle: 'Terror of the Deep',
      description: 'Dive into the ocean depths. Destroy the bioweapon!',
      difficulty: 3,
      nextChoices: ['4a', '4b'],
      environment: 'underwater',
    },
    '4a': {
      id: '4a',
      name: 'ZONESS',
      subtitle: 'Toxic Wasteland',
      description: 'The polluted seas hide a secret base. Find and destroy it!',
      difficulty: 4,
      nextChoices: ['5'],
      environment: 'toxic',
    },
    '4b': {
      id: '4b',
      name: 'MACBETH',
      subtitle: 'The Forever Train',
      description: 'Stop the weapons train before it reaches the supply depot!',
      difficulty: 4,
      nextChoices: ['5'],
      environment: 'industrial',
    },
    '5': {
      id: '5',
      name: 'VENOM',
      subtitle: 'The Final Battle',
      description: 'Andross awaits. This is the ultimate showdown!',
      difficulty: 5,
      nextChoices: [],
      environment: 'fortress',
      isFinal: true,
    },
  },
  
  // Visual positions for the campaign map (percentage-based)
  mapPositions: {
    '1': { x: 10, y: 50 },
    '2a': { x: 30, y: 25 },
    '2b': { x: 30, y: 75 },
    '3': { x: 50, y: 50 },
    '4a': { x: 70, y: 25 },
    '4b': { x: 70, y: 75 },
    '5': { x: 90, y: 50 },
  },
  
  // Path connections for rendering
  connections: [
    { from: '1', to: '2a' },
    { from: '1', to: '2b' },
    { from: '2a', to: '3' },
    { from: '2b', to: '3' },
    { from: '3', to: '4a' },
    { from: '3', to: '4b' },
    { from: '4a', to: '5' },
    { from: '4b', to: '5' },
  ],
};

const WINGMEN_DATA = [
  {
    id: 'falco',
    name: 'FALCO LOMBARDI',
    callsign: 'ACE',
    specialty: 'Offensive Support',
    description: 'Hot-headed pilot with unmatched aerial combat skills.',
    stats: { attack: 5, defense: 2, support: 3 },
    portrait: '🦅',
  },
  {
    id: 'peppy',
    name: 'PEPPY HARE',
    callsign: 'VETERAN',
    specialty: 'Tactical Advice',
    description: 'Veteran pilot. Provides strategic guidance during missions.',
    stats: { attack: 3, defense: 3, support: 5 },
    portrait: '🐰',
  },
  {
    id: 'slippy',
    name: 'SLIPPY TOAD',
    callsign: 'TECH',
    specialty: 'Enemy Analysis',
    description: 'Technical genius. Reveals enemy shield gauges.',
    stats: { attack: 2, defense: 4, support: 4 },
    portrait: '🐸',
  },
];

// ============================================================================
// NEW GAME PLUS FEATURES
// ============================================================================

const NEW_GAME_PLUS_UNLOCKS = {
  1: { name: 'Expert Mode', description: 'Enemies deal 50% more damage' },
  2: { name: 'Hyper Laser', description: 'Start with upgraded weapons' },
  3: { name: 'Stealth Mode', description: 'Reduced enemy detection range' },
  4: { name: 'Boss Rush', description: 'Fight all bosses in sequence' },
  5: { name: 'Mirror Mode', description: 'All levels are mirrored' },
};

// ============================================================================
// STYLES - Retro-Futuristic N64 Aesthetic
// ============================================================================

const styles = {
  // Base container with CRT-style effects
  container: {
    position: 'fixed',
    inset: 0,
    background: 'linear-gradient(180deg, #0a0a12 0%, #1a1a2e 50%, #0a0a12 100%)',
    fontFamily: '"Orbitron", "Audiowide", "Rajdhani", sans-serif',
    color: '#e0e0e0',
    overflow: 'hidden',
  },
  
  // Scanline overlay effect
  scanlines: {
    position: 'absolute',
    inset: 0,
    background: `repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 0, 0, 0.15) 2px,
      rgba(0, 0, 0, 0.15) 4px
    )`,
    pointerEvents: 'none',
    zIndex: 1000,
  },
  
  // Vignette effect
  vignette: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.6) 100%)',
    pointerEvents: 'none',
    zIndex: 999,
  },
  
  // Screen content wrapper
  screenContent: {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    boxSizing: 'border-box',
    zIndex: 1,
  },
  
  // Title styling
  title: {
    fontSize: 'clamp(2rem, 6vw, 4rem)',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.3em',
    background: 'linear-gradient(180deg, #FFD700 0%, #FF8C00 50%, #FF4500 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    textShadow: '0 0 30px rgba(255, 165, 0, 0.5)',
    marginBottom: '0.5rem',
    textAlign: 'center',
  },
  
  subtitle: {
    fontSize: 'clamp(0.8rem, 2vw, 1.2rem)',
    color: '#00ff88',
    letterSpacing: '0.5em',
    textTransform: 'uppercase',
    marginBottom: '3rem',
    textAlign: 'center',
  },
  
  // Menu button styling
  menuButton: {
    background: 'linear-gradient(180deg, rgba(30, 60, 90, 0.8) 0%, rgba(20, 40, 60, 0.9) 100%)',
    border: '2px solid #00ff88',
    borderRadius: '4px',
    padding: '1rem 3rem',
    margin: '0.5rem',
    color: '#00ff88',
    fontSize: '1.1rem',
    fontFamily: 'inherit',
    fontWeight: 700,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minWidth: '280px',
    position: 'relative',
    overflow: 'hidden',
  },
  
  menuButtonHover: {
    background: 'linear-gradient(180deg, rgba(0, 255, 136, 0.3) 0%, rgba(0, 200, 100, 0.2) 100%)',
    boxShadow: '0 0 20px rgba(0, 255, 136, 0.5), inset 0 0 20px rgba(0, 255, 136, 0.1)',
    transform: 'scale(1.02)',
  },
  
  menuButtonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
    border: '2px solid #444',
    color: '#666',
  },
  
  // Panel styling
  panel: {
    background: 'linear-gradient(180deg, rgba(20, 30, 50, 0.95) 0%, rgba(10, 20, 35, 0.98) 100%)',
    border: '2px solid #00ff88',
    borderRadius: '8px',
    padding: '2rem',
    maxWidth: '800px',
    width: '90%',
    boxShadow: '0 0 40px rgba(0, 255, 136, 0.2), inset 0 0 60px rgba(0, 0, 0, 0.5)',
  },
  
  // Card styling for wingmen/levels
  card: {
    background: 'linear-gradient(180deg, rgba(30, 50, 70, 0.9) 0%, rgba(20, 35, 50, 0.95) 100%)',
    border: '2px solid #3388ff',
    borderRadius: '8px',
    padding: '1.5rem',
    margin: '0.5rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    flex: 1,
    minWidth: '200px',
  },
  
  cardSelected: {
    border: '2px solid #FFD700',
    boxShadow: '0 0 30px rgba(255, 215, 0, 0.4), inset 0 0 20px rgba(255, 215, 0, 0.1)',
  },
  
  // Stats bar
  statBar: {
    height: '8px',
    background: 'rgba(0, 0, 0, 0.5)',
    borderRadius: '4px',
    overflow: 'hidden',
    margin: '4px 0',
  },
  
  statFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #00ff88 0%, #00cc66 100%)',
    transition: 'width 0.5s ease',
  },
  
  // Results screen specific
  resultsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
    width: '100%',
    marginBottom: '2rem',
  },
  
  resultItem: {
    background: 'rgba(0, 0, 0, 0.3)',
    padding: '1rem',
    borderRadius: '4px',
    textAlign: 'center',
    border: '1px solid rgba(0, 255, 136, 0.3)',
  },
  
  resultValue: {
    fontSize: '2rem',
    fontWeight: 900,
    color: '#FFD700',
    marginBottom: '0.25rem',
  },
  
  resultLabel: {
    fontSize: '0.8rem',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  
  // Campaign map
  campaignMap: {
    position: 'relative',
    width: '100%',
    height: '300px',
    background: 'rgba(0, 0, 0, 0.4)',
    borderRadius: '8px',
    border: '1px solid rgba(0, 255, 136, 0.3)',
    marginBottom: '1.5rem',
  },
  
  mapNode: {
    position: 'absolute',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.9rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    transform: 'translate(-50%, -50%)',
    border: '3px solid',
  },
  
  mapNodeCompleted: {
    background: 'linear-gradient(180deg, #00aa66 0%, #008844 100%)',
    borderColor: '#00ff88',
    color: '#fff',
  },
  
  mapNodeCurrent: {
    background: 'linear-gradient(180deg, #FFD700 0%, #FF8C00 100%)',
    borderColor: '#FFD700',
    color: '#000',
    boxShadow: '0 0 20px rgba(255, 215, 0, 0.6)',
  },
  
  mapNodeAvailable: {
    background: 'linear-gradient(180deg, #3366aa 0%, #224488 100%)',
    borderColor: '#3388ff',
    color: '#fff',
  },
  
  mapNodeLocked: {
    background: 'linear-gradient(180deg, #333 0%, #222 100%)',
    borderColor: '#444',
    color: '#666',
    cursor: 'not-allowed',
  },
  
  // Options slider
  slider: {
    WebkitAppearance: 'none',
    appearance: 'none',
    width: '100%',
    height: '8px',
    background: 'rgba(0, 0, 0, 0.5)',
    borderRadius: '4px',
    outline: 'none',
    cursor: 'pointer',
  },
  
  // Animations keyframes (applied via className)
  '@keyframes pulse': {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0.5 },
  },
  
  '@keyframes slideIn': {
    '0%': { transform: 'translateY(20px)', opacity: 0 },
    '100%': { transform: 'translateY(0)', opacity: 1 },
  },
};

// ============================================================================
// ANIMATED BACKGROUND COMPONENT
// ============================================================================

const AnimatedBackground = () => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let animationId;
    const stars = [];
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    const initStars = () => {
      stars.length = 0;
      for (let i = 0; i < 150; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          speed: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.8 + 0.2,
        });
      }
    };
    
    const animate = () => {
      ctx.fillStyle = 'rgba(10, 10, 18, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      stars.forEach(star => {
        star.x -= star.speed;
        if (star.x < 0) {
          star.x = canvas.width;
          star.y = Math.random() * canvas.height;
        }
        
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.fill();
      });
      
      animationId = requestAnimationFrame(animate);
    };
    
    resize();
    initStars();
    animate();
    
    window.addEventListener('resize', () => {
      resize();
      initStars();
    });
    
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);
  
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
      }}
    />
  );
};

// ============================================================================
// BUTTON COMPONENT WITH HOVER EFFECTS
// ============================================================================

const MenuButton = ({ children, onClick, disabled, selected, variant = 'primary' }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          border: '2px solid #ff4444',
          color: '#ff4444',
        };
      case 'secondary':
        return {
          border: '2px solid #888',
          color: '#888',
        };
      default:
        return {};
    }
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...styles.menuButton,
        ...getVariantStyles(),
        ...(isHovered && !disabled ? styles.menuButtonHover : {}),
        ...(disabled ? styles.menuButtonDisabled : {}),
        ...(selected ? styles.cardSelected : {}),
      }}
    >
      {children}
    </button>
  );
};

// ============================================================================
// MAIN MENU SCREEN
// ============================================================================

const MainMenuScreen = ({ onNewGame, onContinue, onOptions, hasSaveData, completedRuns }) => {
  return (
    <div style={styles.screenContent}>
      <h1 style={styles.title}>STAR SQUADRON</h1>
      <p style={styles.subtitle}>Combat Evolved</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
        <MenuButton onClick={onNewGame}>
          New Game
        </MenuButton>
        
        <MenuButton onClick={onContinue} disabled={!hasSaveData}>
          Continue
        </MenuButton>
        
        <MenuButton onClick={onOptions}>
          Options
        </MenuButton>
        
        {completedRuns > 0 && (
          <div style={{
            marginTop: '2rem',
            padding: '1rem',
            background: 'rgba(255, 215, 0, 0.1)',
            border: '1px solid rgba(255, 215, 0, 0.3)',
            borderRadius: '4px',
            textAlign: 'center',
          }}>
            <div style={{ color: '#FFD700', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              NEW GAME+ UNLOCKED
            </div>
            <div style={{ color: '#888', fontSize: '0.8rem' }}>
              {completedRuns} run{completedRuns > 1 ? 's' : ''} completed
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// OPTIONS SCREEN
// ============================================================================

const OptionsScreen = ({ options, onUpdateOptions, onBack }) => {
  return (
    <div style={styles.screenContent}>
      <h2 style={{ ...styles.title, fontSize: '2.5rem' }}>OPTIONS</h2>
      
      <div style={styles.panel}>
        {/* Master Volume */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span>Master Volume</span>
            <span style={{ color: '#00ff88' }}>{Math.round(options.masterVolume * 100)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={options.masterVolume}
            onChange={(e) => onUpdateOptions({ ...options, masterVolume: parseFloat(e.target.value) })}
            style={styles.slider}
          />
        </div>
        
        {/* Music Volume */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span>Music Volume</span>
            <span style={{ color: '#00ff88' }}>{Math.round(options.musicVolume * 100)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={options.musicVolume}
            onChange={(e) => onUpdateOptions({ ...options, musicVolume: parseFloat(e.target.value) })}
            style={styles.slider}
          />
        </div>
        
        {/* SFX Volume */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span>SFX Volume</span>
            <span style={{ color: '#00ff88' }}>{Math.round(options.sfxVolume * 100)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={options.sfxVolume}
            onChange={(e) => onUpdateOptions({ ...options, sfxVolume: parseFloat(e.target.value) })}
            style={styles.slider}
          />
        </div>
        
        {/* Voice Volume */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span>Voice Volume</span>
            <span style={{ color: '#00ff88' }}>{Math.round(options.voiceVolume * 100)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={options.voiceVolume}
            onChange={(e) => onUpdateOptions({ ...options, voiceVolume: parseFloat(e.target.value) })}
            style={styles.slider}
          />
        </div>
        
        {/* Toggles */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={options.showFPS}
              onChange={(e) => onUpdateOptions({ ...options, showFPS: e.target.checked })}
              style={{ width: '20px', height: '20px', accentColor: '#00ff88' }}
            />
            <span>Show FPS</span>
          </label>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={options.screenShake}
              onChange={(e) => onUpdateOptions({ ...options, screenShake: e.target.checked })}
              style={{ width: '20px', height: '20px', accentColor: '#00ff88' }}
            />
            <span>Screen Shake</span>
          </label>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={options.subtitles}
              onChange={(e) => onUpdateOptions({ ...options, subtitles: e.target.checked })}
              style={{ width: '20px', height: '20px', accentColor: '#00ff88' }}
            />
            <span>Subtitles</span>
          </label>
        </div>
        
        {/* Difficulty (for NG+) */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>Difficulty</label>
          <select
            value={options.difficulty}
            onChange={(e) => onUpdateOptions({ ...options, difficulty: e.target.value })}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid #00ff88',
              borderRadius: '4px',
              color: '#fff',
              fontFamily: 'inherit',
              fontSize: '1rem',
            }}
          >
            <option value="normal">Normal</option>
            <option value="hard">Hard</option>
            <option value="expert">Expert (NG+)</option>
          </select>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <MenuButton onClick={onBack}>Back</MenuButton>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// WINGMAN CHOICE SCREEN
// ============================================================================

const WingmanChoiceScreen = ({ selectedWingmen, onSelect, onConfirm, maxSelections = 2 }) => {
  const handleToggle = (wingmanId) => {
    if (selectedWingmen.includes(wingmanId)) {
      onSelect(selectedWingmen.filter(id => id !== wingmanId));
    } else if (selectedWingmen.length < maxSelections) {
      onSelect([...selectedWingmen, wingmanId]);
    }
  };
  
  return (
    <div style={styles.screenContent}>
      <h2 style={{ ...styles.title, fontSize: '2rem' }}>SELECT YOUR WINGMEN</h2>
      <p style={styles.subtitle}>Choose {maxSelections} pilots to join your squadron</p>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', maxWidth: '900px' }}>
        {WINGMEN_DATA.map((wingman) => {
          const isSelected = selectedWingmen.includes(wingman.id);
          return (
            <div
              key={wingman.id}
              onClick={() => handleToggle(wingman.id)}
              style={{
                ...styles.card,
                ...(isSelected ? styles.cardSelected : {}),
                maxWidth: '280px',
              }}
            >
              <div style={{ fontSize: '3rem', textAlign: 'center', marginBottom: '0.5rem' }}>
                {wingman.portrait}
              </div>
              <h3 style={{ color: isSelected ? '#FFD700' : '#3388ff', margin: '0 0 0.25rem', fontSize: '1rem' }}>
                {wingman.name}
              </h3>
              <div style={{ color: '#00ff88', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                {wingman.callsign} • {wingman.specialty}
              </div>
              <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {wingman.description}
              </p>
              
              {/* Stats */}
              <div style={{ fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>ATK</span>
                  <span>{wingman.stats.attack}/5</span>
                </div>
                <div style={styles.statBar}>
                  <div style={{ ...styles.statFill, width: `${wingman.stats.attack * 20}%`, background: '#ff4444' }} />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>DEF</span>
                  <span>{wingman.stats.defense}/5</span>
                </div>
                <div style={styles.statBar}>
                  <div style={{ ...styles.statFill, width: `${wingman.stats.defense * 20}%`, background: '#4488ff' }} />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>SUP</span>
                  <span>{wingman.stats.support}/5</span>
                </div>
                <div style={styles.statBar}>
                  <div style={{ ...styles.statFill, width: `${wingman.stats.support * 20}%` }} />
                </div>
              </div>
              
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: '#FFD700',
                  color: '#000',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                }}>
                  ✓
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div style={{ marginTop: '2rem' }}>
        <MenuButton
          onClick={onConfirm}
          disabled={selectedWingmen.length !== maxSelections}
        >
          Confirm Team ({selectedWingmen.length}/{maxSelections})
        </MenuButton>
      </div>
    </div>
  );
};

// ============================================================================
// MISSION BRIEFING SCREEN
// ============================================================================

const MissionScreen = ({ level, wingmen, onStartMission, onBack }) => {
  const levelData = CAMPAIGN_DATA.levels[level];
  
  const selectedWingmenData = wingmen
    .map(id => WINGMEN_DATA.find(w => w.id === id))
    .filter(Boolean);
  
  return (
    <div style={styles.screenContent}>
      <div style={styles.panel}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.5rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid rgba(0, 255, 136, 0.3)',
        }}>
          <div style={{
            fontSize: '3rem',
            fontWeight: 900,
            color: '#FFD700',
            textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
          }}>
            {level}
          </div>
          <div>
            <h2 style={{ margin: 0, color: '#00ff88', fontSize: '1.5rem' }}>
              {levelData.name}
            </h2>
            <div style={{ color: '#888', fontSize: '0.9rem' }}>
              {levelData.subtitle}
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <div style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Difficulty
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  style={{
                    width: '12px',
                    height: '12px',
                    background: i <= levelData.difficulty ? '#ff4444' : 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '2px',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          padding: '1.5rem',
          borderRadius: '4px',
          marginBottom: '1.5rem',
        }}>
          <h3 style={{ color: '#ff8844', margin: '0 0 0.5rem', fontSize: '0.9rem', textTransform: 'uppercase' }}>
            Mission Briefing
          </h3>
          <p style={{ color: '#ccc', margin: 0, lineHeight: 1.6 }}>
            {levelData.description}
          </p>
        </div>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ color: '#3388ff', margin: '0 0 0.75rem', fontSize: '0.9rem', textTransform: 'uppercase' }}>
            Squadron
          </h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{
              background: 'rgba(255, 215, 0, 0.1)',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              borderRadius: '4px',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <span style={{ fontSize: '1.5rem' }}>🦊</span>
              <div>
                <div style={{ fontWeight: 700, color: '#FFD700' }}>FOX McCLOUD</div>
                <div style={{ fontSize: '0.75rem', color: '#888' }}>Team Leader</div>
              </div>
            </div>
            
            {selectedWingmenData.map((wingman) => (
              <div
                key={wingman.id}
                style={{
                  background: 'rgba(0, 100, 255, 0.1)',
                  border: '1px solid rgba(51, 136, 255, 0.3)',
                  borderRadius: '4px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>{wingman.portrait}</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#3388ff' }}>{wingman.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>{wingman.specialty}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <MenuButton variant="secondary" onClick={onBack}>
            Back
          </MenuButton>
          <MenuButton onClick={onStartMission}>
            Launch Mission
          </MenuButton>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// RESULTS SCREEN
// ============================================================================

const ResultsScreen = ({ levelId, results, onContinue }) => {
  const levelData = CAMPAIGN_DATA.levels[levelId];
  const isVictory = results.completed;
  
  return (
    <div style={styles.screenContent}>
      <h2 style={{
        ...styles.title,
        fontSize: '2.5rem',
        color: isVictory ? '#00ff88' : '#ff4444',
        background: isVictory
          ? 'linear-gradient(180deg, #00ff88 0%, #00cc66 100%)'
          : 'linear-gradient(180deg, #ff6666 0%, #cc4444 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        {isVictory ? 'MISSION COMPLETE' : 'MISSION FAILED'}
      </h2>
      
      <div style={styles.panel}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '1.5rem', color: '#888' }}>{levelData.name}</span>
        </div>
        
        <div style={styles.resultsGrid}>
          <div style={styles.resultItem}>
            <div style={styles.resultValue}>{results.score.toLocaleString()}</div>
            <div style={styles.resultLabel}>Score</div>
          </div>
          <div style={styles.resultItem}>
            <div style={styles.resultValue}>{results.hits}</div>
            <div style={styles.resultLabel}>Hits</div>
          </div>
          <div style={styles.resultItem}>
            <div style={styles.resultValue}>{results.accuracy}%</div>
            <div style={styles.resultLabel}>Accuracy</div>
          </div>
          <div style={styles.resultItem}>
            <div style={styles.resultValue}>{results.time}</div>
            <div style={styles.resultLabel}>Time</div>
          </div>
        </div>
        
        {/* Wingmen Status */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ color: '#3388ff', margin: '0 0 0.75rem', fontSize: '0.9rem', textTransform: 'uppercase' }}>
            Squadron Status
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {results.wingmenStatus.map((status, index) => (
              <div
                key={index}
                style={{
                  padding: '0.5rem 1rem',
                  background: status.alive ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 68, 68, 0.1)',
                  border: `1px solid ${status.alive ? '#00ff88' : '#ff4444'}`,
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                }}
              >
                <span style={{ marginRight: '0.5rem' }}>{status.portrait}</span>
                {status.name}: {status.alive ? 'OK' : 'DOWN'}
              </div>
            ))}
          </div>
        </div>
        
        {/* Bonuses */}
        {results.bonuses && results.bonuses.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ color: '#FFD700', margin: '0 0 0.75rem', fontSize: '0.9rem', textTransform: 'uppercase' }}>
              Bonuses
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {results.bonuses.map((bonus, index) => (
                <div
                  key={index}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(255, 215, 0, 0.1)',
                    border: '1px solid rgba(255, 215, 0, 0.3)',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    color: '#FFD700',
                  }}
                >
                  {bonus}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Rank */}
        <div style={{
          textAlign: 'center',
          padding: '1rem',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '4px',
          marginBottom: '1.5rem',
        }}>
          <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.5rem' }}>RANK</div>
          <div style={{
            fontSize: '4rem',
            fontWeight: 900,
            background: 'linear-gradient(180deg, #FFD700 0%, #FF8C00 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {results.rank}
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <MenuButton onClick={onContinue}>
            {isVictory ? 'Continue' : 'Retry'}
          </MenuButton>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CAMPAIGN CHOICE SCREEN
// ============================================================================

const CampaignChoiceScreen = ({ currentLevel, completedLevels, availableChoices, onSelectLevel }) => {
  const renderPath = (from, to) => {
    const fromPos = CAMPAIGN_DATA.mapPositions[from];
    const toPos = CAMPAIGN_DATA.mapPositions[to];
    
    const isCompleted = completedLevels.includes(from) && completedLevels.includes(to);
    const isAvailable = completedLevels.includes(from) && availableChoices.includes(to);
    
    return (
      <line
        key={`${from}-${to}`}
        x1={`${fromPos.x}%`}
        y1={`${fromPos.y}%`}
        x2={`${toPos.x}%`}
        y2={`${toPos.y}%`}
        stroke={isCompleted ? '#00ff88' : isAvailable ? '#3388ff' : '#333'}
        strokeWidth={isAvailable ? 4 : 2}
        strokeDasharray={isAvailable && !isCompleted ? '8,4' : 'none'}
      />
    );
  };
  
  const getNodeStyle = (levelId) => {
    if (completedLevels.includes(levelId)) return styles.mapNodeCompleted;
    if (levelId === currentLevel) return styles.mapNodeCurrent;
    if (availableChoices.includes(levelId)) return styles.mapNodeAvailable;
    return styles.mapNodeLocked;
  };
  
  return (
    <div style={styles.screenContent}>
      <h2 style={{ ...styles.title, fontSize: '2rem' }}>CHOOSE YOUR PATH</h2>
      <p style={styles.subtitle}>Select your next destination</p>
      
      <div style={styles.panel}>
        {/* Campaign Map */}
        <div style={styles.campaignMap}>
          <svg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          >
            {CAMPAIGN_DATA.connections.map(({ from, to }) => renderPath(from, to))}
          </svg>
          
          {Object.entries(CAMPAIGN_DATA.mapPositions).map(([levelId, pos]) => {
            const levelData = CAMPAIGN_DATA.levels[levelId];
            const isClickable = availableChoices.includes(levelId);
            
            return (
              <div
                key={levelId}
                onClick={() => isClickable && onSelectLevel(levelId)}
                style={{
                  ...styles.mapNode,
                  ...getNodeStyle(levelId),
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                }}
                title={levelData.name}
              >
                {levelId}
              </div>
            );
          })}
        </div>
        
        {/* Available Choices Detail */}
        {availableChoices.length > 0 && (
          <div>
            <h3 style={{ color: '#00ff88', margin: '0 0 1rem', fontSize: '0.9rem', textTransform: 'uppercase' }}>
              Available Missions
            </h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {availableChoices.map((levelId) => {
                const levelData = CAMPAIGN_DATA.levels[levelId];
                return (
                  <div
                    key={levelId}
                    onClick={() => onSelectLevel(levelId)}
                    style={{
                      ...styles.card,
                      flex: '1 1 200px',
                      maxWidth: '300px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <span style={{
                        fontSize: '1.5rem',
                        fontWeight: 900,
                        color: '#3388ff',
                      }}>
                        {levelId}
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, color: '#fff' }}>{levelData.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>{levelData.subtitle}</div>
                      </div>
                    </div>
                    <p style={{ color: '#aaa', fontSize: '0.85rem', margin: 0 }}>
                      {levelData.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// GAME COMPLETE SCREEN
// ============================================================================

const GameCompleteScreen = ({ totalScore, completedLevels, newGamePlusLevel, onNewGamePlus, onMainMenu }) => {
  const unlocks = Object.entries(NEW_GAME_PLUS_UNLOCKS)
    .filter(([level]) => parseInt(level) <= newGamePlusLevel)
    .map(([, unlock]) => unlock);
  
  const newUnlock = NEW_GAME_PLUS_UNLOCKS[newGamePlusLevel];
  
  return (
    <div style={styles.screenContent}>
      <h2 style={{
        ...styles.title,
        fontSize: '3rem',
        background: 'linear-gradient(180deg, #FFD700 0%, #FF8C00 50%, #FF4500 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        VICTORY
      </h2>
      <p style={styles.subtitle}>The Lylat System is saved!</p>
      
      <div style={styles.panel}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ color: '#888', fontSize: '0.9rem', marginBottom: '0.5rem' }}>FINAL SCORE</div>
          <div style={{
            fontSize: '3rem',
            fontWeight: 900,
            color: '#FFD700',
            textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
          }}>
            {totalScore.toLocaleString()}
          </div>
        </div>
        
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: '#00ff88', margin: '0 0 0.75rem', fontSize: '0.9rem', textTransform: 'uppercase' }}>
            Path Taken
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {completedLevels.map((levelId, index) => (
              <React.Fragment key={levelId}>
                <div style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(0, 255, 136, 0.1)',
                  border: '1px solid #00ff88',
                  borderRadius: '4px',
                }}>
                  {CAMPAIGN_DATA.levels[levelId]?.name || levelId}
                </div>
                {index < completedLevels.length - 1 && (
                  <span style={{ color: '#444', alignSelf: 'center' }}>→</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
        
        {newUnlock && (
          <div style={{
            background: 'rgba(255, 215, 0, 0.1)',
            border: '2px solid #FFD700',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '2rem',
            textAlign: 'center',
          }}>
            <div style={{ color: '#FFD700', fontSize: '1rem', marginBottom: '0.5rem', fontWeight: 700 }}>
              🎉 NEW UNLOCK
            </div>
            <div style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              {newUnlock.name}
            </div>
            <div style={{ color: '#888', fontSize: '0.9rem' }}>
              {newUnlock.description}
            </div>
          </div>
        )}
        
        {unlocks.length > 1 && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ color: '#FFD700', margin: '0 0 0.75rem', fontSize: '0.9rem', textTransform: 'uppercase' }}>
              All Unlocks
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {unlocks.map((unlock, index) => (
                <div
                  key={index}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(255, 215, 0, 0.05)',
                    border: '1px solid rgba(255, 215, 0, 0.2)',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    color: '#ccc',
                  }}
                >
                  {unlock.name}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <MenuButton onClick={onNewGamePlus}>
            New Game+
          </MenuButton>
          <MenuButton variant="secondary" onClick={onMainMenu}>
            Main Menu
          </MenuButton>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN ORCHESTRATOR COMPONENT
// ============================================================================

/**
 * StarfoxMenuSystem - Main orchestration component
 * 
 * Props:
 * @param {function} onStartLevel - Callback when a level should start. Receives (levelId, gameState)
 * @param {function} onLevelComplete - Called by parent when level completes. Should return results object
 * @param {object} externalLevelResults - Results from completed level (passed by parent)
 * @param {boolean} levelInProgress - True when a level is currently being played
 * 
 * The component manages all menu states and calls onStartLevel when gameplay should begin.
 * The parent component should:
 * 1. Listen for onStartLevel and begin the actual Three.js level
 * 2. When level ends, set externalLevelResults and the menu system will show results
 */
const StarfoxMenuSystem = ({
  onStartLevel,
  externalLevelResults = null,
  levelInProgress = false,
}) => {
  // Game state
  const [screen, setScreen] = useState('loading');
  const [gameProgress, setGameProgress] = useState(null);
  const [options, setOptions] = useState({
    masterVolume: 0.8,
    musicVolume: 0.7,
    sfxVolume: 1.0,
    voiceVolume: 1.0,
    showFPS: false,
    screenShake: true,
    subtitles: true,
    difficulty: 'normal',
  });
  
  // Current run state
  const [selectedWingmen, setSelectedWingmen] = useState([]);
  const [currentLevel, setCurrentLevel] = useState('1');
  const [completedLevels, setCompletedLevels] = useState([]);
  const [totalScore, setTotalScore] = useState(0);
  const [lastResults, setLastResults] = useState(null);
  
  // Load saved progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const saved = await loadGameProgress();
        if (saved) {
          setGameProgress(saved);
          if (saved.options) setOptions(saved.options);
        }
        setScreen('mainMenu');
      } catch (error) {
        console.error('Failed to load progress:', error);
        setScreen('mainMenu');
      }
    };
    loadProgress();
  }, []);
  
  // Handle external level results
  useEffect(() => {
    if (externalLevelResults && !levelInProgress) {
      setLastResults(externalLevelResults);
      setScreen('results');
    }
  }, [externalLevelResults, levelInProgress]);
  
  // Auto-save progress
  const saveProgress = useCallback(async (updates = {}) => {
    const progress = {
      options,
      currentLevel,
      completedLevels,
      selectedWingmen,
      totalScore,
      completedRuns: gameProgress?.completedRuns || 0,
      ...updates,
    };
    
    try {
      await saveGameProgress(progress);
      setGameProgress(progress);
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  }, [options, currentLevel, completedLevels, selectedWingmen, totalScore, gameProgress]);
  
  // Screen handlers
  const handleNewGame = () => {
    setSelectedWingmen([]);
    setCurrentLevel('1');
    setCompletedLevels([]);
    setTotalScore(0);
    setScreen('wingmanChoice');
  };
  
  const handleContinue = () => {
    if (gameProgress) {
      setSelectedWingmen(gameProgress.selectedWingmen || []);
      setCurrentLevel(gameProgress.currentLevel || '1');
      setCompletedLevels(gameProgress.completedLevels || []);
      setTotalScore(gameProgress.totalScore || 0);
      
      // Determine which screen to show based on progress
      if (gameProgress.completedLevels?.length > 0) {
        setScreen('campaignChoice');
      } else if (gameProgress.selectedWingmen?.length > 0) {
        setScreen('mission');
      } else {
        setScreen('wingmanChoice');
      }
    }
  };
  
  const handleWingmenConfirm = () => {
    saveProgress({ selectedWingmen });
    setScreen('mission');
  };
  
  const handleStartMission = () => {
    // Call the parent's level start handler
    if (onStartLevel) {
      onStartLevel(currentLevel, {
        wingmen: selectedWingmen,
        options,
        completedLevels,
      });
    }
    setScreen('playing');
  };
  
  const handleResultsContinue = () => {
    if (!lastResults?.completed) {
      // Retry level
      setScreen('mission');
      return;
    }
    
    // Update progress
    const newCompletedLevels = [...completedLevels, currentLevel];
    const newTotalScore = totalScore + (lastResults?.score || 0);
    
    setCompletedLevels(newCompletedLevels);
    setTotalScore(newTotalScore);
    
    const levelData = CAMPAIGN_DATA.levels[currentLevel];
    
    // Check if game is complete
    if (levelData?.isFinal) {
      const newCompletedRuns = (gameProgress?.completedRuns || 0) + 1;
      saveProgress({
        completedLevels: newCompletedLevels,
        totalScore: newTotalScore,
        completedRuns: newCompletedRuns,
        currentLevel: '1',
      });
      setScreen('gameComplete');
    } else {
      saveProgress({
        completedLevels: newCompletedLevels,
        totalScore: newTotalScore,
      });
      setScreen('campaignChoice');
    }
  };
  
  const handleLevelSelect = (levelId) => {
    setCurrentLevel(levelId);
    saveProgress({ currentLevel: levelId });
    setScreen('mission');
  };
  
  const handleNewGamePlus = async () => {
    await clearGameProgress();
    setSelectedWingmen([]);
    setCurrentLevel('1');
    setCompletedLevels([]);
    setTotalScore(0);
    setScreen('wingmanChoice');
  };
  
  const handleMainMenu = () => {
    setScreen('mainMenu');
  };
  
  // Get available level choices
  const getAvailableChoices = () => {
    if (completedLevels.length === 0) return ['1'];
    
    const lastCompleted = completedLevels[completedLevels.length - 1];
    const lastLevelData = CAMPAIGN_DATA.levels[lastCompleted];
    
    if (!lastLevelData) return [];
    
    return lastLevelData.nextChoices.filter(
      levelId => !completedLevels.includes(levelId)
    );
  };
  
  // Don't render menu system while level is in progress
  if (levelInProgress || screen === 'playing') {
    return null;
  }
  
  // Render current screen
  const renderScreen = () => {
    switch (screen) {
      case 'loading':
        return (
          <div style={styles.screenContent}>
            <div style={{ color: '#00ff88', fontSize: '1.2rem' }}>
              Loading...
            </div>
          </div>
        );
        
      case 'mainMenu':
        return (
          <MainMenuScreen
            onNewGame={handleNewGame}
            onContinue={handleContinue}
            onOptions={() => setScreen('options')}
            hasSaveData={!!gameProgress?.selectedWingmen?.length}
            completedRuns={gameProgress?.completedRuns || 0}
          />
        );
        
      case 'options':
        return (
          <OptionsScreen
            options={options}
            onUpdateOptions={(newOptions) => {
              setOptions(newOptions);
              saveProgress({ options: newOptions });
            }}
            onBack={() => setScreen('mainMenu')}
          />
        );
        
      case 'wingmanChoice':
        return (
          <WingmanChoiceScreen
            selectedWingmen={selectedWingmen}
            onSelect={setSelectedWingmen}
            onConfirm={handleWingmenConfirm}
            maxSelections={2}
          />
        );
        
      case 'mission':
        return (
          <MissionScreen
            level={currentLevel}
            wingmen={selectedWingmen}
            onStartMission={handleStartMission}
            onBack={() => {
              if (completedLevels.length > 0) {
                setScreen('campaignChoice');
              } else {
                setScreen('wingmanChoice');
              }
            }}
          />
        );
        
      case 'results':
        return (
          <ResultsScreen
            levelId={currentLevel}
            results={lastResults || {
              completed: true,
              score: 0,
              hits: 0,
              accuracy: 0,
              time: '0:00',
              rank: 'C',
              wingmenStatus: [],
              bonuses: [],
            }}
            onContinue={handleResultsContinue}
          />
        );
        
      case 'campaignChoice':
        return (
          <CampaignChoiceScreen
            currentLevel={currentLevel}
            completedLevels={completedLevels}
            availableChoices={getAvailableChoices()}
            onSelectLevel={handleLevelSelect}
          />
        );
        
      case 'gameComplete':
        return (
          <GameCompleteScreen
            totalScore={totalScore}
            completedLevels={completedLevels}
            newGamePlusLevel={gameProgress?.completedRuns || 1}
            onNewGamePlus={handleNewGamePlus}
            onMainMenu={handleMainMenu}
          />
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div style={styles.container}>
      <AnimatedBackground />
      <div style={styles.scanlines} />
      <div style={styles.vignette} />
      {renderScreen()}
    </div>
  );
};

// Export component and utilities
export default StarfoxMenuSystem;
export {
  CAMPAIGN_DATA,
  WINGMEN_DATA,
  NEW_GAME_PLUS_UNLOCKS,
  saveGameProgress,
  loadGameProgress,
  clearGameProgress,
};
