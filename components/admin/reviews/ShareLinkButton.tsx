"use client";

import { useState } from "react";
import { Share2, Check, Copy } from "lucide-react";

export default function ShareLinkButton() {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  function getUrl() {
    if (typeof window === "undefined") return "/leave-review";
    return `${window.location.origin}/leave-review`;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(getUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={copy}
        className="admin-btn admin-btn-secondary inline-flex"
        title="Copy share link"
      >
        {copied ? (
          <>
            <Check size={14} className="mr-2 text-emerald-700" /> Copied
          </>
        ) : (
          <>
            <Share2 size={14} className="mr-2" /> Share review link
          </>
        )}
      </button>
      {hovered && !copied && (
        <div className="absolute right-0 mt-1 z-10 text-[11px] text-ink/65 bg-white border border-black/10 rounded p-2 shadow whitespace-nowrap">
          Send to clients to collect new reviews →{" "}
          <code className="text-[10px]">/leave-review</code>
        </div>
      )}
    </div>
  );
}
