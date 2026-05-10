"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { submitBuiltInForm } from "@/app/admin/forms/actions";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) {
      setError("Please agree to be contacted before submitting.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await submitBuiltInForm({
        source: "contact",
        data: { name, email, phone, message },
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
    });
  }

  if (done) {
    return (
      <div className="glass-light p-8 md:p-12 text-center">
        <div className="inline-flex w-12 h-12 rounded-full bg-emerald-50 items-center justify-center mb-5">
          <Check size={22} className="text-emerald-700" strokeWidth={1.5} />
        </div>
        <p className="text-base md:text-lg text-ink leading-[1.85] font-light">
          Thanks — your message has been sent. Samina will be in touch within 24
          hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-10">
      <Field label="Name" type="text" value={name} onChange={setName} />
      <Field label="Email" type="email" value={email} onChange={setEmail} />
      <Field label="Phone" type="tel" value={phone} onChange={setPhone} />

      <div>
        <label className="block eyebrow mb-4">Message</label>
        <textarea
          rows={5}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full bg-transparent border-b border-ink/25 py-3 text-base font-light focus:outline-none focus:border-navy transition-colors resize-none"
        />
      </div>

      <label className="flex items-start gap-4 text-xs font-light text-ink-muted leading-[1.7] pt-2">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 flex-shrink-0"
        />
        <span>
          I agree to be contacted by Samina Bilal via call, email, and text.
          Reply STOP to opt out at any time. Message and data rates may apply.
        </span>
      </label>

      {error && (
        <p className="text-xs text-red-700">{error}</p>
      )}

      <div className="pt-4">
        <button type="submit" disabled={pending} className="btn-solid">
          {pending ? "Sending…" : "Submit"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block eyebrow mb-4">{label}</label>
      <input
        type={type}
        value={value}
        required={label !== "Phone"}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border-b border-ink/25 py-3 text-lg font-light focus:outline-none focus:border-navy transition-colors"
      />
    </div>
  );
}
