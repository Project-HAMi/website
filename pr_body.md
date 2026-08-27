Fixes #743

## Problem

Users must manually navigate various documentation pages to figure out the correct Kubernetes `resources.limits` annotations for their specific hardware vendor, increasing friction for new adopters.

## Solution

This PR introduces a native, interactive React component (`<ManifestGenerator />`) directly into the Docusaurus User Guide. Users can select their target hardware vendor, memory mode, and core requirements to dynamically render a copy-pasteable, syntax-highlighted Kubernetes Pod configuration.

## Architectural Considerations

To ensure this component seamlessly integrates with the existing HAMi Docusaurus architecture, the following design decisions were made:

1. **Perfect SSR (Zero Hydration Mismatches)**: The YAML state generation utilizes `useMemo` instead of `useEffect`. This ensures the exact HTML for the YAML `<CodeBlock>` is generated server-side during the SSG build (`npm run build`), preventing layout shifts and hydration errors on the client.
2. **i18n Compliant**: All UI text strings are strictly wrapped in `@docusaurus/Translate` components, allowing the localization team to seamlessly extract and translate the UI for the Chinese (`zh`) locale using `npm run write-translations`.
3. **Accessibility (a11y) & Theming**: All form inputs utilize strict `id` and `htmlFor` pairings for screen readers. The component CSS module natively uses Infima CSS variables to instantly support Light/Dark mode toggling.
4. **Input Validation**: Memory and Core inputs are strictly sanitized using `Math.max(0, parseInt(value))` to prevent invalid YAML generation.

## Testing

- [x] Verified `npm run build:fast` passes with zero compilation/hydration warnings.
- [x] Tested Light/Dark mode contrast compliance.
- [x] Verified vendor constraint logic (e.g. locking Cambricon to percentage-based memory).

Signed-off-by: harshit kudhial <harshitkudhial@gmail.com>
