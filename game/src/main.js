// Sizzle & Serve — game loop, keyboard/mouse wiring and staged screenshot scenes.
// One clear job: run the game, from title screen to game over, every frame.

import { VIEW_W, VIEW_H } from './config.js';
import { Sfx } from './audio.js';
import { Input } from './input.js';
import {
  createWorld, updateWorld, moveChef, interact, spawnOrder,
  nearestStation, stationAtPoint, stationById, resetWorld,
} from './world.js';
import { drawWorld } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = new Input(canvas);
const sfx = new Sfx();
const world = createWorld(20261125);

function startGame() {
  resetWorld(world);
  world.phase = 'playing';
  sfx.ensure();
  sfx.start();
  spawnOrder(world);
  spawnOrder(world);
}

function togglePause() {
  if (world.phase === 'playing') {
    world.phase = 'paused';
    sfx.stopSizzle();
  } else if (world.phase === 'paused') {
    world.phase = 'playing';
    sfx.ensure();
  }
}

// Staged scenes for screenshots: ?shot=start|play|rush|serve (real renders of this code).
function applyShotMode() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return;
  const seed = Number(params.get('seed') || 7);
  world.rng = (() => {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();
  if (shot === 'start') {
    world.phase = 'title';
  } else if (shot === 'play') {
    world.phase = 'playing';
    world.shiftLeft = 107;
    world.score = 340;
    world.coins = 340;
    world.combo = 2;
    world.served = 3;
    world.orders = [
      { id: 1, recipeId: 'burger', patience: 34, maxPatience: 48 },
      { id: 2, recipeId: 'salad', patience: 22, maxPatience: 44 },
      { id: 3, recipeId: 'cheesy', patience: 41, maxPatience: 48 },
    ];
    world.chef.x = 210;
    world.chef.y = 480;
    world.chef.carry = ['tomato_chopped'];
    const plates = stationById(world, 'plates');
    plates.plate = ['bun', 'patty_cooked'];
    const grill = stationById(world, 'grill');
    grill.slots = [{ state: 'cooking', t: 3.2 }, null];
    const board = stationById(world, 'board');
    board.chopping = { item: 'lettuce', t: 1.1 };
  } else if (shot === 'rush') {
    world.phase = 'playing';
    world.shiftLeft = 38;
    world.score = 1240;
    world.coins = 1240;
    world.combo = 4;
    world.bestCombo = 4;
    world.served = 11;
    world.orders = [
      { id: 1, recipeId: 'burger', patience: 8, maxPatience: 44 },
      { id: 2, recipeId: 'garden', patience: 15, maxPatience: 44 },
      { id: 3, recipeId: 'salad', patience: 26, maxPatience: 40 },
      { id: 4, recipeId: 'cheesy', patience: 33, maxPatience: 40 },
    ];
    world.chef.x = 900;
    world.chef.y = 470;
    world.chef.carry = ['patty_cooked', 'lettuce_chopped'];
    const plates = stationById(world, 'plates');
    plates.plate = ['bun', 'tomato_chopped'];
    const grill = stationById(world, 'grill');
    grill.slots = [{ state: 'cooked', t: 2.0 }, { state: 'cooking', t: 5.1 }];
  } else if (shot === 'serve') {
    world.phase = 'playing';
    world.shiftLeft = 74;
    world.score = 890;
    world.coins = 890;
    world.combo = 3;
    world.served = 8;
    world.orders = [
      { id: 1, recipeId: 'burger', patience: 30, maxPatience: 48 },
      { id: 2, recipeId: 'salad', patience: 18, maxPatience: 44 },
    ];
    world.chef.x = 950;
    world.chef.y = 470;
    world.chef.carry = [];
    const plates = stationById(world, 'plates');
    plates.plate = null;
    world.popups.push({ x: 1120, y: 520, text: '+145 Burger Klasik!', color: '#ffd166', t: 0, life: 2.5 });
    world.popups.push({ x: 640, y: 250, text: 'Kombo ×3!', color: '#7ee081', t: 0, life: 2.5 });
  }
  world.time = 1;
  // Let one update settle, then signal the screenshot driver.
  setTimeout(() => { window.__shotReady = true; }, 450);
}

function handleKeys() {
  if (input.wasPressed('enter') || input.wasPressed(' ')) {
    if (world.phase === 'title') startGame();
    else if (world.phase === 'over') startGame();
  }
  if (input.wasPressed('p') || input.wasPressed('escape')) {
    if (world.phase === 'playing' || world.phase === 'paused') togglePause();
  }
  if (input.wasPressed('r') && (world.phase === 'over' || world.phase === 'playing')) {
    startGame();
  }
  if (input.wasPressed('m')) {
    sfx.ensure();
    const muted = sfx.toggleMute();
    world.message = muted ? 'Suara mati (M untuk hidupkan)' : 'Suara hidup';
    world.messageT = 1.5;
  }
  if ((input.wasPressed('e') || input.wasPressed(' ')) && world.phase === 'playing') {
    sfx.ensure();
    interact(world, sfx);
  }
}

function handleMouse() {
  if (!input.consumeClick()) return;
  sfx.ensure();
  if (world.phase === 'title' || world.phase === 'over') {
    startGame();
    return;
  }
  if (world.phase === 'paused') {
    togglePause();
    return;
  }
  if (world.phase !== 'playing') return;
  // Clicking a station walks the chef's attention there: if it is near, use it.
  const hit = stationAtPoint(world, input.mouseX, input.mouseY);
  if (hit) {
    const near = nearestStation(world);
    if (near === hit) interact(world, sfx);
    else {
      world.message = `Dekati ${hit.label} dulu, lalu tekan E.`;
      world.messageT = 1.6;
    }
  }
}

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  handleKeys();
  handleMouse();
  if (world.phase === 'playing') {
    const { x, y } = input.axis();
    if (x !== 0 || y !== 0) moveChef(world, x, y, dt);
    updateWorld(world, dt, sfx);
  }
  drawWorld(ctx, world);
  input.endFrame();
  requestAnimationFrame(frame);
}

applyShotMode();
if (!new URLSearchParams(window.location.search).get('shot')) {
  window.__shotReady = true;
}
requestAnimationFrame(frame);
