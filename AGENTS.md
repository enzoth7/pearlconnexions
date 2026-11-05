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
