// World coordinate system for the 45-degree 2.5D store interior
export const WORLD = {
  width: 1040,
  height: 640,
  wallTop: 118,       // Floor begins below the angled back wall
  wallBottom: 608,
  wallLeft: 56,
  wallRight: 984,
  doorX: 520,
  doorWidth: 116,
};

// Interactive furniture & stands:
// Wall shelves around the back, left, and right walls + 4 middle-of-store island stands
// + Mixing Station + Checkout Counter
export const STATIONS = [
  // Back wall shelves
  {
    id: 'wall-back-left',
    type: 'stand',
    placement: 'wall-back',
    name: 'Back Wall Shelf A',
    x: 116,
    y: 112,
    w: 170,
    h: 52,
    depthHeight: 42,
    slots: 3,
    accent: '#ffd6e0',
  },
  {
    id: 'wall-back-center',
    type: 'stand',
    placement: 'wall-back',
    name: 'Feature Wall Shelf',
    x: 420,
    y: 112,
    w: 200,
    h: 52,
    depthHeight: 42,
    slots: 3,
    accent: '#c8f7f0',
  },
  {
    id: 'wall-back-right',
    type: 'stand',
    placement: 'wall-back',
    name: 'Back Wall Shelf B',
    x: 754,
    y: 112,
    w: 170,
    h: 52,
    depthHeight: 42,
    slots: 3,
    accent: '#e2d4ff',
  },

  // Left & Right side wall shelves
  {
    id: 'wall-left-mid',
    type: 'stand',
    placement: 'wall-side',
    name: 'West Wall Stand',
    x: 64,
    y: 248,
    w: 62,
    h: 172,
    depthHeight: 36,
    slots: 3,
    accent: '#ffe8b6',
  },
  {
    id: 'wall-right-mid',
    type: 'stand',
    placement: 'wall-side',
    name: 'East Wall Stand',
    x: 914,
    y: 248,
    w: 62,
    h: 172,
    depthHeight: 36,
    slots: 3,
    accent: '#d6f5d6',
  },

  // Middle-of-store island stands (2x2 boutique islands)
  {
    id: 'island-nw',
    type: 'stand',
    placement: 'middle',
    name: 'Center Stand 1',
    x: 246,
    y: 256,
    w: 176,
    h: 64,
    depthHeight: 34,
    slots: 3,
    accent: '#ffc8dd',
  },
  {
    id: 'island-ne',
    type: 'stand',
    placement: 'middle',
    name: 'Center Stand 2',
    x: 618,
    y: 256,
    w: 176,
    h: 64,
    depthHeight: 34,
    slots: 3,
    accent: '#bde0fe',
  },
  {
    id: 'island-sw',
    type: 'stand',
    placement: 'middle',
    name: 'Center Stand 3',
    x: 246,
    y: 416,
    w: 176,
    h: 64,
    depthHeight: 34,
    slots: 3,
    accent: '#caffbf',
  },
  {
    id: 'island-se',
    type: 'stand',
    placement: 'middle',
    name: 'Center Stand 4',
    x: 618,
    y: 416,
    w: 176,
    h: 64,
    depthHeight: 34,
    slots: 3,
    accent: '#ffd6a5',
  },

  // Slime Mixing Station (bottom-left)
  {
    id: 'mixing-station',
    type: 'mixer',
    placement: 'station',
    name: 'Slime Mixing Bar',
    x: 84,
    y: 506,
    w: 162,
    h: 66,
    depthHeight: 38,
    slots: 0,
    accent: '#ff8fab',
  },

  // Checkout Counter (bottom-right)
  {
    id: 'checkout-counter',
    type: 'checkout',
    placement: 'station',
    name: 'Checkout Counter',
    x: 780,
    y: 506,
    w: 168,
    h: 66,
    depthHeight: 38,
    slots: 0,
    accent: '#72efdd',
  },
];

export const CONTAINER_TYPES = [
  {
    id: 'jar',
    name: 'Slime Jar',
    icon: '🫙',
    cost: 2.0,
    baseValue: 8.0,
    desc: 'Classic clear jar',
  },
  {
    id: 'tub',
    name: 'Swirl Tub',
    icon: '🥣',
    cost: 3.0,
    baseValue: 11.0,
    desc: 'Wide boutique tub',
  },
  {
    id: 'toy',
    name: 'Slime Toy Pack',
    icon: '🧸',
    cost: 4.0,
    baseValue: 14.5,
    desc: 'Cute character capsule',
  },
];

export const SLIME_COLORS = [
  { name: 'Cotton Candy', hex: '#ff8fab' },
  { name: 'Mint Fizz', hex: '#72efdd' },
  { name: 'Sky Cloud', hex: '#74c0fc' },
  { name: 'Lavender', hex: '#c77dff' },
  { name: 'Lemon Pop', hex: '#ffe066' },
  { name: 'Peach Glow', hex: '#ffad76' },
  { name: 'Neon Slime', hex: '#80ed99' },
  { name: 'Berry Jam', hex: '#e63986' },
];

export const MIXINS = [
  {
    id: 'sprinkles',
    name: 'Sprinkles',
    emoji: '🌈',
    cost: 0.75,
    valueBonus: 3.0,
  },
  {
    id: 'glitter',
    name: 'Glitter',
    emoji: '✨',
    cost: 0.75,
    valueBonus: 3.0,
  },
  {
    id: 'balls',
    name: 'Plastic Balls',
    emoji: '⚪',
    cost: 1.0,
    valueBonus: 4.0,
  },
];

export const NAME_ADJECTIVES = [
  'Dreamy', 'Sparkle', 'Fizzy', 'Cloud', 'Sugar', 'Glossy',
  'Starry', 'Berry', 'Cozy', 'Bubble', 'Pastel', 'Galaxy',
];

export const NAME_NOUNS = [
  'Swirl', 'Pop', 'Crunch', 'Glow', 'Puff', 'Sorbet',
  'Delight', 'Squish', 'Whip', 'Fizz', 'Jelly', 'Charm',
];

export const CUSTOMER_PALETTES = [
  { hair: '#4a2c2a', shirt: '#ff8fab', pants: '#4a5568', skin: '#f6d5b8' },
  { hair: '#e6b85c', shirt: '#74c0fc', pants: '#3b4d6b', skin: '#fce1cb' },
  { hair: '#22223b', shirt: '#9b5de5', pants: '#2d3748', skin: '#c6865c' },
  { hair: '#9c4a2d', shirt: '#52b788', pants: '#4a5568', skin: '#f3cfb3' },
  { hair: '#3d2b1f', shirt: '#f4a261', pants: '#3a4f63', skin: '#8d5524' },
  { hair: '#6d597a', shirt: '#48cae4', pants: '#3d405b', skin: '#f7d8c0' },
];

export function getStandSlotPositions(station) {
  const positions = [];
  if (station.slots <= 0) return positions;

  if (station.placement === 'wall-side') {
    const stepY = station.h / (station.slots + 1);
    for (let i = 0; i < station.slots; i++) {
      positions.push({
        x: station.x + station.w * 0.5,
        y: station.y + stepY * (i + 1) - 6,
      });
    }
  } else {
    const stepX = station.w / (station.slots + 1);
    for (let i = 0; i < station.slots; i++) {
      positions.push({
        x: station.x + stepX * (i + 1),
        y: station.y + station.h * 0.36,
      });
    }
  }
  return positions;
}
