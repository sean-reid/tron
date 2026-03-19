# TRON Lightcycle Game — Architecture

## Overview

A static, browser-based TRON lightcycle game. One human player versus a screen-size-proportional number of bots. No server required; hosted on GitHub Pages. Built with **Vite + TypeScript**, rendered on a **2D Canvas**. Minimal, retro neon-on-black aesthetic.

---

## Tech Stack

| Concern | Choice | Reason |
|---|---|---|
| Language | TypeScript | Type safety for grid/state logic |
| Bundler | Vite | Fast dev loop, static output for GitHub Pages |
| Rendering | Canvas 2D | Best performance for grid-based games with glow effects |
| Audio | Web Audio API | No dependencies, full control over synthesis + music |
| Testing | Vitest | Native Vite integration, fast unit tests |
| Deployment | GitHub Actions → GitHub Pages | CI builds and tests on every push to `main` |

No UI framework. The DOM surface is a single `<canvas>` plus a minimal HUD overlay (stats, audio toggles).

---

## Directory Structure

```
tron/
├── index.html
├── vite.config.ts
├── tsconfig.json          # noEmit: true — tsc type-checks only, Vite compiles
├── package.json
├── .github/
│   └── workflows/
│       └── deploy.yml     # build → test → deploy to GitHub Pages
├── src/
│   ├── main.ts            # Entry point
│   ├── config.ts          # All constants
│   ├── types.ts           # Shared interfaces, enums, pure helpers
│   │
│   ├── engine/
│   │   ├── Arena.ts           # Grid occupancy map (Uint16Array)
│   │   ├── CollisionDetector.ts  # nextPos, willCollide, floodFill, voronoiScore
│   │   └── GameEngine.ts      # Main loop, state machine, module orchestration
│   │
│   ├── entities/
│   │   ├── Cycle.ts           # Base class: position, direction, trail, boost
│   │   ├── PlayerCycle.ts     # Input-driven cycle
│   │   └── BotCycle.ts        # Voronoi AI cycle
│   │
│   ├── systems/
│   │   ├── BotManager.ts      # Bot count, spawn/respawn lifecycle
│   │   ├── SpeedBoost.ts      # Proximity detection → boost state
│   │   ├── ScoreManager.ts    # Points, survival time, games played
│   │   └── InputManager.ts    # Keyboard + touch swipe input
│   │
│   ├── rendering/
│   │   ├── Renderer.ts        # Canvas orchestrator
│   │   ├── ArenaRenderer.ts   # Grid lines, boundary
│   │   ├── CycleRenderer.ts   # Head (interpolated), trail, neon glow, boost pulse
│   │   ├── HUDRenderer.ts     # DOM stats overlay (PTS · BEST · GAMES)
│   │   └── BannerRenderer.ts  # Temporary DEREZZED banner
│   │
│   └── audio/
│       ├── AudioManager.ts    # Toggle control, lazy AudioContext init
│       ├── SFX.ts             # Programmatic sound effects
│       └── Music.ts           # Generative ambient music
│
└── tests/
    ├── Arena.test.ts
    ├── CollisionDetector.test.ts
    ├── SpeedBoost.test.ts
    ├── ScoreManager.test.ts
    ├── BotManager.test.ts
    └── BotCycle.test.ts
```

---

## Game Design

### Core rules
- Grid-based movement on a fixed arena scaled to the viewport
- Every cycle leaves a permanent trail; hitting any wall or trail is fatal
- **Head-on collision**: two cycles moving into the same cell simultaneously both die

### Speed boost
- Activates automatically when a cycle's head is within `BOOST_PROXIMITY` (3) cells of any occupied cell (trail or arena boundary) in any cardinal direction
- Shortens the cycle's tick interval: `TICK_MS / BOOST_MULTIPLIER` instead of `TICK_MS`
- Visual: glow radius pulses rapidly (`BOOST_PULSE_HZ`)

### Bots
- Count = `floor(arenaCells / BOT_CELLS_PER_BOT)`, minimum 1
- When a bot dies, its trail **remains in the arena as an active obstacle** for `BOT_RESPAWN_DELAY_MS` (2s)
- At respawn time, the trail vanishes instantly and the bot reappears at a new random position
- This keeps bot count constant throughout the game

### Scoring (survival-only)
- Points = seconds survived per game, accumulated across all games (`floor(survivalMs / 1000)`)
- Stats tracked: **Points**, **Best survival time**, **Games played** — in-memory only, reset on page reload

### Game state
```
RUNNING ──(player dies)──► LOSE_PAUSE ──(timer expires)──► RUNNING (new game)
```
No win state. The game is continuous survival.

---

## Module Design

### `config.ts` — Constants

```typescript
export const CONFIG = {
  CELL_SIZE: 12,
  TICK_MS: 110,
  BOOST_MULTIPLIER: 1.7,
  BOOST_PROXIMITY: 3,
  BOOST_PULSE_HZ: 6,
  BOT_CELLS_PER_BOT: 700,
  BOT_RESPAWN_DELAY_MS: 2000,
  LOSE_PAUSE_MS: 900,
  BOT_COMMIT_COOLDOWN_TICKS: 1,
  MIN_SPAWN_DISTANCE: 12,
  COLORS: { ... },
} as const;
```

---

### `engine/Arena.ts` — Grid State (Deep Module)

Flat `Uint16Array` occupancy map. `0` = empty; any non-zero value = owner ID. Out-of-bounds positions are treated as occupied (boundary walls).

```typescript
class Arena {
  readonly cols: number
  readonly rows: number
  readonly totalCells: number

  inBounds(pos): boolean
  isOccupied(pos): boolean     // O(1)
  occupy(pos, ownerId): void
  free(ownerId): void          // clears all cells belonging to owner
  occupiedNeighborCount(pos, radius): number
  reset(): void
}
```

---

### `engine/CollisionDetector.ts` — Pure Functions (Deep Module)

Stateless. All game logic that needs spatial queries calls these.

```typescript
nextPos(pos, dir): GridPos
willCollide(pos, arena): boolean
isDeadly(pos, dir, arena): boolean
floodFill(startPos, arena, maxCells?): number        // single-source BFS
voronoiScore(myNextPos, opponents, arena): number    // multi-source Voronoi BFS
```

**`voronoiScore`** — the core of the bot AI. Runs a multi-source BFS with the bot's candidate next position and all opponent positions as simultaneous sources. Returns the number of cells the bot can claim before any opponent reaches them. No cap — runs to the full arena size, so scores are always meaningful.

---

### `entities/Cycle.ts` — Base Cycle

```typescript
abstract class Cycle {
  pos: GridPos          // current head (logical grid cell)
  prevPos: GridPos      // previous head (for interpolation)
  dir: Direction
  pendingDir: Direction // applied at next tick (prevents 180° reversals)
  trail: GridPos[]
  alive: boolean
  boosting: boolean
  tickAccumulator: number  // ms since last tick (per-cycle, independent speed)

  abstract chooseDirection(arena, opponents: GridPos[]): void
  applyDirection(): void   // commits pendingDir, blocks reversal
  advance(arena): void     // occupies current pos as trail, moves to nextPos
  die(): void
  snapshot(tickInterval): CycleSnapshot  // includes alpha for interpolation
}
```

**Direction commit rule:** `pendingDir` is validated (no 180° reversal) and applied at the start of each tick. Input registered mid-tick takes effect next tick.

---

### `entities/BotCycle.ts` — Bot AI (Deep Module)

```typescript
class BotCycle extends Cycle {
  chooseDirection(arena, opponents): void
  reset(startPos, startDir): void  // in-place reset for respawn
}
```

**Strategy:** Voronoi territory maximisation with commit cooldown.

```
each tick:
  if commitCooldown > 0: decrement, keep current direction
  else:
    for each non-suicidal, non-reversing direction:
      score = voronoiScore(nextPos, opponentPositions, arena)
    pick direction with highest score
    tie-break: prefer current direction (stability)
    reset commitCooldown = BOT_COMMIT_COOLDOWN_TICKS
```

The `opponentPositions` list includes the player and all other living bots, so the bot actively competes for territory against all participants.

---

### `systems/BotManager.ts` — Bot Lifecycle (Deep Module)

```typescript
class BotManager {
  readonly targetCount: number  // floor(arenaCells / BOT_CELLS_PER_BOT), min 1

  createBots(arena, playerPos): BotCycle[]
  onBotDied(bot, now): void     // schedules respawn; trail stays in arena
  tick(now, arena, playerPos): boolean  // fires due respawns; returns true if any fired
  getLivingBots(): BotCycle[]
  getActiveBots(): BotCycle[]
}
```

**Respawn flow:**
```
bot dies
  └─ onBotDied(bot, now)
       └─ respawnQueue.set(bot.id, now + 2000ms)
            [trail remains in arena — still blocks passage]

2000ms later, tick() fires:
  └─ arena.free(bot.id)          ← trail vanishes instantly
  └─ bot.reset(newPos, newDir)
  └─ arena.occupy(newPos, bot.id)
```

---

### `systems/SpeedBoost.ts` — Pure Proximity Evaluator (Deep Module)

```typescript
evaluateBoost(pos, dir, arena): boolean
```

Checks up to `BOOST_PROXIMITY` cells in all four cardinal directions. Returns `true` if any occupied cell (trail or boundary) is within range. The `dir` parameter is accepted for interface consistency but boost is omnidirectional.

---

### `systems/ScoreManager.ts` — Stats (Deep Module)

```typescript
class ScoreManager {
  points: number          // floor(survivalMs/1000) per game, accumulated
  longestSurvival: number // ms, best single game
  totalGames: number

  recordGame(survivalMs): void
  snapshot(): StatsSnapshot
}
```

---

### `systems/InputManager.ts` — Input

Keyboard (`WASD` + arrows) and touch swipe (dominant axis, min 20px threshold). Buffers one direction per tick; `consumeDirection()` returns it and clears the buffer.

---

### `engine/GameEngine.ts` — Orchestrator

Owns the `requestAnimationFrame` loop. Applies fixed-timestep logic with per-cycle independent tick rates.

**Game loop:**
```
rAF(ts):
  delta = min(ts - lastTs, 100ms)   // cap prevents spiral-of-death

  if state == LOSE_PAUSE:
    stateTimer -= delta
    if stateTimer <= 0: initGame()

  else (RUNNING):
    for each alive cycle:
      cycle.tickAccumulator += delta
      tickInterval = boosting ? TICK_MS/BOOST_MULT : TICK_MS
      while accumulator >= tickInterval:
        accumulator -= tickInterval
        stepCycle(cycle, now)
    botManager.tick(now, arena, player.pos)   // respawns

  renderer.draw(snapshots, arena, ts)
```

**`stepCycle(cycle, now)`:**
```
1. cycle.chooseDirection(arena, opponentsOf(cycle))
2. cycle.applyDirection()
3. next = nextPos(cycle.pos, cycle.dir)
4. if willCollide(next, arena):
     killCycle(cycle, now)  → if bot: onBotDied; if player: handleLoss
5. if any other cycle's .pos == next:  ← head-on detection
     killCycle(both)
6. cycle.advance(arena)
7. cycle.boosting = evaluateBoost(cycle.pos, cycle.dir, arena)
```

**Head-on collision:** checked by scanning all other alive cycles' current `pos` before advancing. Catches both direct head-on (A→B's cell) and swap-crossing (A→B, B→A same tick).

---

### Rendering

**Fixed-timestep + interpolated rendering:**

Each cycle stores `prevPos` (position before last tick) and `pos` (current). The renderer computes:
```
alpha = min(tickAccumulator / tickInterval, 1.0)
renderPos = prevPos + (pos - prevPos) * alpha
```

This produces smooth sub-pixel motion at any frame rate regardless of tick rate.

**Neon glow:** `ctx.shadowBlur` + `ctx.shadowColor` on trail segments and heads. Head glow oscillates during boost:
```
glow = HEAD_GLOW + BOOST_EXTRA * sin(now * PULSE_HZ * 2π / 1000) * 0.5 + 0.5
```

**Layer order:** arena background → dead trails (dimmed, α=0.4) → live trails → live heads.

---

### Audio

`AudioManager` lazy-inits `AudioContext` on the first user gesture (browser autoplay policy). SFX are programmatically synthesised:

| Event | Sound |
|---|---|
| `crash` | White noise burst with bandpass filter, falling frequency |
| `boost_start` | Sawtooth sweep upward |
| `boost_end` | Sawtooth sweep downward |
| `spawn` | Ascending sine arpeggio (soft) |
| `lose` | Descending square notes |

Music is a generative ambient loop: sub-bass drone (2× sawtooth through lowpass), rhythmic pulse (500ms interval), and an 8-note triangle arpeggio (250ms interval). Both SFX and music are independently toggleable.

---

## Key Design Principles

- **Deep modules:** `Arena`, `CollisionDetector`, `SpeedBoost`, `ScoreManager`, `BotManager`, `BotCycle` — large internal complexity behind small, stable interfaces. These are the primary test targets.
- **Render/logic separation:** game state advances on a fixed tick; rendering interpolates. No game logic inside render functions.
- **No shared mutable state:** modules communicate via method calls and snapshots.
- **`noEmit: true` in tsconfig:** `tsc` is used for type-checking only; Vite handles all compilation. Prevents stale `.js` files from shadowing `.ts` sources.
