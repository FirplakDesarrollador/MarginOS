# MarginOS Releases

This file tracks the releases and changes for MarginOS following the MarginOS Release Workflow.

<!-- Future releases will be appended below -->

# MarginOS v1.1.2
**Date:** 2026-05-27
**Summary:** Minor visual adjustments to unsaved changes confirmation dialog in dark/light mode and version consistency alignment.

## Improved
- **Unsaved Changes Modal contrast:** Enhanced readability of primary ("Continuar editando") and secondary ("Salir sin guardar") actions using design tokens instead of hardcoded values, correcting a dark mode visual bug where text was low-contrast.
- **Overlay Blur Depth:** Replaced standard backdrop blur with premium backdrop-blur-md and overlay styling to preserve Liquid Glass design principles.
- **Theme Adaptivity:** Replaced static colors with theme-dependent design variables (`bg-surface-card`, `border-border-subtle`, `text-text-muted`, `text-text-primary`, and warning state variables).

## Fixed
- Fixed a dark mode visual bug where white primary text sat on a light brand primary surface.
