import { useEffect, useState } from "react";
import { venue } from "../content";
import { useI18n } from "../i18n";
import { getStatus, rowHours } from "../lib/clock";

export default function Visit() {
  const { lang, t } = useI18n();
  const [status, setStatus] = useState(() => getStatus());

  useEffect(() => {
    const id = window.setInterval(() => setStatus(getStatus()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const bbox = [venue.lng - 0.012, venue.lat - 0.008, venue.lng + 0.012, venue.lat + 0.008]
    .map((value) => value.toFixed(5))
    .join("%2C");
  const map = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${venue.lat}%2C${venue.lng}`;

  return (
    <section className="section visit" id="dove">
      <div className="visit-copy">
        <p className="kicker">{t.whereKicker}</p>
        <h2>{t.whereTitle}</h2>
        <p className="lead">{t.whereLead}</p>
        <p className="address">
          {venue.street}
          <br />
          {venue.city}
        </p>
        <div className="visit-actions">
          <a className="btn btn-solid" href={venue.maps} target="_blank" rel="noreferrer">
            {t.mapLabel}
          </a>
          <a className="btn btn-ghost" href={`tel:${venue.phone}`}>
            {venue.phoneDisplay}
          </a>
        </div>
        <ul className="transit">
          {t.transit.map(([mark, title, text]) => (
            <li key={mark}>
              <strong>{mark}</strong>
              <span>
                <b>{title}</b>
                {text}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="visit-side">
        <div className="map-frame">
          <iframe title={lang === "it" ? "Mappa di Pitteri 56" : "Map of Pitteri 56"} src={map} loading="lazy" />
        </div>
        <div className="hours-card">
          <h3>{t.hoursTitle}</h3>
          <ul>
            {t.dayOrder.map((day) => {
              const hours = rowHours(day);
              return (
                <li key={day} className={day === status.day ? "is-today" : undefined}>
                  <span>{t.days[day]}</span>
                  <span>{hours ? `${hours.open}–${hours.close}` : t.closedWord}</span>
                </li>
              );
            })}
          </ul>
          <p>{t.hoursNote}</p>
          <a href={venue.atm} target="_blank" rel="noreferrer">
            {t.atm}
          </a>
        </div>
      </div>
    </section>
  );
}
