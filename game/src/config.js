// Sizzle & Serve — configuration: recipes, ingredients, tuning and palette.
// One clear job: every number and name the rest of the game reads lives here.

export const VIEW_W = 1280;
export const VIEW_H = 720;

export const SHIFT_SECONDS = 150;
export const MAX_HEARTS = 3;
export const MAX_CARRY = 2;
export const MAX_ORDERS = 4;

export const CHOP_SECONDS = 2.5;
export const GRILL_SECONDS = 6;
export const BURN_SECONDS = 8;

export const START_ORDER_DELAY = 11;
export const MIN_ORDER_DELAY = 6.5;
export const START_PATIENCE = 48;
export const MIN_PATIENCE = 30;

export const SERVE_POINTS = 100;
export const WRONG_POINTS = 50;
export const MAX_COMBO = 5;

// Ingredient ids. A chopped ingredient is the same id with "_chopped" appended.
export const INGREDIENTS = {
  bun:     { name: 'Roti',     color: '#e8a95c', dark: '#b97e33', chop: false, grill: false },
  patty:   { name: 'Daging',   color: '#a5552f', dark: '#6e3319', chop: false, grill: true },
  tomato:  { name: 'Tomat',    color: '#e84a3a', dark: '#a92c20', chop: true,  grill: false },
  lettuce: { name: 'Selada',   color: '#5fbf4a', dark: '#3a8a2a', chop: true,  grill: false },
  cheese:  { name: 'Keju',     color: '#ffc93c', dark: '#d99a12', chop: false, grill: false },
};

export const RECIPES = [
  {
    id: 'burger',
    name: 'Burger Klasik',
    needs: ['bun', 'patty_cooked', 'lettuce_chopped'],
    price: 120,
  },
  {
    id: 'salad',
    name: 'Salad Segar',
    needs: ['tomato_chopped', 'lettuce_chopped', 'cheese'],
    price: 110,
  },
  {
    id: 'cheesy',
    name: 'Keju Leleh',
    needs: ['bun', 'cheese', 'patty_cooked'],
    price: 130,
  },
  {
    id: 'garden',
    name: 'Burger Kebun',
    needs: ['bun', 'tomato_chopped', 'patty_cooked'],
    price: 140,
  },
];

export function recipeById(id) {
  return RECIPES.find((r) => r.id === id);
}

export function ingredientLabel(id) {
  if (id === 'patty_cooked') return 'Daging Matang';
  if (id === 'patty_burnt') return 'Daging Gosong';
  if (id.endsWith('_chopped')) {
    const base = INGREDIENTS[id.slice(0, -8)];
    return base ? `${base.name} Cincang` : id;
  }
  const base = INGREDIENTS[id];
  return base ? base.name : id;
}

export function ingredientColor(id) {
  if (id === 'patty_cooked') return '#7a3d1e';
  if (id === 'patty_burnt') return '#241a12';
  if (id.endsWith('_chopped')) return INGREDIENTS[id.slice(0, -8)].color;
  return INGREDIENTS[id].color;
}

export const PALETTE = {
  floor: '#c98f5f',
  floorDark: '#b57a4a',
  wall: '#7d4b2d',
  wallTop: '#9c6238',
  counter: '#8a5a33',
  counterTop: '#d9b48a',
  steel: '#b9c4cc',
  steelDark: '#7e8b95',
  board: '#fff7e0',
  ink: '#2e1d10',
  cream: '#fff3d6',
  red: '#d9382b',
  green: '#3f9e3a',
  gold: '#ffb703',
};
