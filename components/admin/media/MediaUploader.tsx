"use client";

import { useRef, useState, useTransition } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { uploadToCloudinary, cloudinaryConfigured } from "@/lib/cloudinary";
import { saveImageRecord } from "@/app/admin/media/actions";

export default function MediaUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const configured = cloudinaryConfigured();

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    setUploading(true);
    setProgress(0);

    const files = Array.from(fileList);
    let done = 0;

    try {
      for (const file of files) {
        const res = await uploadToCloudinary(file);
        const save = await saveImageRecord({
          publicId: res.public_id,
          url: res.secure_url,
          width: res.width,
          height: res.height,
        });
        if (!save.ok) throw new Error(save.error);
        done++;
        setProgress(Math.round((done / files.length) * 100));
      }

      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (!configured) return;
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div>
      {!configured && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-4 py-3 rounded mb-3">
          Cloudinary isn&rsquo;t configured yet. Add{" "}
          <code className="text-[11px]">NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME</code> and{" "}
          <code className="text-[11px]">NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET</code>{" "}
          to <code className="text-[11px]">.env.local</code> and restart the
          dev server.
        </div>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => configured && inputRef.current?.click()}
        className={`admin-card border-dashed p-10 flex flex-col items-center justify-center text-center transition-colors ${
          configured
            ? "cursor-pointer hover:border-navy/40 hover:bg-navy/[0.02]"
            : "opacity-60 cursor-not-allowed"
        }`}
        role="button"
        aria-disabled={!configured}
      >
        {uploading ? (
          <>
            <Loader2 size={28} className="text-navy animate-spin" strokeWidth={1.5} />
            <p className="text-sm text-ink/75 mt-3">
              Uploading… {progress}%
            </p>
          </>
        ) : (
          <>
            <UploadCloud size={28} className="text-ink/55" strokeWidth={1.5} />
            <p className="text-sm text-ink/75 mt-3" style={{ fontWeight: 500 }}>
              Drop images here or click to browse
            </p>
            <p className="text-xs text-ink/50 mt-1.5">
              JPG, PNG, WebP, AVIF. Multiple at a time.
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={!configured || uploading}
        />
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded mt-3">
          {error}
        </div>
      )}
    </div>
  );
}
