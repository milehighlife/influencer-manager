import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ErrorState } from "../components/ErrorState";
import { LoadingPage } from "../components/LoadingPage";
import { PageSection } from "../components/PageSection";
import {
  useConversation,
  useConversationMessages,
  useSendMessageMutation,
  useMarkConversationReadMutation,
  useTemplateList,
} from "../hooks/use-messaging";
import { formatDate } from "../utils/format";

const ENTITY_ROUTE_MAP: Record<string, string> = {
  campaign: "/campaigns",
  mission: "/campaigns", // missions are nested under campaigns
  action: "/actions",
  assignment: "/campaigns",
};

export function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const conversationQuery = useConversation(conversationId);
  const messagesQuery = useConversationMessages(conversationId);
  const sendMutation = useSendMessageMutation(conversationId!);
  const markReadMutation = useMarkConversationReadMutation();
  const { items: templates } = useTemplateList({ limit: 100 });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [composeBody, setComposeBody] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [sendViaEmail, setSendViaEmail] = useState(false);
  const [markedRead, setMarkedRead] = useState(false);

  // Mark as read on load
  useEffect(() => {
    if (conversationId && !markedRead) {
      markReadMutation.mutate(conversationId);
      setMarkedRead(true);
    }
  }, [conversationId, markedRead]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom when messages load
  const messages = messagesQuery.data?.data ?? [];
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  // Apply template to compose body
  function handleTemplateSelect(templateId: string) {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setComposeBody(template.body);
    }
  }

  if (conversationQuery.isLoading) {
    return <LoadingPage label="Loading conversation..." />;
  }

  if (conversationQuery.isError) {
    return (
      <ErrorState
        message="Conversation could not be loaded."
        onRetry={() => {
          void conversationQuery.refetch();
        }}
      />
    );
  }

  const conversation = conversationQuery.data;
  if (!conversation) return null;

  const entityLink =
    conversation.related_entity_type && conversation.related_entity_id
      ? `${ENTITY_ROUTE_MAP[conversation.related_entity_type] ?? ""}/${conversation.related_entity_id}`
      : null;

  return (
    <div className="page-stack">
      <div className="search-bar-row">
        <Link className="secondary-button" to="/inbox">
          Back to Inbox
        </Link>
      </div>

      <PageSection eyebrow="Conversation" title={conversation.subject}>
        <div className="conversation-meta">
          <p className="muted">
            <strong>Participants:</strong>{" "}
            {conversation.participants.map((p) => p.name).join(", ")}
          </p>
          {entityLink ? (
            <p className="muted">
              <strong>Related:</strong>{" "}
              <Link to={entityLink}>
                {conversation.related_entity_type} &rarr;{" "}
                {conversation.related_entity_id}
              </Link>
            </p>
          ) : null}
        </div>
      </PageSection>

      <PageSection eyebrow="Thread" title="Messages">
        {messagesQuery.isLoading ? (
          <p className="muted">Loading messages...</p>
        ) : null}
        {messagesQuery.isError ? (
          <ErrorState
            message="Messages could not be loaded."
            onRetry={() => {
              void messagesQuery.refetch();
            }}
          />
        ) : null}
        {!messagesQuery.isLoading && !messagesQuery.isError ? (
          <div className="message-thread">
            {messages.length === 0 ? (
              <p className="muted">No messages in this conversation yet.</p>
            ) : null}
            {messages.map((message) => {
              const isSystem = message.sender_type === "system";
              return (
                <div
                  key={message.id}
                  className={`message-bubble ${isSystem ? "message-system" : ""}`}
                  style={
                    isSystem
                      ? {
                          textAlign: "center",
                          color: "var(--color-muted, #6b7280)",
                          fontSize: "0.85rem",
                          padding: "0.5rem 0",
                        }
                      : {
                          padding: "0.75rem",
                          borderBottom:
                            "1px solid var(--color-border, #e5e7eb)",
                        }
                  }
                >
                  {!isSystem ? (
                    <div
                      className="message-header"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.25rem",
                      }}
                    >
                      <strong>{message.sender_name ?? "Unknown"}</strong>
                      <span className="muted" style={{ fontSize: "0.85rem" }}>
                        {formatDate(message.created_at, { mode: "datetime" })}
                        {message.sent_via_email ? " (via email)" : ""}
                      </span>
                    </div>
                  ) : null}
                  <div className="message-body">
                    {message.body.split("\n").map((line, i) => (
                      <p key={i} style={{ margin: "0.15rem 0" }}>
                        {line || "\u00A0"}
                      </p>
                    ))}
                  </div>
                  {isSystem ? (
                    <span
                      className="muted"
                      style={{ fontSize: "0.75rem" }}
                    >
                      {formatDate(message.created_at, { mode: "datetime" })}
                    </span>
                  ) : null}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        ) : null}
      </PageSection>

      <PageSection eyebrow="Compose" title="Send a message">
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            if (!composeBody.trim()) return;
            sendMutation.mutate(
              {
                body: composeBody,
                template_id: selectedTemplateId || undefined,
                sent_via_email: sendViaEmail || undefined,
              },
              {
                onSuccess: () => {
                  setComposeBody("");
                  setSelectedTemplateId("");
                  setSendViaEmail(false);
                },
              },
            );
          }}
        >
          <label className="field field-span-2">
            <span>Use template</span>
            <select
              value={selectedTemplateId}
              onChange={(event) => handleTemplateSelect(event.target.value)}
            >
              <option value="">No template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field field-span-2">
            <span>Message</span>
            <textarea
              value={composeBody}
              onChange={(event) => setComposeBody(event.target.value)}
              rows={4}
              required
            />
          </label>
          <label className="field" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="checkbox"
              checked={sendViaEmail}
              onChange={(event) => setSendViaEmail(event.target.checked)}
              style={{ width: "auto" }}
            />
            <span>Also send via email</span>
          </label>
          {sendMutation.isError ? (
            <p className="error-copy field-span-2">
              {sendMutation.error.message}
            </p>
          ) : null}
          <div className="field-span-2 form-actions">
            <button
              className="primary-button"
              type="submit"
              disabled={sendMutation.isPending || !composeBody.trim()}
            >
              {sendMutation.isPending ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </PageSection>
    </div>
  );
}
