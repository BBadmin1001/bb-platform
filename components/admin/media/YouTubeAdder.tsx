"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Youtube, Plus } from "lucide-react";
import { saveYouTubeRecord } from "@/app/admin/media/actions";

export default function YouTubeAdder() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await saveYouTubeRecord({ url });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setUrl("");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="admin-card p-5 flex items-center justify-center gap-2 text-sm text-ink/75 hover:text-navy hover:border-navy/30 transition-colors"
      >
        <Youtube size={16} strokeWidth={1.5} />
        Add YouTube background
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="admin-card p-5">
      <label className="admin-label">YouTube URL or video ID</label>
      <div className="flex gap-2">
        <input
          type="text"
          className="admin-input flex-1"
          autoFocus
          placeholder="https://www.youtube.com/watch?v=..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={pending}
        />
        <button type="submit" className="admin-btn" disabled={pending || !url}>
          <Plus size={14} className="mr-1.5" /> Add
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
            setUrl("");
          }}
          className="admin-btn admin-btn-secondary"
          disabled={pending}
        >
          Cancel
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-700 mt-2">{error}</p>
      )}
      <p className="text-[11px] text-ink/50 mt-2">
        Used as muted, looping, autoplay backgrounds. Pick clips with no
        audio-critical narration — they&rsquo;ll always play silent.
      </p>
    </form>
  );
}
