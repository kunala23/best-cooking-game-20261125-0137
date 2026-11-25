# Sizzle & Serve — Dapur Kilat

[![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![Rank](https://make.fun/badge/best-cooking-game-20261125-0137/kunala23/best-cooking-game-20261125-0137/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![Reward](https://make.fun/badge/best-cooking-game-20261125-0137/kunala23/best-cooking-game-20261125-0137/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)

A complete, original cooking game for make.fun's "Make the best cooking game"
bounty. Run a busy kitchen for one 2:30 shift: take orders from the board,
grab ingredients from the counter, chop on the board, grill patties, assemble
dishes on plates and serve them before customers walk out. Synthesised
WebAudio sound, no audio files; the whole game is static files under `game/`
and plays offline in a desktop browser.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

Or open `game/index.html` through any static file server. No build step, no
network request at runtime.

## Play

- **WASD / arrows** — walk the chef around the kitchen
- **E / click a nearby station** — take an ingredient, chop, grill, plate, serve
- **P** — pause, **M** — sound on/off, **R** — restart

Recipes on the order board: Burger Klasik (roti + daging matang + selada
cincang), Salad Segar (tomat cincang + selada cincang + keju), Keju Leleh
(roti + keju + daging matang) and Burger Kebun (roti + tomat cincang + daging
matang). A patty left too long on the grill burns — throw it away. Serving
the right dish builds a combo up to ×5; a wrong dish or an expired order
breaks it, and three expired orders end the shift early.

## Files

- `game/index.html` — page and canvas
- `game/style.css` — page chrome
- `game/src/main.js` — game loop, keys/mouse, screenshot scenes
- `game/src/world.js` — orders, stations, chopping, grilling, serving
- `game/src/render.js` — all canvas drawing: kitchen, chef, food, overlays
- `game/src/config.js` — recipes, ingredients, tuning, palette
- `game/src/input.js` — keyboard and mouse state
- `game/src/audio.js` — synthesised WebAudio sound effects
- `game/src/random.js` — seeded random numbers
- `main.ts` — the make.fun hand-in program (copies `game/` + `screenshots/`,
  writes `dossier.json`)
