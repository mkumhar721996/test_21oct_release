summary: |
  Add email + password sign-in for four seeded roles (WFC Admin, Fundraising Consultant, Org Admin, Org Staff). The Platform API (NestJS) gets an `auth` module holding seeded users (role + optional organization link), scrypt password verification, opaque server-side sessions with a 30-minute idle timeout, and a per-user lockout (5 consecutive failures lock the user for 15 minutes from the fifth failure). The Web App (Next.js) gets a `/sign-in` page built from the approved prototype (narrow `.card` form, one shared error `.alert-danger`, sign-out / idle toasts), thin Next route handlers that keep the session token in an HttpOnly cookie, a header user summary (name, role, organization name only for org users) and a Home identity card. Strictly excludes the organization list/panel and creating or editing users.
scope:
  - description: |
      API seed data: four seeded users and the organizations they link to. Org Admin and Org Staff each carry exactly one `organizationId`; WFC Admin and Fundraising Consultant carry `organizationId: null`. Passwords are stored as scrypt hashes (salt + hash), never plaintext; the seed file computes them at module load from demo passwords (the same four demo accounts shown in the prototype's "demo accounts" disclosure).
      ```ts
      export type Role = 'WFC Admin' | 'Fundraising Consultant' | 'Org Admin' | 'Org Staff';
      export interface SeedUser { id: string; email: string; name: string; role: Role; organizationId: string | null; passwordHash: string }
      ```
    files:
      - services/api/src/auth/seed-users.ts
      - services/api/src/auth/seed-organizations.ts
      - services/api/src/auth/password.ts
    rationale: |
      Mirrors `services/api/src/portfolio/seed-data.ts` (in-memory seed, no DB access exists in the API today even though `pg` is a dependency). Hashing with node:crypto scrypt avoids a new package.
  - description: |
      API auth service: `signIn(email, password)`, `signOut(token)`, `getSession(token)`. Constants `MAX_FAILURES = 5`, `LOCK_MS = 15 * 60_000`, `IDLE_MS = 30 * 60_000`. An injectable `Clock` provider (`now(): number`) so tests advance time without sleeping. Unknown email and wrong password and locked user all throw the identical `UnauthorizedException('Email or password is incorrect')`; the failure counter only exists for seeded users; attempts during a lock do not extend it; a success resets the counter; `getSession` rejects and deletes a session whose `lastActivity` is more than 30 minutes old and otherwise refreshes `lastActivity`. Email is compared trimmed and lower-cased.
      ```ts
      signIn(email: string, password: string): { token: string; user: SessionUser }
      signOut(token: string): void
      getSession(token: string): SessionUser   // throws UnauthorizedException when missing/expired
      interface SessionUser { id: string; name: string; role: Role; organization: { id: string; name: string } | null }
      ```
    files:
      - services/api/src/auth/auth.service.ts
      - services/api/src/auth/session.store.ts
      - services/api/src/auth/clock.ts
    rationale: |
      Core of ACs 1-10. Session creation sits behind a store class so a durable store can replace the in-memory Map later without touching callers.
  - description: |
      API HTTP surface and wiring: `POST /auth/sign-in` (body email, password; 200 with token and user, 401 with the shared message), `POST /auth/sign-out` (204), `GET /auth/session` (200 SessionUser or 401). The token travels as `Authorization: Bearer <token>`. Register `AuthModule` in `AppModule`.
    files:
      - services/api/src/auth/auth.controller.ts
      - services/api/src/auth/auth.module.ts
      - services/api/src/app.module.ts
    rationale: |
      Same controller/module layout as `PortfolioModule`; `app.module.ts` currently imports only `PortfolioModule`.
  - description: |
      Web data layer: `lib/auth-api.ts` calls the Platform API with `API_BASE_URL` (default `http://localhost:3001`, same convention as `defects-api.ts`). Three Next route handlers (`/api/auth/sign-in`, `/api/auth/sign-out`, `/api/auth/session`) proxy to it and store the token in an HttpOnly, SameSite=Lax cookie named `session`; the browser never sees the token. `lib/session.ts` holds the shared `SessionUser` type and the display helper `headerIdentity(user)` that returns name, role and organization name or null.
    files:
      - apps/web/src/lib/auth-api.ts
      - apps/web/src/lib/session.ts
      - apps/web/src/app/api/auth/sign-in/route.ts
      - apps/web/src/app/api/auth/sign-out/route.ts
      - apps/web/src/app/api/auth/session/route.ts
    rationale: |
      The web app calls the Platform API only (stack note), and an HttpOnly cookie keeps the credential away from page scripts.
  - description: |
      Sign-in page `/sign-in` implementing the prototype's "Sign in" screen: centred `.signin-card` (max 360px) `.card.stack` with `h2` "Sign in", two `.field`s (Email, Password) with `.input`, per-field `.field-error` ("Enter your email." / "Enter your password.") plus `.is-invalid` and `aria-invalid`, a single `.alert.alert-danger role="alert" tabindex="-1"` with bold "Email or password is incorrect" and `.text-sm` "Check both and try again." that receives focus on failure, and one `.btn-primary` that is disabled and relabelled "Signing in…" with `.spinner` while pending. The password is cleared after a failure. Toast (`.toast`, `role="status"`) shows "You have been signed out" after sign-out and "You were signed out after 30 minutes of inactivity. Sign in again to continue." after an idle expiry (via `?reason=signed-out|idle`). The prototype's "Prototype: demo accounts" disclosure and the "advance 15 minutes" / "simulate idle" buttons are prototype aids and are NOT built.
      ```tsx
      export function SignInForm(): JSX.Element   // client component, POSTs /api/auth/sign-in, router.replace('/') on 200
      ```
    files:
      - apps/web/src/app/sign-in/page.tsx
      - apps/web/src/components/auth/sign-in-form.tsx
      - apps/web/src/app/globals.css
    rationale: |
      Reuses existing utility classes (`.card`, `.field`, `.input`, `.alert`, `.toast`, `.btn-*`, `.spinner` as far as `globals.css` already defines them; only the prototype-specific `.signin-wrap` / `.signin-card` rules are added if missing).
  - description: |
      Header user summary and Home identity card. Extend the existing `app-shell` with a `UserSummary` slot (client, fetches `/api/auth/session` on load): shows name, a `.badge badge-success` role and, only for Org Admin / Org Staff, the organization name, plus a `.btn-ghost` "Sign out". Add a `SessionCard` on Home matching the prototype's "Signed in" `.card.stack` with the `.id-list` definition list (Name, Role badge, Organization row only for org users) and the same Sign out button. A 401 from `/api/auth/session` (no session or idle expiry) redirects to `/sign-in?reason=idle`; the sign-in page itself is not redirected. Existing nav entries (Home, Defects, Reports) stay as they are.
    files:
      - apps/web/src/components/app-shell.tsx
      - apps/web/src/components/auth/user-summary.tsx
      - apps/web/src/components/auth/session-card.tsx
      - apps/web/src/app/page.tsx
    rationale: |
      Reuses `app-shell` rather than adding a second shell. ACs 11-12 require the header; the prototype home card is kept as the secondary place.
tests:
  - |
    AC1 (API unit, written first, `services/api/src/auth/auth.service.spec.ts`): every seeded role signs in.
    ```ts
    it.each(SEED_USERS)('signs in $role', (u) => {
      const { token, user } = service.signIn(u.email, DEMO_PASSWORDS[u.role]);
      expect(token).toBeTruthy();
      expect(service.getSession(token).id).toBe(u.id);
    });
    ```
  - |
    AC2 and AC7 (API unit and e2e): wrong password is refused with the exact message.
    ```ts
    expect(() => service.signIn('priya.nair@wfc.example', 'nope')).toThrow('Email or password is incorrect');
    // e2e (supertest)
    const res = await request(server).post('/auth/sign-in').send({ email, password: 'nope' }).expect(401);
    expect(res.body.message).toBe('Email or password is incorrect');
    ```
  - |
    AC3 and AC10 (API unit): org users get exactly one organization, WFC users none.
    ```ts
    expect(service.getSession(signIn('maya...', pw).token).organization).toEqual({ id: expect.any(String), name: expect.any(String) });
    expect(service.getSession(signIn('priya...', pw).token).organization).toBeNull();
    ```
  - |
    AC4 (API unit and e2e): sign-out ends the session.
    ```ts
    service.signOut(token);
    expect(() => service.getSession(token)).toThrow(UnauthorizedException);
    // e2e
    await request(server).post('/auth/sign-out').set('Authorization', `Bearer ${token}`).expect(204);
    await request(server).get('/auth/session').set('Authorization', `Bearer ${token}`).expect(401);
    ```
  - |
    AC5 (API unit, fake `Clock`): five consecutive failures lock the user, even for the correct password.
    ```ts
    for (let i = 0; i < 5; i++) expect(() => service.signIn(email, 'bad')).toThrow();
    clock.advance(15 * 60_000 - 1);
    expect(() => service.signIn(email, correctPassword)).toThrow('Email or password is incorrect');
    ```
  - |
    AC6 (API unit, fake `Clock`): after 15 minutes the correct password works; also a success before the fifth failure resets the count.
    ```ts
    for (let i = 0; i < 5; i++) expect(() => service.signIn(email, 'bad')).toThrow();
    clock.advance(15 * 60_000);
    expect(service.signIn(email, correctPassword).token).toBeTruthy();
    ```
  - |
    AC8 (API unit and e2e): an unknown email gets the identical message and status as a wrong password.
    ```ts
    expect(() => service.signIn('nobody@example.org', 'anything')).toThrow('Email or password is incorrect');
    ```
  - |
    AC9 (API unit, fake `Clock`): 30 idle minutes end the session on the next action; activity inside the window extends it.
    ```ts
    clock.advance(30 * 60_000 + 1);
    expect(() => service.getSession(token)).toThrow(UnauthorizedException);
    ```
  - |
    AC11 and AC12 (web unit, `apps/web/tests/unit/user-summary.test.tsx`, fetch mocked): header content per role.
    ```tsx
    expect(await screen.findByText('Maya Okafor')).toBeTruthy();
    expect(screen.getByText('Org Admin')).toBeTruthy();
    expect(screen.getByText('Hope Trust')).toBeTruthy();
    // WFC Admin: no organization text rendered
    expect(within(header).queryByTestId('user-organization')).toBeNull();
    ```
  - |
    Web unit (`sign-in-form.test.tsx`): ACs 2, 7, 8 in the UI. A 401 shows the single alert and moves focus to it, the password is cleared and empty fields show the field errors without calling the API.
    ```tsx
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect');
    expect(document.activeElement).toBe(screen.getByRole('alert'));
    ```
  - |
    Web e2e (Playwright, stub API extended in `apps/web/tests/e2e/stub-api.mjs`, `auth.spec.ts`): sign in as each role lands on Home with the right header, Sign out returns to `/sign-in` with the "You have been signed out" toast, and an idle 401 from the stub redirects with the inactivity toast.
    ```ts
    await expect(page.getByRole('banner')).toContainText('Org Staff');
    ```
  - |
    Existing tests stay green: `app-shell.test.tsx` and `page.test.tsx` are updated only to mock the session fetch.
assumptions_or_open_questions:
  - |
    Design vs AC conflict: the prototype states the shell has no place for user details and puts name, role, organization and Sign out only in the Home content card, while AC 11 and 12 say the header shows them. This plan follows the ACs (header user summary in `app-shell`) and also builds the prototype's Home card. Please confirm both are wanted.
  - |
    The prototype's seeded organizations ("Riverside Food Bank", "Harbor Youth Alliance") differ from the existing web fixture `apps/web/src/lib/organizations.ts` (Hope Trust, River Foundation, Oak Alliance, Bright Futures). The plan links Org Admin to org-1 Hope Trust and Org Staff to org-2 River Foundation so names stay consistent with the organization list work. Confirm, or tell me to use the prototype's names.
  - |
    The Platform API has no database access today (portfolio data is in-memory seed), so users, sessions and lockout counters are in-memory and reset on restart. Durable storage is out of scope; users and organizations are not created or edited by this story.
  - |
    The lock window is counted from the fifth failure and attempts made during the lock do not extend it (as in the prototype). Failures are tracked per seeded email only; unknown emails are not tracked.
  - |
    Sessions are server-side opaque tokens (32 random bytes, hex) carried in an HttpOnly cookie set by the Next route handlers, with `Secure` when `NODE_ENV` is production. No CSRF token is added for this story (SameSite=Lax); role-based authorization of other endpoints is out of scope.
  - |
    Seeded demo passwords are development fixtures only (taken from the prototype); a production deploy would need a real provisioning path, which is outside this story.
estimated_points: 5
package_dependencies: []
notes: |
  ### Data & rollout
  - **Existing data**: None — no database, migration or stored shape changes; users, organizations, sessions and lockout state are new in-memory structures in the API process.
  - **Backfill / seed**: The four seeded users and their organizations are created at module load from `services/api/src/auth/seed-users.ts`; this is idempotent (rebuilt on every start).
  - **Settings**: No new required settings. `API_BASE_URL` (already used by `apps/web/src/lib/defects-api.ts`, default `http://localhost:3001`) is reused by the web route handlers.
  - **Provisioning**: Nothing external; the seeded users are provisioned by the code above.
  - **Order and rollback**: Deploy API before web (the web calls `/auth/*`). Rollback is reverting the change; nothing persisted needs undoing. Because sessions are in-memory, an API restart signs everyone out.

  ### Shape

  ```mermaid
  flowchart TD
    Browser --> SignIn[sign-in page and SignInForm]
    Browser --> Shell[AppShell + UserSummary + SessionCard]
    SignIn --> Routes[Next /api/auth route handlers]
    Shell --> Routes
    Routes --> AuthApi[lib/auth-api.ts]
    AuthApi --> Ctrl[AuthController]
    Ctrl --> Svc[AuthService]
    Svc --> Store[SessionStore]
    Svc --> Seed[seed-users and password.ts]
    Svc --> Clock[Clock]
    App[AppModule] --> AuthMod[AuthModule]
    App --> Portfolio[PortfolioModule]
    classDef touched fill:#f96,color:#000
    class SignIn,Shell,Routes,AuthApi,Ctrl,Svc,Store,Seed,Clock,AuthMod,App touched
  ```

  Touched nodes are the new auth module, the web route handlers and form, plus `app.module.ts` and `app-shell.tsx`; `PortfolioModule` is context only.

  Prototype elements used: `.signin-card` form (`#sign-in-form`), `.field` / `.input` / `.field-error`, `#sign-in-error` `.alert-danger` with `role="alert"` and focus, `.btn-primary` pending state with `.spinner`, `.toast` for sign-out and idle, `.id-list` identity card with `.badge-success` role. Light theme only, `space-*` tokens only, no ad-hoc margins beyond what the prototype already uses.
review_focus: |
  IN: sign-in, sign-out, lockout, idle timeout, seeded users with organization link, header and Home identity display. OUT: organization list/panel, user create/edit, durable storage, authorization of other endpoints. Riskiest part is the lockout and idle timing logic in `auth.service.ts` (boundary at exactly 15 and 30 minutes, same error for unknown/wrong/locked); the in-memory store and the header-plus-Home duplication of identity are deliberate (AC 11-12 versus the prototype).
