import { useState } from "react";
import { Link } from "react-router-dom";
import type { CampaignAssetRecord, AssetCategoryType } from "@influencer-manager/shared/types/mobile";

import { StatusBadge } from "./StatusBadge";
import { EmptyState } from "./EmptyState";

function categoryTone(category: AssetCategoryType): "neutral" | "info" | "primary" | "success" | "warning" | "danger" {
  switch (category) {
    case "logo":
    case "brand_guidelines":
      return "primary";
    case "product_photo":
    case "video_broll":
      return "success";
    case "copy_caption":
    case "hashtag_list":
      return "info";
    case "mood_board":
    case "template":
      return "warning";
    case "font":
    case "color_palette":
      return "neutral";
    default:
      return "neutral";
  }
}

function formatCategory(category: string) {
  return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatFileSize(bytes: number | null | undefined) {
  if (bytes == null || bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getDomainLabel(url: string) {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    if (hostname.includes("drive.google")) return "Google Drive";
    if (hostname.includes("dropbox")) return "Dropbox";
    if (hostname.includes("onedrive") || hostname.includes("sharepoint")) return "OneDrive";
    if (hostname.includes("box.com")) return "Box";
    return hostname;
  } catch {
    return "Link";
  }
}

function getAssetImageSrc(asset: CampaignAssetRecord): string | null {
  if (asset.thumbnail_url) return asset.thumbnail_url;
  const isImage = asset.mime_type?.startsWith("image/");
  const hasRenderableUrl = asset.file_url.startsWith("data:") || asset.file_url.startsWith("http");
  if (isImage && hasRenderableUrl) return asset.file_url;
  return null;
}

function getAssetIcon(asset: CampaignAssetRecord): string {
  if (asset.source_type === "external_link") return "🔗";
  if (asset.mime_type?.startsWith("image/")) return "🖼️";
  if (asset.mime_type?.startsWith("video/")) return "🎬";
  if (asset.mime_type?.includes("pdf")) return "📑";
  if (asset.mime_type?.includes("zip") || asset.mime_type?.includes("compressed")) return "📦";
  return "📄";
}

function AssetThumbnail({ asset }: { asset: CampaignAssetRecord }) {
  const src = getAssetImageSrc(asset);
  if (src) {
    return <img src={src} alt={asset.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
  }
  return (
    <div className="media-card-thumb">
      <span style={{ fontSize: 40 }}>{getAssetIcon(asset)}</span>
    </div>
  );
}

function AssetThumbnailSmall({ asset }: { asset: CampaignAssetRecord }) {
  const src = getAssetImageSrc(asset);
  if (src) {
    return <img src={src} alt={asset.name} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }} />;
  }
  return (
    <div style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-surface-subtle)", borderRadius: 4, fontSize: 18 }}>
      {getAssetIcon(asset)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Asset Detail Preview Dialog
// ---------------------------------------------------------------------------

function AssetPreviewDialog({
  asset,
  isReadOnly,
  onClose,
  onEdit,
  onDelete,
}: {
  asset: CampaignAssetRecord;
  isReadOnly: boolean;
  onClose: () => void;
  onEdit?: (asset: CampaignAssetRecord) => void;
  onDelete?: (asset: CampaignAssetRecord) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const imageSrc = getAssetImageSrc(asset);
  const isExternal = asset.source_type === "external_link";

  function handleDownload() {
    if (isExternal || !imageSrc) {
      window.open(asset.file_url, "_blank");
      return;
    }
    const a = document.createElement("a");
    a.href = imageSrc;
    a.download = asset.file_name ?? asset.name;
    a.click();
  }

  function handleShare() {
    const text = `${asset.name}${asset.description ? " — " + asset.description : ""}`;
    if (navigator.share) {
      void navigator.share({ title: asset.name, text, url: isExternal ? asset.file_url : undefined });
    } else {
      void navigator.clipboard.writeText(isExternal ? asset.file_url : text);
      // Simple feedback — clipboard copy
    }
  }

  function handleDeleteConfirm() {
    onDelete?.(asset);
    onClose();
  }

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div
        className="asset-preview-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="asset-preview-layout">
          {/* Left: metadata sidebar */}
          <div className="asset-preview-sidebar">
            <h3 style={{ margin: "0 0 16px", fontSize: 16, wordBreak: "break-word" }}>
              {asset.name}
            </h3>

            {asset.description ? (
              <div className="asset-preview-field">
                <span className="asset-preview-label">Description</span>
                <p style={{ margin: 0, fontSize: 13, color: "var(--color-ink-secondary)" }}>
                  {asset.description}
                </p>
              </div>
            ) : null}

            <div className="asset-preview-field">
              <span className="asset-preview-label">Category</span>
              <StatusBadge label={formatCategory(asset.category)} tone={categoryTone(asset.category)} />
            </div>

            <div className="asset-preview-field">
              <span className="asset-preview-label">Source</span>
              <span style={{ fontSize: 13 }}>
                {isExternal ? `External — ${getDomainLabel(asset.file_url)}` : "Upload"}
              </span>
            </div>

            {asset.file_name ? (
              <div className="asset-preview-field">
                <span className="asset-preview-label">File name</span>
                <span style={{ fontSize: 13, wordBreak: "break-all" }}>{asset.file_name}</span>
              </div>
            ) : null}

            {asset.mime_type ? (
              <div className="asset-preview-field">
                <span className="asset-preview-label">Type</span>
                <span style={{ fontSize: 13 }}>{asset.mime_type}</span>
              </div>
            ) : null}

            {asset.file_size_bytes ? (
              <div className="asset-preview-field">
                <span className="asset-preview-label">Size</span>
                <span style={{ fontSize: 13 }}>{formatFileSize(asset.file_size_bytes)}</span>
              </div>
            ) : null}

            {asset.tags.length > 0 ? (
              <div className="asset-preview-field">
                <span className="asset-preview-label">Tags</span>
                <div className="media-card-tags">
                  {asset.tags.map((tag) => (
                    <span key={tag} className="media-tag">{tag}</span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="asset-preview-field">
              <span className="asset-preview-label">Uploaded</span>
              <span style={{ fontSize: 13 }}>{formatShortDate(asset.created_at)}</span>
            </div>

            {asset.uploaded_by_name ? (
              <div className="asset-preview-field">
                <span className="asset-preview-label">By</span>
                <span style={{ fontSize: 13 }}>{asset.uploaded_by_name}</span>
              </div>
            ) : null}

            {/* Actions */}
            <div className="asset-preview-actions">
              <button className="primary-button" type="button" onClick={handleDownload}>
                {isExternal ? "Open Link" : "Download"}
              </button>
              <button className="secondary-button" type="button" onClick={handleShare}>
                Share
              </button>
              {!isReadOnly && onDelete ? (
                confirmDelete ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button className="danger-button" type="button" onClick={handleDeleteConfirm}>
                      Confirm
                    </button>
                    <button className="secondary-button" type="button" onClick={() => setConfirmDelete(false)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button className="danger-button" type="button" onClick={() => setConfirmDelete(true)}>
                    Delete
                  </button>
                )
              ) : null}
              {!isReadOnly && onEdit ? (
                <button className="secondary-button" type="button" onClick={() => { onEdit(asset); onClose(); }}>
                  Edit
                </button>
              ) : null}
            </div>
          </div>

          {/* Right: image preview */}
          <div className="asset-preview-image">
            {imageSrc ? (
              <div className="asset-preview-image-frame">
                <img src={imageSrc} alt={asset.name} />
              </div>
            ) : (
              <div className="asset-preview-image-frame asset-preview-icon-frame">
                <span style={{ fontSize: 80 }}>{getAssetIcon(asset)}</span>
              </div>
            )}
          </div>
        </div>

        <button
          className="secondary-button"
          type="button"
          onClick={onClose}
          style={{ position: "absolute", top: 12, right: 12, fontSize: 18, padding: "2px 8px", lineHeight: 1 }}
        >
          &times;
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grid Card
// ---------------------------------------------------------------------------

function AssetGridCard({
  asset,
  onClick,
}: {
  asset: CampaignAssetRecord;
  onClick: () => void;
}) {
  return (
    <div className="media-card" onClick={onClick}>
      <div className="media-card-thumb">
        <AssetThumbnail asset={asset} />
      </div>
      <div className="media-card-body">
        <p className="media-card-name">{asset.name}</p>
        <div className="media-card-meta">
          <StatusBadge label={formatCategory(asset.category)} tone={categoryTone(asset.category)} />
          {asset.file_size_bytes ? <span>{formatFileSize(asset.file_size_bytes)}</span> : null}
        </div>
        {asset.tags.length > 0 ? (
          <div className="media-card-tags">
            {asset.tags.map((tag) => (
              <span key={tag} className="media-tag">{tag}</span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MediaLibrary
// ---------------------------------------------------------------------------

interface MediaLibraryProps {
  assets: CampaignAssetRecord[];
  isLoading: boolean;
  campaignId?: string;
  isReadOnly: boolean;
  showCampaignName?: boolean;
  showCompanyName?: boolean;
  onRefresh?: () => void;
  onEdit?: (asset: CampaignAssetRecord) => void;
  onDelete?: (asset: CampaignAssetRecord) => void;
}

export function MediaLibrary({
  assets,
  isLoading,
  campaignId,
  isReadOnly,
  showCampaignName,
  showCompanyName,
  onRefresh,
  onEdit,
  onDelete,
}: MediaLibraryProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [previewAsset, setPreviewAsset] = useState<CampaignAssetRecord | null>(null);

  if (isLoading) {
    return <p className="muted">Loading assets...</p>;
  }

  if (assets.length === 0) {
    return (
      <EmptyState
        title="No media assets"
        message="Upload files or add external links to build this media library."
      />
    );
  }

  return (
    <>
      <div className="media-toolbar">
        <div className="view-toggle">
          <button
            className={viewMode === "grid" ? "view-toggle-active" : ""}
            type="button"
            onClick={() => setViewMode("grid")}
          >
            Grid
          </button>
          <button
            className={viewMode === "list" ? "view-toggle-active" : ""}
            type="button"
            onClick={() => setViewMode("list")}
          >
            List
          </button>
        </div>
        {onRefresh ? (
          <button className="secondary-button" type="button" onClick={onRefresh}>
            Refresh
          </button>
        ) : null}
      </div>

      {viewMode === "grid" ? (
        <div className="media-grid">
          {assets.map((asset) => (
            <AssetGridCard
              key={asset.id}
              asset={asset}
              onClick={() => setPreviewAsset(asset)}
            />
          ))}
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 50 }}></th>
              <th>Name</th>
              {showCampaignName ? <th>Campaign</th> : null}
              {showCompanyName ? <th>Company</th> : null}
              <th>Category</th>
              <th>Source</th>
              <th>Size</th>
              <th>Date</th>
              {campaignId == null && showCampaignName ? <th></th> : null}
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr
                key={asset.id}
                style={{ cursor: "pointer" }}
                onClick={() => setPreviewAsset(asset)}
              >
                <td>
                  <AssetThumbnailSmall asset={asset} />
                </td>
                <td><strong>{asset.name}</strong></td>
                {showCampaignName ? <td>{asset.campaign_name ?? "—"}</td> : null}
                {showCompanyName ? <td>{asset.company_name ?? "—"}</td> : null}
                <td>
                  <StatusBadge label={formatCategory(asset.category)} tone={categoryTone(asset.category)} />
                </td>
                <td style={{ fontSize: 13 }}>
                  {asset.source_type === "external_link"
                    ? getDomainLabel(asset.file_url)
                    : "Upload"}
                </td>
                <td style={{ fontSize: 13 }}>{formatFileSize(asset.file_size_bytes)}</td>
                <td style={{ fontSize: 13 }}>{formatShortDate(asset.created_at)}</td>
                {campaignId == null && showCampaignName ? (
                  <td>
                    <Link
                      className="secondary-button"
                      to={`/campaigns/${asset.campaign_id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      View in Campaign
                    </Link>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {previewAsset ? (
        <AssetPreviewDialog
          asset={previewAsset}
          isReadOnly={isReadOnly}
          onClose={() => setPreviewAsset(null)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ) : null}
    </>
  );
}
