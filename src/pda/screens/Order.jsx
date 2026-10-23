import { useState } from "react";
import { categories } from "../../catalog.js";
import { TAB_LABELS } from "../catalogView.js";
import { eur } from "../format.js";

// `catalog` = base catalog + admin overrides (sold out, price), see catalogView.js.
export default function Order({ table, waiter, catalog, lines, setLines, orders, onBack, onBill, actions, status }) {
  const [category, setCategory] = useState(categories[0].id);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  const total = lines.reduce((sum, line) => sum + line.qty * line.unitCents, 0);
  const count = lines.reduce((sum, line) => sum + line.qty, 0);
  const sentTotal = orders.reduce((sum, order) => sum + order.total_cents, 0);
  const visibleItems = catalog.filter((item) => item.category === category);
  const qtyOf = (id) => lines.find((line) => line.id === id)?.qty || 0;
  // Draft lines of a product the admin marked "esaurito" after it was added: they block the send.
  const soldOutLines = lines.filter((line) => catalog.find((item) => item.id === line.id)?.available === false);

  function add(item) {
    if (!item.available) return; // ESAURITO
    // Lines keep a snapshot of name and price (override included): a later change never alters sent orders.
    setLines((prev) => {
      const existing = prev.find((line) => line.id === item.id);
      if (existing) return prev.map((line) => (line.id === item.id ? { ...line, qty: line.qty + 1 } : line));
      return [...prev, { id: item.id, name: item.name.it, qty: 1, unitCents: item.priceCents, note: "" }];
    });
  }

  function change(id, delta) {
    setLines((prev) =>
      prev.flatMap((line) => {
        if (line.id !== id) return [line];
        const qty = line.qty + delta;
        return qty > 0 ? [{ ...line, qty }] : [];
      }),
    );
  }

  function setNote(id, note) {
    setLines((prev) => prev.map((line) => (line.id === id ? { ...line, note } : line)));
  }

  async function run(action, after) {
    setBusy(true);
    setProblem("");
    try {
      await action();
      after?.();
    } catch (failure) {
      setProblem(failure.message || "Operazione non riuscita");
    } finally {
      setBusy(false);
    }
  }

  const send = () =>
    run(
      () =>
        actions.sendOrder(
          table.id,
          lines.map((line) => ({ ...line, note: line.note.trim() })),
          total,
          waiter,
        ),
      () => {
        setLines([]);
        setOpen(false);
        onBack();
      },
    );

  const bill = () => run(() => actions.requestBill(table.id), onBack);

  // Orders the kitchen/bar already marked "pronto per ritiro": one tap to mark them delivered.
  const readyOrders = orders.filter((order) => order.status === "ready");
  const served = (order) => run(() => actions.markServed(order.id));

  const canBill = table.status === "open";
  const canClose = table.status === "open" || table.status === "paying";

  return (
    <div className="screen order">
      <header className="bar">
        <button type="button" className="chip" onClick={onBack}>
          ‹ Indietro
        </button>
        <div className="bar__id">
          <h1 className="bar__title">Tavolo {table.id}</h1>
          {status}
        </div>
        <span className="bar__spacer" />
        <div className="bar__total" aria-label="Totale">
          <span>{eur(total)}</span>
          {sentTotal > 0 && <small>già inviato {eur(sentTotal)}</small>}
        </div>
      </header>

      <nav className="tabs" aria-label="Categorie">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`tab${cat.id === category ? " is-active" : ""}`}
            onClick={() => setCategory(cat.id)}
          >
            {TAB_LABELS[cat.id] || cat.short.it}
          </button>
        ))}
      </nav>

      <div className="scroll products">
        {visibleItems.map((item) => {
          const qty = qtyOf(item.id);
          return (
            <button
              key={item.id}
              type="button"
              className={`product${qty ? " has-qty" : ""}${item.available ? "" : " is-soldout"}`}
              disabled={!item.available}
              onClick={() => add(item)}
            >
              <span className="product__name">{item.name.it}</span>
              <span className="product__price">{eur(item.priceCents)}</span>
              {!item.available && <span className="product__soldout">ESAURITO</span>}
              {item.available && qty > 0 && <span className="product__badge">{qty}</span>}
            </button>
          );
        })}
      </div>

      <section className="sheet" aria-label="Riepilogo comanda">
        <button
          type="button"
          className="sheet__toggle"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <span>
            {count ? `${count} ${count === 1 ? "articolo" : "articoli"}` : "Nessun articolo"}
          </span>
          <span className="sheet__sum">{eur(total)}</span>
          <span className="sheet__chev" aria-hidden="true">
            {open ? "▾" : "▴"}
          </span>
        </button>

        {open && (
          <ul className="lines">
            {lines.length === 0 && <li className="lines__empty">Tocca i prodotti per aggiungerli.</li>}
            {lines.map((line) => (
              <li key={line.id} className="line">
                <div className="line__row">
                  <span className="line__name">{line.name}</span>
                  <span className="line__price">{eur(line.qty * line.unitCents)}</span>
                </div>
                <div className="line__row">
                  <div className="qty">
                    <button type="button" className="qty__btn" onClick={() => change(line.id, -1)} aria-label={`Meno ${line.name}`}>
                      −
                    </button>
                    <span className="qty__n">{line.qty}</span>
                    <button type="button" className="qty__btn" onClick={() => change(line.id, 1)} aria-label={`Più ${line.name}`}>
                      +
                    </button>
                  </div>
                  <input
                    className="line__note"
                    type="text"
                    value={line.note}
                    onChange={(event) => setNote(line.id, event.target.value)}
                    placeholder="Nota (es. senza pepe)"
                    maxLength={80}
                    aria-label={`Nota per ${line.name}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        {problem && <p className="notice notice--error">{problem}</p>}
        {soldOutLines.length > 0 && (
          <p className="notice notice--warn" role="alert">
            Esaurito: {soldOutLines.map((line) => line.name).join(", ")}. Toglilo dalla comanda per inviare.
          </p>
        )}

        {readyOrders.map((order) => (
          <div key={order.id} className="readybar">
            <span className="readybar__text">🔔 Comanda pronta al ritiro</span>
            <button type="button" className="readybar__btn" disabled={busy} onClick={() => served(order)}>
              Servito
            </button>
          </div>
        ))}

        <button type="button" className="send" disabled={busy || lines.length === 0 || soldOutLines.length > 0} onClick={send}>
          INVIA IN CUCINA / BAR
        </button>

        {(canBill || canClose) && (
          <div className="sheet__actions">
            {canBill && (
              <button type="button" className="action action--bill" disabled={busy} onClick={bill}>
                Chiedi il conto
              </button>
            )}
            {canClose && (
              <button type="button" className="action action--close" disabled={busy} onClick={onBill}>
                Conto e cassa
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
