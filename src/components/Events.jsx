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

export default function Events() {
  const { lang, t } = useI18n();
  const today = romeDateKey();
  const upcoming = events.filter((event) => event.date >= today);

  const format = new Intl.DateTimeFormat(lang === "it" ? "it-IT" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Rome",
  });

  return (
    <section className="section events" id="eventi">
      <div className="section-head">
        <p className="kicker">{t.eventsKicker}</p>
        <h2>{t.eventsTitle}</h2>
        <p className="lead">{t.eventsLead}</p>
      </div>
      {upcoming.length === 0 ? (
        <p className="empty">{t.eventsEmpty}</p>
      ) : (
        <div className="event-list">
          {upcoming.map((event) => (
            <article key={event.id} className="event-card">
              <p className="event-date">{format.format(new Date(`${event.date}T12:00:00`))}</p>
              <h3>Fango Piteri</h3>
              <p className="event-tags">
                {event.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </p>
              <p>{t.eventBlurb}</p>
              <p className="event-free">{t.eventFree}</p>
              <a className="btn btn-solid" href={event.href} target="_blank" rel="noreferrer">
                {t.eventCta}
              </a>
            </article>
          ))}
        </div>
      )}
      <a className="text-link" href={venue.mood} target="_blank" rel="noreferrer">
        {t.allEvents}
      </a>
    </section>
  );
}
