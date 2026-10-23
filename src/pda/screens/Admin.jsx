import { useMemo, useState } from "react";
import { categories } from "../../catalog.js";
import { TAB_LABELS } from "../catalogView.js";
import { eur } from "../format.js";
import { MAX_PRICE_CENTS, MIGRATION_FILE } from "../useCatalogOverrides.js";

// "12", "6,5", "6.50" -> cents. null when it is not a valid price (0 - 1000 €).
function parsePrice(text) {
  const clean = String(text).trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const cents = Math.round(Number(clean) * 100);
  return cents >= 0 && cents <= MAX_PRICE_CENTS ? cents : null;
}

const toInput = (cents) => (cents % 100 ? (cents / 100).toFixed(2) : String(cents / 100)).replace(".", ",");

function ProductRow({ item, onChange }) {
  const [text, setText] = useState(null); // null = not editing: show the effective price
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  const editing = text !== null;
  const parsed = editing ? parsePrice(text) : null;
  const dirty = editing && parsed !== null && parsed !== item.priceCents;

  async function run(patch) {
    setBusy(true);
    setProblem("");
    try {
      await onChange(item.id, patch);
      setText(null);
    } catch (failure) {
      setProblem(failure.message || "Operazione non riuscita");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className={`aitem${item.available ? "" : " is-soldout"}`}>
      <div className="aitem__top">
        <div className="aitem__name">
          {item.name.it}
          {item.priceOverridden && (
            <small>
              prezzo modificato (base {eur(item.basePriceCents)})
            </small>
          )}
        </div>
        <button
          type="button"
          className={`soldout${item.available ? "" : " is-on"}`}
          aria-pressed={!item.available}
          aria-label={`${item.available ? "Segna esaurito" : "Torna disponibile"}: ${item.name.it}`}
          disabled={busy}
          onClick={() => run({ available: !item.available })}
        >
          {item.available ? "Disponibile" : "ESAURITO"}
        </button>
      </div>
      <div className="aitem__price">
        <label className="aitem__label">
          <span>Prezzo €</span>
          <input
            type="text"
            inputMode="decimal"
            value={editing ? text : toInput(item.priceCents)}
            onChange={(event) => setText(event.target.value)}
            onFocus={(event) => {
              setText(toInput(item.priceCents));
              event.target.select();
            }}
            onBlur={() => {
              if (!dirty) setText(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && dirty) run({ price_cents: parsed });
            }}
            aria-label={`Prezzo ${item.name.it}`}
            aria-invalid={editing && parsed === null}
          />
        </label>
        <button type="button" className="chip" disabled={busy || !dirty} onClick={() => run({ price_cents: parsed })}>
          Salva
        </button>
        {item.priceOverridden && (
          <button type="button" className="chip" disabled={busy} onClick={() => run({ price_cents: null })}>
            Ripristina
          </button>
        )}
      </div>
      {editing && parsed === null && <p className="aitem__error">Prezzo non valido (es. 6,50)</p>}
      {problem && <p className="aitem__error">{problem}</p>}
    </li>
  );
}

export default function Admin({ catalog, overridesState, setOverride, reload, onBack, status }) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return categories
      .map((cat) => ({
        cat,
        list: catalog.filter(
          (item) => item.category === cat.id && (!needle || item.name.it.toLowerCase().includes(needle)),
        ),
      }))
      .filter((group) => group.list.length > 0);
  }, [catalog, query]);

  const soldOut = catalog.filter((item) => !item.available).length;
  const changed = catalog.filter((item) => item.priceOverridden).length;

  return (
    <div className="screen admin">
      <header className="bar">
        <button type="button" className="chip" onClick={onBack}>
          ‹ Tavoli
        </button>
        <h1 className="bar__title">Admin carta</h1>
        <span className="bar__spacer" />
        {status}
      </header>

      <div className="scroll">
        {overridesState === "missing" && (
          <div className="notice notice--warn" role="status">
            Esegui la migrazione SQL: manca la tabella <code>catalog_overrides</code> ({MIGRATION_FILE}). Finché non
            lo fai, le modifiche non vengono salvate e la PDA usa la carta di base.
            <button type="button" className="chip" onClick={reload}>
              Ricontrolla
            </button>
          </div>
        )}
        {overridesState === "error" && (
          <div className="notice notice--error" role="status">
            Impossibile leggere le modifiche alla carta.
            <button type="button" className="chip" onClick={reload}>
              Riprova
            </button>
          </div>
        )}
        <p className="admin__hint">
          {soldOut} esauriti · {changed} prezzi modificati. Valgono solo per la PDA (il sito pubblico non cambia); le
          comande già inviate mantengono il loro prezzo.
        </p>
        <input
          className="admin__search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cerca prodotto…"
          aria-label="Cerca prodotto"
        />

        {groups.length === 0 && <p className="notice">Nessun prodotto trovato.</p>}
        {groups.map(({ cat, list }) => (
          <section key={cat.id} className="zone">
            <h2 className="zone__title">{TAB_LABELS[cat.id] || cat.short.it}</h2>
            <ul className="alist">
              {list.map((item) => (
                <ProductRow key={item.id} item={item} onChange={setOverride} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
