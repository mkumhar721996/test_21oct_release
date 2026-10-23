"use client";

import { useState } from "react";
import type { Chat } from "@/lib/chats";
import { ChatListItem } from "./chat-list-item";

export function ChatList({ chats }: { chats: Chat[] }) {
  const [query, setQuery] = useState("");
  const shown = chats.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <div className="stack">
      <div className="field">
        <label htmlFor="chat-q">Search chats</label>
        <input
          className="input"
          id="chat-q"
          type="search"
          placeholder="Search chats"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <ul className="chat-list stack stack-sm">
        {shown.map((chat) => (
          <li key={chat.id}>
            <ChatListItem chat={chat} />
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p className="text-muted">No chats match your search.</p>}
    </div>
  );
}
