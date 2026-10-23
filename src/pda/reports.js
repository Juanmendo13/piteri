import { isConfigured, supabase } from "./supabase.js";
import { readLocalOrders } from "./useBarRealtime.js";
import { categoryOfItemId } from "./catalogView.js";
import { clockOf, groupLines, methodLabel } from "./format.js";

// Reports of the closed bills ("Chiusura / Riepilogo", admin only).
//
// WORKING DAY: the bar opens 07:00-02:00, so a calendar day would cut the night in two.
// A "day" of the bar goes from 06:00 to 06:00 (Europe/Rome). Example: the day 2026-10-21 is
// 21/10 06:00 -> 22/10 06:00. Before 06:00 we are still in the previous day.
// A bill belongs to the day in which it was CLOSED (orders.closed_at). Bills closed before the
// SQL migration have no closed_at: their created_at is used instead.

const TZ = "Europe/Rome";
export const DAY_START_HOUR = 6;

const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function romeParts(ms) {
  const out = {};
  for (const part of partsFmt.formatToParts(new Date(ms))) if (part.type !== "literal") out[part.type] = Number(part.value);
  return out;
}

// Offset (ms) of Europe/Rome from UTC at the instant `ms` (3600000 in winter, 7200000 in summer).
function romeOffsetMs(ms) {
  const p = romeParts(ms);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}

// UTC instant (ms) of a wall-clock time in Rome (DST aware; 06:00 is never inside a DST gap).
function romeWallToUtc(year, month, day, hour) {
  const guess = Date.UTC(year, month - 1, day, hour);
  let utc = guess - romeOffsetMs(guess);
  utc = guess - romeOffsetMs(utc);
  return utc;
}

const dayKeyOfDate = (date) => date.toISOString().slice(0, 10);

export const addDays = (key, delta) => dayKeyOfDate(new Date(Date.parse(`${key}T00:00:00Z`) + delta * 86400000));

// 'YYYY-MM-DD' of the working day an instant belongs to.
export function workdayKeyOf(ms = Date.now()) {
  const p = romeParts(ms);
  const date = new Date(Date.UTC(p.year, p.month - 1, p.day));
  if (p.hour < DAY_START_HOUR) date.setUTCDate(date.getUTCDate() - 1);
  return dayKeyOfDate(date);
}

// [start, end) of a working day as instants.
export function dayRange(key) {
  const [y, m, d] = key.split("-").map(Number);
  const startMs = romeWallToUtc(y, m, d, DAY_START_HOUR);
  const next = addDays(key, 1).split("-").map(Number);
  const endMs = romeWallToUtc(next[0], next[1], next[2], DAY_START_HOUR);
  return { startMs, endMs, startIso: new Date(startMs).toISOString(), endIso: new Date(endMs).toISOString() };
}

export const dayLabel = (key) =>
  new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(
    new Date(`${key}T12:00:00Z`),
  );

// Instant used to place a closed order in a day.
export const closedInstant = (order) => order.closed_at || order.created_at;

const isMissingClosedAt = (failure) =>
  failure?.code === "PGRST204" || failure?.code === "42703" || /closed_at/.test(failure?.message || "");

// Closed orders of a working day (Supabase, or localStorage in local mode).
export async function fetchClosedOrders(key) {
  const { startMs, endMs, startIso, endIso } = dayRange(key);
  const inDay = (order) => {
    const at = Date.parse(closedInstant(order));
    return at >= startMs && at < endMs;
  };

  if (!isConfigured) return readLocalOrders().filter((order) => order.status === "closed" && inDay(order));

  const base = () => supabase.from("orders").select("*").eq("status", "closed").order("created_at", { ascending: true }).limit(5000);
  let { data, error } = await base().or(
    `and(closed_at.gte.${startIso},closed_at.lt.${endIso}),and(closed_at.is.null,created_at.gte.${startIso},created_at.lt.${endIso})`,
  );
  if (error && isMissingClosedAt(error)) {
    // Database not migrated yet: no closed_at column, fall back to created_at.
    ({ data, error } = await base().gte("created_at", startIso).lt("created_at", endIso));
  }
  if (error) throw new Error(error.message);
  return (data || []).filter(inDay);
}

// ---------- summary ----------

const bump = (map, key, init) => {
  if (!map.has(key)) map.set(key, init());
  return map.get(key);
};

// Bills ("conti") = orders closed together (same table + same closed_at). Old orders without
// closed_at count as one bill each.
export function buildSummary(orders) {
  const accountMap = new Map();
  const byWaiter = new Map();
  const byCategory = new Map();
  const products = new Map();
  let totalCents = 0;

  for (const order of orders) {
    const at = closedInstant(order);
    const key = order.closed_at ? `${order.table_id}|${order.closed_at}` : `single|${order.id}`;
    const account = bump(accountMap, key, () => ({
      key,
      table_id: order.table_id,
      at,
      method: null,
      waiters: new Set(),
      totalCents: 0,
      orders: [],
    }));
    account.orders.push(order);
    account.totalCents += order.total_cents;
    if (order.payment_method) account.method = order.payment_method;
    if (order.waiter_name) account.waiters.add(order.waiter_name);
    totalCents += order.total_cents;

    const waiter = bump(byWaiter, order.waiter_name || "Senza cameriere", () => ({ totalCents: 0, orders: 0 }));
    waiter.totalCents += order.total_cents;
    waiter.orders += 1;

    for (const line of order.items || []) {
      const amount = line.qty * line.unitCents;
      const category = bump(byCategory, categoryOfItemId(line.id), () => ({ totalCents: 0, qty: 0 }));
      category.totalCents += amount;
      category.qty += line.qty;
      const product = bump(products, line.id || line.name, () => ({ name: line.name, qty: 0, totalCents: 0 }));
      product.qty += line.qty;
      product.totalCents += amount;
    }
  }

  const accounts = [...accountMap.values()].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  const byMethod = new Map();
  for (const account of accounts) {
    const entry = bump(byMethod, account.method || "none", () => ({ totalCents: 0, count: 0 }));
    entry.totalCents += account.totalCents;
    entry.count += 1;
  }

  const rank = (map) => [...map.entries()].map(([name, value]) => ({ name, ...value })).sort((a, b) => b.totalCents - a.totalCents);

  return {
    totalCents,
    orderCount: orders.length,
    accountCount: accounts.length,
    accounts,
    byMethod: rank(byMethod).map((entry) => ({ ...entry, label: methodLabel(entry.name === "none" ? null : entry.name) })),
    byWaiter: rank(byWaiter),
    byCategory: rank(byCategory),
    top: [...products.values()].sort((a, b) => b.qty - a.qty || b.totalCents - a.totalCents).slice(0, 5),
  };
}

// ---------- CSV ----------

const euros = (cents) => (cents / 100).toFixed(2).replace(".", ",");

// ';' separator + decimal comma + BOM: opens correctly in Excel/LibreOffice with Italian locale.
function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text) && !/^-?\d+([.,]\d+)?$/.test(text)) text = `'${text}`; // spreadsheet formula injection
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// One row per product line of every closed bill of the day.
export function buildCsv(key, summary) {
  const rows = [
    ["giornata", "ora_chiusura", "tavolo", "cameriere", "metodo", "prodotto", "categoria", "quantita", "prezzo_unitario", "importo", "nota"],
  ];
  for (const account of [...summary.accounts].reverse()) {
    const waiters = [...account.waiters].join(" / ");
    for (const line of groupLines(account.orders)) {
      rows.push([
        key,
        clockOf(account.at),
        account.table_id,
        waiters,
        methodLabel(account.method),
        line.name,
        categoryOfItemId(line.id),
        line.qty,
        euros(line.unitCents),
        euros(line.totalCents),
        line.notes.join(" | "),
      ]);
    }
  }
  rows.push([]);
  rows.push([key, "", "", "", "", "TOTALE", "", "", "", euros(summary.totalCents), ""]);
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}\r\n`;
}

// Browser download, no backend.
export function downloadText(filename, text, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
