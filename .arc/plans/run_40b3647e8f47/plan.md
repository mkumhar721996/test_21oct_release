summary: |
  Build the "Report a defect" flow end to end. The web app gets a `/defects/new` page (the sketch's `new-defect` screen and its `new-defect-error` state) with Title, Severity, Area, Steps to reproduce and an Attach file control, a missing-title error beside the title, an attachment-failure error beside Attach file, Submit (redirects to `/defects/{id}`) and Cancel (back to `/defects`). The Platform API gets the creation side the parent epic assigns to this item: `POST /defects` (stores the record with the signed-in person as reporter) and `POST /defects/attachments` (validates and stores one file in object storage, answering a clear 4xx/5xx the form can show). Tests come first at every layer: vitest for logic and components, supertest for the API, Playwright against the existing stub API for the browser flows.
scope:
  - description: |
      API: defect creation. `POST /defects` with JSON `{ title, severity, area, steps, attachmentId? }`.
      The reporter is taken from the trusted `x-user-id` request header, never from the body; a missing header gives 401, a blank title gives 400 `{ field: "title" }`. Persists through a repository on the existing `pg` dependency.
      ```ts
      // defects.service.ts
      export interface NewDefect { title: string; severity: DefectSeverity; area: string; steps: string; attachmentId?: string }
      create(input: NewDefect, reporterId: string): Promise<Defect>   // Defect gains reporterId: string
      ```
    files:
      - services/api/src/defects/defects.module.ts
      - services/api/src/defects/defects.controller.ts
      - services/api/src/defects/defects.service.ts
      - services/api/src/defects/defects.repository.ts
      - services/api/src/defects/defects.controller.spec.ts
      - services/api/src/defects/defects.service.spec.ts
      - services/api/src/app.module.ts
      - services/api/db/migrations/001_defects.sql
      - services/api/test/defects.e2e-spec.ts
    rationale: |
      Epic says this item owns the creation of the defect record; today the API only has a health controller. AC 1 needs a real reporter on the stored record.
  - description: |
      API: attachment upload. `POST /defects/attachments` (multipart, field `file`) validates size and type, stores it through an `AttachmentStore` port, and returns `{ attachmentId, name }`. Rejections return 413/415 with a plain message ("That file is too large. Choose one under 10 MB."); a store failure returns 502 ("We could not upload that file. Try again or submit without it."). The S3 adapter implements the port; tests use a fake store.
      ```ts
      export interface AttachmentStore { put(key: string, body: Buffer, contentType: string): Promise<void> }
      ```
    files:
      - services/api/src/defects/attachments.controller.ts
      - services/api/src/defects/attachment-store.ts
      - services/api/src/defects/s3-attachment-store.ts
      - services/api/src/defects/attachments.controller.spec.ts
    rationale: |
      AC 7-10 need both a "rejected" and a "failed to upload" outcome with an explanatory message. Object storage is Amazon S3 per the stack.
  - description: |
      Web: data layer. Add `createDefect` and `uploadAttachment` to the API client, a `validateNewDefect` helper, and `getCurrentUserId()` (the sign-in seam used to forward `x-user-id`). Extend the stub Platform API with `POST /defects` (returns `{ id: "DEF-NEW-n" }`, records the `x-user-id` header and exposes it at `GET /__last-created`), `POST /defects/attachments` (rejects names ending `.exe` with 415, fails with 502 when the name contains `fail`) and fixture helpers.
      ```ts
      // lib/defects.ts
      export type NewDefectInput = { title: string; severity: DefectSeverity; area: string; steps: string; attachmentId?: string }
      export function validateNewDefect(input: Pick<NewDefectInput, "title">): { title?: string }   // "Enter a title for the defect."
      // lib/defects-api.ts
      export async function createDefect(input: NewDefectInput, reporterId: string): Promise<{ id: string }>
      export async function uploadAttachment(file: File, reporterId: string): Promise<{ attachmentId: string; name: string }>
      ```
    files:
      - apps/web/src/lib/defects.ts
      - apps/web/src/lib/defects-api.ts
      - apps/web/src/lib/session.ts
      - apps/web/tests/e2e/stub-api.mjs
      - apps/web/tests/e2e/fixtures.ts
    rationale: |
      Keeps fetch and validation out of the component so each AC is unit-testable; extends the existing client rather than adding a second one.
  - description: |
      Web: server action and upload route. `createDefectAction(prev, formData)` validates the title; on error it returns `{ errors: { title }, values }` without calling the API (the user stays on the form, AC 4-6); on success it calls `createDefect` and `redirect(`/defects/${id}`)` (AC 1, 2, 10). `POST /api/attachments` is a Next route handler that forwards the file to the API with the reporter and relays the status and message, so the form can show the error beside Attach file without a page navigation (AC 7-9).
      ```ts
      export type NewDefectState = { errors: { title?: string }; values: { title: string; severity: string; area: string; steps: string; attachmentId?: string } }
      export async function createDefectAction(prev: NewDefectState, formData: FormData): Promise<NewDefectState>
      ```
    files:
      - apps/web/src/app/defects/new/actions.ts
      - apps/web/src/app/api/attachments/route.ts
      - apps/web/tests/unit/new-defect-action.test.ts
      - apps/web/tests/unit/attachments-route.test.ts
    rationale: |
      Server-side work keeps `API_BASE_URL` and the reporter identity off the client, matching how `getDefects` already runs on the server.
  - description: |
      Web UI: the `new-defect` screen and its `new-defect-error` state (sketch ids `crumbs`, `title`, `form`, `defect-title`, `defect-severity`, `defect-area`, `defect-steps`, `attach-file`, `title-error`, `form-actions`, `cancel-new-defect`, `submit-defect`). Page is a server component inside the existing `app-shell` (top bar, nav `Defects` active via its prefix match). `NewDefectForm` is a client component with controlled fields so a failed submit or upload never clears them (AC 6, 8).
      - Breadcrumbs "Defects / New defect": new small `Breadcrumbs` component (nothing in the catalogue covers it); "Defects" links to `/defects`.
      - `h1` "New defect"; the form is a `.stack` of `.field` wrappers.
      - Title: `.input`, label "Title", placeholder "Short summary"; on error `.is-invalid`, `aria-invalid`, `aria-describedby` pointing to a `.field-error` (role alert) with "Enter a title for the defect." beside it.
      - Severity: group of `.radio` inputs (Low, Medium, High, Critical), default Medium, in a fieldset with a legend and `.cluster`.
      - Area: `.select`, placeholder option "Choose an area", options Login, Billing, Reports, Other.
      - Steps to reproduce: `.textarea`, placeholder "What did you do?".
      - Attach file: `.btn .btn-secondary` that opens a visually hidden file input; shows the chosen file name on success, and a `.field-error` (role alert, `aria-describedby` on the control) beside the control on rejection or failure; the control stays enabled so another file can be chosen (AC 9). A pending upload shows `.spinner` and disables only Submit.
      - Actions: `.cluster` aligned end, Cancel is `Link` styled `.btn .btn-ghost` to `/defects` (AC 11), Submit is the single `.btn .btn-primary` "Submit defect"; pending shows "Submitting…" and is disabled.
      - Phone-first single column inside `.container`; spacing only with `space-*` tokens (`.stack`, `.cluster`); light theme only.
      The `Icon` component is reused for the pending state if needed (`loader`); `.radio`, `.select`, `.textarea`, `.field-error`, `.spinner` already exist in `globals.css`. Add only a few token-based rules (breadcrumb list, form-actions alignment, visually-hidden file input).
    files:
      - apps/web/src/app/defects/new/page.tsx
      - apps/web/src/components/defects/new-defect-form.tsx
      - apps/web/src/components/breadcrumbs.tsx
      - apps/web/src/app/globals.css
      - apps/web/tests/unit/new-defect-form.test.tsx
      - apps/web/tests/unit/breadcrumbs.test.tsx
      - apps/web/tests/unit/new-defect-page.test.tsx
    rationale: |
      Builds the approved sketch screen and its error state with the design-system classes the guidelines require (one primary button, every control in `.field`, errors beside their source).
  - description: |
      Playwright end-to-end flows against the stub API for the whole story (submit to detail URL, missing title, attachment rejected, attachment failed then submit without it, cancel).
    files:
      - apps/web/tests/e2e/new-defect.spec.ts
    rationale: |
      Proves the criteria in a real browser including the redirect and the unchanged field values.
tests:
  - |
    AC1 (API, supertest, written first, fails with 404 until the controller exists): created with the reporter.
    ```ts
    const res = await request(app.getHttpServer())
      .post('/defects').set('x-user-id', 'user-42')
      .send({ title: 'Crash on login', severity: 'high', area: 'Login', steps: 'Open page' });
    expect(res.status).toBe(201);
    expect(res.body.reporterId).toBe('user-42');
    expect(await repo.findById(res.body.id)).toMatchObject({ title: 'Crash on login', reporterId: 'user-42' });
    ```
    Also: body `reporterId: 'someone-else'` is ignored, and no `x-user-id` gives `expect(res.status).toBe(401)`.
  - |
    AC1 (web unit, `new-defect-action.test.ts`): the action forwards the signed-in person.
    ```ts
    await createDefectAction(empty, form({ title: 'Crash', severity: 'high', area: 'Login', steps: 'x' }));
    expect(createDefect).toHaveBeenCalledWith(expect.objectContaining({ title: 'Crash' }), 'user-42');
    ```
  - |
    AC2 (unit + e2e): the action redirects to the detail page; Playwright confirms the browser lands there.
    ```ts
    await expect(createDefectAction(empty, form({ title: 'Crash' }))).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/defects/DEF-NEW-1');
    // e2e
    await page.getByLabel('Title').fill('Crash on login');
    await page.getByRole('button', { name: 'Submit defect' }).click();
    await expect(page).toHaveURL(/\/defects\/DEF-NEW-\d+$/);
    ```
  - |
    AC3 (unit, `new-defect-form.test.tsx`): all five fields are present.
    ```ts
    render(<NewDefectForm />);
    expect(screen.getByLabelText('Title')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Severity' })).toBeTruthy();
    expect(screen.getByLabelText('Area')).toBeTruthy();
    expect(screen.getByLabelText('Steps to reproduce')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Attach file' })).toBeTruthy();
    expect(screen.getByLabelText('Medium')).toHaveProperty('checked', true);
    ```
  - |
    AC4 (action unit + e2e): empty title stays on the form and nothing is created.
    ```ts
    const next = await createDefectAction(empty, form({ title: '   ', area: 'Login' }));
    expect(createDefect).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
    // e2e
    await page.getByRole('button', { name: 'Submit defect' }).click();
    await expect(page).toHaveURL(/\/defects\/new$/);
    ```
    The Submit button is enabled while the title is empty (see the sketch conflict in `notes`).
  - |
    AC5 (unit + e2e): the missing-title message sits beside the title field.
    ```ts
    expect(next.errors.title).toBe('Enter a title for the defect.');
    render(<NewDefectForm initial={next} />);
    expect(screen.getByLabelText('Title').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByLabelText('Title').getAttribute('aria-describedby')).toBe(screen.getByText('Enter a title for the defect.').id);
    ```
  - |
    AC6 (unit + e2e): severity, area and steps survive the title error.
    ```ts
    // e2e
    await page.getByLabel('High').check();
    await page.getByLabel('Area').selectOption('Billing');
    await page.getByLabel('Steps to reproduce').fill('1. Open billing');
    await page.getByRole('button', { name: 'Submit defect' }).click();
    await expect(page.getByText('Enter a title for the defect.')).toBeVisible();
    await expect(page.getByLabel('High')).toBeChecked();
    await expect(page.getByLabel('Area')).toHaveValue('Billing');
    await expect(page.getByLabel('Steps to reproduce')).toHaveValue('1. Open billing');
    ```
  - |
    AC7 (API spec, route unit and e2e; one rule for rejected and failed): message beside Attach file.
    ```ts
    // attachments.controller.spec.ts
    expect((await upload('virus.exe')).status).toBe(415);
    expect((await upload('big.png', 11 * 1024 * 1024)).status).toBe(413);
    failingStore.put.mockRejectedValue(new Error('s3 down'));
    expect((await upload('ok.png')).status).toBe(502);
    // e2e (both a rejected `.exe` and a `fail` file)
    await page.getByLabel('Attach file input').setInputFiles({ name: 'virus.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('x') });
    await expect(page.locator('#attach-error')).toContainText('file');
    await expect(page.getByRole('button', { name: 'Attach file' })).toHaveAttribute('aria-describedby', 'attach-error');
    ```
  - |
    AC8 (unit + e2e): entries unchanged after an attachment error.
    ```ts
    await page.getByLabel('Title').fill('Crash');
    await page.getByLabel('Critical').check();
    await page.getByLabel('Area').selectOption('Login');
    await page.getByLabel('Steps to reproduce').fill('Open page');
    await page.getByLabel('Attach file input').setInputFiles({ name: 'virus.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('x') });
    await expect(page.locator('#attach-error')).toBeVisible();
    await expect(page.getByLabel('Title')).toHaveValue('Crash');
    await expect(page.getByLabel('Critical')).toBeChecked();
    await expect(page.getByLabel('Area')).toHaveValue('Login');
    await expect(page.getByLabel('Steps to reproduce')).toHaveValue('Open page');
    ```
  - |
    AC9 (unit + e2e): Attach file stays usable and a later good file clears the error.
    ```ts
    await expect(page.getByRole('button', { name: 'Attach file' })).toBeEnabled();
    await page.getByLabel('Attach file input').setInputFiles({ name: 'ok.png', mimeType: 'image/png', buffer: Buffer.from('x') });
    await expect(page.locator('#attach-error')).toHaveCount(0);
    await expect(page.getByText('ok.png')).toBeVisible();
    ```
  - |
    AC10 (e2e + unit): after an attachment error, Submit without a file goes to the detail page and the create call has no attachment.
    ```ts
    await page.getByRole('button', { name: 'Submit defect' }).click();
    await expect(page).toHaveURL(/\/defects\/DEF-NEW-\d+$/);
    // unit
    expect(createDefect).toHaveBeenCalledWith(expect.not.objectContaining({ attachmentId: expect.anything() }), 'user-42');
    ```
  - |
    AC11 (unit + e2e): Cancel returns to the list.
    ```ts
    expect(screen.getByRole('link', { name: 'Cancel' }).getAttribute('href')).toBe('/defects');
    // e2e
    await page.getByRole('link', { name: 'Cancel' }).click();
    await expect(page).toHaveURL(/\/defects$/);
    ```
  - |
    Guideline checks (unit): exactly one `.btn-primary` on the page, Title/Area/Steps wrapped in `.field`, breadcrumbs render "Defects" as a link and "New defect" with `aria-current="page"`.
    ```ts
    expect(container.querySelectorAll('.btn-primary')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Defects' }).getAttribute('href')).toBe('/defects');
    ```
assumptions_or_open_questions:
  - |
    SKETCH vs AC conflict: the sketch draws Submit defect as `state: disabled` on `new-defect`, but AC 4 and 5 require pressing Submit with an empty title and seeing the error, and the sketch's own `new-defect-error` screen shows Submit enabled. The plan keeps Submit enabled (it is only disabled while submitting or while an upload is in flight). Please confirm.
  - |
    There is no sign-in feature in the repo (no auth, session or user code). The plan adds a seam, `getCurrentUserId()` in `apps/web/src/lib/session.ts`, that reads a session cookie, and the API trusts an `x-user-id` header. Which story or mechanism will provide real sign-in? Until then the e2e tests set the cookie directly.
  - |
    The API has no defects module, no database wiring and no migration tooling (only `pg` is a dependency; GET /defects exists only in the web e2e stub). I assume this item adds the table via a plain SQL file plus a `DATABASE_URL`-based `pg` pool, and that API e2e tests use an in-memory repository. Confirm whether another story owns DB setup and the list endpoint.
  - |
    The detail page `/defects/[id]` does not exist and is out of scope per the story. AC 2 and 10 are verified by the URL only; until the detail story lands the browser shows a Next 404 there.
  - |
    Attachment limits are not in the story. Assumed: one file, up to 10 MB, images, PDF, text and log files. Messages explain the reason and the next step. Confirm the limits.
  - |
    The sketch types Steps as `kind: input`; the plan uses a multi-line `.textarea` because steps are typically several lines. Say if you want a single-line `.input` exactly as drawn.
  - |
    The sketch's header (Defects, Reports nav and the `new-defect` button) is drawn from the list screen; the plan reuses the existing `app-shell` (Home, Defects, Reports) rather than redrawing it.
estimated_points: 8
package_dependencies:
  - name: "@aws-sdk/client-s3"
    version: "^3.700.0"
    ecosystem: npm
    component_id: comp_platform_api
    rationale: |
      The S3 adapter for the AttachmentStore port needs PutObjectCommand. Amazon S3 is the project's object storage component and nothing in the API depends on an S3 client yet.
notes: |
  Design source: the wireframe sketch lists screens `new-defect` and `new-defect-error` (`state_of: new-defect`) and the flow `submit-without-title`. Exit flows: `cancel-new-defect-flow` goes to `defect-list`, `submit-new-defect` goes to `defect-detail`. The attachment-error state and the pending state are not drawn; they follow the guidelines (`.field-error` beside the control, `.spinner`) and are called out in the form task.

  Why a server action plus a route handler: the title check and create run on the server so the reporter id and `API_BASE_URL` never reach the browser, and the attachment goes through a separate route so a failed upload shows its message in place without losing form state.

  Layering touched by this plan:

  ```mermaid
  flowchart TD
    List[defects/page.tsx - links to /defects/new] --> Page
    Page[defects/new/page.tsx] --> Form[new-defect-form.tsx]
    Page --> Shell[app-shell.tsx]
    Form --> Crumbs[breadcrumbs.tsx]
    Form --> Action[new/actions.ts]
    Form --> Route[api/attachments/route.ts]
    Action --> Client[lib/defects-api.ts]
    Route --> Client
    Action --> Lib[lib/defects.ts - validateNewDefect]
    Client --> Ctl[defects.controller.ts]
    Client --> ACtl[attachments.controller.ts]
    Ctl --> Svc[defects.service.ts]
    Svc --> Repo[defects.repository.ts - pg]
    ACtl --> Store[s3-attachment-store.ts]
    Mod[app.module.ts] --> Ctl
    classDef touched fill:#f96,color:#000
    class Page,Form,Crumbs,Action,Route,Client,Lib,Ctl,ACtl,Svc,Repo,Store,Mod touched
  ```

  Orange nodes are created or modified (new form and its server seams on the web side; creation and upload endpoints on the API side, wired in `app.module.ts`). `defects/page.tsx` and `app-shell.tsx` are untouched context: the list already links to `/defects/new` and the shell already highlights Defects for nested paths.

  Order of work (TDD): API controller/service specs, then attachments spec, then web lib and action tests, then form and page tests, then stub-api and Playwright spec; each group is written failing first.
review_focus: |
  IN: the New defect form, its two error states, submit-to-detail and cancel on the web side, plus the API's `POST /defects` and attachment upload. OUT: the defect list, the detail page contents and real sign-in. Riskiest parts are that field values must survive both error paths (controlled state, not a form reset) and that the reporter comes from the trusted header, never the body. Deliberate choices: Submit is enabled despite the sketch's disabled draw (AC 4/5 conflict), and the `x-user-id` seam stands in for sign-in that does not yet exist in the repo.
