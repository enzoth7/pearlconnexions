# Pearl Connexions interface conventions

- Never use `<span>` or `<p>` elements or eyebrow text in interface code. Remove existing occurrences in a view when editing that view. Use semantic headings, `div`, `small`, `strong`, or labels as appropriate.
- Use the dark blue-green of the left navigation (`#102c39`) for page and section headings across the site.
- Keep card, panel, table body, and dialog backgrounds white. Header bands are the exception: every visible table header and boxed panel header uses the navigation blue-green (`#102c39`) with white text and icons. Round only the outermost header's upper corners to match the container, as on the QA risk table. A table header below a panel title stays square and flush with that panel; do not add a light divider or a second pair of rounded corners. Never use a pale or white header band for a boxed table or panel.
- Style status and count labels throughout the project like the HR Active and Onboarding badges: compact filled pills with fully rounded ends, soft semantic background colors, and dark matching text. Do not use white badges with colored text and a thin outline.
- Never add a decorative line or thick accent border along the top edge of KPI cards. This pattern is prohibited throughout the project.
- Make dialogs wide and responsive, with enough room for form fields on desktop and usable margins on mobile.
- Open choice filters directly from column headers as a compact styled option list, with no intermediate "Filter by" panel or nested select. Use keyboard-accessible menu items. Text and date filters may open a small input popover. Do not add always-visible filter inputs beneath headings or a separate filter bar.
- Never add horizontal scrollbars to tables or page content. Keep the main columns within the viewport at each breakpoint, and show additional row fields in a responsive details dialog opened by a `+` button.
- Use styled, keyboard-accessible dropdown menus instead of the browser's native select menu in new or edited views. Keep a visible label and field-level error, and support a custom value when a fixed list cannot cover the input.
- The project contains provisional records. Do not add "Demo data" labels or explanatory copy about sample data to the interface.

# Public website colour balance (60/30/10)

Applies to the public website (`website/`) and its Figma file (PC-WEBSITE). The dashboard keeps its own conventions above.

- **60% white `#FFFFFF`.** Page background and most content sections.
- **30% dark blue `#101566`.** Header utility bar, headings, primary buttons, dark bands, stats band and footer.
- **10% light blue `#08A4BE`.** Accents only: icons, hand-drawn underlines, links on dark backgrounds, small labels, dividers. Its pale tint `#E6F6F9` may be used as a section background, at most one or two bands per page, and counts towards this 10%.
- Never put white text on `#08A4BE`; use `#101566` on light blue instead.
- Alternate image and text blocks. Avoid two text-only sections in a row; use a real photo, a recrop of an existing photo, or a quote over a photo.
- One primary button per block. A second action is a text link with an arrow, not another pill.
- The CQC registration block sits at the bottom of the page, just above the footer.
- Never put a navy or blue overlay/gradient over photos. Keep text legible with white boxes and navy text instead (St Christopher’s pattern).
- Photos use the "A · Cálido suave" treatment: exposure +5, contrast −10, saturation −15, temperature +18, highlights −10, shadows +15 (Figma image filters). In CSS, approximate with `filter: saturate(0.85) contrast(0.93) brightness(1.04) sepia(0.08)`. Logos and the CQC/Ofsted graphics are never filtered.
- Icons on the public website use Khushmeen Sidhu's hand-drawn Doodle Icons (https://khushmeen.gumroad.com/l/doodleicons), filled in `#08A4BE` on light backgrounds or white on navy. Do not mix in thin technical line icons (Lucide style) for new elements. Confirm the commercial licence on Gumroad before shipping them in code.
- Icons stand alone: never wrap them in tinted squares, circles or badge containers.
- Hand-drawn accents are sparing: at most one per section and never on every heading. Use a light blue hand-drawn underline or a loose circle around one key word. The three-stroke "spark" mark is kept only on the Who we are and Contact heroes.
- Do not put a short note beside section headings. A heading stands alone, or has a subtitle below it when the subtitle carries real information.
- The footer carries the brand phrase “Where every connexion counts.” in Caveat Bold, white, without quotation marks. Caveat is only for this phrase or similar short hand-written accents, never for body copy or headings.
- Footer credibility links point only to official sources and open in a new tab: CQC (https://www.cqc.org.uk/location/1-19314630787), Companies House (https://find-and-update.company-information.service.gov.uk/company/13294525, Pearl Connexions (PC) CIC, no. 13294525) and the NHS website profile (https://www.nhs.uk/services/care-provider/pearl-connexions/1-19314630787). Enzo chose to show them as three small badges (CQC, GOV.UK, NHS) under the brand phrase; before launch, confirm the GOV.UK and NHS marks may be used, or swap them for text links. Do not add private directories such as homecare.co.uk. Keep the copyright line as "© 2026 Pearl Connexions (PC) CIC."
