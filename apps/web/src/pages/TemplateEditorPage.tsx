import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  MESSAGE_TEMPLATE_CATEGORIES,
  TEMPLATE_MERGE_VARIABLES,
} from "@influencer-manager/shared/types/mobile";

import { ErrorState } from "../components/ErrorState";
import { LoadingPage } from "../components/LoadingPage";
import { PageSection } from "../components/PageSection";
import {
  useTemplate,
  useUpdateTemplateMutation,
  useCloneTemplateMutation,
} from "../hooks/use-messaging";

const SAMPLE_DATA: Record<string, string> = {
  influencer_first_name: "Jane",
  influencer_name: "Jane Smith",
  campaign_name: "Summer Campaign",
  action_title: "Instagram Post",
  company_name: "Acme Corp",
  due_date: "May 15, 2026",
};

function renderPreview(body: string): string {
  let result = body;
  for (const variable of TEMPLATE_MERGE_VARIABLES) {
    result = result.replaceAll(`{{${variable}}}`, SAMPLE_DATA[variable] ?? variable);
  }
  return result;
}

export function TemplateEditorPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const templateQuery = useTemplate(templateId);
  const updateMutation = useUpdateTemplateMutation(templateId!);
  const cloneMutation = useCloneTemplateMutation();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [form, setForm] = useState({
    name: "",
    subject: "",
    body: "",
    category: "custom",
  });
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (templateQuery.data && !initialized) {
      setForm({
        name: templateQuery.data.name,
        subject: templateQuery.data.subject,
        body: templateQuery.data.body,
        category: templateQuery.data.category,
      });
      setInitialized(true);
    }
  }, [templateQuery.data, initialized]);

  if (templateQuery.isLoading) {
    return <LoadingPage label="Loading template..." />;
  }

  if (templateQuery.isError) {
    return (
      <ErrorState
        message="Template could not be loaded."
        onRetry={() => {
          void templateQuery.refetch();
        }}
      />
    );
  }

  function insertVariable(variable: string) {
    const textarea = bodyRef.current;
    if (!textarea) return;

    const tag = `{{${variable}}}`;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentBody = form.body;
    const newBody =
      currentBody.slice(0, start) + tag + currentBody.slice(end);

    setForm((c) => ({ ...c, body: newBody }));

    // Restore cursor position after React re-renders
    requestAnimationFrame(() => {
      textarea.focus();
      const cursorPos = start + tag.length;
      textarea.setSelectionRange(cursorPos, cursorPos);
    });
  }

  return (
    <div className="page-stack">
      <div className="search-bar-row">
        <Link className="secondary-button" to="/templates">
          Back to Templates
        </Link>
        {templateQuery.data ? (
          <button
            className="secondary-button"
            type="button"
            disabled={cloneMutation.isPending}
            onClick={() =>
              cloneMutation.mutate(templateId!, {
                onSuccess: (cloned) => {
                  void navigate(`/templates/${cloned.id}`);
                },
              })
            }
          >
            {cloneMutation.isPending ? "Cloning..." : "Clone Template"}
          </button>
        ) : null}
      </div>

      <PageSection eyebrow="Edit" title={form.name || "Template"}>
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            updateMutation.mutate(
              {
                name: form.name,
                subject: form.subject,
                body: form.body,
                category: form.category,
              },
              {
                onSuccess: () => {
                  void navigate("/templates");
                },
              },
            );
          }}
        >
          <label className="field">
            <span>Name</span>
            <input
              value={form.name}
              onChange={(event) =>
                setForm((c) => ({ ...c, name: event.target.value }))
              }
              required
            />
          </label>
          <label className="field">
            <span>Category</span>
            <select
              value={form.category}
              onChange={(event) =>
                setForm((c) => ({ ...c, category: event.target.value }))
              }
            >
              {MESSAGE_TEMPLATE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="field field-span-2">
            <span>Subject</span>
            <input
              value={form.subject}
              onChange={(event) =>
                setForm((c) => ({ ...c, subject: event.target.value }))
              }
              required
            />
          </label>
          <label className="field field-span-2">
            <span>Body</span>
            <textarea
              ref={bodyRef}
              value={form.body}
              onChange={(event) =>
                setForm((c) => ({ ...c, body: event.target.value }))
              }
              rows={10}
              required
            />
          </label>

          <div className="field field-span-2">
            <span className="field-label">Insert variable</span>
            <div className="chip-row">
              {TEMPLATE_MERGE_VARIABLES.map((variable) => (
                <button
                  key={variable}
                  type="button"
                  className="chip"
                  onClick={() => insertVariable(variable)}
                >
                  {`{{${variable}}}`}
                </button>
              ))}
            </div>
          </div>

          {updateMutation.isError ? (
            <p className="error-copy field-span-2">
              {updateMutation.error.message}
            </p>
          ) : null}
          <div className="field-span-2 form-actions">
            <button
              className="primary-button"
              type="submit"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save template"}
            </button>
            <Link className="secondary-button" to="/templates">
              Cancel
            </Link>
          </div>
        </form>
      </PageSection>

      <PageSection eyebrow="Preview" title="Live Preview">
        <div className="template-preview">
          <p>
            <strong>Subject:</strong>{" "}
            {renderPreview(form.subject)}
          </p>
          <div className="template-preview-body">
            {renderPreview(form.body)
              .split("\n")
              .map((line, i) => (
                <p key={i}>{line || "\u00A0"}</p>
              ))}
          </div>
        </div>
      </PageSection>
    </div>
  );
}
