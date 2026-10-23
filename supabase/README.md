# Supabase para la comandera (PDA) y la cocina (KDS)

Mientras no configures Supabase, `/sala/` funciona en **modalidad local** (datos en `localStorage`, se sincroniza entre pestañas del mismo navegador, pero NO entre móviles distintos). Para que varios móviles y la pantalla de cocina compartan los pedidos en tiempo real:

1. Entra en https://supabase.com y crea un proyecto nuevo. Elige región **EU** (por ejemplo `eu-central-1` Frankfurt o `eu-west-3` París).
2. En el proyecto: **SQL Editor → New query**. Pega el contenido de `supabase/schema.sql` y pulsa **Run**. Esto crea `tables` (22 mesas) y `orders`, y activa realtime.
3. Nueva query: pega `supabase/policies.sql` y **Run**. Activa RLS y deja a la clave anon solo lo imprescindible (sin borrados).
4. **Project Settings → API**: copia el **Project URL** y la clave **anon public**. No uses nunca la `service_role`.
5. En la raíz del proyecto crea `.env.local` (está en `.gitignore`):

   ```
   PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=eyJ...
   PUBLIC_WAITERS_JSON=[{"id":"marco","pin":"XXXX","name":"Marco","zones":["sala"]}]
   ```

   Reinicia `npm run dev` (las claves se inyectan al compilar). Los PIN reales van solo en `.env.local` / Vercel, nunca en git.
6. En Vercel: **Project → Settings → Environment Variables**, añade `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` y `PUBLIC_WAITERS_JSON` (Production y Preview) y vuelve a desplegar.

## Migración (camareros + aviso «pronto per ritiro»)

Si ya habías ejecutado una versión anterior de `schema.sql`, hay que añadir las columnas `waiter_id` / `waiter_name` a `orders` y permitir el estado `ready`. En **SQL Editor → New query** ejecuta, en este orden:

1. Solo el bloque **MIGRATION** del final de `supabase/schema.sql` (es idempotente; no vuelvas a ejecutar el `CREATE TABLE` ni los `INSERT`).
2. De nuevo `supabase/policies.sql` completo (ahora se puede re-ejecutar sin errores: borra y recrea las políticas).

Si instalas desde cero, basta con `schema.sql` y `policies.sql` como en los pasos 2 y 3. Mientras la base no esté migrada, la comandera sigue funcionando (reintenta el envío sin camarero), pero el botón «Pronto per ritiro» mostrará «Database non aggiornato».

Los PIN de los camareros van en `PUBLIC_WAITERS_JSON` (`.env.local` / Vercel), no en el código: solo identifican quién usa el móvil, no son seguridad.

## Migración 002 (cuenta, admin de carta, informes)

Para usar **Conto** (cierre de cuenta con método de pago), **Admin carta** (agotados y precios) y **Riepilogo** (totales del día) en una base ya existente, ejecuta **una sola vez** en **SQL Editor → New query** el archivo completo `supabase/migration-002-cuenta-admin-informes.sql` (idempotente: se puede repetir sin problema). Añade `orders.closed_at` y `orders.payment_method`, crea la tabla `catalog_overrides` (con realtime) y sus políticas. No hace falta volver a ejecutar `policies.sql` después. En instalaciones nuevas, `schema.sql` + `policies.sql` ya lo incluyen.

Hasta que la ejecutes la PDA sigue funcionando: la cuenta se cierra igual pero sin método de pago ni hora de cierre (el Riepilogo usa entonces `created_at`), y Admin avisa «Esegui la migrazione SQL» y la comandera usa la carta base.

Notas:

- La web pública **no** lee `catalog_overrides`: su carta sigue siendo la estática de `src/catalog.js`. Solo la PDA aplica agotados y precios.
- Con la clave anon pública, `catalog_overrides` es escribible por cualquiera que tenga esa clave (el PIN de Admin solo bloquea la pantalla). Las políticas limitan columnas y rango de precio (0–1000 €) y no permiten borrar.
- El «día» del Riepilogo va de las 06:00 a las 06:00 (hora Europe/Rome) y una cuenta cuenta en el día en que se cerró.

## Seguridad

- La clave anon va dentro del JS público: cualquiera puede verla. La única barrera real son las políticas de `policies.sql`.
- El PIN de la comandera solo bloquea la pantalla, no es seguridad.
- No guardes datos personales ni de pago en estas tablas.
