import { useState } from "react";
import { useI18n } from "../i18n";

export default function Sala() {
  const { t } = useI18n();
  const [active, setActive] = useState(0);
  const scene = t.scenes[active];

  return (
    <section className="section sala" id="sala">
      <div className="sala-copy">
        <p className="kicker light">{t.salaKicker}</p>
        <h2>{t.salaTitle}</h2>
        <p className="lead">{t.salaLead}</p>
        <div className="scene-switch" role="tablist" aria-label={t.salaKicker}>
          {t.scenes.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`scene-tab-${item.id}`}
              aria-selected={index === active}
              aria-controls="scene-panel"
              className={index === active ? "is-on" : undefined}
              onClick={() => setActive(index)}
            >
              {item.name}
            </button>
          ))}
        </div>
        <p className="scene-text" role="tabpanel" id="scene-panel" aria-labelledby={`scene-tab-${scene.id}`}>
          {scene.text}
        </p>
      </div>
      <div className={`stage stage-${scene.id}`} aria-hidden="true">
        <div className="stage-sky" />
        <div className="windows">
          <i />
          <i />
          <i />
        </div>
        <div className="arch" />
        <div className="bar">
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="tables">
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="tree" />
        <div className="hedge" />
        <div className="bulbs">
          {Array.from({ length: 8 }, (_, index) => (
            <i key={index} />
          ))}
        </div>
        <div className="disco" />
        <div className="beam beam-a" />
        <div className="beam beam-b" />
        <div className="booth" />
      </div>
    </section>
  );
}
