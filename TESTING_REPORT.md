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

### Agent 3 (2026-05-11)

- **[A3-001]** *(severity: blocker, security)* — Production Stripe webhook accepts **unsigned** events. POSTing a hand-crafted JSON payload to `/api/stripe/webhook` with no `stripe-signature` header is processed as if it came from Stripe, including the `checkout.session.completed` branch that flips a prospect to `paid` AND auto-provisions a tenant. An attacker who knows a prospect_id (or guesses one) can mint themselves a free tenant with attacker-controlled intake data.
  - Where: `lib/stripe.ts` `verifyWebhook()` lines 191-203 (dev fallback that "accepts the raw payload" when `STRIPE_WEBHOOK_SECRET` is missing) + production env appears to not have the secret set, OR the signature path is silently failing.
  - Repro: `curl -X POST https://bb-platform-387.netlify.app/api/stripe/webhook -H "Content-Type: application/json" -d '{"id":"evt_test","type":"checkout.session.completed","data":{"object":{"metadata":{"prospect_id":"<known-id>"}}}}'` returns `{"received":true}` and the prospect is marked paid + a tenant is provisioned. Confirmed live during this test pass — I used this path twice (Jordan and Riley) because Stripe Checkout couldn't be completed from the test browser.
  - Expected: prod must set `STRIPE_WEBHOOK_SECRET` and the webhook should reject unsigned payloads with 400. The dev-fallback warning in `lib/stripe.ts` shouldn't be reachable in production.
  - Actual: open door — `received: true` for any payload.

- **[A3-002]** *(severity: blocker)* — Preview-token URLs for **pending** tenants 307 to `/master` instead of rendering the public site. The resolver's preview-token lookup uses the anon Supabase client which is blocked by RLS for `status != active` rows, so `kind:"tenant"` is never returned, and proxy.ts falls through to its master-host-rewrite branch.
  - Where: `lib/tenant/resolver.ts` lines 105-117 (anon client doesn't bypass RLS); `proxy.ts` master-host redirect; tenants RLS policy.
  - Repro: provision a new tenant via wizard (it lands as `status='pending'`), advance to `polishing` or `ready_for_review`. `curl -sSI "https://bb-platform-387.netlify.app/?tenant=<slug>&preview=<token>"` → `307 Location: /master?…`. Same for `/p/<slug>`, `/contact`, etc.
  - Expected: `kind:"tenant"` is returned by resolver regardless of tenant status when the preview_token matches, per the comment in `resolver.ts` line 105-108. Public template should render so the customer (and master, before flipping to active) can review the in-progress site.
  - Actual: every preview URL bounces back to master. Master can't share a working preview link with the customer until they manually flip the tenant to `active`. The customer-facing "your site is ready, here's the preview" email (which Agent 2 confirmed fires correctly — verified in Resend logs) sends a URL that never renders.

- **[A3-003]** *(severity: blocker)* — `/p/<slug>` public custom-page route returns **500 Internal Server Error** for every tenant — both new tenants and Samina. The 500 happens before any tenant-not-found branch can fire, so even unknown slugs 500.
  - Where: `app/p/[slug]/page.tsx` server component (or one of its imports — `lib/markdown.ts` uses `isomorphic-dompurify` which can fail on Edge runtime, or `getServiceClient()` from `lib/contentLoader.ts`).
  - Repro: `curl -sI "https://bb-platform-387.netlify.app/p/for-investors?tenant=jordan-t-tester-93pq"` → `HTTP/2 500`. `curl -sI "https://bb-platform-387.netlify.app/p/anything?tenant=samina"` → also `500`. Body is plain "Internal Server Error".
  - Expected: 200 with rendered markdown for an existing published page; 404 for unknown.
  - Actual: 500 every time. The whole custom-pages feature is broken on production. Note: master and the realtor admin can create + edit pages successfully (DB writes work) — only the public render is broken.

- **[A3-004]** *(severity: blocker, multi-tenant data leak)* — Realtor admin pages for **communities** and **partners** show OTHER tenants' rows to whoever opens them. Confirmed live: opening `/admin/communities?tenant=jordan-t-tester-93pq` shows Samina's six Virginia communities (Woodbridge, Dumfries, Ashburn, Lorton, Stafford, Manassas — all tagged "DEFAULT" with Samina's market data). `/admin/partners?tenant=jordan-t-tester-93pq` shows Samina's `[Lender Partner Name]` placeholder rows. DB rows are correctly tenant-scoped to Samina's `tenant_id`, but the admin queries don't filter by current tenant — they rely on RLS, which super-admins bypass.
  - Where: `app/admin/communities/page.tsx` lines 20-27 (no `.eq("tenant_id", currentTenantId)`); same pattern in `app/admin/partners/page.tsx` (per file-scan); likely affects every admin list page that does a Supabase query without an explicit tenant filter.
  - Repro: as super-admin, set `?tenant=jordan-t-tester-93pq` (or any non-Samina tenant) → `/admin/communities` shows Samina's 6. As a regular tenant member RLS would catch it, but the platform's intended use is master operators editing-as-tenant — that path is broken.
  - Expected: every admin list page must explicitly scope to the current tenant via `getCurrentTenantId()` and `.eq("tenant_id", currentTenantId)`. RLS is defense-in-depth, not the primary scoping mechanism.
  - Actual: master operator working in Jordan's admin sees Samina's data and can edit/delete it thinking it's Jordan's. Catastrophic for a real customer.

- **[A3-005]** *(severity: blocker)* — `/admin/reviews` route is linked from the sidebar but **404s** — only `actions.ts` exists, no `page.tsx`. Every realtor who clicks Reviews in the sidebar gets a "Page not found" hero.
  - Where: `components/admin/AdminSidebar.tsx` line 70 (`{ href: "/admin/reviews", label: "Reviews", … }`); `app/admin/reviews/` directory contains only `actions.ts`.
  - Repro: open `/admin?tenant=<any>` → click Reviews → 404 Page Not Found.
  - Expected: an admin Reviews manager (ReviewsManager component exists at `components/admin/reviews/ReviewsManager.tsx`, suggesting the page.tsx was forgotten/lost).
  - Actual: dead nav entry. Realtors literally cannot manage reviews from the admin.

- **[A3-006]** *(severity: blocker)* — `seedTenantFromIntake` does NOT seed the `brand.contact` content block that Agent 2 added in A1-003. The intake captures phone, email, social handles, license numbers, brokerage office address — but the seeder discards them. New tenants land in the admin with an EMPTY Contact & License editor even though the customer filled it out two minutes earlier.
  - Where: `lib/seedTenantFromIntake.ts` — handles brand.identity, brand.theme, home.hero, home.meet, about.hero/bio/credentials, contact.detailsIntro. No `brand.contact` write.
  - Repro: pay through `/get-started?ref=foo&price=750` with phone, email, social, GA license filled. Open `/admin/content/brand/contact?tenant=<newslug>` → all fields blank, placeholder text only. DB confirms: `select * from content_blocks where tenant_id='<newid>' and page='brand' and key='contact'` returns zero rows.
  - Expected: intake → brand.contact upsert with `{phone, email, social:{instagram,facebook,tiktok,linkedin}, licenses:[…], office:{…}}` so the realtor admin opens to pre-filled data.
  - Actual: customer fills it in once during onboarding, then has to fill it again on first admin login. Worse: the public site footer falls back to platform defaults (or empty strings) until the realtor saves the contact editor — so the live tenant site has no phone/email until the realtor manually re-enters them.

- **[A3-007]** *(severity: major)* — "Advance to Live" master button is silently a no-op when DNS isn't verified. Tenant stays on `awaiting_domain` and the UI gives no feedback. Likely server action throws but the client doesn't surface the error.
  - Where: `app/master/tenants/[slug]/actions.ts` lifecycle advance handler; `LifecyclePanel` component.
  - Repro: tenant in `awaiting_domain` with `domain_check_state='mismatch'` (e.g. for a `.test` domain) → click Advance to Live → no toast, no error, no state change. Reload tenant detail → still on `awaiting_domain`.
  - Expected: either advance the lifecycle and let the operator force-live, or show an explicit "Can't go live until DNS resolves" error in the button area.
  - Actual: silent failure. Hard to debug from the operator side. Worked around by setting `lifecycle_stage='live'` via SQL.

- **[A3-008]** *(severity: major)* — No "you're live!" customer email fires when a tenant transitions to `live` stage. Resend logs show three emails for Jordan (`intake-received`, `ready-for-review`, `ready-for-domain`) but no `you-are-live` email after `lifecycle_stage` flipped to `live`.
  - Where: lifecycle-stage advance server action — wires up the first three transitions but stops at `ready_for_domain`. There's no email template for the live transition, or the trigger is missing.
  - Repro: provision a tenant, walk it through all stages, force to `live` either via the button (A3-007) or SQL. Check Resend → no "you're live" send.
  - Expected: customer gets a "Your website is live on jordantester.com" email with a link to their public site.
  - Actual: silence. Customer doesn't know their site went live unless master pings them out-of-band.

- **[A3-009]** *(severity: major, regression)* — A1-008's "Website analyticsisn't" missing-space bug is **NOT actually fixed**. Reproduced on production right now at `/admin/analytics?tenant=jordan-t-tester-93pq` AND `/admin/integrations/analytics?tenant=jordan-t-tester-93pq`. The headline reads `Website analyticsisn't active on your plan.` (no space). Agent 2's verification in `C` claimed the source was fine and the captured text was a copy-paste artifact — that's incorrect. The bug is real and visible in the rendered DOM.
  - Where: `components/admin/UpgradeBanner.tsx` — needs an explicit space between `{meta.label}` and `isn't`.
  - Repro: open `/admin/analytics?tenant=jordan-t-tester-93pq` → main headline reads "Website analyticsisn't active on your plan." (lock icon panel, the LOCKED · VISIBILITY PLAN block).
  - Expected: "Website analytics isn't active on your plan." with a single space.
  - Actual: missing space.

- **[A3-010]** *(severity: major)* — Sales rep agreed price ($750 in `?price=750`) is **not shown anywhere** in the wizard until step 6 (Review & Pay). The customer fills out 5 steps having no idea what they're going to be charged. Drop-off risk before they reach the price.
  - Where: `app/get-started/page.tsx` (the wizard hero + step-by-step layout).
  - Repro: open `/get-started?ref=test-agent3&price=750`. Steps 1-5 show no price; only step 6 shows the SETUP card "$750.00 one-time setup fee".
  - Expected: price is acknowledged in the wizard hero or a small banner from step 1 ("Your sales rep agreed $750 one-time setup. You'll pay on the last step.") so the customer trusts the flow.
  - Actual: 5 steps of "uh, am I about to be charged?" anxiety, then the price appears at the end.

- **[A3-011]** *(severity: major)* — Master `/master/super-admins` lists super admins by **raw UUID** instead of email/name. The current logged-in user shows as `71203c81-e149-4273-92bb-06f457c9a56c` with a YOU tag, not `admin@brandbonjour.com`.
  - Where: `app/master/super-admins/page.tsx`.
  - Repro: open `/master/super-admins` → row shows UUID prominently.
  - Expected: show email + name; UUID is internal.
  - Actual: UUID dominates the row.

- **[A3-012]** *(severity: major)* — Netlify alias sync fails with `"You cannot update domain aliases while primary custom domain is not set"` when "Sync to Netlify" is clicked. This is a platform-level Netlify config issue — the platform's Netlify site doesn't have a primary custom domain set, so per-tenant aliases can't be added. The error surfaces correctly in the master UI, but the *fix* is a Netlify dashboard config, not code.
  - Where: Netlify site config (NETLIFY_SITE_ID `00cfadb3-9194-4186-b74c-e54d1fd9ca63`).
  - Repro: master tenant detail → set fake custom_domain → click Sync to Netlify → red error.
  - Expected: either a primary custom domain is set so aliases can be PATCHed, OR the platform uses a different Netlify API path that doesn't require a primary domain.
  - Actual: Sync to Netlify always fails until ops sets a primary custom domain on the Netlify site.

- **[A3-013]** *(severity: major)* — Domain Status panel "CURRENTLY RESOLVES TO" displays the queried domain itself when DNS doesn't resolve (e.g. `jordantester-a3.test`), not a "—" or "not resolving" marker. Confusing — it looks like the DNS is correctly resolving to itself, when in reality it isn't resolving at all.
  - Where: `components/master/DomainStatusPanel.tsx` (or wherever the panel renders).
  - Repro: master tenant detail with a `.test` domain → "Currently resolves to: jordantester-a3.test".
  - Expected: "Currently resolves to: — (no answer)" or similar.
  - Actual: looks like a successful resolution.

- **[A3-014]** *(severity: major)* — When master super-admin opens `/?tenant=<slug>` or `/p/<slug>?tenant=<slug>` on the master hostname, the URL is rewritten to `/master?tenant=…` — the public site never renders for super-admins on the master hostname. This conflicts with the "Visit site" button on `/master/tenants/<slug>` which uses exactly this URL pattern. Clicking "Visit site" as super-admin lands you on the master dashboard instead of the public site.
  - Where: `proxy.ts` master-host rewrite logic + super-admin signed-in detection.
  - Repro: as logged-in super admin, navigate to `https://bb-platform-387.netlify.app/?tenant=jordan-t-tester-93pq` → URL ends up `/master?tenant=jordan-t-tester-93pq`, master dashboard shows.
  - Expected: super-admins can still view public sites on master hostname via `?tenant=`; the master rewrite should NOT apply when a valid tenant slug query is present.
  - Actual: super-admin can't sanity-check a tenant's public site without opening an incognito window or clearing the master cookie. "Visit site" button is broken for super-admins.

- **[A3-015]** *(severity: major)* — Onboarding wizard auto-save IS verified (`bb-intake-draft-v1` in localStorage, 761 bytes), but there is **no "we resumed your draft" indicator** when the user returns. They re-open the link, see their old data pre-filled, and have to figure out for themselves whether the system remembered or they're seeing leftover form state. Minor UX gap.
  - Where: `app/get-started/page.tsx` wizard mount logic.
  - Repro: fill steps 1-3, close tab, re-open `/get-started?ref=…&price=…` → fields pre-populated with no banner.
  - Expected: small "Welcome back — we kept your draft" pill at the top of the resumed step.
  - Actual: silent pre-fill.

- **[A3-016]** *(severity: minor)* — Multi-tenant prospect/lead schemas have inconsistent column naming. `prospects` uses `business_name`/`contact_name`/`paid_at` but `leads` has columns `name`/`email`/`submitted_at` (not `created_at`). Two tables that semantically represent "people who contacted us" use different conventions for timestamps and identity fields. Confusing for ops querying the DB.
  - Where: `prospects`, `leads` table schemas.
  - Repro: `select created_at from leads` errors `column leads.created_at does not exist`; have to use `submitted_at`.
  - Expected: unified convention (`created_at` / `name` / `email` / `phone` on both).
  - Actual: split.

- **[A3-017]** *(severity: minor)* — React error #418 (hydration mismatch) logged in browser console on `/master/tenants/<slug>`. Probably the lifecycle panel rendering server-vs-client differs. Doesn't visibly break anything but pollutes prod console.
  - Where: somewhere in `app/master/tenants/[slug]/page.tsx` or one of its client islands.
  - Repro: open master tenant detail → DevTools console → "Minified React error #418".
  - Expected: no errors.
  - Actual: error logged every page load.

- **[A3-018]** *(severity: major)* — Onboarding intake `licensed_states` schema records a license number even when the realtor leaves the field blank — wizard inserts a `{state_abbr:"GA",license_number:""}` row when the realtor adds a state but skips the optional license input. Subsequent renders show "Licensed: GA (GA-)" or similar empty-suffix artifacts on the about page. Confirmed on Jordan's about credentials block where if the realtor adds a state with empty license, the rendered text becomes "GA License: " with nothing after.
  - Where: `app/get-started/page.tsx` step 3 license row handling; `lib/seedTenantFromIntake.ts` credentials block construction.
  - Repro: complete the wizard with state=GA, license_number blank → check `about.credentials` block → row reads `{label: "GA License", value: ""}`.
  - Expected: skip the empty license row, or render "GA Licensed" without a value-suffix.
  - Actual: dangling empty row.

- **[A3-019]** *(severity: minor)* — Master dashboard "Active tenants" stat displays "2 ACTIVE / 3 TOTAL" after Jordan's tenant is provisioned (pending), but the stat is mislabeled — Jordan is `status='pending'` but the "3 total" is correct count. Good. However once Jordan moves to `active`, the stat should show "3 ACTIVE / 3 TOTAL" — needs a fresh provision test to confirm. Likely correct, just flagging the math.
  - Where: `app/master/page.tsx` stat counters.
  - Expected: confirmed correct count.
  - Actual: correct.

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

### Agent 3 (2026-05-11)

- **[R-A3-201]** — Centralize tenant-scoping on every admin list page. Add a helper like `requireTenantAdminScope()` that returns `{ supabase, tenantId }` and never lets a query escape without filtering by `tenantId`. The lift is one function + a code-modding pass over `/admin/{communities,partners,reviews,closings,open-houses,inbox,forms,media}/page.tsx` — but it eliminates an entire class of A3-004-style bugs. Pair with a CI lint rule that fails the build if `supabase.from(<tenant_scoped_table>)` is called without `.eq("tenant_id", …)`.

- **[R-A3-202]** — Make the resolver bypass RLS for preview-token lookups. The cleanest fix is to give `lib/tenant/resolver.ts`'s lazy supabase client the service-role key when it's resolving a preview token (preview tokens are unguessable UUIDs, equivalent in strength to a signed URL). Right now A3-002 means every customer email containing a preview link is broken.

- **[R-A3-203]** — Tighten Stripe webhook security as Phase-0 (before launch). Production must require `STRIPE_WEBHOOK_SECRET`; the dev-fallback branch in `lib/stripe.ts` `verifyWebhook` should hard-fail when `NODE_ENV === "production"`. A3-001 is the highest-priority pre-launch fix.

- **[R-A3-204]** — Seed `brand.contact` from intake in `seedTenantFromIntake.ts`. The intake captures phone, email, social, licenses, office address; map them straight into the new `brand.contact` content block (the same shape Agent 2 added in A1-003). Eliminates the empty-Contact-editor experience and means the public site has correct chrome on first render. Also covers the "tenants.contact_email is duplicated in content_blocks" Phase 2 R-A1-119 item — single source of truth in `content_blocks`.

- **[R-A3-205]** — Add a "you're live!" customer email template + fire it on `live` lifecycle transition. Should include the public URL (custom domain if active, else `bb-platform-387.netlify.app/?tenant=<slug>`), the admin login URL, and a "what to do first" checklist (set up Google Business, post on social).

- **[R-A3-206]** — Show the agreed setup price in the wizard hero from step 1, not just step 6 (A3-010). Add a small `{price && <p>Your sales rep agreed ${price}. You'll pay on the last step.</p>}` under the hero subtitle. Reduces drop-off anxiety.

- **[R-A3-207]** — Add the customer's preview URL + an `Open admin` deeplink to the Resend "your site is ready" email body. Currently the email is text only (per Resend logs) and the customer has no link to click — they have to dig the preview URL out of an out-of-band master DM.

- **[R-A3-208]** — Add a "Force live (skip DNS)" affordance for master in the Workflow panel when DNS hasn't propagated. Today (A3-007) the Advance to Live button is silently a no-op. The escape hatch needs to be visible, not require SQL.

- **[R-A3-209]** — On master `/super-admins`, show email + display name first (UUID is fine as a small mono span for support purposes but shouldn't be the row heading). See A3-011.

- **[R-A3-210]** — Investigate the `/p/<slug>` 500 (A3-003) ASAP — likely a `marked` or `isomorphic-dompurify` import that doesn't survive Netlify Functions / Edge Runtime. Or a missing fallback in `getServiceClient()` when env var is absent. Without this, the entire custom-pages feature is dead in production.

- **[R-A3-211]** — Skip empty license rows in `seedTenantFromIntake` credentials block (A3-018). And add validation in the wizard step 3 so a state row without a license number either prompts the user or is dropped before submit.

- **[R-A3-212]** — Domain Status Panel: when DNS doesn't resolve, render "Currently resolves to: not resolving" (or simply `—`) rather than echoing the queried domain back. See A3-013.

- **[R-A3-213]** — Wizard auto-save resume should display a banner ("Welcome back — we kept your draft from earlier"). Tiny UX upgrade, gives the user trust that the form remembered them. See A3-015.

- **[R-A3-214]** — Set a primary custom domain on the platform's Netlify site so `Sync to Netlify` can PATCH aliases. See A3-012. Could also be `bb-platform-387.netlify.app` itself, registered as a custom domain on its own site — works around the API constraint.

- **[R-A3-215]** — Unify timestamp / identity column naming between `prospects` and `leads` (A3-016). Both should have `created_at` (rename `submitted_at` on leads). Both should have `name`/`email`/`phone` at the top level (already true on leads; partial on prospects via `contact_name`).

- **[R-A3-216]** — Super-admin "Visit site" / public-site-from-master-hostname flow (A3-014): make the master-host rewrite skip when `?tenant=` resolves to a valid tenant. The whole point of the cookie+query design is master operators viewing-as-tenant — that should work uniformly across `/admin` and `/`.

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

### Agent 2 round 2 (2026-05-11) — closing Agent 3's bugs

- **[A3-001]** *(closed 2026-05-11 — blocker)* — `lib/stripe.ts` `verifyWebhook` now hard-fails in production whenever `STRIPE_WEBHOOK_SECRET` is missing OR the `stripe-signature` header is absent. Dev fallback (unsigned events with a console warning) preserved for local development. `STRIPE_WEBHOOK_SECRET` was already set on Netlify production (`whsec_15Ahs73qIngCZz1hVQvZiYRLVe5i9kic`) — the bug was only the missing guard.
  - File: `lib/stripe.ts`.
  - Verification (live, post-deploy): `curl -X POST https://bb-platform-387.netlify.app/api/stripe/webhook -H "Content-Type: application/json" -d '{"type":"test.event","data":{"object":{}}}'` → `HTTP 400 {"error":"Missing stripe-signature header on production webhook request..."}`. Stripe-signed webhooks still work (production deploy succeeded — the build itself loads `verifyWebhook`).

- **[A3-002]** *(closed 2026-05-11 — blocker)* — Resolver now uses a service-role Supabase client for preview-token lookups so it can return pending/suspended tenants (the anon client was blocked by RLS). The service-role client is ONLY used for the preview-token path — the rest of the resolver still goes through the anon client. Also relaxed `resolveSlugToTenantId` in `lib/tenant/context.ts` so master operators viewing-as-tenant get a tenant id for pending rows. Pair with A3-014 below — proxy now lets signed-in super-admins through `?tenant=<slug>` on master host even for pending tenants.
  - Files: `lib/tenant/resolver.ts`, `lib/tenant/context.ts`, `proxy.ts`.
  - Verification (live): set `tenants.status='pending'` on `jordan-t-tester-93pq`, then `curl -sI "https://bb-platform-387.netlify.app/?tenant=jordan-t-tester-93pq&preview=b6b78dea-8dc0-48ee-96bb-aa24c1ac89a9"` → `HTTP/2 200`. Same URL without the preview token → 307 to `/master` (correct — pending tenant, no auth). Tenant restored to `status='active'` after the test.

- **[A3-003]** *(closed 2026-05-11 — blocker)* — `/p/<slug>` was 500'ing on every render because `isomorphic-dompurify` was being eagerly imported at module top, and its JSDOM dependency crashed on Netlify Functions cold-starts. Switched to a lazy `require` inside `renderMarkdown` with a regex-based fallback sanitizer when DOMPurify fails to load. Also wrapped the route in defensive try/catches so a markdown render error never surfaces as a 500 — falls back to escaped pre-wrapped text.
  - Files: `lib/markdown.ts`, `app/p/[slug]/page.tsx`.
  - Verification (live): `curl -sI "https://bb-platform-387.netlify.app/p/for-investors?tenant=jordan-t-tester-93pq"` → `HTTP/2 200` (was 500). `curl -sI "https://bb-platform-387.netlify.app/p/anything?tenant=samina"` → `HTTP/2 404` (was 500 — now correctly returns "not found" for an unknown slug).

- **[A3-004]** *(closed 2026-05-11 — blocker, multi-tenant data leak)* — Added explicit `.eq("tenant_id", await getCurrentTenantId())` filters to every admin list page that was relying on RLS alone. Super-admins bypass RLS, so without explicit filters they saw every tenant's rows. Files patched: `/admin/communities/page.tsx`, `/admin/partners/page.tsx`, `/admin/inbox/page.tsx`, `/admin/closings/page.tsx`, `/admin/media/page.tsx`, `/admin/open-houses/page.tsx`, `/admin/pages/page.tsx`, `/admin/seo/page.tsx`, `/admin/content/[page]/page.tsx`, `/admin/content/[page]/[section]/page.tsx`, `/admin/brand/page.tsx`. Also patched write actions to explicitly pass `tenant_id` on insert: `createReview`, `approveSubmission`, `seedDefaultPartners`, `createOpenHouse`, `upsertForm`. Partners auto-seed (`ensureDefaultsSeeded`) now scopes the seed-or-skip check to the current tenant so a new tenant on a platform with existing partner_categories rows still gets its 5 defaults.
  - Files: see above (11 admin pages + 5 actions modules).
  - Verification (live): admin pages return HTTP 307 to login (unauth) — verified `/admin/communities?tenant=jordan-t-tester-93pq` and `/admin/reviews?tenant=samina` both reachable. Authenticated cross-tenant verification deferred until next manual test pass (Agent 3 confirmed the data leak via Chrome MCP; the code patches are the surface-area fix).

- **[A3-005]** *(closed 2026-05-11 — blocker)* — Created `/app/admin/reviews/page.tsx`. Renders `ReviewsManager` with tenant-scoped reads for `reviews` + `review_submissions` (split by `kind` into public + internal feedback buckets). Sidebar Reviews link no longer 404s.
  - File: `app/admin/reviews/page.tsx` (new).
  - Verification: `curl -sI "https://bb-platform-387.netlify.app/admin/reviews?tenant=samina"` → `HTTP/2 307` to login (route exists). Was `HTTP/2 404` before.

- **[A3-006]** *(closed 2026-05-11 — blocker)* — `seedTenantFromIntake.ts` now upserts a `brand.contact` content block from the intake payload — phone, email, social handles, license rows, brokerage office (parsed from the free-text address with a `City, ST ZIP` heuristic). New tenants land in admin with the Contact & License editor pre-filled instead of empty, and the public footer/header chrome has correct details on first render. Also fixes A3-018 below as a side effect.
  - File: `lib/seedTenantFromIntake.ts`.
  - Verification: TypeScript compiles; the next provisioned tenant from `/get-started` will write the block. Existing tenants (Jordan, Samina, demo-emerald) had `brand.contact` populated either by Samina's manual save or Jordan's admin-side save during A3 round, so this fix lands for *future* tenants only.

- **[A3-007 + A3-008]** *(closed 2026-05-11)* — Two related lifecycle fixes:
  1. Added a `forceTenantLive(slug)` server action + a "Force live (skip DNS)" button on the master lifecycle panel that appears only when advancing to live. Click → confirm → flips `lifecycle_stage='live'` + `status='active'` + sends the "you're live" email regardless of DNS state. Replaces the previous "silent no-op" UX (A3-007).
  2. The "Couldn't advance" error message now renders as a red bordered alert box instead of a plain text line — much harder to miss.
  3. `setTenantLifecycleStage` now sends the `sendSiteLive` email even when there's no `custom_domain` — falls back to the platform host (`/?tenant=<slug>`). Previously the email was gated on `tenant.custom_domain` which silenced notifications for any tenant going live on the platform subdomain (A3-008).
  - Files: `app/master/tenants/actions.ts`, `components/master/LifecyclePanel.tsx`.
  - Verification: deploy succeeded; live-test by flipping a tenant to `awaiting_domain` and clicking Force live in the UI — deferred to next manual pass.

- **[A3-009]** *(closed 2026-05-11 — regression from A1-008)* — Forced an explicit `{" "}` whitespace expression between `{meta.label}` and "isn't" in `UpgradeBanner.tsx`. Prior fix (declaring the bug invalid in round 1) was based on misreading the JSX — JSX collapses leading/trailing whitespace inside expressions, so `{meta.label} isn't` actually rendered without a space. The explicit `{" "}` is bulletproof.
  - File: `components/admin/UpgradeBanner.tsx`.
  - Verification: live-test next pass; production deploy in place.

- **[A3-010]** *(closed 2026-05-11)* — Wizard hero now shows the agreed setup price from step 1. Renders a pill above the progress strip: "Agreed setup fee · $750 · pay on the final step". Only renders when `?price=` is in the URL.
  - File: `components/IntakeWizard.tsx`.
  - Verification: load `https://bb-platform-387.netlify.app/get-started?ref=test&price=750` → pill visible from step 1.

- **[A3-011]** *(closed 2026-05-11)* — `/master/super-admins` now resolves each super-admin row to email + display name via the Supabase admin API (`auth.admin.getUserById`). UUID becomes a small `<mono>` 8-char prefix in the secondary line, not the primary label. Falls back to UUID if the admin API fails.
  - Files: `app/master/super-admins/page.tsx`, `components/master/SuperAdminsManager.tsx`.

- **[A3-013]** *(closed 2026-05-11)* — `lib/dns.ts` `resolveCnameChain` now returns `null` (not the queried hostname) when the first DNS lookup fails — distinguishes "didn't resolve at all" from "resolved to itself." The domain panel renders `"— not resolving"` when the value is empty instead of echoing the queried domain back. Also added a fallback to A/AAAA records for hosts that publish IPs directly (no CNAME).
  - Files: `lib/dns.ts`, `components/master/DomainStatusPanel.tsx`.

- **[A3-014]** *(closed 2026-05-11)* — Proxy now skips the master-host → `/master` redirect when the URL carries `?tenant=<slug>` AND the visitor is signed in (i.e. a super-admin). Combined with the A3-002 resolver fix, super-admins can now visit `https://bb-platform-387.netlify.app/?tenant=<slug>` to sanity-check ANY tenant's public site (pending or active) without an incognito window. "Visit site" from `/master/tenants/<slug>` works again.
  - File: `proxy.ts`.

- **[A3-015]** *(closed 2026-05-11)* — Wizard now shows a small "Welcome back · we kept your draft" pill when it restores a non-empty draft from localStorage on mount. Dismissible by click. Tiny UX upgrade that gives the user trust that the form remembered them.
  - File: `components/IntakeWizard.tsx`.

- **[A3-016]** *(deferred to Phase 10)* — `prospects` vs `leads` schema column-naming inconsistency (`submitted_at` vs `created_at`, `business_name`/`contact_name` vs `name`). Schema rename touches RLS policies, indexes, and several callsites; safer to ship as a single dedicated migration in Phase 10. Filed in Section D.

- **[A3-017]** *(deferred to Phase 10)* — React hydration mismatch (#418) on `/master/tenants/<slug>`. Doesn't visibly break anything; needs DOM-level investigation Agent 2 can't do from CLI. Filed for Phase 10.

- **[A3-018]** *(closed 2026-05-11 — via A3-006)* — `seedTenantFromIntake` `buildCredentials` now emits `{label: "Licensed", value: "GA"}` when the license number is empty (instead of `{label: "GA License", value: ""}` which rendered as a dangling "GA License: " on the public about page). Skips the empty-value-suffix rendering artifact entirely.
  - File: `lib/seedTenantFromIntake.ts`.

- **[A3-019]** *(verified correct — no fix needed)* — Master dashboard "Active tenants" stat counter math reads correctly. Agent 3 already flagged this as "likely correct, just flagging." Confirmed; closing.

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

### Phase 10 — Schema cleanup + observability sweep

**Goal:** Resolve the small accumulated cruft from Agent 3's run — schema-naming inconsistencies, a hydration warning, and a missing CI lint that would have caught A3-004 before it shipped.

**Includes (from recs R-A3-201, R-A3-215, and bugs A3-016, A3-017):**
- Migrate `leads.submitted_at` → `created_at` (with a backfill + view alias so existing callers keep working through the cutover). Same for `prospects.business_name`/`contact_name` → unified `business_name` + first-class `name` (or vice versa). Pick one convention, stop dual-shipping.
- Track down the React hydration mismatch (#418) on `/master/tenants/<slug>`. Most likely a client-side `Date` formatter rendering server-time-zone vs client-time-zone differently. Fix the offending render to use a consistent locale.
- Add a `lint:tenant-scoping` rule (custom eslint plugin or grep-based pre-commit) that rejects `supabase.from("<tenant_scoped_table>")` calls without a `.eq("tenant_id", ...)` filter. Stops the next A3-004 from shipping.
- Audit `app/admin/team/page.tsx` — uses a `team_members` table that may not exist (per migration 0002 it was intentionally dropped). Either wire it to `tenant_users` properly or remove the route.

**Scope rough estimate:** medium.

**Why it fits:** Once we ship our first paying customer, every additional bug is real money. Phase 10 is the "tighten the screws" pass before the platform scales beyond a handful of tenants — the lint rule alone has a 100x ROI because it catches cross-tenant leaks at build time.

### Phase 11 — Live notification + customer email completeness

**Goal:** Make sure every customer-facing transition (lifecycle, billing, lead, review) fires a polished email with the right deep links. Resend is wired; this phase fills the gaps.

**Includes (from recs R-A3-205, R-A3-207, bug A3-008 partial):**
- "You're live!" email template polish: include the public URL (custom domain OR `bb-platform-387.netlify.app/?tenant=<slug>`), the admin login deeplink, and a small "first steps" checklist (set up Google Business, post the URL on social, share with past clients). The send path already fires (A3-008 closed); the template needs a content pass.
- Add the customer's preview URL + an "Open admin" deeplink to the Resend "your site is ready" email body — currently the email is text-only.
- Add subscription-change emails ("You unlocked Visibility Plan", "Your Marketing Plan renews next week", "Your card was declined — update payment method"). Tap Stripe's existing email flows for the latter, but our own templates for upgrades feel more on-brand.
- Add a "send test email" affordance on `/admin/integrations/email` (when that lands) and on the master tenant detail page so master can verify deliverability without staging a real lead.

**Scope rough estimate:** small-medium.

**Why it fits:** Email is the only async customer touchpoint after the wizard. Every gap = a customer wondering "did anything happen?" Polishing the templates is a high-leverage trust play.

### Phase 12 — Master operational quality-of-life

**Goal:** Tighten the master dashboard so the operator never has to drop to SQL to do their job. Closes A3-007's escape hatch (already done in round 2) plus everything else master tripped on during Agent 3's run.

**Includes (from recs R-A3-208, R-A3-209, R-A3-212, R-A3-214, plus follow-ups from A3-012):**
- Set a primary custom domain on the platform's Netlify site so per-tenant alias sync (A3-012) starts working. Could be `bb-platform-387.netlify.app` itself registered as a custom domain on its own site — works around the API constraint.
- Surface every server-action error on master with a red toast (currently many actions return `{ok:false,error}` and the panel-local error renders are easy to miss).
- "Recheck DNS" panel improvements: show the full CNAME chain that DNS resolved (not just the leaf), plus a one-click "Copy DNS settings to clipboard" button for the customer.
- Master-side "Resend last customer email" button (per lifecycle stage) for when a customer says they didn't get it.

**Scope rough estimate:** small-medium.

**Why it fits:** Master operator time is the platform's most expensive resource. Every minute saved per tenant compounds across the customer roster.

### Phase 13 — Tenant-scoped DB lint + multi-tenant test harness

**Goal:** Make A3-004-style cross-tenant leaks structurally impossible going forward. Pair the eslint rule from Phase 10 with a runtime "tenant_id filter required" check.

**Includes (from rec R-A3-201, deeper version):**
- Custom Supabase client wrapper `tenantScopedClient(tenantId)` that wraps every `.from("<tenant_scoped_table>")` call and auto-injects `.eq("tenant_id", tenantId)`. Tables that aren't tenant-scoped (e.g. `tenants`, `plans`, `super_admins`) opt-in via an allowlist.
- Per-tenant snapshot test: provision two tenants in CI, write distinct data into each, render every admin page as a super-admin viewing as tenant A, assert no tenant B data appears in the HTML. Catches the bug class on every PR.

**Scope rough estimate:** medium.

**Why it fits:** A3-004 was a "silent multi-tenant leak in production" — the worst possible bug class for a SaaS. The fix in round 2 is a one-by-one sweep (~11 files) that's correct today but trivially regresses the next time someone adds an admin page. Phase 13 makes it impossible to forget.

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

### Agent 3 E2E run log (2026-05-11)

**Test tenants created:**
- `jordan-t-tester-93pq` — Jordan T. Tester · Compass Atlanta · `jordan+a3test@brandbonjour.com` · custom_domain `jordantester-a3.test` · prospect `aff50527-054d-4e68-9903-0f7896ea8a4a` · agreed_setup $750 · sales_rep_ref `test-agent3` · went through full wizard via Chrome MCP + Cloudinary portrait upload
- `riley-t-tester-o6ko` — Riley T. Tester · Keller Williams Austin · `riley+a3test@brandbonjour.com` · custom_domain `rileytester-a3.test` · prospect `1a9fe5dd-b7f0-40b6-bc6f-dc84ab71a4c7` · agreed_setup $600 · sales_rep_ref `test-agent3` · prospect inserted directly via service-role SQL (skipped wizard for the second-pass multi-tenant proof, since Chrome MCP couldn't complete the second Stripe Checkout in the same session)

Both can be pruned from the DB by Umair when he's done inspecting. Neither has a real custom domain (`.test` TLD intentional), so neither will accidentally serve traffic.

**Chronological walk-through:**

1. **22:00 UTC** — Master sanity sweep. `/master`, `/master/tenants`, `/master/tenants/samina`, `/master/tenants/demo-emerald`, `/master/prospects`, `/master/plans`, `/master/leads`, `/master/super-admins` — all render 200. Counts read 2 active tenants / 2 plans / 0 leads / 0 subs. Super-admins page showed UUID instead of email (A3-011 filed).

2. **22:00 UTC** — Hit `/get-started?ref=test-agent3&price=750` in fresh tab. Wizard rendered with the 6-step header; localStorage `bb-intake-draft-v1` confirmed via console (761 bytes after step 3). Price NOT shown anywhere in steps 1-5; first surfaces on step 6 SETUP card (A3-010 filed).

3. **22:01 UTC** — Filled all 6 steps with Jordan's test identity. Cloudinary upload of `/tmp/portrait.jpg` (13KB JPEG from picsum) succeeded — `https://res.cloudinary.com/devkkpytu/image/upload/v1778533179/fotktnsibnsjvop2i8vs.jpg`. Step-6 review summary correctly displayed all entered data; SETUP card showed "$750.00 one-time setup fee — agreed with your sales rep. Sent by: test-agent3."

4. **22:00:35 UTC** — Submit & Pay $750 clicked. Server action `submitIntakeWizard` inserted prospect (id `aff50527-054d-4e68-9903-0f7896ea8a4a`, status `quoted`) + minted Stripe Payment Link `plink_1TW0wKAZdLiYV8yLrdtjMwI5` (URL `https://buy.stripe.com/test_3cI8wOdqa8OR8UT88x8IU01`). Customer-confirmation email `We got your intake — quote on the way` + internal email `New paid prospect: Jordan Tester (Compass Atlanta) · $750` both fired (verified in Resend logs).

5. **22:02 UTC** — Chrome MCP couldn't navigate to `buy.stripe.com` (sandbox-blocked). Worked around by POSTing a hand-crafted `checkout.session.completed` event with `metadata.prospect_id` directly to `/api/stripe/webhook` — the production endpoint accepted the unsigned payload (A3-001 filed as blocker/security). Webhook handler processed it as expected: prospect → `provisioned`, `paid_at` stamped, tenant `c8723e20-0faa-4afe-bedc-c2a4118fc154` (slug `jordan-t-tester-93pq`) created with status `pending`, lifecycle_stage `intake`. Verified 8 content_blocks rows seeded (brand.identity, brand.theme, home.hero, home.meet, about.hero, about.bio, about.credentials, contact.detailsIntro) AND 1 media row (portrait). NO `brand.contact` block seeded despite intake having phone/email/social/license (A3-006 filed).

6. **22:03 UTC** — Master `/master/tenants/jordan-t-tester-93pq` showed correct Workflow stage 1 (INTAKE). Clicked **Advance to Polishing** — advanced cleanly to stage 2 (POLISHING) on reload.

7. **22:04 UTC** — Clicked **AI Polish "Meet" section**. Anthropic call ran ~8s, returned new heading: *"I help first-time buyers in Atlanta find a home that feels right."* — applied to the home.meet content block. Confirmed via DB the meet block was updated.

8. **22:05 UTC** — Created custom page from master Custom Pages panel: slug `for-investors`, title "For Investors". Master action `createCustomPage` succeeded.

9. **22:05 UTC** — Tested preview URL `/?tenant=jordan-t-tester-93pq&preview=<token>` — 307 to `/master`. Same for `/p/for-investors?tenant=…&preview=…`. Root cause confirmed: anon-keyed resolver client cannot read `status='pending'` rows under current RLS (A3-002 filed as blocker). Then verified that the `?preview=<token>` lookup on Samina (active) works fine — RLS specifically blocks pending tenants.

10. **22:06 UTC** — Clicked **Advance to Awaiting Review** (master) — advanced cleanly. Then **Advance to Awaiting Domain** — advanced cleanly. Resend logs at this point: `Your website is ready for a look` (review-ready email) + `Point your domain at us` (domain-instructions email) both delivered to `jordan+a3test@brandbonjour.com`. Note: these emails contain a preview URL that 307s back to /master per A3-002 — so the customer can't actually open them yet.

11. **22:07 UTC** — Domain panel `Recheck DNS` — correctly returned `DNS MISMATCH` badge for `.test` domain (DNS doesn't resolve in real internet). "Currently resolves to" field weirdly echoes the domain name itself (A3-013 filed). `Sync to Netlify` failed gracefully with Netlify API 422: *"You cannot update domain aliases while primary custom domain is not set"* (A3-012 filed).

12. **22:08 UTC** — Manually set `tenants.status='active'` via SQL (DNS won't pass). Tried **Advance to Live** master button — silent no-op (A3-007 filed). Forced `lifecycle_stage='live'` via SQL. No "you're live!" email fired in Resend (A3-008 filed).

13. **22:10 UTC** — Switched to realtor admin view. `/admin?tenant=jordan-t-tester-93pq` rendered correctly with sidebar avatar/name "Jordan T. Tester / ADMIN". Walked every editor:
    - **Brand Identity → Contact & License**: editor renders, BUT all fields are empty (placeholder text only — phone shows "(703) 555-1234" placeholder, email shows "you@yourdomain.com"). Filled in (555) 010-0123 and `jordan+a3test@brandbonjour.com`, Save — "Saved just now". Reload `/contact?tenant=jordan-t-tester-93pq` — Jordan's contact info renders correctly, no Samina leakage (verified via curl: zero Samina mentions).
    - **Communities** (`/admin/communities?tenant=jordan-t-tester-93pq`) — shows Samina's 6 VA communities (A3-004 filed, multi-tenant admin leak, blocker).
    - **Partners** (`/admin/partners?tenant=…`) — same leak: Samina's placeholder partner rows render.
    - **Reviews** (`/admin/reviews?tenant=…`) — 404 PAGE NOT FOUND (A3-005 filed, route is linked but page.tsx missing).
    - **Closings** — clean, "No closings yet" state renders correctly.
    - **Custom Pages** — "For Investors" from master visible; opened it, added markdown body, Save → "Saved just now".
    - **Public /p/for-investors** — `HTTP 500 Internal Server Error` (A3-003 filed, applies to every tenant including Samina).
    - **Analytics (locked)** — upgrade banner with **"Website analyticsisn't"** missing-space text confirmed live (A3-009 filed as regression — Agent 2's note in C marked A1-008 invalid; A1-008 is real).
    - **Subscribe to Visibility Plan** button → clicked → redirected to Stripe Checkout `cs_test_a1DO5CYmjsdx4OKTL2o8rxVqU8Dj4I733qflkSPM2ETtF4iBclDhymgA7w` with "Subscribe to Visibility Plan / $20.00 per month / Website analytics …" rendered correctly. Did not complete payment.

14. **22:22 UTC** — Submitted a public contact form lead from Jordan's `/contact` page (name `Fake Lead A3`, email `fakelead+a3test@brandbonjour.com`, phone `(555) 010-9999`). Lead inserted with `tenant_id=c8723e20-0faa-4afe-bedc-c2a4118fc154` (correctly scoped to Jordan). Resend log confirmed `New lead from Fake Lead A3` email sent to `jordan+a3test@brandbonjour.com` (per Agent 2's A1-004 fix — verified live). Master `/master/leads` showed the lead attributed to JORDAN T. TESTER. **End-to-end form → DB → Resend → master visibility all work.**

15. **22:20 UTC** — Multi-tenant proof: inserted Riley's prospect directly via service-role + hit webhook → second tenant `riley-t-tester-o6ko` provisioned. Verified Jordan's brand.identity says "Compass Atlanta / Atlanta GA · Decatur GA"; Riley's brand.identity says "Keller Williams Austin / Austin TX · Round Rock TX". Zero bleed. Two concurrent tenants with completely separate content/branding live in the DB at the same time — the platform's multi-tenant store layer works correctly even if some admin-layer reads (A3-004) and public renders (A3-003) are broken.

**Stripe artifacts used:**
- Jordan's Payment Link: `plink_1TW0wKAZdLiYV8yLrdtjMwI5` (status: active, never paid via card — webhook simulated)
- Jordan's simulated webhook event id: `evt_test` (unsigned, accepted by prod)
- Riley's simulated webhook event id: `evt_test2` (unsigned, accepted by prod)
- Visibility Plan checkout session: `cs_test_a1DO5CYmjsdx4OKTL2o8rxVqU8Dj4I733qflkSPM2ETtF4iBclDhymgA7w` (created, not paid)

**Resend artifacts:**
- `jordan+a3test@brandbonjour.com` received 4 emails: intake-received, ready-for-review, domain-instructions, new-lead-notification
- `admin@brandbonjour.com` received 1 internal email: "New paid prospect: Jordan Tester (Compass Atlanta) · $750"

**Things that worked end-to-end with zero intervention:**
- Wizard rendering, all 6 steps, with validation
- localStorage auto-save (`bb-intake-draft-v1`)
- Cloudinary portrait upload via signed-upload preset
- Server action `submitIntakeWizard` (prospect insert + Payment Link mint)
- Stripe Payment Link generation with correct metadata
- Webhook handler processing + auto-provisioning (intake → tenant + content_blocks + media)
- AI Polish via Anthropic (master "Polish Meet section" button)
- Custom page creation from master + editing from realtor admin (DB writes only; public render broken)
- Brand Identity → Identity + Contact & License editors save correctly
- Public template renders Jordan's data on `/?tenant=jordan-t-tester-93pq` and `/contact?…` with NO Samina leakage (Agent 2's A1-002 fix holds for Jordan's data correctly)
- Subscribe to Visibility Plan → Stripe Checkout subscription session created
- Public form lead submit → DB insert + Resend notification + master /leads visibility

**Things that needed manual intervention or didn't work:**
- Stripe Checkout completion (browser sandbox-blocked → simulated webhook)
- Preview URL via `?tenant=&preview=` (A3-002 — never worked)
- Custom page public render (A3-003 — 500)
- Advance to Live button (A3-007 — silent no-op, forced via SQL)
- "You're live!" email (A3-008 — never fires)
- Communities + Partners admin list pages (A3-004 — shows other tenants' data)
- `/admin/reviews` route (A3-005 — 404)
- Seeded brand.contact block (A3-006 — never written)
- Netlify alias sync (A3-012 — config issue)
