"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitIntake, type IntakeInput } from "@/app/get-started/actions";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

export default function IntakeForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [v, setV] = useState<IntakeInput>({
    business_name: "",
    contact_name: "",
    email: "",
    phone: "",
    desired_domain: "",
    state_abbr: "",
    notes: "",
  });

  function set<K extends keyof IntakeInput>(k: K, val: IntakeInput[K]) {
    setV((p) => ({ ...p, [k]: val }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await submitIntake(v);
      if (!res.ok) return setError(res.error);
      setDone(true);
    });
  }

  if (done) {
    return (
      <div className="max-w-xl mx-auto text-center">
        <CheckCircle2
          size={48}
          strokeWidth={1.4}
          style={{ color: "var(--color-navy, #142840)", margin: "0 auto 1.5rem" }}
        />
        <h2
          className="text-3xl mb-4"
          style={{ fontWeight: 600, letterSpacing: "0.005em" }}
        >
          Thanks — we'll be in touch.
        </h2>
        <p
          className="text-base leading-relaxed"
          style={{ color: "rgba(0,0,0,0.7)" }}
        >
          One of us will reply within one business day with next steps and
          a quote tailored to your business. Look out for an email at{" "}
          <strong>{v.email}</strong>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Your name</Label>
          <Input
            required
            value={v.contact_name}
            onChange={(val) => set("contact_name", val)}
            placeholder="Samina Bilal"
          />
        </div>
        <div>
          <Label>Email</Label>
          <Input
            required
            type="email"
            value={v.email}
            onChange={(val) => set("email", val)}
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div>
        <Label>Business / brokerage</Label>
        <Input
          required
          value={v.business_name}
          onChange={(val) => set("business_name", val)}
          placeholder="Samina Bilal Realty · RE/MAX Galaxy"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Phone (optional)</Label>
          <Input
            type="tel"
            value={v.phone ?? ""}
            onChange={(val) => set("phone", val || null)}
            placeholder="(703) 555-0100"
          />
        </div>
        <div>
          <Label>State (optional)</Label>
          <select
            value={v.state_abbr ?? ""}
            onChange={(e) => set("state_abbr", e.target.value || null)}
            className="intake-input"
          >
            <option value="">— select —</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label>Domain you want your site on (optional)</Label>
        <Input
          value={v.desired_domain ?? ""}
          onChange={(val) =>
            set(
              "desired_domain",
              (val || "")
                .toLowerCase()
                .replace(/^https?:\/\//, "")
                .replace(/\/.*$/, "") || null,
            )
          }
          placeholder="saminabilal.com"
        />
        <p
          className="text-xs mt-1.5"
          style={{ color: "rgba(0,0,0,0.55)" }}
        >
          Already own one? Great. Don't yet? We can guide you on buying one
          (~$15/yr at GoDaddy or Namecheap).
        </p>
      </div>

      <div>
        <Label>Anything we should know? (optional)</Label>
        <textarea
          rows={3}
          value={v.notes ?? ""}
          onChange={(e) => set("notes", e.target.value || null)}
          placeholder="What's prompting the move? Any specific must-haves?"
          className="intake-input"
        />
      </div>

      {error && (
        <div
          className="text-sm px-4 py-3 rounded"
          style={{
            background: "rgba(229,57,53,0.08)",
            color: "#a51a1a",
            border: "1px solid rgba(229,57,53,0.18)",
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-solid w-full"
        style={{ marginTop: "1.5rem" }}
      >
        {pending ? "Sending…" : "Request a quote"}
      </button>

      <p
        className="text-xs text-center"
        style={{ color: "rgba(0,0,0,0.55)" }}
      >
        We'll reply with a quote within one business day. No charge until
        you accept.
      </p>
    </form>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="block mb-1.5 text-[11px] uppercase"
      style={{
        letterSpacing: "0.18em",
        color: "rgba(0,0,0,0.55)",
        fontWeight: 600,
      }}
    >
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  required,
  type,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      required={required}
      type={type ?? "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="intake-input"
    />
  );
}
