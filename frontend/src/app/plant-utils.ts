import { Plant } from './services/api.service';

const NAME_ICONS: [string, string][] = [
  ['tomate', '🍅'],
  ['gurke', '🥒'],
  ['zucchini', '🥒'],
  ['paprika', '🫑'],
  ['kürbis', '🎃'],
  ['salat', '🥬'],
  ['spinat', '🥬'],
  ['mangold', '🥬'],
  ['möhre', '🥕'],
  ['karotte', '🥕'],
  ['brokkoli', '🥦'],
  ['blumenkohl', '🥦'],
  ['kohlrabi', '🥦'],
  ['kohl', '🥬'],
  ['zwiebel', '🧅'],
  ['knoblauch', '🧄'],
  ['porree', '🥬'],
  ['erbse', '🫛'],
  ['bohne', '🫘'],
  ['kartoffel', '🥔'],
  ['mais', '🌽'],
  ['erdbeere', '🍓'],
  ['himbeere', '🫐'],
  ['johannisbeere', '🫐'],
  ['stachelbeere', '🫐'],
  ['heidelbeere', '🫐'],
  ['sonnenblume', '🌻'],
  ['lavendel', '💐'],
  ['tagetes', '🌼'],
  ['ringelblume', '🌼'],
];

const CATEGORY_ICONS: Record<string, string> = {
  VEGETABLE: '🥦',
  FRUIT: '🍓',
  HERB: '🌿',
  FLOWER: '🌸',
  TREE: '🌲',
  SHRUB: '🌳',
};

export function plantIcon(plant: Plant): string {
  if (plant.iconEmoji) return plant.iconEmoji;
  const lower = plant.name.toLowerCase();
  for (const [key, icon] of NAME_ICONS) {
    if (lower.includes(key)) return icon;
  }
  return CATEGORY_ICONS[plant.category] ?? '🌱';
}

export function plantHue(plant: Plant): number {
  let hash = 0;
  for (let i = 0; i < plant.id.length; i++) {
    hash = plant.id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ((hash % 360) + 360) % 360;
}

export function plantColor(plant: Plant): string {
  if (plant.colorHex) return plant.colorHex;
  return `hsl(${plantHue(plant)}, 65%, 45%)`;
}

export function plantColorLight(plant: Plant): string {
  if (plant.colorHex) return lightenHex(plant.colorHex, 0.78);
  return `hsl(${plantHue(plant)}, 55%, 85%)`;
}

function lightenHex(hex: string, towardsWhite: number): string {
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
  if (normalized.length !== 6) return hex;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * towardsWhite);
  return `#${[mix(r), mix(g), mix(b)]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
}
