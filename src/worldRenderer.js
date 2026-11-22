import { WORLD, STATIONS, getStandSlotPositions } from './constants.js';
import { gameState } from './state.js';
import { drawSlimeItem } from './slimeRenderer.js';

/**
 * Compute uniform scale & offset to fit WORLD nicely inside the viewport canvas.
 */
export function getWorldTransform(canvasWidth, canvasHeight) {
  const pad = 16;
  const scale = Math.min(
    (canvasWidth - pad * 2) / WORLD.width,
    (canvasHeight - pad * 2) / WORLD.height
  );
  const offsetX = (canvasWidth - WORLD.width * scale) / 2;
  const offsetY = (canvasHeight - WORLD.height * scale) / 2;
  return { scale, offsetX, offsetY };
}

export function renderWorld(ctx, canvasWidth, canvasHeight) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Outer backdrop around the boutique diorama
  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  bgGrad.addColorStop(0, '#f3e5d8');
  bgGrad.addColorStop(1, '#e4d1be');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const { scale, offsetX, offsetY } = getWorldTransform(canvasWidth, canvasHeight);

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // Drop shadow under the entire store floorplate (45-deg diorama feel)
  ctx.fillStyle = 'rgba(61, 44, 46, 0.14)';
  ctx.beginPath();
  ctx.roundRect(14, 16, WORLD.width - 12, WORLD.height - 6, 20);
  ctx.fill();

  drawRoomShell(ctx, gameState.time);

  // Build Y-sorted list of renderables (stands, stations, player, customers)
  const drawables = [];

  for (const station of STATIONS) {
    drawables.push({
      sortY: station.y + station.h,
      draw: () => drawStation(ctx, station),
    });
  }

  // Player
  drawables.push({
    sortY: gameState.player.y,
    draw: () => {
      const p = gameState.player;
      const holding = gameState.persisted.tray.length > 0 ? gameState.persisted.tray[0] : null;
      drawCharacter(ctx, {
        x: p.x,
        y: p.y,
        facing: p.facing,
        walkPhase: p.walkPhase,
        isPlayer: true,
        gender: gameState.persisted.gender || 'female',
        holdingItem: holding,
        time: gameState.time,
      });
    },
  });

  // Customers
  for (const c of gameState.customers) {
    drawables.push({
      sortY: c.y,
      draw: () => {
        drawCharacter(ctx, {
          x: c.x,
          y: c.y,
          facing: c.facing,
          walkPhase: c.walkPhase,
          isPlayer: false,
          gender: c.gender,
          palette: c.palette,
          holdingItem: c.carriedSlime,
          thought: c.thought,
          time: gameState.time,
        });
      },
    });
  }

  drawables.sort((a, b) => a.sortY - b.sortY);
  for (const d of drawables) {
    d.draw();
  }

  // Front wall lower lip & doorway frame (drawn over floor entities near bottom edge)
  drawFrontDoorFrame(ctx);

  // Sparkles & floating income/expense popups
  drawEffects(ctx);

  ctx.restore();
}

function drawRoomShell(ctx, time) {
  const { width, height, wallTop, wallBottom, wallLeft, wallRight, doorX, doorWidth } = WORLD;

  // Clip room
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, 18);
  ctx.clip();

  // Floor base
  ctx.fillStyle = '#fff9f0';
  ctx.fillRect(0, wallTop, width, height - wallTop);

  // 45-degree warm checkerboard floor tiles
  const tileW = 58;
  const tileH = 44; // foreshortened for 45-degree top-down angle
  for (let row = 0; row * tileH < wallBottom - wallTop + tileH; row++) {
    for (let col = 0; col * tileW < wallRight - wallLeft + tileW; col++) {
      const tx = wallLeft + col * tileW;
      const ty = wallTop + row * tileH;
      ctx.fillStyle = (row + col) % 2 === 0 ? '#fff7eb' : '#f8ead8';
      ctx.fillRect(tx, ty, tileW, tileH);
    }
  }

  // Subtle floor tile grid lines
  ctx.strokeStyle = 'rgba(184, 150, 118, 0.14)';
  ctx.lineWidth = 1;
  for (let y = wallTop; y <= wallBottom; y += tileH) {
    ctx.beginPath();
    ctx.moveTo(wallLeft, y);
    ctx.lineTo(wallRight, y);
    ctx.stroke();
  }
  for (let x = wallLeft; x <= wallRight; x += tileW) {
    ctx.beginPath();
    ctx.moveTo(x, wallTop);
    ctx.lineTo(x, wallBottom);
    ctx.stroke();
  }

  // Back wall (45-degree elevation view)
  const wallGrad = ctx.createLinearGradient(0, 0, 0, wallTop);
  wallGrad.addColorStop(0, '#ffe6ef');
  wallGrad.addColorStop(0.7, '#fff2f6');
  wallGrad.addColorStop(1, '#f3d9c6');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, width, wallTop);

  // Subtle pastel wallpaper stripes on back wall
  ctx.fillStyle = 'rgba(255, 196, 217, 0.22)';
  for (let sx = 0; sx < width; sx += 36) {
    ctx.fillRect(sx, 0, 18, wallTop - 16);
  }

  // Back wall wooden wainscoting & baseboard
  ctx.fillStyle = '#ebd2bc';
  ctx.fillRect(0, wallTop - 20, width, 20);
  ctx.fillStyle = '#d3b296';
  ctx.fillRect(0, wallTop - 22, width, 3);
  ctx.fillRect(0, wallTop - 3, width, 3);

  // Cute decorative windows on back wall
  drawBackWindow(ctx, 314, 24, 82, 62);
  drawBackWindow(ctx, 646, 24, 82, 62);

  // Center boutique sign on back wall
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ff8fab';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(width / 2 - 110, 16, 220, 44, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#5c2d3e';
  ctx.font = '800 18px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✨ SLIME BOUTIQUE ✨', width / 2, 39);
  ctx.restore();

  // Festive pastel bunting flags along top of back wall
  const flagColors = ['#ff8fab', '#72efdd', '#ffe066', '#c77dff', '#74c0fc'];
  ctx.strokeStyle = 'rgba(92, 45, 62, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(40, 12);
  ctx.quadraticCurveTo(220, 26, 395, 12);
  ctx.moveTo(645, 12);
  ctx.quadraticCurveTo(820, 26, 1000, 12);
  ctx.stroke();

  for (let i = 0; i < 8; i++) {
    const fx = 68 + i * 42;
    const fy = 15 + Math.sin((i / 7) * Math.PI) * 6;
    drawPennant(ctx, fx, fy, flagColors[i % flagColors.length]);
    const rx = 674 + i * 42;
    drawPennant(ctx, rx, fy, flagColors[(i + 2) % flagColors.length]);
  }

  // Left and Right 2.5D side walls
  ctx.fillStyle = '#f2dcc7';
  ctx.fillRect(0, wallTop, wallLeft, height - wallTop);
  ctx.fillRect(wallRight, wallTop, width - wallRight, height - wallTop);

  // Inner wall bevel trim
  ctx.fillStyle = '#d9bc9f';
  ctx.fillRect(wallLeft - 5, wallTop, 5, wallBottom - wallTop);
  ctx.fillRect(wallRight, wallTop, 5, wallBottom - wallTop);

  // Floor shadow along back wall & side walls
  const shadowTop = ctx.createLinearGradient(0, wallTop, 0, wallTop + 26);
  shadowTop.addColorStop(0, 'rgba(61, 44, 46, 0.14)');
  shadowTop.addColorStop(1, 'rgba(61, 44, 46, 0)');
  ctx.fillStyle = shadowTop;
  ctx.fillRect(wallLeft, wallTop, wallRight - wallLeft, 26);

  // Welcome Mat near front entrance
  const matW = doorWidth + 24;
  const matH = 38;
  ctx.fillStyle = '#ff8fab';
  ctx.beginPath();
  ctx.roundRect(doorX - matW / 2, wallBottom - matH - 6, matW, matH, 8);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.strokeRect(doorX - matW / 2 + 5, wallBottom - matH - 1, matW - 10, matH - 10);
  ctx.setLineDash([]);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 12px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(gameState.persisted.shopOpen ? 'WELCOME!' : 'CLOSED', doorX, wallBottom - matH / 2 - 6);

  // Subtle shop open sparkle dot near entrance
  if (gameState.persisted.shopOpen) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 3);
    ctx.fillStyle = `rgba(34, 197, 94, ${0.35 + pulse * 0.45})`;
    ctx.beginPath();
    ctx.arc(doorX + matW / 2 + 16, wallBottom - 24, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // Outer room frame border
  ctx.strokeStyle = '#cfa987';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(2, 2, width - 4, height - 4, 18);
  ctx.stroke();
}

function drawBackWindow(ctx, x, y, w, h) {
  ctx.save();
  // Sky
  const sky = ctx.createLinearGradient(x, y, x, y + h);
  sky.addColorStop(0, '#bae6fd');
  sky.addColorStop(1, '#e0f2fe');
  ctx.fillStyle = sky;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();

  // Soft cloud
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(x + 26, y + 24, 10, 0, Math.PI * 2);
  ctx.arc(x + 38, y + 22, 12, 0, Math.PI * 2);
  ctx.arc(x + 50, y + 25, 9, 0, Math.PI * 2);
  ctx.fill();

  // Window frame & mullions
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.stroke();

  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
  ctx.restore();
}

function drawPennant(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - 10, y);
  ctx.lineTo(x + 10, y);
  ctx.lineTo(x, y + 14);
  ctx.closePath();
  ctx.fill();
}

function drawFrontDoorFrame(ctx) {
  const { width, height, wallBottom, doorX, doorWidth } = WORLD;
  const leftEnd = doorX - doorWidth / 2;
  const rightStart = doorX + doorWidth / 2;

  // Lower wall strips left & right of doorway
  ctx.fillStyle = '#e8cfb8';
  ctx.fillRect(0, wallBottom, leftEnd, height - wallBottom);
  ctx.fillRect(rightStart, wallBottom, width - rightStart, height - wallBottom);

  ctx.fillStyle = '#cfa987';
  ctx.fillRect(0, wallBottom, leftEnd, 5);
  ctx.fillRect(rightStart, wallBottom, width - rightStart, 5);

  // Doorway posts
  ctx.fillStyle = '#a47551';
  ctx.fillRect(leftEnd - 6, wallBottom - 6, 8, height - wallBottom + 6);
  ctx.fillRect(rightStart - 2, wallBottom - 6, 8, height - wallBottom + 6);
}

function drawStation(ctx, station) {
  const { x, y, w, h, depthHeight, accent, id, type, name } = station;
  const isHighlighted = gameState.hoverStationId === id || gameState.nearbyStationId === id;

  // Ground shadow (offset down-right for 45-degree lighting)
  ctx.fillStyle = 'rgba(61, 44, 46, 0.16)';
  ctx.beginPath();
  ctx.roundRect(x + 6, y + 10, w, h + 6, 12);
  ctx.fill();

  const topY = y - depthHeight * 0.55;
  const frontY = topY + h * 0.62;
  const frontH = y + h - frontY;

  // Front vertical cabinet face (gives the 45-degree 3D height!)
  ctx.fillStyle = '#e5c1a1';
  ctx.beginPath();
  ctx.roundRect(x, frontY, w, frontH, [4, 4, 10, 10]);
  ctx.fill();

  // Accent pastel front panel inset
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.roundRect(x + 7, frontY + 6, w - 14, Math.max(10, frontH - 12), 6);
  ctx.fill();

  // Tabletop top surface (45-degree foreshortened top)
  ctx.fillStyle = '#fffaf4';
  ctx.beginPath();
  ctx.roundRect(x, topY, w, h * 0.68, [10, 10, 6, 6]);
  ctx.fill();

  // Crisp wood outline
  ctx.strokeStyle = isHighlighted ? '#ff6b9d' : '#b89070';
  ctx.lineWidth = isHighlighted ? 3 : 2;
  ctx.beginPath();
  ctx.roundRect(x, topY, w, y + h - topY, 10);
  ctx.stroke();

  // Inner tabletop bevel line
  ctx.strokeStyle = 'rgba(184, 144, 112, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 4, frontY);
  ctx.lineTo(x + w - 4, frontY);
  ctx.stroke();

  // Specialized props for Mixing Station & Checkout Counter
  if (type === 'mixer') {
    drawMixingStationProps(ctx, x, topY, w, h);
  } else if (type === 'checkout') {
    drawCheckoutProps(ctx, x, topY, w, h);
  } else if (type === 'stand') {
    drawStandItems(ctx, station, topY);
  }

  // Hover / Nearby floating label
  if (isHighlighted) {
    ctx.save();
    ctx.font = '700 12px "Segoe UI", system-ui, sans-serif';
    const label = type === 'mixer'
      ? '🧪 Mix Slime'
      : type === 'checkout'
        ? '📒 Accounting'
        : name;
    const tw = ctx.measureText(label).width + 18;
    const lx = x + w / 2 - tw / 2;
    const ly = topY - 28;

    ctx.fillStyle = 'rgba(61, 44, 46, 0.9)';
    ctx.beginPath();
    ctx.roundRect(lx, ly, tw, 22, 999);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, ly + 11);
    ctx.restore();
  }
}

function drawStandItems(ctx, station, topY) {
  const slots = gameState.persisted.shelves[station.id] || [];
  const positions = getStandSlotPositions(station);

  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const item = slots[i];
    // Adjust y slightly upward onto the raised 2.5D tabletop
    const drawY = station.placement === 'wall-side'
      ? pos.y - 12
      : topY + station.h * 0.25;

    if (!item) {
      // Subtle empty doily/coaster spot
      ctx.fillStyle = 'rgba(184, 144, 112, 0.16)';
      ctx.beginPath();
      ctx.ellipse(pos.x, drawY + 12, 16, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    // Draw custom slime container sitting on the stand
    drawSlimeItem(ctx, item, pos.x, drawY, 0.34, gameState.time);

    // Tiny price tag pill below slime
    const priceText = `$${item.price % 1 === 0 ? item.price.toFixed(0) : item.price.toFixed(2)}`;
    ctx.save();
    ctx.font = '800 10px "Segoe UI", system-ui, sans-serif';
    const pw = Math.max(28, ctx.measureText(priceText).width + 10);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e0b899';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(pos.x - pw / 2, drawY + 18, pw, 15, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#5c2d3e';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(priceText, pos.x, drawY + 25.5);
    ctx.restore();
  }
}

function drawMixingStationProps(ctx, x, topY, w, h) {
  // Mixing bowl
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#b89070';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x + 48, topY + 22, 22, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Swirly slime inside bowl
  ctx.fillStyle = '#ff8fab';
  ctx.beginPath();
  ctx.ellipse(x + 48, topY + 21, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pigment & mix-in bottles
  const bottleColors = ['#72efdd', '#ffe066', '#c77dff', '#74c0fc'];
  for (let i = 0; i < bottleColors.length; i++) {
    const bx = x + 90 + i * 16;
    const by = topY + 12;
    ctx.fillStyle = bottleColors[i];
    ctx.strokeStyle = 'rgba(61,44,46,0.35)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(bx, by, 11, 18, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bx + 2, by - 4, 7, 4);
  }

  // Front sign text
  ctx.fillStyle = '#5c2d3e';
  ctx.font = '800 11px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MIXING BAR', x + w / 2, topY + h * 0.92);
}

function drawCheckoutProps(ctx, x, topY, w, h) {
  // Cute pastel register
  const rx = x + w / 2 - 24;
  const ry = topY + 6;
  ctx.fillStyle = '#2ec4b6';
  ctx.strokeStyle = '#1d7874';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(rx, ry, 48, 28, 6);
  ctx.fill();
  ctx.stroke();

  // Register screen
  ctx.fillStyle = '#e0fbfc';
  ctx.fillRect(rx + 7, ry + 5, 34, 11);
  ctx.fillStyle = '#15803d';
  ctx.font = '800 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('$$$', rx + 24, ry + 13);

  // Front sign text
  ctx.fillStyle = '#1d5b56';
  ctx.font = '800 11px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CHECKOUT', x + w / 2, topY + h * 0.92);
}

/**
 * Draw a 45-degree chibi character (Shopkeeper or Customer)
 */
export function drawCharacter(ctx, opts) {
  const {
    x,
    y,
    facing = 'down',
    walkPhase = 0,
    isPlayer = false,
    gender = 'female',
    palette = null,
    holdingItem = null,
    thought = null,
    time = 0,
  } = opts;

  const isWalking = walkPhase > 0.01;
  const bob = isWalking ? Math.abs(Math.sin(walkPhase)) * 3.5 : Math.sin(time * 2.4) * 0.8;
  const stride = isWalking ? Math.sin(walkPhase) * 5 : 0;

  // Colors
  const colors = isPlayer
    ? gender === 'female'
      ? {
          skin: '#fbd8c0',
          hair: '#5c3328',
          outfit: '#ff8fab',
          apron: '#ffffff',
          pants: '#4a5568',
          accent: '#ff4d88',
        }
      : {
          skin: '#f6d0b4',
          hair: '#3b2820',
          outfit: '#4ea8de',
          apron: '#d8f8f3',
          pants: '#3a4f63',
          accent: '#2ec4b6',
        }
    : {
        skin: palette.skin,
        hair: palette.hair,
        outfit: palette.shirt,
        apron: null,
        pants: palette.pants,
        accent: palette.shirt,
      };

  ctx.save();
  ctx.translate(x, y);

  // Soft elliptical shadow on floor
  ctx.fillStyle = 'rgba(61, 44, 46, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 16, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Player indicator ring
  if (isPlayer) {
    ctx.strokeStyle = 'rgba(255, 107, 157, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 2, 20, 9, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.translate(0, -bob);

  // Feet / Shoes
  ctx.fillStyle = '#3d2c2e';
  ctx.beginPath();
  ctx.ellipse(-5.5, -1 + stride * 0.4, 4.5, 3, 0, 0, Math.PI * 2);
  ctx.ellipse(5.5, -1 - stride * 0.4, 4.5, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = colors.pants;
  ctx.fillRect(-8, -11, 6, 10);
  ctx.fillRect(2, -11, 6, 10);

  const facingBack = facing === 'up';

  // Held slime jar drawn behind body when facing away from camera
  if (holdingItem && facingBack) {
    drawSlimeItem(ctx, holdingItem, 11, -18, 0.2, time);
  }

  // Torso / Outfit
  ctx.fillStyle = colors.outfit;
  ctx.strokeStyle = 'rgba(61, 44, 46, 0.35)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  if (gender === 'female') {
    // Slightly flared boutique dress/tunic silhouette
    ctx.moveTo(-10, -29);
    ctx.lineTo(10, -29);
    ctx.lineTo(13, -9);
    ctx.lineTo(-13, -9);
    ctx.closePath();
  } else {
    ctx.roundRect(-11, -29, 22, 20, 6);
  }
  ctx.fill();
  ctx.stroke();

  // Shopkeeper Apron (front bib when facing camera, tied waist straps/bow when facing away)
  if (colors.apron) {
    if (!facingBack) {
      ctx.fillStyle = colors.apron;
      ctx.beginPath();
      ctx.roundRect(-7, -25, 14, 15, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(61, 44, 46, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      // Back apron tie strings & cute waist bow
      ctx.strokeStyle = colors.apron;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(-10, -18);
      ctx.lineTo(10, -18);
      ctx.stroke();

      // Bow loops & tails
      ctx.fillStyle = colors.apron;
      ctx.strokeStyle = 'rgba(61, 44, 46, 0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(-3.5, -18, 3.6, 2.2, -0.25, 0, Math.PI * 2);
      ctx.ellipse(3.5, -18, 3.6, 2.2, 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = colors.apron;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-1, -17);
      ctx.lineTo(-3.5, -11.5);
      ctx.moveTo(1, -17);
      ctx.lineTo(3.5, -11.5);
      ctx.stroke();
    }
  }

  // Arms
  ctx.fillStyle = colors.skin;
  ctx.beginPath();
  ctx.arc(-13, -20, 3.6, 0, Math.PI * 2);
  ctx.arc(13, -20, 3.6, 0, Math.PI * 2);
  ctx.fill();

  if (facingBack) {
    // ================= REAR VIEW HEAD & HAIR =================
    // Subtle ears peeking out at the sides of the head
    ctx.fillStyle = colors.skin;
    ctx.strokeStyle = 'rgba(61, 44, 46, 0.28)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(-13.5, -39, 2.6, 0, Math.PI * 2);
    ctx.arc(13.5, -39, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Small neck nape visible below male hair
    if (gender === 'male') {
      ctx.fillStyle = colors.skin;
      ctx.fillRect(-4, -31, 8, 5);
    }

    // Full back-of-head hair coverage
    ctx.fillStyle = colors.hair;
    ctx.strokeStyle = 'rgba(61, 44, 46, 0.34)';
    ctx.lineWidth = 1.6;
    if (gender === 'female') {
      // Flowing back hair covering the entire back of the head & upper shoulders
      ctx.beginPath();
      ctx.arc(0, -40, 15.2, Math.PI, Math.PI * 2);
      ctx.lineTo(15.5, -27);
      ctx.quadraticCurveTo(8, -24, 0, -26);
      ctx.quadraticCurveTo(-8, -24, -15.5, -27);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Subtle hair shine arc on back of head
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -41, 10, Math.PI * 1.18, Math.PI * 1.82);
      ctx.stroke();

      // Cute back ponytail / bun
      ctx.fillStyle = colors.hair;
      ctx.strokeStyle = 'rgba(61, 44, 46, 0.34)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, -35, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Hair tie / shopkeeper bow on the back
      if (isPlayer) {
        ctx.fillStyle = colors.accent;
        ctx.beginPath();
        ctx.ellipse(-4.5, -42, 5.2, 3.2, -0.25, 0, Math.PI * 2);
        ctx.ellipse(4.5, -42, 5.2, 3.2, 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, -42, 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = colors.outfit;
        ctx.beginPath();
        ctx.roundRect(-5, -42, 10, 3, 2);
        ctx.fill();
      }
    } else {
      // Male rear hair covering the back of the head cleanly to the nape
      ctx.beginPath();
      ctx.arc(0, -41, 14.6, Math.PI * 0.85, Math.PI * 2.15);
      ctx.lineTo(11, -30);
      ctx.quadraticCurveTo(0, -28.5, -11, -30);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Subtle hair shine
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, -42, 9.5, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();

      // Male shopkeeper cap rear view (dome + adjustment arch, no front visor)
      if (isPlayer) {
        ctx.fillStyle = colors.accent;
        ctx.strokeStyle = 'rgba(61, 44, 46, 0.3)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, -44, 14.2, Math.PI * 0.96, Math.PI * 2.04);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cap back adjustment cutout & strap
        ctx.fillStyle = colors.hair;
        ctx.beginPath();
        ctx.arc(0, -43.5, 4.5, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1d7874';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-5, -44);
        ctx.lineTo(5, -44);
        ctx.stroke();
      }
    }
  } else {
    // ================= FRONT / SIDE VIEW HEAD & HAIR =================
    // Back hair for female (behind head)
    if (gender === 'female') {
      ctx.fillStyle = colors.hair;
      ctx.beginPath();
      ctx.ellipse(0, -37, 17, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      // Cute side ponytail / bun
      const ponyX = facing === 'left' ? 15 : facing === 'right' ? -15 : 15;
      ctx.beginPath();
      ctx.arc(ponyX, -36, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Head
    ctx.fillStyle = colors.skin;
    ctx.strokeStyle = 'rgba(61, 44, 46, 0.32)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, -40, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Hair Top & Style
    ctx.fillStyle = colors.hair;
    if (gender === 'female') {
      // Bangs / fringe
      ctx.beginPath();
      ctx.arc(0, -43, 14.2, Math.PI, Math.PI * 2);
      ctx.lineTo(13, -38);
      ctx.quadraticCurveTo(5, -42, 0, -39);
      ctx.quadraticCurveTo(-6, -42, -13, -38);
      ctx.closePath();
      ctx.fill();

      // Cute hair bow for shopkeeper
      if (isPlayer) {
        ctx.fillStyle = colors.accent;
        ctx.beginPath();
        ctx.ellipse(-6, -53, 5, 3.2, -0.3, 0, Math.PI * 2);
        ctx.ellipse(2, -53, 5, 3.2, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-2, -53, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Male swept hair
      ctx.beginPath();
      ctx.arc(0, -43, 14.2, Math.PI * 0.95, Math.PI * 2.05);
      ctx.lineTo(12, -41);
      ctx.lineTo(4, -44);
      ctx.lineTo(-4, -41);
      ctx.lineTo(-12, -43);
      ctx.closePath();
      ctx.fill();

      // Cute shopkeeper cap for male player
      if (isPlayer) {
        ctx.fillStyle = colors.accent;
        ctx.beginPath();
        ctx.arc(0, -46, 13.5, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1d7874';
        const brimShift = facing === 'left' ? -4 : facing === 'right' ? 4 : 4;
        ctx.beginPath();
        ctx.ellipse(brimShift, -46, 13, 3.5, 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Face features
    const eyeShiftX = facing === 'left' ? -3 : facing === 'right' ? 3 : 0;
    ctx.fillStyle = '#3d2c2e';
    ctx.beginPath();
    ctx.arc(-4.5 + eyeShiftX, -38.5, 1.9, 0, Math.PI * 2);
    ctx.arc(4.5 + eyeShiftX, -38.5, 1.9, 0, Math.PI * 2);
    ctx.fill();

    // Rosy cheeks
    ctx.fillStyle = 'rgba(255, 117, 143, 0.38)';
    ctx.beginPath();
    ctx.ellipse(-7.5 + eyeShiftX, -35.5, 2.5, 1.5, 0, 0, Math.PI * 2);
    ctx.ellipse(7.5 + eyeShiftX, -35.5, 2.5, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tiny happy smile
    ctx.strokeStyle = '#3d2c2e';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(eyeShiftX, -35.5, 2.8, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  // Held slime jar in front of character when facing down/left/right
  if (holdingItem && !facingBack) {
    const holdX = facing === 'left' ? -13 : facing === 'right' ? 13 : 11;
    drawSlimeItem(ctx, holdingItem, holdX, -18, 0.21, time);
  }

  // Customer thought bubble
  if (thought) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e2cbb5';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(-20, -78, 40, 22, 10);
    ctx.fill();
    ctx.stroke();

    ctx.font = '13px "Segoe UI Emoji", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(thought, 0, -66.5);
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Used in the Character Selection modal to preview Female & Male shopkeepers
 */
export function drawShopkeeperPreview(ctx, gender, cx, cy, scale = 1.6, time = 0) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  drawCharacter(ctx, {
    x: 0,
    y: 0,
    facing: 'down',
    walkPhase: 0,
    isPlayer: true,
    gender,
    time,
  });
  ctx.restore();
}

function drawEffects(ctx) {
  // Sparkles
  for (const s of gameState.sparkles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, s.life / s.maxLife);
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Floating texts (e.g. "+$13.00")
  for (const ft of gameState.floatingTexts) {
    const alpha = Math.max(0, Math.min(1, ft.life / ft.maxLife));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '800 15px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}
