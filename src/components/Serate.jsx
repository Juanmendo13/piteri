import { events, venue } from "../content";
import { useI18n } from "../i18n";

function romeDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default function Serate() {
  const { lang, t } = useI18n();
  const today = romeDateKey();
  const upcoming = events.filter((event) => event.date >= today);
  const format = new Intl.DateTimeFormat(lang === "it" ? "it-IT" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Rome",
  });

  return (
    <section className="section serate" id="serate">
      <div className="section-head">
        <p className="kicker">{t.serateKicker}</p>
        <h2>{t.serateTitle}</h2>
        <p className="lead">{t.serateLead}</p>
      </div>
      <div className="night-row">
        {t.nights.map((night) => (
          <article key={night.id}>
            <p>{night.when}</p>
            <strong>{night.time}</strong>
            <h3>{night.name}</h3>
            <p>{night.detail}</p>
          </article>
        ))}
      </div>
      <h3 className="deals-title">{t.postersTitle}</h3>
      <div className="poster-row">
        {upcoming.map((event) => {
          const copy = t.eventCopy[event.id];
          return (
            <article key={event.id} className={event.image ? `has-photo event-${event.id}` : "no-photo"}>
              {event.image ? <img src={event.image} alt="" /> : null}
              <div>
                <p>{format.format(new Date(`${event.date}T12:00:00`))}</p>
                <h3>{copy.title}</h3>
                <ul>
                  {event.tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
                <p>{copy.text}</p>
                <a href={event.href} target="_blank" rel="noreferrer">
                  {t.eventCta}
                </a>
              </div>
            </article>
          );
        })}
      </div>
      <p className="private-hint">
        <a href="#feste">{t.privateHint}</a>
        <a href={venue.instagram} target="_blank" rel="noreferrer">
          @pitteri56milano
        </a>
      </p>
    </section>
  );
}
