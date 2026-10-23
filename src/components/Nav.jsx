import { useEffect, useState } from "react";
import { useI18n } from "../i18n";
import { getStatus } from "../lib/clock";

export default function Nav() {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(() => getStatus());

  useEffect(() => {
    const tick = () => setStatus(getStatus());
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("nav-open", open);
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className="nav-wrap">
      <a className="skip" href="#contenuto">
        {lang === "it" ? "Vai al contenuto" : "Skip to content"}
      </a>
      <div className="nav">
        <a className="wordmark" href="#top" onClick={close}>
          <span>Pitteri</span>
          <em>56</em>
        </a>
        <nav className={open ? "links open" : "links"} aria-label={lang === "it" ? "Sezioni" : "Sections"}>
          {t.nav.map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={close}>
              {label}
            </a>
          ))}
        </nav>
        <div className="nav-tools">
          <p className={`pill ${status.open ? "is-open" : "is-closed"}`}>
            <i />
            {status.open ? t.open : t.closed}
          </p>
          <div className="lang" role="group" aria-label={t.langLabel}>
            <button type="button" aria-pressed={lang === "it"} aria-label="Italiano" onClick={() => setLang("it")}>
              IT
            </button>
            <button type="button" aria-pressed={lang === "en"} aria-label="English" onClick={() => setLang("en")}>
              EN
            </button>
          </div>
          <button
            type="button"
            className="burger"
            aria-expanded={open}
            aria-label={open ? (lang === "it" ? "Chiudi menu" : "Close menu") : lang === "it" ? "Apri menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}
