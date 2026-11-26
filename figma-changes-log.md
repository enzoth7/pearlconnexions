# Pearl Connexions — registro de cambios en Figma (PC-WEBSITE)

Archivo: https://www.figma.com/design/KAz0D8bxyarlUePJzWNZ2U/PC-WEBSITE
Orden de trabajo: primero Figma, después código. Cada cambio indica los nodos tocados y el archivo de código que lo refleja.

## 1. Home: botones CTA del hero

| Nodo | Antes | Después |
|---|---|---|
| `82:47` (texto, desktop) en `82:46` | Explore supported living | **Explore our homes** |
| `82:45` (texto, desktop) en `82:44` | Discuss a placement | **Discuss a referral** |
| `91:34` (texto, mobile) en `91:33` | Explore supported living | **Explore our homes** |
| `91:40` (texto, mobile) en `91:39` | Discuss a placement | **Discuss a referral** |

Actualización: "Explore our homes" pasó de texto con flecha a **botón con borde blanco** (nodos nuevos `277:182` desktop y `277:184` mobile, dentro de `82:43` y `91:38`); se eliminaron los links viejos `82:46` y `91:33`. En mobile los botones van apilados.
Destinos: Explore our homes → `/homes`; Discuss a referral → `/referrals`.
Código: `website/app/page.tsx` (hero) y `.pc-button-outline-light` en `sections.css`.

## 2. Our homes: etiqueta de tipo en cada casa

Pill blanco sobre la foto (arriba a la izquierda, 16/16): texto navy `#101566`, DM Sans SemiBold 13/18, padding 6/12, radio 999, sombra `0 1 6 rgb(16 21 102 / 0.14)`.
Texto: el tipo de provisión de la casa. Las cinco casas son **Supported living** (handbooks y guías de comisionados).

| Frame | Casa → nodo de la etiqueta |
|---|---|
| Desktop `181:721` | Sapphire `273:264` · Garnet `273:266` · Ruby `273:268` · Emerald `273:270` · Onyx `273:272` |
| Mobile `181:1013` | Sapphire `273:274` · Garnet `273:276` · Ruby `273:278` · Emerald `273:280` · Onyx `273:282` |

Código: `website/app/homes/page.tsx` + `website/app/homes.css` (o `services.css`), dato `provisionTitle` de `website/lib/homes.ts`.

## 3. Footer: enlace Contact

Se agregó un enlace `Link · Contact` (clon de `Careers`) justo después de `Careers` en la columna Explore de los 40 footers.
Nodos nuevos (frame raíz : nodo): `4:3:273:182`, `5:2:273:184`, `6:2:273:186`, `7:2:273:188`, `8:2:273:190`, `9:2:273:192`, `10:2:273:194`, `12:2:273:196`, `11:2:273:198`, `14:2:273:200`, `31:953:273:202`, `13:2:273:204`, `31:2:273:206`, `31:118:273:208`, `31:322:273:210`, `31:473:273:212`, `31:562:273:214`, `31:677:273:216`, `31:762:273:218`, `31:835:273:220`, `31:1071:273:222`, `31:1189:273:224`, `108:2:273:226`, `110:2:273:228`, `148:2:273:230`, `148:262:273:232`, `148:512:273:234`, `148:730:273:236`, `181:100:273:238`, `181:367:273:240`, `181:721:273:242`, `181:1013:273:244`, `186:191:273:246`, `186:459:273:248`, `191:686:273:250`, `191:947:273:252`, `212:164:273:254`, `212:376:273:256`, `264:182:273:258`, `265:190:273:260`.
Código: `footerExploreNav` en `website/lib/navigation.ts` (Contact después de Careers, href `/contact`).

## 4. Our services: resumen general de lo que se brinda

Frames: desktop `264:182`, mobile `265:190` (creados en la entrega anterior).
Orden final: Hero → **Who we support** → tarjetas de servicios → **What support looks like** → Workforce → CQC.

| Cambio | Desktop | Mobile |
|---|---|---|
| Texto del intro del hero (neutro, sin foco en SL) | dentro de `264:215` | dentro de `265:209` |
| Texto de las 3 tarjetas (alcance + proveedor + estado) | tarjetas de `264:233` | tarjetas de `265:227` |
| Altura de la fila de tarjetas (grid de 1 fila) | `264:233` → 470 | n/a (1 columna) |
| Bloque **Who we support** (clon de `196:170` / `196:201`) | `274:182` | `274:259` |
| Bloque **What support looks like** (clon de `116:31` / `116:294`) | `274:213` | `274:290` |

Textos nuevos:
- Intro: "Homes and personalised support for people who need stability and a clear pathway towards independence. Every service starts with the person and the people around them."
- Supported Living: "Adults aged 18+ across five South London homes. Provided by Pearl Connexions (PC) CIC."
- Supported Accommodation: "A supported step towards independence for young people, at Victoria Road. Provided through GNK Care Services. Not a current placement offer."
- Children's Home: "Planned by Pearl Connexions, with opening subject to Ofsted registration. Not a current placement offer."

Código: `website/app/services/page.tsx` (+ bloques compartidos).

## 5. Perfiles de casa: Home guide + Download resource

Sección nueva `Home guide` entre "Living at …" y "Where you'll be" (con un `Divider` nuevo después). Contiene título, texto, botón `Button · Download resource` y `File info` (PDF · tamaño · fecha de revisión). El link "Ask for another format" se eliminó (8 nodos).
Emerald House no tiene handbook, por eso no lleva la sección.

| Casa | Desktop (sección / botón / info / link / divider) | Mobile (sección / botón / info / link / divider) | Archivo |
|---|---|---|---|
| Sapphire | `275:182` / `275:207` / `275:209` / `275:210` / `275:214` en `12:2` | `275:215` / `275:240` / `275:242` / `275:243` / `275:247` en `31:835` | 18 MB · revisado 1 October 2026 |
| Garnet | `275:248` / `275:273` / `275:275` / `275:276` / `275:280` en `11:2` | `275:281` / `275:306` / `275:308` / `275:309` / `275:313` en `31:953` | 14 MB · revisado 1 October 2026 |
| Ruby | `275:314` / `275:339` / `275:341` / `275:342` / `275:346` en `14:2` | `275:347` / `275:372` / `275:374` / `275:375` / `275:379` en `31:1071` | 17 MB · revisado 1 October 2026 |
| Onyx | `275:380` / `275:405` / `275:407` / `275:408` / `275:412` en `181:100` | `275:413` / `275:438` / `275:440` / `275:441` / `275:445` en `181:367` | 14 MB · revisado 2 November 2026 |

Código: `website/app/homes/[slug]/page.tsx`, datos en `website/lib/home-guides.ts`.

## 6. Menús con "All services" (entrega anterior)

- Desktop: `265:496` (Menu · Our services dropdown) — frame nuevo.
- Mobile: `267:182` (Menu · mobile (open state) · with All services) — frame nuevo; el original `143:112` quedó intacto.
