import { WORLD, STATIONS, CUSTOMER_PALETTES } from './constants.js';
import {
  gameState,
  takeSlimeForCustomer,
  recordSale,
  getPriceEvaluation,
  formatMoney,
} from './state.js';

const PLAYER_SPEED = 220;
const CUSTOMER_SPEED = 105;
const PLAYER_RADIUS = 16;

let nextCustomerId = 1;

export function spawnFloatingText(x, y, text, color = '#16a34a') {
  gameState.floatingTexts.push({
    x,
    y,
    text,
    color,
    life: 1.5,
    maxLife: 1.5,
  });
}

export function spawnSparkles(x, y, count = 10) {
  const colors = ['#ff8fab', '#72efdd', '#ffe066', '#c77dff', '#4ade80'];
  for (let i = 0; i < count; i++) {
    const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const spd = 35 + Math.random() * 55;
    gameState.sparkles.push({
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 20,
      r: 2.5 + Math.random() * 2.5,
      color: colors[i % colors.length],
      life: 0.7 + Math.random() * 0.35,
      maxLife: 1.0,
    });
  }
}

export function getStationInteractPoint(station) {
  if (station.placement === 'wall-side') {
    const onLeft = station.x < WORLD.width / 2;
    return {
      x: onLeft ? station.x + station.w + 26 : station.x - 26,
      y: station.y + station.h * 0.55,
    };
  }
  // Stand in front (below) back wall shelves or middle stands; above bottom stations
  if (station.y > 470) {
    return {
      x: station.x + station.w / 2,
      y: station.y - 24,
    };
  }
  return {
    x: station.x + station.w / 2,
    y: station.y + station.h + 26,
  };
}

function resolveCollision(entity, radius) {
  // Room bounds
  entity.x = Math.max(WORLD.wallLeft + radius, Math.min(WORLD.wallRight - radius, entity.x));
  entity.y = Math.max(WORLD.wallTop + radius, Math.min(WORLD.wallBottom - radius, entity.y));

  // Push out of station rectangles
  for (const s of STATIONS) {
    const padYTop = s.y + 4;
    const padYBot = s.y + s.h;
    const closestX = Math.max(s.x, Math.min(entity.x, s.x + s.w));
    const closestY = Math.max(padYTop, Math.min(entity.y, padYBot));
    const dx = entity.x - closestX;
    const dy = entity.y - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq < radius * radius) {
      const dist = Math.sqrt(distSq) || 0.001;
      const overlap = radius - dist;
      entity.x += (dx / dist) * overlap;
      entity.y += (dy / dist) * overlap;
    }
  }
}

export function updateSimulation(dt, keys, callbacks) {
  gameState.time += dt;

  updatePlayer(dt, keys, callbacks);
  updateCustomers(dt, callbacks);
  updateEffects(dt);
}

function updatePlayer(dt, keys, callbacks) {
  const p = gameState.player;
  let dx = 0;
  let dy = 0;

  if (keys.has('KeyW') || keys.has('ArrowUp')) dy -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) dy += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) dx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) dx += 1;

  if (dx !== 0 || dy !== 0) {
    // Manual keyboard input cancels click-to-move target
    p.targetX = null;
    p.targetY = null;
    p.pendingInteractId = null;
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
    p.x += dx * PLAYER_SPEED * dt;
    p.y += dy * PLAYER_SPEED * dt;
    p.walkPhase += dt * 11;
    updateFacing(p, dx, dy);
  } else if (p.targetX !== null && p.targetY !== null) {
    const tdx = p.targetX - p.x;
    const tdy = p.targetY - p.y;
    const dist = Math.hypot(tdx, tdy);
    if (dist < 10) {
      p.targetX = null;
      p.targetY = null;
      p.walkPhase = 0;
      if (p.pendingInteractId) {
        const stationId = p.pendingInteractId;
        p.pendingInteractId = null;
        callbacks.onInteractStation(stationId);
      }
    } else {
      const mx = tdx / dist;
      const my = tdy / dist;
      p.x += mx * PLAYER_SPEED * dt;
      p.y += my * PLAYER_SPEED * dt;
      p.walkPhase += dt * 11;
      updateFacing(p, mx, my);
    }
  } else {
    p.walkPhase = 0;
  }

  resolveCollision(p, PLAYER_RADIUS);

  // Find closest nearby station for E-key interaction
  let nearestId = null;
  let nearestDist = 78;
  for (const s of STATIONS) {
    const cx = Math.max(s.x, Math.min(p.x, s.x + s.w));
    const cy = Math.max(s.y, Math.min(p.y, s.y + s.h));
    const d = Math.hypot(p.x - cx, p.y - cy);
    if (d < nearestDist) {
      nearestDist = d;
      nearestId = s.id;
    }
  }
  gameState.nearbyStationId = nearestId;
}

function updateFacing(entity, dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) {
    entity.facing = dx < 0 ? 'left' : 'right';
  } else {
    entity.facing = dy < 0 ? 'up' : 'down';
  }
}

function getStockedStands() {
  const result = [];
  for (const s of STATIONS) {
    if (s.type !== 'stand') continue;
    const slots = gameState.persisted.shelves[s.id] || [];
    const occupiedIndices = [];
    slots.forEach((item, idx) => {
      if (item) occupiedIndices.push(idx);
    });
    if (occupiedIndices.length > 0) {
      result.push({ station: s, occupiedIndices });
    }
  }
  return result;
}

function spawnCustomer() {
  const palette = CUSTOMER_PALETTES[Math.floor(Math.random() * CUSTOMER_PALETTES.length)];
  const gender = Math.random() < 0.55 ? 'female' : 'male';
  const stocked = getStockedStands();
  const standStations = STATIONS.filter((s) => s.type === 'stand');
  const chosen = stocked.length > 0
    ? stocked[Math.floor(Math.random() * stocked.length)].station
    : standStations[Math.floor(Math.random() * standStations.length)];

  const target = getStationInteractPoint(chosen);

  gameState.customers.push({
    id: nextCustomerId++,
    x: WORLD.doorX + (Math.random() - 0.5) * 34,
    y: WORLD.wallBottom - 6,
    facing: 'up',
    walkPhase: 0,
    gender,
    palette,
    state: 'to_stand', // 'to_stand' | 'browsing' | 'to_checkout' | 'paying' | 'leaving'
    targetStationId: chosen.id,
    targetX: target.x + (Math.random() - 0.5) * 26,
    targetY: target.y,
    waitTimer: 0,
    browseAttempts: 0,
    carriedSlime: null,
    thought: null,
  });
}

function updateCustomers(dt, callbacks) {
  // Spawn logic
  if (gameState.persisted.shopOpen && gameState.customers.length < 4) {
    gameState.spawnTimer -= dt;
    if (gameState.spawnTimer <= 0) {
      spawnCustomer();
      gameState.spawnTimer = 4.2 + Math.random() * 3.5;
    }
  }

  const checkout = STATIONS.find((s) => s.type === 'checkout');
  const checkoutPt = getStationInteractPoint(checkout);

  for (let i = gameState.customers.length - 1; i >= 0; i--) {
    const c = gameState.customers[i];

    if (c.state === 'to_stand' || c.state === 'to_checkout' || c.state === 'leaving') {
      const dx = c.targetX - c.x;
      const dy = c.targetY - c.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 10) {
        c.walkPhase = 0;
        if (c.state === 'to_stand') {
          c.state = 'browsing';
          c.waitTimer = 1.4 + Math.random() * 0.9;
          c.thought = '👀';
        } else if (c.state === 'to_checkout') {
          c.state = 'paying';
          c.waitTimer = 0.9;
          c.thought = '💳';
        } else if (c.state === 'leaving') {
          gameState.customers.splice(i, 1);
          continue;
        }
      } else {
        const mx = dx / dist;
        const my = dy / dist;
        c.x += mx * CUSTOMER_SPEED * dt;
        c.y += my * CUSTOMER_SPEED * dt;
        c.walkPhase += dt * 9;
        updateFacing(c, mx, my);
        if (c.state !== 'leaving') {
          resolveCollision(c, 13);
        }
      }
    } else if (c.state === 'browsing') {
      c.waitTimer -= dt;
      if (c.waitTimer <= 0) {
        const slots = gameState.persisted.shelves[c.targetStationId] || [];
        const available = [];
        slots.forEach((item, idx) => {
          if (item) available.push({ item, idx });
        });

        if (available.length > 0) {
          const pick = available[Math.floor(Math.random() * available.length)];
          const evalRes = getPriceEvaluation(pick.item.price, pick.item.suggestedPrice);

          if (Math.random() <= evalRes.buyChance) {
            const taken = takeSlimeForCustomer(c.targetStationId, pick.idx);
            if (taken) {
              c.carriedSlime = taken;
              c.thought = evalRes.label === 'Bargain!' ? '😍' : '😊';
              c.state = 'to_checkout';
              c.targetX = checkoutPt.x + (Math.random() - 0.5) * 34;
              c.targetY = checkoutPt.y;
              callbacks.onInventoryChanged();
              continue;
            }
          } else {
            c.thought = '💸';
          }
        } else {
          c.thought = '🤔';
        }

        // Try one more stocked stand before leaving
        c.browseAttempts += 1;
        const stocked = getStockedStands().filter((s) => s.station.id !== c.targetStationId);
        if (c.browseAttempts < 2 && stocked.length > 0) {
          const nextStand = stocked[Math.floor(Math.random() * stocked.length)].station;
          const pt = getStationInteractPoint(nextStand);
          c.targetStationId = nextStand.id;
          c.targetX = pt.x;
          c.targetY = pt.y;
          c.state = 'to_stand';
        } else {
          c.state = 'leaving';
          c.targetX = WORLD.doorX;
          c.targetY = WORLD.wallBottom + 16;
        }
      }
    } else if (c.state === 'paying') {
      c.waitTimer -= dt;
      if (c.waitTimer <= 0) {
        if (c.carriedSlime) {
          recordSale(c.carriedSlime);
          spawnFloatingText(c.x, c.y - 62, `+${formatMoney(c.carriedSlime.price)}`, '#16a34a');
          spawnSparkles(c.x, c.y - 36, 12);
          callbacks.onSaleCompleted(c.carriedSlime);
        }
        c.thought = '💖';
        c.state = 'leaving';
        c.targetX = WORLD.doorX;
        c.targetY = WORLD.wallBottom + 16;
      }
    }
  }
}

function updateEffects(dt) {
  for (let i = gameState.floatingTexts.length - 1; i >= 0; i--) {
    const ft = gameState.floatingTexts[i];
    ft.y -= 28 * dt;
    ft.life -= dt;
    if (ft.life <= 0) gameState.floatingTexts.splice(i, 1);
  }

  for (let i = gameState.sparkles.length - 1; i >= 0; i--) {
    const s = gameState.sparkles[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vy += 90 * dt;
    s.life -= dt;
    if (s.life <= 0) gameState.sparkles.splice(i, 1);
  }
}
