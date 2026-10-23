import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { clockOf, dateTimeOf, eur, methodLabel } from "./format.js";

// Printing for 80 mm thermal printers with window.print().
//
// A hidden container (#print-root, display:none on screen) is appended to <body>. When we print,
// the ticket is rendered inside it and window.print() is called. The @media print rules in
// styles.css hide the whole app (#root) and show only #print-root (72 mm wide, monospace,
// black on white). Nothing here is a fiscal document: tickets say "NON FISCALE".

let host = null;
let root = null;

function ensureRoot() {
  if (!root) {
    host = document.createElement("div");
    host.id = "print-root";
    host.className = "print-root";
    host.setAttribute("aria-hidden", "true");
    document.body.appendChild(host);
    root = createRoot(host);
    // Empty the ticket once the print dialog is closed.
    window.addEventListener("afterprint", () => root.render(null));
  }
  return root;
}

// Renders `node` in the print container and opens the print dialog.
// window.print() is synchronous in most browsers: it returns when the dialog is closed.
export function printElement(node) {
  flushSync(() => ensureRoot().render(node));
  window.print();
}

const Rule = () => <div className="pt-rule" />;

function Row({ left, right, strong }) {
  return (
    <div className={`pt-row${strong ? " pt-strong" : ""}`}>
      <span className="pt-left">{left}</span>
      {right != null && <span className="pt-right">{right}</span>}
    </div>
  );
}

// Kitchen / bar ticket of one order.
export function ComandaTicket({ order }) {
  return (
    <div className="pt">
      <div className="pt-title">COMANDA</div>
      <div className="pt-big">TAVOLO {order.table_id}</div>
      <div>{dateTimeOf(order.created_at)}</div>
      {order.waiter_name && <div>Cameriere: {order.waiter_name}</div>}
      <Rule />
      {order.items.map((line, index) => (
        <div key={`${line.id}-${index}`} className="pt-item">
          <div className="pt-strong">
            {line.qty} x {line.name}
          </div>
          {line.note && <div className="pt-note">&gt; {line.note}</div>}
        </div>
      ))}
      <Rule />
      <div className="pt-small">Ora comanda {clockOf(order.created_at)}</div>
    </div>
  );
}

// Bill of a table (not fiscal).
export function ContoTicket({ tableId, lines, totalCents, method, at }) {
  return (
    <div className="pt">
      <div className="pt-title">PITTERI 56</div>
      <div className="pt-strong">CONTO TAVOLO {tableId}</div>
      <div>{dateTimeOf(at)}</div>
      <Rule />
      {lines.map((line) => (
        <div key={line.key} className="pt-item">
          <Row left={`${line.qty} x ${line.name}`} right={eur(line.totalCents)} />
          {line.qty > 1 && <div className="pt-note">  ({eur(line.unitCents)} cad.)</div>}
        </div>
      ))}
      <Rule />
      <Row left="TOTALE" right={eur(totalCents)} strong />
      {method && <div>Pagamento: {methodLabel(method)}</div>}
      <Rule />
      <div className="pt-box">NON FISCALE</div>
      <div className="pt-small">Documento non valido ai fini fiscali.</div>
      <div className="pt-small">Grazie e a presto!</div>
    </div>
  );
}

const Section = ({ title, rows }) =>
  rows.length > 0 && (
    <>
      <Rule />
      <div className="pt-strong">{title}</div>
      {rows.map((row) => (
        <Row key={row.name} left={row.label || row.name} right={eur(row.totalCents)} />
      ))}
    </>
  );

// End-of-day summary.
export function SummaryTicket({ dayText, summary }) {
  return (
    <div className="pt">
      <div className="pt-title">PITTERI 56</div>
      <div className="pt-strong">RIEPILOGO GIORNATA</div>
      <div>{dayText}</div>
      <div className="pt-small">(06:00 - 06:00)</div>
      <Rule />
      <Row left="TOTALE INCASSATO" right={eur(summary.totalCents)} strong />
      <Row left="Conti" right={summary.accountCount} />
      <Row left="Comande" right={summary.orderCount} />
      <Section title="Per metodo" rows={summary.byMethod} />
      <Section title="Per cameriere" rows={summary.byWaiter} />
      <Section title="Per categoria" rows={summary.byCategory} />
      {summary.top.length > 0 && (
        <>
          <Rule />
          <div className="pt-strong">Top 5 prodotti</div>
          {summary.top.map((product) => (
            <Row key={product.name} left={`${product.qty} x ${product.name}`} right={eur(product.totalCents)} />
          ))}
        </>
      )}
      <Rule />
      <div className="pt-box">NON FISCALE</div>
      <div className="pt-small">Stampato {dateTimeOf(Date.now())}</div>
    </div>
  );
}
