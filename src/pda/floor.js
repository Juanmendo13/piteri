// Initial floor plan. Ids and zones match the rows in supabase/schema.sql.
// `status` is only the initial value: the live status comes from the data hook.
//
// `id` is the value stored in Supabase (tables.zone). `key` is the zone key used by
// waiters.js ('sala' | 'giardino' | 'bancone').

export const ZONES = [
  { id: "sala", key: "sala", label: "Sala" },
  { id: "barra", key: "bancone", label: "Bancone" },
  { id: "terraza", key: "giardino", label: "Giardino" },
];

const range = (prefix, count, zone) =>
  Array.from({ length: count }, (_, i) => ({ id: `${prefix}${i + 1}`, zone, status: "free" }));

export const TABLES = [
  ...range("S", 12, "sala"),
  ...range("B", 4, "barra"),
  ...range("G", 6, "terraza"),
];
