import { useEffect, useRef, useState } from "react";
import { ZONES } from "../floor.js";
import { formatPrice } from "../../catalog.js";
import { waiterHasAllZones, waiterHasZone, zoneOwners, isAdmin } from "../waiters.js";

const STATUS_LABEL = { free: "Libero", open: "Aperto", paying: "Conto richiesto" };

export default function Floor({
  waiter,
  tables,
  orders,
  readyOrders,
  dismissed,
  onDismiss,
  markServed,
  hasDrafts,
  loading,
  error,
  onPick,
  onKitchen,
  onAdmin,
  onSummary,
  onLogout,
  status,
}) {
  const [view, setView] = useState("mine"); // 'mine' | 'all'
  const [confirmTable, setConfirmTable] = useState(null); // tap-again confirmation for another waiter's table
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [problem, setProblem] = useState("");
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  const totals = {};
  for (const order of orders) totals[order.table_id] = (totals[order.table_id] || 0) + order.total_cents;

  const myZones = ZONES.filter((zone) => waiterHasZone(waiter, zone.key));
  const showToggle = !waiterHasAllZones(waiter);
  const effectiveView = showToggle ? view : "all";
  const visibleZones = effectiveView === "mine" ? myZones : ZONES;

  const readyTables = new Set(readyOrders.map((order) => order.table_id));
  const banners = readyOrders.filter((order) => !dismissed.has(order.id));

  function pick(table, other) {
    if (other && confirmTable !== table.id) {
      setConfirmTable(table.id);
      later(() => setConfirmTable((current) => (current === table.id ? null : current)), 3500);
      return;
    }
    setConfirmTable(null);
    onPick(table.id);
  }

  function logout() {
    if (hasDrafts && !confirmLogout) {
      setConfirmLogout(true);
      later(() => setConfirmLogout(false), 3500);
      return;
    }
    onLogout();
  }

  async function served(order) {
    setProblem("");
    try {
      await markServed(order.id);
    } catch (failure) {
      setProblem(failure.message || "Operazione non riuscita");
    }
  }

  return (
    <div className="screen">
      {banners.length > 0 && (
        <div className="alerts" role="alert" aria-live="assertive">
          {banners.map((order) => (
            <div key={order.id} className="alert">
              <button type="button" className="alert__body" onClick={() => onDismiss(order.id)}>
                <span className="alert__text">🔔 Tavolo {order.table_id} pronto al ritiro!</span>
                {isAdmin(waiter) && order.waiter_name && <small>Cameriere: {order.waiter_name}</small>}
                <small className="alert__hint">Tocca per nascondere</small>
              </button>
              <button type="button" className="alert__served" onClick={() => served(order)}>
                Servito
              </button>
            </div>
          ))}
        </div>
      )}

      <header className="bar">
        <h1 className="bar__title">Tavoli</h1>
        <span className="bar__spacer" />
        {status}
        <button type="button" className="chip" onClick={onKitchen} aria-label="Apri la vista cucina">
          Cucina
        </button>
        <div className="who">
          <div className="who__info">
            <span className="who__name">{waiter.name}</span>
            <span className="who__zones">{myZones.map((zone) => zone.label).join(" · ")}</span>
          </div>
          <button
            type="button"
            className={`chip who__out${confirmLogout ? " is-warn" : ""}`}
            onClick={logout}
            aria-label="Cambia cameriere / Chiudi turno"
          >
            {confirmLogout ? "Righe non inviate: tocca ancora" : "Chiudi turno"}
          </button>
        </div>
        {isAdmin(waiter) && (
          <nav className="adminnav" aria-label="Funzioni admin">
            <button type="button" className="chip" onClick={onAdmin}>
              Admin carta
            </button>
            <button type="button" className="chip" onClick={onSummary}>
              Chiusura / Riepilogo
            </button>
          </nav>
        )}
        {showToggle && (
          <div className="seg" role="tablist" aria-label="Filtro tavoli">
            <button
              type="button"
              role="tab"
              aria-selected={effectiveView === "mine"}
              className={`seg__btn${effectiveView === "mine" ? " is-active" : ""}`}
              onClick={() => setView("mine")}
            >
              Le mie
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={effectiveView === "all"}
              className={`seg__btn${effectiveView === "all" ? " is-active" : ""}`}
              onClick={() => setView("all")}
            >
              Tutte
            </button>
          </div>
        )}
      </header>

      <div className="scroll">
        {error && <p className="notice notice--error">Errore dati: {error}</p>}
        {problem && <p className="notice notice--error">{problem}</p>}
        {loading && <p className="notice">Caricamento…</p>}
        {visibleZones.map((zone) => {
          const list = tables.filter((table) => table.zone === zone.id);
          if (!list.length) return null;
          const other = !waiterHasZone(waiter, zone.key);
          const owners = zoneOwners(zone.key).join(", ");
          return (
            <section key={zone.id} className={`zone${other ? " zone--other" : ""}`}>
              <h2 className="zone__title">
                {zone.label}
                {other && <span className="zone__tag">{owners ? `di ${owners}` : "altro cameriere"}</span>}
              </h2>
              <div className="tables">
                {list.map((table) => {
                  const ready = readyTables.has(table.id);
                  const asking = other && confirmTable === table.id;
                  return (
                    <button
                      key={table.id}
                      type="button"
                      className={`table table--${table.status}${other ? " is-other" : ""}${asking ? " is-asking" : ""}${ready ? " is-ready" : ""}`}
                      onClick={() => pick(table, other)}
                    >
                      {ready && (
                        <span className="table__bell" role="img" aria-label="Pronto al ritiro">
                          🔔
                        </span>
                      )}
                      <span className="table__id">{table.id}</span>
                      <span className="table__state">
                        {asking ? "Tocca ancora" : STATUS_LABEL[table.status] || table.status}
                      </span>
                      {!asking && table.status !== "free" && totals[table.id] > 0 && (
                        <span className="table__sum">{formatPrice(totals[table.id], "it")}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
