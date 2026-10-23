import { useCallback, useEffect, useMemo, useState } from "react";
import { clockOf, eur, methodLabel } from "../format.js";
import { isConfigured } from "../supabase.js";
import { SummaryTicket, printElement } from "../printing.jsx";
import { addDays, buildCsv, buildSummary, dayLabel, downloadText, fetchClosedOrders, workdayKeyOf } from "../reports.js";

function Breakdown({ title, rows, total }) {
  if (rows.length === 0) return null;
  return (
    <section className="rsec">
      <h2 className="rsec__title">{title}</h2>
      <ul className="rlist">
        {rows.map((row) => (
          <li key={row.name} className="rrow">
            <span className="rrow__name">{row.label || row.name}</span>
            <span className="rrow__bar" aria-hidden="true">
              <i style={{ width: `${total ? Math.max(3, Math.round((row.totalCents / total) * 100)) : 0}%` }} />
            </span>
            <span className="rrow__amount">{eur(row.totalCents)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// "Chiusura / Riepilogo": sales of a working day (06:00 -> 06:00, Europe/Rome), admin only.
export default function Summary({ onBack, status }) {
  const today = workdayKeyOf();
  const [day, setDay] = useState(today);
  const [orders, setOrders] = useState(null); // null = loading
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setError("");
    fetchClosedOrders(day)
      .then((rows) => !cancelled && setOrders(rows))
      .catch((failure) => {
        if (cancelled) return;
        setError(failure.message || "Impossibile leggere le vendite");
        setOrders((current) => current ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [day, tick]);

  // Keep today fresh: every minute, and (local mode) when another tab closes a bill.
  useEffect(() => {
    if (day !== today) return undefined;
    const timer = setInterval(refresh, 60000);
    const onStorage = () => refresh();
    if (!isConfigured) window.addEventListener("storage", onStorage);
    return () => {
      clearInterval(timer);
      window.removeEventListener("storage", onStorage);
    };
  }, [day, today, refresh]);

  const summary = useMemo(() => buildSummary(orders || []), [orders]);
  const isToday = day === today;
  const text = dayLabel(day);

  const exportCsv = () => downloadText(`pitteri-${day}.csv`, buildCsv(day, summary));
  const print = () => printElement(<SummaryTicket dayText={text} summary={summary} />);

  return (
    <div className="screen summary">
      <header className="bar">
        <button type="button" className="chip" onClick={onBack}>
          ‹ Tavoli
        </button>
        <h1 className="bar__title">Riepilogo</h1>
        <span className="bar__spacer" />
        {status}
      </header>

      <div className="scroll">
        <div className="daynav">
          <button type="button" className="chip daynav__arrow" aria-label="Giorno precedente" onClick={() => setDay(addDays(day, -1))}>
            ‹
          </button>
          <div className="daynav__mid">
            <strong>{text}</strong>
            <small>{isToday ? "Oggi · " : ""}06:00 → 06:00</small>
          </div>
          <button
            type="button"
            className="chip daynav__arrow"
            aria-label="Giorno successivo"
            disabled={day >= today}
            onClick={() => setDay(addDays(day, 1))}
          >
            ›
          </button>
        </div>
        <div className="daynav__pick">
          <input
            type="date"
            value={day}
            max={today}
            aria-label="Scegli giorno"
            onChange={(event) => event.target.value && setDay(event.target.value > today ? today : event.target.value)}
          />
          <button type="button" className="chip" disabled={isToday} onClick={() => setDay(today)}>
            Oggi
          </button>
          <button type="button" className="chip" onClick={refresh}>
            Aggiorna
          </button>
        </div>

        {error && <p className="notice notice--error">{error}</p>}
        {orders === null && <p className="notice">Caricamento…</p>}

        {orders !== null && (
          <>
            <div className="rtotal" aria-label="Totale incassato">
              <span>Totale incassato</span>
              <strong>{eur(summary.totalCents)}</strong>
              <small>
                {summary.accountCount} {summary.accountCount === 1 ? "conto" : "conti"} · {summary.orderCount}{" "}
                {summary.orderCount === 1 ? "comanda" : "comande"}
              </small>
            </div>

            {summary.orderCount === 0 ? (
              <div className="empty rempty">
                <p className="empty__big">Nessuna vendita</p>
                <p>Nessun conto chiuso in questa giornata.</p>
              </div>
            ) : (
              <>
                <div className="sheet__actions rtools">
                  <button type="button" className="action" onClick={exportCsv}>
                    Esporta CSV
                  </button>
                  <button type="button" className="action" onClick={print}>
                    Stampa riepilogo
                  </button>
                </div>

                <Breakdown title="Per metodo di pagamento" rows={summary.byMethod} total={summary.totalCents} />
                <Breakdown title="Per cameriere" rows={summary.byWaiter} total={summary.totalCents} />
                <Breakdown title="Per categoria" rows={summary.byCategory} total={summary.totalCents} />

                <section className="rsec">
                  <h2 className="rsec__title">Top 5 prodotti</h2>
                  <ol className="rlist rtop">
                    {summary.top.map((product, index) => (
                      <li key={product.name} className="rrow">
                        <span className="rrow__rank">{index + 1}</span>
                        <span className="rrow__name">{product.name}</span>
                        <span className="rrow__qty">×{product.qty}</span>
                        <span className="rrow__amount">{eur(product.totalCents)}</span>
                      </li>
                    ))}
                  </ol>
                </section>

                <section className="rsec">
                  <h2 className="rsec__title">Conti chiusi</h2>
                  <ul className="accounts">
                    {summary.accounts.map((account) => (
                      <li key={account.key} className="account">
                        <span className="account__time">{clockOf(account.at)}</span>
                        <span className="account__table">{account.table_id}</span>
                        <span className="account__who">{[...account.waiters].join(", ") || "—"}</span>
                        <span className="account__method">{methodLabel(account.method)}</span>
                        <span className="account__amount">{eur(account.totalCents)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
