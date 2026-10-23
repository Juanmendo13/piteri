import { useEffect, useRef, useState } from "react";
import { ComandaTicket, printElement } from "../printing.jsx";

// "Stampa automatica nuove comande" (EXPERIMENTAL, off by default). window.print() is blocking and
// opens the browser print dialog; it only prints silently on a kiosk browser (e.g. Chrome started
// with --kiosk-printing). That is why it is opt-in and the manual "Stampa" button is the main way.
const AUTOPRINT_KEY = "pitteri-pda-autoprint";
const readAutoPrint = () => {
  try {
    return localStorage.getItem(AUTOPRINT_KEY) === "1";
  } catch {
    return false;
  }
};

const LATE_MINUTES = 10;

const clock = new Intl.DateTimeFormat("it-IT", {
  timeZone: "Europe/Rome",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function elapsedLabel(from, now) {
  const seconds = Math.max(0, Math.floor((now - new Date(from).getTime()) / 1000));
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

// Soft two-tone beep, synthesized (no audio files).
function beep(ctx) {
  const start = ctx.currentTime;
  [880, 1175].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const t = start + i * 0.18;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.18);
  });
}

export default function Kitchen({ orders, loading, error, markReady, markServed, onFloor, status }) {
  const [now, setNow] = useState(() => Date.now());
  const [sound, setSound] = useState(false);
  const [problem, setProblem] = useState("");
  const [autoPrint, setAutoPrint] = useState(readAutoPrint);
  const audio = useRef(null);
  const seen = useRef(null);
  const printQueue = useRef([]);
  const printing = useRef(false);
  const autoPrintRef = useRef(autoPrint);
  autoPrintRef.current = autoPrint;

  // Prints queued orders one at a time (window.print blocks until the dialog is closed).
  function drainPrints() {
    if (printing.current) return;
    const order = printQueue.current.shift();
    if (!order) return;
    printing.current = true;
    setTimeout(() => {
      try {
        printElement(<ComandaTicket order={order} />);
      } finally {
        printing.current = false;
        drainPrints();
      }
    }, 300);
  }

  function toggleAutoPrint() {
    const next = !autoPrint;
    setAutoPrint(next);
    try {
      localStorage.setItem(AUTOPRINT_KEY, next ? "1" : "0");
    } catch {
      // storage blocked: the toggle works until the page is reloaded
    }
    if (!next) printQueue.current = [];
  }

  const pending = orders
    .filter((order) => order.status === "sent" || order.status === "ready")
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 3000);
    return () => clearInterval(timer);
  }, []);

  // Beep for orders that arrive after the first load.
  useEffect(() => {
    if (loading) return;
    const ids = new Set(pending.map((order) => order.id));
    if (seen.current) {
      const freshOrders = pending.filter((order) => !seen.current.has(order.id));
      if (freshOrders.length > 0) {
        if (sound && audio.current) beep(audio.current);
        if (autoPrintRef.current) {
          // only brand new 'sent' orders (not ones that were already in the kitchen)
          printQueue.current.push(...freshOrders.filter((order) => order.status === "sent"));
          drainPrints();
        }
      }
    }
    seen.current = ids;
  });

  function toggleSound() {
    if (!sound) {
      // The AudioContext must be created/resumed inside a user gesture.
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audio.current = audio.current || new Ctx();
      audio.current.resume?.();
      beep(audio.current);
    }
    setSound((value) => !value);
  }

  async function act(action, id) {
    setProblem("");
    try {
      await action(id);
    } catch (failure) {
      setProblem(failure.message);
    }
  }
  const serve = (id) => act(markServed, id);
  const ready = (id) => act(markReady, id);

  return (
    <div className="screen kitchen">
      <header className="bar">
        <button type="button" className="chip" onClick={onFloor}>
          ‹ Sala
        </button>
        <h1 className="bar__title">Cucina / Bar</h1>
        <span className="bar__count">{pending.length}</span>
        <span className="bar__spacer" />
        {status}
        <button
          type="button"
          className={`chip${sound ? " is-on" : ""}`}
          onClick={toggleSound}
          aria-pressed={sound}
        >
          {sound ? "Suono attivo" : "Attiva suono"}
        </button>
        <button
          type="button"
          className={`chip${autoPrint ? " is-on" : ""}`}
          onClick={toggleAutoPrint}
          aria-pressed={autoPrint}
        >
          Stampa automatica (sperimentale)
        </button>
      </header>

      <div className="scroll">
        {autoPrint && (
          <p className="notice notice--warn">
            Sperimentale: stampa ogni nuova comanda appena arriva. Senza un browser in modalità kiosk-printing si apre
            ogni volta la finestra di stampa.
          </p>
        )}
        {error && <p className="notice notice--error">Errore dati: {error}</p>}
        {problem && <p className="notice notice--error">{problem}</p>}
        {loading && <p className="notice">Caricamento…</p>}
        {!loading && pending.length === 0 && (
          <div className="empty">
            <p className="empty__big">Nessuna comanda</p>
            <p>Le nuove comande compaiono qui in tempo reale.</p>
          </div>
        )}

        <div className="tickets">
          {pending.map((order) => {
            const minutes = (now - new Date(order.created_at).getTime()) / 60000;
            const isReady = order.status === "ready";
            const late = !isReady && minutes >= LATE_MINUTES;
            return (
              <article key={order.id} className={`ticket${late ? " is-late" : ""}${isReady ? " is-ready" : ""}`}>
                <header className="ticket__head">
                  <span className="ticket__table">{order.table_id}</span>
                  <span className="ticket__time">({clock.format(new Date(order.created_at))})</span>
                  {order.waiter_name && <span className="ticket__waiter">· {order.waiter_name}</span>}
                  <span className="ticket__elapsed">{elapsedLabel(order.created_at, now)}</span>
                </header>
                {isReady && (
                  <p className="ticket__ready">
                    <span aria-hidden="true">🔔</span> Pronto · cameriere avvisato
                  </p>
                )}
                <ul className="ticket__items">
                  {order.items.map((line, index) => (
                    <li key={`${line.id}-${index}`}>
                      <span className="ticket__line">
                        {line.name} <b>x{line.qty}</b>
                      </span>
                      {line.note && <span className="ticket__note">({line.note})</span>}
                    </li>
                  ))}
                </ul>
                <button type="button" className="ready" disabled={isReady} onClick={() => ready(order.id)}>
                  {isReady ? "🔔 AVVISATO" : "🔔 PRONTO PER RITIRO"}
                </button>
                <button type="button" className="served" onClick={() => serve(order.id)}>
                  SEGNA COME SERVITO
                </button>
                <button
                  type="button"
                  className="printbtn"
                  onClick={() => printElement(<ComandaTicket order={order} />)}
                  aria-label={`Stampa comanda tavolo ${order.table_id}`}
                >
                  Stampa
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
