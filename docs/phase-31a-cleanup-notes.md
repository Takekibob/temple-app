# Phase 31a Cleanup Notes

## CSS Variable Names Used for Color Replacements

| Hex value | CSS Variable used | Defined as |
|-----------|-------------------|------------|
| `#E5E5E5` | `var(--color-border)` | `--border: #E5E5E5` in `:root`, mapped via `@theme inline` |
| `#F0F0F0` | `var(--color-border-thin)` | `--border-thin: #F0F0F0` in `:root`, mapped via `@theme inline` |
| `#1A1A1A` | `var(--color-ink)` | `--color-text-primary: #1A1A1A` in `:root`, mapped via `@theme inline` |

All three variables existed before Phase 31a — no new variables were added (Step 4 was a no-op).

## font-serif Application Decisions (Uncertain Cases)

### Home page (`src/app/(app)/app/page.tsx`)
- The home page uses a modern card-based design (stone/amber/teal) diverging from the app's serif typography system. Applied `font-serif` to h1, h2 (SectionHeader), and core descriptive body text only. Did NOT apply to card labels, chips, categories, fees, or navigation links as these are supplementary UI elements in the card paradigm.

### NearbyTemplesClient.tsx
- Did NOT apply `font-serif` to the search input, filter selects, or tab buttons (these are UI controls).
- Applied to temple names, denomination text, address text, and empty-state messages.

### Events/My page (`ParticipationRow`)
- The `past ? "text-stone-500" : "text-stone-800"` conditional class was preserved; `font-serif` prepended.

### CancelButton.tsx
- Only the error message `<p>` got `font-serif`; the button text is a UI action label so left as-is.

### LineSettingsClient.tsx
- Kept the description "LINEを連携すると予約確認・法事のリマインド..." text as-is (only font changed). Note this text contains "法事" which is borderline per v2 wording guidelines but was not in scope for this cleanup.

### NotificationsClient.tsx
- The `<p className="text-xs text-stone-400 mt-3 leading-relaxed">` (push notification explanation) was left without font-serif as it is a supplementary UI note.

### ProfileEditClient.tsx
- `<span className="text-sm text-stone-700">{tag}</span>` inside interest tag checkboxes was left without font-serif as checkbox labels are considered UI controls.

## Deviations from Plan

- **Step 4**: No new CSS variables were added. All 3 needed variables (`--color-border`, `--color-border-thin`, `--color-ink`) already existed in the codebase.
- **`@apply font-sans` → `font-family: var(--font-sans)`**: In Tailwind v4, the `@theme inline` block maps `--font-sans: var(--font-sans)` (circular), relying on Tailwind's internal resolution. The native CSS replacement `font-family: var(--font-sans)` preserves this behavior.
- **Sidebar.tsx**: This is a shared component used in admin pages but lives in `src/components/teralog/` — color replacements applied as instructed.
- All 120 pages maintained throughout all steps.
