import { STATIONS, CONTAINER_TYPES, MIXINS } from './constants.js';

const SESSION_KEY = 'slime_boutique_session_v1';
const STARTING_CASH = 50.0;

function createEmptyShelves() {
  const shelves = {};
  for (const s of STATIONS) {
    if (s.type === 'stand') {
      shelves[s.id] = new Array(s.slots).fill(null);
    }
  }
  return shelves;
}

function makeStarterData() {
  const shelves = createEmptyShelves();
  // Seed 2 starter slimes on Center Stand 1 so customers have something to browse immediately
  shelves['island-nw'][0] = {
    id: 'starter-1',
    name: 'Cotton Candy Sparkle',
    containerType: 'jar',
    primaryColor: '#ff8fab',
    secondaryColor: '#72efdd',
    mixRatio: 35,
    mixins: ['glitter', 'sprinkles'],
    cost: 3.5,
    suggestedPrice: 14.0,
    price: 13.0,
    seed: 101,
  };
  shelves['island-nw'][1] = {
    id: 'starter-2',
    name: 'Mint Bubble Crunch',
    containerType: 'tub',
    primaryColor: '#72efdd',
    secondaryColor: '#ffe066',
    mixRatio: 40,
    mixins: ['balls'],
    cost: 4.0,
    suggestedPrice: 15.0,
    price: 15.0,
    seed: 202,
  };

  const tray = [
    {
      id: 'starter-3',
      name: 'Lavender Star Toy',
      containerType: 'toy',
      primaryColor: '#c77dff',
      secondaryColor: '#ff8fab',
      mixRatio: 45,
      mixins: ['glitter', 'balls'],
      cost: 5.75,
      suggestedPrice: 21.5,
      price: 20.0,
      seed: 303,
    },
  ];

  return { shelves, tray };
}

function createInitialPersistedState() {
  const { shelves, tray } = makeStarterData();
  return {
    gender: null, // 'female' | 'male' | null (prompts user on start)
    shopOpen: true,
    cash: STARTING_CASH,
    totalRevenue: 0,
    totalExpenses: 0,
    slimesCrafted: 0,
    slimesSold: 0,
    ledger: [
      {
        id: 'init',
        time: formatTime(),
        type: 'opening',
        description: 'Opening Register Float',
        amount: STARTING_CASH,
        balance: STARTING_CASH,
      },
    ],
    tray,
    shelves,
    nextId: 1000,
  };
}

export function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatMoney(val) {
  const sign = val < 0 ? '-' : '';
  return `${sign}$${Math.abs(val).toFixed(2)}`;
}

export function calculateSlimeEconomics(containerId, selectedMixins) {
  const container = CONTAINER_TYPES.find((c) => c.id === containerId) || CONTAINER_TYPES[0];
  let cost = container.cost;
  let suggested = container.baseValue;

  for (const mId of selectedMixins) {
    const m = MIXINS.find((x) => x.id === mId);
    if (m) {
      cost += m.cost;
      suggested += m.valueBonus;
    }
  }
  return {
    cost: Number(cost.toFixed(2)),
    suggestedPrice: Number(suggested.toFixed(2)),
  };
}

function loadPersisted() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return createInitialPersistedState();
    const parsed = JSON.parse(raw);
    // Ensure all shelf keys exist
    const baseShelves = createEmptyShelves();
    parsed.shelves = { ...baseShelves, ...(parsed.shelves || {}) };
    return parsed;
  } catch {
    return createInitialPersistedState();
  }
}

export const gameState = {
  persisted: loadPersisted(),

  // Live runtime state (not persisted)
  player: {
    x: 520,
    y: 515,
    vx: 0,
    vy: 0,
    facing: 'down', // 'down' | 'up' | 'left' | 'right'
    walkPhase: 0,
    targetX: null,
    targetY: null,
    pendingInteractId: null,
  },
  customers: [],
  floatingTexts: [],
  sparkles: [],
  activeStandId: null,
  nearbyStationId: null,
  hoverStationId: null,
  spawnTimer: 2.2,
  time: 0,
};

export function saveSession() {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(gameState.persisted));
  } catch {
    // Ignore storage quota errors
  }
}

export function resetSession() {
  sessionStorage.removeItem(SESSION_KEY);
  gameState.persisted = createInitialPersistedState();
  gameState.customers = [];
  gameState.floatingTexts = [];
  gameState.sparkles = [];
  saveSession();
}

export function setGender(gender) {
  gameState.persisted.gender = gender;
  saveSession();
}

export function toggleShopOpen() {
  gameState.persisted.shopOpen = !gameState.persisted.shopOpen;
  saveSession();
  return gameState.persisted.shopOpen;
}

export function craftSlime({ name, containerType, primaryColor, secondaryColor, mixRatio, mixins }) {
  const { cost, suggestedPrice } = calculateSlimeEconomics(containerType, mixins);
  if (gameState.persisted.cash < cost) {
    return { ok: false, reason: 'Not enough cash for these ingredients!' };
  }

  gameState.persisted.cash = Number((gameState.persisted.cash - cost).toFixed(2));
  gameState.persisted.totalExpenses = Number((gameState.persisted.totalExpenses + cost).toFixed(2));
  gameState.persisted.slimesCrafted += 1;

  const id = `slime-${gameState.persisted.nextId++}`;
  const item = {
    id,
    name: name.trim() || 'Custom Slime',
    containerType,
    primaryColor,
    secondaryColor,
    mixRatio,
    mixins: [...mixins],
    cost,
    suggestedPrice,
    price: suggestedPrice,
    seed: Math.floor(Math.random() * 100000),
  };

  gameState.persisted.tray.unshift(item);
  gameState.persisted.ledger.unshift({
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    time: formatTime(),
    type: 'expense',
    description: `Crafted: ${item.name}`,
    amount: -cost,
    balance: gameState.persisted.cash,
  });

  saveSession();
  return { ok: true, item };
}

export function placeSlimeOnStand(standId, slotIndex, trayItemId, price) {
  const slots = gameState.persisted.shelves[standId];
  if (!slots || slotIndex < 0 || slotIndex >= slots.length || slots[slotIndex] !== null) {
    return false;
  }
  const idx = gameState.persisted.tray.findIndex((t) => t.id === trayItemId);
  if (idx === -1) return false;

  const [item] = gameState.persisted.tray.splice(idx, 1);
  item.price = Math.max(1, Number(Number(price).toFixed(2)));
  slots[slotIndex] = item;
  saveSession();
  return true;
}

export function updateShelfItemPrice(standId, slotIndex, newPrice) {
  const slots = gameState.persisted.shelves[standId];
  if (!slots || !slots[slotIndex]) return false;
  const parsed = Number(newPrice);
  if (Number.isNaN(parsed) || parsed < 1) return false;
  slots[slotIndex].price = Number(parsed.toFixed(2));
  saveSession();
  return true;
}

export function removeSlimeFromStand(standId, slotIndex) {
  const slots = gameState.persisted.shelves[standId];
  if (!slots || !slots[slotIndex]) return false;
  const item = slots[slotIndex];
  slots[slotIndex] = null;
  gameState.persisted.tray.unshift(item);
  saveSession();
  return true;
}

export function takeSlimeForCustomer(standId, slotIndex) {
  const slots = gameState.persisted.shelves[standId];
  if (!slots || !slots[slotIndex]) return null;
  const item = slots[slotIndex];
  slots[slotIndex] = null;
  saveSession();
  return item;
}

export function recordSale(item) {
  const amount = Number(item.price.toFixed(2));
  gameState.persisted.cash = Number((gameState.persisted.cash + amount).toFixed(2));
  gameState.persisted.totalRevenue = Number((gameState.persisted.totalRevenue + amount).toFixed(2));
  gameState.persisted.slimesSold += 1;

  gameState.persisted.ledger.unshift({
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    time: formatTime(),
    type: 'sale',
    description: `Sold: ${item.name}`,
    amount,
    balance: gameState.persisted.cash,
  });

  saveSession();
}

export function getNetProfit() {
  return Number((gameState.persisted.totalRevenue - gameState.persisted.totalExpenses).toFixed(2));
}

export function getPriceEvaluation(price, suggestedPrice) {
  const ratio = price / Math.max(1, suggestedPrice);
  if (ratio <= 0.85) return { label: 'Bargain!', cls: 'tag-bargain', buyChance: 0.96 };
  if (ratio <= 1.15) return { label: 'Fair Price', cls: 'tag-fair', buyChance: 0.84 };
  if (ratio <= 1.45) return { label: 'Premium', cls: 'tag-premium', buyChance: 0.45 };
  return { label: 'Overpriced', cls: 'tag-high', buyChance: 0.1 };
}
