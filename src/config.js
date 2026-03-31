// ============================================================
//  config.js — All tunable game constants
// ============================================================

// --- Physics ---
export const GRAVITY        = -0.007;
export const JUMP_STRENGTH  = 0.18;
export const BIRD_X         = -3.5;

// --- Level geometry ---
export const PIPE_GAP          = 9.0;
export const INITIAL_PIPE_SPEED    = 0.12;
export const INITIAL_SPAWN_INTERVAL = 1400; // ms

// --- Difficulty thresholds ---
// Each tier: { score, speed, spawnInterval, enemyTier }
// enemyTier: 1=Archer only, 2=Archer+Diver, 3=All types
export const DIFFICULTY_TIERS = [
  { score:  0, speed: 0.12, spawnInterval: 1400, enemyTier: 1 },
  { score: 10, speed: 0.15, spawnInterval: 1200, enemyTier: 2 },
  { score: 25, speed: 0.18, spawnInterval: 1000, enemyTier: 3 },
  { score: 50, speed: 0.22, spawnInterval:  850, enemyTier: 3 },
];

// --- Scoring ---
export const SCORE_PIPE_PASS   = 1;
export const SCORE_ARCHER_KILL = 2;
export const SCORE_DIVER_KILL  = 3;
export const SCORE_TANK_KILL   = 5;

// --- Combo system ---
export const COMBO_RESET_MS    = 3000; // ms without a kill before combo resets
export const COMBO_THRESHOLDS  = [3, 6]; // kills to reach x2, x3

// --- Player cooldowns ---
export const SPIT_COOLDOWN_MS = 500;

// --- Bounds ---
export const GROUND_Y =  -8.5;
export const CEILING_Y = 15;
