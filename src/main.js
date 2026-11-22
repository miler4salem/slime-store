import { STATIONS } from './constants.js';
import { gameState, formatMoney } from './state.js';
import { renderWorld, getWorldTransform } from './worldRenderer.js';
import { updateSimulation, getStationInteractPoint } from './simulation.js';
import {
  initUI,
  openCreatorModal,
  openStandModal,
  openAccountingModal,
  refreshStandModalIfOpen,
  updateHUD,
  updateUIAnimations,
  isAnyModalOpen,
  closeTopModal,
  showToast,
} from './ui.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const keys = new Set();

let cssWidth = 0;
let cssHeight = 0;

function resizeCanvas() {
  const wrap = document.getElementById('viewport-wrap');
  const rect = wrap.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cssWidth = rect.width;
  cssHeight = rect.height;
  canvas.width = Math.max(1, Math.floor(cssWidth * dpr));
  canvas.height = Math.max(1, Math.floor(cssHeight * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function screenToWorld(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const sx = clientX - rect.left;
  const sy = clientY - rect.top;
  const { scale, offsetX, offsetY } = getWorldTransform(cssWidth, cssHeight);
  return {
    x: (sx - offsetX) / scale,
    y: (sy - offsetY) / scale,
  };
}

function findStationAt(wx, wy) {
  // Check top-to-bottom visually (including raised 2.5D top surface)
  for (let i = STATIONS.length - 1; i >= 0; i--) {
    const s = STATIONS[i];
    const topY = s.y - s.depthHeight * 0.55;
    if (wx >= s.x && wx <= s.x + s.w && wy >= topY && wy <= s.y + s.h) {
      return s;
    }
  }
  return null;
}

function interactWithStation(stationId) {
  const station = STATIONS.find((s) => s.id === stationId);
  if (!station) return;
  if (station.type === 'mixer') {
    openCreatorModal();
  } else if (station.type === 'checkout') {
    openAccountingModal();
  } else if (station.type === 'stand') {
    openStandModal(station.id);
  }
}

// Keyboard listeners
window.addEventListener('keydown', (e) => {
  // Allow typing inside inputs without triggering game hotkeys
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
    if (e.key === 'Escape') closeTopModal();
    return;
  }

  if (e.key === 'Escape') {
    closeTopModal();
    return;
  }

  if ((e.code === 'KeyE' || e.code === 'Space') && !isAnyModalOpen()) {
    if (gameState.nearbyStationId) {
      e.preventDefault();
      interactWithStation(gameState.nearbyStationId);
    }
    return;
  }

  if (!isAnyModalOpen()) {
    keys.add(e.code);
  }
});

window.addEventListener('keyup', (e) => {
  keys.delete(e.code);
});

window.addEventListener('blur', () => {
  keys.clear();
});

// Mouse hover & click on 45-degree store canvas
canvas.addEventListener('mousemove', (e) => {
  if (isAnyModalOpen()) {
    gameState.hoverStationId = null;
    return;
  }
  const { x, y } = screenToWorld(e.clientX, e.clientY);
  const st = findStationAt(x, y);
  gameState.hoverStationId = st ? st.id : null;
});

canvas.addEventListener('click', (e) => {
  if (isAnyModalOpen()) return;
  const { x, y } = screenToWorld(e.clientX, e.clientY);
  const st = findStationAt(x, y);

  if (st) {
    // If already close, open immediately; otherwise walk over and open on arrival
    const pt = getStationInteractPoint(st);
    const dist = Math.hypot(gameState.player.x - pt.x, gameState.player.y - pt.y);
    if (dist < 85) {
      interactWithStation(st.id);
    } else {
      gameState.player.targetX = pt.x;
      gameState.player.targetY = pt.y;
      gameState.player.pendingInteractId = st.id;
    }
  } else {
    // Click-to-walk on floor
    gameState.player.targetX = x;
    gameState.player.targetY = y;
    gameState.player.pendingInteractId = null;
  }
});

window.addEventListener('resize', resizeCanvas);

// Boot
initUI();
resizeCanvas();

const simCallbacks = {
  onInteractStation: (stationId) => interactWithStation(stationId),
  onInventoryChanged: () => {
    updateHUD();
    refreshStandModalIfOpen();
  },
  onSaleCompleted: (item) => {
    updateHUD();
    refreshStandModalIfOpen();
    showToast(`Sold "${item.name}" for ${formatMoney(item.price)}!`, 'success');
  },
};

let lastTs = performance.now();
function loop(ts) {
  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;

  // Pause player movement keys if a modal is open, while still keeping customers gently alive
  const activeKeys = isAnyModalOpen() ? new Set() : keys;
  updateSimulation(dt, activeKeys, simCallbacks);
  renderWorld(ctx, cssWidth, cssHeight);
  updateUIAnimations(gameState.time);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
