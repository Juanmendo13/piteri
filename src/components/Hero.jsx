import { useEffect, useState } from "react";
import { useI18n } from "../i18n";
import { getStatus, rowHours } from "../lib/clock";

export default function Hero() {
  const { lang, t } = useI18n();
  const [status, setStatus] = useState(() => getStatus());

  useEffect(() => {
    const id = window.setInterval(() => setStatus(getStatus()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const clock = new Intl.DateTimeFormat(lang === "it" ? "it-IT" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
    hourCycle: "h23",
  }).format(new Date());

  const statusLine = status.open
    ? `${t.open} · ${t.until} ${status.until}`
    : `${t.closed} · ${t.opens} ${t.days[status.nextDay]} ${t.at} ${status.nextTime}`;

  return (
    <section className="hero" id="top">
      <div className="hero-copy">
        <p className="kicker">{t.heroKicker}</p>
        <h1>
          {t.heroTitleA}
          <span>{t.heroTitleB}</span>
        </h1>
        <p className="lead">{t.heroLead}</p>
        <div className="hero-actions">
          <a className="btn btn-solid" href="#carta">
            {t.ctaDrink}
          </a>
          <a className="btn btn-ghost" href="#serate">
            {t.ctaNights}
          </a>
        </div>
      </div>

      <div className="hero-side">
        <figure className="hero-shots">
          <img src="/photos/interno.jpg" alt={t.heroPhoto} />
          <img src="/photos/cocktails.jpg" alt="" />
        </figure>
      <aside className="ticket" aria-live="polite">
        <div className="ticket-top">
          <p>{t.ticketLabel}</p>
          <strong>{clock}</strong>
        </div>
        <p className="ticket-status">{statusLine}</p>
        <ul>
          {t.dayOrder.map((day) => {
            const hours = rowHours(day);
            const active = day === status.day;
            return (
              <li key={day} className={active ? "is-today" : undefined}>
                <span>{t.daysShort[day]}</span>
                <span>{hours ? `${hours.open}–${hours.close}` : t.closedWord}</span>
              </li>
            );
          })}
        </ul>
        <p className="ticket-foot">{t.ticketAddress}</p>
      </aside>
      </div>

      <p className="hero-num" aria-hidden="true">
        56
      </p>

      <div className="marquee" aria-hidden="true">
        <div>
          {[0, 1].map((copy) => (
            <p key={copy}>
              {t.marquee.map((word) => (
                <span key={`${copy}-${word}`}>
                  {word}
                  <i />
                </span>
              ))}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
