"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Phone, Mail, ChevronDown, Circle, CheckCircle, Clock } from "lucide-react";
import { setLeadStatus } from "@/app/admin/forms/actions";

export type LeadRow = {
  id: string;
  source: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  data: Record<string, unknown> | null;
  status: "new" | "in-progress" | "closed";
  submitted_at: string;
};

const STATUS_LABEL = {
  new: "New",
  "in-progress": "In progress",
  closed: "Closed",
};

export default function InboxList({ initial }: { initial: LeadRow[] }) {
  const router = useRouter();
  const [items, setItems] = useState<LeadRow[]>(initial);
  const [openId, setOpenId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function changeStatus(
    id: string,
    status: "new" | "in-progress" | "closed",
  ) {
    setItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status } : x)),
    );
    startTransition(async () => {
      await setLeadStatus(id, status);
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <div className="admin-card p-10 text-center">
        <p className="text-sm text-ink/65">No leads in this view.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((lead) => {
        const open = openId === lead.id;
        const date = new Date(lead.submitted_at);
        return (
          <div key={lead.id} className="admin-card overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenId(open ? null : lead.id)}
              className="w-full p-4 flex items-start gap-3 text-left hover:bg-black/[0.015]"
            >
              <StatusIcon status={lead.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm" style={{ fontWeight: 500 }}>
                    {lead.name || lead.email || "Anonymous"}
                  </p>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-ink/45 bg-black/5 px-2 py-0.5 rounded">
                    {lead.source}
                  </span>
                  <span className="text-[11px] text-ink/45 ml-auto">
                    {formatDate(date)}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-ink/65 flex-wrap">
                  {lead.email && (
                    <span className="inline-flex items-center gap-1">
                      <Mail size={11} /> {lead.email}
                    </span>
                  )}
                  {lead.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone size={11} /> {lead.phone}
                    </span>
                  )}
                </div>
                {lead.message && (
                  <p className="text-sm text-ink/75 mt-2 line-clamp-2">
                    {lead.message}
                  </p>
                )}
              </div>
              <ChevronDown
                size={16}
                className={`text-ink/40 mt-1 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>

            {open && (
              <div className="border-t border-black/8 p-4 bg-black/[0.015]">
                {lead.message && (
                  <div className="mb-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-ink/55 mb-1.5">
                      Message
                    </p>
                    <p className="text-sm text-ink/85 whitespace-pre-wrap leading-relaxed">
                      {lead.message}
                    </p>
                  </div>
                )}
                {lead.data && Object.keys(lead.data).length > 0 && (
                  <div className="mb-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-ink/55 mb-1.5">
                      All fields
                    </p>
                    <dl className="text-xs text-ink/85 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Object.entries(lead.data).map(([k, v]) => (
                        <div
                          key={k}
                          className="bg-white border border-black/8 rounded p-2"
                        >
                          <dt className="text-[10px] uppercase tracking-[0.18em] text-ink/50">
                            {k}
                          </dt>
                          <dd className="mt-0.5 break-words">{String(v ?? "")}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 mt-4">
                  {lead.email && (
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-xs text-navy hover:underline inline-flex items-center gap-1"
                    >
                      <Mail size={12} /> Email
                    </a>
                  )}
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone.replace(/[^0-9+]/g, "")}`}
                      className="text-xs text-navy hover:underline inline-flex items-center gap-1"
                    >
                      <Phone size={12} /> Call
                    </a>
                  )}
                  <div className="ml-auto inline-flex items-center gap-1 bg-white border border-black/10 rounded p-1">
                    {(["new", "in-progress", "closed"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => changeStatus(lead.id, s)}
                        className={`text-[11px] px-2 py-1 rounded ${
                          lead.status === s
                            ? "bg-navy text-white"
                            : "text-ink/65 hover:bg-black/5"
                        }`}
                      >
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatusIcon({
  status,
}: {
  status: "new" | "in-progress" | "closed";
}) {
  if (status === "new")
    return <Circle size={16} className="text-navy mt-1" fill="currentColor" />;
  if (status === "in-progress")
    return <Clock size={16} className="text-amber-600 mt-1" />;
  return <CheckCircle size={16} className="text-emerald-700 mt-1" />;
}

function formatDate(d: Date): string {
  const now = Date.now();
  const diff = now - d.getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  if (diff < oneDay) {
    const hours = Math.round(diff / (60 * 60 * 1000));
    if (hours < 1) return "Just now";
    return `${hours}h ago`;
  }
  if (diff < 7 * oneDay) {
    return `${Math.round(diff / oneDay)}d ago`;
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
