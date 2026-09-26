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

Use exactly these four colours:

| Role | Token | Value |
|---|---|---|
| White / surfaces | `--white` | `#FFFFFF` |
| Pearl light blue / primary action | `--light-blue` | `#08A4BE` |
| Dark blue / headings and structure | `--dark-blue` | `#101566` |
| Yellow / small accents and highlights | `--yellow` | `#F3AD32` |

Do not add other hexadecimal, named, HSL or RGB colours.

When a softer background, border, shadow or interaction state is required, derive it only from these four colours using opacity. Examples:

- `rgb(8 164 190 / 0.10)` for a pale light-blue background.
- `rgb(16 21 102 / 0.12)` for a border or shadow.
- `rgb(243 173 50 / 0.18)` for a subtle yellow accent.
- `rgb(255 255 255 / 0.85)` for a translucent white surface.

## Colour responsibilities

- White is the default page and card background.
- Dark blue is the default text colour and the main colour for dark sections.
- Light blue is reserved for primary buttons, links, active navigation and branded highlights.
- Yellow is an accent only: icons, underlines, focus rings and small highlights. Do not use it for large backgrounds or long text.

## Accessibility

- Body text on white must use dark blue.
- White text may be used on dark blue.
- Do not place white body text on light blue or yellow without verifying accessible contrast.
- Keep visible keyboard focus states, using yellow against dark surfaces and dark blue against light surfaces.
- Do not communicate status through colour alone.

## Implementation

- Define the four colour tokens once in `app/globals.css` and use the tokens throughout the site.
- Remove legacy palette tokens and replace hard-coded supporting colours with one of the four tokens or an opacity derived from them.
- Do not create page-specific palettes.
- New imagery should harmonise with the palette, but photographs are not expected to contain only these four colours.
