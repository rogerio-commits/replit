---
name: Uppy React duplicate instance fix
description: Uppy's transitive deps pull in a second copy of React, breaking hooks in unrelated components (Radix Popover, etc.). Fix with pnpm overrides.
---

## Rule

When Uppy is installed in a pnpm workspace, add `pnpm.overrides` to the root `package.json` to force a single React version across the entire workspace:

```json
{
  "pnpm": {
    "overrides": {
      "react": "19.1.0",
      "react-dom": "19.1.0"
    }
  }
}
```

Use the **literal version string** (e.g. `"19.1.0"`), NOT `"$react"` — the `$variable` syntax only works when `react` is a direct dependency of the root package, which it is not in this monorepo.

**Why:** Uppy v4+ pulls in packages that declare their own `react` peer dependency at a range that resolves to a different install than the workspace's canonical React. pnpm installs both, causing "Invalid hook call" / `cannot read properties of null (reading 'useMemo')` errors at runtime in any component that uses hooks — even ones unrelated to Uppy (e.g. Radix UI Popover, notification bell).

**How to apply:** Any time Uppy is added to a workspace artifact. Run `pnpm install` after adding the override, then restart the frontend workflow.
