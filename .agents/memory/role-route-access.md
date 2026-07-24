---
name: Role-based route access
description: How per-role navigation works in the Ulimax frontend and what to update when adding a page
---

Rule: `src/lib/access.ts` (in artifacts/ulimax) is the single source of truth for which roles can open which routes. `RoleGate` in App.tsx redirects any disallowed route to the role's home (`homeForRole`). The sidebar (layout.tsx) and command palette filter by the same lists.

**Why:** menus, palette, and the gate were deliberately unified after the gestor UX simplification (July 2026); if a new page is added to the router/nav but not to the allowed lists in access.ts, executors/observadores get silently redirected away and it looks like a broken link.

**How to apply:** when adding a new page or moving a route, update all of: (1) route in App.tsx, (2) role lists in access.ts, (3) nav in layout.tsx, (4) command palette page items if relevant. Also: RoleGate/RoleHome must keep their loading state (spinner while the profile loads) — returning children while the role is unknown flashes forbidden pages.
