import { categories, items } from "../catalog.js";

// The PDA's view of the carta: the static catalog (src/catalog.js, the one the public site
// uses and never changes at runtime) + the live overrides stored in `catalog_overrides`
// (sold out + price). The public site does NOT read overrides; only the PDA does.

// Short Italian labels for the category tabs / reports.
export const TAB_LABELS = {
  cocktail: "Cocktail",
  cubate: "Cubate",
  bianchi: "Bianchi e shot",
  vinobirra: "Vino e birra",
  analcolico: "Caffè e analcolici",
  piadine: "Piadine",
  snack: "Panini e snack",
  cena: "Per cena",
};

export const categoryLabel = (categoryId) =>
  TAB_LABELS[categoryId] || categories.find((cat) => cat.id === categoryId)?.short.it || "Altro";

const byId = new Map(items.map((item) => [item.id, item]));

// Category label of a product id found inside an old order ('Altro' when it is unknown).
export const categoryOfItemId = (itemId) => {
  const item = byId.get(itemId);
  return item ? categoryLabel(item.category) : "Altro";
};

export const baseItem = (itemId) => byId.get(itemId) || null;

// override row: { item_id, price_cents (null = base price), available }
export function applyOverrides(overrides) {
  return items.map((item) => {
    const override = overrides?.[item.id];
    const price = override && override.price_cents != null ? override.price_cents : item.priceCents;
    return {
      ...item,
      priceCents: price,
      basePriceCents: item.priceCents,
      priceOverridden: price !== item.priceCents,
      available: override ? override.available !== false : true,
    };
  });
}
