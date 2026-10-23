import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isConfigured, supabase } from "./supabase.js";

// Live overrides of the carta (sold out + price) for the PDA.
//
// - Supabase configured: table `catalog_overrides` (see supabase/migration-002-*.sql) + realtime.
//   If the table does not exist yet (SQL not run) the PDA keeps working with the base catalog and
//   `status` is 'missing' (Admin shows "Esegui la migrazione SQL").
// - Not configured: same shape in localStorage, synced between tabs with the `storage` event.
//
// The public website never reads this: its menu stays static (src/catalog.js).
//
// override: { item_id, price_cents: int|null, available: boolean, updated_at }

const LS_KEY = "pitteri-pda-overrides-v1";
export const MIGRATION_FILE = "supabase/migration-002-cuenta-admin-informes.sql";
export const MIGRATION_MESSAGE = `Esegui la migrazione SQL (${MIGRATION_FILE})`;

export const MAX_PRICE_CENTS = 100000; // same limit as the CHECK in the database

const isMissingTable = (failure) =>
  failure?.code === "PGRST205" ||
  failure?.code === "42P01" ||
  /catalog_overrides.*(schema cache|does not exist)/i.test(failure?.message || "");

const toMap = (rows) => Object.fromEntries((rows || []).map((row) => [row.item_id, row]));

function readLocal() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocal(map) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch {
    // storage blocked: the state still lives in memory for this tab
  }
}

export function useCatalogOverrides() {
  const [overrides, setOverrides] = useState(() => (isConfigured ? {} : readLocal()));
  // 'local' | 'loading' | 'ok' | 'missing' | 'error'
  const [status, setStatus] = useState(isConfigured ? "loading" : "local");
  const [reloadKey, setReloadKey] = useState(0);
  const ref = useRef(overrides);
  ref.current = overrides;
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    if (!isConfigured) return undefined;
    let cancelled = false;
    let channel = null;

    async function fetchAll() {
      const { data, error } = await supabase.from("catalog_overrides").select("*");
      if (cancelled) return false;
      if (error) {
        setStatus(isMissingTable(error) ? "missing" : "error");
        return false;
      }
      setOverrides(toMap(data));
      setStatus("ok");
      return true;
    }

    (async () => {
      if (!(await fetchAll())) return; // do not subscribe to a table that is not there
      // Own channel: a failure here must never affect the tables/orders channel.
      channel = supabase
        .channel("pda-overrides")
        .on("postgres_changes", { event: "*", schema: "public", table: "catalog_overrides" }, (payload) => {
          if (payload.eventType === "DELETE") {
            setOverrides((prev) => {
              const next = { ...prev };
              delete next[payload.old.item_id];
              return next;
            });
          } else {
            setOverrides((prev) => ({ ...prev, [payload.new.item_id]: payload.new }));
          }
        })
        .subscribe((state) => {
          if (state === "SUBSCRIBED") fetchAll(); // resync after (re)connecting
        });
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [reloadKey]);

  useEffect(() => {
    if (isConfigured) return undefined;
    const onStorage = (event) => {
      if (event.key !== LS_KEY && event.key !== null) return;
      setOverrides(readLocal());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const reload = useCallback(() => {
    setStatus("loading");
    setReloadKey((key) => key + 1);
  }, []);

  // patch: { price_cents?: int|null, available?: boolean }
  const setOverride = useCallback(async (itemId, patch) => {
    const previous = ref.current[itemId];
    const row = {
      item_id: itemId,
      price_cents: previous?.price_cents ?? null,
      available: previous?.available !== false,
      ...patch,
      updated_at: new Date().toISOString(),
    };
    if (row.price_cents != null && !(Number.isInteger(row.price_cents) && row.price_cents >= 0 && row.price_cents <= MAX_PRICE_CENTS)) {
      throw new Error("Prezzo non valido (da 0 a 1000 €)");
    }

    if (!isConfigured) {
      const next = { ...ref.current, [itemId]: row };
      writeLocal(next);
      setOverrides(next);
      return;
    }
    if (statusRef.current === "missing") throw new Error(MIGRATION_MESSAGE);

    setOverrides((prev) => ({ ...prev, [itemId]: row })); // optimistic
    const rollback = () =>
      setOverrides((prev) => {
        const next = { ...prev };
        if (previous) next[itemId] = previous;
        else delete next[itemId];
        return next;
      });

    // update first, insert when the row does not exist yet (anon has no upsert-friendly grants: no UPDATE on item_id)
    const changes = { price_cents: row.price_cents, available: row.available, updated_at: row.updated_at };
    let { data, error } = await supabase.from("catalog_overrides").update(changes).eq("item_id", itemId).select();
    if (!error && (!data || data.length === 0)) {
      ({ error } = await supabase.from("catalog_overrides").insert(row));
    }
    if (error) {
      rollback();
      if (isMissingTable(error)) {
        setStatus("missing");
        throw new Error(MIGRATION_MESSAGE);
      }
      throw new Error(error.message || "Operazione non riuscita");
    }
  }, []);

  return useMemo(() => ({ overrides, status, setOverride, reload }), [overrides, status, setOverride, reload]);
}
