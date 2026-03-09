import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client";
import {
  CONVERSATION,
  MY_CONVERSATIONS,
  MY_UNREAD_MESSAGES_COUNT,
} from "../../apollo/queries";
import { SEND_MESSAGE, MARK_CONVERSATION_READ } from "../../apollo/mutations";
import { useAuth } from "../../auth/AuthProvider";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import UserAvatar from "../../components/shared/UserAvatar";

function formatTime(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (isToday) return time;
  if (isYesterday) return `Yesterday ${time}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

export default function ConversationView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const { data, loading } = useQuery(CONVERSATION, {
    variables: { id },
    fetchPolicy: "cache-and-network",
    pollInterval: 5000,
  });

  const conversation = data?.conversation;
  const other = conversation?.otherParticipant;
  const messages = conversation?.messages || [];

  useDocumentTitle(
    other ? `Chat with ${other.name || other.email}` : "Messages"
  );

  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE, {
    refetchQueries: [
      { query: CONVERSATION, variables: { id } },
      { query: MY_CONVERSATIONS },
      { query: MY_UNREAD_MESSAGES_COUNT },
    ],
  });

  const [markRead] = useMutation(MARK_CONVERSATION_READ, {
    refetchQueries: [
      { query: MY_CONVERSATIONS },
      { query: MY_UNREAD_MESSAGES_COUNT },
    ],
  });

  // Mark as read when opening
  useEffect(() => {
    if (conversation && conversation.unreadCount > 0) {
      markRead({ variables: { conversationId: id } });
    }
  }, [conversation?.unreadCount, id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e) {
    e.preventDefault();
    if (!body.trim() || sending) return;

    await sendMessage({
      variables: { conversationId: id, body: body.trim() },
    });
    setBody("");
    inputRef.current?.focus();
  }

  if (loading && !conversation) {
    return (
      <div className="flex items-center justify-center py-12 text-[var(--app-muted)]">
        Loading...
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-[var(--app-muted)]">Conversation not found</p>
        <button
          type="button"
          onClick={() => navigate("/messages")}
          className="mt-3 text-sm text-sky-400 hover:text-sky-300"
        >
          Back to messages
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--app-border)] pb-4 mb-4">
        <button
          type="button"
          onClick={() => navigate("/messages")}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-panel-2)] hover:text-[var(--app-fg)] transition"
          aria-label="Back"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <UserAvatar user={other} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[var(--app-fg)] truncate">
            {other?.name || other?.email || "Unknown"}
          </div>
          <div className="text-xs text-[var(--app-muted)] capitalize">
            {other?.roleName}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pb-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-[var(--app-muted)] py-8">
            No messages yet. Say hello!
          </p>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender.id === user?.id;
          return (
            <div
              key={msg.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex items-end gap-2 max-w-[75%] ${isMine ? "flex-row-reverse" : ""}`}>
                {!isMine && <UserAvatar user={msg.sender} size="md" />}
                <div>
                  <div
                    className={`rounded-2xl px-4 py-2 text-sm ${
                      isMine
                        ? "bg-sky-500 text-white rounded-br-md"
                        : "bg-[var(--app-panel-2)] text-[var(--app-fg)] rounded-bl-md"
                    }`}
                  >
                    {msg.body}
                  </div>
                  <div
                    className={`text-[10px] text-[var(--app-muted)] mt-1 ${
                      isMine ? "text-right" : "text-left"
                    }`}
                  >
                    {formatTime(msg.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-[var(--app-border)] pt-4"
      >
        <input
          ref={inputRef}
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel-2)] px-4 py-2.5 text-sm text-[var(--app-fg)] placeholder:text-[var(--app-muted)] outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          autoFocus
        />
        <button
          type="submit"
          disabled={!body.trim() || sending}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-white hover:bg-sky-400 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          aria-label="Send"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
            />
          </svg>
        </button>
      </form>
    </div>
  );
}