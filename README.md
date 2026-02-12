# LG CRM Inmobiliario (Local-first + Supabase opcional)

Este proyecto es una **app web CRM inmobiliaria** (Next.js App Router) basada en el prototipo exportado. 

## Objetivo

1) **Funciona sin Supabase (coste cero)**: datos demo + persistencia local.
2) Más adelante puedes **conectar Supabase** sin romper la UI (misma estructura, mismas rutas).

## Rutas principales

- `/` login (modo local: acepta cualquier password no vacía)
- `/dashboard` KPIs
- `/kanban` pipeline de leads
- `/inventory` propiedades
- `/calendar` agenda de visitas
- `/gold-list` lista dorada
- `/tasks` tareas
- `/chat` vista conversacional
- `/reports` reportes

## Ejecutar local (sin variables)

```bash
npm install
npm run dev
```

## Deploy en Vercel (sin variables)

- Build Command: `npm run build`
- Output: Next.js (auto)
- **No necesitas variables** en modo local-first.

## Activar Supabase (cuando quieras)

1) Crea un proyecto en Supabase (plan free).
2) Ejecuta `supabase/schema.sql` en el SQL Editor.
3) Crea `.env.local` usando `.env.example` y agrega:

```bash
NEXT_PUBLIC_DATA_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

4) Redeploy en Vercel con esas variables.

## Nota importante

Para evitar errores de build (prerender) cuando NO hay keys, el archivo `lib/supabase/client.ts` cambia automáticamente a un **cliente mock** que:
- Persiste en `localStorage` en el navegador.
- Usa memoria en SSR/build (para que Next compile sin acceder a `window`).
