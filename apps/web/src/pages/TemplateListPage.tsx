import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MESSAGE_TEMPLATE_CATEGORIES } from "@influencer-manager/shared/types/mobile";

import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { PageSection } from "../components/PageSection";
import { StatusBadge } from "../components/StatusBadge";
import {
  useTemplateList,
  useCreateTemplateMutation,
  useCloneTemplateMutation,
  useDeleteTemplateMutation,
} from "../hooks/use-messaging";
import { formatDate } from "../utils/format";

function categoryTone(
  category: string,
): "neutral" | "info" | "primary" | "success" | "warning" | "danger" {
  if (category === "outreach") return "primary";
  if (category === "assignment_notification") return "info";
  if (category === "reminder") return "warning";
  if (category === "follow_up") return "success";
  if (category === "completion") return "success";
  if (category === "custom") return "neutral";
  return "neutral";
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

export function TemplateListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page") || DEFAULT_PAGE);
  const limit = Number(searchParams.get("limit") || DEFAULT_LIMIT);
  const search = searchParams.get("search") ?? "";
  const categoryFilter = searchParams.get("category") ?? "";

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    subject: "",
    body: "",
    category: "custom",
  });

  const { items, meta, isLoading, isError, query } = useTemplateList({
    page,
    limit,
    search: search || undefined,
    category: categoryFilter || undefined,
  });

  const createMutation = useCreateTemplateMutation();
  const cloneMutation = useCloneTemplateMutation();
  const deleteMutation = useDeleteTemplateMutation();

  function updateSearchParams(updates: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    }
    setSearchParams(next);
  }

  return (
    <div className="page-stack">
      <div className="search-bar-row">
        <input
          className="search-bar-input"
          type="search"
          value={search}
          placeholder="Search templates..."
          onChange={(event) => {
            updateSearchParams({
              search: event.target.value || undefined,
              page: undefined,
            });
          }}
        />
        <select
          value={categoryFilter}
          onChange={(event) => {
            updateSearchParams({
              category: event.target.value || undefined,
              page: undefined,
            });
          }}
        >
          <option value="">All categories</option>
          {MESSAGE_TEMPLATE_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <button
          className="primary-button"
          type="button"
          onClick={() => setShowCreateForm((v) => !v)}
        >
          {showCreateForm ? "Close" : "Create Template"}
        </button>
      </div>

      {showCreateForm ? (
        <PageSection eyebrow="Create" title="New template">
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate(
                {
                  name: form.name,
                  subject: form.subject,
                  body: form.body,
                  category: form.category,
                },
                {
                  onSuccess: () => {
                    setForm({
                      name: "",
                      subject: "",
                      body: "",
                      category: "custom",
                    });
                    setShowCreateForm(false);
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
                value={form.body}
                onChange={(event) =>
                  setForm((c) => ({ ...c, body: event.target.value }))
                }
                rows={5}
                required
              />
            </label>
            {createMutation.isError ? (
              <p className="error-copy field-span-2">
                {createMutation.error.message}
              </p>
            ) : null}
            <div className="field-span-2 form-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create template"}
              </button>
            </div>
          </form>
        </PageSection>
      ) : null}

      <PageSection eyebrow="List" title="Message Templates">
        {isLoading ? <p className="muted">Loading templates...</p> : null}
        {isError ? (
          <ErrorState
            message="Templates could not be loaded."
            onRetry={() => {
              void query.refetch();
            }}
          />
        ) : null}
        {!isLoading && !isError && items.length === 0 ? (
          <EmptyState
            title={search || categoryFilter ? "No templates match" : "No templates yet"}
            message={
              search || categoryFilter
                ? "Adjust search or category filter to find templates."
                : "Create the first template to get started."
            }
          />
        ) : null}
        {!isLoading && !isError && items.length > 0 ? (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Subject</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((template) => (
                  <tr key={template.id}>
                    <td>
                      <Link to={`/templates/${template.id}`}>
                        {template.name}
                      </Link>
                    </td>
                    <td>
                      <StatusBadge
                        label={template.category.replace(/_/g, " ")}
                        tone={categoryTone(template.category)}
                      />
                    </td>
                    <td>
                      {template.subject.length > 60
                        ? template.subject.slice(0, 60) + "..."
                        : template.subject}
                    </td>
                    <td>{formatDate(template.created_at)}</td>
                    <td>
                      <div className="inline-actions">
                        <Link
                          className="secondary-button"
                          to={`/templates/${template.id}`}
                        >
                          Edit
                        </Link>
                        <button
                          className="secondary-button"
                          type="button"
                          disabled={cloneMutation.isPending}
                          onClick={() => cloneMutation.mutate(template.id)}
                        >
                          Clone
                        </button>
                        {!template.is_default ? (
                          <button
                            className="secondary-button"
                            type="button"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete template "${template.name}"?`,
                                )
                              ) {
                                deleteMutation.mutate(template.id);
                              }
                            }}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {meta ? (
              <div className="list-pagination">
                <p className="muted">
                  Page {meta.page} of {meta.totalPages} &middot; {meta.total}{" "}
                  templates
                </p>
                <div className="inline-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() =>
                      updateSearchParams({
                        page:
                          page > 1 ? String(page - 1) : undefined,
                      })
                    }
                    disabled={meta.page <= 1}
                  >
                    Previous
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() =>
                      updateSearchParams({
                        page:
                          meta.totalPages > page
                            ? String(page + 1)
                            : String(page),
                      })
                    }
                    disabled={meta.page >= meta.totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </PageSection>
    </div>
  );
}
