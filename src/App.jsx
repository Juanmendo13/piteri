import { useEffect } from "react";
import Nav from "./components/Nav";
import Hero from "./components/Hero";
import Locale from "./components/Locale";
import Carta from "./components/Carta";
import Serate from "./components/Serate";
import Parties from "./components/Parties";
import Visit from "./components/Visit";
import Footer from "./components/Footer";
import { venue } from "./content";
import { useI18n } from "./i18n";

function Shell() {
  const { lang, t } = useI18n();

  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BarOrPub",
      name: "Pitteri 56",
      description: t.metaDescription,
      telephone: venue.phone,
      address: {
        "@type": "PostalAddress",
        streetAddress: "Via Riccardo Pitteri 56",
        addressLocality: "Milano",
        postalCode: "20134",
        addressCountry: "IT",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: venue.lat,
        longitude: venue.lng,
      },
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          opens: "07:00",
          closes: "02:00",
        },
      ],
      inLanguage: lang,
      servesCuisine: "Italian",
    });
    document.head.appendChild(script);
    return () => script.remove();
  }, [lang, t.metaDescription]);

  return (
    <>
      <Nav />
      <main id="contenuto">
        <Hero />
        <Locale />
        <Carta />
        <Serate />
        <Parties />
        <Visit />
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return <Shell />;
}
