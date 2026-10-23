// Waiters of the PDA (configurable list).
//
// ⚠️ This is ONLY A SCREEN LOCK / "who is using this phone" selector.
// Real PINs live in PUBLIC_WAITERS_JSON (.env.local / Vercel), never in git.
// The build still injects that JSON into the public JS (/assets/pda.js): anyone
// can read it. It is NOT security. The real protection of the data is the RLS
// policies in supabase/policies.sql. Never gate anything sensitive behind these PINs.
//
// Fields: { id, pin, name, zones, admin? }
//   id     stable id, saved on every order (orders.waiter_id)
//   pin    4 digits
//   name   shown on the floor plan and on the kitchen tickets (orders.waiter_name)
//   zones  zone keys the waiter looks after: 'sala' | 'giardino' | 'bancone'
//   admin  (optional) receives every "pronto per ritiro" alert, whatever the table
//
// Production must set PUBLIC_WAITERS_JSON. If it is missing or invalid, the
// demo list below is used (pins "XXXX" — they do not unlock the keypad).

export const PIN_LENGTH = 4;

// Zone keys. floor.js maps the zone values stored in Supabase
// ('sala', 'barra', 'terraza') to these keys.
export const ZONE_KEYS = ["sala", "giardino", "bancone"];

// Demo fallback only. Real waiters: PUBLIC_WAITERS_JSON in .env.local / Vercel.
const EXAMPLE_WAITERS = [
  { id: "marco", pin: "XXXX", name: "Marco", zones: ["sala"] },
  { id: "sofia", pin: "XXXX", name: "Sofia", zones: ["giardino"] },
  { id: "luca", pin: "XXXX", name: "Luca", zones: ["bancone"] },
  { id: "admin", pin: "XXXX", name: "Admin / Caposala", zones: ["sala", "giardino", "bancone"], admin: true },
];

function isWaiter(value) {
  return (
    value &&
    typeof value.id === "string" &&
    typeof value.pin === "string" &&
    typeof value.name === "string" &&
    Array.isArray(value.zones) &&
    value.zones.every((zone) => typeof zone === "string")
  );
}

function parseWaitersFromEnv() {
  const raw = process.env.PUBLIC_WAITERS_JSON;
  if (!raw || typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(isWaiter)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const WAITERS = parseWaitersFromEnv() ?? EXAMPLE_WAITERS;

export const findWaiterByPin = (pin) => WAITERS.find((waiter) => waiter.pin === pin) || null;

export const getWaiterById = (id) => WAITERS.find((waiter) => waiter.id === id) || null;

export const isAdmin = (waiter) => Boolean(waiter?.admin);

export const waiterHasZone = (waiter, zoneKey) => Boolean(waiter) && (isAdmin(waiter) || waiter.zones.includes(zoneKey));

// True when the waiter looks after every zone (no need for the "Le mie / Tutte" toggle).
export const waiterHasAllZones = (waiter) => ZONE_KEYS.every((key) => waiterHasZone(waiter, key));

// Names of the (non-admin) waiters in charge of a zone, e.g. ["Sofia"].
export const zoneOwners = (zoneKey) =>
  WAITERS.filter((waiter) => !isAdmin(waiter) && waiter.zones.includes(zoneKey)).map((waiter) => waiter.name);

// Alerts: a waiter gets the alerts of their own orders, the admin gets all of them.
export const isOrderOfWaiter = (order, waiter) =>
  Boolean(waiter) && (isAdmin(waiter) || (Boolean(order.waiter_id) && order.waiter_id === waiter.id));

// ---------- active waiter (kept for the browser session, restored on reload) ----------

const SESSION_KEY = "pitteri-pda-waiter";
let memoryWaiterId = null; // fallback when storage is blocked

export function loadActiveWaiter() {
  let id = memoryWaiterId;
  try {
    id = sessionStorage.getItem(SESSION_KEY) || id;
  } catch {
    // storage blocked: use the in-memory value
  }
  return getWaiterById(id);
}

export function saveActiveWaiter(waiter) {
  memoryWaiterId = waiter.id;
  try {
    sessionStorage.setItem(SESSION_KEY, waiter.id);
  } catch {
    // private mode: stays unlocked for this page load only
  }
}

export function clearActiveWaiter() {
  memoryWaiterId = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // nothing to clear
  }
}
