---
name: Printable pages in the SPA shell
description: How window.print() pages work inside the app layout (h-screen/overflow shell prints only page 1 without the print: overrides)
---

**Rule:** Pages that call `window.print()` (relatório de projeto, reunião semanal) rely on `print:` overrides already in the app shell (`layout.tsx`): sidebar and both headers are `print:hidden`; the root, `<main>`, and the content wrapper get `print:h-auto print:overflow-visible print:block print:p-0`; `index.css` sets `@page { margin: 12mm }`.

**Why:** The shell uses `h-screen` + `overflow-y-auto`. Browsers only print the visible scroll viewport of an overflow container — without the overrides, every print job cut off after page 1.

**How to apply:** A new printable page needs no layout work — just give its action bar `print:hidden` and call `window.print()`. If the shell layout is ever restructured, keep the `print:` overrides on whichever elements own the scroll, or printing silently regresses to one page.
