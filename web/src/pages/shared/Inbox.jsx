import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useNavigate } from "react-router-dom";
import {
  MY_CONVERSATIONS,
  MESSAGEABLE_USERS,
  MY_UNREAD_MESSAGES_COUNT,
} from "../../apollo/queries";
import { CREATE_CONVERSATION } from "../../apollo/mutations";
import { useAuth } from "../../auth/AuthProvider";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import UserAvatar from "../../components/shared/UserAvatar";

function timeAgo(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

function NewConversationModal({ onClose, onCreated }) {
  const [search, setSearch] = useState("");
  const { data, loading } = useQuery(MESSAGEABLE_USERS);
  const [createConversation] = useMutation(CREATE_CONVERSATION, {
    refetchQueries: [{ query: MY_CONVERSATIONS }],
  });

  const users = (data?.messageableUsers || []).filter(
    (u) =>
      !search ||
      (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  async function handleSelect(userId) {
    const { data: result } = await createConversation({
      variables: { recipientId: userId },
    });
    if (result?.createConversation?.conversation) {
      onCreated(result.createConversation.conversation.id);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative w-full max-w-md rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-[var(--app-fg)] mb-4">
          New conversation
        </h2>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-2)] px-3 py-2 text-sm text-[var(--app-fg)] placeholder:text-[var(--app-muted)] outline-none focus:border-sky-500 mb-3"
          autoFocus
        />
        <div className="max-h-64 overflow-y-auto space-y-1">
          {loading && (
            <p className="text-sm text-[var(--app-muted)] py-4 text-center">
              Loading...
            </p>
          )}
          {!loading && users.length === 0 && (
            <p className="text-sm text-[var(--app-muted)] py-4 text-center">
              No users available
            </p>
          )}
          {users.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => handleSelect(u.id)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-[var(--app-panel-2)] transition"
            >
              <UserAvatar user={u} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-[var(--app-fg)] truncate">
                  {u.name || u.email}
                </div>
                <div className="text-xs text-[var(--app-muted)] capitalize">
                  {u.roleName}
                </div>
              </div>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-lg border border-[var(--app-border)] px-3 py-2 text-sm text-[var(--app-muted)] hover:bg-[var(--app-panel-2)] transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function Inbox() {
  useDocumentTitle("Messages");
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showNew, setShowNew] = useState(false);

  const { data, loading } = useQuery(MY_CONVERSATIONS, {
    fetchPolicy: "cache-and-network",
    pollInterval: 30000,
  });

  const conversations = data?.myConversations || [];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--app-fg)]">Messages</h1>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-[var(--app-on-accent)] hover:bg-sky-400 transition"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          New message
        </button>
      </div>

      {loading && conversations.length === 0 && (
        <div className="text-center py-12 text-[var(--app-muted)]">
          Loading...
        </div>
      )}

      {!loading && conversations.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">💬</div>
          <p className="text-[var(--app-muted)]">No conversations yet</p>
          <p className="text-sm text-[var(--app-muted)] mt-1">
            Start a new conversation to begin messaging
          </p>
        </div>
      )}

      <div className="space-y-1">
        {conversations.map((conv) => {
          const other = conv.otherParticipant;
          const last = conv.lastMessage;
          const unread = conv.unreadCount > 0;

          return (
            <button
              key={conv.id}
              type="button"
              onClick={() => navigate(`/messages/${conv.id}`)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition hover:bg-[var(--app-panel-2)] ${
                unread
                  ? "bg-sky-500/5 border border-sky-500/20"
                  : "border border-transparent"
              }`}
            >
              <div className="relative">
                <UserAvatar user={other} size="lg" />
                {unread && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-[9px] font-bold text-white">
                    {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-sm truncate ${
                      unread
                        ? "font-semibold text-[var(--app-fg)]"
                        : "font-medium text-[var(--app-fg)]"
                    }`}
                  >
                    {other?.name || other?.email || "Unknown"}
                  </span>
                  {last && (
                    <span className="text-xs text-[var(--app-muted)] shrink-0">
                      {timeAgo(last.createdAt)}
                    </span>
                  )}
                </div>
                {last && (
                  <p
                    className={`text-xs truncate mt-0.5 ${
                      unread
                        ? "text-[var(--app-fg)]"
                        : "text-[var(--app-muted)]"
                    }`}
                  >
                    {last.sender.id === user?.id ? "You: " : ""}
                    {last.body}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {showNew && (
        <NewConversationModal
          onClose={() => setShowNew(false)}
          onCreated={(id) => {
            setShowNew(false);
            navigate(`/messages/${id}`);
          }}
        />
      )}
    </div>
  );
}