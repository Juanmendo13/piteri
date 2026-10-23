import { useI18n } from "../i18n";

export default function Locale() {
  const { t } = useI18n();
  return (
    <section className="section locale" id="locale">
      <div className="section-head">
        <p className="kicker">{t.localeKicker}</p>
        <h2>{t.localeTitle}</h2>
      </div>
      <div className="locale-grid">
        <div className="prose">
          {t.localeBody.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <blockquote>
          <p>{t.quote}</p>
        </blockquote>
      </div>
      <dl className="facts">
        {t.facts.map(([value, label]) => (
          <div key={label}>
            <dt>{value}</dt>
            <dd>{label}</dd>
          </div>
        ))}
      </dl>
      <div className="photo-band">
        <img src="/photos/interno.jpg" alt={t.heroPhoto} />
        <img src="/photos/cocktails.jpg" alt="" />
        <img className="photo-logo" src="/photos/marchio.jpg" alt="Pitteri 56" />
      </div>
      <div className="students">
        <div>
          <p className="kicker light">{t.studentsKicker}</p>
          <h3>{t.studentsTitle}</h3>
          <p>{t.studentsBody}</p>
        </div>
        <ul>
          {t.studentsPoints.map(([title, text]) => (
            <li key={title}>
              <strong>{title}</strong>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
