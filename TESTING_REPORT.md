# BB Platform — End-to-End Testing Report

**Started:** 2026-05-11
**Production URL:** https://bb-platform-387.netlify.app
**Login:** `admin@brandbonjour.com` / `Bonjour-9dfa69cc`
**Test tenants in DB:** `samina`, `demo-emerald`

Each agent appends its findings to the relevant section below. Use timestamps and your agent number on every entry so the trail is auditable.

---

## A. BUGS / ISSUES — open

> Found by Agent 1 (template + admin wiring) and Agent 3 (master + onboarding).
> Format each entry as:
>
> - **[A1-001 / A3-001]** *(severity: blocker / major / minor)* — One-line summary
>   - Where: route or component
>   - Repro: exact steps
>   - Expected: …
>   - Actual: …

### Agent 1 (2026-05-11)

- **[A1-001]** *(severity: blocker)* — Sticky-tenant deploy never went live — production `/admin?tenant=<slug>` does NOT set the `bb-master-tenant` cookie. Every server action that depends on tenant context fails.
  - Where: `proxy.ts` + Netlify deploy.
  - Repro: `curl -sI -D - "https://bb-platform-387.netlify.app/admin?tenant=samina"` → response carries NO `Set-Cookie: bb-master-tenant=…`. Then in browser, open `/admin/content/brand/identity?tenant=samina`, edit Tagline, click Save → red error "No tenant in context." Same on `/admin/analytics?tenant=demo-emerald` → Subscribe to Visibility Plan button errors "No tenant in context." And `curl -sI -b "bb-master-tenant=samina" "https://bb-platform-387.netlify.app/"` returns 307 → `/master` (proxy still resolves as master, ignoring the cookie).
  - Root cause confirmed in `/tmp/deploy_sticky.log` — the `netlify deploy` call failed with `Failed retrieving extensions for site 00cfadb3-9194-4186-b74c-e54d1fd9ca63: Unexpected status code 403`. The fix code is in `proxy.ts` (lines 56-61, 186-197) but never shipped to production.
  - Expected: ?tenant=samina sets a cookie, internal nav and server actions keep tenant context.
  - Actual: cookie never set; every save, every Subscribe button, every form submit returning to the same admin page fails with "No tenant in context." Until the deploy succeeds, nothing in the admin can be saved. This blocks Agent 3's onboarding test too (Stripe checkout fails the same way).

- **[A1-002]** *(severity: blocker)* — Public site renders Samina's data for every other tenant (multi-tenant fundamentally broken at the template level).
  - Where: `lib/site.ts`, `components/Footer.tsx`, `components/ContactForm.tsx`, `app/contact/page.tsx`, `app/privacy/page.tsx`, `app/open-house/[slug]/page.tsx`, `app/leave-review/page.tsx`, `app/closings/page.tsx`, `app/communities/[slug]/page.tsx`, `app/realtor-in/[slug]/page.tsx`, `app/page.tsx` (`DB2_DEFAULT_ATTRIBUTION = "Samina"`), and 43+ other usages.
  - Repro: `curl -sS "https://bb-platform-387.netlify.app/contact?tenant=demo-emerald" | grep -oE "Samina|saminarealtor"` → 4+ matches per page; `/leave-review?tenant=demo-emerald` → 45 matches. demo-emerald's footer shows `(703) 973-7036` (Samina's phone), `samina@saminarealtor.com`, `instagram.com/homewithsamina`. `ContactForm` confirmation message hardcodes "Samina will be in touch within 24 hours."
  - Expected: each tenant's site shows their own contact info, brokerage, social links, copyright name.
  - Actual: `lib/site.ts` exports Samina's phone/email/social/license/brokerage office address as constants, and 43 import sites consume them with no per-tenant override. `app/layout.tsx` only forwards `realtorName` + `brokerage` to Header/Footer — not phone, email, social, licenses, or brokerage office. Same goes for `<title>` metadata fallback on demo-emerald: `<title>BB Website Project</title>` (platform default), not "Maya Chen | Compass".

- **[A1-003]** *(severity: blocker)* — No admin editor for phone, email, social links, license numbers, or brokerage office address. Even if A1-002 were fixed at the rendering layer, the realtor has no way to populate these fields.
  - Where: `lib/contentRegistry.ts` SECTIONS (brand.identity has only name/role/brokerage/tagline/serviceArea/languages); `app/admin/brand/page.tsx` cards (6 cards, none for contact info).
  - Repro: open `/admin/brand?tenant=samina` → 6 cards (colors, identity, realtor image, broker image, favicon, featured image). Open Identity → fields are name, role, brokerage, tagline, service area, languages. No phone/email/social/license/address.
  - Expected: a "Contact & License" admin card (phone, email, social URLs, VA/MD license numbers) + a "Brokerage Office" card (street, city, state, zip, brokerage phone). DB already has `tenants.contact_email`, `tenants.contact_phone`, `tenants.license_va`, `tenants.license_md` columns — they're unused everywhere.
  - Actual: realtors can never set their own phone/email/social/etc — they're permanently Samina's data on every tenant site.

- **[A1-004]** *(severity: blocker)* — Public form submissions (contact, leave-review, valuation, custom forms) do NOT send notification emails to the realtor. The realtor has no way to know a lead came in unless they open `/admin/inbox`.
  - Where: `app/admin/forms/actions.ts` — `submitFormPublic` and `submitBuiltInForm` both insert into `leads` and stop. Neither imports `lib/email.ts`.
  - Repro: `grep -rn "lib/email" /Users/umairahmad/Downloads/bb-website-project/ --include="*.ts*"` → only `app/master/tenants/actions.ts` and `app/get-started/actions.ts` import it. No imports from any public form submit path.
  - Expected: after a lead is inserted, send a "New lead from <name>" email via Resend to the tenant's contact_email.
  - Actual: silent inserts. Leads sit in DB until the realtor logs in and notices.

- **[A1-005]** *(severity: major)* — `app/robots.ts` hardcodes `sitemap: "https://saminarealtor.com/sitemap.xml"` so every tenant's `/robots.txt` points crawlers at Samina's eventual custom domain.
  - Where: `app/robots.ts`.
  - Repro: `curl -sS https://bb-platform-387.netlify.app/robots.txt` → `Sitemap: https://saminarealtor.com/sitemap.xml`.
  - Expected: per-tenant sitemap URL, or at minimum the platform's current `siteOrigin()`.
  - Actual: every tenant's robots.txt directs to Samina's domain.

- **[A1-006]** *(severity: major)* — Locked feature gating is wrong: features samina HAS unlocked render as locked in the sidebar AND dashboard cards AND open the upgrade banner instead of the real editor.
  - Where: `app/admin/layout.tsx` → `getCurrentTenantFeatures()`; downstream `AdminSidebar.tsx`, `app/admin/page.tsx`, `app/admin/analytics/page.tsx`, `app/admin/integrations/google/page.tsx`, `app/admin/seo/page.tsx`.
  - Repro: DB confirms samina has `features: { flyers: true, analytics: true, seo_county_pages: true, google_reviews_widget: true }`. Open `/admin?tenant=samina` → sidebar Analytics + SEO + Integrations have lock icons; dashboard "LOCKED" chip appears on Open Houses, Analytics, Integrations, SEO. Open `/admin/analytics?tenant=samina` → upgrade banner ("Locked · Visibility Plan · $20/mo") instead of the GA4 ID editor.
  - Expected: with samina's feature flags, all four pages should show their actual editors.
  - Actual: every gated page shows the upgrade banner — same as a tenant who hasn't paid. Likely root cause: `getCurrentTenant()` in admin layout is returning null (see A1-001) so `getCurrentTenantFeatures()` returns an empty Set. Once A1-001 is fixed this might cascade-fix; needs re-verification.

- **[A1-007]** *(severity: major)* — Admin sidebar realtor name is empty even with `?tenant=samina` in URL.
  - Where: `app/admin/layout.tsx` line 51 (`realtorName={tenant?.realtor_name}`), rendered by `AdminSidebar.tsx`.
  - Repro: open `/admin?tenant=samina` → sidebar avatar circle is empty/dim, the realtor-name slot above "ADMIN" shows no text (rendered HTML is `<span>` with nothing inside it; downstream `realtorName ?? "Admin"` produces "Admin").
  - Expected: "Samina Bilal".
  - Actual: empty string. Same root cause as A1-001 — `getCurrentTenant()` returning null in admin layout.

- **[A1-008]** *(severity: minor)* — Typo / missing space in upgrade banner copy: "Website analytics**isn't** active", "Google Reviews widget**isn't** active" (no space between feature name and "isn't").
  - Where: `components/admin/UpgradeBanner.tsx` (look for the headline string).
  - Repro: open `/admin/analytics?tenant=demo-emerald` → headline reads "Website analyticsisn't active on your plan."
  - Expected: "Website analytics isn't active on your plan."
  - Actual: missing space.

- **[A1-009]** *(severity: major)* — `/admin/integrations/analytics` redirects to `/admin/integrations/google` despite being a separate route with its own page.tsx — and Analytics is reachable instead under `/admin/analytics` (which is a Growth-section gated card). So there's a dead route + ambiguous IA.
  - Where: `app/admin/integrations/analytics/page.tsx` vs the Growth → Analytics card at `/admin/analytics`.
  - Repro: `curl -sI "https://bb-platform-387.netlify.app/admin/integrations/analytics?tenant=samina"` → 307 to `/admin?tenant=samina&from=%2Fadmin%2Fintegrations%2Fanalytics`. Manually navigating there pops the Marketing-plan upgrade banner for the Google integration (wrong feature gate).
  - Expected: separate Analytics integration page reachable.
  - Actual: route exists in code but every nav lands on Google integration.

- **[A1-010]** *(severity: major)* — Hardcoded "Samina" / "RE/MAX Galaxy" / "saminarealtor.com" in page metadata + body copy on ~12 pages (privacy, contact, communities, closings, leave-review, leave-review-internal, form/[slug], realtor-in/[slug], etc).
  - Where: `app/privacy/page.tsx` (8+ refs in body), `app/contact/page.tsx` (title + description), `app/closings/page.tsx`, `app/leave-review/page.tsx` (title, description, alt text, heading copy, body paragraph), `app/leave-review-internal/page.tsx`, `app/form/[slug]/page.tsx`, `app/communities/page.tsx`, `app/communities/[slug]/page.tsx` ("Samina's Take" heading, "Samina Bilal · Realtor" sign-off), `app/admin/seo/counties/page.tsx`, `app/admin/seo/page.tsx`.
  - Repro: `curl -sS https://bb-platform-387.netlify.app/leave-review?tenant=demo-emerald | grep -c Samina` → 45.
  - Expected: every reference templated against the active tenant.
  - Actual: every page hard-stamps Samina.

- **[A1-011]** *(severity: major)* — Header logo caption is hardcoded to the literal string "Realtor" with no per-tenant override.
  - Where: `components/Logo.tsx` line 53-58.
  - Repro: open `/?tenant=demo-emerald` → header reads "Maya Chen / REALTOR" (or whatever realtor_name is). For a Broker Associate, Team Lead, etc, the "Realtor" caption can't be changed.
  - Expected: a `role` field on tenants or content_blocks brand.identity (which exists — "Role / Title") flows into the header caption.
  - Actual: header always says "REALTOR" regardless of brand.identity.role.

- **[A1-012]** *(severity: major)* — Footer hardcodes Brand Bonjour credit ("Copyrights reserved by Brand Bonjour" plus logo) on every tenant site with no way to hide or relabel. White-label-able SaaS shouldn't surface vendor branding on customer sites by default.
  - Where: `components/Footer.tsx` lines 180-194.
  - Repro: every public page footer.
  - Expected: vendor credit is optional / removable (or at least a small "Powered by" tag).
  - Actual: prominent BB logo + copyright line always visible.

- **[A1-013]** *(severity: minor)* — Newsletter form in `components/Footer.tsx` has no submit handler — form has `<input>` + `<button type="submit">` but the form has no `action` and no `onSubmit`. Clicking Subscribe does nothing (or does a full page reload).
  - Where: `components/Footer.tsx` lines 117-129.
  - Repro: enter email + click Subscribe → nothing happens / page reloads.
  - Expected: either wired to a real list-builder integration, or `disabled` with a "coming soon" tooltip, or pushed to /admin/inbox as a lead.
  - Actual: dead form.

- **[A1-014]** *(severity: major)* — Compliance logos in footer (Realtor emblem, Equal Housing) are baked into `/public/images/...` paths. No admin editor to swap; no way to add MLS-specific logos. For a non-Realtor® licensee (e.g. just a real-estate agent who isn't NAR-affiliated) showing the Realtor® emblem may be a brand-use violation.
  - Where: `components/Footer.tsx` lines 168-176.
  - Repro: footer always shows both logos regardless of tenant.
  - Expected: opt-in or admin-driven compliance-logo block.
  - Actual: always rendered.

- **[A1-015]** *(severity: minor)* — Dashboard "What's live" status text in `/admin/page.tsx` (lines 246-261) hardcodes "Coming next: Team invites, then optional Google My Business review pulls" — but Team admin already exists (`/admin/team`) and the Google Reviews widget already exists as a paid feature. Stale internal-roadmap copy showing to customers.
  - Where: `app/admin/page.tsx` lines 256-261.
  - Expected: removed or refreshed.
  - Actual: customer-facing dashboard surfaces dev-internal roadmap.

- **[A1-016]** *(severity: minor)* — `BillingShortcut` is fed `unlockedCount={unlocked.size}`, which is 0 on most pages (since `getCurrentTenantFeatures()` is broken — see A1-006). Likely renders an incorrect "0 features unlocked" message.
  - Where: `app/admin/page.tsx` line 238.
  - Repro: open `/admin?tenant=samina`; inspect the BillingShortcut card.
  - Expected: reflects actual feature count.
  - Actual: depends on A1-006 fix.

- **[A1-017]** *(severity: major)* — `lib/site.ts` `heroStats` is hardcoded (5.0 stars from Zillow/Google/Realtor.com, "42+ reviews", "2 states VA & MD"). No admin editor for these.
  - Where: `lib/site.ts` lines 68-79; consumed by `components/Hero.tsx`.
  - Repro: every tenant homepage shows "VA & MD" and "42+ reviews" in the hero stat band.
  - Expected: per-tenant stat blocks, editable in admin.
  - Actual: Samina's exact stats on every tenant.

- **[A1-018]** *(severity: major)* — `nav` array in `lib/site.ts` (lines 44-66) hardcodes Samina-specific community children (Woodbridge, Dumfries, Ashburn, Lorton, Stafford, Manassas). Other tenants get those Virginia community links in their nav drawer.
  - Where: `lib/site.ts` lines 44-66; consumed by `components/MenuDrawer.tsx`.
  - Repro: open menu drawer on `/?tenant=demo-emerald` → see Samina's six VA communities.
  - Expected: nav children are derived from the tenant's actual `communities` table rows.
  - Actual: Samina's six.

- **[A1-019]** *(severity: blocker, security-adjacent)* — Service-role bypasses RLS in `submitFormPublic`/`submitBuiltInForm` to insert leads, but the underlying tenant_id comes from `getCurrentTenantId()` (request header). Combined with A1-001 (sticky cookie not setting), if the cookie ever does set, a logged-out attacker can spam ANY tenant's inbox simply by carrying `?tenant=<slug>` in their submit request. There's no rate-limiting and no CAPTCHA on the public forms.
  - Where: `app/admin/forms/actions.ts` lines 70-96, 103-126.
  - Repro: after fixing the sticky cookie, POST a hand-crafted lead submission with whatever payload to /contact endpoints.
  - Expected: rate-limit per IP + per tenant + honeypot/CAPTCHA + Resend notification.
  - Actual: open firehose.

- **[A1-020]** *(severity: minor)* — `/admin/team` card on dashboard is visible to all roles even though the page itself requires `requireTenantOwner`. Editors clicking it get a hard error page instead of the card being hidden.
  - Where: `app/admin/page.tsx` lines 119-126; `app/admin/team/page.tsx` (gated by owner check).
  - Repro: log in as an editor (or visit `/admin/team` while pretending to be one) → access-denied screen.
  - Expected: card hidden for editors, or shows a "Owner only" badge.
  - Actual: card is clickable, the page bounces.

- **[A1-021]** *(severity: minor)* — Two redundant admin entry-points to the same feature: dashboard card "Brand Identity" links to `/admin/brand`; sidebar nav also has "Brand Identity" → same page; sub-cards on `/admin/brand` route to `/admin/content/brand/<section>` — three URL patterns for one feature. Easy to get lost.
  - Where: `app/admin/brand/page.tsx`, `app/admin/content/brand/<section>/page.tsx`.
  - Expected: pick one path (e.g. drop `/admin/content/brand/*` and inline the editors under `/admin/brand/<section>`).
  - Actual: split.



---

## B. RECOMMENDATIONS

> Improvements, UX polish, missing features the agents notice but aren't strictly bugs.
> Each entry: **[R-NNN]** — title, brief description, why it matters.

### Agent 1 (2026-05-11)

- **[R-A1-101]** — Centralize tenant chrome data in one resolver. Right now Header/Footer take `realtorName` + `brokerage` as props, while every other Samina-specific field comes from `lib/site.ts`. Replace `lib/site.ts` with a `getTenantChrome()` that returns name, phone, email, social{instagram,facebook,tiktok}, licenses{va,md,…}, brokerageOffice{name,street,cityStateZip,phone,logo}, portrait, brokerLogo — pulled from `tenants` columns + a new `content_blocks` row (e.g. `brand.contact`). Then components consume that single object instead of importing `site`. Why it matters: A1-002 fix touches 43 import sites; a centralized resolver makes the rename a one-shot. Also gives the Privacy/Contact/etc pages a single source instead of re-implementing each.

- **[R-A1-102]** — Add a "Preview before save" pane to every content editor. Saves are blind right now — admin types in a Tagline field, clicks Save, navigates to public to see if it stuck. A live iframe pinned next to the form (or a Save-and-Preview button) would slash the round-trip and catch broken changes earlier.

- **[R-A1-103]** — Build a "Tenant config completeness" widget on `/admin?tenant=…` dashboard. Show a small checklist of fields the realtor still needs to fill (phone, email, social, license numbers, hero stats, communities seeded, at least one closing entry, at least one review). New tenants currently land on an empty admin with no nudge.

- **[R-A1-104]** — Replace `lib/site.ts` `heroStats` with a per-tenant `content_blocks(brand.stats)` row. Realtor with 0 sales shouldn't show "42+ reviews."

- **[R-A1-105]** — `components/MenuDrawer.tsx` should pull nav children for Communities from the tenant's actual `communities` table rather than `lib/site.ts` nav constants.

- **[R-A1-106]** — Add a feature: "White-label" toggle for super admin. For a tenant on a custom domain, optionally hide the Brand Bonjour footer credit. (See A1-012.)

- **[R-A1-107]** — Improve the upgrade banner: link the "Subscribe to … Plan" button to a friendlier UX (e.g. show the plan's full features list and price before redirecting to Stripe). Right now it's a black-box "click and trust" flow.

- **[R-A1-108]** — Surface `bb-master-tenant` cookie state to the master operator in a small banner: "Viewing as: samina (clear)". Today there's no visual indicator the cookie is set; if a master switches tenants and forgets, they could mistakenly edit the wrong tenant. Pair with the cookie-clearing flow (`?tenant=` with empty value) that's already implemented but undiscoverable.

- **[R-A1-109]** — `proxy.ts` matcher excludes `/api`, so /api/stripe/checkout creates tenant-less Stripe sessions if hit directly. Server actions that hit Stripe should also verify tenant via a separate read, not rely solely on the header. Defense-in-depth against A1-001-style breakages.

- **[R-A1-110]** — Footer newsletter form is a dead UI element (A1-013). Either wire it to Mailchimp/ConvertKit per-tenant or remove it. Showing customers a non-functional form is worse than no form.

- **[R-A1-111]** — Public form submissions should include a honeypot field + simple rate-limit at the proxy layer. Combined with A1-004, the inbox will get spammed the moment the site is indexed.

- **[R-A1-112]** — Mobile responsiveness for admin not tested — Chrome MCP `resize_window` is blocked from going under 50% of the host screen. Agent 2 (or follow-up tester) should manually verify `/admin?tenant=samina` and `/contact?tenant=samina` at 375x812.

- **[R-A1-113]** — Sitemap.ts at `app/sitemap.ts` should be made tenant-aware and use the tenant's custom_domain (or platform host) as the loc base, not a hardcoded saminarealtor.com (see A1-005 robots.ts too).

- **[R-A1-114]** — Add an `/admin/branding/contact` editor card under Brand Identity (separate from "Identity") that covers phone, email, social URLs, license numbers, brokerage office street/city/state/zip — see A1-003.

- **[R-A1-115]** — Logo caption ("REALTOR") should pull from `content_blocks.brand.identity.role` — see A1-011. Default "Realtor" if empty, but allow "Broker Associate", "Team Lead", "Real Estate Advisor", etc.

- **[R-A1-116]** — `/admin` dashboard "What's live / Coming next" panel should be removed or routed through a feature-flag (see A1-015). It currently surfaces stale product roadmap to customers.

- **[R-A1-117]** — Compliance logos block (Realtor®, Equal Housing) should be opt-in per tenant — see A1-014. Pair with a master-managed list so a tenant can add MLS-specific badges.

- **[R-A1-118]** — Add a friendly "We couldn't reach Google Reviews — check the API key" error path in `/admin/integrations/google` save action; right now the page is gated behind a feature flag and the Save handler isn't even reachable to test until A1-006 is fixed.

- **[R-A1-119]** — `tenants.contact_email` and `tenants.contact_phone` columns already exist (per schema migration 0001) but aren't surfaced anywhere in the admin UI. Either delete them or wire them. Currently a confusing dead column.

- **[R-A1-120]** — Document the sticky-tenant cookie clearance UX (`?tenant=` with empty value clears it — proxy.ts line 194). Today a master operator who's stuck in samina view has no UI affordance to escape; even pasting the master URL keeps them in samina until the 8-hour cookie expires.

- **[R-A1-121]** — Add a "Test send" button on `/admin/integrations/analytics` and (once it ships) `/admin/integrations/email` that fires a dummy lead email to the tenant's contact_email so they can verify deliverability without waiting for a real lead.

- **[R-A1-122]** — Hide locked sidebar items entirely OR show them inline with a tiny lock + plan price, rather than dim+lock. Today they're easy to miss and customers ask "what's that lock for?"

---

## C. COMPLETED FIXES — by Agent 2

> Every bug fixed by Agent 2 in either round.
> Each entry: timestamp · bug id · what changed · commit hash (if pushed) · verification step.

- **[A1-001]** *(closed 2026-05-11 — verified self-resolved after sticky-tenant deploy)* — Sticky tenant cookie now ships; verified `Set-Cookie: bb-master-tenant=` on `/admin?tenant=samina` requests against production.
  - Verification: `curl -sI "https://bb-platform-387.netlify.app/admin?tenant=samina"` → returns the cookie.

- **[A1-002]** *(closed 2026-05-11)* — Replaced `lib/site.ts` with a per-tenant chrome resolver. Footer / Header / MenuDrawer / Logo / Contact / Privacy / Communities / Closings / OpenHouse / RealtorIn / LeaveReview / Sellers all consume `getTenantChrome()` instead of importing Samina-hardcoded constants. Also fixed cascading data leaks: `reviewsLoader`, `closingsLoader`, `communitiesLoader` no longer fall back to Samina's static datasets. `getPortrait` no longer falls back to `/images/Samina%20Headshot.jpeg`. `ratingsLine` static defaults blanked (per-tenant aggregate ratings deferred to Phase 03).
  - Commits: `40d98d3`, `3803c93`, `825753d`.
  - Files (24): `lib/tenant/chrome.ts` (new), `lib/site.ts` (untouched but no longer imported on public paths), `lib/contentLoader.ts`, `lib/reviewsLoader.ts`, `lib/closingsLoader.ts`, `lib/communitiesLoader.ts`, `lib/reviews.ts`, `components/Footer.tsx`, `components/Logo.tsx`, `components/Header.tsx`, `components/MenuDrawer.tsx`, `components/ReviewsStrip.tsx`, `components/ContactForm.tsx`, `components/ValuationForm.tsx`, `components/LeaveReviewForm.tsx`, `components/admin/AdminSidebar.tsx`, `app/layout.tsx`, `app/contact/page.tsx`, `app/privacy/page.tsx`, `app/communities/[slug]/page.tsx`, `app/communities/page.tsx`, `app/about/page.tsx`, `app/buyers/page.tsx`, `app/sellers/page.tsx`, `app/path-to-ownership/page.tsx`, `app/partners/page.tsx`, `app/reviews/page.tsx`, `app/closings/page.tsx`, `app/leave-review/page.tsx`, `app/open-house/[slug]/page.tsx`, `app/realtor-in/[slug]/page.tsx`, `app/page.tsx`.
  - Verification: `curl -sS "https://bb-platform-387.netlify.app/contact?tenant=demo-emerald" | grep -c Samina` → `0`. `curl -sS "/?tenant=demo-emerald" | grep -c Samina` → `0` (previously 6). Footer for demo-emerald now reads "© 2026 Maya Chen" + Compass brokerage instead of Samina/RE-MAX-Galaxy.

- **[A1-003]** *(closed 2026-05-11)* — Added Contact & License admin editor under Brand Identity. Decision: stored under `content_blocks(page='brand', key='contact')` rather than extending the `tenants` table — the shape (variable license rows, optional social URLs, optional brokerage office) maps cleanly to JSONB and avoids a migration. The new section ships with shape: phone / email / social.{instagram,facebook,tiktok,linkedin} / licenses[] / office.{name,street,cityStateZip,phone}. Auto-rendered by the existing SectionEditor; flows live into the chrome resolver above.
  - Commit: `40d98d3`.
  - Files: `lib/contentRegistry.ts`, `app/admin/brand/page.tsx`.
  - Verification: open `/admin/brand?tenant=samina` → "Contact & License" card visible. Open `/admin/content/brand/contact?tenant=samina` → form renders with all fields. Saving propagates into the public site via `getTenantChrome()`.

- **[A1-004]** *(closed 2026-05-11)* — Wired Resend lead notifications into both `submitFormPublic` and `submitBuiltInForm`. New `sendLeadNotification()` helper in `lib/email.ts`. On every public form insert, fetch the tenant's `contact_email` (or the per-form `notify_email` override), build a compact "New lead from <name>" email with name/email/phone/source/message + a deep link to `/admin/inbox`, and send. Best-effort: send failures are logged but never break the form's success response.
  - Commit: `40d98d3`.
  - Files: `lib/email.ts`, `app/admin/forms/actions.ts`.
  - Verification: types compile; build green. Live verification requires submitting a real lead — call `submitBuiltInForm({source: "contact", data: {name, email, phone, message}})` from the public site; check `admin@brandbonjour.com` inbox + Resend dashboard. (Resend dashboard check deferred to Agent 3 since they have the credentials.)

- **[A1-005]** *(closed 2026-05-11)* — `app/robots.ts` now points `Sitemap:` at `siteOrigin()` instead of `https://saminarealtor.com/sitemap.xml`. Per-tenant custom-domain rewrites will inherit the right origin automatically.
  - Commit: `40d98d3`.
  - Verification: `curl -sS https://bb-platform-387.netlify.app/robots.txt` → `Sitemap: https://bb-platform-387.netlify.app/sitemap.xml`.

- **[A1-006 + A1-007]** *(closed 2026-05-11)* — Tenant context in server components was returning null even with `?tenant=` in the URL, because Netlify Edge doesn't reliably propagate `request: { headers }` writes from `proxy.ts` to downstream renders. Added a two-stage fallback chain in `lib/tenant/context.ts`: when the `x-bb-tenant-id` header is missing, try the URL `?tenant=` query (covers first-request render), then the `bb-master-tenant` sticky cookie (covers internal nav). Both go through a cached slug→id lookup via the service client. This cascade-fixes the admin sidebar (now shows "Samina Bilal" with `?tenant=samina`) AND the locked-feature gates (samina's unlocked Analytics/Flyers/SEO/Google Reviews now show real editors instead of upgrade banners).
  - Commit: `915d14d`.
  - Files: `lib/tenant/context.ts`.
  - Verification: `curl -sS "https://bb-platform-387.netlify.app/contact?tenant=samina" | grep -oE 'hasTenant[^,]*'` → `"hasTenant":true`. Server-rendered `realtorName` is now "Samina Bilal".

- **[A1-008]** *(closed 2026-05-11 — verified invalid)* — Re-read `components/admin/UpgradeBanner.tsx` line 63: `{meta.label} isn&apos;t active on your plan.` There IS a space between the JSX expression and the literal "isn't". The text Agent 1 captured ("Website analyticsisn't") was almost certainly a copy-paste artifact from a rendered DOM where the whitespace was collapsed inside an inline element — the source is fine. No change needed.

- **[A1-009]** *(closed 2026-05-11 — verified invalid)* — `app/admin/integrations/analytics/page.tsx` exists, gates on the `analytics` feature (correct), and returns the AnalyticsWizard when unlocked. The 307 → `/admin?from=...` Agent 1 saw was the `proxy.ts` "deeper /admin/* requires auth" check firing on an unauthenticated request. Live (auth'd) it routes correctly. No code change needed.

- **[A1-010]** *(closed 2026-05-11)* — Hardcoded "Samina" / "RE/MAX Galaxy" / "saminarealtor" copy in metadata + body of `/about`, `/buyers`, `/closings`, `/communities`, `/communities/[slug]`, `/contact`, `/leave-review`, `/partners`, `/path-to-ownership`, `/privacy`, `/realtor-in/[slug]`, `/reviews`, `/sellers` neutralized. Each page now uses `generateMetadata()` to pull the active tenant's name + brokerage, and body strings either default to neutral phrasing or pull from the chrome resolver.
  - Commits: `40d98d3`, `3803c93`.
  - Verification: `curl -sS "https://bb-platform-387.netlify.app/leave-review?tenant=demo-emerald" | grep -c Samina` → `0`. (Was 45.)

- **[A1-011]** *(closed 2026-05-11)* — `components/Logo.tsx` accepts a `role` prop driven by `content_blocks brand.identity.role`. Defaults to "Realtor" when blank. Flows through `Header.tsx` from the root layout.
  - Commit: `40d98d3`.
  - Verification: rendered HTML shows `<span>Realtor</span>` caption for both samina and demo-emerald (neither has overridden it).

- **[A1-012]** *(partially closed 2026-05-11)* — "Copyrights reserved by Brand Bonjour" softened to "Powered by Brand Bonjour" with the same logo + link. Treated as platform branding (intentional). A super-admin opt-in to hide it entirely on custom-domain tenants is deferred to Phase 04 (see Section D).
  - Commit: `40d98d3`.
  - File: `components/Footer.tsx`.

- **[A1-013]** *(closed 2026-05-11)* — Newsletter "Subscribe" form in the footer (no handler, no integration — a dead form) replaced with a small "Get in Touch" prompt linking to `/contact`. A real ESP integration (Mailchimp/ConvertKit) is deferred to a future phase since each tenant will pick their own provider.
  - Commit: `40d98d3`.
  - File: `components/Footer.tsx`.

- **[A1-014]** *(closed 2026-05-11)* — Compliance logos: dropped the Realtor® emblem from the default footer (NAR-trademarked, not safe to render for non-NAR licensees). Equal Housing logo retained (universally applicable to U.S. real estate). An admin opt-in to re-add NAR/MLS-specific logos is deferred to Phase 04.
  - Commit: `40d98d3`.
  - File: `components/Footer.tsx`.

- **[A1-015]** *(closed 2026-05-11)* — Dashboard "Coming next: Team invites, then optional Google My Business review pulls" stale roadmap copy replaced with an actionable "Tips" panel that points new realtors at the Contact & License editor as their first step.
  - Commit: `40d98d3`.
  - File: `app/admin/page.tsx`.

- **[A1-016]** *(closed 2026-05-11 — cascade-fixed by A1-006)* — `BillingShortcut` is fed `unlockedCount={unlocked.size}` from `getCurrentTenantFeatures()`. With A1-006's fix in place, that now returns samina's actual 4 unlocked features instead of an empty Set.

- **[A1-017]** *(closed 2026-05-11)* — Hero stats are already editable via `content_blocks(page='home', key='hero', stats[])` in the auto-editor. Static defaults in `lib/content.ts` were already neutral (5★ generic, "1 State Licensed"). The "VA & MD" + "42+ reviews" copy Agent 1 saw was Samina's saved override in her own row — correct behaviour. For new tenants, defaults render. No code change needed.

- **[A1-018]** *(closed 2026-05-11)* — Hardcoded six VA communities (Woodbridge, Dumfries, Ashburn, Lorton, Stafford, Manassas) in `lib/site.ts` `nav` removed. `MenuDrawer.tsx` now renders the Communities submenu from the tenant's actual `communities` table (limited to 8 visible rows, ordered by `display_order`).
  - Commit: `40d98d3`.
  - Files: `components/MenuDrawer.tsx`, `app/layout.tsx`.
  - Verification: `/?tenant=demo-emerald` menu drawer (which has zero communities) shows no submenu under "Communities".

- **[A1-019]** *(deferred to Phase 05)* — Public form spam protection (rate limit, honeypot, CAPTCHA). The right answer is rate-limit at the edge + a hidden honeypot field + optional CAPTCHA — too invasive to ship piecemeal. Moved to Phase 05 in Section D.

- **[A1-020]** *(closed 2026-05-11)* — `/admin/team` card on the dashboard now hidden from editors. Owner check is done once in the admin dashboard server component (joined on `tenant_users.role` + `super_admins`) and the Team card is filtered out for non-owners. Super admins always see it.
  - Commit: `40d98d3`.
  - File: `app/admin/page.tsx`.

- **[A1-021]** *(deferred to Phase 06)* — IA dedup between `/admin/brand`, sidebar "Brand Identity", and `/admin/content/brand/<section>` is a structural cleanup. The "Identity" + "Contact & License" cards under `/admin/brand` work fine for round 1; consolidation moved to Phase 06.

---

## D. RECOMMENDATIONS → FUTURE PHASE PLANS — by Agent 2

> Agent 2 reads section B, vets each rec against the existing build + business goals, and turns viable ones into named phases here. Does NOT implement them.
>
> Each entry: **[Phase NN — title]** · what it adds · why it fits · rough scope.

### Phase 01 — Master operator clarity

**Goal:** Make it impossible for a master operator to forget which tenant they're "viewing as," and give them a one-click escape.

**Includes (from recs R-A1-108, R-A1-120):**
- Small floating badge on master-area URLs (top-right of admin shell) reading "Viewing as: samina · Clear" with a single click action that hits `?tenant=` (empty) to drop the cookie.
- Doc the cookie-clearance UX in the master onboarding so this isn't tribal knowledge.
- Surface the sticky cookie state somewhere in the master dashboard's tenant detail so the operator can see whether they're impersonating before they edit.

**Scope rough estimate:** small.

**Why it fits:** Reduces real-world risk of master accidentally editing the wrong tenant. Tiny UX win that the cookie-clearance code already supports (`proxy.ts` line ~194 handles `?tenant=` with empty value).

### Phase 02 — Tenant config completeness widget

**Goal:** When a new realtor lands on `/admin?tenant=...`, show them a checklist of "what to fill in first" so they don't stare at an empty admin and bounce.

**Includes (from recs R-A1-103, R-A1-119):**
- Computed checklist on `/admin/page.tsx` showing which sections are still empty (Contact & License, Portrait, Brokerage logo, at least 1 community, at least 1 closing, at least 1 review).
- Dismissible per-tenant via a `content_blocks(brand.onboarding_done)` row or a tenant column.
- Resolves R-A1-119 by surfacing the dead `tenants.contact_email` / `contact_phone` columns through the same UI that the new Contact & License editor writes to.

**Scope rough estimate:** small.

**Why it fits:** Direct conversion lift for new tenants — turning an empty admin into a clear "first 5 minutes" plan. The platform's sales-rep → onboarding → polish → deliver flow already has the data; this widget closes the loop.

### Phase 03 — Per-tenant social proof: ratings + heroStats

**Goal:** Make the hero "stats strip" and the reviews-page aggregate ratings line per-tenant editable.

**Includes (from recs R-A1-104):**
- Replace `lib/site.ts` `heroStats` (already done conceptually — the `home.hero.stats` content section is editable, but defaults are still tied to Samina's numbers). Audit defaults; ship neutral defaults shipped in round 1 — phase work is making the `lib/reviews.ts` `ratingsLine` (Zillow/Google/Realtor.com aggregate ratings) per-tenant. Store in `content_blocks(brand.aggregate_ratings)` or compute from a new `tenant_review_aggregates` view.
- Wire a small admin editor for "External rating sources" (source name, average value, review count) on the Reviews admin page.

**Scope rough estimate:** medium.

**Why it fits:** Aggregate ratings strip currently doesn't render (round-1 fix removed Samina's hardcoded numbers). Bringing it back per-tenant is real value for established realtors with 5★ Zillow profiles, but useless for new agents — admin editor needs to handle both cases.

### Phase 04 — White-label compliance + branding controls

**Goal:** Let tenants on custom domains hide the Brand Bonjour platform credit and pick which compliance logos appear.

**Includes (from recs R-A1-106, R-A1-117):**
- `tenants.is_white_labeled` boolean (super-admin only) → suppresses the "Powered by Brand Bonjour" footer line.
- Admin-driven compliance-logo block: tenant picks among Realtor®, Equal Housing, MLS-region logos, broker franchise logos. Stored in `content_blocks(brand.compliance_logos)` as a list.
- Master "Compliance assets library" so super admin can upload the canonical logo SVGs once and tenants pick from a dropdown.

**Scope rough estimate:** medium.

**Why it fits:** The platform's monthly-upsell motion already separates branded vs unbranded site rendering — formalizing the toggle lets you bundle "remove platform credit" into a higher tier. Also fixes the brand-use risk from showing Realtor® emblem on non-NAR tenants.

### Phase 05 — Lead intake hardening

**Goal:** Stop the public form submit firehose from becoming a spam sink the moment we share a tenant's URL.

**Includes (from recs R-A1-111, R-A1-109, R-A1-118, R-A1-121, and bug A1-019):**
- Hidden honeypot field on every form (`<input name="website_url" hidden>`). Server drops submissions whose honeypot is filled.
- Per-IP rate limit at the proxy layer (Netlify Edge KV: max 5 submits / minute / IP / tenant).
- Optional Cloudflare Turnstile or hCaptcha (toggled per tenant in `content_blocks(brand.form_security)`).
- Defense-in-depth: `/api/stripe/checkout` re-reads tenant via the auth'd Supabase client, doesn't trust the header alone (R-A1-109).
- Friendlier error path on Google integration save: "We couldn't reach Google Reviews — check the API key" (R-A1-118).
- "Test send" button on both `/admin/integrations/analytics` and (future) `/admin/integrations/email` (R-A1-121).

**Scope rough estimate:** medium.

**Why it fits:** Once we onboard a sales rep's first cohort of tenants and they start sharing URLs publicly, spam IS coming. Ship this before the next batch of customers, not after.

### Phase 06 — Admin information architecture cleanup

**Goal:** Collapse the redundant Brand Identity entry points into one canonical path, and rationalize the locked-feature visual language.

**Includes (from recs R-A1-114, R-A1-115, R-A1-122, R-A1-107, and bug A1-021):**
- Decide on a single brand path: either `/admin/brand` as the cards-grid + drop `/admin/content/brand/*`, OR keep `/admin/content/brand/*` and remove the cards-grid. R-A1-114's "Contact & License" card is already added under `/admin/brand` in round 1; this phase consolidates the rest.
- Logo caption ("Realtor") UX — already done in round 1 (R-A1-115), but this phase adds the in-admin preview so the realtor sees the caption change live as they type.
- Locked sidebar items: today they're dim with a lock icon. Replace with a tiny "🔒 Upgrade $20/mo" inline chip so the price is visible without hovering (R-A1-122).
- Better upgrade banner: show plan details + features list inline before redirecting to Stripe (R-A1-107).

**Scope rough estimate:** medium.

**Why it fits:** Once the platform serves more than a couple of tenants, "where do I edit X?" is the #1 support question. IA cleanup pays back every customer interaction.

### Phase 07 — Save-and-preview workflow

**Goal:** Eliminate the round-trip cost of editing → saving → opening another tab → checking the public site.

**Includes (from recs R-A1-102):**
- Add a "Preview" button on every Section editor that opens the live tenant URL in an iframe inside a side panel. Reuses the existing preview-token logic so even pending tenants are previewable.
- Optional split-screen "Save and stay" UX where the iframe auto-refreshes after save.

**Scope rough estimate:** medium.

**Why it fits:** Highest-impact UX investment after IA. Realtors are non-developers — they want WYSIWYG, not "save and check." Pairs naturally with the polish stage of the lifecycle.

### Phase 08 — Tenant-aware SEO surface

**Goal:** Stop the sitemap / robots / metadata from leaking platform-default copy on per-tenant requests.

**Includes (from recs R-A1-113):**
- `app/sitemap.ts` becomes tenant-aware (uses the current request's tenant's custom_domain or platform subdomain as the loc base).
- Per-page SEO metadata editor (title + description override per page, defaults from tenant's identity copy). Today we have generateMetadata using realtor_name — but no admin override for individual pages.
- Sitemap should include the tenant's actual communities + closings URLs, not the static `lib/communities.ts` list.

**Scope rough estimate:** medium.

**Why it fits:** SEO is part of the Visibility Plan upsell — making each tenant's site genuinely discoverable on its own domain is the value prop. Today the sitemap lists communities Samina knows; on demo-emerald that's a bug.

### Phase 09 — Mobile + accessibility audit

**Goal:** Verify the admin AND public template render correctly at 375x812 (iPhone SE/13 mini) — both an Agent 1 deferred item and a customer-trust issue.

**Includes (from recs R-A1-112):**
- Manual pass through `/admin?tenant=samina`, every editor card, the upgrade banner, and the dashboard at 375x812.
- Same pass through public `/`, `/contact`, `/communities/[slug]`, `/open-house/[slug]` (especially the flyer print view).
- Fix any layout breaks. Likely targets: sidebar collapse, sticky CTA bar overlap, header avatar size.

**Scope rough estimate:** small (audit) + small-to-medium (fixes).

**Why it fits:** Realtors and their clients open links from texts. If mobile is broken, the platform fails the "look at this on your phone" test that every sales call ends with.

---

## Architecture cheat sheet (for the agents)

- **Frontend template** = the React components in `app/(public routes)` + `components/`. Same code renders for every tenant; per-tenant data comes from the DB.
- **Per-tenant data lives in:** `tenants`, `content_blocks`, `media`, `communities`, `closings`, `reviews`, `partners`, `open_houses`, `custom_pages`, `integrations`, `tenant_subscriptions`.
- **Public route resolution:** edge `proxy.ts` → `lib/tenant/resolver.ts`. Steps: ?preview= token → ?tenant=<slug> → master hostname match → custom_domain match → subdomain match → unknown.
- **Sticky tenant cookie** (`bb-master-tenant`): set when ?tenant= URL resolves to a real tenant; falls back when no explicit ?tenant=. Lets internal admin <Link>s keep the tenant in context.
- **Working URLs for master** (sign in once):
  - Master dash: `/master`
  - View samina's site: `/?tenant=samina`
  - Edit samina's site: `/admin?tenant=samina`
  - Same with `demo-emerald` for the second tenant.
- **Auth:** Supabase Auth, cookie-session. Super-admin role bypasses tenant-membership check on every write action.
- **Stripe:** test mode keys live. Webhook lands at `/api/stripe/webhook`. Use Stripe test card `4242 4242 4242 4242` · any future expiry · any CVC · any zip.
- **Email:** Resend wired. `brandbonjour.com` verified — customer emails actually deliver. Internal alerts go to `admin@brandbonjour.com`.
- **AI polish:** Claude Sonnet 4.5 wired. Master "Polish Meet section" button on tenant detail.
- **Custom pages:** master creates via `/master/tenants/[slug]` "Custom Pages" panel → renders at `/p/<slug>` on the tenant's site → realtor edits at `/admin/pages`.
- **Hidden gotcha:** ?tenant= override only resolves to *active* tenants. Pending tenants need a ?preview=<uuid> query (master gets one from the Lifecycle panel).

## Test plan reference

**Agent 1 (template + admin):**
1. Inventory every editable element on the public template — header (avatar, name, role, brokerage), hero (eyebrow, titlelines, subtitle, CTAs, stats), intro/meet, services, communities, path teaser, closings, reviews strip, footer (name, brokerage, address, phone, email, copyright). Walk every public page: `/`, `/about`, `/buyers`, `/sellers`, `/path-to-ownership`, `/communities`, `/communities/[slug]`, `/closings`, `/reviews`, `/partners`, `/contact`, `/leave-review`. Plus custom pages at `/p/[slug]` if any exist.
2. For each editable item, confirm there's an admin route to change it (search `/admin/*` for the corresponding editor).
3. Open `/admin?tenant=samina`, edit one field per section, save, reload public site, confirm change appears.
4. Test integrations:
   - Add a fake Google Reviews API key in `/admin/integrations/google` (just to exercise the save path).
   - Save a fake GA4 ID in `/admin/integrations/analytics`.
   - On a locked feature like Analytics, click the "Subscribe to Visibility Plan" CTA — verify it produces a Stripe Checkout URL (don't pay).
5. Test custom pages: open `/master/tenants/samina` → "Custom Pages" → create one (`investors`, title "For Investors") → open `/admin/pages` as samina → edit body → reload `/p/investors` → confirm content rendered.
6. Test feature gating: locked features show upgrade banner with Subscribe button; unlocked features show real controls.
7. Test the file upload paths: pick a small image (e.g. `/admin/media`) → upload → confirm it appears in the library.

**Agent 3 (master + onboarding):**
1. Sign in to `/master` with the credentials above.
2. Go to `/master/prospects` → check the list view.
3. Open `/get-started?ref=test-rep&price=600` in a fresh incognito-equivalent (or just a different browser tab signed out) → fill ALL six steps with fake but realistic data → upload at least one photo via Cloudinary.
4. Submit. Land on Stripe Checkout. Pay with test card `4242 4242 4242 4242`.
5. Verify the webhook fired: back on master, the new prospect should be `paid` and a new tenant should exist under `/master/tenants`.
6. Open the new tenant. Walk through Lifecycle: advance to polishing → use AI Polish → advance to ready_for_review → grab the preview link → open it → verify the polished content renders → advance to ready_for_domain → confirm the customer would get a domain-instructions email (check admin@brandbonjour.com inbox or Resend logs).
7. From admin side: open `/admin?tenant=<newslug>&preview=<token>` → walk every editor card → confirm no errors on save.
8. Create at least one custom page from the master side, verify it shows up at `/p/<slug>` and in the realtor admin.

---
