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

function SourceIndicator({ asset }: { asset: CampaignAssetRecord }) {
  if (asset.source_type === "external_link") {
    return <span title={asset.file_url}>[link] {getDomainLabel(asset.file_url)}</span>;
  }
  return <span>Upload</span>;
}

function AssetThumbnail({ asset, size = 80 }: { asset: CampaignAssetRecord; size?: number }) {
  const isImage = asset.mime_type?.startsWith("image/");
  const isVideo = asset.mime_type?.startsWith("video/");

  if (asset.thumbnail_url) {
    return (
      <img
        src={asset.thumbnail_url}
        alt={asset.name}
        style={{ width: size, height: size, objectFit: "cover", borderRadius: 4 }}
      />
    );
  }

  if (isImage && asset.source_type === "upload") {
    return (
      <img
        src={asset.file_url}
        alt={asset.name}
        style={{ width: size, height: size, objectFit: "cover", borderRadius: 4 }}
      />
    );
  }

  const iconLabel =
    asset.source_type === "external_link"
      ? "[link]"
      : isVideo
        ? "[vid]"
        : "[file]";

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--surface-secondary, #f3f4f6)",
        borderRadius: 4,
        fontSize: size > 50 ? 14 : 11,
        color: "var(--text-muted, #6b7280)",
      }}
    >
      {iconLabel}
    </div>
  );
}

function AssetGridCard({
  asset,
  isReadOnly,
  onEdit,
  onDelete,
}: {
  asset: CampaignAssetRecord;
  isReadOnly: boolean;
  onEdit?: (asset: CampaignAssetRecord) => void;
  onDelete?: (asset: CampaignAssetRecord) => void;
}) {
  return (
    <div className="panel" style={{ padding: 12 }}>
      <div style={{ display: "flex", gap: 12 }}>
        <a
          href={asset.file_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ flexShrink: 0 }}
        >
          <AssetThumbnail asset={asset} size={80} />
        </a>
        <div style={{ flex: 1, minWidth: 0 }}>
          <a
            href={asset.file_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontWeight: 600, wordBreak: "break-word" }}
          >
            {asset.name}
          </a>
          <div style={{ marginTop: 4 }}>
            <StatusBadge label={formatCategory(asset.category)} tone={categoryTone(asset.category)} />
          </div>
          {asset.tags.length > 0 ? (
            <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4 }}>
              {asset.tags.map((tag) => (
                <span key={tag} className="badge badge-neutral" style={{ fontSize: 11 }}>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
            <SourceIndicator asset={asset} />
            {asset.file_size_bytes ? ` · ${formatFileSize(asset.file_size_bytes)}` : null}
          </div>
        </div>
      </div>
      {!isReadOnly ? (
        <div className="inline-actions" style={{ marginTop: 8 }}>
          <button
            className="secondary-button"
            type="button"
            onClick={() => onEdit?.(asset)}
          >
            Edit
          </button>
          <button
            className="danger-button"
            type="button"
            onClick={() => onDelete?.(asset)}
          >
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}

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
  const [confirmDeleteAsset, setConfirmDeleteAsset] = useState<CampaignAssetRecord | null>(null);

  function handleDeleteClick(asset: CampaignAssetRecord) {
    setConfirmDeleteAsset(asset);
  }

  function handleDeleteConfirm() {
    if (confirmDeleteAsset) {
      onDelete?.(confirmDeleteAsset);
      setConfirmDeleteAsset(null);
    }
  }

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
      <div className="inline-actions" style={{ marginBottom: 12 }}>
        <button
          className={viewMode === "grid" ? "primary-button" : "secondary-button"}
          type="button"
          onClick={() => setViewMode("grid")}
        >
          Grid
        </button>
        <button
          className={viewMode === "list" ? "primary-button" : "secondary-button"}
          type="button"
          onClick={() => setViewMode("list")}
        >
          List
        </button>
        {onRefresh ? (
          <button className="secondary-button" type="button" onClick={onRefresh}>
            Refresh
          </button>
        ) : null}
      </div>

      {viewMode === "grid" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          {assets.map((asset) => (
            <AssetGridCard
              key={asset.id}
              asset={asset}
              isReadOnly={isReadOnly}
              onEdit={onEdit}
              onDelete={handleDeleteClick}
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
              {!isReadOnly ? <th></th> : null}
              {campaignId == null && showCampaignName ? <th></th> : null}
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id}>
                <td>
                  <a href={asset.file_url} target="_blank" rel="noopener noreferrer">
                    <AssetThumbnail asset={asset} size={40} />
                  </a>
                </td>
                <td>
                  <a href={asset.file_url} target="_blank" rel="noopener noreferrer">
                    <strong>{asset.name}</strong>
                  </a>
                </td>
                {showCampaignName ? <td>{asset.campaign_name ?? "—"}</td> : null}
                {showCompanyName ? <td>{asset.company_name ?? "—"}</td> : null}
                <td>
                  <StatusBadge label={formatCategory(asset.category)} tone={categoryTone(asset.category)} />
                </td>
                <td><SourceIndicator asset={asset} /></td>
                <td>{formatFileSize(asset.file_size_bytes)}</td>
                <td>{formatShortDate(asset.created_at)}</td>
                {!isReadOnly ? (
                  <td>
                    <div className="inline-actions">
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => onEdit?.(asset)}
                      >
                        Edit
                      </button>
                      <button
                        className="danger-button"
                        type="button"
                        onClick={() => handleDeleteClick(asset)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                ) : null}
                {campaignId == null && showCampaignName ? (
                  <td>
                    <Link className="secondary-button" to={`/campaigns/${asset.campaign_id}`}>
                      View in Campaign
                    </Link>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {confirmDeleteAsset ? (
        <div className="confirm-overlay" onClick={() => setConfirmDeleteAsset(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Delete asset</h3>
            <p>
              Are you sure you want to delete <strong>{confirmDeleteAsset.name}</strong>?
              This action cannot be undone.
            </p>
            <div className="inline-actions" style={{ marginTop: 16 }}>
              <button
                className="danger-button"
                type="button"
                onClick={handleDeleteConfirm}
              >
                Delete
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setConfirmDeleteAsset(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
