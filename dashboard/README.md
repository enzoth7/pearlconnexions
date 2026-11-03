# Pearl Connexions Dashboard

Workspace privado de Pearl Connexions. Reúne QA operativo, Workbook, configuración de usuarios y permisos, HR y Finance en una sola aplicación Next.js con Supabase.

## Desarrollo local

1. Usar un `.env.local` local con los valores reales del proyecto: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` y `NEXT_PUBLIC_SITE_URL`. No incluirlo en Git ni copiar claves a `public`.
2. Ejecutar `pnpm install --frozen-lockfile`.
3. Ejecutar `pnpm dev` y abrir `http://localhost:3000`.

## Rutas

- `/director` y `/portal`: QA operativo, revisiones, hogares y reportes.
- `/workbook`: acciones, calendario, revisiones, archivo y equipo.
- `/config/users` y `/config/permissions`: Settings, cuentas y acceso a paneles/acciones.
- `/links`: enlaces compartidos del dashboard y la web, editables por administradores.
- `/hr` y `/finance`: áreas protegidas por permisos.

`/workbook/settings` y `/settings` redirigen a `/workbook/team` por compatibilidad. QA Settings y `/config/qa` no forman parte de la aplicación.

## Datos y despliegue

Las migraciones de QA y Workbook viven juntas en `supabase/migrations`. QA usa tablas `qa_*` separadas de los datos de Workbook. Los Directores ven información de toda la organización; los House Leads activos solo acceden a sus hogares asignados; las cuentas pendientes o inactivas van a `/access-pending`. Las pruebas de acceso de base de datos están en `supabase/tests/qa_rls.sql`.

No aplicar migraciones ni importar datos como parte de una reorganización de carpetas. Los respaldos locales y archivos temporales están en `tmp`, fuera de Git. El importador de QA puede comprobarse con `pnpm test:import`; su referencia esperada es 7 hogares, 60 definiciones, 210 filas y 30 filas por hogar. El archivo Excel de origen permanece fuera del repositorio.

Para verificar la aplicación local: `pnpm test`, `pnpm test:import`, `pnpm typecheck`, `pnpm lint` y `pnpm build`. El inicio de período mensual está programado en Supabase Cron a las 02:05 UTC del primer día de cada mes, con plazo del día 10 a las 23:59 de Europe/London.

El proyecto principal de Vercel es `pc-workbook`, con carpeta raíz `dashboard`. Los cambios de `dashboard` en `main` disparan su despliegue mediante GitHub Actions; los cambios de `website` despliegan únicamente la web institucional. El flujo también permite elegir un proyecto manualmente. Verificar el estado Ready y las rutas del dashboard tras publicar. Retirar `pc-qadashboard` requiere una decisión separada después de verificar el nuevo despliegue.
