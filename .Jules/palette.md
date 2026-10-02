## 2024-09-24 - FormField Component A11y and Validation State
**Learning:** Reusable custom form field wrappers in this app were rendering helper text correctly visually but failing to programmatically associate that text with the underlying `TextField` input, hiding errors and guidance from screen reader users. Also, error states were not coloring labels consistently with native MUI inputs.
**Action:** When creating custom wrappers around native or MUI inputs, always generate and assign unique IDs to external helper text and wire them up using `aria-describedby` (safely concatenating with consumer-provided ARIA attributes). Ensure label colors reflect error states matching the input.
## 2026-09-30 - Add Tooltips and ARIA labels to IconButtons
**Learning:** Using IconButton without accessible names (like aria-label) combined with missing Tooltips for hover state reduces usability. Adding Tooltips and aria-labels solves both screen-reader accessibility and mouse hover UX issues.
**Action:** When using IconButton components for actions, always verify they contain an aria-label (or text child) and wrap them with Tooltip for explicit interaction context.
