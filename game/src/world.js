// Sizzle & Serve — game state and kitchen rules.
// One clear job: orders, stations, carrying, chopping, grilling, assembling, serving.

import {
  CHOP_SECONDS, GRILL_SECONDS, BURN_SECONDS, MAX_CARRY, MAX_HEARTS,
  MAX_ORDERS, SHIFT_SECONDS, START_ORDER_DELAY, MIN_ORDER_DELAY,
  START_PATIENCE, MIN_PATIENCE, SERVE_POINTS, WRONG_POINTS, MAX_COMBO,
  INGREDIENTS, RECIPES, recipeById,
} from './config.js';
import { makeRng, pickFrom } from './random.js';

export const CHEF_SPEED = 265;
export const CHEF_R = 26;

// Stations are rectangles the chef walks up to. `kind` decides the interaction.
export function buildStations() {
  return [
    { id: 'bun', label: 'Roti', kind: 'bin', item: 'bun', x: 60, y: 150, w: 120, h: 86 },
    { id: 'tomato', label: 'Tomat', kind: 'bin', item: 'tomato', x: 200, y: 150, w: 120, h: 86 },
    { id: 'lettuce', label: 'Selada', kind: 'bin', item: 'lettuce', x: 340, y: 150, w: 120, h: 86 },
    { id: 'cheese', label: 'Keju', kind: 'bin', item: 'cheese', x: 480, y: 150, w: 120, h: 86 },
    { id: 'patty', label: 'Daging', kind: 'bin', item: 'patty', x: 620, y: 150, w: 120, h: 86 },
    { id: 'grill', label: 'Panggangan', kind: 'grill', x: 800, y: 150, w: 190, h: 86, slots: [null, null] },
    { id: 'board', label: 'Talenan', kind: 'board', x: 1040, y: 150, w: 150, h: 86, chopping: null },
    { id: 'plates', label: 'Piring', kind: 'plates', x: 60, y: 560, w: 150, h: 96, plate: null },
    { id: 'trash', label: 'Sampah', kind: 'trash', x: 260, y: 580, w: 110, h: 76 },
    { id: 'serve', label: 'Jendela Saji', kind: 'serve', x: 1020, y: 560, w: 200, h: 96 },
  ];
}

export function stationById(world, id) {
  return world.stations.find((s) => s.id === id);
}

export function createWorld(seed) {
  return {
    rng: makeRng(seed || 20261125),
    phase: 'title', // title | playing | paused | over
    time: 0,
    shiftLeft: SHIFT_SECONDS,
    score: 0,
    coins: 0,
    combo: 0,
    bestCombo: 0,
    hearts: MAX_HEARTS,
    served: 0,
    failed: 0,
    chef: { x: 640, y: 430, facing: 1, carry: [], busy: 0, busyLabel: '' },
    stations: buildStations(),
    orders: [],
    orderTimer: START_ORDER_DELAY,
    orderCount: 0,
    particles: [],
    popups: [],
    flash: 0,
    message: '',
    messageT: 0,
    lastTickSecond: -1,
  };
}

export function difficultyAt(world) {
  const done = 1 - world.shiftLeft / SHIFT_SECONDS;
  return {
    delay: START_ORDER_DELAY + (MIN_ORDER_DELAY - START_ORDER_DELAY) * done,
    patience: START_PATIENCE + (MIN_PATIENCE - START_PATIENCE) * done,
  };
}

export function spawnOrder(world) {
  if (world.orders.length >= MAX_ORDERS) return;
  const d = difficultyAt(world);
  const recipe = pickFrom(world.rng, RECIPES);
  world.orders.push({
    id: world.orderCount + 1,
    recipeId: recipe.id,
    patience: d.patience,
    maxPatience: d.patience,
  });
  world.orderCount += 1;
}

export function nearestStation(world) {
  const c = world.chef;
  let best = null;
  let bestD = 110;
  for (const s of world.stations) {
    const cx = Math.max(s.x, Math.min(c.x, s.x + s.w));
    const cy = Math.max(s.y, Math.min(c.y, s.y + s.h));
    const dx = c.x - cx;
    const dy = c.y - cy;
    const d = Math.hypot(dx, dy);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

export function stationAtPoint(world, x, y) {
  return world.stations.find((s) => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) || null;
}

export function addPopup(world, x, y, text, color) {
  world.popups.push({ x, y, text, color: color || '#ffffff', t: 0, life: 1.4 });
}

export function addParticles(world, x, y, color, n) {
  for (let i = 0; i < n; i += 1) {
    const a = world.rng() * Math.PI * 2;
    const sp = 40 + world.rng() * 120;
    world.particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 40,
      t: 0,
      life: 0.5 + world.rng() * 0.5,
      color,
      r: 2 + world.rng() * 4,
    });
  }
}

function plateMatchesOrder(plate, order) {
  const recipe = recipeById(order.recipeId);
  if (!recipe || plate.length !== recipe.needs.length) return false;
  const have = plate.slice().sort().join(',');
  const want = recipe.needs.slice().sort().join(',');
  return have === want;
}

function plateMatchesAnyOrder(world, plate) {
  return world.orders.find((o) => plateMatchesOrder(plate, o)) || null;
}

function setMessage(world, text) {
  world.message = text;
  world.messageT = 2.2;
}

// The chef's hands: take an item from a bin, a grill slot or the board.
export function interact(world, sfx) {
  const worldRef = world;
  const chef = worldRef.chef;
  const near = nearestStation(worldRef);
  if (!near || chef.busy > 0) return;

  if (near.kind === 'bin') {
    if (chef.carry.length >= MAX_CARRY) {
      setMessage(worldRef, 'Tangan penuh! Sajikan atau buang dulu.');
      return;
    }
    chef.carry.push(near.item);
    sfx.pickup();
    return;
  }

  if (near.kind === 'grill') {
    const slot = near.slots.findIndex((s) => s && s.state === 'cooked');
    if (slot >= 0) {
      if (chef.carry.length >= MAX_CARRY) {
        setMessage(worldRef, 'Tangan penuh!');
        return;
      }
      chef.carry.push('patty_cooked');
      near.slots[slot] = null;
      sfx.pickup();
      return;
    }
    const raw = chef.carry.indexOf('patty');
    if (raw >= 0) {
      const free = near.slots.findIndex((s) => s === null);
      if (free < 0) {
        setMessage(worldRef, 'Panggangan penuh!');
        return;
      }
      chef.carry.splice(raw, 1);
      near.slots[free] = { state: 'cooking', t: 0 };
      sfx.grillOn();
      return;
    }
    const burnt = near.slots.findIndex((s) => s && s.state === 'burnt');
    if (burnt >= 0) {
      near.slots[burnt] = null;
      sfx.drop();
      setMessage(worldRef, 'Daging gosong dibuang.');
      return;
    }
    setMessage(worldRef, 'Bawa daging mentah ke panggangan.');
    return;
  }

  if (near.kind === 'board') {
    if (near.chopping) {
      setMessage(worldRef, 'Masih dicincang… sabar!');
      return;
    }
    const idx = chef.carry.findIndex((it) => {
      const base = INGREDIENTS[it];
      return base && base.chop;
    });
    if (idx < 0) {
      setMessage(worldRef, 'Bawa tomat atau selada ke talenan.');
      return;
    }
    const item = chef.carry.splice(idx, 1)[0];
    near.chopping = { item, t: 0 };
    chef.busy = CHOP_SECONDS;
    chef.busyLabel = 'Mencincang…';
    sfx.chop();
    return;
  }

  if (near.kind === 'plates') {
    if (!near.plate) {
      near.plate = [];
      sfx.pickup();
      setMessage(worldRef, 'Piring baru — susun pesanan di sini.');
      return;
    }
    if (chef.carry.length === 0) {
      setMessage(worldRef, 'Piring kosong — ambil bahan dulu.');
      return;
    }
    const item = chef.carry.shift();
    near.plate.push(item);
    sfx.drop();
    addParticles(worldRef, near.x + near.w / 2, near.y + 30, '#ffd166', 6);
    return;
  }

  if (near.kind === 'trash') {
    if (chef.carry.length === 0 && !(near.plate && near.plate.length > 0)) {
      setMessage(worldRef, 'Tidak ada yang dibuang.');
      return;
    }
    if (chef.carry.length > 0) {
      chef.carry.pop();
      sfx.drop();
      setMessage(worldRef, 'Dibuang ke sampah.');
      return;
    }
    return;
  }

  if (near.kind === 'serve') {
    const plates = stationById(worldRef, 'plates');
    if (!plates.plate || plates.plate.length === 0) {
      setMessage(worldRef, 'Bawa piring yang sudah disusun ke sini!');
      return;
    }
    const order = plateMatchesAnyOrder(worldRef, plates.plate);
    if (!order) {
      worldRef.score = Math.max(0, worldRef.score - WRONG_POINTS);
      worldRef.combo = 0;
      worldRef.failed += 1;
      addPopup(worldRef, near.x + near.w / 2, near.y - 10, 'SALAH RACIKAN! -50', '#ff6b5e');
      sfx.wrong();
      plates.plate = null;
      return;
    }
    const recipe = recipeById(order.recipeId);
    worldRef.combo = Math.min(MAX_COMBO, worldRef.combo + 1);
    worldRef.bestCombo = Math.max(worldRef.bestCombo, worldRef.combo);
    const gained = recipe.price + (worldRef.combo - 1) * 25;
    worldRef.score += gained;
    worldRef.coins += gained;
    worldRef.served += 1;
    addPopup(worldRef, near.x + near.w / 2, near.y - 10, `+${gained} ${recipe.name}!`, '#ffd166');
    addParticles(worldRef, near.x + near.w / 2, near.y + 40, '#ffd166', 18);
    addParticles(worldRef, near.x + near.w / 2, near.y + 40, '#7ee081', 10);
    sfx.serve();
    worldRef.orders = worldRef.orders.filter((o) => o.id !== order.id);
    plates.plate = null;
  }
}

// Take a finished chopped item off the board when chopping completes.
function finishChopping(world, sfx) {
  const board = stationById(world, 'board');
  if (!board.chopping) return;
  const item = board.chopping.item;
  board.chopping = null;
  if (world.chef.carry.length < MAX_CARRY) {
    world.chef.carry.push(`${item}_chopped`);
    sfx.chopped();
    addParticles(world, board.x + board.w / 2, board.y + 30, '#a3e635', 8);
  } else {
    setMessage(world, 'Tangan penuh — bahan cincang jatuh ke lantai!');
    sfx.wrong();
  }
}

export function updateWorld(world, dt, sfx) {
  world.time += dt;
  if (world.phase !== 'playing') return;

  // Shift timer.
  world.shiftLeft = Math.max(0, world.shiftLeft - dt);
  const whole = Math.ceil(world.shiftLeft);
  if (whole <= 10 && whole !== world.lastTickSecond && whole > 0) {
    world.lastTickSecond = whole;
    sfx.tick();
  }
  if (world.shiftLeft <= 0) {
    world.phase = 'over';
    sfx.gameOver();
    sfx.stopSizzle();
    return;
  }

  // Orders arrive on a schedule that tightens as the shift goes on.
  world.orderTimer -= dt;
  if (world.orderTimer <= 0) {
    spawnOrder(world);
    world.orderTimer = difficultyAt(world).delay;
  }

  // Patience drains; an expired order costs a heart.
  for (const o of world.orders) o.patience -= dt;
  const expired = world.orders.filter((o) => o.patience <= 0);
  if (expired.length > 0) {
    world.orders = world.orders.filter((o) => o.patience > 0);
    world.hearts -= expired.length;
    world.combo = 0;
    world.failed += expired.length;
    world.flash = 0.5;
    sfx.expire();
    setMessage(world, expired.length > 1 ? `${expired.length} pesanan hangus!` : 'Pesanan hangus! Pelanggan pergi.');
    if (world.hearts <= 0) {
      world.hearts = 0;
      world.phase = 'over';
      sfx.gameOver();
      sfx.stopSizzle();
      return;
    }
  }

  // Chopping progress.
  const board = stationById(world, 'board');
  if (board.chopping) {
    board.chopping.t += dt;
    if (board.chopping.t >= CHOP_SECONDS) finishChopping(world, sfx);
  }
  if (world.chef.busy > 0) {
    world.chef.busy = Math.max(0, world.chef.busy - dt);
    if (world.chef.busy === 0) world.chef.busyLabel = '';
  }

  // Grill progress: cooking -> cooked -> burnt.
  const grill = stationById(world, 'grill');
  let anyCooking = false;
  for (const slot of grill.slots) {
    if (!slot) continue;
    slot.t += dt;
    if (slot.state === 'cooking' && slot.t >= GRILL_SECONDS) {
      slot.state = 'cooked';
      slot.t = 0;
      sfx.cooked();
      addParticles(world, grill.x + grill.w / 2, grill.y + 30, '#ffb703', 8);
    } else if (slot.state === 'cooked' && slot.t >= BURN_SECONDS) {
      slot.state = 'burnt';
      sfx.burnt();
    }
    if (slot.state === 'cooking') anyCooking = true;
  }
  if (anyCooking) sfx.startSizzle();
  else sfx.stopSizzle();

  // Particles, popups, message and flash decay.
  for (const p of world.particles) {
    p.t += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 160 * dt;
  }
  world.particles = world.particles.filter((p) => p.t < p.life);
  for (const p of world.popups) {
    p.t += dt;
    p.y -= 34 * dt;
  }
  world.popups = world.popups.filter((p) => p.t < p.life);
  if (world.messageT > 0) world.messageT -= dt;
  if (world.flash > 0) world.flash -= dt;
}

export function moveChef(world, dx, dy, dt) {
  const chef = world.chef;
  if (chef.busy > 0) return;
  chef.x += dx * CHEF_SPEED * dt;
  chef.y += dy * CHEF_SPEED * dt;
  if (dx !== 0) chef.facing = dx > 0 ? 1 : -1;
  // Keep the chef inside the kitchen floor, below the top counters.
  chef.x = Math.max(40, Math.min(1240, chef.x));
  chef.y = Math.max(268, Math.min(690, chef.y));
  // The chef cannot walk through station counters.
  for (const s of world.stations) {
    const cx = Math.max(s.x, Math.min(chef.x, s.x + s.w));
    const cy = Math.max(s.y, Math.min(chef.y, s.y + s.h));
    const ddx = chef.x - cx;
    const ddy = chef.y - cy;
    const d = Math.hypot(ddx, ddy);
    if (d < CHEF_R && d > 0.001) {
      chef.x = cx + (ddx / d) * CHEF_R;
      chef.y = cy + (ddy / d) * CHEF_R;
    }
  }
}

export function resetWorld(world) {
  const fresh = createWorld(20261125 + Math.floor(Math.random() * 1000));
  Object.keys(fresh).forEach((k) => { world[k] = fresh[k]; });
  world.phase = 'playing';
}
