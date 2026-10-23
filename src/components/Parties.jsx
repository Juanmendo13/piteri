import { useMemo, useState } from "react";
import { venue } from "../content";
import { useI18n } from "../i18n";
import { PACKAGES, buildQuote } from "../lib/quote";

const kindPackage = {
  18: "ape",
  laurea: "laurea",
  birthday: "all",
  work: "wine",
  other: "all",
};

export default function Parties() {
  const { lang, t } = useI18n();
  const [kind, setKind] = useState("birthday");
  const [day, setDay] = useState("week");
  const [guests, setGuests] = useState(60);
  const [pack, setPack] = useState("all");
  const [water, setWater] = useState(true);
  const [soft, setSoft] = useState(false);
  const [dj, setDj] = useState(false);
  const [extraDrinks, setExtraDrinks] = useState(0);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);

  const selected = PACKAGES.find((item) => item.id === pack) ?? PACKAGES[1];
  const quote = useMemo(
    () =>
      buildQuote({
        guests,
        saturday: day === "sat",
        price: selected.price,
        water,
        soft,
        extraDrinks,
        dj,
      }),
    [guests, day, selected.price, water, soft, extraDrinks, dj],
  );

  const money = (value, digits = 0) =>
    new Intl.NumberFormat(lang === "it" ? "it-IT" : "en-GB", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    }).format(value);

  const kindLabel = t.kinds.find(([id]) => id === kind)?.[1] ?? kind;
  const dayLabel = t.dayOpts.find(([id]) => id === day)?.[1] ?? day;

  const request = [
    t.requestTitle,
    name && `${t.fieldName}: ${name}`,
    `${t.fieldKind}: ${kindLabel}`,
    date && `${t.fieldDate}: ${date}`,
    `${t.fieldDay}: ${dayLabel}`,
    `${t.fieldGuests}: ${quote.safeGuests}`,
    `${t.fieldPack}: ${t.packages[pack].name} (${money(selected.price)})`,
    water ? t.extraWater : null,
    soft ? t.extraSoft : null,
    dj ? t.extraDj : null,
    extraDrinks > 0 ? `${t.extraRound}: ${quote.extraCount}` : null,
    `${t.lineTotal}: ${money(quote.total)}`,
    note && `${t.fieldNote}: ${note}`,
  ]
    .filter(Boolean)
    .join("\n");

  async function copyRequest() {
    try {
      await navigator.clipboard.writeText(request);
    } catch {
      const area = document.createElement("textarea");
      area.value = request;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function chooseKind(next) {
    setKind(next);
    setPack(kindPackage[next]);
    if (next === "18") setSoft(true);
  }

  return (
    <section className="section parties" id="feste">
      <div className="section-head">
        <p className="kicker">{t.partyKicker}</p>
        <h2>{t.partyTitle}</h2>
        <p className="lead">{t.partyLead}</p>
      </div>

      <div className="packs">
        {PACKAGES.map((item) => (
          <article key={item.id} className={pack === item.id ? "is-on" : undefined}>
            <p className="pack-price">
              {money(item.price)}
              <small>{t.perPerson}</small>
            </p>
            <h3>{t.packages[item.id].name}</h3>
            <p>{t.packages[item.id].detail}</p>
            <button type="button" onClick={() => setPack(item.id)}>
              {t.usePackage}
            </button>
          </article>
        ))}
      </div>
      <p className="fine on-dark">{t.partyIncludes}</p>

      <div className="buffet">
        <div>
          <h3>{t.buffetTitle}</h3>
          <p>{t.buffetNote}</p>
        </div>
        <div className="buffet-grid">
          {t.buffet.map((group) => (
            <div key={group.name}>
              <h4>{group.name}</h4>
              <ul>
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="calc" id="preventivo">
        <div className="calc-form">
          <p className="kicker">{t.calcKicker}</p>
          <h3>{t.calcTitle}</h3>
          <p>{t.calcLead}</p>

          <fieldset>
            <legend>{t.fieldKind}</legend>
            <div className="chips">
              {t.kinds.map(([id, label]) => (
                <button key={id} type="button" aria-pressed={kind === id} onClick={() => chooseKind(id)}>
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>{t.fieldDay}</legend>
            <div className="chips">
              {t.dayOpts.map(([id, label]) => (
                <button key={id} type="button" aria-pressed={day === id} onClick={() => setDay(id)}>
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="stepper-field">
            <span>
              {t.fieldGuests}
              <small>{t.guestsHint}</small>
            </span>
            <span className="stepper">
              <button type="button" onClick={() => setGuests((value) => Math.max(10, value - 1))} aria-label="-">
                −
              </button>
              <input
                type="number"
                min="10"
                max="150"
                value={guests}
                onChange={(event) => setGuests(Number(event.target.value))}
              />
              <button type="button" onClick={() => setGuests((value) => Math.min(150, value + 1))} aria-label="+">
                +
              </button>
            </span>
          </label>

          <fieldset>
            <legend>{t.fieldPack}</legend>
            <div className="chips">
              {PACKAGES.map((item) => (
                <button key={item.id} type="button" aria-pressed={pack === item.id} onClick={() => setPack(item.id)}>
                  {t.packages[item.id].name}
                  <small>
                    {item.drinks} {lang === "en" && item.drinks === 1 ? "drink" : t.drinksWord}
                  </small>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>{t.fieldExtras}</legend>
            <div className="checks">
              <label>
                <input type="checkbox" checked={water} onChange={(event) => setWater(event.target.checked)} />
                <span>
                  {t.extraWater}
                  <small>{t.extraWaterPrice}</small>
                </span>
              </label>
              <label>
                <input type="checkbox" checked={soft} onChange={(event) => setSoft(event.target.checked)} />
                <span>
                  {t.extraSoft}
                  <small>{t.extraSoftPrice}</small>
                </span>
              </label>
              <label>
                <input type="checkbox" checked={dj} onChange={(event) => setDj(event.target.checked)} />
                <span>
                  {t.extraDj}
                  <small>{t.extraDjPrice}</small>
                </span>
              </label>
            </div>
            <label className="stepper-field compact">
              <span>
                {t.extraRound}
                <small>{t.extraRoundPrice}</small>
              </span>
              <span className="stepper">
                <button type="button" onClick={() => setExtraDrinks((value) => Math.max(0, value - 1))} aria-label="-">
                  −
                </button>
                <input
                  type="number"
                  min="0"
                  max="400"
                  value={extraDrinks}
                  onChange={(event) => setExtraDrinks(Number(event.target.value))}
                />
                <button type="button" onClick={() => setExtraDrinks((value) => Math.min(400, value + 1))} aria-label="+">
                  +
                </button>
              </span>
            </label>
          </fieldset>

          <div className="who">
            <label>
              {t.fieldName}
              <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
            </label>
            <label>
              {t.fieldDate}
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <label className="wide">
              {t.fieldNote}
              <textarea
                rows="3"
                value={note}
                placeholder={t.notePlaceholder}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
          </div>
        </div>

        <aside className="receipt" aria-live="polite">
          <p className="receipt-brand">{t.receiptBrand}</p>
          <h3>{t.receiptTitle}</h3>
          <p className="receipt-meta">
            {quote.safeGuests} · {t.packages[pack].name}
            <br />
            {dayLabel}
          </p>
          <dl>
            <div>
              <dt>{t.lineConsumption}</dt>
              <dd>{money(quote.consumption)}</dd>
            </div>
            {quote.gap > 0 && (
              <div>
                <dt>{t.lineGap}</dt>
                <dd>{money(quote.gap)}</dd>
              </div>
            )}
            {quote.waterCost > 0 && (
              <div>
                <dt>{t.lineWater}</dt>
                <dd>{money(quote.waterCost)}</dd>
              </div>
            )}
            {quote.softCost > 0 && (
              <div>
                <dt>{t.lineSoft}</dt>
                <dd>{money(quote.softCost)}</dd>
              </div>
            )}
            {quote.drinksCost > 0 && (
              <div>
                <dt>{t.lineRounds}</dt>
                <dd>{money(quote.drinksCost)}</dd>
              </div>
            )}
            {quote.djCost > 0 && (
              <div>
                <dt>{t.lineDj}</dt>
                <dd>{money(quote.djCost)}</dd>
              </div>
            )}
          </dl>
          <p className="receipt-total">
            <span>{t.lineTotal}</span>
            <strong>{money(quote.total)}</strong>
          </p>
          <p className="receipt-each">
            {t.lineEach} {money(quote.perHead, 2)}
          </p>
          <p className="receipt-cover">
            {t.coverLine(quote.coverAt, day === "sat" ? t.coverSat : t.coverWeek)}
          </p>
          <p className="receipt-foot">{t.receiptFoot}</p>
          <div className="receipt-actions">
            <button type="button" className="btn btn-solid" onClick={copyRequest}>
              {copied ? t.copied : t.copyRequest}
            </button>
            <a className="btn btn-ghost" href={`tel:${venue.phone}`}>
              {t.call}
            </a>
          </div>
        </aside>
      </div>

      <div className="party-notes">
        <p>{t.minorNote}</p>
        <p>{t.sundayNote}</p>
        <p>{t.visitNote}</p>
      </div>

      <div className="faq">
        <h3>{t.faqTitle}</h3>
        {t.faq.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>

      <p className="outlinks">
        <a href={venue.planner} target="_blank" rel="noreferrer">
          {t.plannerLink}
        </a>
        <a href={venue.mood} target="_blank" rel="noreferrer">
          {t.moodLink}
        </a>
      </p>
    </section>
  );
}
