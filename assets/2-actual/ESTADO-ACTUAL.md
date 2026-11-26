# Pearl Connexions · estado actual

**Última actualización: 26/11/2026.** Este archivo es la fuente de verdad sobre qué se está haciendo y hacia dónde va el proyecto. Se actualiza después de cada reunión o mail relevante con Joel. Lo que no esté acá ni en [HISTORIAL.md](../4-historial/HISTORIAL.md) de los últimos dos meses se considera antecedente, no acuerdo vigente.

## En una línea

Empezó en mayo de 2026 como un dashboard de QA en Excel pedido por Fiverr. Hoy son dos productos web para Pearl Connexions: **la web pública** y **un portal interno (dashboard)** que reúne Leadership Workbooks, QA, HR, Finanzas y Mantenimiento.

## Próximo hito

**Viernes 27/11/2026, 11:30 (hora de Londres)**, con Joel y Renee Minott. Orden que pidió Joel (mail del 20/11): primero **revisar la web**, después **recorrer el QA Dashboard**. Enzo se comprometió (mail del 24/11) a tener listo para ese día:

- Las tareas recurrentes mensuales del mail de Joel del 23/11. Ya están en el código (commit del 26/11).
- Los cambios del mail de la semana anterior y los puntos de la reunión del 20/11. El mail de esa semana no aparece en Gmail con las búsquedas hechas; confirmar a cuál se refería.

## Frentes activos

### 1. Web pública

- **Dónde:** código en [website/](../../website/), diseño en Figma [PC-WEBSITE](https://www.figma.com/design/KAz0D8bxyarlUePJzWNZ2U/PC-WEBSITE), publicada en https://pearlconnexions.vercel.app/
- **Estado:** el 19/11 se alineó con Figma. Tiene las páginas de casas, FAQs, feedback, careers, About, Who we are y Contact. Joel le pidió a Renee que busque huecos, información faltante y mejoras antes del 27/11.
- **Reglas de diseño:** [brandbook](../1-marca/brandbook-pearl-connexions-website.md) y la sección de la web en [AGENTS.md](../../AGENTS.md) (60/30/10, fotos, íconos, footer).
- **Pendiente de Pearl:**
  - Datos legales para Privacy y Accessibility ([detalle](web/website-legal-pages-pendientes.md)).
  - Fotos del equipo y nombres o cargos públicos.
  - Buzón de contacto definitivo.
  - Encuadre de Victoria Road y del Children's Home.
  - Permiso para mostrar los sellos de GOV.UK y NHS.
  - Licencia de los Doodle Icons.
- **Material de trabajo:** [web/](web/). [Final Summary Web](web/Final%20Summary%20Web.md) es del 06/11: sirve de base editorial, pero parte de lo que lista como diferencia ya se resolvió.

### 2. Dashboard / portal interno

- **Dónde:** código en [dashboard/](../../dashboard/) (Vite + Supabase), publicado en https://dashboardpc.vercel.app. El acceso a la base y el flujo de migraciones están en la memoria de Claude (`pearl-db-access`).
- **Módulos:**
  - **Leadership Workbooks:** Action Register, Monthly Review, Completed Actions, sign-off, calendario, tareas recurrentes mensuales y adjuntos.
  - **QA:** overview e indicadores medidos, seguimiento e incidentes.
  - **HR**, **Finanzas** y **Mantenimiento** (reparaciones, controles y certificados).
  - **Finanzas** (plan por fases acordado con Joel el 26/11: sensible, solo Joel y Ruben):
    - **Fase 0 (hecha, 26/11):** acceso decidido por la base (`private.can_use_finance()`); solo el director da Finance; auditoría de todo cambio, visible solo para el director.
    - **Fase 1 (hecha, 26/11):** invoices a councils con el formato de Joel (ejemplo PCJAP1126). Councils, colocaciones con líneas estándar, borradores del mes en lote, Draft → Approved → Sent, número PC + iniciales + MMYY, total calculado de las líneas, PDF, .zip y envío en lote (el envío espera el dominio de Resend).
    - **Fase 2 (pendiente):** resumen mensual a partir de los Excel de gastos y nómina; falta decidir con Joel y Ruben si se sube el Excel o se carga en el sistema.
    - **Fase 3 (a definir):** informes y automatizaciones.
    - Plan completo: `~/.claude/plans/esto-lo-habl-con-iridescent-barto-…md`. Gastos con adjuntos y envío al controlador siguen como estaban.
  - **Settings:** permisos por manager y links compartidos.
- **Último cambio (26/11):** tareas recurrentes mensuales con deadline propio, sign-off obligatorio y paso a Overdue. También adjuntos privados, envío de gastos con un cron de los lunes, badges CQC/Ofsted en casas y organigrama por servicio.
- **Bloqueos conocidos:**
  - El envío de mails necesita un dominio de envío de Pearl en Resend y `CRON_SECRET`. Pearl todavía no tiene dominio de envío.
  - Los logins de las casas (onyx@, sapphire@, emerald@, ruby@, garnet@, hematite@) se crean con `dashboard/scripts/provision-house-managers.mjs`. Joel los pasó el 13/11 ([lista](../3-documentos-pearl/organizacion/usuarios-casas-2026-11-13.md)). Uno de los mails dice "pearlconmexions" y probablemente es un error de tipeo.
- **Criterios de QA vigentes:** [Final Summary QA](dashboard/Final%20Summary%20QA.md), del 04/11. Distingue entre lo pedido, lo propuesto y lo decidido. Faltan las KPI definitivas de los managers: la encuesta tiene solo dos respuestas (Ruben Purmah y Renee Minott).

## Hacia dónde vamos

La visión que Joel planteó el 20/07 y que sigue guiando el trabajo es un **sistema operativo integrado** para Pearl:

1. QA y gobernanza con dashboards en vivo (HR, Finanzas, Operaciones, Mantenimiento, resultados de usuarios). *En curso.*
2. Monitoreo automático de compliance: formación, supervisiones, auditorías, incidentes y key work. *Parcial:* vencimientos y overdue.
3. BI financiero: ocupación, rentabilidad por plaza, gasto de agencia, variación de nómina y caja. *En curso:* Joel mandó muestras reales el 20/11 ([finanzas](../3-documentos-pearl/finanzas/2026-11-20-muestras-joel/), fuera de Git). Fases 0 y 1 hechas el 26/11 (acceso e invoices a councils).
4. Dashboards ejecutivos de toda la organización. *Pendiente.*
5. Asistente de IA interno con las políticas de Pearl. *No empezado.*
6. Automatización de referrals, recruitment, onboarding, complaints, safeguarding y reporting. *No empezado.*

**Acuerdo comercial:** Joel aceptó **de palabra** el partnership semanal de julio, en la reunión del 07/08, sin firma ni aceptación escrita. Recién se facturó en septiembre: la primera factura (200) la pagó en octubre y después pagó una de 400. Tarda en pagar, pero paga. El trabajo de verdad arrancó en septiembre, cuando se pasó de Excel a web. Si hace falta formalizarlo, alcanza con que confirme el monto semanal por mail ([detalle](../4-historial/HISTORIAL.md#reunion-2026-08-07)).

## Personas

| Persona | Rol | Contacto / workbook |
| --- | --- | --- |
| Joel Samuel | Director / Operations Manager. Decide. | admin@ y operations@pearlconnexions.com |
| T. Renee Minott | Placement co-ordinator, business development, Supported Living | placementco@pearlconnexions.com. Revisa la web. |
| Mike Wright | Registered Manager, Children's Home | Fue el primer workbook (piloto, agosto) |
| Simmone Reid | HR Manager | Workbook de HR |
| Zulaikha Halim | Supported Living | Workbook |
| Ruben Purmah | Finanzas (payroll, reembolsos, gastos) | Workbook. Respondió la encuesta. |
| Richard Ayodele | Supported Accommodation | Workbook |
| Joseph Maye | Mantenimiento (nombrado en Final Summary QA) | Confirmar categorías y permisos |

Organigrama de referencia (de mayo, puede estar desactualizado): [business-structure.png](../3-documentos-pearl/organizacion/business-structure.png).

## Casas (nombres actuales)

Desde el 16/11 las casas usan nombres de gemas. Sapphire (Crimsworth Road), Garnet (Coulsdon), Ruby (Heathfields), Emerald (Milne Park) y Onyx (Friday Road) son Supported Living. Hematite aparece solo como usuario. Los handbooks y las fotos están en [3-documentos-pearl/casas](../3-documentos-pearl/casas/).

## Cómo trabajamos con Joel

- Canal principal: mail a admin@pearlconnexions.com. Las reuniones son por Teams o Google Meet, normalmente los viernes cerca del mediodía de Londres.
- Enzo agenda y factura desde su portal de clientes (portal@enzothome.com). Las tareas internas están en Planifier, en Joel Samuel > Dashboard + web.
- Tono con Joel: cercano y de colega, no corporativo. Mails de 4 o 5 líneas que digan qué se hizo y qué se necesita, y cierren con un pedido suave («Let me know what you think», «Happy to jump on a quick call»). Las listas largas o tablas van en un adjunto, no en el cuerpo ([guía completa](../4-historial/HISTORIAL.md#estilo-comunicacion-joel)).
