summary: |
  Add a read-only chat thread to the Next.js web app. A new `/chats` route lists the seeded chats (Maya Chen with history, Alex Park with none) and `/chats/[id]` renders the selected chat's seeded history as sent/received bubbles with timestamps, date dividers between different dates, a static (non-playing) voice-message bubble, and an opening scroll position at the latest message. A chat with no messages shows the placeholder "No messages yet". The history comes from an in-code seeded fixture that is never mutated, so a reload always shows only the seed. The composer, sending, emoji/attachment/mic icons are out of scope (separate story). Built test-first with vitest (unit) and playwright (e2e), following the approved prototype.
scope:
  - description: |
      Seeded chat fixture and pure helpers. Mirrors `src/lib/organizations.ts` (typed const array, no I/O).

      ```ts
      export type Message =
        | { id: string; direction: "sent" | "received"; kind: "text"; text: string; sentAt: string }
        | { id: string; direction: "sent" | "received"; kind: "voice"; durationSeconds: number; sentAt: string };
      export type Chat = { id: string; name: string; initials: string; messages: Message[] };
      export const CHATS: Chat[];                      // chat-maya (4 messages, 2 dates), chat-alex (empty)
      export function getChat(id: string): Chat | undefined;
      export type ThreadItem =
        | { type: "divider"; key: string; label: string }
        | { type: "message"; key: string; message: Message };
      export function buildThread(messages: Message[]): ThreadItem[]; // divider before the first message of each distinct date, none for a single date
      export function formatTime(iso: string): string;  // "09:14"
      export function formatDate(iso: string): string;  // "12 Oct 2026"
      ```
      Seed (from the prototype): Maya Chen — received "Hi" 12 Oct 2026 09:14, sent "Morning" 09:16, received voice 0:12 on 23 Oct 2026 10:02, sent "See you at 11" 10:05. Timestamps are ISO strings with `Z` and are formatted with `timeZone: "UTC"` so server and client render the same text in any timezone.
    files:
      - apps/web/src/lib/chats.ts
      - apps/web/tests/unit/chats.test.ts
    rationale: |
      Keeps date grouping/formatting out of components so AC 5 and 6 are unit-testable without rendering. The seed is a constant, never written to, which satisfies AC 10 by construction.
  - description: |
      Presentational components, reusing design tokens and utility classes only (no ad-hoc colours or margins). Names follow the prototype's "NEW" list: message-bubble, voice-bubble, date-divider, chat-list-item.
      - `MessageBubble({ message })`: `<div class="msg msg-sent|msg-received">` with `.bubble` and `.msg-time` (time before the bubble for sent, after for received, as in the prototype). Delegates voice messages to VoiceBubble.
      - `VoiceBubble({ durationSeconds })`: `<button type="button" class="voice" aria-label="Voice message, 0:12 (playback not available)">` containing the round `.voice-play` play glyph, the 9-bar `.voice-wave` (heights 30/60/90/50/75/40/85/55/30 percent, aria-hidden) and the duration. It has NO onClick handler and renders no `<audio>`/`<video>` element.
      - `DateDivider({ label })`: `<span class="badge date-divider">` (the prototype's `.badge` with a bordered, muted, centred override).
      - `MessageThread({ messages })`: `<div class="thread" role="log" tabindex="0" aria-label="Conversation with NAME">` rendering `buildThread` output. For zero messages it renders `<div class="empty-state thread-empty" role="log"><p>No messages yet</p></div>` instead. The existing `defects/empty-state` is defect-specific (copy plus a Report a defect link), so the `.empty-state` class is reused directly rather than that component.
      - `ChatListItem({ chat })`: `<Link class="btn btn-ghost chat-row" href="/chats/ID">` with `.avatar` initials and the name; preview line "See you at 11 (10:05)" or "No messages yet" as in the prototype list.
    files:
      - apps/web/src/components/chats/message-bubble.tsx
      - apps/web/src/components/chats/voice-bubble.tsx
      - apps/web/src/components/chats/date-divider.tsx
      - apps/web/src/components/chats/message-thread.tsx
      - apps/web/src/components/chats/chat-list-item.tsx
      - apps/web/tests/unit/message-bubble.test.tsx
      - apps/web/tests/unit/voice-bubble.test.tsx
      - apps/web/tests/unit/message-thread.test.tsx
      - apps/web/tests/unit/chat-list-item.test.tsx
    rationale: |
      One responsibility per component, matching the prototype's breakdown, so each AC maps to a small unit test. None of the existing catalogue components (defect-* , empty-state, consultant-section) covers bubbles or threads, so new ones are justified; `icon` is reused.
  - description: |
      Open-at-latest scrolling. `MessageThread` is a client component (`"use client"`) with a ref on the `.thread` element and

      ```ts
      useLayoutEffect(() => {
        const el = ref.current;
        if (el) el.scrollTop = el.scrollHeight;
      }, []);
      ```
      so the thread is at the bottom before first paint (prototype: `scroll-behavior: auto`, `toBottom()`). No smooth scrolling.
    files:
      - apps/web/src/components/chats/message-thread.tsx
    rationale: |
      AC 9. A layout effect avoids a visible jump from the top. Same file as above; called out separately because it is the only client-side behaviour.
  - description: |
      Routes. `/chats` (server component) renders a heading, the "Search chats" `.field`/`.input` (visual filter on name, per the prototype; client island if kept) and a `<ul class="chat-list stack stack-sm">` of ChatListItem, plus "No chats match your search." when filtered to nothing. `/chats/[id]` (server component) reads `params`, calls `getChat(id)`, `notFound()` when unknown, else renders a `.thread-bar` with a `.btn.btn-ghost` "Back" link (arrow-left icon, href `/chats`), an `<h2>` with the chat name and the MessageThread.

      ```tsx
      export default async function ChatThreadPage({ params }: { params: Promise<{ id: string }> }) {
        const { id } = await params;
        const chat = getChat(id);
        if (!chat) notFound();
        return <ChatThreadView chat={chat} />;
      }
      ```
      Add `"arrow-left": ["m12 19-7-7 7-7", "M19 12H5"]` to `PATHS` in `src/components/icon.tsx` (taken from the prototype's `#i-arrow-left` symbol). The play glyph is a filled triangle, so it is an inline svg inside VoiceBubble rather than an Icon entry.
    files:
      - apps/web/src/app/chats/page.tsx
      - apps/web/src/app/chats/[id]/page.tsx
      - apps/web/src/app/chats/[id]/not-found.tsx
      - apps/web/src/components/chats/chat-thread-view.tsx
      - apps/web/src/components/icon.tsx
      - apps/web/tests/unit/chat-thread-page.test.tsx
    rationale: |
      The user needs a way to "open a chat"; no chat list exists in the repo, so the minimal list route from the prototype's Chats screen is included. Route shape mirrors `app/defects/[id]/page.tsx` (await params, notFound).
  - description: |
      Navigation: append `{ id: "chats", label: "Chats", href: "/chats" }` after Reports in `NAV` in `app-shell.tsx`, so the shell mirrors the new real route (UI guideline: add a destination only when a route exists, appended last). Existing `isActive` already highlights `/chats/ID` via the prefix rule. Update `tests/unit/app-shell.test.tsx` for the extra link.
    files:
      - apps/web/src/components/app-shell.tsx
      - apps/web/tests/unit/app-shell.test.tsx
    rationale: |
      Without a nav entry the chat list is only reachable by URL.
  - description: |
      Styles. Append a "Chat" block to `globals.css` containing the prototype's rules verbatim (token-based only): `.chat-row`, `.chat-row-text`, `.chat-list`, `.thread-bar`, `.thread` (flex column, gap space-2, height `calc(var(--size-popup) * 1.5)`, overflow-y auto, padding space-3, surface background, radius-lg, `scroll-behavior: auto`), `.thread:focus-visible`, `.date-divider`, `.msg` (max-width 85%), `.msg-received`/`.msg-sent`, `.bubble` and the received (bg + border, small bottom-left radius) / sent (primary fill, primary-fg text, small bottom-right radius) variants, `.msg-time`, `.voice`, `.voice:focus-visible`, `.voice-play`, `.voice-wave`, `.voice-wave i`, `.thread-empty`. Tailwind is imported but the repo styles with these token classes, so the same approach is used.
    files:
      - apps/web/src/app/globals.css
    rationale: |
      Phone-first and token-only per the UI guidelines; light theme only. The voice button keeps `cursor: default` because it is intentionally inert.
  - description: |
      End-to-end tests in playwright against the built app (no API stub needed; chat data is in-code).
    files:
      - apps/web/tests/e2e/chat-thread.spec.ts
    rationale: |
      Scroll position, reload behaviour and real click-without-audio can only be verified in a browser.
tests:
  - |
    AC1 (unit, message-thread.test.tsx): the seeded messages render as a thread.
    ```ts
    render(<MessageThread name="Maya Chen" messages={getChat("chat-maya")!.messages} />);
    const log = screen.getByRole("log", { name: "Conversation with Maya Chen" });
    expect(within(log).getByText("Hi")).toBeTruthy();
    expect(within(log).getByText("See you at 11")).toBeTruthy();
    ```
    e2e: `await page.goto("/chats"); await page.getByRole("link", { name: /Maya Chen/ }).click(); await expect(page.getByRole("log")).toContainText("Morning");`
  - |
    AC2 (unit, message-bubble.test.tsx): a sent message is a sent bubble.
    ```ts
    const { container } = render(<MessageBubble message={{ id: "m", direction: "sent", kind: "text", text: "Morning", sentAt: "2026-10-12T09:16:00Z" }} />);
    expect(container.querySelector(".msg-sent")?.textContent).toContain("Morning");
    expect(container.querySelector(".msg-received")).toBeNull();
    ```
  - |
    AC3 (unit, message-bubble.test.tsx): a received message is a received bubble.
    ```ts
    const { container } = render(<MessageBubble message={{ id: "m", direction: "received", kind: "text", text: "Hi", sentAt: "2026-10-12T09:14:00Z" }} />);
    expect(container.querySelector(".msg-received")?.textContent).toContain("Hi");
    expect(container.querySelector(".msg-sent")).toBeNull();
    ```
  - |
    AC4 (unit, chats.test.ts and message-bubble.test.tsx): the bubble shows its timestamp, formatted in UTC.
    ```ts
    expect(formatTime("2026-10-12T09:14:00Z")).toBe("09:14");
    expect(screen.getByText("09:14")).toBeTruthy(); // inside the received "Hi" bubble's .msg
    ```
  - |
    AC5 (unit, chats.test.ts and message-thread.test.tsx): a divider separates two dates.
    ```ts
    const items = buildThread(getChat("chat-maya")!.messages);
    expect(items.filter((i) => i.type === "divider").map((i) => i.label)).toEqual(["12 Oct 2026", "23 Oct 2026"]);
    // divider sits immediately before the first message of each date
    expect(items[0].type).toBe("divider");
    expect(items[3].type).toBe("divider");
    ```
    Component: `expect(container.querySelectorAll(".date-divider")).toHaveLength(2)`.
  - |
    AC6 (unit, chats.test.ts and message-thread.test.tsx): a single date shows no divider. Edge case: the same calendar date in UTC with different times.
    ```ts
    const same: Message[] = [
      { id: "a", direction: "received", kind: "text", text: "A", sentAt: "2026-10-12T00:01:00Z" },
      { id: "b", direction: "sent", kind: "text", text: "B", sentAt: "2026-10-12T23:59:00Z" },
    ];
    expect(buildThread(same).some((i) => i.type === "divider")).toBe(false);
    ```
    Note: the design shows no divider for a single-date chat in its notes, but its seeded single-date case is not drawn, so the rule is "no divider between messages of one date" exactly as AC 6 states (no leading divider either).
  - |
    AC7 (unit, voice-bubble.test.tsx and message-bubble.test.tsx): a voice message renders as a static voice bubble.
    ```ts
    render(<VoiceBubble durationSeconds={12} />);
    const btn = screen.getByRole("button", { name: "Voice message, 0:12 (playback not available)" });
    expect(btn.textContent).toContain("0:12");
    expect(btn.querySelectorAll(".voice-wave i")).toHaveLength(9);
    ```
  - |
    AC8 (unit, voice-bubble.test.tsx; e2e): pressing the voice bubble plays nothing.
    ```ts
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
    const { container } = render(<VoiceBubble durationSeconds={12} />);
    await userEvent.click(screen.getByRole("button", { name: /Voice message/ }));
    expect(play).not.toHaveBeenCalled();
    expect(container.querySelector("audio, video")).toBeNull();
    ```
    e2e: `page.on("console")`-free check that `await page.locator("audio, video").count()` is 0 before and after clicking the voice button, and that the URL is unchanged.
  - |
    AC9 (unit, message-thread.test.tsx; e2e): the thread opens scrolled to the latest message. jsdom has no layout, so the unit test stubs `scrollHeight` and asserts `scrollTop` was set; the e2e test checks real geometry.
    ```ts
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", { configurable: true, value: 900 });
    const { container } = render(<MessageThread name="Maya Chen" messages={maya} />);
    expect((container.querySelector(".thread") as HTMLElement).scrollTop).toBe(900);
    ```
    e2e (phone viewport 375x667): `await page.setViewportSize({ width: 375, height: 667 }); await page.goto("/chats/chat-maya");` then `await expect(page.getByText("See you at 11")).toBeInViewport(); await expect(page.getByText("Hi", { exact: true })).not.toBeInViewport();` and `expect(await thread.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)`.
  - |
    AC10 (e2e, chat-thread.spec.ts): reload shows only the seeded history.
    ```ts
    await page.goto("/chats/chat-maya");
    const before = await page.locator(".msg").count();   // 4
    await page.reload();
    expect(await page.locator(".msg").count()).toBe(before);
    expect(before).toBe(4);
    ```
    Unit guard: `expect(getChat("chat-maya")!.messages).toHaveLength(4)` after rendering twice (the fixture is not mutated by rendering).
  - |
    AC11 (unit, message-thread.test.tsx; e2e): a chat with no messages shows the placeholder.
    ```ts
    render(<MessageThread name="Alex Park" messages={[]} />);
    expect(screen.getByText("No messages yet")).toBeTruthy();
    expect(document.querySelector(".date-divider, .msg")).toBeNull();
    ```
    e2e: `await page.goto("/chats/chat-alex"); await expect(page.getByText("No messages yet")).toBeVisible();`
  - |
    Supporting (unit): unknown chat id returns not found and the nav gains the link.
    ```ts
    expect(getChat("nope")).toBeUndefined();
    expect(screen.getByRole("link", { name: "Chats" }).getAttribute("href")).toBe("/chats");
    ```
    Commands: `cd apps/web && pnpm vitest run` for unit; `cd apps/web && pnpm exec playwright test tests/e2e/chat-thread.spec.ts` for e2e.
assumptions_or_open_questions:
  - |
    A chat list route is included even though the story scope names only the thread view. AC 1 says "the user opens the chat" and no list exists in the repo, so the prototype's Chats screen (list plus name search) is built minimally. If a separate story owns the list, drop `app/chats/page.tsx`, `chat-list-item.tsx` and the nav entry and reach the thread by URL only.
  - |
    Prototype vs guidelines conflict: the prototype's header comment says the nav is "Chats · Contacts" but the drawn nav shows only Home. The UI guidelines say destinations are appended after existing ones only when a real route exists. This plan appends one "Chats" link after Reports, and does not add Contacts.
  - |
    Chat ids (`chat-maya`, `chat-alex`) and the seed content are taken from the prototype's fixture (Maya Chen, Alex Park). AC 9 relies on the fixed thread height (`calc(var(--size-popup) * 1.5)`, 300px) making Maya's four messages plus two dividers overflow; if the real rendering does not overflow at the e2e viewport, add more seeded messages to Maya's chat rather than changing the CSS height.
  - |
    Timestamps are stored as UTC ISO strings and formatted with `timeZone: "UTC"` and 24-hour `HH:mm` so the output is identical in SSR, the browser and CI. A user-local-timezone display would need a client-only render and is not required by the ACs.
  - |
    The search box on the chat list is visual only (filters the two names client-side) per the prototype note, and is not covered by an AC; it can be cut to reduce scope.
estimated_points: 5
package_dependencies: []
notes: |
  ### Data & rollout

  None — seeded history lives in a constant in `apps/web/src/lib/chats.ts`; there is no database schema, API change, stored data, new setting or env var. Nothing is persisted, so a reload showing only the seed (AC 10) holds by construction, and rollback is simply reverting the commit.

  Prototype read: `TEST-21OCT-RELEASE-STORY-039-design.html` has three screens: Chats (search plus list), Chat thread (Maya Chen: date divider "12 Oct 2026", received "Hi" 09:14, sent "Morning" 09:16, divider "23 Oct 2026", received voice 0:12 at 10:02, sent "See you at 11" 10:05) and Chat thread (no messages) for Alex Park with an `.empty-state.thread-empty` holding "No messages yet". The layout is a single `.container` column, a `.thread-bar` (ghost Back button plus `<h2>`), a bounded scrolling `.thread` on `--color-surface`, bubbles at max 85% width, received bubbles white with a border and sent bubbles in `--color-primary`. The thread opens at the bottom through `scrollTop = scrollHeight`. No composer is drawn (STORY-040).

  The prototype's reviewer bar, fixture script and IntersectionObserver scroll helper are prototype scaffolding and are not ported; the production code uses `useLayoutEffect` instead.

  Item text contained no instructions outside the change itself; nothing was excluded from the plan.

  ```mermaid
  flowchart TD
    layout[app/layout.tsx] --> shell[components/app-shell.tsx]
    shell --> listPage[app/chats/page.tsx]
    shell --> threadPage[app/chats/id/page.tsx]
    listPage --> item[components/chats/chat-list-item.tsx]
    threadPage --> view[components/chats/chat-thread-view.tsx]
    view --> thread[components/chats/message-thread.tsx]
    thread --> bubble[components/chats/message-bubble.tsx]
    thread --> divider[components/chats/date-divider.tsx]
    bubble --> voice[components/chats/voice-bubble.tsx]
    view --> icon[components/icon.tsx]
    listPage --> data[lib/chats.ts]
    threadPage --> data
    thread --> data
    shell --> css[app/globals.css]
    classDef touched fill:#f96,color:#000
    class shell,listPage,threadPage,item,view,thread,bubble,divider,voice,icon,data,css touched
  ```
  Touched: app-shell (new Chats nav link), icon (arrow-left glyph), globals.css (chat styles), and the new chats pages, components and `lib/chats.ts`. `layout.tsx` is unchanged context.
review_focus: |
  IN: read-only thread, minimal chat list route and nav link, seeded fixture, static voice bubble, scroll-to-latest; OUT: composer, sending, emoji/attachment/mic icons, audio playback, persistence, any API or database. Riskiest parts are date grouping (UTC vs local date boundaries) and the scroll-to-bottom behaviour, which jsdom cannot truly verify, so the e2e geometry test matters. Deliberate choices: the voice button is a real `button` with no handler (for accessibility and focus) yet plays nothing, and the chat list is included only because the ACs need a way to open a chat.
