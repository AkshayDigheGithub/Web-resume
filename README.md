# Web Resume — Akshay Dighe

An interactive single-page web resume for **Akshay Dighe**, Lead Software
Developer (Full-Stack — ReactJS + Node.js, 9+ years).

## Contents

```
index.html          the resume — full content in semantic HTML
assets/styles.css   design tokens, layout, light/dark themes, print stylesheet
assets/script.js    the interactive layer (no dependencies, no build step)
```

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000     # http://localhost:8000
```

## Interactive features

| Feature | Detail |
| --- | --- |
| **Command palette** | `⌘K` / `Ctrl-K` — jump to any section or project, toggle the theme, copy contact details, print, clear filters |
| **Project filtering** | Filter chips per technology, with live counts; multi-select uses OR ("any of the selected") |
| **Project search** | `/` focuses the box; matches titles, sectors, technologies and body text, and highlights title hits |
| **Skill → project links** | Selecting any skill filters the project list to the projects that use it |
| **Role → project links** | "View N related projects" on each role filters to that employer's work |
| **Technology Focus chart** | Ranked bars showing how many of the 7 projects use each technology, derived from the project markup itself — hover or focus a bar for the project names, select one to filter |
| **Shareable filter state** | Active filters are written to the URL (`?tech=ReactJS&from=softdel&q=…`) and restored on load |
| **Theme** | Follows the OS preference, manual toggle persisted in `localStorage` |
| **Print** | Filters reset automatically on print, so the PDF is always the complete resume |

Plus scroll progress, animated stat counters, reveal-on-scroll, active-section
nav, copy-to-clipboard with toast feedback, and back-to-top.

## Engineering notes

- **Progressive enhancement.** The HTML carries the entire resume; JavaScript
  only layers behaviour on top. With scripting disabled the resume still reads
  and prints correctly, and the interactive chrome hides itself.
- **Derived data, not duplicated data.** The filter chips, technology counts,
  chart and table are all computed at runtime from the `data-tech` attributes on
  the project cards, so there is a single source of truth for the content.
- **Accessibility.** Skip link, visible focus rings, `aria-pressed` filters, a
  live region announcing result counts, a keyboard-navigable listbox for the
  palette, a table view of the chart data, and a full
  `prefers-reduced-motion` path.
- **Print stylesheet** produces a clean three-page PDF.

## Client confidentiality

Clients of the **current employer** are not named. Their engagements appear by
industry sector instead, each marked *Client confidential*:

| Shown as | |
| --- | --- |
| Building & Industrial Automation | current engagement, client withheld |
| Building Materials | current engagement, client withheld |
| Life Sciences / Lab Automation | current engagement, client withheld |

Clients from previous employers are named as usual.

## Deploying

- **GitHub Pages** — Settings → Pages → deploy from branch, root folder.
- **Vercel / Netlify** — import the repository; no build command, output directory `.`.
