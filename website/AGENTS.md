# Pearl Connexions Website — Visual System

These rules are mandatory for every page, component and future visual change in this website.

## Typography

Use exactly two font families:

- `Nunito` for headings, prominent numbers and short display text.
- `DM Sans` for body copy, navigation, buttons, labels and form controls.

Allowed font weights:

- Nunito: `700`, `800`, `900`.
- DM Sans: `400`, `500`, `600`, `700`.

Do not introduce additional font families. Keep `Arial, sans-serif` only as a technical fallback.

## Colour palette

Use exactly the three colours in `assets/brandbook-pearl-connexions-website.md`:

| Role | Token | Value |
|---|---|---|
| White / page and surfaces | `--white` | `#FFFFFF` |
| Pearl light blue / accents | `--light-blue` | `#08A4BE` |
| Dark blue / text and sections | `--dark-blue` | `#101566` |

Keep photographs clear and unblurred. Do not put a blue overlay over them. A neutral black shadow may be used immediately behind white text when needed for contrast.

Do not add other hexadecimal, named, HSL or RGB colours to page surfaces or interface elements.

When a softer background, border, shadow or interaction state is required, derive it only from these colours using opacity. Examples:

- `rgb(8 164 190 / 0.10)` for a pale light-blue background.
- `rgb(16 21 102 / 0.12)` for a border or shadow.
- `rgb(255 255 255 / 0.85)` for a translucent white surface.

## Colour responsibilities

- White is the default page, card, navigation and footer background. Full-width sections must be white or dark blue.
- Dark blue is the default text colour and the main colour for dark sections.
- Light blue is reserved for links, active navigation and branded highlights; do not use a pale tint for full-width sections.

## Accessibility

- Body text on white must use dark blue.
- White text may be used on dark blue.
- Do not place white body text on light blue or yellow without verifying accessible contrast.
- Keep visible keyboard focus states, using white against dark surfaces and dark blue against light surfaces.
- Do not communicate status through colour alone.

## Implementation

- Define the three colour tokens once in `app/globals.css` and use the tokens throughout the site.
- Replace supporting colours with one of the three tokens or an opacity derived from them.
- Do not create page-specific palettes.
- New imagery should harmonise with the palette; photographs retain their natural colours.
