"use client";
import * as React from "react";
import { Upload, FileText, X, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

// Accepted upload types (images + PDF).
const DOC_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

// Controlled multi-file picker for verification documents. Holds the actual
// File[] (parent state); the parent derives upload metadata (type/ext) and PUTs
// the bytes to presigned URLs after registration. Native input — no extra deps.
export function DocumentUpload({
  value,
  onChange,
  error,
  maxFiles = 10,
}: {
  value: File[];
  onChange: (files: File[]) => void;
  error?: string;
  maxFiles?: number;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const atLimit = value.length >= maxFiles;

  // Object URLs so the not-yet-uploaded picked files can be opened/previewed
  // in a new tab before submit, same as <DocumentList> does for already-
  // uploaded ones. Revoked whenever the file list changes or on unmount.
  const previewUrls = React.useMemo(() => value.map((f) => URL.createObjectURL(f)), [value]);
  React.useEffect(() => {
    return () => previewUrls.forEach((u) => URL.revokeObjectURL(u));
  }, [previewUrls]);

  const add = (picked: FileList | null) => {
    if (!picked) return;
    // Normalize UPPERCASE extensions to lowercase (S3 keys are case-sensitive).
    const norm = Array.from(picked).map((f) => {
      const m = f.name.match(/\.[A-Z]+$/);
      if (!m) return f;
      const i = f.name.lastIndexOf(".");
      return new File([f], f.name.slice(0, i) + f.name.slice(i).toLowerCase(), {
        type: f.type,
      });
    });
    onChange([...value, ...norm].slice(0, maxFiles));
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <section className="space-y-3">
      <div
        role="button"
        tabIndex={atLimit ? -1 : 0}
        aria-disabled={atLimit}
        onClick={() => !atLimit && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!atLimit && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!atLimit) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!atLimit) add(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          atLimit
            ? "cursor-not-allowed border-border bg-muted/30 opacity-60"
            : "cursor-pointer border-border hover:border-primary/50 hover:bg-muted/40",
          dragOver && !atLimit && "border-primary bg-primary/5",
        )}
      >
        <Upload className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">
          {atLimit ? (
            "Maximum files reached"
          ) : (
            <>
              Drag &amp; drop files, or <span className="text-primary">browse</span>
            </>
          )}
        </p>
        <p className="text-xs text-muted-foreground">PDF, JPG, PNG or WEBP · up to {maxFiles} files</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={DOC_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => add(e.target.files)}
      />

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
            >
              <a
                href={previewUrls[i]}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 truncate text-primary hover:underline"
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span className="truncate">{f.name}</span>
                <span className="text-xs text-muted-foreground">
                  {(f.size / 1024).toFixed(0)} KB
                </span>
              </a>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                aria-label="Remove file"
              >
                <X className="h-4 w-4 text-destructive" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </section>
  );
}

// Build the API metadata (no bytes) for the register payload from picked files.
export const filesToDocMeta = (files: File[]) =>
  files.map((f) => ({
    name: f.name,
    type: f.type,
    ext: `.${(f.name.split(".").pop() ?? "").toLowerCase()}`,
  }));

// List of already-uploaded business documents. Just a URL + optional label —
// no per-document status. When `onDelete` is passed, every row gets a remove
// button (admin feedback on a bad document is a whole-profile comment instead).
export function DocumentList({
  documents,
  onDelete,
}: {
  documents?: { url: string; label?: string | null }[];
  onDelete?: (index: number) => void;
}) {
  if (!documents?.length)
    return (
      <p className="text-sm text-muted-foreground">No documents uploaded.</p>
    );
  return (
    <ul className="space-y-2">
      {documents.map((d, i) => (
        <li
          key={`${d.url}-${i}`}
          className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
        >
          <a
            href={d.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 truncate text-primary hover:underline"
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate">{d.label || `Document ${i + 1}`}</span>
          </a>
          <span className="flex shrink-0 items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-success" />
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(i)}
                aria-label="Remove document"
              >
                <X className="h-4 w-4 text-destructive" />
              </button>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
