# Pitteri 56

Web pública y comandera (PDA) del bar Pitteri 56 (Milano).

## Desarrollo

```bash
npm install
cp .env.example .env.local   # rellena las claves públicas de Supabase
npm run dev
```

- Sitio público: `/`
- PDA / comandera: `/sala/`

`npm run build` genera `dist/` (no se versiona). Copia `.env.example` a `.env.local` y no subas secretos: `.env.local` y cualquier `.env` real están en `.gitignore`.

La PDA puede funcionar en local (`localStorage`) sin Supabase. Para sincronizar varios móviles y cocina, configura el proyecto como indica `supabase/README.md`.
