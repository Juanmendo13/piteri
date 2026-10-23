import { useState } from "react";
import { useI18n } from "../i18n";

export default function Day() {
  const { t } = useI18n();
  const [active, setActive] = useState(0);
  const chapter = t.chapters[active];

  return (
    <section className="section day" id="giornata">
      <div className="section-head">
        <p className="kicker">{t.dayKicker}</p>
        <h2>{t.dayTitle}</h2>
      </div>
      <div className="day-layout">
        <div className="day-tabs" role="tablist" aria-label={t.dayTitle}>
          {t.chapters.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={index === active}
              aria-controls={`panel-${item.id}`}
              className={index === active ? "is-on" : undefined}
              onClick={() => setActive(index)}
            >
              <em>{item.time}</em>
              <span>{item.name}</span>
            </button>
          ))}
        </div>
        <article
          className={`day-panel tone-${chapter.id}`}
          role="tabpanel"
          id={`panel-${chapter.id}`}
          aria-labelledby={`tab-${chapter.id}`}
        >
          <p className="day-index">0{active + 1}</p>
          <h3>{chapter.name}</h3>
          <p>{chapter.text}</p>
        </article>
      </div>
      <p className="fine">{t.dayNote}</p>
    </section>
  );
}
