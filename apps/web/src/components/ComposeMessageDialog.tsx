import { useState } from "react";

import {
  useTemplateList,
  useCreateConversationMutation,
} from "../hooks/use-messaging";

interface ComposeMessageDialogProps {
  influencerId: string;
  influencerName: string;
  defaultSubject?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ComposeMessageDialog({
  influencerId,
  influencerName,
  defaultSubject,
  relatedEntityType,
  relatedEntityId,
  onClose,
  onSuccess,
}: ComposeMessageDialogProps) {
  const [subject, setSubject] = useState(defaultSubject ?? "");
  const [body, setBody] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [sendEmail, setSendEmail] = useState(false);

  const { items: templates, isLoading: templatesLoading } = useTemplateList({
    limit: 100,
  });
  const createConversation = useCreateConversationMutation();

  function handleTemplateChange(templateId: string) {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;

    createConversation.mutate(
      {
        subject: subject.trim(),
        influencer_id: influencerId,
        related_entity_type: relatedEntityType,
        related_entity_id: relatedEntityId,
        initial_message: body.trim(),
      },
      {
        onSuccess: () => {
          onSuccess();
          onClose();
        },
      },
    );
  }

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div
        className="confirm-dialog cascade-dialog"
        style={{ maxWidth: 560 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Message {influencerName}</h3>

        <form onSubmit={handleSubmit}>
          <div className="cascade-dialog-body">
            <div className="form-field">
              <label htmlFor="compose-template">Template (optional)</label>
              <select
                id="compose-template"
                className="form-input"
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                disabled={templatesLoading}
              >
                <option value="">-- No template --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="compose-subject">Subject</label>
              <input
                id="compose-subject"
                className="form-input"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter subject..."
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="compose-body">Message</label>
              <textarea
                id="compose-body"
                className="form-input"
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message..."
                required
              />
            </div>

            <label className="compose-email-checkbox">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
              />
              Also send via email
            </label>
          </div>

          <div className="confirm-dialog-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="primary-button"
              type="submit"
              disabled={
                createConversation.isPending ||
                !subject.trim() ||
                !body.trim()
              }
            >
              {createConversation.isPending ? "Sending..." : "Send Message"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
