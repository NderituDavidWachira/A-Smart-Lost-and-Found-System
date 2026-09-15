import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function initials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

const AVATAR_COLORS = ["var(--gold-deep)", "var(--found)", "var(--lost)", "var(--ink)", "var(--ink-hover)"];

function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function Avatar({ name, size = 36 }) {
  return (
    <div
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.38, background: avatarColor(name) }}
    >
      {initials(name)}
    </div>
  );
}

export default function MessagesPage({ onChange }) {
  const { token, user } = useAuth();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selected, setSelected] = useState(null); // { item_id, counterpart_id, counterpart_name, item_title }

  function loadConversations() {
    setLoadingList(true);
    api
      .myConversations(token)
      .then((convos) => {
        setConversations(convos);
        return convos;
      })
      .finally(() => setLoadingList(false));
  }

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Deep link support: /messages?item=3&with=7 auto-opens that thread
  // (used right after "I found this" sends its first message).
  useEffect(() => {
    const item = searchParams.get("item");
    const withId = searchParams.get("with");
    if (item && withId) {
      setSelected((prev) =>
        prev && prev.item_id === Number(item) && prev.counterpart_id === Number(withId)
          ? prev
          : { item_id: Number(item), counterpart_id: Number(withId) }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function counterpartOf(convo) {
    return convo.user_a_id === user.id
      ? { id: convo.user_b_id, name: convo.user_b_name }
      : { id: convo.user_a_id, name: convo.user_a_name };
  }

  // Fill in the display name/item title once the conversation list has
  // loaded, for threads opened via deep link that only had raw ids.
  useEffect(() => {
    if (!selected || selected.counterpart_name) return;
    const match = conversations.find((c) => {
      const cp = counterpartOf(c);
      return c.item_id === selected.item_id && cp.id === selected.counterpart_id;
    });
    if (match) {
      const cp = counterpartOf(match);
      setSelected({ item_id: match.item_id, counterpart_id: cp.id, counterpart_name: cp.name, item_title: match.item_title });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, selected]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Messages</h1>
        <p className="page-lede">
          Conversations between you and other students about lost &amp; found items. An administrator can review
          any thread if needed.
        </p>
      </div>

      <div className="messages-shell">
        <div className="conv-list">
          {loadingList && conversations.length === 0 ? (
            <div className="loading-text">Loading…</div>
          ) : conversations.length === 0 ? (
            <div className="empty-state">
              No conversations yet. When you say &ldquo;I found this&rdquo; on a lost item, or someone responds to
              yours, it shows up here.
            </div>
          ) : (
            conversations.map((c) => {
              const cp = counterpartOf(c);
              const isActive = selected && selected.item_id === c.item_id && selected.counterpart_id === cp.id;
              const youSentLast = c.last_message_sender_id === user.id;
              return (
                <button
                  key={`${c.item_id}-${cp.id}`}
                  className={`conv-row${isActive ? " active" : ""}`}
                  onClick={() =>
                    setSelected({ item_id: c.item_id, counterpart_id: cp.id, counterpart_name: cp.name, item_title: c.item_title })
                  }
                >
                  <Avatar name={cp.name} />
                  <div className="conv-row-text">
                    <div className="conv-row-top">
                      <span className="conv-row-name">{cp.name}</span>
                      {c.unread_count > 0 && <span className="nav-badge">{c.unread_count}</span>}
                    </div>
                    <div className="conv-row-item">{c.item_title}</div>
                    <div className="conv-row-preview">
                      {youSentLast && <span className="conv-row-you">You: </span>}
                      {c.last_message}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="conv-thread">
          {selected ? (
            <Thread
              key={`${selected.item_id}-${selected.counterpart_id}`}
              itemId={selected.item_id}
              counterpartId={selected.counterpart_id}
              counterpartName={selected.counterpart_name}
              itemTitle={selected.item_title}
              token={token}
              onSent={() => {
                loadConversations();
                onChange?.();
              }}
            />
          ) : (
            <div className="empty-state" style={{ margin: 24 }}>
              Select a conversation to view it.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Thread({ itemId, counterpartId, counterpartName, itemTitle, token, onSent }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  function load() {
    api
      .getThread(itemId, counterpartId, token)
      .then(setMessages)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setLoading(true);
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, counterpartId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  async function send(e) {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api.sendMessage(itemId, { to_user_id: counterpartId, body: reply.trim() }, token);
      setReply("");
      load();
      onSent();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="thread-inner">
      <div className="thread-header">
        <Avatar name={counterpartName} size={32} />
        <div>
          <div className="thread-header-title">{counterpartName || "Conversation"}</div>
          {itemTitle && <div className="thread-header-sub">About &ldquo;{itemTitle}&rdquo;</div>}
        </div>
      </div>

      {loading ? (
        <div className="loading-text" style={{ margin: 24 }}>
          Loading…
        </div>
      ) : (
        <div className="thread-messages">
          {messages.length === 0 ? (
            <div className="empty-state" style={{ margin: 24 }}>
              No messages in this thread yet.
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === user.id;
              return (
                <div key={m.id} className={`msg-bubble-row ${mine ? "mine" : "theirs"}`}>
                  {!mine && <Avatar name={m.sender_name} size={26} />}
                  <div className="msg-bubble">
                    <div>{m.body}</div>
                    <div className="msg-bubble-time">{formatTime(m.created_at)}</div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {error && (
        <div className="error-banner" style={{ margin: "0 16px" }}>
          {error}
        </div>
      )}

      <form className="thread-composer" onSubmit={send}>
        <input
          type="text"
          placeholder="Type a message…"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
        />
        <button type="submit" className="btn btn-gold btn-sm" disabled={busy || !reply.trim()}>
          {busy ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}