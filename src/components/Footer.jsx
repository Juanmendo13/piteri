import { venue } from "../content";
import { useI18n } from "../i18n";

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="footer">
      <div>
        <p className="wordmark foot-mark">
          <span>Pitteri</span>
          <em>56</em>
        </p>
        <p>{t.footerBlurb}</p>
      </div>
      <div>
        <p className="kicker">{t.footerAlso}</p>
        <a href={venue.instagram} target="_blank" rel="noreferrer">
          Instagram
        </a>
        <a href={venue.mood} target="_blank" rel="noreferrer">
          Mood
        </a>
        <a href={venue.planner} target="_blank" rel="noreferrer">
          Event Planner
        </a>
      </div>
      <div>
        <a href={`tel:${venue.phone}`}>{venue.phoneDisplay}</a>
        <p>{t.footerRights}</p>
      </div>
    </footer>
  );
}
