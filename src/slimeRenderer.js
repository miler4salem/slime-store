// Procedural canvas renderer for custom slimes (used in Creator preview, thumbnails, and 2.5D shelves)

function hexToRgb(hex) {
  const clean = (hex || '#ff8fab').replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function blendHex(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

// Deterministic pseudo-random generator so each slime's sprinkles/balls stay consistent
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SPRINKLE_COLORS = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#ffffff', '#ff85a1'];
const BALL_COLORS = ['#ffffff', '#fff0f6', '#d8f3dc', '#caf0f8', '#fffae0', '#f3d5ff'];

/**
 * Draw a slime container centered at (cx, cy) with given scale (1.0 = ~160px tall preview).
 */
export function drawSlimeItem(ctx, item, cx, cy, scale = 1, time = 0) {
  const {
    containerType = 'jar',
    primaryColor = '#ff8fab',
    secondaryColor = '#72efdd',
    mixRatio = 35,
    mixins = [],
    seed = 42,
  } = item;

  const rand = mulberry32(seed);
  const blendT = Math.max(0, Math.min(1, mixRatio / 100));
  const mainFill = blendHex(primaryColor, secondaryColor, blendT * 0.55);
  const swirlColor = blendHex(secondaryColor, primaryColor, 0.15);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // Dimensions by container type
  let bodyW = 92;
  let bodyH = 88;
  let lidH = 22;
  let radius = 16;

  if (containerType === 'tub') {
    bodyW = 114;
    bodyH = 68;
    lidH = 18;
    radius = 14;
  } else if (containerType === 'toy') {
    bodyW = 94;
    bodyH = 82;
    lidH = 30;
    radius = 34;
  }

  const topY = -bodyH * 0.5 + 8;
  const botY = bodyH * 0.5 + 8;

  // Soft ground shadow
  ctx.fillStyle = 'rgba(61, 44, 46, 0.16)';
  ctx.beginPath();
  ctx.ellipse(0, botY + 6, bodyW * 0.52, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Clip path for slime body interior
  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, -bodyW / 2, topY, bodyW, bodyH, radius);
  ctx.clip();

  // Base blended slime fill
  ctx.fillStyle = mainFill;
  ctx.fillRect(-bodyW / 2 - 2, topY - 2, bodyW + 4, bodyH + 4);

  // Subtle vertical glossy gradient
  const grad = ctx.createLinearGradient(0, topY, 0, botY);
  grad.addColorStop(0, 'rgba(255,255,255,0.28)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0)');
  grad.addColorStop(1, 'rgba(40,20,40,0.18)');
  ctx.fillStyle = grad;
  ctx.fillRect(-bodyW / 2, topY, bodyW, bodyH);

  // Swirl ribbons when mixRatio > 0
  if (blendT > 0.02) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.85, 0.25 + blendT * 0.75);
    ctx.strokeStyle = swirlColor;
    ctx.lineCap = 'round';
    const wobble = Math.sin(time * 1.4) * 3;
    for (let i = 0; i < 3; i++) {
      const sy = topY + 18 + i * (bodyH * 0.27);
      ctx.lineWidth = 10 + blendT * 8;
      ctx.beginPath();
      ctx.moveTo(-bodyW * 0.55, sy + wobble);
      ctx.bezierCurveTo(
        -bodyW * 0.18, sy - 14 - wobble,
        bodyW * 0.18, sy + 16 + wobble,
        bodyW * 0.55, sy - 4 - wobble
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  // Mix-in: Small Plastic Balls (floam beads)
  if (mixins.includes('balls')) {
    const count = 24;
    for (let i = 0; i < count; i++) {
      const bx = (rand() - 0.5) * (bodyW - 18);
      const by = topY + 12 + rand() * (bodyH - 22);
      const br = 3.8 + rand() * 2.6;
      const bCol = BALL_COLORS[Math.floor(rand() * BALL_COLORS.length)];
      ctx.fillStyle = bCol;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(61, 44, 46, 0.18)';
      ctx.lineWidth = 0.9;
      ctx.stroke();
      // Tiny highlight
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(bx - br * 0.3, by - br * 0.3, br * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Mix-in: Sprinkles
  if (mixins.includes('sprinkles')) {
    const count = 22;
    for (let i = 0; i < count; i++) {
      const sx = (rand() - 0.5) * (bodyW - 16);
      const sy = topY + 12 + rand() * (bodyH - 20);
      const ang = rand() * Math.PI;
      const sCol = SPRINKLE_COLORS[Math.floor(rand() * SPRINKLE_COLORS.length)];
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(ang);
      ctx.fillStyle = sCol;
      ctx.beginPath();
      ctx.roundRect(-5, -2, 10, 4, 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Mix-in: Glitter
  if (mixins.includes('glitter')) {
    const count = 20;
    for (let i = 0; i < count; i++) {
      const gx = (rand() - 0.5) * (bodyW - 14);
      const gy = topY + 10 + rand() * (bodyH - 18);
      const phase = rand() * Math.PI * 2;
      const pulse = 0.65 + 0.35 * Math.sin(time * 4 + phase);
      const r = (2.6 + rand() * 3.0) * pulse;
      drawFourPointStar(ctx, gx, gy, r, i % 3 === 0 ? '#fff59d' : '#ffffff');
    }
  }

  // Front glass reflection highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.36)';
  ctx.beginPath();
  ctx.roundRect(-bodyW / 2 + 9, topY + 8, 12, bodyH - 18, 6);
  ctx.fill();

  ctx.restore(); // End interior clip

  // Container glass outline
  ctx.strokeStyle = 'rgba(61, 44, 46, 0.32)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  roundRectPath(ctx, -bodyW / 2, topY, bodyW, bodyH, radius);
  ctx.stroke();

  // Top slime meniscus oval (gives 45-degree 3D look!)
  ctx.fillStyle = blendHex(mainFill, '#ffffff', 0.25);
  ctx.beginPath();
  ctx.ellipse(0, topY + 3, bodyW * 0.44, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Lid / Cap by container type
  if (containerType === 'toy') {
    // Cute bear-ear capsule dome cap
    const earOffset = bodyW * 0.28;
    ctx.fillStyle = '#fff5f8';
    ctx.strokeStyle = 'rgba(61, 44, 46, 0.35)';
    ctx.lineWidth = 2.2;

    // Ears
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(dir * earOffset, topY - lidH + 8, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffc8dd';
      ctx.beginPath();
      ctx.arc(dir * earOffset, topY - lidH + 8, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff5f8';
    }

    // Main dome cap
    ctx.beginPath();
    ctx.roundRect(-bodyW * 0.46, topY - lidH + 8, bodyW * 0.92, lidH, [18, 18, 8, 8]);
    ctx.fill();
    ctx.stroke();

    // Cute eyes & smile on toy cap
    ctx.fillStyle = '#3d2c2e';
    ctx.beginPath();
    ctx.arc(-10, topY - 7, 2.5, 0, Math.PI * 2);
    ctx.arc(10, topY - 7, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3d2c2e';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, -bodyH * 0.5 + 3, 4.5, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else {
    // Classic pastel screw lid (jar) or wide snap lid (tub)
    const lidW = containerType === 'tub' ? bodyW + 8 : bodyW - 4;
    ctx.fillStyle = '#fff8f2';
    ctx.strokeStyle = 'rgba(61, 44, 46, 0.34)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(-lidW / 2, topY - lidH + 6, lidW, lidH, 8);
    ctx.fill();
    ctx.stroke();

    // Top 45-degree lid ellipse
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, topY - lidH + 10, lidW * 0.45, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(61, 44, 46, 0.16)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  ctx.restore();
}

function drawFourPointStar(ctx, x, y, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
  ctx.restore();
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/**
 * Helper to create a small canvas thumbnail for UI cards
 */
export function createSlimeThumbCanvas(item, size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  drawSlimeItem(ctx, item, size / 2, size / 2 + 4, size / 145, 0);
  return canvas;
}
