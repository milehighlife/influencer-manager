import { useCallback, useRef, useState } from "react";

interface UploadItem {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

interface AssetUploadZoneProps {
  onCreate: (payload: {
    name: string;
    source_type: string;
    file_url: string;
    file_name: string;
    file_size_bytes: number;
    mime_type: string;
    category: string;
    thumbnail_url?: string;
  }) => Promise<void>;
}

export function AssetUploadZone({ onCreate }: AssetUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const newItems: UploadItem[] = fileArray.map((file) => ({
        file,
        status: "pending" as const,
      }));

      setUploads((prev) => [...prev, ...newItems]);

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];

        setUploads((prev) => {
          const copy = [...prev];
          const idx = copy.length - fileArray.length + i;
          copy[idx] = { ...copy[idx], status: "uploading" };
          return copy;
        });

        try {
          const fileUrl = `/uploads/placeholder/${encodeURIComponent(file.name)}`;

          // Generate a small thumbnail for images
          let thumbnailUrl: string | undefined;
          if (file.type.startsWith("image/")) {
            try {
              thumbnailUrl = await new Promise<string>((resolve, reject) => {
                const img = new Image();
                const objectUrl = URL.createObjectURL(file);
                img.onload = () => {
                  const canvas = document.createElement("canvas");
                  const maxSize = 200;
                  const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
                  canvas.width = img.width * scale;
                  canvas.height = img.height * scale;
                  const ctx = canvas.getContext("2d");
                  ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                  URL.revokeObjectURL(objectUrl);
                  resolve(canvas.toDataURL("image/jpeg", 0.7));
                };
                img.onerror = () => {
                  URL.revokeObjectURL(objectUrl);
                  reject(new Error("Failed to load image"));
                };
                img.src = objectUrl;
              });
            } catch {
              // Ignore thumbnail generation failure
            }
          }

          await onCreate({
            name: file.name,
            source_type: "upload",
            file_url: fileUrl,
            file_name: file.name,
            file_size_bytes: file.size,
            mime_type: file.type,
            category: "other",
            thumbnail_url: thumbnailUrl,
          });

          setUploads((prev) => {
            const copy = [...prev];
            const idx = copy.length - fileArray.length + i;
            copy[idx] = { ...copy[idx], status: "done" };
            return copy;
          });
        } catch (err) {
          setUploads((prev) => {
            const copy = [...prev];
            const idx = copy.length - fileArray.length + i;
            copy[idx] = {
              ...copy[idx],
              status: "error",
              error: err instanceof Error ? err.message : "Upload failed",
            };
            return copy;
          });
        }
      }
    },
    [onCreate],
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      void processFiles(e.dataTransfer.files);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      void processFiles(e.target.files);
      e.target.value = "";
    }
  }

  return (
    <div>
      <div
        className="panel"
        style={{
          padding: 32,
          textAlign: "center",
          cursor: "pointer",
          border: isDragOver ? "2px dashed var(--accent, #3b82f6)" : "2px dashed var(--border, #d1d5db)",
          borderRadius: 8,
          backgroundColor: isDragOver ? "var(--surface-hover, #f0f7ff)" : undefined,
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <p style={{ margin: 0, fontWeight: 500 }}>Drop files here or click to upload</p>
        <p className="muted" style={{ margin: "4px 0 0" }}>
          Accepts multiple files
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>

      {uploads.length > 0 ? (
        <div style={{ marginTop: 12 }}>
          {uploads.map((item, index) => (
            <div
              key={`${item.file.name}-${index}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 0",
                fontSize: 13,
              }}
            >
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.file.name}
              </span>
              {item.status === "pending" ? (
                <span className="muted">Pending</span>
              ) : null}
              {item.status === "uploading" ? (
                <span className="muted">Uploading...</span>
              ) : null}
              {item.status === "done" ? (
                <span style={{ color: "var(--success, #16a34a)" }}>Done</span>
              ) : null}
              {item.status === "error" ? (
                <span className="error-copy">{item.error ?? "Failed"}</span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
