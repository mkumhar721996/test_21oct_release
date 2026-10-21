summary: |
  Add a "post a comment" form to the existing Comments card on the defect detail page (`apps/web`). A new client component, `CommentsSection`, owns the comments list, the comment input, the "Post comment" button and the failure alert. It posts through a Next server action, which calls a new `postDefectComment` in `defects-api.ts` (`POST {API_BASE_URL}/defects/:id/comments`). On success the returned comment is appended to the list and the input is cleared. On failure a persistent `.alert.alert-danger` appears next to the button, the typed text stays in the input, the list is not touched, and the page makes no other request. No edit, delete or notification code is added. Work is test-first: vitest and Testing Library for the unit layer, Playwright against the extended stub Platform API for the e2e layer.
scope:
  - description: |
      Add the types for the post result, next to `DefectComment`.

      ```ts
      export type PostCommentResult =
        | { ok: true; comment: DefectComment }
        | { ok: false };
      ```
    files:
      - apps/web/src/lib/defects.ts
    rationale: |
      `defects.ts` already holds `DefectComment` and `DefectDetail`. The server action returns a plain serialisable result and never throws across the client boundary.
  - description: |
      Add the API client call, in the same style as `getDefect` (base URL from `API_BASE_URL`, default `http://localhost:3001`, a network failure wrapped with `cause`, a non-OK status throws).

      ```ts
      export async function postDefectComment(id: string, body: string): Promise<DefectComment>
      // POST ${base}/defects/${encodeURIComponent(id)}/comments
      // headers: { "content-type": "application/json" }, body: JSON.stringify({ body }), cache: "no-store"
      // returns the created comment { id, author, body, createdAt }
      ```

      It sends only `{ body }`. The author comes from the API's own idea of the current person (see open questions). It makes exactly one request and nothing else (AC 7).
    files:
      - apps/web/src/lib/defects-api.ts
    rationale: |
      The web app only reaches the Platform API from server code, because `API_BASE_URL` is a server-side env var. This keeps that convention.
  - description: |
      New server action, wrapping the client call and turning any throw into `{ ok: false }`.

      ```ts
      "use server";
      export async function postComment(defectId: string, body: string): Promise<PostCommentResult>
      ```

      It trims the body and returns `{ ok: false }` for an empty one, without calling the API. It does not call `revalidatePath` or `router.refresh`. This is deliberate: the defect's status, severity, assignee and area must not be re-read or changed by a failed post (AC 5), and the success path appends locally.
    files:
      - apps/web/src/app/defects/[id]/actions.ts
    rationale: |
      A server action lets the browser post without exposing `API_BASE_URL` or adding a Next route handler. The server-side-only call matches how `getDefect` is used from `page.tsx`.
  - description: |
      New client component `CommentsSection` that replaces the inline Comments card in `DefectDetailView`. Props: `{ defectId: string; initialComments: DefectComment[] }`.

      Sketch screens and states it builds, from `defect-detail`:
      - `comment-input` ("Add a comment") is a `.field` with a visible `<label>` and a `.input`, wired to the failure message with `aria-describedby`.
      - `post-comment` ("Post comment") is `.btn.btn-secondary`, because the sketch says `variant: secondary` and the one `.btn-primary` ("Change status") belongs to a later story.
      - Pending: the button is disabled and reads "Posting…", and the input keeps its text.
      - Success: the comment is appended to the end of the existing `ul.stack.stack-sm` list in the existing `<li>` markup (author, `DATE_FORMAT` date, body). "No comments yet" goes away, and the input is cleared with focus left in it.
      - Failure: `div.alert.alert-danger[role=alert]` with the `.fail-body` / `.text` layout and `<Icon name="alert" />`, placed directly under the button inside the form, the same markup `LoadFailure` uses. It stays until the next submit or until the person edits the text. Copy: **We couldn't post your comment.** "Your text is still here. Check your connection and try again." The input keeps its value and the list is unchanged.
      - Empty submit: the input gets `.is-invalid` and `.field-error` reads "Write a comment before posting.", with no API call.

      The component uses the `space-*` tokens through `.stack`, keeps the phone-first single column, and adds no ad-hoc margins or new CSS. The existing list markup and `.card` shell stay as they are, so `DefectDetailView` keeps its reuse.
    files:
      - apps/web/src/components/defects/comments-section.tsx
    rationale: |
      The list and the form need shared client state (append on success). No catalogue component covers a form, so this is a new component. It reuses `Icon`, the `.field`, `.alert` and `.card` classes and the `DATE_FORMAT` export from `defect-row`.
  - description: |
      Replace the inline Comments `<section>` with `<CommentsSection defectId={defect.id} initialComments={defect.comments} />`. Everything else in `DefectDetailView` (heading, badges, assignee, area, description, attachments, back link) is unchanged. `DefectDetailView` stays a server component.
    files:
      - apps/web/src/components/defects/defect-detail-view.tsx
    rationale: |
      The existing component is where the sketch's Comments content lives. This is an extension, not a new screen.
  - description: |
      Extend the stub Platform API so e2e can post and fail.
      - `POST /defects/:id/comments` returns 201 with `{ id, author: "You", body, createdAt }` and keeps it in memory, so a reload shows it. It returns 404 for an unknown id.
      - `POST /__fail/comments/on|off` makes that route answer 500. `/__seed/:n` resets it and the in-memory comments.
      - `GET /__writes` returns the list of non-GET requests the stub received, so e2e can assert nothing but the comment POST happened (AC 7).
      - `GET /defects/:id` merges the in-memory comments into `comments`.

      In `fixtures.ts` add:

      ```ts
      export async function setCommentPostFailing(request: APIRequest, on: boolean)
      export async function getWrites(request: APIRequest): Promise<{ method: string; url: string }[]>
      ```
    files:
      - apps/web/tests/e2e/stub-api.mjs
      - apps/web/tests/e2e/fixtures.ts
    rationale: |
      The real Platform API (`services/api`) only has a health endpoint today. The e2e suite already runs against this stub.
  - description: |
      Tests, written first (see `tests`). The unit tests are in `comments-section.test.tsx`, `defects-api.test.ts`, `actions.test.ts` and `defect-detail-view.test.tsx`. The e2e tests are in `defect-comments.spec.ts` and `defect-detail.spec.ts`. Two existing assertions that say "no textbox / no post comment button" must change, because this story deliberately adds them.
    files:
      - apps/web/tests/unit/comments-section.test.tsx
      - apps/web/tests/unit/defects-api.test.ts
      - apps/web/tests/unit/actions.test.ts
      - apps/web/tests/unit/defect-detail-view.test.tsx
      - apps/web/tests/e2e/defect-comments.spec.ts
      - apps/web/tests/e2e/defect-detail.spec.ts
    rationale: |
      TDD order: write the red tests, then the client call, the action, the component and the stub until they go green.
tests:
  - |
    AC 1 (a signed-in person posts and the comment appears). `apps/web/tests/unit/comments-section.test.tsx`, with `vi.mock("@/app/defects/[id]/actions", () => ({ postComment: vi.fn() }))`.

    ```tsx
    postComment.mockResolvedValue({ ok: true, comment: { id: "c2", author: "You", body: "Me too on 17.2", createdAt: "2026-10-21T09:00:00Z" } });
    render(<CommentsSection defectId="DEF-101" initialComments={[first]} />);
    await user.type(screen.getByLabelText("Add a comment"), "Me too on 17.2");
    await user.click(screen.getByRole("button", { name: "Post comment" }));
    expect(await screen.findByText("Me too on 17.2")).toBeTruthy();
    expect(screen.getByText("Reproduced on 17.1")).toBeTruthy();
    expect(postComment).toHaveBeenCalledWith("DEF-101", "Me too on 17.2");
    expect((screen.getByLabelText("Add a comment") as HTMLInputElement).value).toBe("");
    ```

    Also: with `initialComments={[]}`, `"No comments yet"` disappears after a successful post. Client call, `defects-api.test.ts`:

    ```ts
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "c2" }) });
    await postDefectComment("DEF-1", "hi");
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/defects/DEF-1/comments");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST", body: JSON.stringify({ body: "hi" }) });
    ```

    e2e, `defect-comments.spec.ts`: open `/defects/DEF-101`, fill "Add a comment", click "Post comment", `await expect(page.getByText("Looks fixed in 17.2")).toBeVisible()`, reload, and it is still there.
  - |
    AC 2 (persistent inline failure message next to the submit action). `comments-section.test.tsx`:

    ```tsx
    postComment.mockResolvedValue({ ok: false });
    // type "Draft text", click "Post comment"
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/couldn't post your comment/i);
    expect(alert.textContent).toMatch(/try again/i);
    expect(screen.getByRole("button", { name: "Post comment" }).closest("form")).toBe(alert.closest("form"));
    vi.advanceTimersByTime(10_000);
    expect(screen.getByRole("alert")).toBeTruthy();
    ```

    Also `actions.test.ts`: when `postDefectComment` rejects, `await expect(postComment("DEF-1", "x")).resolves.toEqual({ ok: false })`, and an empty body returns `{ ok: false }` with no API call. e2e: `setCommentPostFailing(request, true)`, post, `const alert = page.getByRole("alert").filter({ hasText: /couldn't post your comment/i }); await expect(alert).toBeVisible(); await page.waitForTimeout(1000); await expect(alert).toBeVisible();`.
  - |
    AC 3 (typed text kept on failure). `comments-section.test.tsx`:

    ```tsx
    postComment.mockResolvedValue({ ok: false });
    await user.type(screen.getByLabelText("Add a comment"), "Draft text");
    await user.click(screen.getByRole("button", { name: "Post comment" }));
    await screen.findByRole("alert");
    expect((screen.getByLabelText("Add a comment") as HTMLInputElement).value).toBe("Draft text");
    expect((screen.getByRole("button", { name: "Post comment" }) as HTMLButtonElement).disabled).toBe(false);
    ```

    e2e: `await expect(page.getByLabel("Add a comment")).toHaveValue("Draft text")`.
  - |
    AC 4 (failed comment not in the list). `comments-section.test.tsx`:

    ```tsx
    expect(screen.queryByText("Draft text", { selector: "p" })).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    ```

    e2e: after the failed post, `await expect(page.locator("#comments-title ~ ul li")).toHaveCount(1)`, then reload with the failure switched off and the list still has one item, because the stub never stored it.
  - |
    AC 5 (status, severity, assignee and area unchanged after a failed post). `defect-detail-view.test.tsx`, rendering the full `DefectDetailView` with the action mocked to `{ ok: false }`:

    ```tsx
    const before = ["Open", "High", "Assignee: Dana Lee", "Area: Login"].map((t) => screen.getByText(t).textContent);
    // type and click Post comment, await the alert
    const after = ["Open", "High", "Assignee: Dana Lee", "Area: Login"].map((t) => screen.getByText(t).textContent);
    expect(after).toEqual(before);
    ```

    e2e: read the four values before and after the failed post and assert they are equal. Also `expect(await getWrites(request)).toEqual([{ method: "POST", url: "/defects/DEF-101/comments" }])`, so the failed post changed nothing else.
  - |
    AC 6 (no edit or delete control on a comment). `comments-section.test.tsx` and `defect-detail-view.test.tsx`, both before and after a successful post:

    ```tsx
    expect(screen.queryByRole("button", { name: /edit|delete|remove/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /edit|delete|remove/i })).toBeNull();
    expect(within(screen.getAllByRole("listitem").at(-1)!).queryByRole("button")).toBeNull();
    ```

    The existing "has no assign, status or comment controls" test narrows to `/assign|change status/i` for buttons, and its "no textbox" assertion is replaced by `expect(screen.getAllByRole("textbox")).toHaveLength(1)`. The same change is made in the e2e test `defect-detail.spec.ts` (the `getByRole("textbox")` count becomes 1 and "post comment" is removed from the no-buttons regex).
  - |
    AC 7 (no notification on success). `defects-api.test.ts`:

    ```ts
    await postDefectComment("DEF-1", "hi");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/defects\/DEF-1\/comments$/);
    ```

    e2e, after a successful post:

    ```ts
    expect(await getWrites(request)).toEqual([{ method: "POST", url: "/defects/DEF-101/comments" }]);
    ```

    The web app has no notification code at all (a grep for `notif` in `apps/web/src` stays empty), so the proof is that the post is the only write the browser causes. Whether the Platform API notifies is checked in its own story.
assumptions_or_open_questions:
  - |
    **The Platform API has no defect endpoints yet.** `services/api/src` holds only `health.controller.ts`. The web app already reads defects from a stub in `apps/web/tests/e2e/stub-api.mjs`. This plan assumes the contract `POST /defects/:id/comments` with request `{ body: string }` and response 201 `{ id, author, body, createdAt }`, and builds only the web side plus the stub. Real persistence is outside this plan unless the reviewer says otherwise.
  - |
    **"Signed-in person".** The repo has no sign-in or session code (`apps/web/src` has no auth). I treat "signed in" as "can reach the page" and let the API decide the author. The web app sends no identity and shows no sign-in gate. If sign-in is built elsewhere, it will need to pass credentials to the API call.
  - |
    **Sketch vs the page as built.** The sketch shows tabs (Details / Comments / History), Assign and Change status buttons and a Reports nav item. The page built in STORY-018 has none of these: it is a single column with an Attachments card and a Comments card. This plan keeps the built layout and puts the form in the Comments card, and builds no tabs, Assign, Change status or History (other stories). The sketch's `comment-input` and `post-comment` are built as drawn.
  - |
    **Single-line input.** The sketch draws `comment-input` as `kind: input`, so I use `.input`, not `.textarea`. Defect comments are often several lines, so the reviewer may prefer `.textarea` (also in the design system). It is a one-element swap and does not change any test except the cast type.
  - |
    **Notification note in the sketch.** The sketch says "Should comments notify the assignee?". The story scope and AC 7 say no notifications, so this plan treats that as answered: no.
  - |
    New comments are appended at the end of the list, matching the oldest-first order of the existing seeded comment. The sketch does not fix the order.
  - |
    Failure copy: "We couldn't post your comment. Your text is still here. Check your connection and try again." One message covers every failure kind (network, 4xx, 5xx), because AC 2 only asks what happened and what to do next.
estimated_points: 3
package_dependencies: []
notes: |
  Everything stays in `apps/web` plus the e2e stub. No new npm package is needed: `@testing-library/react`, vitest and Playwright are already present. `@testing-library/user-event` is **not confirmed** to be installed. If it is not, the unit tests use `fireEvent.change` and `fireEvent.click` instead, so no dependency is added.

  The server action keeps `API_BASE_URL` on the server. The client component never calls `fetch` itself, so the unit tests can mock the action with `vi.mock`.

  ```mermaid
  flowchart TD
    Page["app/defects/[id]/page.tsx"] -->|getDefect| Api["lib/defects-api.ts"]
    Page --> View["defect-detail-view.tsx"]
    View --> Section["comments-section.tsx (new, client)"]
    Section -->|"postComment()"| Action["app/defects/[id]/actions.ts (new, server action)"]
    Action -->|"postDefectComment()"| Api
    Section --> Icon["components/icon.tsx"]
    Section --> Row["defects/defect-row.tsx (DATE_FORMAT)"]
    Api -->|"POST /defects/:id/comments"| Stub["tests/e2e/stub-api.mjs"]
    Types["lib/defects.ts"] --> Action
    classDef touched fill:#f96,color:#000
    class View,Section,Action,Api,Stub,Types touched
  ```

  Touched nodes (orange): `defect-detail-view` swaps its inline card for the new section, `comments-section` and `actions` are new, `defects-api` gains the POST, `defects.ts` gains the result type, and the stub gains the endpoint the e2e tests need.
review_focus: |
  IN: the web side of posting a comment (form, success append, persistent failure alert with text kept, no edit/delete, no notification code) and the e2e stub endpoint. OUT: real Platform API endpoints and persistence, sign-in, tabs, Assign, Change status and History. The riskiest part is the client/server-action boundary and keeping failure from touching anything else on the page, so there is deliberately no `router.refresh` or `revalidatePath` in the post path. Deliberate choices: the Post comment button is `.btn-secondary` per the sketch, and the input is a single-line `.input` as the sketch draws it.
