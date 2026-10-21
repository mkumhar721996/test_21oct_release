summary: |
  Add a read-only defect details page at `/defects/[id]` in the Next.js web app (`apps/web`). It shows the heading, status, severity, assignee ("Unassigned" when none), area, description, an attachments list (links, or "No attachments yet"), a comments list (or "No comments yet") and a back-to-list link. It also covers the loading, not-found and generic-error states. A new `getDefect(id)` fetcher in `defects-api.ts` calls `GET {API_BASE_URL}/defects/:id` and tells not-found (404) apart from other failures. The page reuses the existing badge maps from `defect-row.tsx`, the design-system classes in `globals.css` and `AppShell`. The e2e stub Platform API gains a `GET /defects/:id` route. Assign, change status and post comment are out of scope and render nothing.
scope:
  - description: |
      Types and API client. Extend `apps/web/src/lib/defects.ts` with the detail types, and add `getDefect` to `apps/web/src/lib/defects-api.ts`.

      ```ts
      // defects.ts
      export interface DefectAttachment { name: string; url: string }
      export interface DefectComment { id: string; author: string; body: string; createdAt: string }
      export interface DefectDetail extends Defect {
        description: string;
        assignee: string | null;
        attachments: DefectAttachment[];
        comments: DefectComment[];
      }

      // defects-api.ts
      export async function getDefect(id: string): Promise<DefectDetail | null>
      // 404 -> null; other non-OK or network failure -> throws Error(`GET /defects/${id} failed with status ${status}`)
      ```
      The id is passed through `encodeURIComponent`. Use `cache: "no-store"` like `getDefects`.
    files:
      - apps/web/src/lib/defects.ts
      - apps/web/src/lib/defects-api.ts
      - apps/web/tests/unit/defects-api.test.ts
    rationale: |
      A single typed fetch boundary. Returning null for 404 and throwing for everything else is what separates AC11/AC14 (not found) from AC17/AC18 (could not be loaded).
  - description: |
      Reuse the status and severity badge maps. They are currently module-private constants in `defect-row.tsx`. Export `STATUS` and `SEVERITY` (named `STATUS_BADGE` and `SEVERITY_BADGE`) from `apps/web/src/components/defects/defect-row.tsx` and import them in the new detail component. Do not duplicate them, and do not create a new badge component.
    files:
      - apps/web/src/components/defects/defect-row.tsx
    rationale: |
      The catalogue already covers status and severity rendering (defect-row). Extending it is the reuse the design system requires. The existing defect-row tests must stay green.
  - description: |
      New presentational component `DefectDetailView({ defect }: { defect: DefectDetail })`, a server component. Sketch screen `defect-detail`, success state.

      - Breadcrumbs (`crumbs`): "Defects" link to `/defects`, then the defect id.
      - `<h1>` (`defect-heading`): `${id} ${title}`.
      - `defect-status`: `badge` with the status icon, from the shared STATUS map.
      - `defect-severity-label`: `badge`, from the SEVERITY map.
      - `defect-assignee`: text "Assignee: <name>", or "Assignee: Unassigned" when null.
      - `defect-area-label`: "Area: <area>".
      - `defect-description`: paragraph.
      - `attachments`: a `<ul>` of `<a href={url} target="_blank" rel="noopener noreferrer">name</a>`, or the text "No attachments yet".
      - Comments: a section with a `<ul>` of comments (author, formatted date, body), or the text "No comments yet".
      - Back link `Link href="/defects"` labelled "Back to list" with the `chevron`/arrow Icon if one exists in `icon.tsx`. Otherwise use plain text.

      Styling uses existing classes only: `stack`, `stack-lg`, `stack-sm`, `page-head`, `badge-*`, `card`, `card-title`, `text-muted`, `text-sm`, `text-bold`, `btn btn-ghost`, and the `--space-*`, `--color-*` and `--font-size-*` tokens. Reuse the `DATE_FORMAT` pattern from defect-row. No new CSS tokens. At most a few small classes appended to `globals.css` if a list or breadcrumb style is missing.
    files:
      - apps/web/src/components/defects/defect-detail-view.tsx
      - apps/web/src/app/globals.css
      - apps/web/tests/unit/defect-detail-view.test.tsx
    rationale: |
      Keeps all rendering for ACs 1-9, 12, 13, 15 and 16 in one unit-testable component. Nothing in the catalogue renders a single defect, so this one component is new. Everything it is made of is reused.
  - description: |
      Route and states under `apps/web/src/app/defects/[id]/`, using the Next.js file conventions.

      ```tsx
      // page.tsx
      export default async function DefectDetailPage({ params }: { params: Promise<{ id: string }> }) {
        const { id } = await params;
        const defect = await getDefect(id);
        if (!defect) notFound();
        return <DefectDetailView defect={defect} />;
      }
      ```
      - `loading.tsx` (state_of loading): a skeleton placeholder using `.skeleton`, with `aria-busy` and visible "Loading…" text. It mirrors `app/defects/loading.tsx`.
      - `not-found.tsx` (state_of empty/not found): `<div role="alert" class="alert alert-warning">` reading "Defect not found" plus `Link href="/defects"` ("Back to list").
      - `error.tsx` (`"use client"`, state_of error): `<div role="alert" class="alert alert-danger">` reading "We couldn't load this defect's details." with a `Link href="/defects"`. It is persistent, with no auto-dismiss. No retry control is added, because none is specified.
    files:
      - apps/web/src/app/defects/[id]/page.tsx
      - apps/web/src/app/defects/[id]/loading.tsx
      - apps/web/src/app/defects/[id]/not-found.tsx
      - apps/web/src/app/defects/[id]/error.tsx
      - apps/web/tests/unit/defect-detail-page.test.tsx
    rationale: |
      Wires the fetcher to the view and gives each non-success state of the sketch its own file. This also finishes the list-to-detail navigation that `DefectRow` already links to (`/defects/${id}`).
  - description: |
      E2E support and specs. Extend `apps/web/tests/e2e/stub-api.mjs` with `GET /defects/:id`. The stub returns the list fixture entry plus `description`, `assignee`, `attachments` and `comments`. Special ids: `DEF-NOATT` (no assignee, no attachments, no comments), `DEF-BOOM` (500) and any unknown id (404). Add `apps/web/tests/e2e/defect-detail.spec.ts` for the browser flows: open from the list, back to list, not found, error, and the absence of action controls.
    files:
      - apps/web/tests/e2e/stub-api.mjs
      - apps/web/tests/e2e/defect-detail.spec.ts
    rationale: |
      The stub is the only Platform API available to the web app today (`services/api` has only a health route), so e2e must be served by it.
tests:
  - |
    AC1 (heading). In defect-detail-view.test.tsx:
    `render(<DefectDetailView defect={full} />); expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("DEF-101 Login fails on Safari");`
    Code: the `<h1>` in `DefectDetailView`.
  - |
    AC2 (status). `expect(screen.getByText("Open")).toBeTruthy();` for `status: "open"`. Also a `in_progress` case expecting "In progress". Code: STATUS badge.
  - |
    AC3 (severity). `expect(screen.getByText("High")).toBeTruthy();` for `severity: "high"`.
  - |
    AC4 (assignee). `expect(screen.getByText("Assignee: Dana Lee")).toBeTruthy();` for `assignee: "Dana Lee"`.
  - |
    AC5 (area). `expect(screen.getByText("Area: Login")).toBeTruthy();`
  - |
    AC6 (description). `expect(screen.getByText("Tapping Sign in does nothing on Safari 17")).toBeTruthy();`
  - |
    AC7 (attachments as links). 
    ```ts
    const link = screen.getByRole("link", { name: "screenshot.png" });
    expect(link.getAttribute("href")).toBe("https://files.test/screenshot.png");
    expect(screen.queryByText("No attachments yet")).toBeNull();
    ```
    Add a second attachment and assert both links are present.
  - |
    AC8 (comments listed). `expect(screen.getByText("Reproduced on 17.1")).toBeTruthy(); expect(screen.queryByText("No comments yet")).toBeNull();`
  - |
    AC9 (no attachments). `render(<DefectDetailView defect={{ ...full, attachments: [] }} />); expect(screen.getByText("No attachments yet")).toBeTruthy();`
  - |
    AC10 (loading). In defect-detail-page.test.tsx: `render(<Loading />); expect(screen.getByText("Loading…")).toBeTruthy();`. e2e: delay the stub response with a `?slow` hook only if needed. Otherwise the unit test is the evidence, because `loading.tsx` is Next's Suspense fallback.
  - |
    AC11 (not found). Unit: `vi.mock("@/lib/defects-api", () => ({ getDefect: async () => null }))`, then `await expect(DefectDetailPage({ params: Promise.resolve({ id: "NOPE" }) })).rejects.toThrow()` (next/navigation `notFound` throws NEXT_NOT_FOUND). In not-found.test: `render(<NotFound />); expect(screen.getByRole("alert").textContent).toContain("Defect not found");`. e2e: `await page.goto("/defects/NOPE"); await expect(page.getByText("Defect not found")).toBeVisible();`
  - |
    AC12 (back to list). Unit: `expect(screen.getByRole("link", { name: /back to list/i }).getAttribute("href")).toBe("/defects");`. e2e: `await page.getByRole("link", { name: /back to list/i }).click(); await expect(page).toHaveURL(/\/defects$/); await expect(page.getByRole("heading", { name: "Defects", level: 1 })).toBeVisible();`
  - |
    AC13 (no action controls). `expect(screen.queryByRole("button", { name: /assign|change status|post comment/i })).toBeNull(); expect(screen.queryByRole("textbox")).toBeNull();`. Repeat in e2e on the live page.
  - |
    AC14 (not-found link). `expect(within(screen.getByRole("alert")).getByRole("link").getAttribute("href")).toBe("/defects");`. Alternatively assert the link in the not-found render.
  - |
    AC15 (unassigned). `render(<DefectDetailView defect={{ ...full, assignee: null }} />); expect(screen.getByText("Assignee: Unassigned")).toBeTruthy();`
  - |
    AC16 (no comments). `render(<DefectDetailView defect={{ ...full, comments: [] }} />); expect(screen.getByText("No comments yet")).toBeTruthy();`
  - |
    AC17 (error message). `render(<ErrorBoundary error={new Error("boom")} />); expect(screen.getByRole("alert").textContent).toMatch(/couldn't load/i);`. e2e against `DEF-BOOM`: the alert stays visible after 1s with no dismissal. Also in defects-api.test.ts: `vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 })); await expect(getDefect("DEF-1")).rejects.toThrow(/500/);` and `{ ok: false, status: 404 }` resolves to null.
  - |
    AC18 (error link). `expect(within(screen.getByRole("alert")).getByRole("link").getAttribute("href")).toBe("/defects");`
  - |
    API client (defects-api.test.ts), written first alongside the types: `getDefect("DEF-1")` fetches `http://api.test/defects/DEF-1` with `API_BASE_URL` stubbed, and `getDefect("a b")` requests `/defects/a%20b`.
assumptions_or_open_questions:
  - |
    SKETCH vs AC13 conflict. The wireframe draws `assign-defect` (Assign), `change-status` (Change status), `comment-input` and `post-comment` (Post comment) on the defect-detail screen. AC13 and the scope text say none of these appear, and assign, status change and comments are separate stories. This plan follows the AC and the scope: none of those four elements is built. The wireframe's `open-change-status` exit flow (to the `change-status` screen) is therefore not implemented here. Please confirm.
  - |
    SKETCH vs AC on tabs. The sketch has `detail-tabs` (Details / Comments / History) with Details current. The ACs require comments and attachments on the one page and name no History. This plan renders a single page with a Details section and a Comments section stacked, with no tabs and no History. Please confirm that dropping the tabs is acceptable.
  - |
    The sketch's `comment-input` note ("Should comments notify the assignee?") is a design question for the comments story and is not addressed here.
  - |
    Sketch flow `back-to-list` is via `nav-defects`. The shared `AppShell` Defects nav link already goes to `/defects` and stays active on `/defects/[id]`. The plan adds an explicit "Back to list" link (AC12) plus the breadcrumb "Defects" link, and both go to `/defects`.
  - |
    API contract assumed: `GET /defects/:id` returns 200 with `{ id, title, status, severity, area, reportedAt, description, assignee, attachments: [{name, url}], comments: [{id, author, body, createdAt}] }`, where `assignee` is a string or null. It returns 404 for an unknown id. `services/api` currently has only a health route (not even `GET /defects`), so the endpoint does not exist yet. The web app is built and tested against the e2e stub, as the list story did. Please confirm the field names, or point me to the API story that defines them.
  - |
    Attachment url is assumed to be directly openable or downloadable (for example a presigned S3 URL). It opens in a new tab with `rel="noopener noreferrer"`. No `download` attribute is set because the files may be cross-origin.
  - |
    The 'persistent error message' is satisfied by Next's `error.tsx` boundary rendering a non-dismissing alert. There is no retry button, because none is in the ACs.
estimated_points: 3
package_dependencies: []
notes: |
  Existing patterns mirrored: `app/defects/page.tsx` (server component fetching via `defects-api.ts`), `app/defects/loading.tsx` (skeleton loading), and the badge maps in `defect-row.tsx`. Unit tests follow `tests/unit/defects-page.test.tsx` (mock `@/lib/defects-api`, render the awaited server component). `AppShell` is untouched. It wraps every route via `layout.tsx` and provides the header and nav from the sketch.

  Design-system mapping for the sketch screen `defect-detail`: header/main-nav = AppShell (existing); crumbs, defect-heading, defect-status, defect-severity-label, defect-assignee, defect-area-label, defect-description, attachments and the comments list = new `DefectDetailView` built from `.page-head`, `.stack*`, `.badge-*` (via the shared maps), `.card`, `.text-muted` and `Icon`; the loading, error and not-found states = `.skeleton`, `.alert-danger` and `.alert-warning`.

  ```mermaid
  flowchart TD
    layout[app/layout.tsx] --> shell[components/app-shell.tsx]
    list[app/defects/page.tsx] -->|row link /defects/id| route[app/defects/id/page.tsx]
    route -->|getDefect id| api[lib/defects-api.ts]
    api --> types[lib/defects.ts]
    route --> view[components/defects/defect-detail-view.tsx]
    view -->|reuse STATUS and SEVERITY maps| row[components/defects/defect-row.tsx]
    route -.-> states[loading / not-found / error.tsx]
    e2e[tests/e2e/stub-api.mjs] -->|serves GET /defects/id| api
    classDef touched fill:#f96,color:#000
    class route,api,types,view,row,states,e2e touched
  ```
review_focus: |
  IN scope is the read-only `/defects/[id]` page and its loading, not-found and error states, the `getDefect` client and the e2e stub route. OUT of scope are assign, status change, posting comments, tabs/History and any `services/api` endpoint. The deliberate deviation from the wireframe is that the Assign, Change status and comment-input/Post comment controls are NOT built, because AC13 forbids them; please don't flag that as missing design. The riskiest parts are separating 404 (null, then `notFound()`) from other failures (thrown, then `error.tsx`), and keeping the `defect-row` badge-map export from changing the list's behaviour.
