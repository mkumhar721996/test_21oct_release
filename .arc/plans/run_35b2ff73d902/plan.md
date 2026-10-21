summary: |
  Add a "post a comment" form to the existing defect detail page (`DefectDetailView`, built in STORY-018). A signed-in person types in a labelled textarea and presses "Post comment"; a Next.js server action calls the Platform API (`POST /defects/:id/comments`), and on success the new comment is appended to the page's existing Comments list and the input is cleared. On failure a persistent `.alert.alert-danger` sits next to the submit button, the typed text stays in the textarea, the list is not changed, and no other defect field is touched. No edit/delete controls and no notification code are added. Work is test-first (vitest unit + Playwright e2e against the stub API), all in `apps/web`.
scope:
  - description: |
      Add the API client call for posting a comment. Signature:

      ```ts
      export async function postComment(id: string, body: string): Promise<DefectComment>
      ```

      `POST ${API_BASE_URL || "http://localhost:3001"}/defects/${encodeURIComponent(id)}/comments`, JSON body `{ body }`, `cache: "no-store"`. Wraps network errors like `getDefect` does (`new Error("POST /defects/:id/comments failed", { cause })`) and throws on any non-OK status (message includes the status). Returns the created `DefectComment` (id, author, body, createdAt) from the response JSON.
    files:
      - apps/web/src/lib/defects-api.ts
      - apps/web/tests/unit/defects-api.test.ts
    rationale: |
      Mirrors `getDefect`; keeps all Platform API calls in one module. Reuses the existing `DefectComment` type from `lib/defects.ts`, so no type changes are needed.
  - description: |
      Add a server action so the browser never needs `API_BASE_URL` (a server-only env var). Result type is a discriminated union so the client never sees a thrown error:

      ```ts
      "use server";
      export type PostCommentResult =
        | { ok: true; comment: DefectComment }
        | { ok: false };
      export async function postCommentAction(id: string, body: string): Promise<PostCommentResult>
      ```

      Trims `body`; empty/whitespace-only returns `{ ok: false }` without calling the API (the form also blocks this client-side). Catches any error from `postComment` and returns `{ ok: false }`. It only calls the one comments endpoint, so it cannot change status, severity, assignee or area (AC 5), and it sends nothing else anywhere (AC 7).
    files:
      - apps/web/src/app/defects/[id]/actions.ts
      - apps/web/tests/unit/post-comment-action.test.ts
    rationale: |
      Next.js App Router idiom for a mutation from a client component; `page.tsx` is already a server component that reads `API_BASE_URL` the same way.
  - description: |
      New client component `CommentSection` (the existing `DefectDetailView` is a server component and cannot hold form state, so the Comments card is extracted into this one client component; no existing catalogue component covers a stateful form). Props:

      ```ts
      export function CommentSection({ defectId, initialComments }: { defectId: string; initialComments: DefectComment[] })
      ```

      Behaviour:
      - Keeps `comments` in `useState(initialComments)`.
      - Renders the existing `section.card` / `h2#comments-title` / list markup moved verbatim from `DefectDetailView` (author, `DATE_FORMAT` date, body; "No comments yet" empty state), followed by the form.
      - Form is a `.stack stack-sm`: `.field` with a `<label>` "Add a comment" (the sketch's placeholder is also "Add a comment"), a `.textarea` with `aria-describedby` pointing at the error/hint, then a `.btn.btn-secondary` "Post comment" (secondary per the sketch; the page's primary action stays "Change status", from a later story).
      - Submit: disable the button and set `aria-busy` while pending (label "Posting…"); call `postCommentAction`. On `ok`, append `comment` to the end of the list (oldest first, matching the existing order), clear the textarea, clear any error, return focus to the textarea. On `!ok`, show `<div role="alert" className="alert alert-danger">` directly beside/under the button with the text "We couldn't post your comment. Your text is still here — check your connection and try again." plus `.is-invalid` on the textarea. Do NOT clear the text, do NOT touch `comments`. The alert has no timer and no close button (persistent); it is removed only by a new submit attempt or a successful post.
      - Empty/whitespace-only submit: no request; show `.field-error` "Write a comment before posting." on the field.
      - No edit/delete controls are rendered on any comment (AC 6); no notification code of any kind (AC 7).
    files:
      - apps/web/src/components/defects/comment-section.tsx
      - apps/web/tests/unit/comment-section.test.tsx
    rationale: |
      Builds the sketch's `comment-input` (input, placeholder "Add a comment") and `post-comment` (button, "Post comment", secondary) elements, and the sketch's missing states (pending, error, success) per the project-wide failure behaviour. Styled only with design-system classes and tokens: `.card`, `.card-title`, `.stack`/`.stack-sm`, `.field`, `.field-error`, `.textarea`, `.is-invalid`, `.btn.btn-secondary`, `.alert.alert-danger`, `.text-sm`, `.text-muted`, `.text-bold` (all verified present in `globals.css`), no ad-hoc margins. Phone-first single column; the button is full-width-capable via the existing `.btn`, no new breakpoint.
  - description: |
      Replace the inline Comments `<section>` in `DefectDetailView` with `<CommentSection defectId={defect.id} initialComments={defect.comments} />`. The server page still renders `DefectDetailView` unchanged, so status badge, severity, assignee and area are server-rendered from the fetched defect and are never re-derived by the post (AC 5). Update the stale test "has no assign, status or comment controls" so it no longer forbids the comment textbox/button but still forbids assign and change-status controls.
    files:
      - apps/web/src/components/defects/defect-detail-view.tsx
      - apps/web/tests/unit/defect-detail-view.test.tsx
    rationale: |
      Minimal edit to the existing component (reuse before new). Keeps the ARIA structure (`aria-labelledby="comments-title"`) that existing tests rely on.
  - description: |
      Extend the stub Platform API with `POST /defects/:id/comments`:
      - Appends `{ id, author: "Sam", body, createdAt }` to a per-defect in-memory list (also returned by the existing `GET /defects/:id` after the first post), returns 201 with the comment JSON.
      - Failure trigger: `DEF-NOCOMMENT` (like `DEF-BOOM`) returns 500 for a POST, so the failure path is reproducible; the `/__seed/:n` reset also clears posted comments.
      Add the Playwright spec cases (see tests).
    files:
      - apps/web/tests/e2e/stub-api.mjs
      - apps/web/tests/e2e/defect-detail.spec.ts
    rationale: |
      The real Platform API has no defects endpoints in this repo yet (only `health`), so e2e runs against this stub, as STORY-014/018 did. Also the existing e2e assertion `getByRole("textbox")).toHaveCount(0)` and the `post comment` button regex in the first test become wrong and must be updated to keep assign/change-status absent only.
tests:
  - |
    AC 1 — unit (`comment-section.test.tsx`): posting adds the comment to the list.
    ```tsx
    vi.mocked(postCommentAction).mockResolvedValue({ ok: true, comment: { id: "c2", author: "Sam", body: "Fixed in 17.2", createdAt: "2026-10-03T09:00:00Z" } });
    render(<CommentSection defectId="DEF-101" initialComments={[c1]} />);
    await user.type(screen.getByLabelText("Add a comment"), "Fixed in 17.2");
    await user.click(screen.getByRole("button", { name: "Post comment" }));
    expect(await screen.findByText("Fixed in 17.2")).toBeTruthy();
    expect(screen.getByText("Reproduced on 17.1")).toBeTruthy();
    expect((screen.getByLabelText("Add a comment") as HTMLTextAreaElement).value).toBe("");
    expect(postCommentAction).toHaveBeenCalledWith("DEF-101", "Fixed in 17.2");
    ```
    Also: "No comments yet" disappears when the first comment is posted on an empty list. Plus API-client tests (`defects-api.test.ts`):
    ```ts
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/defects/DEF-1/comments");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST", body: JSON.stringify({ body: "hi" }) });
    await expect(postComment("DEF-1", "hi")).rejects.toThrow(/500/);
    ```
    and action tests: `expect(await postCommentAction("DEF-1", "  ")).toEqual({ ok: false })` with `postComment` not called; `postComment` rejecting yields `{ ok: false }`. Playwright: type, click "Post comment", `await expect(page.getByText("Looks fixed on my side")).toBeVisible()`.
  - |
    AC 2 — unit: failure shows a persistent inline alert next to the submit action that says what happened and what to do.
    ```tsx
    vi.mocked(postCommentAction).mockResolvedValue({ ok: false });
    // type "Needs a retry", click Post comment
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/couldn't post your comment/i);
    expect(alert.textContent).toMatch(/try again/i);
    expect(alert.className).toContain("alert-danger");
    expect(alert.closest("form")).toBe(screen.getByRole("button", { name: "Post comment" }).closest("form"));
    ```
    Playwright (`DEF-NOCOMMENT`): alert visible, `await page.waitForTimeout(1000)`, still visible (persistent, same pattern as the load-failure test).
  - |
    AC 3 — unit: typed text retained after failure.
    ```tsx
    expect((screen.getByLabelText("Add a comment") as HTMLTextAreaElement).value).toBe("Needs a retry");
    ```
    Playwright: `await expect(page.getByLabel("Add a comment")).toHaveValue("Needs a retry")` after the failure alert shows.
  - |
    AC 4 — unit: failed comment not in list.
    ```tsx
    expect(within(screen.getByRole("list")).queryByText("Needs a retry")).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    ```
    (the textarea value is not list content, so the text must not appear as `<p>` in the list.) Playwright: `await expect(page.getByRole("list").getByText("Needs a retry")).toHaveCount(0)`, and after `page.reload()` the comment is still absent.
  - |
    AC 5 — Playwright (stub) plus unit on the view: record status badge, severity badge, assignee and area text before the failed post, and assert identical after.
    ```ts
    const before = await page.locator("[data-testid='defect-meta']").innerText();
    // fail a post on DEF-NOCOMMENT
    await expect(page.locator("[data-testid='defect-meta']")).toHaveText(before);
    ```
    Implementation note: if no stable locator exists, assert the four literal strings (`Open`, `High`, `Assignee: Dana Lee`, `Area: Login`) are unchanged instead of adding a test id. Unit: `postCommentAction` mock called with only `(defectId, body)` and `fetch` called exactly once with a `/comments` URL (`expect(fetchMock).toHaveBeenCalledTimes(1)`), so no PATCH/PUT to the defect is possible.
  - |
    AC 6 — unit + e2e: no edit/delete controls on posted comments.
    ```tsx
    expect(screen.queryByRole("button", { name: /edit|delete|remove/i })).toBeNull();
    // and after a successful post, within the list:
    expect(within(screen.getByRole("list")).queryAllByRole("button")).toHaveLength(0);
    ```
    Playwright: same assertions on the list after a successful post and after reload. Also updated `defect-detail-view.test.tsx`: still `expect(screen.queryByRole("button", { name: /assign|change status/i })).toBeNull()`.
  - |
    AC 7 — unit: the only outbound calls on success are the single comment POST.
    ```ts
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/defects/DEF-1/comments");
    ```
    Static guard: `postComment`/`postCommentAction` contain no notify/email/webhook call (reviewed in code review; no notification module is added or imported). Playwright: the stub records every request; after a successful post it has received exactly `POST /defects/:id/comments` and nothing to a notification path.
  - |
    Supporting unit tests — empty/whitespace submit sends no request and shows the field error; button disabled and `aria-busy="true"` while pending; successful post after a failed one removes the alert.
    ```tsx
    await user.click(screen.getByRole("button", { name: "Post comment" }));
    expect(postCommentAction).not.toHaveBeenCalled();
    expect(screen.getByText("Write a comment before posting.")).toBeTruthy();
    ```
assumptions_or_open_questions:
  - |
    **Platform API is not built.** `services/api/src` contains only `health.controller.ts`; there is no defects module, so `GET /defects` and `GET /defects/:id` also exist only in the e2e stub. This plan adds the web side and the stub only and assumes the contract `POST /defects/:id/comments` with body `{ body: string }` returning 201 and `{ id, author, body, createdAt }`, with the author taken from the signed-in session on the server. Do you want a NestJS comments endpoint (controller, service, Postgres table, supertest e2e) in this item? It would raise the estimate to about 8.
  - |
    **No sign-in exists in the web app.** No auth or session code was found, so "any signed-in person" is treated as "anyone who can reach the page"; the form is always shown and the API is assumed to attribute the author. Gating the form on a session would belong to whichever story introduces sign-in. Please confirm.
  - |
    **Sketch vs. AC conflict:** the sketch carries the note "Should comments notify the assignee?" on `comment-input`. AC 7 and the scope ("No notifications") say no. The plan follows the AC and builds no notification.
  - |
    **Sketch vs. built page:** the sketch shows `detail-tabs` (Details / Comments / History) with the input under Details, but the built STORY-018 page has no tabs and a dedicated Comments card. The plan puts the input in that existing Comments card, directly under the list, rather than adding tabs (tabs, Assign and Change status belong to other stories). `post-comment` is `.btn-secondary` as in the sketch.
  - |
    New comments are appended at the end of the list (the existing order is oldest first) and are held in client state; a page reload re-reads the list from the API. I treat a 2xx from the API as the only success; every other outcome, including a network error, is the same inline failure.
  - |
    Failure message copy is my proposal ("We couldn't post your comment. Your text is still here — check your connection and try again."), following the voice guideline of saying what happened and what to do next without blame. Maximum comment length is not specified, so none is enforced.
estimated_points: 5
package_dependencies: []
notes: |
  Layering: the server-rendered page reads the defect; the only client-side state is the Comments card, which mutates through a server action. Status/severity/assignee/area stay in the server-rendered part of the view, which is why AC 5 holds structurally.

  ```mermaid
  flowchart TD
    Page["app/defects/[id]/page.tsx"] --> View["defect-detail-view.tsx"]
    View -->|"swap inline comments section for client component"| Section["comment-section.tsx (new)"]
    Section -->|"submit"| Action["app/defects/[id]/actions.ts (new)"]
    Action -->|"POST /defects/:id/comments"| Api["lib/defects-api.ts postComment"]
    Api --> Stub["tests/e2e/stub-api.mjs"]
    View --> Row["defect-row.tsx DATE_FORMAT, badges"]
    classDef touched fill:#f96,color:#000
    class View,Section,Action,Api,Stub touched
  ```

  Dependencies: none. React 19 `useState` and `useTransition` or a manual pending flag are enough; no form library. `@testing-library/user-event` is used by the new unit tests only if already in `apps/web/package.json`; otherwise use `fireEvent` from `@testing-library/react` (already used) instead of adding a package.

  Verification commands: `pnpm --filter ./apps/web test` (vitest) and `pnpm --filter ./apps/web test:e2e` (Playwright against `stub-api.mjs`); confirm the exact script names in `apps/web/package.json` before running.
review_focus: |
  IN: web-only change (client call, server action, comment form in the existing Comments card, stub API and tests). OUT: the NestJS comments endpoint and persistence (there is no defects API in the repo, see the open question), auth/sign-in gating, tabs, Assign/Change status, comment edit/delete, and notifications. The riskiest part is the failure path: on a failed post the textarea value must survive and the list must stay unchanged, and the alert must stay until the next attempt. The sketch's "notify the assignee?" note and its tabs deliberately lose to AC 7 and the built page, as the plan explains.
