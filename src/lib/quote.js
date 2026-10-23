export const PACKAGES = [
  { id: "ape", price: 25, drinks: 1 },
  { id: "all", price: 30, drinks: 2 },
  { id: "wine", price: 30, drinks: 1, wineHours: 2 },
  { id: "laurea", price: 40, drinks: 4 },
];

function whole(value, max) {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(max, Math.max(0, parsed));
}

export function buildQuote({ guests, saturday, price, water, soft, extraDrinks, dj }) {
  const safeGuests = whole(guests, 150);
  const consumption = safeGuests * price;
  const minimum = saturday ? 2000 : 1500;
  const gap = Math.max(0, minimum - consumption);
  const base = consumption + gap;
  const extraCount = whole(extraDrinks, 400);
  const waterCost = water ? safeGuests * 3 : 0;
  const softCost = soft ? safeGuests * 10 : 0;
  const drinksCost = extraCount * 5;
  const djCost = dj ? 200 : 0;
  const extras = waterCost + softCost + drinksCost + djCost;
  const total = base + extras;
  return {
    safeGuests,
    consumption,
    minimum,
    gap,
    base,
    waterCost,
    softCost,
    drinksCost,
    extraCount,
    djCost,
    extras,
    total,
    perHead: safeGuests ? total / safeGuests : 0,
    coverAt: Math.ceil(minimum / price),
  };
}
