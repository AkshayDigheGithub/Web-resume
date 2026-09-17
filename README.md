# Web Resume — Akshay Dighe

A static, single-page web resume for **Akshay Dighe**, Lead Software Developer
(Full-Stack — ReactJS + Node.js, 9+ years).

## Contents

```
index.html          the full resume page
assets/styles.css   design tokens, layout, light/dark themes, print stylesheet
assets/script.js    theme toggle, print button, scroll-spy navigation
```

No build step and no dependencies — open `index.html` in a browser, or serve
the folder with any static server.

```bash
python3 -m http.server 8000     # then visit http://localhost:8000
```

## Features

- Responsive layout that works from phone width upward
- Light/dark theme following the OS preference, with a manual toggle saved in `localStorage`
- Print stylesheet — the **Print** button produces a clean three-page PDF
- Scroll-spy navigation highlighting the section in view
- Semantic HTML with skip link, ARIA labels and visible focus styles

## Client confidentiality

Clients of the **current employer** are not named. Their engagements appear by
industry sector instead:

| Shown as                            | Purpose                              |
| ----------------------------------- | ------------------------------------ |
| Building & Industrial Automation    | current engagement, client withheld  |
| Building Materials                  | current engagement, client withheld  |
| Life Sciences / Lab Automation      | current engagement, client withheld  |

Clients from previous employers are named as usual.

## Deploying

- **GitHub Pages** — Settings → Pages → deploy from branch, root folder.
- **Vercel / Netlify** — import the repository; no build command, output directory `.`.
