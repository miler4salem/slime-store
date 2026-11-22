import { WORLD, STATIONS, CUSTOMER_PALETTES } from './constants.js';
import {
  gameState,
  takeSlimeForCustomer,
  returnSlimeToStore,
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

// Clear aisle grid intersections (guaranteed unobstructed between wall shelves and 2x2 middle islands)
const AISLE_XS = [186, 520, 854];
const AISLE_YS = [206, 368, 492];

function isSegmentClear(ax, ay, bx, by, pad = 16) {
  const steps = Math.max(4, Math.ceil(Math.hypot(bx - ax, by - ay) / 14));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = ax + (bx - ax) * t;
    const py = ay + (by - ay) * t;
    for (const s of STATIONS) {
      if (
        px >= s.x - pad &&
        px <= s.x + s.w + pad &&
        py >= s.y - pad + 4 &&
        py <= s.y + s.h + pad
      ) {
        return false;
      }
    }
  }
  return true;
}

function nearestAisleIndex(val, arr) {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < arr.length; i++) {
    const d = Math.abs(val - arr[i]);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/**
 * Build a short obstacle-free list of waypoints along the store aisles.
 */
function buildAislePath(fromX, fromY, toX, toY) {
  if (isSegmentClear(fromX, fromY, toX, toY, 15)) {
    return [{ x: toX, y: toY }];
  }

  const startCol = nearestAisleIndex(fromX, AISLE_XS);
  const startRow = nearestAisleIndex(fromY, AISLE_YS);
  const endCol = nearestAisleIndex(toX, AISLE_XS);
  const endRow = nearestAisleIndex(toY, AISLE_YS);

  const pts = [];
  // Enter nearest aisle node
  const p0 = { x: AISLE_XS[startCol], y: AISLE_YS[startRow] };
  pts.push(p0);

  // Move along row or column to reach target aisle intersection
  if (startCol !== endCol) {
    pts.push({ x: AISLE_XS[endCol], y: AISLE_YS[startRow] });
  }
  if (startRow !== endRow) {
    pts.push({ x: AISLE_XS[endCol], y: AISLE_YS[endRow] });
  }

  pts.push({ x: toX, y: toY });
  return pts;
}

function setCustomerDestination(c, destX, destY) {
  c.waypoints = buildAislePath(c.x, c.y, destX, destY);
  c.stuckTimer = 0;
  c.lastCheckX = c.x;
  c.lastCheckY = c.y;
}

function sendCustomerToExit(c, thought = null) {
  c.state = 'leaving';
  if (thought !== null) c.thought = thought;
  setCustomerDestination(c, WORLD.doorX, WORLD.wallBottom + 18);
}

function getStockedStands(maxBudget = Infinity) {
  const result = [];
  for (const s of STATIONS) {
    if (s.type !== 'stand') continue;
    const slots = gameState.persisted.shelves[s.id] || [];
    const occupiedIndices = [];
    slots.forEach((item, idx) => {
      if (item && item.price <= maxBudget) occupiedIndices.push(idx);
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
  // Give each customer a realistic spending budget ($12 - $32)
  const budget = Math.round((12 + Math.random() * 20) * 2) / 2;

  const stocked = getStockedStands();
  const standStations = STATIONS.filter((s) => s.type === 'stand');
  const chosen = stocked.length > 0
    ? stocked[Math.floor(Math.random() * stocked.length)].station
    : standStations[Math.floor(Math.random() * standStations.length)];

  const target = getStationInteractPoint(chosen);
  const startX = WORLD.doorX + (Math.random() - 0.5) * 34;
  const startY = WORLD.wallBottom - 6;

  const customer = {
    id: nextCustomerId++,
    x: startX,
    y: startY,
    facing: 'up',
    walkPhase: 0,
    gender,
    palette,
    budget,
    state: 'to_stand', // 'to_stand' | 'browsing' | 'to_checkout' | 'paying' | 'leaving'
    targetStationId: chosen.id,
    waypoints: [],
    waitTimer: 0,
    browseAttempts: 0,
    carriedSlime: null,
    paid: false,
    thought: null,
    stuckTimer: 0,
    lastCheckX: startX,
    lastCheckY: startY,
  };

  setCustomerDestination(customer, target.x + (Math.random() - 0.5) * 22, target.y);
  gameState.customers.push(customer);
}

function evictAllCustomers(callbacks) {
  let inventoryReturned = false;
  for (const c of gameState.customers) {
    if (c.state === 'leaving') continue;
    // Return unpaid slime back to shelf/tray so the shopkeeper never loses stock on close
    if (c.carriedSlime && !c.paid) {
      returnSlimeToStore(c.carriedSlime, c.targetStationId);
      c.carriedSlime = null;
      inventoryReturned = true;
    }
    sendCustomerToExit(c, '👋');
  }
  if (inventoryReturned && callbacks && callbacks.onInventoryChanged) {
    callbacks.onInventoryChanged();
  }
}

function updateCustomers(dt, callbacks) {
  // If the shop is closed, immediately make all remaining customers exit
  if (!gameState.persisted.shopOpen) {
    evictAllCustomers(callbacks);
  } else if (gameState.customers.length < 4) {
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
      const wp = c.waypoints && c.waypoints[0];
      if (!wp) {
        c.walkPhase = 0;
        if (c.state === 'to_stand') {
          c.state = 'browsing';
          c.waitTimer = 1.2 + Math.random() * 0.7;
          c.thought = '👀';
        } else if (c.state === 'to_checkout') {
          c.state = 'paying';
          c.waitTimer = 0.85;
          c.thought = '💳';
        } else if (c.state === 'leaving') {
          gameState.customers.splice(i, 1);
        }
        continue;
      }

      const dx = wp.x - c.x;
      const dy = wp.y - c.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 10) {
        c.waypoints.shift();
        c.stuckTimer = 0;
        if (c.waypoints.length === 0) {
          c.walkPhase = 0;
          if (c.state === 'to_stand') {
            c.state = 'browsing';
            c.waitTimer = 1.2 + Math.random() * 0.7;
            c.thought = '👀';
          } else if (c.state === 'to_checkout') {
            c.state = 'paying';
            c.waitTimer = 0.85;
            c.thought = '💳';
          } else if (c.state === 'leaving') {
            gameState.customers.splice(i, 1);
            continue;
          }
        }
      } else {
        const mx = dx / dist;
        const my = dy / dist;
        c.x += mx * CUSTOMER_SPEED * dt;
        c.y += my * CUSTOMER_SPEED * dt;
        c.walkPhase += dt * 9;
        updateFacing(c, mx, my);
        if (c.state !== 'leaving') {
          resolveCollision(c, 12);
        }

        // Stuck failsafe: if barely moved in 1.2s, advance waypoint or exit
        c.stuckTimer += dt;
        if (c.stuckTimer > 1.2) {
          const moved = Math.hypot(c.x - c.lastCheckX, c.y - c.lastCheckY);
          c.lastCheckX = c.x;
          c.lastCheckY = c.y;
          c.stuckTimer = 0;
          if (moved < 6) {
            if (c.waypoints.length > 1) {
              c.waypoints.shift();
            } else {
              sendCustomerToExit(c, c.thought || '👋');
            }
          }
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

        let outOfMoney = false;

        if (available.length > 0) {
          // Filter items this customer can actually afford
          const affordable = available.filter((a) => a.item.price <= c.budget);
          if (affordable.length === 0) {
            // Customer doesn't have enough money for anything on this stand
            c.thought = '💸';
            outOfMoney = true;
          } else {
            const pick = affordable[Math.floor(Math.random() * affordable.length)];
            const evalRes = getPriceEvaluation(pick.item.price, pick.item.suggestedPrice);

            if (Math.random() <= evalRes.buyChance) {
              const taken = takeSlimeForCustomer(c.targetStationId, pick.idx);
              if (taken) {
                c.carriedSlime = taken;
                c.budget = Math.max(0, Number((c.budget - taken.price).toFixed(2)));
                c.thought = evalRes.label === 'Bargain!' ? '😍' : '😊';
                c.state = 'to_checkout';
                setCustomerDestination(c, checkoutPt.x + (Math.random() - 0.5) * 28, checkoutPt.y);
                callbacks.onInventoryChanged();
                continue;
              }
            } else {
              c.thought = '💸';
            }
          }
        } else {
          c.thought = '🤔';
        }

        // If out of money or no affordable stands remain, exit the store immediately
        c.browseAttempts += 1;
        const affordableStands = getStockedStands(c.budget).filter(
          (s) => s.station.id !== c.targetStationId
        );

        if (!outOfMoney && c.browseAttempts < 2 && affordableStands.length > 0) {
          const nextStand = affordableStands[Math.floor(Math.random() * affordableStands.length)].station;
          const pt = getStationInteractPoint(nextStand);
          c.targetStationId = nextStand.id;
          c.state = 'to_stand';
          setCustomerDestination(c, pt.x, pt.y);
        } else {
          sendCustomerToExit(c, c.thought || '💸');
        }
      }
    } else if (c.state === 'paying') {
      c.waitTimer -= dt;
      if (c.waitTimer <= 0) {
        if (c.carriedSlime) {
          recordSale(c.carriedSlime);
          c.paid = true;
          spawnFloatingText(c.x, c.y - 62, `+${formatMoney(c.carriedSlime.price)}`, '#16a34a');
          spawnSparkles(c.x, c.y - 36, 12);
          callbacks.onSaleCompleted(c.carriedSlime);
        }
        sendCustomerToExit(c, '💖');
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
