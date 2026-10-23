import { useMemo, useState } from "react";
import { PAYMENT_METHODS, eur, groupLines, linesTotal } from "../format.js";
import { ContoTicket, printElement } from "../printing.jsx";

// "Conto" of a table: every line of the orders not closed yet, grouped, with the total,
// the payment method and "Segna pagato e chiudi tavolo".
// It reads the live orders of the table, so an order sent from another phone shows up here too.
export default function Bill({ table, orders, actions, onBack, onDone, status }) {
  const [method, setMethod] = useState(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [split, setSplit] = useState(2);
  const [showSplit, setShowSplit] = useState(false);
  const [degraded, setDegraded] = useState(false);

  const lines = useMemo(() => groupLines(orders), [orders]);
  const total = linesTotal(lines);
  const inKitchen = orders.filter((order) => order.status === "sent" || order.status === "ready").length;
  const perPerson = Math.ceil(total / split);

  async function pay() {
    if (!method || busy) return;
    setBusy(true);
    setProblem("");
    try {
      const result = await actions.closeTable(table.id, { method, orderIds: orders.map((order) => order.id) });
      if (result?.degraded) setDegraded(true);
      else onDone();
    } catch (failure) {
      setProblem(failure.message || "Operazione non riuscita");
    } finally {
      setBusy(false);
    }
  }

  async function ask() {
    setBusy(true);
    setProblem("");
    try {
      await actions.requestBill(table.id);
    } catch (failure) {
      setProblem(failure.message || "Operazione non riuscita");
    } finally {
      setBusy(false);
    }
  }

  const print = () =>
    printElement(<ContoTicket tableId={table.id} lines={lines} totalCents={total} method={method} at={Date.now()} />);

  if (degraded) {
    return (
      <div className="screen bill">
        <header className="bar">
          <h1 className="bar__title">Conto {table.id}</h1>
        </header>
        <div className="scroll">
          <p className="notice">Tavolo chiuso.</p>
          <p className="notice notice--error">
            Metodo di pagamento e ora di chiusura non salvati: il database non è aggiornato. Esegui la migrazione SQL
            (supabase/migration-002-cuenta-admin-informes.sql).
          </p>
          <button type="button" className="send" onClick={onDone}>
            OK
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen bill">
      <header className="bar">
        <button type="button" className="chip" onClick={onBack}>
          ‹ Indietro
        </button>
        <div className="bar__id">
          <h1 className="bar__title">Conto {table.id}</h1>
          {status}
        </div>
        <span className="bar__spacer" />
        {table.status === "paying" && <span className="tag tag--gold">Conto richiesto</span>}
      </header>

      <div className="scroll">
        {problem && <p className="notice notice--error">{problem}</p>}
        {inKitchen > 0 && (
          <p className="notice notice--warn">
            {inKitchen === 1 ? "1 comanda è" : `${inKitchen} comande sono`} ancora in cucina/bar: chiudendo il tavolo
            sparisce dalla cucina.
          </p>
        )}

        {lines.length === 0 ? (
          <div className="empty bill__empty">
            <p className="empty__big">Nessuna comanda</p>
            <p>Il tavolo non ha articoli da pagare.</p>
          </div>
        ) : (
          <ul className="bill__lines" aria-label="Righe del conto">
            {lines.map((line) => (
              <li key={line.key} className="bill__line">
                <span className="bill__qty">{line.qty}×</span>
                <span className="bill__name">
                  {line.name}
                  {line.qty > 1 && <small>{eur(line.unitCents)} cad.</small>}
                </span>
                <span className="bill__amount">{eur(line.totalCents)}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="bill__total" aria-label="Totale">
          <span>Totale</span>
          <strong>{eur(total)}</strong>
        </div>

        {lines.length > 0 && (
          <>
            <button
              type="button"
              className={`chip bill__splitbtn${showSplit ? " is-on" : ""}`}
              aria-pressed={showSplit}
              onClick={() => setShowSplit((value) => !value)}
            >
              Alla romana
            </button>
            {showSplit && (
              <div className="split">
                <div className="qty">
                  <button type="button" className="qty__btn" onClick={() => setSplit((n) => Math.max(2, n - 1))} aria-label="Meno persone">
                    −
                  </button>
                  <span className="qty__n">{split}</span>
                  <button type="button" className="qty__btn" onClick={() => setSplit((n) => Math.min(30, n + 1))} aria-label="Più persone">
                    +
                  </button>
                </div>
                <div className="split__result">
                  <b>{eur(perPerson)}</b> a persona{total % split ? " (arrotondato)" : ""}
                  <small>solo informativo, il totale resta {eur(total)}</small>
                </div>
              </div>
            )}

            <h2 className="bill__h">Metodo di pagamento</h2>
            <div className="methods" role="radiogroup" aria-label="Metodo di pagamento">
              {PAYMENT_METHODS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={method === option.id}
                  className={`method${method === option.id ? " is-active" : ""}`}
                  onClick={() => setMethod(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="bill__actions">
          {lines.length > 0 ? (
            <>
              <button type="button" className="send bill__pay" disabled={busy || !method} onClick={pay}>
                {method ? "Segna pagato e chiudi tavolo" : "Scegli il metodo di pagamento"}
              </button>
              <div className="sheet__actions">
                <button type="button" className="action" onClick={print}>
                  Stampa conto
                </button>
                {table.status === "open" && (
                  <button type="button" className="action action--bill" disabled={busy} onClick={ask}>
                    Segna «Conto richiesto»
                  </button>
                )}
              </div>
              <p className="bill__nofiscal">Stampa conto: documento NON FISCALE.</p>
            </>
          ) : (
            <button
              type="button"
              className="send bill__pay"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await actions.closeTable(table.id, { orderIds: [] });
                  onDone();
                } catch (failure) {
                  setProblem(failure.message || "Operazione non riuscita");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Libera tavolo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
