import { formatPrice } from "../catalog.js";

export const eur = (cents) => formatPrice(cents, "it");

const TZ = "Europe/Rome";

const clockFmt = new Intl.DateTimeFormat("it-IT", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
const dateFmt = new Intl.DateTimeFormat("it-IT", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" });

export const clockOf = (value) => clockFmt.format(new Date(value));
export const dateOf = (value) => dateFmt.format(new Date(value));
export const dateTimeOf = (value) => `${dateOf(value)} ${clockOf(value)}`;

export const PAYMENT_METHODS = [
  { id: "cash", label: "Contanti" },
  { id: "card", label: "Carta" },
  { id: "other", label: "Altro" },
];

export const methodLabel = (method) => PAYMENT_METHODS.find((m) => m.id === method)?.label || "Non indicato";

// Groups the lines of several orders: same product and same unit price = one line.
// (Different prices can coexist if the admin changed a price between two orders of the same table.)
export function groupLines(orders) {
  const map = new Map();
  for (const order of orders) {
    for (const line of order.items || []) {
      const key = `${line.id}|${line.unitCents}`;
      const current = map.get(key) || { key, id: line.id, name: line.name, unitCents: line.unitCents, qty: 0, notes: [] };
      current.qty += line.qty;
      if (line.note && !current.notes.includes(line.note)) current.notes.push(line.note);
      map.set(key, current);
    }
  }
  return [...map.values()].map((line) => ({ ...line, totalCents: line.qty * line.unitCents }));
}

export const linesTotal = (lines) => lines.reduce((sum, line) => sum + line.totalCents, 0);
