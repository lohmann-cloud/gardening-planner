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
  return `hsl(${plantHue(plant)}, 65%, 45%)`;
}

export function plantColorLight(plant: Plant): string {
  return `hsl(${plantHue(plant)}, 55%, 85%)`;
}
