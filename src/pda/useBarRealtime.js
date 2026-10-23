import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isConfigured, supabase } from "./supabase.js";
import { TABLES } from "./floor.js";
import { isOrderOfWaiter } from "./waiters.js";

// Data layer for the PDA and the kitchen display.
//
// - Supabase configured: select + realtime (postgres_changes) on `tables` and `orders`.
// - Not configured: same shapes and same actions, persisted in localStorage and synced
//   between browser tabs with the `storage` event (two tabs behave like two phones).
//
// Shapes (match supabase/schema.sql):
//   table: { id, zone, status: 'free'|'open'|'paying', updated_at }
//   order: { id, table_id, items, status: 'sent'|'ready'|'served'|'closed', total_cents, created_at,
//            waiter_id, waiter_name, closed_at, payment_method: 'cash'|'card'|'other'|null }
//   item (inside order.items): { id, name, qty, unitCents, note }
//
// `orders` holds the orders that are not closed yet (status 'sent' = in the kitchen,
// 'ready' = the kitchen/bar says "pronto per ritiro", 'served' = already delivered but not
// paid). The kitchen shows 'sent' + 'ready'.

const LS_KEY = "pitteri-pda-v1";
const OPEN_STATUSES = ["sent", "ready", "served"];

// Supabase error when the database has not been migrated yet (see supabase/README.md).
const isMissingColumn = (failure) =>
  failure?.code === "PGRST204" ||
  failure?.code === "42703" ||
  /waiter_(id|name)|closed_at|payment_method/.test(failure?.message || "");
const isOutdatedDb = (failure) => ["23514", "42501"].includes(failure?.code);
const OUTDATED_MESSAGE = "Database non aggiornato: esegui la migrazione in supabase/README.md";
const MAX_CLOSED_LOCAL = 500; // closed orders kept in local mode (history for the Riepilogo)

const tableOrder = new Map(TABLES.map((table, index) => [table.id, index]));

function uid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const nowIso = () => new Date().toISOString();

const sortTables = (list) =>
  [...list].sort((a, b) => (tableOrder.get(a.id) ?? 999) - (tableOrder.get(b.id) ?? 999));

const sortOrders = (list) =>
  [...list].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));

const defaultTables = () => TABLES.map((table) => ({ ...table, updated_at: nowIso() }));

function withAllTables(rows) {
  const known = new Map(rows.map((row) => [row.id, row]));
  const merged = [...rows];
  for (const table of defaultTables()) if (!known.has(table.id)) merged.push(table);
  return sortTables(merged);
}

// ---------- local mode storage ----------

function readLocal() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LS_KEY) || "null");
    if (parsed && Array.isArray(parsed.tables) && Array.isArray(parsed.orders)) {
      return { tables: withAllTables(parsed.tables), orders: parsed.orders };
    }
  } catch {
    // corrupted storage: start clean
  }
  return { tables: defaultTables(), orders: [] };
}

function writeLocal(data) {
  const closed = data.orders.filter((order) => order.status === "closed").slice(-MAX_CLOSED_LOCAL);
  const open = data.orders.filter((order) => order.status !== "closed");
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ tables: data.tables, orders: [...closed, ...open] }));
  } catch {
    // storage full or blocked: state still lives in memory for this tab
  }
}

// All locally stored orders (open + the last closed ones). Used by the reports in local mode.
export const readLocalOrders = () => readLocal().orders;

const activeOnly = (orders) => sortOrders(orders.filter((order) => order.status !== "closed"));

// ---------- hook ----------

// `waiter` (active waiter, optional) only decides which "ready" transitions vibrate the phone.
export function useBarRealtime(waiter = null) {
  const [tables, setTables] = useState(() => (isConfigured ? withAllTables([]) : readLocal().tables));
  const [orders, setOrders] = useState(() => (isConfigured ? [] : activeOnly(readLocal().orders)));
  const [loading, setLoading] = useState(isConfigured);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [dismissed, setDismissed] = useState(() => new Set()); // ready alerts the waiter tapped away
  const mounted = useRef(true);
  const waiterRef = useRef(waiter);
  waiterRef.current = waiter;
  const ordersRef = useRef([]);
  ordersRef.current = orders;
  const prevStatus = useRef(null); // order id -> last seen status (null until the first load is done)

  // --- state helpers (used by realtime events and optimistic updates)
  const upsertTable = useCallback((row) => {
    setTables((prev) =>
      sortTables(prev.some((t) => t.id === row.id) ? prev.map((t) => (t.id === row.id ? { ...t, ...row } : t)) : [...prev, row]),
    );
  }, []);

  const upsertOrder = useCallback((row) => {
    setOrders((prev) => {
      const rest = prev.filter((o) => o.id !== row.id);
      return row.status === "closed" ? rest : sortOrders([...rest, row]);
    });
  }, []);

  const removeOrder = useCallback((id) => setOrders((prev) => prev.filter((o) => o.id !== id)), []);

  // --- Supabase: initial load + realtime
  useEffect(() => {
    mounted.current = true;
    if (!isConfigured) return undefined;

    async function load() {
      const [tablesResult, ordersResult] = await Promise.all([
        supabase.from("tables").select("*"),
        supabase.from("orders").select("*").in("status", OPEN_STATUSES).order("created_at", { ascending: true }),
      ]);
      if (!mounted.current) return;
      const failure = tablesResult.error || ordersResult.error;
      if (failure) {
        setError(failure.message);
      } else {
        setError(null);
        setTables(withAllTables(tablesResult.data));
        setOrders(activeOnly(ordersResult.data));
      }
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel("pda-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tables" }, (payload) => {
        if (payload.eventType === "DELETE") return;
        upsertTable(payload.new);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        if (payload.eventType === "DELETE") removeOrder(payload.old.id);
        else upsertOrder(payload.new);
      })
      .subscribe((status) => {
        if (!mounted.current) return;
        if (status === "SUBSCRIBED") {
          setConnected(true);
          load(); // resync after (re)connecting so nothing is missed
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setConnected(false);
        }
      });

    return () => {
      mounted.current = false;
      supabase.removeChannel(channel);
    };
  }, [upsertTable, upsertOrder, removeOrder]);

  // --- Local mode: stay in sync with other tabs
  useEffect(() => {
    if (isConfigured) return undefined;
    const onStorage = (event) => {
      if (event.key !== LS_KEY && event.key !== null) return;
      const data = readLocal();
      setTables(data.tables);
      setOrders(activeOnly(data.orders));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // --- "pronto per ritiro": vibrate only on the transition to 'ready' (previous vs new status),
  // never on the first load nor on later renders.
  useEffect(() => {
    if (loading) return;
    const previous = prevStatus.current;
    const next = new Map(orders.map((order) => [order.id, order.status]));
    prevStatus.current = next;
    if (!previous) return; // first snapshot: just remember it
    const justReady = orders.some(
      (order) => order.status === "ready" && previous.get(order.id) !== "ready" && isOrderOfWaiter(order, waiterRef.current),
    );
    if (justReady) {
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {
        // vibration not supported or blocked: the banner is enough
      }
    }
  }, [orders, loading]);

  const dismissReady = useCallback((orderId) => {
    setDismissed((prev) => new Set(prev).add(orderId));
  }, []);

  // Ready orders this waiter must pick up (the admin gets all of them).
  const readyOrders = useMemo(
    () => orders.filter((order) => order.status === "ready" && isOrderOfWaiter(order, waiter)),
    [orders, waiter],
  );

  const mutateLocal = useCallback((change) => {
    const data = readLocal();
    change(data);
    writeLocal(data);
    setTables(data.tables);
    setOrders(activeOnly(data.orders));
  }, []);

  const fail = useCallback((failure) => {
    const message = failure?.message || String(failure);
    setError(message);
    throw new Error(message);
  }, []);

  // --- actions
  const setTableStatus = useCallback(
    async (tableId, status) => {
      const updated_at = nowIso();
      if (!isConfigured) {
        mutateLocal((data) => {
          data.tables = data.tables.map((t) => (t.id === tableId ? { ...t, status, updated_at } : t));
        });
        return;
      }
      setTables((prev) => prev.map((t) => (t.id === tableId ? { ...t, status, updated_at } : t)));
      const { error: failure } = await supabase.from("tables").update({ status, updated_at }).eq("id", tableId);
      if (failure) fail(failure);
    },
    [mutateLocal, fail],
  );

  const sendOrder = useCallback(
    async (tableId, items, totalCents, orderWaiter = null) => {
      const waiterFields = { waiter_id: orderWaiter?.id ?? null, waiter_name: orderWaiter?.name ?? null };
      if (!isConfigured) {
        const order = {
          id: uid(),
          table_id: tableId,
          items,
          status: "sent",
          total_cents: totalCents,
          ...waiterFields,
          created_at: nowIso(),
        };
        mutateLocal((data) => {
          data.orders = [...data.orders, order];
          data.tables = data.tables.map((t) => (t.id === tableId ? { ...t, status: "open", updated_at: nowIso() } : t));
        });
        return order;
      }
      const insert = (row) => supabase.from("orders").insert(row).select().single();
      const base = { table_id: tableId, items, status: "sent", total_cents: totalCents };
      let { data, error: failure } = await insert({ ...base, ...waiterFields });
      if (failure && (isMissingColumn(failure) || failure.code === "42501")) {
        // Database not migrated yet (no waiter_id / waiter_name columns or grants):
        // send the order anyway, just without the waiter.
        ({ data, error: failure } = await insert(base));
      }
      if (failure) fail(failure);
      upsertOrder(data);
      await setTableStatus(tableId, "open");
      return data;
    },
    [mutateLocal, upsertOrder, setTableStatus, fail],
  );

  const requestBill = useCallback((tableId) => setTableStatus(tableId, "paying"), [setTableStatus]);

  // Pays and closes the bill of a table: the given orders (default: every open order of the table)
  // become 'closed' with the same closed_at + payment_method, and the table goes back to 'free'
  // (or stays 'open' if another order arrived meanwhile and was not part of the bill).
  // Returns { degraded: true } when the database has no closed_at / payment_method columns yet
  // (migration not run): the bill is closed anyway, only without those two fields.
  const closeTable = useCallback(
    async (tableId, { method = null, orderIds = null } = {}) => {
      const closed_at = nowIso();
      const ids = orderIds ?? ordersRef.current.filter((o) => o.table_id === tableId).map((o) => o.id);

      if (!isConfigured) {
        mutateLocal((data) => {
          data.orders = data.orders.map((o) =>
            o.status !== "closed" && ids.includes(o.id) ? { ...o, status: "closed", closed_at, payment_method: method } : o,
          );
          const stillOpen = data.orders.some((o) => o.table_id === tableId && o.status !== "closed");
          data.tables = data.tables.map((t) =>
            t.id === tableId ? { ...t, status: stillOpen ? "open" : "free", updated_at: nowIso() } : t,
          );
        });
        return { degraded: false };
      }

      let degraded = false;
      if (ids.length > 0) {
        const removed = ordersRef.current.filter((o) => ids.includes(o.id));
        setOrders((prev) => prev.filter((o) => !ids.includes(o.id)));
        const run = (patch) =>
          supabase.from("orders").update(patch).in("id", ids).in("status", OPEN_STATUSES);
        let { error: failure } = await run({ status: "closed", closed_at, payment_method: method });
        if (failure && (isMissingColumn(failure) || failure.code === "42501")) {
          // Not migrated yet (no closed_at / payment_method columns or grants): close without them.
          degraded = true;
          ({ error: failure } = await run({ status: "closed" }));
        }
        if (failure) {
          removed.forEach(upsertOrder); // closing failed: put the orders back
          fail(failure);
        }
      }
      const remaining = ordersRef.current.some((o) => o.table_id === tableId && !ids.includes(o.id));
      await setTableStatus(tableId, remaining ? "open" : "free");
      return { degraded };
    },
    [mutateLocal, upsertOrder, setTableStatus, fail],
  );

  const markServed = useCallback(
    async (orderId) => {
      if (!isConfigured) {
        mutateLocal((data) => {
          data.orders = data.orders.map((o) => (o.id === orderId ? { ...o, status: "served" } : o));
        });
        return;
      }
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "served" } : o)));
      const { error: failure } = await supabase.from("orders").update({ status: "served" }).eq("id", orderId);
      if (failure) fail(failure);
    },
    [mutateLocal, fail],
  );

  // Kitchen: "pronto per ritiro". Only a 'sent' order can become 'ready'.
  const markReady = useCallback(
    async (orderId) => {
      if (!isConfigured) {
        mutateLocal((data) => {
          data.orders = data.orders.map((o) => (o.id === orderId && o.status === "sent" ? { ...o, status: "ready" } : o));
        });
        return;
      }
      setOrders((prev) => prev.map((o) => (o.id === orderId && o.status === "sent" ? { ...o, status: "ready" } : o)));
      const { error: failure } = await supabase
        .from("orders")
        .update({ status: "ready" })
        .eq("id", orderId)
        .eq("status", "sent");
      if (failure) {
        setOrders((prev) => prev.map((o) => (o.id === orderId && o.status === "ready" ? { ...o, status: "sent" } : o)));
        if (isOutdatedDb(failure)) {
          // Not stored in `error` on purpose: this is a one-off message for the button that failed.
          throw new Error(OUTDATED_MESSAGE);
        }
        fail(failure);
      }
    },
    [mutateLocal, fail],
  );

  return useMemo(
    () => ({
      tables,
      orders,
      loading,
      error,
      connected,
      readyOrders,
      dismissed,
      dismissReady,
      sendOrder,
      requestBill,
      closeTable,
      markReady,
      markServed,
    }),
    [
      tables,
      orders,
      loading,
      error,
      connected,
      readyOrders,
      dismissed,
      dismissReady,
      sendOrder,
      requestBill,
      closeTable,
      markReady,
      markServed,
    ],
  );
}
