import React, { useEffect, useState } from "react";
import type { CampaignCascadePreview } from "@influencer-manager/shared/types/mobile";

interface ConfirmCascadeDialogProps {
  campaignName: string;
  preview: CampaignCascadePreview;
  isExecuting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

const CONFIRM_DELAY_MS = 3000;

export function ConfirmCascadeDialog({
  campaignName,
  preview,
  isExecuting,
  error,
  onCancel,
  onConfirm,
}: ConfirmCascadeDialogProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(
    Math.ceil(CONFIRM_DELAY_MS / 1000),
  );

  useEffect(() => {
    if (secondsRemaining <= 0) return;

    const timer = setTimeout(() => {
      setSecondsRemaining((v) => v - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [secondsRemaining]);

  const confirmDisabled = secondsRemaining > 0 || isExecuting;

  return (
    <div className="confirm-overlay" onClick={isExecuting ? undefined : onCancel}>
      <div
        className="confirm-dialog cascade-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cascade-dialog-title"
      >
        <h3 id="cascade-dialog-title">Complete Campaign — Pending Changes</h3>

        <div className="cascade-dialog-body">
          <p>
            Completing <strong>{campaignName}</strong> will trigger the
            following changes:
          </p>

          <ul className="cascade-change-list">
            <li>
              <strong>{preview.missions_to_complete}</strong>{" "}
              {preview.missions_to_complete === 1 ? "mission" : "missions"} will
              be marked as completed
            </li>
            <li>
              <strong>{preview.actions_to_complete}</strong>{" "}
              {preview.actions_to_complete === 1 ? "action" : "actions"} will be
              marked as completed
            </li>
            <li>
              <strong>{preview.assignments_to_close}</strong> influencer{" "}
              {preview.assignments_to_close === 1
                ? "assignment"
                : "assignments"}{" "}
              will be closed
            </li>
            <li>
              <strong>{preview.influencers_to_notify}</strong>{" "}
              {preview.influencers_to_notify === 1
                ? "influencer"
                : "influencers"}{" "}
              will be notified that their remaining actions have been closed
            </li>
            <li>
              <strong>{preview.actions_with_media_in_progress}</strong>{" "}
              {preview.actions_with_media_in_progress === 1
                ? "action"
                : "actions"}{" "}
              with media already submitted will still be rated normally
            </li>
            <li>
              <strong>{preview.actions_without_media}</strong>{" "}
              {preview.actions_without_media === 1 ? "action" : "actions"} with
              no media submission will receive no rating
            </li>
          </ul>

          <p className="cascade-warning">
            These changes cannot be automatically reversed.
          </p>
        </div>

        {error ? <p className="error-copy">{error}</p> : null}

        <div className="confirm-dialog-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={onCancel}
            disabled={isExecuting}
          >
            Cancel
          </button>
          <button
            className="danger-button"
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {isExecuting
              ? "Completing..."
              : secondsRemaining > 0
                ? `Complete Campaign (${secondsRemaining}s)`
                : "Complete Campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}
