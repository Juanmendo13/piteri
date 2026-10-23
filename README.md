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

`npm run build` genera `dist/` (no se versiona). Copia `.env.example` a `.env.local` y no subas secretos: `.env.local`, `*.local.js` y cualquier `.env` real están en `.gitignore`.

Los PIN de la comandera van en `PUBLIC_WAITERS_JSON` (`.env.local` y Vercel), no en el repo. Si falta o es inválido, la PDA usa la lista de ejemplo de `src/pda/waiters.js` (pines `XXXX`, no desbloquean el teclado). Para cambiar un PIN: edita `.env.local`, actualiza la misma variable en Vercel y vuelve a desplegar.

La PDA puede funcionar en local (`localStorage`) sin Supabase. Para sincronizar varios móviles y cocina, configura el proyecto como indica `supabase/README.md`.
