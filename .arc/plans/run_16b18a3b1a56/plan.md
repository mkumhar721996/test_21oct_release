summary: |
  Add search, status chips, a severity select and an area select to the defect list (`/defects`) so results narrow in place on every keystroke or click, with no Apply button. Filtering is client-side over the full defect list the server page already fetches: `page.tsx` stays a server component that computes the unfiltered status counts and passes ALL sorted defects to a new client component, `DefectListView`. That component owns the filter state and renders a `DefectFilters` toolbar, an aria-live results line, the existing `DefectTable` and `Pager` (reused), and a no-match empty state with a "Clear filters" button. Filter semantics (search by title or ID, status multi-select OR within status, AND across fields) live in a pure, unit-testable `filterDefects` in `lib/defects.ts`, next to the fixed severity and area lists that feed the selects. The build follows the approved prototype `TEST-21OCT-RELEASE-STORY-015-design.html`.

scope:
  - description: |
      Pure filtering logic and the fixed lists, added to the existing lib module. Add:

      ```ts
      export const SEVERITIES: readonly DefectSeverity[] = ["low", "medium", "high", "critical"];
      export const AREAS = ["Login", "Billing", "Reports", "Other"] as const;
      export interface DefectFilters {
        q: string;
        statuses: DefectStatus[];   // multi-select; empty = no status filter
        severity: DefectSeverity | "";
        area: string;               // "" = All
      }
      export const EMPTY_FILTERS: DefectFilters = { q: "", statuses: [], severity: "", area: "" };
      export function hasActiveFilters(f: DefectFilters): boolean;
      export function filterDefects(all: Defect[], f: DefectFilters): Defect[];
      ```

      `filterDefects` keeps input order (so the server sort is preserved). Search is trimmed, case-insensitive, and matches title OR id (prototype `matches()`, placeholder "Search by title or ID"). Statuses: the defect status must be in the selected set when the set is non-empty. Severity and area: exact equality when set. All four combine with AND. `hasActiveFilters` is true when trimmed q, statuses, severity or area is set (prototype `filtered`).
    files:
      - apps/web/src/lib/defects.ts
    rationale: |
      Keeps matching rules out of React so ACs 1-4, 6-8 and 19 are covered by fast pure tests, and gives the selects one source for the "fixed lists" (ACs 12, 13). `Defect.severity` is already a lowercase union and `SEVERITY_BADGE` in defect-row.tsx holds the display labels, so select options reuse those labels instead of a second copy.
  - description: |
      Extend the existing `Icon` component with `search` and `x` icons (prototype sprite `#i-search` in the search box and no-match state, `#i-x` on the clear button). `search` needs a circle at cx 11, cy 11, r 8, which the current `CIRCLED` set (fixed r=10 at centre) cannot draw, so replace `CIRCLED` with a small per-name circle-attribute map (`alert` and `info` keep cx12 cy12 r10).

      ```ts
      search: ["m21 21-4.3-4.3"],
      x: ["M18 6 6 18", "m6 6 12 12"],
      const CIRCLES: Partial<Record<IconName, { cx: number; cy: number; r: number }>> = {
        alert: { cx: 12, cy: 12, r: 10 }, info: { cx: 12, cy: 12, r: 10 }, search: { cx: 11, cy: 11, r: 8 },
      };
      ```
    files:
      - apps/web/src/components/icon.tsx
    rationale: |
      Reuse and extend the catalogue's `icon` component rather than adding one. Path data is copied from the prototype's SVG sprite.
  - description: |
      New `DefectFilters` toolbar (client component, controlled): `form role="search" aria-label="Search and filter defects" onSubmit={(e) => e.preventDefault()}` with class `toolbar`, matching the prototype `form.toolbar`.

      ```tsx
      interface DefectFiltersProps {
        filters: DefectFilters;
        onChange: (next: DefectFilters) => void;
        searchRef?: React.Ref<HTMLInputElement>;
      }
      ```

      Structure from the prototype: (1) a `.field` with `<label htmlFor>` "Search defects" and `.search-wrap` holding the `search` Icon and `input.input type="search" placeholder="Search by title or ID" autoComplete="off"`; (2) `.toolbar-filters` holding a `.field role="group" aria-labelledby` labelled "Status" with a `.cluster` of three `button.chip type="button" aria-pressed` for Open, In progress, Closed (a `check` Icon is rendered inside only while pressed, replacing the prototype's CSS show/hide), and a `.select-group` with two `.field`s: "Severity" `select.select` and "Area" `select.select`, each with first option `All` (value empty) followed by exactly `SEVERITIES` (labels from `SEVERITY_BADGE`) and `AREAS`. There is NO submit or Apply button. The search input uses `onChange` (per keystroke); chips toggle membership in `statuses`; selects use `onChange`.
    files:
      - apps/web/src/components/defects/defect-filters.tsx
    rationale: |
      New component because no catalogue entry covers a filter toolbar. It composes existing design-system classes (`.field`, `.input`, `.select`, `.chip`, `.cluster`) and wraps every control in `.field` with a label, as the UI guidelines require.
  - description: |
      New `DefectListView` client component (`"use client"`) owning the filter state and composing the pieces.

      ```tsx
      interface DefectListViewProps {
        defects: Defect[];   // ALL defects, already sorted by the server
        sort: SortDir;
        page: number;        // from the URL, clamped against the unfiltered list
      }
      const [filters, setFilters] = useState<DefectFilters>(EMPTY_FILTERS);
      const matched = filterDefects(defects, filters);
      const view = pageOf(matched, clampPage(String(page), Math.max(1, Math.ceil(matched.length / PAGE_SIZE))));
      ```

      Layout in prototype order inside a `.stack`: `DefectFilters`; `.results-line.text-sm.text-muted` with `<span role="status" aria-live="polite">` reading "Showing all N defects" (no filters), "Showing X of N defects" (filtered) or "No defects match" (none), plus `btn btn-ghost btn-sm` "Clear filters" only when filters are active AND there are matches; then either `DefectTable` + `Pager` (reused unchanged, fed the filtered from/to/total/pageCount) or, when `matched.length === 0`, the `.empty-state` block with the `search` Icon, `<h2>No defects match your search.</h2>`, `<p>Try different words, or remove a filter to see more defects.</p>` and `button.btn.btn-secondary` with the `x` Icon and "Clear filters". Clearing sets `EMPTY_FILTERS` and focuses the search input (prototype `$('q').focus()`).

      Paging: when a filter changes while `page > 1`, call `router.replace(`/defects?sort=${sort}`, { scroll: false })` (from `useRouter`) so the user lands on page 1 of the filtered results. Component state survives this soft navigation because the component stays mounted at the same position.
    files:
      - apps/web/src/components/defects/defect-list-view.tsx
    rationale: |
      A client component is needed because ACs 1-4 require updating per keystroke with no round trip. Receiving the full list keeps filtering immediate and keeps counts out of its hands entirely (AC 11). `DefectTable` and `Pager` are reused, as the prototype itself reuses the 014 table.
  - description: |
      Update the server page to render the new view instead of `DefectTable` + `Pager` directly. Counts stay computed from `all` and rendered by the unchanged `StatusCounts`.

      ```tsx
      const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
      const page = clampPage(params.page, pageCount);
      ...
      <StatusCounts counts={counts} />
      <DefectListView defects={sorted} sort={sort} page={page} />
      ```

      Remove the now-unused `pageOf`, `DefectTable` and `Pager` imports. The page head and "New defect" link are unchanged.
    files:
      - apps/web/src/app/defects/page.tsx
    rationale: |
      Keeps data fetching and counts on the server and unfiltered (AC 11), and hands the list to the client view.
  - description: |
      Add the prototype's toolbar styles to the "Defect list" section of globals.css (line ~297), built only from tokens: `.toolbar`, `.toolbar-filters`, `.search-wrap` (+ `.search-wrap .icon` absolutely positioned, `.search-wrap .input { padding-left: var(--space-5) }`), `.chip` sizing overrides (`min-height: var(--size-control-md)`, `padding-inline: var(--space-3)`, `cursor: pointer`, `font: inherit`, focus-visible ring), `.select-group` (+ `.select-group .field { min-width: 10rem }`), `.results-line`, and inside the existing `max-width: 40em` media query `.select-group .field { flex: 1 1 8rem; }`. Do NOT port the prototype's `.chip .icon { display: none }` rules; the React component renders the check icon only while pressed. Base `.chip`, `.select`, `.input`, `.field`, `.empty-state`, `.btn-ghost`, `.btn-sm` already exist.
    files:
      - apps/web/src/app/globals.css
    rationale: |
      The prototype's toolbar and chip layout is not yet in the app stylesheet. Phone-first wrapping comes from the prototype's flex-wrap rules.
  - description: |
      Align the e2e stub's area list with the fixed list: in `stub-api.mjs` change `AREAS` from `["Login","Billing","Reports","Checkout","Profile","Search"]` to `["Login","Billing","Reports","Other"]`. Then add e2e coverage in a new `defect-filters.spec.ts` using the existing `seedDefects` fixture (see tests).
    files:
      - apps/web/tests/e2e/stub-api.mjs
      - apps/web/tests/e2e/defect-filters.spec.ts
    rationale: |
      Without the change, half of the seeded defects would not be reachable through the area select. Existing e2e specs only click the area cell by position and never read area text, so the change is safe.
  - description: |
      Unit tests, written FIRST (see tests). New: `defect-filters.test.tsx`, `defect-list-view.test.tsx`. Extend: `defects.test.ts` (filterDefects, hasActiveFilters, lists). Update `defects-page.test.tsx`: the `next/navigation` mock must also provide `replace` (`useRouter: () => ({ push: vi.fn(), replace: vi.fn() })`) because the page now renders a client view that calls `useRouter`; keep its existing assertions (20 rows, "Page 2 of 3", counts 15, clamp).
    files:
      - apps/web/tests/unit/defects.test.ts
      - apps/web/tests/unit/defect-filters.test.tsx
      - apps/web/tests/unit/defect-list-view.test.tsx
      - apps/web/tests/unit/defects-page.test.tsx
    rationale: |
      Test-first, one assertion group per acceptance criterion. `@testing-library/user-event` is not a dependency, so interactions use `fireEvent` from `@testing-library/react`.

tests:
  - |
    AC 14 and 15 (search box and three status chips render), defect-filters.test.tsx:
    ```ts
    render(<DefectFilters filters={EMPTY_FILTERS} onChange={vi.fn()} />);
    expect(screen.getByRole("searchbox", { name: "Search defects" })).toBeTruthy();
    const group = screen.getByRole("group", { name: "Status" });
    expect(within(group).getAllByRole("button").map((b) => b.textContent?.trim())).toEqual(["Open", "In progress", "Closed"]);
    ```
  - |
    AC 5 (no Apply button), defect-filters.test.tsx:
    ```ts
    expect(screen.queryByRole("button", { name: /apply/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /submit/i })).toBeNull();
    ```
  - |
    AC 12 and 13 (select options are exactly the fixed lists), defect-filters.test.tsx:
    ```ts
    const opts = (name: string) => within(screen.getByRole("combobox", { name })).getAllByRole("option").map((o) => o.textContent);
    expect(opts("Severity")).toEqual(["All", "Low", "Medium", "High", "Critical"]);
    expect(opts("Area")).toEqual(["All", ...AREAS]);
    ```
  - |
    AC 1 (search per keystroke, no button), defect-list-view.test.tsx with 5 fixture defects:
    ```ts
    render(<DefectListView defects={fixture} sort="desc" page={1} />);
    fireEvent.change(searchbox, { target: { value: "l" } });
    expect(titlesInTable()).toEqual(fixture.filter((d) => /l/i.test(d.title + d.id)).map((d) => d.title));
    fireEvent.change(searchbox, { target: { value: "  login  " } });
    expect(titlesInTable()).toEqual(["Login button unresponsive"]);
    ```
    Pure counterpart in defects.test.ts: `expect(filterDefects(all, { ...EMPTY_FILTERS, q: "DEF-2" }).map((d) => d.id)).toEqual(["DEF-2"])`.
  - |
    AC 2 (status chip), defect-list-view.test.tsx:
    ```ts
    fireEvent.click(screen.getByRole("button", { name: "Closed" }));
    expect(screen.getByRole("button", { name: "Closed" }).getAttribute("aria-pressed")).toBe("true");
    expect(rowStatuses()).toEqual(["Closed", "Closed"]);
    ```
  - |
    AC 3 (severity select), defect-list-view.test.tsx:
    ```ts
    fireEvent.change(screen.getByRole("combobox", { name: "Severity" }), { target: { value: "critical" } });
    expect(rowSeverities().every((s) => s === "Critical")).toBe(true);
    ```
  - |
    AC 4 (area select), defect-list-view.test.tsx:
    ```ts
    fireEvent.change(screen.getByRole("combobox", { name: "Area" }), { target: { value: "Billing" } });
    expect(rowAreas().every((a) => a === "Billing")).toBe(true);
    ```
  - |
    AC 6 and 7 (status + severity, status + area), defects.test.ts. The fixture must include rows matching only one of the two filters so a lazy OR implementation fails:
    ```ts
    const r = filterDefects(all, { ...EMPTY_FILTERS, statuses: ["open"], severity: "high" });
    expect(r.every((d) => d.status === "open" && d.severity === "high")).toBe(true);
    expect(r.length).toBe(all.filter((d) => d.status === "open" && d.severity === "high").length);
    const r2 = filterDefects(all, { ...EMPTY_FILTERS, statuses: ["closed"], area: "Login" });
    expect(r2.map((d) => d.id)).toEqual(all.filter((d) => d.status === "closed" && d.area === "Login").map((d) => d.id));
    ```
  - |
    AC 8 (search + filters combined), defects.test.ts:
    ```ts
    const f = { q: "report", statuses: ["open"], severity: "medium", area: "Reports" } as DefectFilters;
    expect(filterDefects(all, f).map((d) => d.id)).toEqual(["DEF-3"]);
    ```
  - |
    AC 9 (no-match message), defect-list-view.test.tsx:
    ```ts
    fireEvent.change(searchbox, { target: { value: "payroll" } });
    expect(screen.getByRole("heading", { name: "No defects match your search." })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("No defects match");
    expect(screen.queryByRole("table")).toBeNull();
    ```
  - |
    AC 10 (clear control shown with the message), defect-list-view.test.tsx. Only one "Clear filters" button exists while no-match is shown (the inline one is hidden), so `getByRole` does not throw on duplicates:
    ```ts
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeTruthy();
    ```
  - |
    AC 11 (counts unaffected), defect-list-view.test.tsx. `defects-page.test.tsx` cannot drive client state through the server function, so render a wrapper `<><StatusCounts counts={countByStatus(fixture)} /><DefectListView .../></>`, apply search, status, severity and area filters, and after each assert:
    ```ts
    expect(screen.getByLabelText("Defect counts").textContent).toBe(before);
    ```
    Also assert the structural guarantee that `DefectListView` takes no `counts` prop. e2e: `await expect(page.getByLabel("Defect counts")).toHaveText(before)` after typing and chip clicks.
  - |
    AC 16, 17 and 18 (clear control resets everything), defect-list-view.test.tsx. Set search, a chip, severity and area so nothing matches, then:
    ```ts
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect((searchbox as HTMLInputElement).value).toBe("");
    expect(screen.queryAllByRole("button", { pressed: true })).toHaveLength(0);
    expect((screen.getByRole("combobox", { name: "Severity" }) as HTMLSelectElement).value).toBe("");
    expect((screen.getByRole("combobox", { name: "Area" }) as HTMLSelectElement).value).toBe("");
    expect(screen.getAllByRole("row")).toHaveLength(1 + Math.min(fixture.length, PAGE_SIZE));
    expect(document.activeElement).toBe(searchbox);
    ```
  - |
    AC 19 (Open and Closed together), defects.test.ts and defect-list-view.test.tsx:
    ```ts
    const r = filterDefects(all, { ...EMPTY_FILTERS, statuses: ["open", "closed"] });
    expect(r.some((d) => d.status === "in_progress")).toBe(false);
    expect(r.length).toBe(all.filter((d) => d.status !== "in_progress").length);
    ```
    UI: click the Open and Closed chips, then `expect(rowStatuses()).not.toContain("In progress")` and both statuses are present.
  - |
    Results line and paging (prototype states, supports ACs 1 and 9), defect-list-view.test.tsx:
    ```ts
    expect(screen.getByRole("status").textContent).toBe("Showing all 5 defects");   // unfiltered
    expect(screen.getByRole("status").textContent).toBe("Showing 2 of 5 defects");  // once filtered
    // 45 defects, page={2}: a filter change resets to page 1 of the filtered list
    expect(replace).toHaveBeenCalledWith("/defects?sort=desc", { scroll: false });
    ```
  - |
    e2e, defect-filters.spec.ts (Playwright, stub API seeded with 45 defects, run with `pnpm e2e` from apps/web): type into the search box and assert the row count changes without clicking anything (ACs 1, 5); click the Closed chip then the Open chip and assert no row has the "In progress" badge (AC 19); choose severity and area and assert every row's badge or cell matches (ACs 3, 4, 6, 7); pick a combination with no rows, assert the "No defects match your search." heading and a Clear filters button, click it and assert empty search, no pressed chips, selects at "All", and 20 rows (ACs 9, 10, 16-18); assert `getByLabel("Defect counts")` text is identical before and after (AC 11); assert option lists equal the fixed lists (ACs 12, 13).
    ```ts
    await expect(page.getByLabel("Defect counts")).toHaveText(before);
    ```

assumptions_or_open_questions:
  - |
    OPEN QUESTION: the "fixed severity list" is taken from the code, where severity is already the closed union `low | medium | high | critical` (`DefectSeverity`). No fixed AREA list exists anywhere in the codebase. I used the prototype's options `Login, Billing, Reports, Other` as `AREAS` in `lib/defects.ts`. Please confirm, or point me to the canonical list (for example one owned by the new-defect or API items). The e2e stub currently seeds `Checkout`, `Profile` and `Search`; I plan to change it to the fixed list.
  - |
    Filtering is client-side over the whole list that `getDefects()` already returns, not a server or API query. This matches the prototype ("updates on every keystroke") and the current API (`GET /defects` has no filter params). It assumes the list stays small enough to hold in the browser; large data sets would need an API change that is out of scope.
  - |
    Where the prototype differs from the existing app I keep the existing app: (a) the prototype table caption is "Defects, newest first", while the shipped 014 table caption reads "Showing from-to of total defects, newest first" and is kept (it now reflects the filtered total); (b) the prototype shell header has no "New defect" button, but the existing page head does, so it stays; (c) the prototype's "Filters cleared" `.toast` is NOT built. No AC requires it and the repo has no toast component, so the aria-live results line plus focus returning to the search box carries the confirmation. Say so if you want the toast added; (d) the prototype's "Prototype shortcut" reviewer-aid button is not built.
  - |
    The prototype also shows an inline "Clear filters" ghost button in the results line whenever filters are active and results exist. No AC covers it, but it is in the approved design, so I build it. It never appears together with the no-match button.
  - |
    Status chips are multi-select with OR inside the status group (AC 19) and AND across search, status, severity and area. Filter state is held in component state only and is not reflected in the URL, so a reload clears it. The ACs do not ask for shareable filter URLs.
  - |
    When a filter changes while on page 2 or later, the user is returned to page 1 via `router.replace('/defects?sort=...')`. The ACs say nothing about paging with filters; this is the least surprising behaviour. Pager links still work on the filtered list (they go through the server page, which re-renders with a new `page` prop while client filter state is preserved).
  - |
    Search matches title or defect ID only (as the prototype placeholder states), case-insensitive and trimmed. Area, description and comments are not searched.

estimated_points: 5

package_dependencies: []

notes: |
  Design source read: the full prototype HTML (shell, toolbar, results line, table, no-match state, script). Elements used: `form.toolbar[role=search]`, `.field` + `.search-wrap` + `.input type=search`, three `.chip[aria-pressed]` buttons inside a `role=group` labelled Status, `.select-group` with Severity and Area `.select` (first option "All"), `.results-line` with `role=status aria-live=polite`, `.btn-ghost.btn-sm` inline clear, and `.empty-state` with heading, helper text and `.btn.btn-secondary` "Clear filters". Colours and spacing come only from tokens (`--space-*`, `--color-*`, `--radius-*`), already present in globals.css. There is no prototype-vs-AC conflict on behaviour; differences from the shipped app are listed in the assumptions.

  Reuse: `StatusCounts`, `DefectTable`, `DefectRow`, `Pager` and `Icon` are reused (Icon extended). New components are only `DefectFilters` and `DefectListView`, for which the catalogue has no equivalent.

  Verification commands (run from `apps/web`): `pnpm test` (vitest), `pnpm typecheck`, `pnpm e2e`.

  ```mermaid
  flowchart TD
    Page["app/defects/page.tsx (server)"] --> Counts["StatusCounts (unfiltered counts)"]
    Page --> View["DefectListView (new, client)"]
    View --> Filters["DefectFilters (new)"]
    View --> Table["DefectTable"]
    View --> Pager["Pager"]
    Table --> Row["DefectRow"]
    View --> Lib["lib/defects.ts: filterDefects, AREAS, SEVERITIES"]
    Filters --> Lib
    Filters --> Icon["components/icon.tsx"]
    View --> Icon
    Page --> Api["lib/defects-api.ts getDefects"]
    Css["app/globals.css"] -.styles.-> Filters
    Stub["tests/e2e/stub-api.mjs"] -.seeds.-> Api
    classDef touched fill:#f96,color:#000
    class Page,View,Filters,Lib,Icon,Css,Stub touched
  ```

  Touched nodes: page.tsx (hands the full list to the client view; counts stay server-side), DefectListView and DefectFilters (new), lib/defects.ts (pure filtering and fixed lists), icon.tsx (search and x icons), globals.css (toolbar styles), stub-api.mjs (area list aligned).

review_focus: |
  IN scope: the toolbar, client-side filtering, results line, no-match state with clear control, the fixed severity/area lists, and tests. OUT: server or API filtering, URL-persisted filters, a toast, and any change to counts, table columns, sorting or the New defect link. The riskiest area is the interaction between client filter state and the URL-driven paging and sort (`router.replace` to reset the page, state surviving soft navigation), plus the requirement that `DefectListView` never feeds anything into the counts. Deliberate choices: the fixed area list comes from the prototype because no canonical list exists in code (flagged as an open question), and the shipped table caption and New defect button are kept over the prototype's differences.
