import { useEffect, useRef, useState, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { conversationsApi } from "../services/api";

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [body, setBody] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["influencer", "conversation-messages", id],
    queryFn: () => conversationsApi.getMessages(id!, { limit: 200 }),
    enabled: !!id,
  });

  // Mark as read on mount
  useEffect(() => {
    if (id) {
      void conversationsApi.markRead(id).then(() => {
        void queryClient.invalidateQueries({ queryKey: ["influencer", "conversations"] });
      });
    }
  }, [id, queryClient]);

  const messages = data?.data ?? [];

  // Auto-scroll to bottom when messages load or change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (messageBody: string) =>
      conversationsApi.sendMessage(id!, messageBody),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["influencer", "conversation-messages", id],
      });
      void queryClient.invalidateQueries({
        queryKey: ["influencer", "conversations"],
      });
    },
  });

  function handleSend(e: FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || sendMutation.isPending) return;
    setBody("");
    sendMutation.mutate(trimmed);
  }

  return (
    <>
      <button className="back-btn" onClick={() => navigate("/inbox")} type="button">
        &#8592; Inbox
      </button>

      {isLoading && (
        <div className="chat-thread">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{
                width: i % 2 === 0 ? "65%" : "55%",
                height: 48,
                borderRadius: 16,
                alignSelf: i % 2 === 0 ? "flex-start" : "flex-end",
              }}
            />
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="chat-thread">
          {messages.length === 0 && (
            <div className="empty-state">
              <h3>No messages yet</h3>
              <p>Start the conversation below.</p>
            </div>
          )}
          {messages.map((msg) => {
            const isSelf = msg.sender_type === "influencer";
            const isSystem = msg.sender_type === "system";

            const bubbleClass = isSystem
              ? "chat-bubble chat-bubble-system"
              : isSelf
                ? "chat-bubble chat-bubble-self"
                : "chat-bubble chat-bubble-other";

            return (
              <div key={msg.id} className={bubbleClass}>
                {!isSelf && !isSystem && (
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>
                    {msg.sender_name}
                  </div>
                )}
                <div>{msg.body}</div>
                <div className={`chat-meta ${isSelf ? "chat-meta-self" : ""}`}>
                  {formatTimestamp(msg.created_at)}
                  {msg.sent_via_email && " (via email)"}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}

      <form className="chat-input-bar" onSubmit={handleSend}>
        <input
          type="text"
          placeholder="Type a message..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          autoComplete="off"
        />
        <button type="submit" disabled={!body.trim() || sendMutation.isPending}>
          Send
        </button>
      </form>
    </>
  );
}
