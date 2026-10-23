import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { copy } from "./content";

const I18nContext = createContext(null);

function readLang() {
  const query = new URLSearchParams(window.location.search).get("lang");
  if (query === "en" || query === "it") return query;
  return window.localStorage.getItem("pitteri-lang") === "en" ? "en" : "it";
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(readLang);
  const t = copy[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t.metaTitle;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", t.metaDescription);
    window.localStorage.setItem("pitteri-lang", lang);
    const url = new URL(window.location.href);
    if (lang === "en") url.searchParams.set("lang", "en");
    else url.searchParams.delete("lang");
    window.history.replaceState(null, "", url);
  }, [lang, t.metaDescription, t.metaTitle]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n outside provider");
  return context;
}
