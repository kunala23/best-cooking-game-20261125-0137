// Sizzle & Serve — all canvas drawing: kitchen, orders, chef, food and overlays.
// One clear job: turn the world state into pictures, nothing else.

import {
  VIEW_W, VIEW_H, CHOP_SECONDS, GRILL_SECONDS, BURN_SECONDS,
  PALETTE, RECIPES, recipeById, ingredientLabel, ingredientColor,
} from './config.js';
import { stationById, nearestStation, CHEF_R } from './world.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align, weight) {
  ctx.fillStyle = color;
  ctx.font = `${weight || 'bold'} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function bar(ctx, x, y, w, h, frac, fill, back) {
  ctx.fillStyle = back || 'rgba(0,0,0,0.35)';
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = fill;
    roundRect(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2);
    ctx.fill();
  }
}

function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// Draw one ingredient as a little readable icon. Used on counters, in hands and on tickets.
export function drawFoodIcon(ctx, id, x, y, size) {
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (id === 'bun') {
    ctx.fillStyle = '#e8a95c';
    ctx.beginPath();
    ctx.arc(0, 2, s * 0.95, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#c98a3e';
    ctx.fillRect(-s * 0.95, 2, s * 1.9, s * 0.35);
    ctx.fillStyle = '#fff2cf';
    for (const dx of [-0.45, 0, 0.45]) {
      ctx.beginPath();
      ctx.arc(dx * s, -s * 0.45, s * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'patty') {
    ctx.fillStyle = '#a5552f';
    roundRect(ctx, -s, -s * 0.45, s * 2, s * 0.9, s * 0.4);
    ctx.fill();
    ctx.fillStyle = '#7a3d1e';
    for (const dx of [-0.5, 0.1, 0.55]) {
      ctx.beginPath();
      ctx.arc(dx * s, 0, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'patty_cooked') {
    ctx.fillStyle = '#7a3d1e';
    roundRect(ctx, -s, -s * 0.45, s * 2, s * 0.9, s * 0.4);
    ctx.fill();
    ctx.fillStyle = '#5d2c12';
    for (const dx of [-0.5, 0.1, 0.55]) {
      ctx.beginPath();
      ctx.arc(dx * s, 0, s * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#ffb703';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, -s * 0.6);
    ctx.lineTo(-s * 0.3, -s * 0.9);
    ctx.moveTo(s * 0.2, -s * 0.6);
    ctx.lineTo(s * 0.5, -s * 0.95);
    ctx.stroke();
  } else if (id === 'patty_burnt') {
    ctx.fillStyle = '#241a12';
    roundRect(ctx, -s, -s * 0.45, s * 2, s * 0.9, s * 0.4);
    ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-s * 0.4, -s * 0.8);
    ctx.lineTo(-s * 0.1, -s * 1.1);
    ctx.moveTo(s * 0.3, -s * 0.8);
    ctx.lineTo(s * 0.6, -s * 1.05);
    ctx.stroke();
  } else if (id === 'tomato' || id === 'tomato_chopped') {
    if (id === 'tomato') {
      ctx.fillStyle = '#e84a3a';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.95, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a8a2a';
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.8);
      ctx.lineTo(-s * 0.35, -s * 1.15);
      ctx.lineTo(s * 0.35, -s * 1.15);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.arc(-s * 0.35, -s * 0.35, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Tomato slice: red disc, pale flesh ring, three seed dots.
      ctx.fillStyle = '#e84a3a';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.95, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2705f';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.68, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd9d2';
      for (const [dx, dy] of [[-0.35, 0], [0.35, 0], [0, -0.35]]) {
        ctx.beginPath();
        ctx.ellipse(dx * s, dy * s, s * 0.13, s * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (id === 'lettuce' || id === 'lettuce_chopped') {
    ctx.fillStyle = '#5fbf4a';
    if (id === 'lettuce') {
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.95, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3a8a2a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.55, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Shredded lettuce: three wavy strips, two greens.
      const greens = ['#5fbf4a', '#7ed957', '#4aa838'];
      for (let i = 0; i < 3; i += 1) {
        ctx.save();
        ctx.translate((i - 1) * s * 0.55, (i % 2 ? 4 : -4));
        ctx.rotate((i - 1) * 0.35);
        ctx.fillStyle = greens[i];
        roundRect(ctx, -s * 0.42, -s * 0.18, s * 0.84, s * 0.36, s * 0.18);
        ctx.fill();
        ctx.restore();
      }
    }
  } else if (id === 'cheese') {
    ctx.fillStyle = '#ffc93c';
    ctx.beginPath();
    ctx.moveTo(-s, s * 0.6);
    ctx.lineTo(s, s * 0.6);
    ctx.lineTo(0, -s * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d99a12';
    for (const [dx, dy] of [[-0.3, 0.2], [0.25, 0.3], [0, -0.3]]) {
      ctx.beginPath();
      ctx.arc(dx * s, dy * s, s * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawStationBase(ctx, s, near) {
  ctx.fillStyle = near ? '#ffe9b0' : PALETTE.counterTop;
  roundRect(ctx, s.x, s.y, s.w, s.h, 10);
  ctx.fill();
  ctx.strokeStyle = near ? '#ffb703' : '#6e4423';
  ctx.lineWidth = near ? 4 : 2;
  ctx.stroke();
  text(ctx, s.label, s.x + s.w / 2, s.y + s.h - 12, 13, PALETTE.ink, 'center', 'bold');
}

function drawStations(ctx, world) {
  const near = nearestStation(world);
  for (const s of world.stations) {
    const isNear = near === s;
    if (s.kind === 'bin') {
      drawStationBase(ctx, s, isNear);
      drawFoodIcon(ctx, s.item, s.x + s.w / 2, s.y + s.h / 2 - 8, 46);
    } else if (s.kind === 'grill') {
      ctx.fillStyle = '#3a3f45';
      roundRect(ctx, s.x, s.y, s.w, s.h, 10);
      ctx.fill();
      ctx.strokeStyle = isNear ? '#ffb703' : '#222';
      ctx.lineWidth = isNear ? 4 : 2;
      ctx.stroke();
      s.slots.forEach((slot, i) => {
        const cx = s.x + 48 + i * 94;
        const cy = s.y + 32;
        ctx.fillStyle = '#1d2126';
        roundRect(ctx, cx - 38, cy - 24, 76, 48, 8);
        ctx.fill();
        if (slot) {
          if (slot.state === 'cooking') {
            drawFoodIcon(ctx, 'patty', cx, cy, 40);
            bar(ctx, cx - 30, cy + 26, 60, 7, slot.t / GRILL_SECONDS, '#ff8c42');
          } else if (slot.state === 'cooked') {
            drawFoodIcon(ctx, 'patty_cooked', cx, cy, 40);
            bar(ctx, cx - 30, cy + 26, 60, 7, 1 - slot.t / BURN_SECONDS, '#ffb703');
          } else {
            drawFoodIcon(ctx, 'patty_burnt', cx, cy, 40);
          }
        }
      });
      text(ctx, 'Panggangan', s.x + s.w / 2, s.y + s.h - 12, 13, '#fff', 'center', 'bold');
    } else if (s.kind === 'board') {
      drawStationBase(ctx, s, isNear);
      ctx.fillStyle = '#a9743f';
      roundRect(ctx, s.x + 18, s.y + 10, s.w - 36, 44, 8);
      ctx.fill();
      if (s.chopping) {
        drawFoodIcon(ctx, `${s.chopping.item}_chopped`, s.x + s.w / 2, s.y + 32, 40);
        bar(ctx, s.x + 20, s.y + 58, s.w - 40, 8, s.chopping.t / CHOP_SECONDS, '#5fbf4a');
      } else {
        ctx.strokeStyle = '#7d5230';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s.x + 40, s.y + 32);
        ctx.lineTo(s.x + s.w - 40, s.y + 32);
        ctx.stroke();
      }
    } else if (s.kind === 'plates') {
      drawStationBase(ctx, s, isNear);
      ctx.fillStyle = '#f4f6f8';
      ctx.beginPath();
      ctx.ellipse(s.x + s.w / 2, s.y + 40, 52, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#9aa5ad';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (s.plate && s.plate.length > 0) {
        s.plate.forEach((item, i) => {
          drawFoodIcon(ctx, item, s.x + s.w / 2, s.y + 34 - i * 10, 34);
        });
      } else {
        text(ctx, 'piring kosong', s.x + s.w / 2, s.y + 40, 11, '#7e8b95', 'center', 'bold');
      }
    } else if (s.kind === 'trash') {
      ctx.fillStyle = '#5b6b76';
      roundRect(ctx, s.x, s.y, s.w, s.h, 10);
      ctx.fill();
      ctx.strokeStyle = isNear ? '#ffb703' : '#33414a';
      ctx.lineWidth = isNear ? 4 : 2;
      ctx.stroke();
      text(ctx, '🗑', s.x + s.w / 2, s.y + 30, 26, '#fff');
      text(ctx, 'Sampah', s.x + s.w / 2, s.y + s.h - 12, 13, '#fff', 'center', 'bold');
    } else if (s.kind === 'serve') {
      ctx.fillStyle = '#2f6f4f';
      roundRect(ctx, s.x, s.y, s.w, s.h, 10);
      ctx.fill();
      ctx.strokeStyle = isNear ? '#ffd166' : '#1d4a33';
      ctx.lineWidth = isNear ? 4 : 2;
      ctx.stroke();
      text(ctx, '🍽  SAJIKAN', s.x + s.w / 2, s.y + 34, 22, '#fff', 'center', 'bold');
      text(ctx, 'antar piring ke sini', s.x + s.w / 2, s.y + 62, 12, '#cfeeda', 'center', 'bold');
      text(ctx, 'Jendela Saji', s.x + s.w / 2, s.y + s.h - 12, 13, '#fff', 'center', 'bold');
    }
  }
}

function drawOrderBoard(ctx, world) {
  ctx.fillStyle = PALETTE.wallTop;
  roundRect(ctx, 12, 8, 880, 96, 12);
  ctx.fill();
  ctx.fillStyle = '#5a3418';
  roundRect(ctx, 12, 8, 880, 96, 12);
  ctx.stroke();
  text(ctx, '📋 PAPAN PESANAN', 28, 30, 15, '#ffe9b0', 'left', 'bold');
  if (world.orders.length === 0) {
    text(ctx, 'Belum ada pesanan — siapkan dapurmu!', 200, 68, 16, '#ffe9b0', 'left', 'bold');
  }
  world.orders.forEach((o, i) => {
    const recipe = recipeById(o.recipeId);
    const x = 190 + i * 178;
    const y = 16;
    const w = 168;
    const h = 80;
    const urgent = o.patience < 12;
    ctx.fillStyle = urgent ? '#ffe1de' : PALETTE.board;
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = urgent ? '#d9382b' : '#b98d4f';
    ctx.lineWidth = urgent ? 3 : 2;
    ctx.stroke();
    text(ctx, recipe.name, x + w / 2, y + 14, 13, PALETTE.ink, 'center', 'bold');
    recipe.needs.forEach((need, j) => {
      drawFoodIcon(ctx, need, x + 26 + j * 46, y + 42, 34);
    });
    const frac = Math.max(0, o.patience / o.maxPatience);
    bar(ctx, x + 10, y + 64, w - 20, 7, frac, urgent ? '#d9382b' : '#3f9e3a');
  });
}

function drawHud(ctx, world) {
  const x0 = 908;
  ctx.fillStyle = 'rgba(46,29,16,0.85)';
  roundRect(ctx, x0, 8, 360, 96, 12);
  ctx.fill();
  const urgent = world.shiftLeft <= 30;
  text(ctx, `⏱ ${formatTime(world.shiftLeft)}`, x0 + 14, 36, 30, urgent ? '#ff8a7a' : '#fff', 'left', 'bold');
  text(ctx, `Skor ${world.score}`, x0 + 14, 70, 17, '#ffd166', 'left', 'bold');
  text(ctx, `Koin ${world.coins}`, x0 + 150, 70, 17, '#ffd166', 'left', 'bold');
  text(ctx, `Combo ×${Math.max(1, world.combo)}`, x0 + 258, 70, 17, world.combo >= 3 ? '#7ee081' : '#fff', 'left', 'bold');
  let hearts = '';
  for (let i = 0; i < 3; i += 1) hearts += i < world.hearts ? '❤' : '🤍';
  text(ctx, hearts, x0 + 258, 36, 20, '#fff', 'left', 'bold');
  text(ctx, `Disajikan: ${world.served}`, x0 + 14, 92, 13, '#cfeeda', 'left', 'bold');
}

function drawChef(ctx, world) {
  const c = world.chef;
  const bob = world.phase === 'playing' && c.busy <= 0 ? Math.sin(world.time * 8) * 2 : 0;
  ctx.save();
  ctx.translate(c.x, c.y + bob);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 24, 26, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body (apron).
  ctx.fillStyle = '#f2f2f2';
  roundRect(ctx, -20, -6, 40, 34, 12);
  ctx.fill();
  ctx.fillStyle = '#3f6fb5';
  ctx.fillRect(-20, 12, 40, 8);
  // Head.
  ctx.fillStyle = '#f2c79b';
  ctx.beginPath();
  ctx.arc(0, -18, 15, 0, Math.PI * 2);
  ctx.fill();
  // Chef hat.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-8, -32, 9, 0, Math.PI * 2);
  ctx.arc(0, -36, 10, 0, Math.PI * 2);
  ctx.arc(8, -32, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-14, -34, 28, 8);
  // Eyes look where the chef faces.
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(c.facing * 4 - 5, -18, 2, 0, Math.PI * 2);
  ctx.arc(c.facing * 4 + 5, -18, 2, 0, Math.PI * 2);
  ctx.fill();
  // Carried ingredients float above the hat.
  c.carry.forEach((item, i) => {
    drawFoodIcon(ctx, item, -16 + i * 32, -58, 30);
  });
  if (c.busy > 0) {
    text(ctx, c.busyLabel, 0, -78, 13, '#fff', 'center', 'bold');
    bar(ctx, -24, -72, 48, 6, 1 - c.busy / CHOP_SECONDS, '#7ee081');
  }
  ctx.restore();
}

function drawFloorDeco(ctx, world) {
  // Tile grid.
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x < VIEW_W; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 112);
    ctx.lineTo(x, VIEW_H);
    ctx.stroke();
  }
  for (let y = 112; y < VIEW_H; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(VIEW_W, y);
    ctx.stroke();
  }
  // Loose ingredients waiting on the middle counter, for the eye.
  const counter = { x: 430, y: 300, w: 420, h: 60 };
  ctx.fillStyle = PALETTE.counterTop;
  roundRect(ctx, counter.x, counter.y, counter.w, counter.h, 10);
  ctx.fill();
  ctx.strokeStyle = '#6e4423';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, 'Meja Racik', counter.x + counter.w / 2, counter.y + counter.h - 10, 12, PALETTE.ink, 'center', 'bold');
  const demo = ['tomato', 'lettuce', 'cheese', 'bun'];
  demo.forEach((id, i) => {
    drawFoodIcon(ctx, id, counter.x + 60 + i * 100, counter.y + 26, 40);
  });
  void world;
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPopups(ctx, world) {
  for (const p of world.popups) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
    text(ctx, p.text, p.x, p.y, 22, p.color, 'center', 'bold');
  }
  ctx.globalAlpha = 1;
}

function drawMessage(ctx, world) {
  if (world.messageT > 0) {
    ctx.fillStyle = 'rgba(46,29,16,0.9)';
    const w = ctx.measureText(world.message).width + 36;
    roundRect(ctx, VIEW_W / 2 - w / 2, 640, w, 34, 17);
    ctx.fill();
    text(ctx, world.message, VIEW_W / 2, 658, 15, '#ffe9b0', 'center', 'bold');
  }
}

function drawHint(ctx, world) {
  if (world.phase !== 'playing') return;
  const near = nearestStation(world);
  const hint = near ? `Tekan E / klik: ${near.label}` : 'WASD / panah: jalan  •  E / klik: pakai stasiun  •  P: jeda  •  M: suara';
  text(ctx, hint, VIEW_W / 2, 700, 14, 'rgba(255,243,214,0.95)', 'center', 'bold');
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(20,10,4,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#fff7e0';
  roundRect(ctx, 290, 130, 700, 460, 18);
  ctx.fill();
  ctx.strokeStyle = accent || '#ffb703';
  ctx.lineWidth = 4;
  ctx.stroke();
  text(ctx, title, 640, 180, 44, '#2e1d10', 'center', 'bold');
  lines.forEach((line, i) => {
    text(ctx, line.text, 640, 240 + i * 34, line.size || 18, line.color || '#2e1d10', 'center', line.weight || 'bold');
  });
}

export function drawWorld(ctx, world) {
  // Wall and floor.
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(0, 0, VIEW_W, 112);
  ctx.fillStyle = PALETTE.wallTop;
  ctx.fillRect(0, 104, VIEW_W, 8);
  ctx.fillStyle = PALETTE.floor;
  ctx.fillRect(0, 112, VIEW_W, VIEW_H - 112);
  drawFloorDeco(ctx, world);
  drawStations(ctx, world);
  drawChef(ctx, world);
  drawParticles(ctx, world);
  drawOrderBoard(ctx, world);
  drawHud(ctx, world);
  drawPopups(ctx, world);
  drawMessage(ctx, world);
  drawHint(ctx, world);

  if (world.flash > 0) {
    ctx.fillStyle = `rgba(217,56,43,${world.flash * 0.35})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  if (world.phase === 'title') {
    overlay(ctx, 'SIZZLE & SERVE', [
      { text: 'Dapur Kilat — masak cepat, sajikan tepat waktu!', size: 20 },
      { text: '', size: 12 },
      { text: 'WASD / panah — jalan   •   E / klik — ambil, cincang, panggang, sajikan', size: 17 },
      { text: 'Ambil bahan → cincang di talenan → panggang daging', size: 17 },
      { text: 'susun di piring → sajikan di jendela!', size: 17 },
      { text: 'Pesanan yang hangus mengurangi ❤. Shift 2:30 — sajikan sebanyak mungkin!', size: 17 },
      { text: '', size: 12 },
      { text: 'Tekan ENTER atau klik untuk mulai', size: 22, color: '#b3541e' },
      { text: 'P jeda  •  M suara  •  R ulang', size: 15, color: '#7a5a3a' },
    ]);
  } else if (world.phase === 'paused') {
    overlay(ctx, 'JEDA', [
      { text: 'Istirahat sebentar, dapur menunggumu.', size: 20 },
      { text: '', size: 12 },
      { text: 'Tekan P atau klik untuk lanjut', size: 20, color: '#b3541e' },
    ]);
  } else if (world.phase === 'over') {
    const best = world.served > 0 ? `Kombo terbaik ×${world.bestCombo}` : 'Belum ada yang tersaji — coba lagi!';
    overlay(ctx, 'SHIFT SELESAI!', [
      { text: `Skor akhir: ${world.score}   •   Koin: ${world.coins}`, size: 24 },
      { text: `Pesanan tersaji: ${world.served}   •   Gagal: ${world.failed}`, size: 18 },
      { text: best, size: 18 },
      { text: '', size: 12 },
      { text: 'Tekan R atau klik untuk main lagi', size: 22, color: '#b3541e' },
    ], '#3f9e3a');
  }
}
