# TRON

Browser-based TRON lightcycle game. One human player vs bots. No server required.

**[Play it →](https://seanreid.github.io/tron/)**

## Controls

| Input | Action |
|---|---|
| `W` / `↑` | Up |
| `S` / `↓` | Down |
| `A` / `←` | Left |
| `D` / `→` | Right |
| Swipe | Mobile directional input |

## Mechanics

- Leave a trail wall — crash into any wall and you die
- **Speed boost** activates automatically when riding close to a wall; your cycle pulses and moves faster
- Bots use Voronoi territory evaluation — they play to maximise the space they can claim before you get there
- Dead bot trails persist as obstacles until the bot respawns (2s), then vanish instantly
- **Points** = seconds survived, accumulated across all games

## Development

```bash
npm install
npm run dev      # dev server at localhost:5173
npm test         # unit tests (Vitest)
npm run build    # production build → dist/
```

## Tech

Vite · TypeScript · Canvas 2D · Web Audio API
