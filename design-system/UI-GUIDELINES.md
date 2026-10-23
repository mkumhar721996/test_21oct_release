# UI Guidelines — Web App

## Navigation and information architecture
- Top bar only, no sidebar: the app has just three top-level routes, so a sidebar would be mostly empty chrome.
- The shell has the brand "Web App" at left, three main destinations in order — **Home** (`data-nav-key="home"`), **Defects** (`defects`), **Reports** (`reports`) — and a footer. Add a destination only when a real route exists, appended after Reports, so the shell mirrors the routes.
- On small screens the nav collapses behind a menu button, because the top bar must never overflow a phone width.

## Layout and density
- Spacious, single-column content centred in `.container`, because the product is a lightweight page, not a data console.
- Space content with `.stack` / `.cluster` / `.grid` using the `space-*` tokens; never ad-hoc margins, so rhythm stays uniform.
- The breakpoint that matters is the phone-to-desktop switch where the nav expands; design phone-first, because content must work at the narrowest width first.

## Component usage
- One `.btn-primary` per view for the main action; `.btn-secondary` for alternatives, `.btn-ghost` for low-emphasis, `.btn-danger` only for destructive actions — this keeps the main action unambiguous.
- Wrap every form control in `.field` with a label and hint/error text, with `.is-invalid` on the control, so errors are explained next to their source.
- `.card` for a self-contained group of related content; `.grid` of cards for peers; a plain list for simple sequences; tables only for comparable multi-column records, since cards waste space on tabular data.
- `.alert` for inline, persistent messages; `.toast` for transient confirmations; `.modal` only for decisions that block progress; `.drawer` for secondary detail or edit panels — so interruption matches importance.
- `.empty-state` and `.skeleton` for no-data and loading, rather than blank space, so users can tell waiting from nothing.
- Status is always a `.badge` variant (neutral/success/warning/danger), because colour meaning must be consistent.
- Use `color-accent` (`.btn-accent`) sparingly for one promotional highlight, and the `color-neutral-*` shades for non-status chrome, so status colours keep their meaning.
- Hover and pressed fills come from the `*-hover` / `*-active` tokens (via the `button-*` aliases), never from opacity or ad-hoc shades, so interaction feedback stays consistent.

## Theme
- Light only (`color-bg` with `color-fg`); the app ships no dark theme, so a second palette would add untested surface area. Revisit if the product gains one.

## Voice and tone
- Plain, friendly and brief: sentence case, verbs on buttons ("Save changes"), because short labels scan fast.
- Errors say what happened and what to do next, without blame, so users can recover.
