"use client";

/**
 * Mortgage / affordability calculator (Phase 20).
 *
 * Standard P&I + taxes + insurance + HOA monthly payment math. Lives
 * on every tenant's site — currently rendered on the /buyers page,
 * could also drop onto a dedicated /mortgage route or the homepage.
 *
 * Inputs (US conventions):
 *   - Home price
 *   - Down payment (% or absolute dollars)
 *   - Loan term (15 / 20 / 30 years)
 *   - Interest rate (%)
 *   - Property tax rate (% of home price / year)
 *   - Homeowners insurance ($ / year)
 *   - HOA / monthly ($ / month)
 *
 * Outputs:
 *   - Monthly P&I
 *   - Monthly tax
 *   - Monthly insurance
 *   - Monthly HOA
 *   - Total monthly payment
 *   - Total interest over life of loan
 *
 * Optional `defaults` prop lets the tenant admin override the
 * starting values (e.g. local property tax rate). Persisted via the
 * brand.financing content_block.
 */

import { useMemo, useState } from "react";
import { Home, DollarSign, Percent, Calendar } from "lucide-react";

export type MortgageDefaults = {
  homePrice?: number;
  downPaymentPct?: number;
  loanYears?: number;
  ratePct?: number;
  propertyTaxRatePct?: number;
  insuranceYearly?: number;
  hoaMonthly?: number;
};

const FALLBACK_DEFAULTS: Required<MortgageDefaults> = {
  homePrice: 500_000,
  downPaymentPct: 20,
  loanYears: 30,
  ratePct: 6.5,
  propertyTaxRatePct: 1.0,
  insuranceYearly: 1_200,
  hoaMonthly: 0,
};

function fmtMoney(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) return "$0";
  return `$${n.toLocaleString("en-US", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  })}`;
}

function calculateMortgage(input: Required<MortgageDefaults>) {
  const downPayment = (input.homePrice * input.downPaymentPct) / 100;
  const principal = Math.max(0, input.homePrice - downPayment);
  const monthlyRate = input.ratePct / 100 / 12;
  const numPayments = input.loanYears * 12;

  // Amortization formula: M = P [ r(1+r)^n ] / [ (1+r)^n − 1 ]
  let monthlyPI = 0;
  if (monthlyRate === 0) {
    monthlyPI = principal / numPayments;
  } else {
    const factor = Math.pow(1 + monthlyRate, numPayments);
    monthlyPI = (principal * monthlyRate * factor) / (factor - 1);
  }

  const monthlyTax = (input.propertyTaxRatePct / 100 * input.homePrice) / 12;
  const monthlyInsurance = input.insuranceYearly / 12;
  const monthlyHOA = input.hoaMonthly;
  const totalMonthly = monthlyPI + monthlyTax + monthlyInsurance + monthlyHOA;
  const totalInterest = monthlyPI * numPayments - principal;

  return {
    principal,
    downPayment,
    monthlyPI,
    monthlyTax,
    monthlyInsurance,
    monthlyHOA,
    totalMonthly,
    totalInterest,
  };
}

export default function MortgageCalculator({
  defaults,
}: {
  defaults?: MortgageDefaults;
}) {
  const merged: Required<MortgageDefaults> = {
    ...FALLBACK_DEFAULTS,
    ...(defaults ?? {}),
  };
  const [homePrice, setHomePrice] = useState(merged.homePrice);
  const [downPaymentPct, setDownPaymentPct] = useState(merged.downPaymentPct);
  const [loanYears, setLoanYears] = useState(merged.loanYears);
  const [ratePct, setRatePct] = useState(merged.ratePct);
  const [propertyTaxRatePct, setPropertyTaxRatePct] = useState(
    merged.propertyTaxRatePct,
  );
  const [insuranceYearly, setInsuranceYearly] = useState(merged.insuranceYearly);
  const [hoaMonthly, setHoaMonthly] = useState(merged.hoaMonthly);

  const result = useMemo(
    () =>
      calculateMortgage({
        homePrice,
        downPaymentPct,
        loanYears,
        ratePct,
        propertyTaxRatePct,
        insuranceYearly,
        hoaMonthly,
      }),
    [
      homePrice,
      downPaymentPct,
      loanYears,
      ratePct,
      propertyTaxRatePct,
      insuranceYearly,
      hoaMonthly,
    ],
  );

  return (
    <div
      className="rounded-md overflow-hidden"
      style={{
        background: "#FAFAFA",
        border: "1px solid rgba(20, 40, 64, 0.12)",
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* ── Inputs ─────────────────────────────────────────────── */}
        <div className="p-6 md:p-8" style={{ background: "#F2EFEA" }}>
          <p
            className="eyebrow mb-4"
            style={{ color: "rgba(20, 40, 64, 0.65)" }}
          >
            Estimate your monthly payment
          </p>
          <h3
            className="heading-display text-2xl md:text-3xl mb-6"
            style={{ color: "#142840", fontWeight: 200, lineHeight: 1.15 }}
          >
            Mortgage calculator
          </h3>

          <div className="space-y-4">
            <Field
              label="Home price"
              icon={<Home size={14} />}
              value={homePrice}
              onChange={setHomePrice}
              prefix="$"
              step={5_000}
              min={0}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Down payment"
                icon={<Percent size={14} />}
                value={downPaymentPct}
                onChange={setDownPaymentPct}
                suffix="%"
                step={0.5}
                min={0}
                max={100}
              />
              <Field
                label="Loan term"
                icon={<Calendar size={14} />}
                value={loanYears}
                onChange={setLoanYears}
                suffix="yr"
                step={1}
                min={1}
                max={40}
              />
            </div>
            <Field
              label="Interest rate"
              icon={<Percent size={14} />}
              value={ratePct}
              onChange={setRatePct}
              suffix="%"
              step={0.125}
              min={0}
              max={30}
            />
            <Field
              label="Property tax rate"
              value={propertyTaxRatePct}
              onChange={setPropertyTaxRatePct}
              suffix="% / yr"
              step={0.05}
              min={0}
              max={10}
            />
            <Field
              label="Homeowners insurance"
              value={insuranceYearly}
              onChange={setInsuranceYearly}
              prefix="$"
              suffix="/ yr"
              step={50}
              min={0}
            />
            <Field
              label="HOA dues"
              value={hoaMonthly}
              onChange={setHoaMonthly}
              prefix="$"
              suffix="/ mo"
              step={10}
              min={0}
            />
          </div>
        </div>

        {/* ── Output ─────────────────────────────────────────────── */}
        <div className="p-6 md:p-8" style={{ background: "#142840", color: "white" }}>
          <p
            className="eyebrow-light mb-4"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            Estimated monthly payment
          </p>
          <p
            className="text-5xl md:text-6xl mb-1"
            style={{
              fontWeight: 200,
              letterSpacing: "-0.01em",
              color: "white",
            }}
          >
            {fmtMoney(result.totalMonthly)}
          </p>
          <p
            className="text-sm mb-8"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            with {fmtMoney(result.downPayment)} down
          </p>

          <div
            className="space-y-2 text-sm"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            <BreakdownRow label="Principal & interest" value={result.monthlyPI} />
            <BreakdownRow label="Property tax" value={result.monthlyTax} />
            <BreakdownRow label="Insurance" value={result.monthlyInsurance} />
            {result.monthlyHOA > 0 && (
              <BreakdownRow label="HOA" value={result.monthlyHOA} />
            )}
          </div>

          <div
            className="mt-8 pt-6 text-xs"
            style={{
              borderTop: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span>Loan amount</span>
              <span style={{ color: "white", fontWeight: 500 }}>
                {fmtMoney(result.principal)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total interest over {loanYears} years</span>
              <span style={{ color: "white", fontWeight: 500 }}>
                {fmtMoney(result.totalInterest)}
              </span>
            </div>
          </div>

          <p
            className="mt-6 text-[10px]"
            style={{
              color: "rgba(255,255,255,0.45)",
              letterSpacing: "0.04em",
              lineHeight: 1.6,
            }}
          >
            Estimates for illustration only. Actual rates, taxes, and
            insurance vary by lender, jurisdiction, and property. Talk to
            a licensed loan officer for an accurate quote.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  value,
  onChange,
  prefix,
  suffix,
  step,
  min,
  max,
}: {
  label: string;
  icon?: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label
        className="block mb-1 text-[11px] uppercase tracking-[0.18em]"
        style={{ color: "rgba(20,40,64,0.65)", fontWeight: 600 }}
      >
        <span className="inline-flex items-center gap-1.5">
          {icon}
          {label}
        </span>
      </label>
      <div
        className="flex items-center"
        style={{
          background: "#ffffff",
          border: "1px solid rgba(20, 40, 64, 0.14)",
          borderRadius: 6,
          paddingLeft: prefix ? "0.85rem" : 0,
          paddingRight: suffix ? "0.85rem" : 0,
        }}
      >
        {prefix && (
          <span style={{ color: "rgba(20,40,64,0.55)", fontWeight: 500 }}>
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          step={step}
          min={min}
          max={max}
          className="flex-1"
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            padding: "0.7rem 0.85rem",
            fontSize: "0.95rem",
            fontVariantNumeric: "tabular-nums",
            color: "#142840",
            width: "100%",
            fontFamily: "inherit",
            fontWeight: 500,
          }}
        />
        {suffix && (
          <span style={{ color: "rgba(20,40,64,0.55)", fontWeight: 500 }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function BreakdownRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span style={{ color: "white", fontWeight: 500 }}>{fmtMoney(value)}</span>
    </div>
  );
}
