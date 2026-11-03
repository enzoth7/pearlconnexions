# Pearl Connexions · brandbook para el website

Esta guía fija la dirección visual del sitio web. Es una referencia de diseño; no modifica los estilos que están publicados hoy. El manifiesto original (`Manifesto.png` y `new manifesto.docx`) se conserva como material de marca, aunque use otros colores.

## Paleta

| Rol | Color | Uso principal |
| --- | --- | --- |
| Blanco | `#FFFFFF` | Fondo, espacio, superficies y texto sobre azul oscuro |
| Celeste | `#08A4BE` | Acentos, enlaces, indicadores y superficies breves |
| Azul oscuro | `#101566` | Títulos, texto, navegación, botones y superficies oscuras |

El blanco debe ocupar la mayor parte de la página. El azul oscuro organiza la lectura y el celeste señala acciones o información puntual. No introducir un cuarto color de marca para controles o secciones.

## Tipografía

| Uso | Familia | Pesos recomendados |
| --- | --- | --- |
| Títulos y cifras destacadas | **Nunito** | 700 y 800; 900 solo para titulares breves |
| Párrafos, etiquetas, menús, formularios y botones | **DM Sans** | 400, 500 y 700 |

Mantener títulos cortos, interlineado holgado en párrafos y jerarquías reconocibles. No usar el logo como sustituto de un título de página.

## Contraste y combinaciones

| Fondo | Texto | Uso |
| --- | --- | --- |
| Blanco | Azul oscuro | Lectura y controles principales; contraste aproximado **15,9:1** |
| Azul oscuro | Blanco | Cabeceras, pie y botones principales; contraste aproximado **15,9:1** |
| Celeste | Azul oscuro | Etiquetas o botones celestes; contraste aproximado **5,35:1** |
| Blanco | Celeste | Acentos gráficos, líneas e iconos grandes; evitarlo para texto pequeño |

Blanco sobre celeste da aproximadamente **2,97:1** y no alcanza para texto corriente. Para botones celestes, usar texto azul oscuro. No transmitir un estado solo con color: añadir texto o un icono con nombre accesible.

## Logo e isotipo

- Sobre fondos blancos o claros, usar el logo de color optimizado del sitio: `website/public/pearl-logo.webp`. Para edición o nuevas exportaciones, partir del original `assets/LogoTransp.png`.
- Sobre azul oscuro, usar la versión blanca `website/public/pearl-logo-light.webp`. Evitar ponerla sobre blanco o celeste claro.
- Mantener proporción, margen libre alrededor y nitidez. No estirar, girar, recortar el apretón de manos ni recolorear la imagen con filtros CSS.
- Para espacios compactos, usar el isotipo autorizado en el dashboard (`dashboard/public/isotipoByN.png`) solo si la marca es reconocible en ese contexto. El archivo original y variantes anteriores quedan en `assets`.

## Componentes del sitio

- Fondo de página blanco; bloques oscuros solo para dar estructura o destacar una acción.
- Botón principal azul oscuro con texto blanco. Celeste para énfasis secundario con texto azul oscuro.
- Enlaces en azul oscuro, con subrayado o señal adicional cuando formen parte de texto corrido. El estado de foco debe ser visible.
- Fotos auténticas de personas, hogares y comunidad. Conservar recortes naturales; evitar fotografías de ejemplo o duplicadas.

## Estado de aplicación

El website usa esta paleta de tres colores. Los fondos de página y las franjas de contenido son blancos o azul oscuro. El celeste se reserva para acentos y elementos de interfaz. Las aplicaciones operativas pueden conservar sus estilos propios.
