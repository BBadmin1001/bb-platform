"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { seedDefaultCommunities } from "@/app/admin/communities/actions";

export default function SeedDefaultsButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handle() {
    setError(null);
    startTransition(async () => {
      const res = await seedDefaultCommunities();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handle}
        disabled={pending}
        className="admin-btn admin-btn-secondary inline-flex"
      >
        <Sparkles size={14} className="mr-2" />
        {pending ? "Seeding…" : "Seed 6 default communities"}
      </button>
      {error && <p className="text-xs text-red-700 mt-2">{error}</p>}
    </div>
  );
}
