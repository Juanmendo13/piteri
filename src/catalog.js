// Single source of the carta. Prices are integer cents.
// Item: { id, category, priceCents, name:{it,en}, detail?:{it,en}, vegetarian?, offer? }
// `offer` links an item to a fixed weekly deal ("tonic" = Wednesday, "spritz" = Friday).

/** Same visible format the site always used: IT `6€`, EN `€6`. Decimals only when needed. */
export function formatPrice(cents, lang) {
  const whole = Math.floor(cents / 100);
  const rest = cents % 100;
  if (lang === "en") {
    return rest ? `€${whole}.${String(rest).padStart(2, "0")}` : `€${whole}`;
  }
  return rest ? `${whole},${String(rest).padStart(2, "0")}€` : `${whole}€`;
}

export const categories = [
  {
    id: "cocktail",
    short: { it: "Cocktail", en: "Cocktails" },
    title: { it: "Cocktail", en: "Cocktails" },
    lead: {
      it: "Tutti i giorni, fino alle due. Il mercoledì e il venerdì, dalle 20:30, tonic e spritz scendono a 4 €.",
      en: "Every day, until 2. On Wednesday and Friday, from 8:30 pm, tonic and spritz drop to €4.",
    },
  },
  {
    id: "cubate",
    short: { it: "Cubate", en: "Long drinks" },
    title: { it: "Cubate", en: "Long drinks" },
    lead: {
      it: "Le classiche del bancone, tra 6 e 7 €. Il gin tonic lo trovi tra i cocktail.",
      en: "The bar classics, €6 to €7. Gin tonic is under cocktails.",
    },
  },
  {
    id: "bianchi",
    short: { it: "Bianchi e shot", en: "Whites & shots" },
    title: { it: "Bianchi e shot", en: "Whites and shots" },
    lead: {
      it: "Piccoli e veloci, al bancone.",
      en: "Small and quick, at the counter.",
    },
  },
  {
    id: "vinobirra",
    short: { it: "Vino e birra", en: "Wine & beer" },
    title: { it: "Vino e birra", en: "Wine and beer" },
    lead: {
      it: "Al calice, alla spina o in bottiglia.",
      en: "By the glass, on tap or bottled.",
    },
  },
  {
    id: "analcolico",
    short: { it: "Caffè e analcolici", en: "Coffee & soft" },
    title: { it: "Caffè e analcolici", en: "Coffee and soft drinks" },
    lead: {
      it: "Dalle 7 del mattino, tutti i giorni.",
      en: "From 7 in the morning, every day.",
    },
  },
  {
    id: "piadine",
    short: { it: "Piadine", en: "Piadine" },
    title: { it: "Piadine", en: "Piadine" },
    lead: {
      it: "Calde, fatte al momento. Pranzo, merenda o dopo le dieci.",
      en: "Hot and made to order. Lunch, a snack, or after ten.",
    },
  },
  {
    id: "snack",
    short: { it: "Panini e snack", en: "Sandwiches" },
    title: { it: "Panini e snack", en: "Sandwiches and snacks" },
    lead: {
      it: "Per quando non serve un piatto.",
      en: "For when you don’t need a plate.",
    },
  },
  {
    id: "cena",
    short: { it: "Cena", en: "Dinner" },
    title: { it: "Per cena", en: "For dinner" },
    lead: {
      it: "Pochi piatti, cucina da bar. Gli stessi a pranzo e a cena, finché la cucina è accesa.",
      en: "A short kitchen, bar food. The same plates at lunch and at dinner, while the kitchen is on.",
    },
  },
];

const dishes = (category, rows) =>
  rows.map(([id, priceCents, name, detail, flags]) => ({
    id,
    category,
    priceCents,
    name: { it: name[0], en: name[1] },
    ...(detail ? { detail: { it: detail[0], en: detail[1] } } : {}),
    ...flags,
  }));

export const items = [
  // ——— Cocktail (first seven are the original carta, in original order)
  ...dishes("cocktail", [
    ["negroni", 600, ["Negroni", "Negroni"], ["Gin, Campari, vermouth rosso", "Gin, Campari, sweet vermouth"]],
    ["americano", 600, ["Americano", "Americano"], ["Campari, vermouth rosso, soda", "Campari, sweet vermouth, soda"]],
    ["spritz", 600, ["Spritz", "Spritz"], ["Aperol, prosecco, soda", "Aperol, prosecco, soda"], { offer: "spritz" }],
    ["gin-tonic", 600, ["Gin tonic", "Gin tonic"], ["Gin e acqua tonica", "Gin and tonic water"], { offer: "tonic" }],
    ["hugo", 600, ["Hugo", "Hugo"], ["Prosecco, sambuco, menta", "Prosecco, elderflower, mint"], { offer: "spritz" }],
    ["garibaldi", 500, ["Garibaldi", "Garibaldi"], ["Campari e arancia spremuta", "Campari and fresh orange"]],
    ["moscow-mule", 700, ["Moscow Mule", "Moscow Mule"], ["Vodka, ginger beer, lime", "Vodka, ginger beer, lime"]],
    // added
    ["negroni-sbagliato", 600, ["Negroni sbagliato", "Negroni sbagliato"], ["Campari, vermouth rosso, prosecco", "Campari, sweet vermouth, prosecco"]],
    ["campari-spritz", 600, ["Campari spritz", "Campari spritz"], ["Campari, prosecco, soda", "Campari, prosecco, soda"], { offer: "spritz" }],
    ["mojito", 700, ["Mojito", "Mojito"], ["Rum, lime, menta, zucchero di canna", "Rum, lime, mint, cane sugar"]],
    ["caipirinha", 700, ["Caipirinha", "Caipirinha"], ["Cachaça, lime, zucchero di canna", "Cachaça, lime, cane sugar"]],
    ["margarita", 700, ["Margarita", "Margarita"], ["Tequila, triple sec, lime", "Tequila, triple sec, lime"]],
    ["cosmopolitan", 700, ["Cosmopolitan", "Cosmopolitan"], ["Vodka, mirtillo, triple sec, lime", "Vodka, cranberry, triple sec, lime"]],
    ["long-island", 800, ["Long Island", "Long Island"], ["Vodka, gin, rum, tequila, triple sec, cola", "Vodka, gin, rum, tequila, triple sec, cola"]],
  ]),

  // ——— Cubate
  ...dishes("cubate", [
    ["gin-lemon", 600, ["Gin lemon", "Gin lemon"], ["Gin e lemon soda", "Gin and lemon soda"], { offer: "tonic" }],
    ["vodka-tonic", 600, ["Vodka tonic", "Vodka tonic"], ["Vodka e acqua tonica", "Vodka and tonic water"], { offer: "tonic" }],
    ["vodka-lemon", 600, ["Vodka lemon", "Vodka lemon"], ["Vodka e lemon soda", "Vodka and lemon soda"], { offer: "tonic" }],
    ["vodka-redbull", 700, ["Vodka Red Bull", "Vodka Red Bull"], ["Vodka e Red Bull", "Vodka and Red Bull"]],
    ["vodka-arancia", 600, ["Vodka e arancia", "Vodka and orange"], ["Vodka e succo d’arancia", "Vodka and orange juice"]],
    ["vodka-pesca", 600, ["Vodka e pesca", "Vodka and peach"], ["Vodka e succo di pesca", "Vodka and peach juice"]],
    ["cuba-libre", 600, ["Rum e cola", "Rum and cola"], ["Cuba libre: rum, cola, lime", "Cuba libre: rum, cola, lime"]],
    ["whisky-cola", 600, ["Whisky e cola", "Whisky and cola"], ["Whisky e cola", "Whisky and cola"]],
    ["jack-cola", 700, ["Jack e cola", "Jack and cola"], ["Jack Daniel’s e cola", "Jack Daniel’s and cola"]],
    ["campari-soda", 600, ["Campari soda", "Campari soda"], ["Campari e soda", "Campari and soda"]],
    ["campari-orange", 600, ["Campari orange", "Campari orange"], ["Campari e succo d’arancia", "Campari and orange juice"]],
  ]),

  // ——— Bianchi e shot
  ...dishes("bianchi", [
    ["quattro-bianchi", 500, ["I 4 bianchi", "I 4 bianchi"], ["Il classico milanese, al bancone", "The Milanese bar classic, at the counter"]],
    ["bianchino", 300, ["Bianchino", "Bianchino"], ["Un bicchierino di bianco", "A small glass of white wine"]],
    ["shot", 300, ["Shot", "Shot"], ["Vodka, tequila o sambuca", "Vodka, tequila or sambuca"]],
    ["amari", 400, ["Amari e grappe", "Amari and grappa"], ["Chiedi al bancone cosa c’è", "Ask at the counter what’s open"]],
  ]),

  // ——— Vino e birra
  ...dishes("vinobirra", [
    ["vino-bianco", 400, ["Vino bianco", "White wine"], ["Al calice", "By the glass"]],
    ["vino-rosso", 400, ["Vino rosso", "Red wine"], ["Al calice", "By the glass"]],
    ["prosecco-calice", 500, ["Prosecco", "Prosecco"], ["Al calice", "By the glass"]],
    ["birra-piccola", 400, ["Birra piccola", "Small beer"], ["Alla spina, 0,2 l", "On tap, 0.2 l"]],
    ["birra-media", 600, ["Birra media", "Medium beer"], ["Alla spina, 0,4 l", "On tap, 0.4 l"]],
    ["birra-bottiglia", 400, ["Birra in bottiglia", "Bottled beer"], ["Chiedi quale c’è oggi", "Ask which one we have today"]],
  ]),

  // ——— Caffè e analcolici
  ...dishes("analcolico", [
    ["caffe", 120, ["Caffè", "Espresso"], ["Espresso", "Italian-style coffee"]],
    ["macchiato", 130, ["Caffè macchiato", "Macchiato"], null],
    ["cappuccino", 150, ["Cappuccino", "Cappuccino"], null],
    ["acqua", 200, ["Acqua", "Water"], ["Naturale o frizzante, 0,5 l", "Still or sparkling, 0.5 l"]],
    ["coca-cola", 300, ["Coca-Cola", "Coca-Cola"], ["Normale o Zero", "Regular or Zero"]],
    ["fanta", 300, ["Fanta", "Fanta"], null],
    ["sprite", 300, ["Sprite", "Sprite"], null],
    ["succo", 300, ["Succo di frutta", "Fruit juice"], ["Pesca, pera, ananas, arancia", "Peach, pear, pineapple, orange"]],
    ["te-freddo", 300, ["Tè freddo", "Iced tea"], ["Limone o pesca", "Lemon or peach"]],
    ["tonica", 300, ["Acqua tonica", "Tonic water"], null],
    ["lemon-soda", 300, ["Lemon soda", "Lemon soda"], null],
    ["redbull", 400, ["Red Bull", "Red Bull"], null],
    ["spritz-analcolico", 500, ["Spritz analcolico", "Non-alcoholic spritz"], ["Senza alcol, con ghiaccio e arancia", "Alcohol-free, with ice and orange"], { offer: "spritz" }],
  ]),

  // ——— Piadine
  ...dishes("piadine", [
    ["piadina-crudo", 700, ["Crudo e squacquerone", "Parma ham and squacquerone"], ["Prosciutto crudo, squacquerone, rucola", "Parma ham, squacquerone cheese, rocket"]],
    ["piadina-cotto", 600, ["Prosciutto cotto e formaggio", "Cooked ham and cheese"], ["Prosciutto cotto, formaggio", "Cooked ham, cheese"]],
    ["piadina-caprese", 600, ["Caprese", "Caprese"], ["Pomodoro, mozzarella, basilico", "Tomato, mozzarella, basil"], { vegetarian: true }],
    ["piadina-vegetariana", 700, ["Vegetariana", "Vegetarian"], ["Verdure grigliate, formaggio", "Grilled vegetables, cheese"], { vegetarian: true }],
    ["piadina-speck", 700, ["Speck e brie", "Speck and brie"], ["Speck, brie, rucola", "Speck, brie, rocket"]],
    ["piadina-nutella", 400, ["Nutella", "Nutella"], ["Dolce, calda", "Sweet, served warm"], { vegetarian: true }],
  ]),

  // ——— Panini e snack
  ...dishes("snack", [
    ["tramezzino", 400, ["Tramezzino", "Tramezzino"], ["Tonno e pomodoro, o prosciutto e formaggio", "Tuna and tomato, or ham and cheese"]],
    ["toast", 400, ["Toast", "Toasted sandwich"], ["Prosciutto cotto e formaggio", "Cooked ham and cheese"]],
    ["panino-crudo", 600, ["Panino con il crudo", "Parma ham sandwich"], ["Prosciutto crudo e burro", "Parma ham and butter"]],
    ["panino-cotoletta", 700, ["Panino con la cotoletta", "Cutlet sandwich"], ["Cotoletta alla milanese e insalata", "Milanese cutlet and salad"]],
    ["olive-taralli", 300, ["Olive e taralli", "Olives and taralli"], null],
    ["cornetto", 130, ["Cornetto", "Croissant"], ["Vuoto o con crema", "Plain or filled with custard"]],
  ]),

  // ——— Cena (original carta, original order)
  ...dishes("cena", [
    ["carbonara", 1200, ["Spaghetti alla carbonara", "Spaghetti alla carbonara"], ["Guanciale, uovo, pecorino", "Guanciale, egg, pecorino"]],
    ["penne-pomodoro", 900, ["Penne al pomodoro", "Penne al pomodoro"], ["Pomodoro e basilico", "Tomato and basil"]],
    ["cotoletta", 1400, ["Cotoletta alla milanese", "Cotoletta alla milanese"], ["Con insalata", "With salad"]],
    ["polpette", 1200, ["Polpette al sugo", "Polpette al sugo"], ["Con purè", "In tomato sauce, with mash"]],
    ["parmigiana", 1100, ["Parmigiana di melanzane", "Parmigiana di melanzane"], ["Al forno, con basilico", "Baked aubergine and basil"], { vegetarian: true }],
  ]),
];

export const aperitivoPrice = 800;
export const dealPrice = 400;

const vegetarianTag = { it: "Vegetariano", en: "Vegetarian" };

export function itemsIn(categoryId) {
  return items.filter((item) => item.category === categoryId);
}

export function itemsInOffer(offer) {
  return items.filter((item) => item.offer === offer);
}

/** Flat, language-specific shape used by the UI. */
export function localize(item, lang) {
  return {
    id: item.id,
    name: item.name[lang],
    detail: item.detail ? item.detail[lang] : "",
    price: formatPrice(item.priceCents, lang),
    tag: item.vegetarian ? vegetarianTag[lang] : undefined,
  };
}
