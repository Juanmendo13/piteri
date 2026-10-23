import { useEffect, useRef, useState } from "react";
import { categories, itemsIn, localize } from "../catalog";
import { useI18n } from "../i18n";

function MenuList({ items }) {
  return (
    <ul className="menu-list">
      {items.map((item) => (
        <li key={item.id}>
          <div>
            <strong>{item.name}</strong>
            {item.tag ? <em>{item.tag}</em> : null}
            {item.detail ? <span>{item.detail}</span> : null}
          </div>
          <b>{item.price}</b>
        </li>
      ))}
    </ul>
  );
}

export default function Carta() {
  const { t, lang } = useI18n();
  const [active, setActive] = useState("cocktail");
  const jumpRef = useRef(null);

  const jumps = [
    ...categories.slice(0, 5).map((c) => ({ id: c.id, label: c.short[lang] })),
    { id: "aperitivo", label: t.cartaJump.aperitivo },
    ...categories.slice(5).map((c) => ({ id: c.id, label: c.short[lang] })),
    { id: "offerte", label: t.cartaJump.deals },
  ];

  useEffect(() => {
    const targets = jumps
      .map((j) => document.getElementById(j.id === "offerte" || j.id === "aperitivo" ? j.id : `carta-${j.id}`))
      .filter(Boolean);
    if (!("IntersectionObserver" in window)) return undefined;
    const seen = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => seen.set(entry.target.id, entry.isIntersecting));
        const first = targets.find((el) => seen.get(el.id));
        if (first) setActive(first.id.replace(/^carta-/, ""));
      },
      { rootMargin: "-130px 0px -55% 0px", threshold: 0 },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    const bar = jumpRef.current;
    const chip = bar?.querySelector('[aria-current="true"]');
    if (!bar || !chip) return;
    const left = chip.offsetLeft - (bar.clientWidth - chip.offsetWidth) / 2;
    bar.scrollTo({ left, behavior: "smooth" });
  }, [active]);

  const jumpTo = (id) => (event) => {
    const el = document.getElementById(id === "offerte" || id === "aperitivo" ? id : `carta-${id}`);
    if (!el) return;
    event.preventDefault();
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
  };

  const block = (cat) => (
    <div
      key={cat.id}
      id={`carta-${cat.id}`}
      className={cat.id === "cocktail" ? "menu-primary menu-block" : "menu-food menu-block"}
    >
      <div className="menu-head">
        <h3>{cat.title[lang]}</h3>
        <p>{cat.lead[lang]}</p>
      </div>
      <MenuList items={itemsIn(cat.id).map((item) => localize(item, lang))} />
    </div>
  );

  const drinkCats = categories.slice(0, 5);
  const foodCats = categories.slice(5);

  return (
    <section className="section carta" id="carta">
      <div className="section-head">
        <p className="kicker">{t.cartaKicker}</p>
        <h2>{t.cartaTitle}</h2>
        <p className="lead">{t.cartaLead}</p>
      </div>

      <nav className="carta-jump" aria-label={t.cartaJump.aria} ref={jumpRef}>
        {jumps.map((j) => (
          <a
            key={j.id}
            href={`#${j.id === "offerte" || j.id === "aperitivo" ? j.id : `carta-${j.id}`}`}
            onClick={jumpTo(j.id)}
            aria-current={active === j.id ? "true" : undefined}
          >
            {j.label}
          </a>
        ))}
      </nav>

      {drinkCats.map(block)}

      <div className="rhythm menu-block" id="aperitivo">
        <div className="menu-head">
          <p className="kicker">{t.aperitivoKicker}</p>
          <h3>{t.dayTitle}</h3>
        </div>
        {t.chapters.map((item) => (
          <article key={item.id} className={item.id === "aperitivo" ? "rhythm-card is-aperitivo" : "rhythm-card"}>
            <p className="rhythm-time">{item.time}</p>
            <h3>{item.name}</h3>
            {item.id === "aperitivo" ? (
              <>
                <p className="rhythm-days">{t.aperitivoDays}</p>
                <p className="rhythm-price">
                  {t.aperitivoPrice} <small>{t.aperitivoPriceNote}</small>
                </p>
              </>
            ) : null}
            <p>{item.text}</p>
          </article>
        ))}
        <p className="fine">{t.dayNote}</p>
      </div>

      {foodCats.map(block)}
      <p className="fine">{t.cartaChanges}</p>

      <h3 className="deals-title menu-block" id="offerte">
        {t.dealsTitle}
      </h3>
      <div className="deals">
        {t.deals.map((deal) => (
          <article key={deal.id} className={`deal deal-${deal.id}`}>
            <img src={deal.image} alt="" />
            <div>
              <p className="kicker">{deal.when}</p>
              <h3>{deal.name}</h3>
              <p className="deal-price">{deal.price}</p>
              <ul>
                {deal.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
