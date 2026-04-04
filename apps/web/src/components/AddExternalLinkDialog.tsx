import { useState } from "react";
import { ASSET_CATEGORIES } from "@influencer-manager/shared/types/mobile";

interface AddExternalLinkDialogProps {
  onSubmit: (payload: {
    name: string;
    description?: string;
    source_type: string;
    file_url: string;
    category: string;
    tags: string[];
  }) => void;
  onClose: () => void;
  isPending?: boolean;
}

export function AddExternalLinkDialog({
  onSubmit,
  onClose,
  isPending,
}: AddExternalLinkDialogProps) {
  const [form, setForm] = useState({
    url: "",
    name: "",
    description: "",
    category: "other",
    tagsInput: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tags = form.tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    onSubmit({
      name: form.name,
      description: form.description || undefined,
      source_type: "external_link",
      file_url: form.url,
      category: form.category,
      tags,
    });
  }

  function formatCategoryLabel(category: string) {
    return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <h3>Add External Link</h3>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field field-span-2">
            <span>URL</span>
            <input
              type="url"
              required
              placeholder="https://..."
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            />
          </label>
          <label className="field field-span-2">
            <span>Name</span>
            <input
              required
              placeholder="Asset name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label className="field field-span-2">
            <span>Description</span>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>Category</span>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {ASSET_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {formatCategoryLabel(cat)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Tags</span>
            <input
              placeholder="tag1, tag2, tag3"
              value={form.tagsInput}
              onChange={(e) => setForm((f) => ({ ...f, tagsInput: e.target.value }))}
            />
          </label>
          <div className="field-span-2 form-actions">
            <button
              className="primary-button"
              type="submit"
              disabled={isPending}
            >
              {isPending ? "Adding..." : "Add Link"}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
