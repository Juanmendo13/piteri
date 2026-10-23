import { useMemo, useState } from "react";
import Lock from "./screens/Lock.jsx";
import Floor from "./screens/Floor.jsx";
import Order from "./screens/Order.jsx";
import Bill from "./screens/Bill.jsx";
import Admin from "./screens/Admin.jsx";
import Summary from "./screens/Summary.jsx";
import Kitchen from "./screens/Kitchen.jsx";
import { useBarRealtime } from "./useBarRealtime.js";
import { useCatalogOverrides } from "./useCatalogOverrides.js";
import { applyOverrides } from "./catalogView.js";
import { isConfigured } from "./supabase.js";
import { clearActiveWaiter, isAdmin, loadActiveWaiter } from "./waiters.js";

const startsInKitchen = () => new URLSearchParams(window.location.search).has("cucina");

function setKitchenUrl(on) {
  window.history.replaceState(null, "", window.location.pathname + (on ? "?cucina" : ""));
}

function ConnectionBadge({ connected }) {
  if (!isConfigured) return <span className="badge badge--local">modalità locale</span>;
  return connected ? (
    <span className="badge badge--live">live</span>
  ) : (
    <span className="badge badge--off">offline</span>
  );
}

// Mounted only after the PIN, so no data connection is opened on the lock screen.
function Main({ waiter, onLogout }) {
  const bar = useBarRealtime(waiter);
  const carta = useCatalogOverrides();
  const catalog = useMemo(() => applyOverrides(carta.overrides), [carta.overrides]);
  const [screen, setScreen] = useState(startsInKitchen() ? "kitchen" : "floor");
  const [tableId, setTableId] = useState(null);
  const [drafts, setDrafts] = useState({}); // unsent lines per table, kept when going back

  const badge = <ConnectionBadge connected={bar.connected} />;
  const table = bar.tables.find((t) => t.id === tableId);
  const hasDrafts = Object.values(drafts).some((lines) => lines.length > 0);

  if (screen === "kitchen") {
    return (
      <Kitchen
        orders={bar.orders}
        loading={bar.loading}
        error={bar.error}
        markReady={bar.markReady}
        markServed={bar.markServed}
        status={badge}
        onFloor={() => {
          setKitchenUrl(false);
          setScreen("floor");
        }}
      />
    );
  }

  // Admin screens: only for the admin waiter (the PIN is just a screen lock, see waiters.js).
  if (screen === "admin" && isAdmin(waiter)) {
    return (
      <Admin
        catalog={catalog}
        overridesState={carta.status}
        setOverride={carta.setOverride}
        reload={carta.reload}
        status={badge}
        onBack={() => setScreen("floor")}
      />
    );
  }

  if (screen === "summary" && isAdmin(waiter)) {
    return <Summary status={badge} onBack={() => setScreen("floor")} />;
  }

  if (screen === "bill" && table) {
    return (
      <Bill
        key={table.id}
        table={table}
        orders={bar.orders.filter((order) => order.table_id === table.id)}
        actions={bar}
        status={badge}
        onBack={() => setScreen("order")}
        onDone={() => {
          setDrafts((prev) => ({ ...prev, [table.id]: [] }));
          setScreen("floor");
        }}
      />
    );
  }

  if (screen === "order" && table) {
    return (
      <Order
        key={table.id}
        table={table}
        waiter={waiter}
        catalog={catalog}
        lines={drafts[table.id] || []}
        setLines={(update) =>
          setDrafts((prev) => {
            const current = prev[table.id] || [];
            return { ...prev, [table.id]: typeof update === "function" ? update(current) : update };
          })
        }
        orders={bar.orders.filter((order) => order.table_id === table.id)}
        actions={bar}
        status={badge}
        onBack={() => setScreen("floor")}
        onBill={() => setScreen("bill")}
      />
    );
  }

  return (
    <Floor
      waiter={waiter}
      tables={bar.tables}
      orders={bar.orders}
      readyOrders={bar.readyOrders}
      dismissed={bar.dismissed}
      onDismiss={bar.dismissReady}
      markServed={bar.markServed}
      hasDrafts={hasDrafts}
      loading={bar.loading}
      error={bar.error}
      status={badge}
      onPick={(id) => {
        setTableId(id);
        setScreen("order");
      }}
      onKitchen={() => {
        setKitchenUrl(true);
        setScreen("kitchen");
      }}
      onAdmin={() => setScreen("admin")}
      onSummary={() => setScreen("summary")}
      onLogout={onLogout}
    />
  );
}

export default function App() {
  const [waiter, setWaiter] = useState(loadActiveWaiter);

  function logout() {
    clearActiveWaiter();
    setWaiter(null);
  }

  // key: a new waiter always starts from a clean state (drafts, alerts, screen).
  return waiter ? <Main key={waiter.id} waiter={waiter} onLogout={logout} /> : <Lock onUnlock={setWaiter} />;
}
