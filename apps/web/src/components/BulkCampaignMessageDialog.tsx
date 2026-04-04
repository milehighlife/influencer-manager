import { useState } from "react";

import {
  useTemplateList,
  useBulkOutreachMutation,
} from "../hooks/use-messaging";

interface BulkCampaignMessageDialogProps {
  campaignId: string;
  campaignName: string;
  influencerIds: string[];
  influencerCount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkCampaignMessageDialog({
  campaignId,
  campaignName,
  influencerIds,
  influencerCount,
  onClose,
  onSuccess,
}: BulkCampaignMessageDialogProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [sendEmail, setSendEmail] = useState(false);

  const { items: templates, isLoading: templatesLoading } = useTemplateList({
    limit: 100,
  });
  const bulkOutreach = useBulkOutreachMutation();

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

    bulkOutreach.mutate(
      {
        template_id: selectedTemplateId || undefined,
        influencer_ids: influencerIds,
        subject: subject.trim(),
        body: body.trim(),
        related_entity_type: "campaign",
        related_entity_id: campaignId,
        send_email: sendEmail,
      },
      {
        onSuccess: () => {
          onSuccess();
          onClose();
        },
      },
    );
  }

  const hasTemplate = Boolean(selectedTemplateId);

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div
        className="confirm-dialog cascade-dialog"
        style={{ maxWidth: 600 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Message All Influencers</h3>
        <p className="muted" style={{ margin: "0 0 16px", fontSize: 14 }}>
          Send a message to <strong>{influencerCount}</strong>{" "}
          {influencerCount === 1 ? "influencer" : "influencers"} assigned to{" "}
          <strong>{campaignName}</strong>. Each influencer will receive an
          individual conversation. Template variables like{" "}
          <code>{"{{influencer_first_name}}"}</code> will be resolved per
          recipient.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="cascade-dialog-body">
            <label className="field" style={{ marginBottom: 12 }}>
              <span>Message Template</span>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                disabled={templatesLoading}
              >
                <option value="">— Select a template (optional) —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.category})
                  </option>
                ))}
              </select>
            </label>

            <label className="field" style={{ marginBottom: 12 }}>
              <span>Subject</span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter subject..."
                required
              />
            </label>

            <label className="field" style={{ marginBottom: 12 }}>
              <span>Message</span>
              <textarea
                rows={8}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message..."
                required
              />
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                color: "var(--color-ink-secondary)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
              />
              Also send via email
            </label>
          </div>

          {bulkOutreach.isError ? (
            <p className="error-copy" style={{ marginTop: 8 }}>
              Failed to send. Please try again.
            </p>
          ) : null}

          <div className="confirm-dialog-actions" style={{ marginTop: 16 }}>
            <button
              className="secondary-button"
              type="button"
              onClick={onClose}
              disabled={bulkOutreach.isPending}
            >
              Cancel
            </button>
            <button
              className="primary-button"
              type="submit"
              disabled={
                bulkOutreach.isPending ||
                !subject.trim() ||
                (!hasTemplate && !body.trim())
              }
            >
              {bulkOutreach.isPending
                ? "Sending..."
                : `Send to ${influencerCount} Influencer${influencerCount === 1 ? "" : "s"}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
