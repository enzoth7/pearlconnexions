# assets · mapa

Material de trabajo del proyecto Pearl Connexions que no es código. Ordenado por vigencia:

| Carpeta | Qué hay | Vigencia |
| --- | --- | --- |
| [1-marca/](1-marca/) | Brandbook, logos, isotipo, manifiesto. En `legacy/` van las versiones que ya no se usan. | Vigente |
| [2-actual/](2-actual/) | **[ESTADO-ACTUAL.md](2-actual/ESTADO-ACTUAL.md)**: qué se hace hoy y hacia dónde vamos. Notas de trabajo de la web (`web/`) y del dashboard (`dashboard/`). | Vigente; empezar siempre acá |
| [3-documentos-pearl/](3-documentos-pearl/) | Documentos que mandó Pearl y que se usan como fuente: guías para comisionados, handbooks y fotos de las casas, marco de QA, organigrama, muestras de finanzas. | Referencia vigente; revisar la fecha |
| [4-historial/](4-historial/) | **[HISTORIAL.md](4-historial/HISTORIAL.md)**: línea de tiempo de mails, reuniones y decisiones desde mayo, con un anexo que tiene el texto completo de mails, notas y propuestas. Las carpetas por etapa guardan solo PDF, Excel, imágenes y HTML. | Solo consulta; no es fuente de verdad |

## Reglas

- **Lo reciente manda.** Ante una duda, primero ESTADO-ACTUAL y después las entradas del historial de los últimos dos meses. El material de mayo a agosto (etapa Excel/VBA, propuestas de julio) se consulta solo si se pide.
- **Cada cosa nueva va a su carpeta:**
  - Un mail o una reunión → línea en HISTORIAL y, si hay texto para guardar, se pega en su anexo. No se crean `.md` sueltos. Los adjuntos que no son texto van en `4-historial/AAAA-MM-tema/`.
  - Un documento de Pearl → `3-documentos-pearl/`.
  - Un cambio de marca → `1-marca/`, y lo viejo pasa a `legacy/`.
- **Si cambia el rumbo**, se actualiza ESTADO-ACTUAL y se marca como **[Reemplazado]** lo anterior en HISTORIAL.
- Los handbooks originales (50–80 MB) y las muestras de finanzas (datos de personal) no se suben a git; ver `.gitignore`.
