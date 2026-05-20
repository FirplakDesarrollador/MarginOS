# MarginOS Release Workflow

**OBJECTIVE:**
Every time a major feature or improvement is implemented, this workflow must automatically be followed to prepare a stable release.

## 1. VERSIONING RULES
Before increasing the app version, confirm whether the change is:
- **PATCH**: bug fix, visual adjustment, minor improvement
- **MINOR**: new feature, new module, new workflow
- **MAJOR**: structural architecture change

**Default behavior:**
- If the user does not specify the version type, suggest the version bump but do not assume silently.

Use semantic versioning:
`MAJOR.MINOR.PATCH`

Examples:
- `v1.1.0`
- `v1.2.0`
- `v1.2.1`

## 2. SIDEBAR VERSION
Automatically update the visible app version in the sidebar.
Inside `Sidebar.tsx` (or wherever the version is rendered, e.g., `src/components/Sidebar.tsx`):
`MarginOS vX.X.X`

## 3. CHANGELOG
Update `/changelog/releases.md`.

Format:
```markdown
# MarginOS vX.X.X
**Date:** YYYY-MM-DD
**Summary:** Brief description of this release.

## Added
...

## Improved
...

## Fixed
...

## Technical notes
...
```

## 4. BUILD VALIDATION
Before completing any implementation:

Run:
`npm run build`

Fix:
- TypeScript errors
- missing imports
- parsing errors
- runtime errors
- merge leftovers

## 5. CRITICAL RULE
**Never overwrite existing business logic blindly.**

Always preserve:
- Pricing Manager logic
- USD conversion logic
- conversion_trm
- No aplica logic
- Simulator compatibility
- Dashboard calculations
- Table density system
- Existing Supabase integrations

## 6. MERGE SAFETY
If merge conflicts exist:
- resolve manually
- preserve both implementations when needed
- remove conflict markers
- ensure stable final state

## 7. FINAL OUTPUT
At the end of every implementation:
- app must compile successfully
- no runtime errors
- no TypeScript errors
- changelog updated
- version updated
- release stable
