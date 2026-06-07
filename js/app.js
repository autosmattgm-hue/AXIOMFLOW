(function () {
  "use strict";

  const base = window.AXIOM_BASE || "";
  let currentRoute = window.AXIOM_ROUTE || routeFromPath();
  let billingCycle = "monthly";
  let pendingAvatar = "";
  let billingReturnHandled = false;
  const FREE_USAGE_KEY = "axiomflow.freeUsage";
  const FREE_DAILY_LIMIT = 2;
  const freeFeatures = new Set(["businessFinder", "validation"]);
  const billingState = { loaded: false, active: false, status: "unpaid" };
  const protectedRoutes = new Set([
    "business-builder",
    "marketplace",
    "blueprint",
    "dashboard",
    "profile",
    "settings",
    "admin",
    "documentation",
    "api",
    "status",
    "integrations",
    "security"
  ]);

  const routes = [
    { id: "home", label: "Home", file: "index.html", title: "AXIOMFLOW - AI-Powered Business Automation", description: "Build high-income AI businesses faster with validation, automation, launch blueprints, and revenue dashboards.", nav: true },
    { id: "business-finder", label: "AI Business Finder", file: "ai-business-finder.html", title: "AI Business Finder | AXIOMFLOW", description: "Discover profitable AI business ideas with revenue potential, competition scoring, startup cost, and validation score.", nav: true },
    { id: "validation-center", label: "Validation Center", file: "validation-center.html", title: "Validation Center | AXIOMFLOW", description: "Run the three-tier pain test and score urgent demand, manual labor replacement, and existing budget.", nav: true },
    { id: "business-builder", label: "AI Business Builder", file: "ai-business-builder.html", title: "AI Business Builder | AXIOMFLOW", description: "Design AI business MVPs, compliance workflows, outreach campaigns, and monetization systems.", nav: true },
    { id: "marketplace", label: "Automation Marketplace", file: "automation-marketplace.html", title: "Automation Marketplace | AXIOMFLOW", description: "Browse automation templates for real estate, construction, plumbing, agencies, and consultants.", nav: true },
    { id: "blueprint", label: "Launch Blueprint Hub", file: "launch-blueprint-hub.html", title: "Launch Blueprint Hub | AXIOMFLOW", description: "Generate step-by-step launch plans for audience discovery, MVP strategy, pricing, launch, and growth.", nav: true },
    { id: "pricing", label: "Pricing", file: "pricing.html", title: "Pricing | AXIOMFLOW", description: "Choose Free, Starter, Pro, or Enterprise plans with monthly and annual billing.", nav: true },
    { id: "dashboard", label: "Dashboard", file: "dashboard.html", title: "Dashboard | AXIOMFLOW", description: "Track projects, AI generations, saved reports, revenue, analytics, and opportunity scores.", nav: true },
    { id: "login", label: "Login", file: "login.html", title: "Login | AXIOMFLOW", description: "Sign in to AXIOMFLOW and continue building AI-powered revenue systems.", nav: true },
    { id: "register", label: "Register", file: "register.html", title: "Register | AXIOMFLOW", description: "Create an AXIOMFLOW account and start validating AI business opportunities.", nav: true },
    { id: "profile", label: "Profile", file: "profile.html", title: "Profile | AXIOMFLOW", description: "Manage your AXIOMFLOW profile, avatar, password, and subscription.", nav: true },
    { id: "settings", label: "Settings", file: "settings.html", title: "Settings | AXIOMFLOW", description: "Configure theme, NVIDIA AI gateway, request limits, security, and local data.", nav: true },
    { id: "contact", label: "Contact", file: "contact.html", title: "Contact | AXIOMFLOW", description: "Contact AXIOMFLOW for automation strategy, enterprise onboarding, and partnerships.", nav: true },
    { id: "blog", label: "Blog", file: "blog.html", title: "Blog | AXIOMFLOW", description: "Read practical AI business, automation, SaaS, marketing, and growth articles.", nav: true },
    { id: "documentation", label: "Documentation", file: "documentation.html", title: "Documentation | AXIOMFLOW", description: "Explore AXIOMFLOW implementation docs, AI gateway architecture, security, and PWA guidance.", nav: true },
    { id: "admin", label: "Admin Panel", file: "admin-panel.html", title: "Admin Panel | AXIOMFLOW", description: "Monitor users, subscriptions, analytics, AI requests, content, and platform health.", nav: true },
    { id: "about", label: "About", file: "about.html", title: "About | AXIOMFLOW", description: "Learn how AXIOMFLOW helps teams turn AI business ideas into validated, automated, revenue-ready systems.", nav: true },
    { id: "case-studies", label: "Case Studies", file: "case-studies.html", title: "Case Studies | AXIOMFLOW", description: "Explore AXIOMFLOW case studies for construction, agencies, consulting, and service business automation.", nav: true },
    { id: "integrations", label: "Integrations", file: "integrations.html", title: "Integrations | AXIOMFLOW", description: "Connect AXIOMFLOW with CRM, payments, calendars, analytics, storage, and NVIDIA AI workflows.", nav: true },
    { id: "security", label: "Security", file: "security.html", title: "Security | AXIOMFLOW", description: "Review AXIOMFLOW security controls for authentication, AI gateways, privacy, compliance, and operations.", nav: true },
    { id: "api", label: "API", file: "api.html", title: "API | AXIOMFLOW", description: "Review AXIOMFLOW API architecture, gateway patterns, request models, rate limits, and webhooks.", nav: false },
    { id: "status", label: "Status", file: "status.html", title: "Status | AXIOMFLOW", description: "Monitor AXIOMFLOW platform status for PWA cache, authentication, AI gateway, analytics, and storage.", nav: false },
    { id: "privacy", label: "Privacy", file: "privacy.html", title: "Privacy | AXIOMFLOW", description: "Read the AXIOMFLOW privacy policy for data collection, AI requests, user rights, security, and retention.", nav: false },
    { id: "terms", label: "Terms", file: "terms.html", title: "Terms | AXIOMFLOW", description: "Read the AXIOMFLOW terms of service for acceptable use, subscriptions, AI outputs, and platform rules.", nav: false },
    { id: "forgot-password", label: "Forgot Password", file: "forgot-password.html", title: "Forgot Password | AXIOMFLOW", description: "Start a secure AXIOMFLOW password reset.", nav: false },
    { id: "reset-password", label: "Reset Password", file: "reset-password.html", title: "Reset Password | AXIOMFLOW", description: "Reset your AXIOMFLOW password.", nav: false }
  ];

  const featureCards = [
    {
      title: "AI Compliance & Auditing",
      eyebrow: "Risk to revenue",
      copy: "Scan websites, policies, software, and documents for GDPR gaps, privacy issues, legal risk, and regulatory drift.",
      tags: ["GDPR", "Privacy", "Audit reports", "Trust"],
      route: "business-builder"
    },
    {
      title: "Workflow Automation",
      eyebrow: "Manual work removed",
      copy: "Build focused tools for real estate, construction, plumbing, agencies, and consultants with approval-ready outputs.",
      tags: ["Bid generator", "Blueprint analyzer", "Lead scoring", "Proposal AI"],
      route: "marketplace"
    },
    {
      title: "Micro CRM",
      eyebrow: "Retention engine",
      copy: "Manage customers, smart reminders, AI follow-ups, invoices, booking, and contact history without CRM bloat.",
      tags: ["Customers", "Reminders", "Invoices", "Bookings"],
      route: "dashboard"
    },
    {
      title: "Hyper Personalized Outreach",
      eyebrow: "Pipeline creation",
      copy: "Turn website, LinkedIn, and company data into prospect summaries, sales emails, and follow-up sequences.",
      tags: ["Sales email", "Follow-ups", "Prospect briefs", "Conversion"],
      route: "business-builder"
    }
  ];

  const automationData = [
    { id: "construction-bid", name: "Construction Bid Generator", industry: "Construction", tier: "Pro", roi: 91, price: 79, summary: "Turns scope notes into bid-ready proposals, exclusions, timelines, and margin checks.", outcome: "8 hours saved per bid cycle" },
    { id: "blueprint-analyzer", name: "Blueprint Analyzer", industry: "Construction", tier: "Enterprise", roi: 88, price: 249, summary: "Summarizes blueprint risk, missing specs, change-order flags, and subcontractor questions.", outcome: "Fewer missed scope items" },
    { id: "real-estate-leads", name: "Real Estate Lead Qualification AI", industry: "Real Estate", tier: "Starter", roi: 82, price: 29, summary: "Scores buyers and sellers, drafts follow-ups, and routes urgent prospects to agents.", outcome: "Higher booking rate" },
    { id: "plumbing-dispatch", name: "Plumbing Dispatch Autopilot", industry: "Plumbing", tier: "Pro", roi: 86, price: 79, summary: "Captures job details, urgency, parts hints, ETA messages, and invoice-ready summaries.", outcome: "Shorter intake calls" },
    { id: "agency-proposal", name: "Agency Proposal Writer", industry: "Agencies", tier: "Pro", roi: 89, price: 79, summary: "Builds personalized proposals, retainers, follow-ups, and client onboarding checklists.", outcome: "More proposals sent weekly" },
    { id: "consultant-audit", name: "Consultant Compliance Audit", industry: "Consultants", tier: "Enterprise", roi: 93, price: 249, summary: "Packages client risk scans, executive reports, remediation actions, and renewal prompts.", outcome: "Premium audit retainers" }
  ];

  const pricingPlans = [
    { id: "free", name: "Free", monthly: 0, yearly: 0, copy: "Preview the workflow with tight limits before upgrading.", features: ["2 local previews per day", "Finder and validation only", "No saved reports", "No live NVIDIA AI"] },
    { id: "starter", name: "Starter", monthly: 29, yearly: 290, copy: "Launch lean automations for solo operators.", features: ["25 AI generations", "Micro CRM starter", "Marketplace templates", "Email support"] },
    { id: "pro", name: "Pro", monthly: 79, yearly: 790, copy: "Build paid pilots with analytics and revenue workflows.", features: ["Unlimited local reports", "Revenue dashboard", "Compliance analyzer", "Priority support"], featured: true },
    { id: "enterprise", name: "Enterprise", monthly: 249, yearly: 2490, copy: "Govern AI workflows for teams, agencies, and regulated clients.", features: ["Admin panel", "NVIDIA gateway controls", "Audit logs", "Onboarding strategy"] }
  ];

  const blogPosts = [
    { id: "pain-test", category: "AI Business", title: "The Three-Tier Pain Test for AI SaaS Ideas", excerpt: "A buyer-ready AI product must solve urgency, remove labor, and map to an existing budget.", readTime: "6 min", body: "Profitable AI products start with proof of pain. Score urgency, manual labor replacement, and budget before engineering work begins. When all three are visible, paid pilots become easier to sell and safer to build." },
    { id: "automation-roi", category: "Automation", title: "How to Price Automation Against Hours Saved", excerpt: "Use labor cost, delay cost, and risk reduction to anchor pricing without guesswork.", readTime: "5 min", body: "Automation pricing works when buyers can see the math. Estimate current hours, hourly cost, error cost, and cycle time. Then price below the value created while preserving enough margin for support and future development." },
    { id: "micro-crm", category: "SaaS", title: "Why Micro CRM Beats Heavy CRM for Niche Operators", excerpt: "Focused reminders, follow-ups, and invoice triggers can outperform bloated enterprise systems.", readTime: "4 min", body: "Most small teams do not need more fields. They need fewer missed follow-ups, faster booking, and a clean handoff from lead to invoice. Micro CRM wins by serving one revenue workflow extremely well." },
    { id: "outreach", category: "Marketing", title: "Personalized Outreach That Does Not Feel Automated", excerpt: "Make prospect research specific, useful, and tied to a business result.", readTime: "5 min", body: "Good outreach shows a buyer what you noticed, why it matters, and what measurable outcome you can test quickly. Keep the message short, avoid fake familiarity, and offer a low-friction diagnostic." },
    { id: "retention", category: "Growth", title: "Retention Metrics for AI Workflow Products", excerpt: "Track repeat completions, saved reports, usage expansion, and realized savings.", readTime: "7 min", body: "Retention depends on recurring value. The best AI workflow products measure jobs completed, reports saved, approvals passed, response time improved, and revenue tasks created." }
  ];

  const docSections = [
    { title: "NVIDIA AI Gateway", copy: "Configure a secure server endpoint that forwards approved AXIOMFLOW prompts to an NVIDIA NIM chat completions endpoint. Browser code never stores provider secrets.", tags: ["NIM", "Rate limits", "Retries", "CSRF"] },
    { title: "Authentication", copy: "The front-end implements validated registration, login, reset flow, JWT-shaped sessions, refresh persistence, hashed local passwords, and role-aware routing.", tags: ["JWT", "CSRF", "Session rotation", "RBAC"] },
    { title: "Data Model", copy: "Local entities mirror production tables for users, projects, AI reports, revenue entries, subscriptions, AI requests, and analytics events.", tags: ["Projects", "Reports", "Revenue", "Events"] },
    { title: "Growth System", copy: "SEO metadata, sitemap, blog architecture, conversion CTAs, pricing flows, analytics hooks, and marketplace templates support acquisition and retention.", tags: ["SEO", "A/B ready", "Funnels", "Programmatic pages"] }
  ];

  const caseStudies = [
    { id: "bid-flow", industry: "Construction", title: "Bid Flow Automation", metric: "41% faster bid cycles", summary: "A specialty contractor packaged bid intake, scope checks, and proposal writing into a repeatable AI workflow.", details: "The team replaced manual scope reviews with a guided intake, NVIDIA AI-backed summarization, margin prompts, and approval checkpoints. The outcome was faster proposals, fewer missed exclusions, and a clearer upsell path for premium project reviews." },
    { id: "agency-leads", industry: "Agencies", title: "Agency Lead Qualification Desk", metric: "3.2x more qualified calls", summary: "An agency used AXIOMFLOW to score inbound leads, draft replies, and route high-value prospects to senior sellers.", details: "The workflow scored budget, urgency, channel fit, and project readiness. Follow-ups were generated from public signals, saved into the micro CRM, and tracked against booking conversion." },
    { id: "privacy-audit", industry: "Consulting", title: "Privacy Audit Productization", metric: "$18k new monthly retainers", summary: "A consulting firm converted privacy reviews into a repeatable AI audit package with executive remediation reports.", details: "AXIOMFLOW created a fixed-scope audit, report template, risk register, and subscription-ready remediation workflow. The firm sold pilots first and expanded into ongoing monitoring." },
    { id: "field-service", industry: "Plumbing", title: "Field Service Dispatch Workflow", metric: "29% shorter intake calls", summary: "A service operator automated job triage, urgency notes, customer updates, and invoice-ready summaries.", details: "Call intake moved into a structured workflow with urgency rules, parts hints, scheduling notes, and customer message drafts. The team reduced repeat questions and improved same-day dispatch clarity." }
  ];

  const integrationData = [
    { name: "NVIDIA NIM Gateway", category: "AI", tier: "Core", summary: "Route approved prompts through a secure server endpoint to NVIDIA AI models without exposing secrets in browser code." },
    { name: "PayPal Subscriptions", category: "Payments", tier: "Revenue", summary: "Prepare subscription approval, recurring billing, cancellation, and webhook flows for paid AI automation products." },
    { name: "HubSpot CRM", category: "CRM", tier: "Pipeline", summary: "Sync qualified prospects, follow-up tasks, company notes, and saved outreach sequences." },
    { name: "Google Calendar", category: "Scheduling", tier: "Operations", summary: "Connect booking workflows, reminders, launch milestones, and customer follow-up events." },
    { name: "PostgreSQL", category: "Data", tier: "Scale", summary: "Model production users, projects, reports, revenue, subscriptions, usage, and audit logs." },
    { name: "Slack Alerts", category: "Ops", tier: "Teams", summary: "Notify teams about paid pilots, failed AI requests, platform health, and expansion opportunities." },
    { name: "Google Analytics 4", category: "Analytics", tier: "Growth", summary: "Track acquisition, activation, pricing clicks, saved reports, and funnel conversion events." },
    { name: "Zapier", category: "Automation", tier: "No-code", summary: "Trigger follow-ups, CRM updates, invoices, and document workflows from AXIOMFLOW events." }
  ];

  const securityControls = [
    { title: "Secret-safe AI Gateway", copy: "NVIDIA provider credentials belong on a server-side gateway, never inside static browser code.", tags: ["NVIDIA AI", "Secrets", "Proxy"] },
    { title: "Role-Based Access", copy: "Admin, user, and session-aware route controls protect sensitive operational surfaces.", tags: ["RBAC", "Admin", "Sessions"] },
    { title: "Request Governance", copy: "Rate limits, retries, CSRF headers, request logs, and fallback handling reduce abuse and operational risk.", tags: ["Rate limits", "CSRF", "Audit logs"] },
    { title: "Privacy by Design", copy: "Data minimization, local persistence, export flows, and deletion-ready structures support user trust.", tags: ["Privacy", "Retention", "Export"] }
  ];

  const views = {
    home: viewHome,
    "business-finder": viewBusinessFinder,
    "validation-center": viewValidationCenter,
    "business-builder": viewBusinessBuilder,
    marketplace: viewMarketplace,
    blueprint: viewBlueprint,
    pricing: viewPricing,
    dashboard: viewDashboard,
    login: viewLogin,
    register: viewRegister,
    profile: viewProfile,
    settings: viewSettings,
    contact: viewContact,
    blog: viewBlog,
    documentation: viewDocumentation,
    admin: viewAdmin,
    about: viewAbout,
    "case-studies": viewCaseStudies,
    integrations: viewIntegrations,
    security: viewSecurity,
    api: viewApi,
    status: viewStatus,
    privacy: viewPrivacy,
    terms: viewTerms,
    "forgot-password": viewForgotPassword,
    "reset-password": viewResetPassword
  };

  function routeFromPath() {
    const path = window.location.pathname.split("/").pop() || "index.html";
    const match = routes.find((route) => route.file === path);
    return match?.id || "home";
  }

  function routeById(id) {
    return routes.find((route) => route.id === id) || routes[0];
  }

  function hrefFor(routeId) {
    const route = routeById(routeId);
    return route.id === "home" ? `${base}index.html` : `${base}pages/${route.file}`;
  }

  function escapeHTML(value) {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return String(value ?? "").replace(/[&<>"']/g, (char) => map[char]);
  }

  function nl2br(value) {
    return escapeHTML(value).replace(/\n/g, "<br>");
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value || 0));
  }

  function csrfInput() {
    return `<input type="hidden" name="csrf" value="${escapeHTML(window.AxiomAuth?.getCsrfToken?.() || "")}">`;
  }

  function formData(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function safeParseJSON(value, fallback) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function getFreeUsage() {
    const day = todayKey();
    const usage = safeParseJSON(localStorage.getItem(FREE_USAGE_KEY), { day, count: 0 });
    if (usage.day !== day) return { day, count: 0 };
    return { day, count: Number(usage.count || 0) };
  }

  function freeRemaining() {
    if (hasPaidAccess()) return Infinity;
    return Math.max(0, FREE_DAILY_LIMIT - getFreeUsage().count);
  }

  function recordFreeUse() {
    const usage = getFreeUsage();
    usage.count += 1;
    localStorage.setItem(FREE_USAGE_KEY, JSON.stringify(usage));
    return usage;
  }

  function freeUpgradeNotice(context = "Free preview") {
    if (hasPaidAccess()) return "";
    return `
      <div class="empty-state upgrade-notice">
        <div>
          <h3>${escapeHTML(context)}</h3>
          <p>Free users get ${FREE_DAILY_LIMIT} local previews per day. Subscribe to unlock live NVIDIA AI, saved reports, dashboards, builders, blueprints, marketplace workflows, and PayPal-verified workspace access.</p>
        </div>
        <a class="btn" href="${hrefFor("pricing")}">Upgrade</a>
      </div>
    `;
  }

  function apiPath(path) {
    return `${base}${path.replace(/^\/+/, "")}`;
  }

  function billingQuery() {
    return new URLSearchParams(window.location.search);
  }

  function syncBillingState(access = {}) {
    Object.assign(billingState, { loaded: true, active: false, status: "unpaid" }, access);
    billingState.active = Boolean(access.active);
    window.AxiomAuth?.syncBillingAccess?.(billingState);
    return billingState;
  }

  async function refreshBilling() {
    try {
      const response = await fetch(apiPath("/api/billing/me"), { credentials: "same-origin" });
      const json = await response.json().catch(() => ({}));
      syncBillingState(json.access || {});
    } catch (error) {
      syncBillingState({});
    }
    return billingState;
  }

  function hasPaidAccess() {
    return Boolean(billingState.active);
  }

  function selectedCheckoutEmail() {
    const user = window.AxiomAuth?.getCurrentUser?.();
    return user?.email || sessionStorage.getItem("axiomflow.checkoutEmail") || "";
  }

  async function startCheckout(planId, cycle = billingCycle, next = "/pages/dashboard.html") {
    const user = window.AxiomAuth.getCurrentUser();
    const email = user?.email || selectedCheckoutEmail();
    if (!user || !email) {
      sessionStorage.setItem("axiomflow.pendingPlan", planId);
      sessionStorage.setItem("axiomflow.pendingBillingCycle", cycle);
      window.location.href = `${hrefFor("register")}?plan=${encodeURIComponent(planId)}`;
      return;
    }

    const response = await fetch(apiPath("/api/billing/checkout"), {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-AXIOM-CSRF": window.AxiomAuth?.getCsrfToken?.() || "" },
      body: JSON.stringify({
        plan: planId,
        billingCycle: cycle,
        email: user.email,
        name: user.name,
        next
      })
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.url) throw new Error(json.error || "PayPal subscription approval could not be started.");
    window.location.href = json.url;
  }

  async function verifyCheckoutReturn() {
    if (billingReturnHandled) return;
    const params = billingQuery();
    const subscriptionId = params.get("subscription_id") || params.get("subscriptionId") || "";
    if (params.get("checkout") !== "success" || !subscriptionId) return;
    billingReturnHandled = true;
    toast("Verifying payment", "Confirming your subscription with PayPal.");
    const response = await fetch(apiPath("/api/billing/verify-subscription"), {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-AXIOM-CSRF": window.AxiomAuth?.getCsrfToken?.() || "" },
      body: JSON.stringify({ subscriptionId })
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast("Payment not active", json.error || "PayPal has not confirmed an active subscription yet.");
      return;
    }
    syncBillingState(json.access || {});
    toast("Subscription active", "Your AXIOMFLOW workspace is unlocked.");
    window.location.href = cleanLocalPath(params.get("next") || "/pages/dashboard.html");
  }

  async function openBillingPortal() {
    const response = await fetch(apiPath("/api/billing/portal"), {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-AXIOM-CSRF": window.AxiomAuth?.getCsrfToken?.() || "" },
      body: JSON.stringify({ returnPath: "/pages/profile.html" })
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.url) throw new Error(json.error || "Billing portal could not be opened.");
    window.location.href = json.url;
  }

  function cleanLocalPath(value) {
    const text = String(value || "/pages/dashboard.html");
    if (!text.startsWith("/") || text.startsWith("//") || text.includes("://")) return "/pages/dashboard.html";
    return text;
  }

  function setSEO(route) {
    document.title = route.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", route.description);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", route.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", route.description);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.href = route.id === "home" ? "https://axiomflow.ai/" : `https://axiomflow.ai/pages/${route.file}`;
    }
  }

  function toast(title, message = "") {
    const region = document.getElementById("toastRegion");
    if (!region) return;
    const node = document.createElement("div");
    node.className = "toast";
    node.innerHTML = `<strong>${escapeHTML(title)}</strong>${message ? `<p>${escapeHTML(message)}</p>` : ""}`;
    region.appendChild(node);
    setTimeout(() => node.remove(), 5200);
  }

  function modal(title, body) {
    const root = document.getElementById("modalRoot");
    root.innerHTML = `
      <div class="modal-backdrop" data-modal-close>
        <section class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
          <div class="modal-header">
            <h2 id="modalTitle">${escapeHTML(title)}</h2>
            <button class="icon-button" type="button" data-modal-close aria-label="Close modal">x</button>
          </div>
          <div class="modal-body">${body}</div>
        </section>
      </div>
    `;
  }

  function emptyState(title, copy) {
    return `
      <div class="empty-state">
        <div>
          <h3>${escapeHTML(title)}</h3>
          <p>${escapeHTML(copy)}</p>
        </div>
      </div>
    `;
  }

  function navLinks(context = "desktop") {
    return routes
      .filter((route) => route.nav)
      .map((route) => {
        const active = route.id === currentRoute ? " is-active" : "";
        return `<a class="nav-link${active}" href="${hrefFor(route.id)}" data-route-link="${route.id}">${escapeHTML(route.label)}</a>`;
      })
      .join("");
  }

  function renderChrome() {
    const user = window.AxiomAuth?.getCurrentUser?.();
    const accountRoute = user ? (hasPaidAccess() ? "profile" : "pricing") : "login";
    document.getElementById("siteHeader").innerHTML = `
      <div class="header-inner">
        <a class="brand" href="${hrefFor("home")}" aria-label="AXIOMFLOW home">
          <img src="${base}assets/logo.svg" alt="" width="38" height="38">
          <span>AXIOMFLOW<small>NVIDIA AI powered</small></span>
        </a>
        <nav class="desktop-nav" aria-label="Primary">${navLinks("desktop")}</nav>
        <div class="header-actions">
          <div class="theme-switcher" role="group" aria-label="Theme">
            <button class="theme-option" type="button" data-theme-option="white">White</button>
            <button class="theme-option" type="button" data-theme-option="black">Black</button>
            <button class="theme-option" type="button" data-theme-option="milk">Milk</button>
          </div>
          <a class="btn btn-small btn-secondary" href="${hrefFor(accountRoute)}">${escapeHTML(user ? user.name.split(" ")[0] : "Login")}</a>
          <button class="icon-button" type="button" data-mobile-open aria-label="Open menu"><span class="menu-lines"></span></button>
        </div>
      </div>
    `;
    document.getElementById("mobileDrawer").innerHTML = `
      <div class="drawer-content">
        <div class="drawer-top">
          <a class="brand" href="${hrefFor("home")}">
            <img src="${base}assets/logo.svg" alt="" width="38" height="38">
            <span>AXIOMFLOW<small>NVIDIA AI powered</small></span>
          </a>
          <button class="icon-button" type="button" data-mobile-close aria-label="Close menu">x</button>
        </div>
        <nav class="drawer-nav" aria-label="Mobile">${navLinks("mobile")}</nav>
        <div class="drawer-bottom">
          <div class="theme-switcher" role="group" aria-label="Theme">
            <button class="theme-option" type="button" data-theme-option="white">White</button>
            <button class="theme-option" type="button" data-theme-option="black">Black</button>
            <button class="theme-option" type="button" data-theme-option="milk">Milk</button>
          </div>
          ${user ? `<button class="btn btn-small btn-secondary" type="button" data-logout>Logout</button>` : `<a class="btn btn-small" href="${hrefFor("register")}">Register</a>`}
        </div>
      </div>
    `;
    window.AxiomTheme?.setTheme?.(window.AxiomTheme.getTheme());
  }

  function renderFooter() {
    const groups = [
      { title: "Platform", links: ["business-finder", "validation-center", "business-builder", "marketplace", "blueprint", "pricing"] },
      { title: "Company", links: ["about", "case-studies", "integrations", "security", "contact", "blog"] },
      { title: "Resources", links: ["documentation", "api", "status", "privacy", "terms", "admin"] }
    ];
    return `
      <footer class="site-footer">
        <div class="footer-inner">
          <div class="footer-brand">
            <a class="brand" href="${hrefFor("home")}" aria-label="AXIOMFLOW home">
              <img src="${base}assets/logo.svg" alt="" width="38" height="38">
              <span>AXIOMFLOW<small>NVIDIA AI powered</small></span>
            </a>
            <p>AI-Powered Business Automation & Revenue Growth Platform for builders who care about validation, revenue, security, and scale.</p>
          </div>
          ${groups.map((group) => `
            <nav class="footer-nav" aria-label="${escapeHTML(group.title)}">
              <h2>${escapeHTML(group.title)}</h2>
              ${group.links.map((id) => {
                const route = routeById(id);
                return `<a href="${hrefFor(id)}">${escapeHTML(route.label)}</a>`;
              }).join("")}
            </nav>
          `).join("")}
        </div>
        <div class="footer-bottom">
          <span>Powered by NVIDIA AI</span>
          <span>Built for revenue, retention, automation, trust, and operational efficiency.</span>
        </div>
      </footer>
    `;
  }

  function render() {
    currentRoute = window.AXIOM_ROUTE || routeFromPath();
    const route = routeById(currentRoute);
    setSEO(route);
    renderChrome();
    const view = protectedRoutes.has(currentRoute) && !hasPaidAccess() ? viewSubscriptionRequired : (views[currentRoute] || views.home);
    document.getElementById("app").innerHTML = `${view()}${renderFooter()}`;
    if (currentRoute === "pricing") verifyCheckoutReturn();
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    if (hasPaidAccess() && (currentRoute === "dashboard" || currentRoute === "admin")) {
      requestAnimationFrame(() => window.AxiomDashboard?.drawCharts?.());
    }
  }

  function pageIntro(kicker, title, copy, actions = "") {
    return `
      <section class="app-section">
        <span class="section-kicker">${escapeHTML(kicker)}</span>
        <h1 class="section-title">${escapeHTML(title)}</h1>
        <p class="section-copy">${escapeHTML(copy)}</p>
        ${actions}
      </section>
    `;
  }

  function viewSubscriptionRequired() {
    return `
      ${pageIntro("Subscription required", "Activate AXIOMFLOW to unlock this workspace.", "Paid access is verified by PayPal and enforced by the server before product pages or AI requests are available.")}
      <section class="app-section">
        <div class="pricing-grid">
          ${pricingPlans.filter((plan) => plan.monthly > 0).map((plan) => `
            <article class="pricing-card ${plan.featured ? "is-featured" : ""}">
              <span class="eyebrow">${plan.featured ? "Best growth fit" : "Verified billing"}</span>
              <h3>${escapeHTML(plan.name)}</h3>
              <p>${escapeHTML(plan.copy)}</p>
              <div class="price">${formatMoney(billingCycle === "yearly" ? plan.yearly : plan.monthly)} <span>${billingCycle === "yearly" ? "/year" : "/month"}</span></div>
              <ul class="check-list">${plan.features.map((feature) => `<li>${escapeHTML(feature)}</li>`).join("")}</ul>
              <button class="btn ${plan.featured ? "" : "btn-secondary"}" type="button" data-subscribe="${escapeHTML(plan.id)}">Subscribe with PayPal</button>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  function viewHome() {
    const stats = window.AxiomDashboard?.getStats?.() || { projects: 0, reports: 0, totalRevenue: 0, avgOpportunity: 0 };
    return `
      <section class="app-section hero">
        <div class="hero-copy">
          <span class="section-kicker">AI-powered business automation</span>
          <h1 class="section-title">Build High-Income AI Businesses Faster Than Ever</h1>
          <p class="section-copy">Discover profitable niches, validate demand, automate workflows, and launch revenue-generating AI businesses.</p>
          <div class="hero-actions">
            <a class="btn" href="${hrefFor("business-finder")}">Start Building</a>
            <button class="btn btn-secondary" type="button" data-demo>Watch Demo</button>
          </div>
          <ul class="trust-row" aria-label="AXIOMFLOW performance indicators">
            <li><strong>${stats.projects}+</strong><span>Active project pipelines</span></li>
            <li><strong>${stats.avgOpportunity}%</strong><span>Average opportunity score</span></li>
            <li><strong>${formatMoney(stats.totalRevenue)}</strong><span>Tracked launch revenue</span></li>
            <li><strong>NVIDIA AI</strong><span>Gateway-ready inference</span></li>
          </ul>
        </div>
        <div class="dashboard-preview" aria-label="Animated AXIOMFLOW dashboard preview">
          <div class="preview-top">
            <div class="preview-dots"><span></span><span></span><span></span></div>
            <span class="preview-badge">Revenue automation live</span>
          </div>
          <div class="preview-grid">
            <div class="preview-card">
              <strong>Opportunity Score</strong>
              <span>Construction bid generator</span>
              <div class="meter" style="--value: 84%"><span></span></div>
            </div>
            <div class="preview-card">
              <strong>Validation Center</strong>
              <span>Urgency, labor, and budget passed</span>
              <div class="meter" style="--value: 91%"><span></span></div>
            </div>
            <div class="preview-card">
              <strong>Monthly Growth</strong>
              <div class="bar-chart" aria-hidden="true">
                <span style="height: 28%"></span><span style="height: 44%"></span><span style="height: 40%"></span><span style="height: 62%"></span>
                <span style="height: 76%"></span><span style="height: 70%"></span><span style="height: 88%"></span><span style="height: 96%"></span>
              </div>
            </div>
            <div class="preview-card">
              <strong>Saved AI Reports</strong>
              <span>Blueprints, audits, outreach, pricing</span>
              <ul class="pill-list"><li class="pill">Launch</li><li class="pill">Compliance</li><li class="pill">CRM</li></ul>
            </div>
          </div>
        </div>
      </section>
      <div class="band">
        <section class="app-section">
          <span class="section-kicker">Platform modules</span>
          <h2 class="section-title">From idea to automation revenue.</h2>
          <p class="section-copy">AXIOMFLOW combines validation, workflow tooling, CRM, outreach, launch planning, analytics, and admin controls in one lightweight PWA.</p>
          <div class="feature-grid">
            ${featureCards.map((card) => `
              <article class="feature-card">
                <span class="eyebrow">${escapeHTML(card.eyebrow)}</span>
                <h3>${escapeHTML(card.title)}</h3>
                <p>${escapeHTML(card.copy)}</p>
                <ul class="pill-list">${card.tags.map((tag) => `<li class="pill">${escapeHTML(tag)}</li>`).join("")}</ul>
                <div class="button-row"><a class="btn btn-small btn-secondary" href="${hrefFor(card.route)}">Open module</a></div>
              </article>
            `).join("")}
          </div>
        </section>
      </div>
      <section class="app-section">
        <span class="section-kicker">Operating model</span>
        <h2 class="section-title">Built for revenue, trust, and repeatable launch motion.</h2>
        <div class="card-grid">
          <article class="card"><h3>Conversion-ready acquisition</h3><p>SEO metadata, blog structure, pricing flows, CTA paths, and saved validation outputs turn anonymous visitors into active builders.</p></article>
          <article class="card"><h3>Secure AI architecture</h3><p>Client requests use rate limits, CSRF headers, structured prompts, retries, and a secure NVIDIA gateway setting that keeps secrets off the browser.</p></article>
          <article class="card"><h3>Scalable product analytics</h3><p>Projects, reports, revenue entries, AI usage, and admin events are modeled as production-ready entities for a future API layer.</p></article>
        </div>
      </section>
    `;
  }

  function viewBusinessFinder() {
    const last = window.AxiomDashboard?.getReports?.("businessFinder")?.[0];
    return `
      ${pageIntro("AI Business Finder", "Discover profitable AI business opportunities.", "Enter your constraints and generate business ideas with revenue potential, competition score, startup cost, and validation score.")}
      ${freeUpgradeNotice(`${freeRemaining()} free previews left today`)}
      <section class="app-section tool-layout">
        <form class="tool-panel is-sticky" data-form="businessFinder" novalidate>
          ${csrfInput()}
          <h2>Opportunity inputs</h2>
          <div class="form-grid">
            <div class="field"><label for="industry">Industry</label><input id="industry" name="industry" required value="Construction"></div>
            <div class="field"><label for="budget">Budget</label><input id="budget" name="budget" inputmode="numeric" required value="12000"></div>
            <div class="field"><label for="skills">Skills</label><input id="skills" name="skills" required value="sales, operations, workflow design"></div>
            <div class="field"><label for="teamSize">Team Size</label><input id="teamSize" name="teamSize" inputmode="numeric" required value="2"></div>
            <div class="field"><label for="targetMarket">Target Market</label><input id="targetMarket" name="targetMarket" required value="specialty contractors"></div>
          </div>
          <p class="error-text" data-error></p>
          <div class="button-row"><button class="btn" type="submit">Generate ideas</button></div>
        </form>
        <div class="tool-panel results-panel" id="businessFinderResult">
          ${last ? renderBusinessFinderReport(last.result) : emptyState("Ready to find the highest-margin lane", "Your generated business ideas will appear here with scores, costs, and next launch actions.")}
        </div>
      </section>
    `;
  }

  function viewValidationCenter() {
    const last = window.AxiomDashboard?.getReports?.("validation")?.[0];
    return `
      ${pageIntro("Validation Center", "Run the three-tier pain test.", "Score urgent demand, manual labor replacement, and existing budget before committing build resources.")}
      ${freeUpgradeNotice(`${freeRemaining()} free previews left today`)}
      <section class="app-section tool-layout">
        <form class="tool-panel is-sticky" data-form="validation" novalidate>
          ${csrfInput()}
          <h2>Pain test</h2>
          ${validationQuestion("urgent", "Does it solve an urgent problem?")}
          ${validationQuestion("manualLabor", "Does it replace manual labor?")}
          ${validationQuestion("existingBudget", "Is there an existing budget?")}
          <p class="error-text" data-error></p>
          <div class="button-row"><button class="btn" type="submit">Score validation</button></div>
        </form>
        <div class="tool-panel results-panel" id="validationResult">
          ${last ? renderValidationReport(last.result) : emptyState("Validation score meter waiting", "Answer the three questions to receive a Pass, Warning, or Fail result with next actions.")}
        </div>
      </section>
    `;
  }

  function validationQuestion(name, label) {
    return `
      <fieldset class="field">
        <legend class="fieldset-label">${escapeHTML(label)}</legend>
        <div class="radio-card-group">
          ${["yes", "partial", "no"].map((value, index) => `
            <label class="radio-card">
              <input type="radio" name="${name}" value="${value}" ${index === 0 ? "checked" : ""}>
              <span>${escapeHTML(value === "yes" ? "Yes" : value === "partial" ? "Partly" : "No")}</span>
              <small>${escapeHTML(value === "yes" ? "Evidence is strong" : value === "partial" ? "Needs proof" : "Weak signal")}</small>
            </label>
          `).join("")}
        </div>
      </fieldset>
    `;
  }

  function viewBusinessBuilder() {
    const last = window.AxiomDashboard?.getReports?.("builder")?.[0];
    return `
      ${pageIntro("AI Business Builder", "Turn a validated idea into a paid AI business.", "Generate MVP modules, architecture, monetization, compliance scans, and personalized outreach from one builder surface.")}
      <section class="app-section tool-layout">
        <div class="tool-panel is-sticky">
          <form data-form="builder" novalidate>
            ${csrfInput()}
            <h2>MVP builder</h2>
            <div class="form-grid">
              <div class="field"><label for="builderNiche">Niche</label><input id="builderNiche" name="niche" required value="Construction automation"></div>
              <div class="field"><label for="builderOffer">Offer</label><input id="builderOffer" name="offer" required value="AI bid and proposal command center"></div>
              <div class="field"><label for="builderAudience">Audience</label><input id="builderAudience" name="audience" required value="specialty contractors"></div>
              <div class="field"><label for="builderModel">Revenue model</label><select id="builderModel" name="revenueModel"><option>Subscription</option><option>Usage-based</option><option>Paid pilot</option><option>Hybrid services</option></select></div>
            </div>
            <p class="error-text" data-error></p>
            <div class="button-row"><button class="btn" type="submit">Build MVP plan</button></div>
          </form>
        </div>
        <div class="tool-panel results-panel" id="builderResult">
          ${last ? renderBuilderReport(last.result) : emptyState("Builder output waiting", "Generate modules, stack, monetization, and launch KPIs for your AI business.")}
        </div>
      </section>
      <section class="app-section">
        <span class="section-kicker">Revenue tool suite</span>
        <h2 class="section-title">Compliance and outreach generators.</h2>
        <div class="card-grid">
          <form class="tool-panel" data-form="compliance" novalidate>
            ${csrfInput()}
            <h2>Compliance Analyzer</h2>
            <div class="form-grid">
              <div class="field"><label for="complianceCompany">Company</label><input id="complianceCompany" name="company" required value="Northstar Automation"></div>
              <div class="field"><label for="complianceSurface">Surface</label><input id="complianceSurface" name="surface" required value="website, privacy policy, client portal"></div>
              <div class="field"><label for="complianceNotes">Notes</label><textarea id="complianceNotes" name="notes">Processes payment and client project data for service businesses.</textarea></div>
            </div>
            <p class="error-text" data-error></p>
            <div class="button-row"><button class="btn btn-secondary" type="submit">Run scan</button></div>
            <div id="complianceResult" class="report-card" style="margin-top: 16px">${emptyState("No scan yet", "Compliance findings and remediation actions will appear here.")}</div>
          </form>
          <form class="tool-panel" data-form="outreach" novalidate>
            ${csrfInput()}
            <h2>Outreach Generator</h2>
            <div class="form-grid">
              <div class="field"><label for="companyName">Company Name</label><input id="companyName" name="companyName" required value="Blue Ridge Builders"></div>
              <div class="field"><label for="websiteUrl">Website URL</label><input id="websiteUrl" name="websiteUrl" type="url" required value="https://example.com"></div>
              <div class="field"><label for="linkedinUrl">LinkedIn URL</label><input id="linkedinUrl" name="linkedinUrl" type="url" required value="https://linkedin.com/company/example"></div>
            </div>
            <p class="error-text" data-error></p>
            <div class="button-row"><button class="btn btn-secondary" type="submit">Generate outreach</button></div>
            <div id="outreachResult" class="report-card" style="margin-top: 16px">${emptyState("No outreach yet", "Prospect summary, email, and follow-ups will appear here.")}</div>
          </form>
        </div>
      </section>
    `;
  }

  function viewMarketplace() {
    return `
      ${pageIntro("Automation Marketplace", "Deploy niche workflow automations faster.", "Browse revenue-ready automations for real estate, construction, plumbing, agencies, and consultants.")}
      <section class="app-section">
        <div class="market-toolbar">
          <div class="input-row">
            <div class="field"><label for="marketSearch">Search</label><input id="marketSearch" data-market-search></div>
            <div class="field"><label for="marketIndustry">Industry</label><select id="marketIndustry" data-market-filter><option value="">All industries</option>${[...new Set(automationData.map((item) => item.industry))].map((industry) => `<option>${escapeHTML(industry)}</option>`).join("")}</select></div>
          </div>
          <form class="tool-panel" data-form="roi" novalidate>
            <h2>ROI calculator</h2>
            <div class="input-row">
              <div class="field"><label for="hoursSaved">Hours saved/week</label><input id="hoursSaved" name="hours" inputmode="numeric" value="8"></div>
              <div class="field"><label for="hourlyRate">Hourly value</label><input id="hourlyRate" name="rate" inputmode="numeric" value="95"></div>
            </div>
            <div class="button-row"><button class="btn btn-secondary" type="submit">Calculate ROI</button></div>
            <p id="roiResult" class="section-copy" style="margin-top: 10px"></p>
          </form>
        </div>
        <div class="card-grid" id="marketGrid">${renderMarketCards()}</div>
      </section>
    `;
  }

  function renderMarketCards(filter = "", query = "") {
    const needle = query.toLowerCase();
    const cards = automationData.filter((item) => {
      const matchesFilter = !filter || item.industry === filter;
      const matchesQuery = !needle || `${item.name} ${item.summary} ${item.industry}`.toLowerCase().includes(needle);
      return matchesFilter && matchesQuery;
    });
    if (!cards.length) return emptyState("No automations match", "Adjust the industry or search term to reveal more marketplace templates.");
    return cards.map((item) => `
      <article class="market-card">
        <div>
          <span class="eyebrow">${escapeHTML(item.industry)} - ${escapeHTML(item.tier)}</span>
          <h3>${escapeHTML(item.name)}</h3>
          <p>${escapeHTML(item.summary)}</p>
        </div>
        <div class="market-meta">
          <span class="score-badge">${item.roi}% ROI score</span>
          <span class="tag">${formatMoney(item.price)}/mo</span>
          <span class="tag">${escapeHTML(item.outcome)}</span>
        </div>
        <button class="btn btn-small btn-secondary" type="button" data-save-automation="${escapeHTML(item.id)}">Save automation</button>
      </article>
    `).join("");
  }

  function viewBlueprint() {
    const last = window.AxiomDashboard?.getReports?.("blueprint")?.[0];
    return `
      ${pageIntro("Launch Blueprint Hub", "Generate a step-by-step launch roadmap.", "Plan audience discovery, community research, MVP strategy, pricing, launch, and growth in one structured blueprint.")}
      <section class="app-section tool-layout">
        <form class="tool-panel is-sticky" data-form="blueprint" novalidate>
          ${csrfInput()}
          <h2>Blueprint inputs</h2>
          <div class="form-grid">
            <div class="field"><label for="blueprintNiche">Niche</label><input id="blueprintNiche" name="niche" required value="Construction workflow automation"></div>
            <div class="field"><label for="blueprintAudience">Audience</label><input id="blueprintAudience" name="audience" required value="specialty contractors"></div>
            <div class="field"><label for="blueprintPrice">Starting price</label><input id="blueprintPrice" name="price" required value="$799/month"></div>
            <div class="field"><label for="blueprintTimeline">Launch timeline</label><input id="blueprintTimeline" name="timeline" required value="30 days"></div>
          </div>
          <p class="error-text" data-error></p>
          <div class="button-row"><button class="btn" type="submit">Generate blueprint</button></div>
        </form>
        <div class="tool-panel results-panel" id="blueprintResult">
          ${last ? renderBlueprintReport(last.result) : emptyState("Blueprint hub waiting", "Your launch roadmap will appear here with ordered sections and operating metrics.")}
        </div>
      </section>
    `;
  }

  function viewPricing() {
    const params = billingQuery();
    const notice = params.get("gate") === "subscription"
      ? `<div class="empty-state"><div><h3>Subscription required</h3><p>Choose a paid plan to unlock AXIOMFLOW product pages and live AI workflows.</p></div></div>`
      : params.get("checkout") === "cancelled"
        ? `<div class="empty-state"><div><h3>Checkout cancelled</h3><p>Your subscription was not activated. You can restart checkout when ready.</p></div></div>`
        : params.get("checkout") === "success"
          ? `<div class="empty-state"><div><h3>Verifying payment</h3><p>PayPal is confirming your subscription and unlocking your workspace.</p></div></div>`
          : "";
    return `
      ${pageIntro("Pricing", "Plans that scale from validation to enterprise automation.", "Switch monthly or annual billing, then activate the plan that matches your launch stage.", `<div class="button-row"><div class="segmented" role="group" aria-label="Billing cycle"><button type="button" data-billing="monthly" class="${billingCycle === "monthly" ? "is-active" : ""}">Monthly</button><button type="button" data-billing="yearly" class="${billingCycle === "yearly" ? "is-active" : ""}">Yearly</button></div></div>`)}
      <section class="app-section">
        ${notice}
        <div class="pricing-grid">
          ${pricingPlans.map((plan) => {
            const price = billingCycle === "yearly" ? plan.yearly : plan.monthly;
            const suffix = billingCycle === "yearly" ? "/year" : "/month";
            const paid = price > 0;
            return `
              <article class="pricing-card ${plan.featured ? "is-featured" : ""}">
                <span class="eyebrow">${plan.featured ? "Best growth fit" : "AXIOMFLOW"}</span>
                <h3>${escapeHTML(plan.name)}</h3>
                <p>${escapeHTML(plan.copy)}</p>
                <div class="price">${formatMoney(price)} <span>${suffix}</span></div>
                <ul class="check-list">${plan.features.map((feature) => `<li>${escapeHTML(feature)}</li>`).join("")}</ul>
                ${paid
                  ? `<button class="btn ${plan.featured ? "" : "btn-secondary"}" type="button" data-subscribe="${escapeHTML(plan.id)}">Subscribe with PayPal</button>`
                  : `<a class="btn btn-secondary" href="${hrefFor("business-finder")}">Start free preview</a>`}
              </article>
            `;
          }).join("")}
        </div>
      </section>
    `;
  }

  function viewDashboard() {
    const stats = window.AxiomDashboard.getStats();
    return `
      ${pageIntro("Dashboard", "Your AI business command center.", "Track projects, business ideas, saved reports, AI generations, revenue, analytics, and launch progress.")}
      <section class="app-section">
        <div class="stats-grid">
          <article class="stat-card"><span>Projects</span><strong>${stats.projects}</strong><small>${stats.projects ? "Active launch work" : "Create a project"}</small></article>
          <article class="stat-card"><span>Saved reports</span><strong>${stats.reports}</strong><small>Finder, validation, blueprints</small></article>
          <article class="stat-card"><span>AI generations</span><strong>${stats.aiGenerations}</strong><small>${stats.aiUsage.gateway} gateway calls</small></article>
          <article class="stat-card"><span>Revenue tracker</span><strong>${formatMoney(stats.totalRevenue)}</strong><small>Tracked locally</small></article>
          <article class="stat-card"><span>Opportunity score</span><strong>${stats.avgOpportunity}%</strong><small>Average portfolio quality</small></article>
          <article class="stat-card"><span>Analytics</span><strong>${stats.events.length}</strong><small>Funnel events recorded</small></article>
        </div>
        <div class="dashboard-top" style="margin-top: 18px">
          <article class="card chart-card"><h3>Monthly Growth</h3><canvas class="chart-canvas" data-chart="growth"></canvas></article>
          <article class="card chart-card"><h3>Project Progress</h3><canvas class="chart-canvas" data-chart="progress"></canvas></article>
          <article class="card chart-card"><h3>Opportunity Scores</h3><canvas class="chart-canvas" data-chart="opportunity"></canvas></article>
          <form class="tool-panel" data-form="revenue" novalidate>
            <h2>Add revenue</h2>
            <div class="form-grid">
              <div class="field"><label for="revLabel">Label</label><input id="revLabel" name="label" required value="New pilot"></div>
              <div class="input-row">
                <div class="field"><label for="revAmount">Amount</label><input id="revAmount" name="amount" inputmode="numeric" required value="2500"></div>
                <div class="field"><label for="revMonth">Month</label><input id="revMonth" name="month" required value="Jul"></div>
              </div>
            </div>
            <p class="error-text" data-error></p>
            <div class="button-row"><button class="btn" type="submit">Add revenue</button></div>
          </form>
        </div>
        <div class="dashboard-top" style="margin-top: 18px">
          <article class="tool-panel">
            <h2>Projects</h2>
            <div class="table-wrap">${projectTable(stats.projectsList)}</div>
          </article>
          <article class="tool-panel">
            <h2>Saved Reports</h2>
            <div class="table-wrap">${reportTable(stats.reportsList.slice(0, 6))}</div>
          </article>
        </div>
      </section>
    `;
  }

  function projectTable(projects) {
    return `
      <table><thead><tr><th>Name</th><th>Industry</th><th>Status</th><th>Progress</th><th>Score</th></tr></thead><tbody>
      ${projects.map((project) => `<tr><td>${escapeHTML(project.name)}</td><td>${escapeHTML(project.industry)}</td><td>${escapeHTML(project.status)}</td><td>${project.progress}%</td><td>${project.opportunityScore}%</td></tr>`).join("")}
      </tbody></table>
    `;
  }

  function reportTable(reports) {
    if (!reports.length) return emptyState("No saved reports", "Generate an AI report and it will be saved here.");
    return `
      <table><thead><tr><th>Report</th><th>Feature</th><th>Provider</th><th>Status</th></tr></thead><tbody>
      ${reports.map((report) => `<tr><td>${escapeHTML(report.title)}</td><td>${escapeHTML(report.feature)}</td><td>${escapeHTML(report.provider)}</td><td>${escapeHTML(report.status)}</td></tr>`).join("")}
      </tbody></table>
    `;
  }

  function viewLogin() {
    const user = window.AxiomAuth.getCurrentUser();
    if (user) {
      return authSignedIn(user);
    }
    return `
      ${pageIntro("Login", "Welcome back to AXIOMFLOW.", "Access projects, saved reports, subscriptions, profile settings, and admin controls.")}
      <section class="app-section auth-shell">
        <form class="auth-card" data-form="login" novalidate>
          ${csrfInput()}
          <h1>Sign in</h1>
          <div class="form-grid">
            <div class="field"><label for="loginEmail">Email</label><input id="loginEmail" name="email" type="email" autocomplete="email" required></div>
            <div class="field"><label for="loginPassword">Password</label><input id="loginPassword" name="password" type="password" autocomplete="current-password" required></div>
          </div>
          <p class="error-text" data-error></p>
          <div class="button-row"><button class="btn" type="submit">Login</button><a class="btn btn-secondary" href="${hrefFor("forgot-password")}">Forgot password</a></div>
        </form>
        <aside class="card"><h3>Security controls</h3><p>Sessions use JWT-shaped tokens, refresh persistence, password hashing, CSRF validation, role checks, and local audit events for this static build.</p><div class="button-row"><a class="btn btn-secondary" href="${hrefFor("register")}">Create account</a></div></aside>
      </section>
    `;
  }

  function authSignedIn(user) {
    const paid = hasPaidAccess();
    return `
      <section class="app-section auth-shell">
        <article class="auth-card">
          <h1>Signed in as ${escapeHTML(user.name)}</h1>
          <p class="section-copy">${paid ? "Continue to your dashboard, update your profile, or manage billing." : "Your account is ready. Activate a paid subscription to unlock AXIOMFLOW."}</p>
          <div class="button-row">
            ${paid ? `<a class="btn" href="${hrefFor("dashboard")}">Open dashboard</a><a class="btn btn-secondary" href="${hrefFor("profile")}">Profile</a>` : `<a class="btn" href="${hrefFor("pricing")}">Choose plan</a>`}
            <button class="btn btn-secondary" type="button" data-logout>Logout</button>
          </div>
        </article>
      </section>
    `;
  }

  function viewRegister() {
    const user = window.AxiomAuth.getCurrentUser();
    if (user) return authSignedIn(user);
    const params = billingQuery();
    const pendingPlan = params.get("plan") || sessionStorage.getItem("axiomflow.pendingPlan") || "starter";
    const paidPlans = pricingPlans.filter((plan) => plan.monthly > 0);
    return `
      ${pageIntro("Register", "Create your account before checkout.", "AXIOMFLOW access is unlocked only after PayPal confirms an active paid subscription.")}
      <section class="app-section auth-shell">
        <form class="auth-card" data-form="register" novalidate>
          ${csrfInput()}
          <h1>Create account</h1>
          <div class="form-grid">
            <div class="field"><label for="regName">Full name</label><input id="regName" name="name" autocomplete="name" required></div>
            <div class="field"><label for="regEmail">Email</label><input id="regEmail" name="email" type="email" autocomplete="email" required></div>
            <div class="field"><label for="regCompany">Company</label><input id="regCompany" name="company" autocomplete="organization"></div>
            <div class="field"><label for="regPassword">Password</label><input id="regPassword" name="password" type="password" autocomplete="new-password" required></div>
            <div class="field"><label for="regPlan">Plan</label><select id="regPlan" name="plan">${paidPlans.map((plan) => `<option value="${plan.id}" ${pendingPlan === plan.id ? "selected" : ""}>${escapeHTML(plan.name)}</option>`).join("")}</select></div>
          </div>
          <p class="error-text" data-error></p>
          <div class="button-row"><button class="btn" type="submit">Create account and checkout</button><a class="btn btn-secondary" href="${hrefFor("login")}">Login</a></div>
        </form>
        <aside class="card"><h3>Real billing gate</h3><p>Your account is created first, then PayPal activates access after a successful subscription payment.</p></aside>
      </section>
    `;
  }

  function viewForgotPassword() {
    return `
      ${pageIntro("Forgot Password", "Start a password reset.", "A secure reset token is generated for this static workspace and expires in 30 minutes.")}
      <section class="app-section auth-shell">
        <form class="auth-card" data-form="forgot" novalidate>
          ${csrfInput()}
          <h1>Reset request</h1>
          <div class="field"><label for="forgotEmail">Email</label><input id="forgotEmail" name="email" type="email" required></div>
          <p class="error-text" data-error></p>
          <div class="button-row"><button class="btn" type="submit">Continue</button></div>
        </form>
      </section>
    `;
  }

  function viewResetPassword() {
    const params = new URLSearchParams(window.location.search);
    return `
      ${pageIntro("Reset Password", "Set a new password.", "Use the reset token issued from the password reset flow.")}
      <section class="app-section auth-shell">
        <form class="auth-card" data-form="reset" novalidate>
          ${csrfInput()}
          <h1>New password</h1>
          <div class="form-grid">
            <div class="field"><label for="resetEmail">Email</label><input id="resetEmail" name="email" type="email" value="${escapeHTML(params.get("email") || "")}" required></div>
            <div class="field"><label for="resetToken">Reset token</label><input id="resetToken" name="token" value="${escapeHTML(params.get("token") || "")}" required></div>
            <div class="field"><label for="resetPassword">New password</label><input id="resetPassword" name="password" type="password" autocomplete="new-password" required></div>
          </div>
          <p class="error-text" data-error></p>
          <div class="button-row"><button class="btn" type="submit">Update password</button></div>
        </form>
      </section>
    `;
  }

  function viewProfile() {
    const user = window.AxiomAuth.getCurrentUser();
    if (!user) return authGate("Profile", "Sign in to upload an avatar, update your profile, change your password, and manage your subscription.");
    return `
      ${pageIntro("Profile", "Manage your account.", "Update your identity, password, avatar, and subscription status.")}
      <section class="app-section auth-shell">
        <form class="auth-card" data-form="profile" novalidate>
          ${csrfInput()}
          <h1>Profile details</h1>
          <div class="avatar-row">
            <div class="avatar" id="avatarPreview">${user.avatar ? `<img src="${escapeHTML(user.avatar)}" alt="">` : escapeHTML(user.name.slice(0, 1).toUpperCase())}</div>
            <div class="field"><label for="avatarUpload">Avatar</label><input id="avatarUpload" name="avatarUpload" type="file" accept="image/png,image/jpeg,image/webp" data-avatar-input></div>
          </div>
          <div class="form-grid" style="margin-top: 16px">
            <div class="field"><label for="profileName">Name</label><input id="profileName" name="name" value="${escapeHTML(user.name)}" required></div>
            <div class="field"><label for="profileCompany">Company</label><input id="profileCompany" name="company" value="${escapeHTML(user.company || "")}"></div>
            <div class="field"><label>Subscription</label><input value="${escapeHTML(billingState.active ? `${billingState.plan} ${billingState.status}` : "unpaid")}" readonly></div>
          </div>
          <p class="error-text" data-error></p>
          <div class="button-row"><button class="btn" type="submit">Save profile</button><button class="btn btn-secondary" type="button" data-billing-portal>Manage billing</button></div>
        </form>
        <form class="auth-card" data-form="password" novalidate>
          ${csrfInput()}
          <h1>Change password</h1>
          <div class="form-grid">
            <div class="field"><label for="currentPassword">Current password</label><input id="currentPassword" name="currentPassword" type="password" autocomplete="current-password" required></div>
            <div class="field"><label for="newPassword">New password</label><input id="newPassword" name="newPassword" type="password" autocomplete="new-password" required></div>
          </div>
          <p class="error-text" data-error></p>
          <div class="button-row"><button class="btn btn-secondary" type="submit">Update password</button></div>
        </form>
      </section>
    `;
  }

  function authGate(title, copy) {
    return `
      <section class="app-section auth-shell">
        <article class="auth-card">
          <h1>${escapeHTML(title)}</h1>
          <p class="section-copy">${escapeHTML(copy)}</p>
          <div class="button-row"><a class="btn" href="${hrefFor("login")}">Login</a><a class="btn btn-secondary" href="${hrefFor("register")}">Register</a></div>
        </article>
      </section>
    `;
  }

  function viewSettings() {
    const settings = window.AxiomAI.getSettings();
    const usage = window.AxiomAI.getUsage();
    return `
      ${pageIntro("Settings", "Configure platform behavior.", "Control themes, NVIDIA AI gateway routing, request limits, local data, and export workflows.", `<div class="button-row"><button class="btn" type="button" data-test-nvidia>Test NVIDIA AI</button><a class="btn btn-secondary" href="${hrefFor("api")}">API guide</a></div>`)}
      <section class="app-section auth-shell">
        <form class="settings-panel" data-form="settings" novalidate>
          <h2>NVIDIA AI gateway</h2>
          <div class="form-grid">
            <div class="field"><label for="gatewayUrl">Secure gateway URL</label><input id="gatewayUrl" name="gatewayUrl" value="${escapeHTML(settings.gatewayUrl)}"></div>
            <div class="field"><label for="model">Model</label><input id="model" name="model" value="${escapeHTML(settings.model)}"></div>
            <div class="input-row">
              <div class="field"><label for="maxTokens">Max tokens</label><input id="maxTokens" name="maxTokens" inputmode="numeric" value="${settings.maxTokens}"></div>
              <div class="field"><label for="temperature">Temperature</label><input id="temperature" name="temperature" inputmode="decimal" value="${settings.temperature}"></div>
            </div>
            <div class="field"><label for="topP">Top P</label><input id="topP" name="topP" inputmode="decimal" value="${settings.topP}"></div>
            <div class="input-row">
              <div class="field"><label for="maxRequestsPerMinute">Requests/minute</label><input id="maxRequestsPerMinute" name="maxRequestsPerMinute" inputmode="numeric" value="${settings.maxRequestsPerMinute}"></div>
              <div class="field"><label for="timeoutMs">Timeout ms</label><input id="timeoutMs" name="timeoutMs" inputmode="numeric" value="${settings.timeoutMs}"></div>
            </div>
          </div>
          <p class="error-text" data-error></p>
          <div class="button-row"><button class="btn" type="submit">Save settings</button></div>
        </form>
        <aside class="settings-panel">
          <h2>NVIDIA status</h2>
          <ul class="health-list">
            <li><strong><span class="status-dot"></span>Provider</strong><span>NVIDIA AI</span></li>
            <li><strong><span class="status-dot"></span>Model</strong><span>${escapeHTML(settings.model)}</span></li>
            <li><strong><span class="status-dot"></span>Gateway calls</strong><span>${usage.gateway}</span></li>
            <li><strong><span class="status-dot"></span>Fallbacks</strong><span>${usage.fallbacks}</span></li>
          </ul>
          <div class="button-row"><button class="btn btn-secondary" type="button" data-test-nvidia>Run live test</button><a class="btn btn-secondary" href="${hrefFor("status")}">Status</a></div>
        </aside>
        <aside class="settings-panel">
          <h2>Local operations</h2>
          <p class="section-copy">Export workspace data, clear generated project data, or switch theme preference.</p>
          <div class="button-row"><button class="btn btn-secondary" type="button" data-export>Export data</button><button class="btn btn-secondary" type="button" data-clear-data>Clear workspace data</button></div>
          <div class="theme-switcher" style="display: inline-flex; margin-top: 18px" role="group" aria-label="Theme">
            <button class="theme-option" type="button" data-theme-option="white">White</button>
            <button class="theme-option" type="button" data-theme-option="black">Black</button>
            <button class="theme-option" type="button" data-theme-option="milk">Milk</button>
          </div>
        </aside>
      </section>
    `;
  }

  function viewContact() {
    return `
      ${pageIntro("Contact", "Talk to AXIOMFLOW.", "Send automation strategy questions, enterprise onboarding requests, partnership ideas, or support needs.")}
      <section class="app-section auth-shell">
        <form class="auth-card" data-form="contact" novalidate>
          ${csrfInput()}
          <h1>Contact form</h1>
          <div class="form-grid">
            <div class="field"><label for="contactName">Name</label><input id="contactName" name="name" autocomplete="name" required></div>
            <div class="field"><label for="contactEmail">Email</label><input id="contactEmail" name="email" type="email" autocomplete="email" required></div>
            <div class="field"><label for="contactTopic">Topic</label><select id="contactTopic" name="topic"><option>Automation strategy</option><option>Enterprise onboarding</option><option>Partnership</option><option>Support</option></select></div>
            <div class="field"><label for="contactMessage">Message</label><textarea id="contactMessage" name="message" required></textarea></div>
          </div>
          <p class="error-text" data-error></p>
          <div class="button-row"><button class="btn" type="submit">Send message</button></div>
        </form>
        <aside class="card"><h3>Enterprise readiness</h3><p>AXIOMFLOW supports secure AI gateway patterns, admin observability, audit-ready request logs, and monetization workflows.</p></aside>
      </section>
    `;
  }

  function viewBlog() {
    return `
      ${pageIntro("Blog", "Practical growth notes for AI business builders.", "Filter by category and read actionable articles on AI business, automation, SaaS, marketing, and growth.")}
      <section class="app-section">
        <div class="blog-toolbar">
          <div class="input-row">
            <div class="field"><label for="blogSearch">Search</label><input id="blogSearch" data-blog-search></div>
            <div class="field"><label for="blogCategory">Category</label><select id="blogCategory" data-blog-category><option value="">All categories</option>${[...new Set(blogPosts.map((post) => post.category))].map((category) => `<option>${escapeHTML(category)}</option>`).join("")}</select></div>
          </div>
        </div>
        <div class="blog-grid" id="blogGrid">${renderBlogCards()}</div>
      </section>
    `;
  }

  function renderBlogCards(category = "", query = "") {
    const needle = query.toLowerCase();
    const posts = blogPosts.filter((post) => {
      const categoryMatch = !category || post.category === category;
      const searchMatch = !needle || `${post.title} ${post.excerpt} ${post.category}`.toLowerCase().includes(needle);
      return categoryMatch && searchMatch;
    });
    if (!posts.length) return emptyState("No articles match", "Try another category or search term.");
    return posts.map((post) => `
      <article class="card">
        <span class="eyebrow">${escapeHTML(post.category)} - ${escapeHTML(post.readTime)}</span>
        <h3>${escapeHTML(post.title)}</h3>
        <p>${escapeHTML(post.excerpt)}</p>
        <div class="button-row"><button class="btn btn-small btn-secondary" type="button" data-read-post="${escapeHTML(post.id)}">Read</button></div>
      </article>
    `).join("");
  }

  function viewDocumentation() {
    return `
      ${pageIntro("Documentation", "Implementation guidance for AXIOMFLOW teams.", "Review AI gateway, authentication, data model, SEO, PWA, and growth architecture notes.")}
      <section class="app-section">
        <div class="doc-grid">
          ${docSections.map((section) => `
            <article class="card">
              <h3>${escapeHTML(section.title)}</h3>
              <p>${escapeHTML(section.copy)}</p>
              <ul class="pill-list">${section.tags.map((tag) => `<li class="pill">${escapeHTML(tag)}</li>`).join("")}</ul>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="app-section tool-layout">
        <form class="tool-panel is-sticky" data-form="chat" novalidate>
          ${csrfInput()}
          <h2>Chat Assistant</h2>
          <div class="field"><label for="chatMessage">Question</label><textarea id="chatMessage" name="message" required>What AI automation business should I validate first?</textarea></div>
          <p class="error-text" data-error></p>
          <div class="button-row"><button class="btn" type="submit">Ask assistant</button></div>
        </form>
        <div class="tool-panel results-panel" id="chatResult">${emptyState("Assistant ready", "Ask a product, automation, validation, or launch question.")}</div>
      </section>
    `;
  }

  function viewAbout() {
    return `
      ${pageIntro("About", "Built for AI businesses that must become real revenue.", "AXIOMFLOW is designed around a simple operating belief: validate demand first, automate only measurable work, and keep security and monetization visible from day one.", `<div class="button-row"><a class="btn" href="${hrefFor("business-finder")}">Find an opportunity</a><a class="btn btn-secondary" href="${hrefFor("case-studies")}">See proof</a></div>`)}
      <section class="app-section">
        <div class="stats-grid">
          <article class="stat-card"><span>Mission</span><strong>Validate</strong><small>Stop building before demand is proven.</small></article>
          <article class="stat-card"><span>Operating model</span><strong>Automate</strong><small>Replace costly manual workflows.</small></article>
          <article class="stat-card"><span>Business result</span><strong>Launch</strong><small>Turn pilots into recurring revenue.</small></article>
        </div>
        <div class="card-grid">
          <article class="card"><h3>Revenue-first product engineering</h3><p>Every workflow is scored against urgency, labor replacement, budget evidence, margin, retention, and expansion paths.</p></article>
          <article class="card"><h3>Security-aware AI architecture</h3><p>AXIOMFLOW separates browser UX from sensitive NVIDIA AI gateway execution so teams can grow without leaking secrets.</p></article>
          <article class="card"><h3>Operator-grade workflows</h3><p>Dashboards, saved reports, pricing, CRM, launch blueprints, analytics, and admin controls all support repeatable execution.</p></article>
        </div>
      </section>
      <div class="band">
        <section class="app-section">
          <span class="section-kicker">Company principles</span>
          <h2 class="section-title">Less speculation. More proof.</h2>
          <div class="timeline">
            <div class="timeline-item"><span class="timeline-step">1</span><div><h3>Find painful workflows</h3><p>Focus on problems that buyers already discuss, budget, and manually fight every week.</p></div></div>
            <div class="timeline-item"><span class="timeline-step">2</span><div><h3>Validate with paid pilots</h3><p>Measure urgency, labor savings, decision ownership, and success metrics before overbuilding.</p></div></div>
            <div class="timeline-item"><span class="timeline-step">3</span><div><h3>Automate with guardrails</h3><p>Add approval controls, audit logs, request limits, retry states, and privacy-conscious data flows.</p></div></div>
            <div class="timeline-item"><span class="timeline-step">4</span><div><h3>Scale what repeats</h3><p>Turn recurring services into marketplace templates, subscriptions, partner channels, and expansion revenue.</p></div></div>
          </div>
        </section>
      </div>
    `;
  }

  function viewCaseStudies() {
    return `
      ${pageIntro("Case Studies", "Proof patterns for profitable AI automation.", "Explore realistic implementation paths for service businesses, agencies, contractors, and consultants.", `<div class="button-row"><a class="btn" href="${hrefFor("pricing")}">Choose a plan</a><a class="btn btn-secondary" href="${hrefFor("contact")}">Discuss enterprise use</a></div>`)}
      <section class="app-section">
        <div class="card-grid">
          ${caseStudies.map((study) => `
            <article class="card">
              <span class="eyebrow">${escapeHTML(study.industry)}</span>
              <h3>${escapeHTML(study.title)}</h3>
              <p>${escapeHTML(study.summary)}</p>
              <ul class="pill-list"><li class="pill">${escapeHTML(study.metric)}</li><li class="pill">Paid pilot ready</li></ul>
              <div class="button-row"><button class="btn btn-small btn-secondary" type="button" data-case-study="${escapeHTML(study.id)}">View details</button></div>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  function viewIntegrations() {
    return `
      ${pageIntro("Integrations", "Connect revenue workflows across your stack.", "AXIOMFLOW is structured for CRM, payments, analytics, scheduling, storage, no-code automation, and secure NVIDIA AI gateway integrations.")}
      <section class="app-section">
        <div class="blog-toolbar">
          <div class="input-row">
            <div class="field"><label for="integrationSearch">Search</label><input id="integrationSearch" data-integration-search></div>
            <div class="field"><label for="integrationCategory">Category</label><select id="integrationCategory" data-integration-category><option value="">All categories</option>${[...new Set(integrationData.map((item) => item.category))].map((category) => `<option>${escapeHTML(category)}</option>`).join("")}</select></div>
          </div>
        </div>
        <div class="card-grid" id="integrationGrid">${renderIntegrationCards()}</div>
      </section>
      <section class="app-section tool-layout">
        <article class="tool-panel">
          <h2>Secure gateway pattern</h2>
          <p>Use AXIOMFLOW settings to point browser requests at your own server endpoint. That endpoint validates the user, checks rate limits, injects NVIDIA credentials server-side, and forwards to a NIM chat completions route.</p>
          <pre><code>POST /api/nvidia/v1/chat/completions
Authorization: Bearer user-session-token
X-AXIOM-CSRF: csrf-token</code></pre>
        </article>
        <article class="tool-panel">
          <h2>Integration priorities</h2>
          <ul class="check-list">
            <li>Start with payment, CRM, analytics, and calendar systems that directly improve conversion or retention.</li>
            <li>Log webhook events with idempotency keys before triggering revenue or customer workflows.</li>
            <li>Keep AI prompts, documents, and customer data behind tenant-aware authorization boundaries.</li>
          </ul>
        </article>
      </section>
    `;
  }

  function renderIntegrationCards(category = "", query = "") {
    const needle = query.toLowerCase();
    const items = integrationData.filter((item) => {
      const matchesCategory = !category || item.category === category;
      const matchesQuery = !needle || `${item.name} ${item.category} ${item.summary}`.toLowerCase().includes(needle);
      return matchesCategory && matchesQuery;
    });
    if (!items.length) return emptyState("No integrations match", "Try another category or search term.");
    return items.map((item) => `
      <article class="card">
        <span class="eyebrow">${escapeHTML(item.category)} - ${escapeHTML(item.tier)}</span>
        <h3>${escapeHTML(item.name)}</h3>
        <p>${escapeHTML(item.summary)}</p>
        <div class="button-row"><a class="btn btn-small btn-secondary" href="${hrefFor("settings")}">Configure</a></div>
      </article>
    `).join("");
  }

  function viewSecurity() {
    return `
      ${pageIntro("Security", "Trust controls for AI-powered revenue systems.", "Review the security posture for authentication, API boundaries, AI gateway routing, compliance readiness, and operational resilience.", `<div class="button-row"><button class="btn" type="button" data-security-check>Run self-check</button><a class="btn btn-secondary" href="${hrefFor("privacy")}">Privacy policy</a></div>`)}
      <section class="app-section">
        <div class="card-grid">
          ${securityControls.map((control) => `
            <article class="card">
              <h3>${escapeHTML(control.title)}</h3>
              <p>${escapeHTML(control.copy)}</p>
              <ul class="pill-list">${control.tags.map((tag) => `<li class="pill">${escapeHTML(tag)}</li>`).join("")}</ul>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="app-section tool-layout">
        <article class="tool-panel">
          <h2>Production hardening checklist</h2>
          <ul class="check-list">
            <li>Move authentication, password storage, JWT signing, and session rotation to a hardened backend.</li>
            <li>Store NVIDIA API credentials in a secrets manager and call them only from trusted server infrastructure.</li>
            <li>Add tenant isolation, audit logs, CSP headers, CSRF protection, upload scanning, and incident alerts.</li>
            <li>Use idempotency keys for payments, webhooks, AI jobs, retries, and report generation.</li>
          </ul>
        </article>
        <article class="tool-panel">
          <h2>Compliance posture</h2>
          <p>AXIOMFLOW is ready to evolve into GDPR, SOC 2, and enterprise procurement workflows because data handling, AI requests, roles, exports, and admin visibility are modeled from the start.</p>
          <div class="button-row"><a class="btn btn-secondary" href="${hrefFor("business-builder")}">Run compliance analyzer</a></div>
        </article>
      </section>
    `;
  }

  function viewApi() {
    const settings = window.AxiomAI.getSettings();
    return `
      ${pageIntro("API", "Backend-ready API architecture.", "This static build includes API-ready models and gateway patterns for future production deployment with secure server-side NVIDIA AI calls.", `<div class="button-row"><button class="btn" type="button" data-copy-gateway>Copy gateway shape</button><a class="btn btn-secondary" href="${hrefFor("documentation")}">Read docs</a></div>`)}
      <section class="app-section doc-grid">
        <article class="card"><h3>Authentication</h3><p>Use JWT access tokens, refresh tokens, session rotation, RBAC, device records, and anomaly hooks in production.</p><ul class="pill-list"><li class="pill">JWT</li><li class="pill">Refresh</li><li class="pill">RBAC</li></ul></article>
        <article class="card"><h3>AI Requests</h3><p>Validate prompts server-side, apply user and tenant limits, attach idempotency keys, and forward to NVIDIA NIM endpoints.</p><ul class="pill-list"><li class="pill">NVIDIA AI</li><li class="pill">Retries</li><li class="pill">Usage logs</li></ul></article>
        <article class="card"><h3>Webhooks</h3><p>Prepare PayPal, CRM, analytics, and automation events with replay protection and signed payload verification.</p><ul class="pill-list"><li class="pill">PayPal</li><li class="pill">CRM</li><li class="pill">Events</li></ul></article>
        <article class="card"><h3>Reports</h3><p>Persist generated reports with owner IDs, source, latency, validation scores, exports, and retention metadata.</p><ul class="pill-list"><li class="pill">Reports</li><li class="pill">Exports</li><li class="pill">Audit</li></ul></article>
      </section>
      <section class="app-section">
        <article class="tool-panel">
          <h2>NVIDIA gateway contract</h2>
          <pre><code>{
  "url": "${escapeHTML(settings.gatewayUrl)}/v1/chat/completions",
  "provider": "NVIDIA AI",
  "model": "${escapeHTML(settings.model)}",
  "payload": {
    "messages": [{ "role": "user", "content": "Generate a launch plan" }],
    "max_tokens": ${settings.maxTokens},
    "temperature": ${settings.temperature},
    "top_p": ${settings.topP},
    "frequency_penalty": 0,
    "presence_penalty": 0,
    "stream": false
  }
}</code></pre>
        </article>
      </section>
    `;
  }

  function viewStatus() {
    const settings = window.AxiomAI.getSettings();
    const usage = window.AxiomAI.getUsage();
    return `
      ${pageIntro("Status", "Platform health overview.", "Monitor the local PWA systems and the configured NVIDIA AI gateway state.", `<div class="button-row"><button class="btn" type="button" data-health-check>Run health check</button><a class="btn btn-secondary" href="${hrefFor("settings")}">Settings</a></div>`)}
      <section class="app-section">
        <div class="stats-grid">
          <article class="stat-card"><span>PWA cache</span><strong>Ready</strong><small>Service worker registered on supported browsers</small></article>
          <article class="stat-card"><span>Auth</span><strong>Active</strong><small>Local session controls enabled</small></article>
          <article class="stat-card"><span>AI gateway</span><strong>${settings.gatewayUrl ? "Configured" : "Local"}</strong><small>${escapeHTML(settings.model)}</small></article>
          <article class="stat-card"><span>Analytics</span><strong>Live</strong><small>Local funnel events recorded</small></article>
          <article class="stat-card"><span>Storage</span><strong>Ready</strong><small>Projects, reports, revenue, and users persist locally</small></article>
          <article class="stat-card"><span>NVIDIA usage</span><strong>${usage.gateway}</strong><small>${usage.fallbacks} fallback events</small></article>
        </div>
      </section>
      <section class="app-section">
        <article class="tool-panel">
          <h2>Operational notes</h2>
          <ul class="health-list">
            <li><strong><span class="status-dot"></span>Core routes</strong><span>Available</span></li>
            <li><strong><span class="status-dot"></span>Theme persistence</strong><span>Available</span></li>
            <li><strong><span class="status-dot"></span>AI fallback</strong><span>Available</span></li>
            <li><strong><span class="status-dot"></span>Dashboard charts</strong><span>Available</span></li>
          </ul>
        </article>
      </section>
    `;
  }

  function viewPrivacy() {
    return legalView("Privacy Policy", "How AXIOMFLOW handles data, AI requests, local storage, and user rights.", [
      ["Data We Collect", "Account details, project inputs, AI generation history, revenue entries, settings, and analytics events may be stored locally in this static build."],
      ["AI Request Handling", "Remote inference should be routed through a secure NVIDIA AI gateway. Do not place provider secrets in browser code."],
      ["User Controls", "Users can export workspace data, clear generated workspace records, update profile details, and manage subscription state."],
      ["Retention", "Production deployments should define report retention, audit log retention, deletion workflows, and customer data processing agreements."],
      ["Security", "AXIOMFLOW includes CSP, CSRF tokens, input validation, role gates, request limits, and a secret-safe AI gateway architecture pattern."]
    ]);
  }

  function viewTerms() {
    return legalView("Terms of Service", "Rules for using AXIOMFLOW to validate, automate, and launch AI-powered businesses.", [
      ["Acceptable Use", "Do not use AXIOMFLOW for unlawful activity, deceptive outreach, privacy violations, credential abuse, or harmful automated decisions."],
      ["AI Outputs", "AI-generated business ideas, reports, and outreach should be reviewed by a human before legal, compliance, sales, or financial use."],
      ["Subscriptions", "Plan activation, billing, refunds, usage limits, and enterprise terms are implemented through PayPal Subscriptions."],
      ["Customer Responsibility", "Customers are responsible for validating markets, complying with applicable laws, protecting uploaded data, and reviewing generated content."],
      ["Platform Changes", "Features, pricing, automation templates, and gateway settings may evolve to improve reliability, security, conversion, and operational performance."]
    ]);
  }

  function legalView(title, copy, sections) {
    return `
      ${pageIntro(title, title, copy, `<div class="button-row"><a class="btn" href="${hrefFor("contact")}">Contact support</a><a class="btn btn-secondary" href="${hrefFor("security")}">Security</a></div>`)}
      <section class="app-section">
        <div class="doc-grid">
          ${sections.map(([heading, body]) => `<article class="card"><h3>${escapeHTML(heading)}</h3><p>${escapeHTML(body)}</p></article>`).join("")}
        </div>
      </section>
    `;
  }

  function viewAdmin() {
    const user = window.AxiomAuth.getCurrentUser();
    if (!user || user.role !== "admin") {
      return authGate("Admin Panel", "Admin access requires an administrator account for users, subscriptions, content, analytics, AI requests, and platform health.");
    }
    const stats = window.AxiomDashboard.getStats();
    const users = window.AxiomAuth.getAllUsers();
    const requests = window.AxiomAI.getRequests();
    return `
      ${pageIntro("Admin Panel", "Operate the AXIOMFLOW platform.", "View users, subscriptions, analytics, content operations, AI requests, and platform health.")}
      <section class="app-section">
        <div class="stats-grid">
          <article class="stat-card"><span>Users</span><strong>${users.length}</strong><small>Role-aware accounts</small></article>
          <article class="stat-card"><span>Subscriptions</span><strong>${users.filter((item) => item.subscription !== "free").length}</strong><small>Paid or enterprise</small></article>
          <article class="stat-card"><span>AI requests</span><strong>${requests.length}</strong><small>${stats.aiUsage.fallbacks} gateway fallbacks</small></article>
          <article class="stat-card"><span>Events</span><strong>${stats.events.length}</strong><small>Analytics stream</small></article>
          <article class="stat-card"><span>Reports</span><strong>${stats.reports}</strong><small>Saved outputs</small></article>
          <article class="stat-card"><span>Health</span><strong>99.9%</strong><small>Local PWA target</small></article>
        </div>
        <div class="admin-grid">
          <article class="tool-panel"><h2>Users</h2><div class="table-wrap">${userTable(users)}</div></article>
          <article class="tool-panel"><h2>AI Requests</h2><div class="table-wrap">${requestTable(requests.slice(0, 8))}</div></article>
          <form class="tool-panel" data-form="adminContent" novalidate>
            <h2>Manage content</h2>
            <div class="form-grid">
              <div class="field"><label for="contentTitle">Title</label><input id="contentTitle" name="title" required value="New automation playbook"></div>
              <div class="field"><label for="contentCategory">Category</label><select id="contentCategory" name="category"><option>AI Business</option><option>Automation</option><option>SaaS</option><option>Marketing</option><option>Growth</option></select></div>
            </div>
            <p class="error-text" data-error></p>
            <div class="button-row"><button class="btn btn-secondary" type="submit">Save content event</button></div>
          </form>
          <article class="tool-panel">
            <h2>Platform health</h2>
            <ul class="health-list">
              <li><strong><span class="status-dot"></span>PWA cache</strong><span>Ready</span></li>
              <li><strong><span class="status-dot"></span>Auth</strong><span>Active</span></li>
              <li><strong><span class="status-dot"></span>AI gateway</strong><span>${window.AxiomAI.getSettings().gatewayUrl ? "Configured" : "Local mode"}</span></li>
              <li><strong><span class="status-dot"></span>Analytics</strong><span>Recording</span></li>
            </ul>
          </article>
        </div>
      </section>
    `;
  }

  function userTable(users) {
    return `<table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Subscription</th></tr></thead><tbody>${users.map((user) => `<tr><td>${escapeHTML(user.name)}</td><td>${escapeHTML(user.email)}</td><td>${escapeHTML(user.role)}</td><td>${escapeHTML(user.subscription)}</td></tr>`).join("")}</tbody></table>`;
  }

  function requestTable(requests) {
    if (!requests.length) return emptyState("No AI requests", "Generated AI outputs will populate this admin stream.");
    return `<table><thead><tr><th>Feature</th><th>Source</th><th>Status</th><th>Latency</th></tr></thead><tbody>${requests.map((request) => `<tr><td>${escapeHTML(request.feature)}</td><td>${escapeHTML(request.source)}</td><td>${escapeHTML(request.status)}</td><td>${request.latencyMs}ms</td></tr>`).join("")}</tbody></table>`;
  }

  function renderBusinessFinderReport(result) {
    const data = result.data;
    return `
      <div class="report-header"><div><span class="eyebrow">${escapeHTML(result.provider)} - ${escapeHTML(result.source)}</span><h3>${escapeHTML(data.headline)}</h3></div><span class="score-badge">${data.ideas?.[0]?.validationScore || 0}% top score</span></div>
      <p>${escapeHTML(data.summary)}</p>
      <div class="report-grid" style="margin-top: 16px">
        ${data.ideas.map((idea) => `
          <article class="report-card">
            <h3>${escapeHTML(idea.name)}</h3>
            <p>${escapeHTML(idea.summary)}</p>
            <ul class="pill-list">
              <li class="pill">${escapeHTML(idea.revenuePotential)}</li>
              <li class="pill">Competition ${idea.competitionScore}%</li>
              <li class="pill">Startup ${escapeHTML(idea.startupCost)}</li>
              <li class="pill">Validation ${idea.validationScore}%</li>
            </ul>
            <p style="margin-top: 12px"><strong>Launch action:</strong> ${escapeHTML(idea.firstLaunchAction)}</p>
          </article>
        `).join("")}
      </div>
      <p class="section-copy">${escapeHTML(data.recommendedNextStep)}</p>
      ${gatewayNote(result)}
    `;
  }

  function renderValidationReport(result) {
    const data = result.data;
    const statusClass = data.status === "Pass" ? "score-pass" : data.status === "Warning" ? "score-warning" : "score-fail";
    return `
      <div class="report-header"><div><span class="eyebrow">${escapeHTML(result.provider)} - Validation score meter</span><h3>${escapeHTML(data.status)}</h3></div><span class="score-badge ${statusClass}">${data.score}%</span></div>
      <div class="meter" style="--value: ${data.score}%"><span></span></div>
      <p class="section-copy">${escapeHTML(data.summary)}</p>
      <div class="report-grid">
        ${data.checks.map((check) => `<article class="report-card"><h3>${escapeHTML(check.label)}</h3><p>${escapeHTML(check.explanation)}</p><span class="tag">${escapeHTML(check.result)}</span></article>`).join("")}
      </div>
      <div class="timeline">${data.nextActions.map((action, index) => `<div class="timeline-item"><span class="timeline-step">${index + 1}</span><p>${escapeHTML(action)}</p></div>`).join("")}</div>
      ${gatewayNote(result)}
    `;
  }

  function renderBlueprintReport(result) {
    const data = result.data;
    return `
      <div class="report-header"><div><span class="eyebrow">${escapeHTML(data.audience)}</span><h3>${escapeHTML(data.title)}</h3></div><span class="score-badge">Roadmap</span></div>
      <p>${escapeHTML(data.successMetric)}</p>
      <div class="timeline">${data.sections.map((section, index) => `
        <div class="timeline-item">
          <span class="timeline-step">${index + 1}</span>
          <div><h3>${escapeHTML(section.title)}</h3><ul class="check-list">${section.steps.map((step) => `<li>${escapeHTML(step)}</li>`).join("")}</ul></div>
        </div>
      `).join("")}</div>
      ${gatewayNote(result)}
    `;
  }

  function renderBuilderReport(result) {
    const data = result.data;
    return `
      <div class="report-header"><div><span class="eyebrow">MVP architecture</span><h3>${escapeHTML(data.title)}</h3></div><span class="score-badge">Build plan</span></div>
      <p>${escapeHTML(data.positioning)}</p>
      <div class="report-grid" style="margin-top: 16px">
        ${sectionList("Modules", data.modules)}
        ${sectionList("Stack", data.stack)}
        ${sectionList("Monetization", data.monetization)}
        ${sectionList("Launch KPIs", data.launchKPIs)}
      </div>
      ${gatewayNote(result)}
    `;
  }

  function renderOutreachReport(result) {
    const data = result.data;
    return `
      <h3>Prospect summary</h3>
      <p>${escapeHTML(data.prospectSummary)}</p>
      <h3>Email</h3>
      <p><strong>${escapeHTML(data.email.subject)}</strong></p>
      <p>${nl2br(data.email.body)}</p>
      <h3>Follow-ups</h3>
      <ul class="check-list">${data.followUps.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>
      ${gatewayNote(result)}
    `;
  }

  function renderComplianceReport(result) {
    const data = result.data;
    return `
      <div class="report-header"><div><span class="eyebrow">${escapeHTML(data.surface)}</span><h3>${escapeHTML(data.title)}</h3></div><span class="score-badge score-warning">${data.score}%</span></div>
      ${sectionList("Findings", data.findings)}
      ${sectionList("Fixes", data.fixes)}
      ${gatewayNote(result)}
    `;
  }

  function renderChatReport(result) {
    const data = result.data;
    return `
      <h3>Assistant response</h3>
      <p>${escapeHTML(data.answer)}</p>
      ${sectionList("Actions", data.actions)}
      ${gatewayNote(result)}
    `;
  }

  function sectionList(title, items) {
    return `<article class="report-card"><h3>${escapeHTML(title)}</h3><ul class="check-list">${items.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul></article>`;
  }

  function gatewayNote(result) {
    if (result.status === "free-preview") {
      return `<article class="report-card" style="margin-top: 16px"><h3>Free preview</h3><p>This result uses the local preview engine. Subscribe to unlock live NVIDIA AI, saved dashboard reports, launch blueprints, builders, marketplace workflows, and admin analytics.</p><div class="button-row"><a class="btn btn-small" href="${hrefFor("pricing")}">Upgrade</a></div></article>`;
    }
    if (result.data?.nvidiaInsight) {
      return `<article class="report-card" style="margin-top: 16px"><h3>NVIDIA gateway insight</h3><p>${nl2br(result.data.nvidiaInsight)}</p></article>`;
    }
    if (result.error) {
      return `<p class="section-copy">Gateway fallback: ${escapeHTML(result.error)}</p>`;
    }
    return "";
  }

  async function withSubmitButton(form, busyLabel, task) {
    const button = form.querySelector("button[type='submit']");
    const original = button?.innerHTML;
    if (button) {
      button.disabled = true;
      button.innerHTML = `<span class="loading-spinner" aria-hidden="true"></span>${escapeHTML(busyLabel)}`;
    }
    setError(form, "");
    try {
      return await task();
    } catch (error) {
      setError(form, error.message || "Something went wrong.");
      toast("Action failed", error.message || "Try again.");
      return null;
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = original;
      }
    }
  }

  function setError(form, message) {
    const node = form.querySelector("[data-error]");
    if (node) node.textContent = message;
  }

  async function handleAIForm(form, feature, targetId, renderer, savedFeature = feature) {
    const data = formData(form);
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const paid = hasPaidAccess();
    if (!paid && !freeFeatures.has(feature)) {
      toast("Subscription required", "Upgrade to use premium AI workflows.");
      window.location.href = `${hrefFor("pricing")}?gate=subscription`;
      return;
    }
    if (!paid && freeRemaining() <= 0) {
      setError(form, `Free limit reached. Subscribe to unlock unlimited paid-workspace workflows.`);
      toast("Free limit reached", "Upgrade to continue with live AI and saved reports.");
      return;
    }
    await withSubmitButton(form, "Generating", async () => {
      const result = await window.AxiomAI.generate(feature, data, { localOnly: !paid });
      if (paid) {
        window.AxiomDashboard.saveReport(savedFeature, result);
      } else {
        recordFreeUse();
      }
      document.getElementById(targetId).innerHTML = renderer(result);
      toast(paid ? "AI output generated" : "Free preview generated", paid ? "Saved to your dashboard reports." : `${freeRemaining()} free previews left today.`);
    });
  }

  function updateMarketGrid() {
    const filter = document.querySelector("[data-market-filter]")?.value || "";
    const query = document.querySelector("[data-market-search]")?.value || "";
    const grid = document.getElementById("marketGrid");
    if (grid) grid.innerHTML = renderMarketCards(filter, query);
  }

  function updateBlogGrid() {
    const category = document.querySelector("[data-blog-category]")?.value || "";
    const query = document.querySelector("[data-blog-search]")?.value || "";
    const grid = document.getElementById("blogGrid");
    if (grid) grid.innerHTML = renderBlogCards(category, query);
  }

  function updateIntegrationGrid() {
    const category = document.querySelector("[data-integration-category]")?.value || "";
    const query = document.querySelector("[data-integration-search]")?.value || "";
    const grid = document.getElementById("integrationGrid");
    if (grid) grid.innerHTML = renderIntegrationCards(category, query);
  }

  async function handleSubmit(event) {
    const form = event.target.closest("form[data-form]");
    if (!form) return;
    event.preventDefault();
    const type = form.dataset.form;
    try {
      if (type === "businessFinder") return handleAIForm(form, "businessFinder", "businessFinderResult", renderBusinessFinderReport);
      if (type === "validation") return handleAIForm(form, "validation", "validationResult", renderValidationReport);
      if (type === "builder") return handleAIForm(form, "builder", "builderResult", renderBuilderReport);
      if (type === "blueprint") return handleAIForm(form, "blueprint", "blueprintResult", renderBlueprintReport);
      if (type === "compliance") return handleAIForm(form, "compliance", "complianceResult", renderComplianceReport);
      if (type === "outreach") return handleAIForm(form, "outreach", "outreachResult", renderOutreachReport);
      if (type === "chat") return handleAIForm(form, "chat", "chatResult", renderChatReport);
      if (type === "login") return withSubmitButton(form, "Signing in", async () => {
        await window.AxiomAuth.login(formData(form));
        await refreshBilling();
        toast("Signed in", hasPaidAccess() ? "Your dashboard is ready." : "Choose a paid plan to unlock access.");
        window.location.href = hasPaidAccess() ? hrefFor("dashboard") : hrefFor("pricing");
      });
      if (type === "register") return withSubmitButton(form, "Creating", async () => {
        const data = formData(form);
        const user = await window.AxiomAuth.register(data);
        sessionStorage.removeItem("axiomflow.pendingPlan");
        sessionStorage.setItem("axiomflow.checkoutEmail", user.email);
        toast("Account created", "Opening secure PayPal approval.");
        await startCheckout(data.plan || "starter", sessionStorage.getItem("axiomflow.pendingBillingCycle") || billingCycle);
      });
      if (type === "forgot") return withSubmitButton(form, "Creating token", async () => {
        const reset = await window.AxiomAuth.requestPasswordReset(formData(form));
        toast("Reset token generated", "Continue on the reset screen.");
        window.location.href = `${hrefFor("reset-password")}?email=${encodeURIComponent(reset.email)}&token=${encodeURIComponent(reset.token)}`;
      });
      if (type === "reset") return withSubmitButton(form, "Updating", async () => {
        await window.AxiomAuth.resetPassword(formData(form));
        toast("Password updated", "You can sign in with the new password.");
        window.location.href = hrefFor("login");
      });
      if (type === "profile") return withSubmitButton(form, "Saving", async () => {
        await window.AxiomAuth.updateProfile({ ...formData(form), avatar: pendingAvatar || window.AxiomAuth.getCurrentUser()?.avatar || "" });
        toast("Profile updated", "Your profile changes were saved.");
        render();
      });
      if (type === "password") return withSubmitButton(form, "Updating", async () => {
        await window.AxiomAuth.changePassword(formData(form));
        form.reset();
        toast("Password changed", "Your session remains active.");
      });
      if (type === "settings") return withSubmitButton(form, "Saving", async () => {
        window.AxiomAI.saveSettings(formData(form));
        toast("Settings saved", "AI gateway configuration updated.");
      });
      if (type === "contact") return withSubmitButton(form, "Sending", async () => {
        if (!form.checkValidity()) {
          form.reportValidity();
          throw new Error("Complete the required contact fields.");
        }
        window.AxiomDashboard.recordEvent("contact.submitted", formData(form));
        form.reset();
        toast("Message sent", "Your request has been captured.");
      });
      if (type === "revenue") return withSubmitButton(form, "Adding", async () => {
        window.AxiomDashboard.addRevenue(formData(form));
        toast("Revenue added", "Dashboard analytics updated.");
        render();
      });
      if (type === "roi") {
        const data = formData(form);
        const monthlySavings = Number(data.hours || 0) * Number(data.rate || 0) * 4.33;
        document.getElementById("roiResult").textContent = `Estimated monthly value: ${formatMoney(monthlySavings)} before subscription cost.`;
        return;
      }
      if (type === "adminContent") return withSubmitButton(form, "Saving", async () => {
        window.AxiomDashboard.recordEvent("content.saved", formData(form));
        toast("Content event saved", "Admin analytics updated.");
        render();
      });
    } catch (error) {
      return null;
    }
  }

  function handleClick(event) {
    const openButton = event.target.closest("[data-mobile-open]");
    const closeButton = event.target.closest("[data-mobile-close]");
    const backdrop = event.target.closest("#drawerBackdrop");
    const modalClose = event.target.closest("[data-modal-close]");
    if (openButton) return openDrawer();
    if (closeButton || backdrop) return closeDrawer();
    if (modalClose) {
      document.getElementById("modalRoot").innerHTML = "";
      return;
    }
    if (event.target.closest("[data-demo]")) {
      modal("AXIOMFLOW Demo", `
        <div class="dashboard-preview">
          <div class="preview-top"><div class="preview-dots"><span></span><span></span><span></span></div><span class="preview-badge">Live workflow</span></div>
          <div class="preview-grid">
            <div class="preview-card"><strong>1. Find</strong><span>Generate niche business opportunities with scoring.</span></div>
            <div class="preview-card"><strong>2. Validate</strong><span>Run pain, labor, and budget checks before build.</span></div>
            <div class="preview-card"><strong>3. Automate</strong><span>Deploy templates, CRM, compliance, and outreach.</span></div>
            <div class="preview-card"><strong>4. Launch</strong><span>Track revenue, progress, and saved reports.</span></div>
          </div>
        </div>
      `);
      return;
    }
    if (event.target.closest("[data-logout]")) {
      fetch(apiPath("/api/billing/logout"), { method: "POST", credentials: "same-origin" }).catch(() => {});
      window.AxiomAuth.logout();
      syncBillingState({});
      toast("Logged out", "Your local session ended.");
      window.location.href = hrefFor("home");
      return;
    }
    const billing = event.target.closest("[data-billing]");
    if (billing) {
      billingCycle = billing.dataset.billing;
      render();
      return;
    }
    const subscribe = event.target.closest("[data-subscribe]");
    if (subscribe) {
      const next = billingQuery().get("next") || "/pages/dashboard.html";
      toast("Opening checkout", "Redirecting to PayPal subscription approval.");
      startCheckout(subscribe.dataset.subscribe, billingCycle, next).catch((error) => {
        toast("Checkout unavailable", error.message || "Try again shortly.");
      });
      return;
    }
    if (event.target.closest("[data-billing-portal]")) {
      toast("Opening billing", "Redirecting to PayPal subscription management.");
      openBillingPortal().catch((error) => {
        toast("Billing portal unavailable", error.message || "Try again shortly.");
      });
      return;
    }
    const saveAutomation = event.target.closest("[data-save-automation]");
    if (saveAutomation) {
      const item = automationData.find((automation) => automation.id === saveAutomation.dataset.saveAutomation);
      if (item) {
        window.AxiomDashboard.createProject({
          name: item.name,
          industry: item.industry,
          status: "Validate",
          progress: 28,
          opportunityScore: item.roi,
          revenueGoal: item.price * 100
        });
        toast("Automation saved", `${item.name} was added to your projects.`);
      }
      return;
    }
    const readPost = event.target.closest("[data-read-post]");
    if (readPost) {
      const post = blogPosts.find((item) => item.id === readPost.dataset.readPost);
      if (post) {
        modal(post.title, `<span class="eyebrow">${escapeHTML(post.category)} - ${escapeHTML(post.readTime)}</span><p>${escapeHTML(post.body)}</p>`);
      }
      return;
    }
    const caseButton = event.target.closest("[data-case-study]");
    if (caseButton) {
      const study = caseStudies.find((item) => item.id === caseButton.dataset.caseStudy);
      if (study) {
        modal(study.title, `
          <span class="eyebrow">${escapeHTML(study.industry)} - ${escapeHTML(study.metric)}</span>
          <p>${escapeHTML(study.details)}</p>
          <div class="button-row"><a class="btn" href="${hrefFor("business-finder")}">Build a similar workflow</a></div>
        `);
      }
      return;
    }
    if (event.target.closest("[data-security-check]")) {
      const settings = window.AxiomAI.getSettings();
      const user = window.AxiomAuth.getCurrentUser();
      modal("Security Self-Check", `
        <ul class="health-list">
          <li><strong><span class="status-dot"></span>CSP</strong><span>Configured</span></li>
          <li><strong><span class="status-dot"></span>CSRF token</strong><span>${escapeHTML(window.AxiomAuth.getCsrfToken().slice(0, 12))}...</span></li>
          <li><strong><span class="status-dot"></span>Session</strong><span>${user ? "Active" : "Not signed in"}</span></li>
          <li><strong><span class="status-dot"></span>NVIDIA gateway</strong><span>${settings.gatewayUrl ? "Configured" : "Local fallback"}</span></li>
        </ul>
      `);
      return;
    }
    if (event.target.closest("[data-health-check]")) {
      const stats = window.AxiomDashboard.getStats();
      const settings = window.AxiomAI.getSettings();
      modal("Health Check", `
        <ul class="health-list">
          <li><strong><span class="status-dot"></span>Projects</strong><span>${stats.projects}</span></li>
          <li><strong><span class="status-dot"></span>Reports</strong><span>${stats.reports}</span></li>
          <li><strong><span class="status-dot"></span>AI Requests</strong><span>${stats.aiGenerations}</span></li>
          <li><strong><span class="status-dot"></span>Revenue Tracker</strong><span>${formatMoney(stats.totalRevenue)}</span></li>
          <li><strong><span class="status-dot"></span>NVIDIA Model</strong><span>${escapeHTML(settings.model)}</span></li>
        </ul>
      `);
      return;
    }
    if (event.target.closest("[data-test-nvidia]")) {
      toast("Testing NVIDIA AI", "Checking the secure gateway connection.");
      window.AxiomAI.testGateway()
        .then((result) => {
          modal("NVIDIA AI Ready", `
            <ul class="health-list">
              <li><strong><span class="status-dot"></span>Provider</strong><span>NVIDIA AI</span></li>
              <li><strong><span class="status-dot"></span>Model</strong><span>${escapeHTML(result.model)}</span></li>
              <li><strong><span class="status-dot"></span>Latency</strong><span>${result.latencyMs}ms</span></li>
              <li><strong><span class="status-dot"></span>Response</strong><span>${escapeHTML(result.content)}</span></li>
            </ul>
          `);
        })
        .catch((error) => {
          modal("NVIDIA Gateway Not Ready", `
            <p>${escapeHTML(error.message || "Gateway test failed.")}</p>
            <ul class="check-list">
              <li>Start the secure gateway with an environment variable named NVIDIA_API_KEY.</li>
              <li>Keep the API key out of browser JavaScript and static files.</li>
              <li>Use the Settings page gateway URL: ${escapeHTML(window.AxiomAI.getSettings().gatewayUrl)}</li>
            </ul>
          `);
        });
      return;
    }
    if (event.target.closest("[data-copy-gateway]")) {
      const text = "POST /api/nvidia/v1/chat/completions -> validate session, enforce rate limit, inject NVIDIA_API_KEY server-side, forward to https://integrate.api.nvidia.com/v1/chat/completions with model meta/llama-4-maverick-17b-128e-instruct, log usage.";
      navigator.clipboard?.writeText(text).then(
        () => toast("Gateway shape copied", "API architecture note copied to clipboard."),
        () => toast("Gateway shape", text)
      );
      return;
    }
    if (event.target.closest("[data-export]")) {
      const exportData = {
        exportedAt: new Date().toISOString(),
        dashboard: window.AxiomDashboard.getStats(),
        aiSettings: window.AxiomAI.getSettings(),
        users: window.AxiomAuth.getAllUsers()
      };
      modal("Workspace Export", `<textarea readonly style="min-height: 340px">${escapeHTML(JSON.stringify(exportData, null, 2))}</textarea>`);
      return;
    }
    if (event.target.closest("[data-clear-data]")) {
      window.AxiomDashboard.clearAllData();
      window.AxiomAI.clearRequests();
      toast("Workspace data reset", "Projects, revenue, reports, and AI request logs were refreshed.");
      render();
    }
  }

  function handleInput(event) {
    if (event.target.matches("[data-market-search]")) updateMarketGrid();
    if (event.target.matches("[data-blog-search]")) updateBlogGrid();
    if (event.target.matches("[data-integration-search]")) updateIntegrationGrid();
  }

  function handleChange(event) {
    if (event.target.matches("[data-market-filter]")) updateMarketGrid();
    if (event.target.matches("[data-blog-category]")) updateBlogGrid();
    if (event.target.matches("[data-integration-category]")) updateIntegrationGrid();
    if (event.target.matches("[data-avatar-input]")) handleAvatar(event.target);
  }

  function handleAvatar(input) {
    const file = input.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      toast("Unsupported avatar", "Use PNG, JPG, or WEBP.");
      input.value = "";
      return;
    }
    if (file.size > 1024 * 512) {
      toast("Avatar too large", "Keep avatar images under 512 KB.");
      input.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      pendingAvatar = String(reader.result || "");
      const preview = document.getElementById("avatarPreview");
      if (preview) preview.innerHTML = `<img src="${escapeHTML(pendingAvatar)}" alt="">`;
    };
    reader.readAsDataURL(file);
  }

  function openDrawer() {
    document.getElementById("mobileDrawer").classList.add("is-open");
    document.getElementById("mobileDrawer").setAttribute("aria-hidden", "false");
    document.getElementById("drawerBackdrop").hidden = false;
    document.body.classList.add("is-locked");
  }

  function closeDrawer() {
    document.getElementById("mobileDrawer").classList.remove("is-open");
    document.getElementById("mobileDrawer").setAttribute("aria-hidden", "true");
    document.getElementById("drawerBackdrop").hidden = true;
    document.body.classList.remove("is-locked");
  }

  document.addEventListener("DOMContentLoaded", () => {
    window.AxiomAuth.ensureInit().then(() => {
      refreshBilling().then(render);
      document.addEventListener("submit", handleSubmit);
      document.addEventListener("click", handleClick);
      document.addEventListener("input", handleInput);
      document.addEventListener("change", handleChange);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register(`${base}sw.js`).catch(() => {});
      }
    });
  });

  window.addEventListener("axiom:auth-change", () => renderChrome());

  window.AxiomApp = {
    render,
    hrefFor,
    toast,
    escapeHTML
  };
})();
