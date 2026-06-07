"use strict";

const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
loadEnvFile(".env.local");
loadEnvFile(".env");

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "127.0.0.1";
const NVIDIA_API_URL = process.env.NVIDIA_API_URL || "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || "meta/llama-4-maverick-17b-128e-instruct";
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || "";
const NVIDIA_TIMEOUT_MS = Number(process.env.NVIDIA_TIMEOUT_MS || 30000);
const PAYPAL_ENV = String(process.env.PAYPAL_ENV || "sandbox").toLowerCase() === "live" ? "live" : "sandbox";
const PAYPAL_API_URL = process.env.PAYPAL_API_URL || (PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");
const PAYPAL_WEB_URL = process.env.PAYPAL_WEB_URL || (PAYPAL_ENV === "live" ? "https://www.paypal.com" : "https://www.sandbox.paypal.com");
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "";
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || "";
const ACCESS_COOKIE = "axiomflow_access";
const BILLING_DATA_DIR = path.join(ROOT, ".data");
const BILLING_DATA_FILE = path.join(BILLING_DATA_DIR, "billing.json");
const MAX_BODY_BYTES = 128 * 1024;
const REQUEST_WINDOW_MS = 60 * 1000;
const REQUEST_LIMIT = Number(process.env.AXIOM_GATEWAY_RATE_LIMIT || 30);
const rateBuckets = new Map();
const gatewayStats = {
  startedAt: new Date().toISOString(),
  totalRequests: 0,
  upstreamRequests: 0,
  upstreamFailures: 0,
  averageLatencyMs: 0
};

const paidPlans = {
  starter: {
    id: "starter",
    name: "Starter",
    monthly: 2900,
    yearly: 29000,
    monthlyEnv: "PAYPAL_PLAN_STARTER_MONTHLY",
    yearlyEnv: "PAYPAL_PLAN_STARTER_YEARLY"
  },
  pro: {
    id: "pro",
    name: "Pro",
    monthly: 7900,
    yearly: 79000,
    monthlyEnv: "PAYPAL_PLAN_PRO_MONTHLY",
    yearlyEnv: "PAYPAL_PLAN_PRO_YEARLY"
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    monthly: 24900,
    yearly: 249000,
    monthlyEnv: "PAYPAL_PLAN_ENTERPRISE_MONTHLY",
    yearlyEnv: "PAYPAL_PLAN_ENTERPRISE_YEARLY"
  }
};

const protectedPagePaths = new Set([
  "/pages/ai-business-builder.html",
  "/pages/automation-marketplace.html",
  "/pages/launch-blueprint-hub.html",
  "/pages/dashboard.html",
  "/pages/profile.html",
  "/pages/settings.html",
  "/pages/admin-panel.html",
  "/pages/documentation.html",
  "/pages/api.html",
  "/pages/status.html",
  "/pages/integrations.html",
  "/pages/security.html"
]);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml"
};

function loadEnvFile(fileName) {
  const filePath = path.join(ROOT, fileName);
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

function send(res, status, body, contentType = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": status >= 400 ? "no-store" : "no-cache"
  });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

function setSecurityHeaders(req, res) {
  const origin = req.headers.origin || "";
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-AXIOM-CSRF, Authorization, PayPal-Transmission-Id, PayPal-Transmission-Time, PayPal-Transmission-Sig, PayPal-Cert-Url, PayPal-Auth-Algo");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
}

function clientId(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "local";
}

function checkRateLimit(req) {
  const id = clientId(req);
  const now = Date.now();
  const bucket = rateBuckets.get(id) || { count: 0, resetAt: now + REQUEST_WINDOW_MS };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + REQUEST_WINDOW_MS;
  }
  bucket.count += 1;
  rateBuckets.set(id, bucket);
  return bucket.count <= REQUEST_LIMIT;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error("Request body is too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (error) {
        reject(new Error("Request body must be valid JSON."));
      }
    });
    req.on("error", reject);
  });
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error("Request body is too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function clamp(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function cleanText(value, max = 10000) {
  return String(value || "").replace(/[<>]/g, "").slice(0, max);
}

function cleanEmail(value) {
  const email = cleanText(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function cleanPath(value, fallback = "/pages/dashboard.html") {
  const text = cleanText(value, 240);
  if (!text || !text.startsWith("/") || text.startsWith("//") || text.includes("://")) return fallback;
  return text;
}

function isHttps(req) {
  return req.headers["x-forwarded-proto"] === "https" || req.socket.encrypted;
}

function requestOrigin(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || `${HOST}:${PORT}`;
  const proto = req.headers["x-forwarded-proto"] || (isHttps(req) ? "https" : "http");
  return `${proto}://${host}`;
}

function planFor(planId, cycle) {
  const plan = paidPlans[cleanText(planId, 40)];
  const billingCycle = cycle === "yearly" ? "yearly" : "monthly";
  if (!plan) return null;
  return {
    ...plan,
    billingCycle,
    amount: plan[billingCycle],
    planEnv: billingCycle === "yearly" ? plan.yearlyEnv : plan.monthlyEnv,
    paypalPlanId: process.env[billingCycle === "yearly" ? plan.yearlyEnv : plan.monthlyEnv] || ""
  };
}

function billingStoreDefault() {
  return {
    checkoutSessions: {},
    subscriptions: {},
    customers: {},
    paypalProductId: "",
    paypalPlans: {},
    accessTokens: {},
    events: []
  };
}

function ensureBillingDir() {
  if (!fs.existsSync(BILLING_DATA_DIR)) fs.mkdirSync(BILLING_DATA_DIR, { recursive: true });
}

function readBillingStore() {
  try {
    if (!fs.existsSync(BILLING_DATA_FILE)) return billingStoreDefault();
    return { ...billingStoreDefault(), ...JSON.parse(fs.readFileSync(BILLING_DATA_FILE, "utf8") || "{}") };
  } catch (error) {
    return billingStoreDefault();
  }
}

function writeBillingStore(store) {
  ensureBillingDir();
  fs.writeFileSync(BILLING_DATA_FILE, JSON.stringify(store, null, 2));
}

function rememberBillingEvent(store, type, payload = {}) {
  store.events.unshift({
    id: `evt_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    type,
    createdAt: new Date().toISOString(),
    ...payload
  });
  store.events = store.events.slice(0, 200);
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function createAccessToken() {
  return `ax_${crypto.randomBytes(32).toString("base64url")}`;
}

function cookieOptions(req, maxAgeSeconds = 60 * 60 * 24 * 30) {
  return [
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
    isHttps(req) ? "Secure" : ""
  ].filter(Boolean).join("; ");
}

function setAccessCookie(req, res, token) {
  res.setHeader("Set-Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(token)}; ${cookieOptions(req)}`);
}

function clearAccessCookie(req, res) {
  res.setHeader("Set-Cookie", `${ACCESS_COOKIE}=; ${cookieOptions(req, 0)}`);
}

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "")
    .split(";")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const index = pair.indexOf("=");
      if (index === -1) return [pair, ""];
      return [pair.slice(0, index), decodeURIComponent(pair.slice(index + 1))];
    }));
}

function activeStatus(status) {
  return ["active", "trialing"].includes(String(status || "").toLowerCase());
}

function accessFromCookie(req) {
  const token = parseCookies(req)[ACCESS_COOKIE];
  if (!token) return null;
  const store = readBillingStore();
  const access = store.accessTokens[hashToken(token)];
  if (!access || access.provider !== "paypal" || !activeStatus(access.status)) return null;
  return access;
}

function publicAccess(access) {
  if (!access) return { active: false, status: "unpaid" };
  return {
    active: activeStatus(access.status),
    status: access.status,
    provider: access.provider,
    email: access.email,
    plan: access.plan,
    billingCycle: access.billingCycle,
    customerId: access.customerId,
    subscriptionId: access.subscriptionId,
    updatedAt: access.updatedAt
  };
}

function requirePaidAccess(req, res) {
  const access = accessFromCookie(req);
  if (access) return access;
  send(res, 402, {
    error: "Active AXIOMFLOW subscription required.",
    code: "subscription_required",
    pricingUrl: "/pages/pricing.html"
  });
  return null;
}

function paypalConfigured(res) {
  if (PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET) return true;
  send(res, 503, {
    error: "PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are not configured on the gateway server.",
    provider: "PayPal Subscriptions"
  });
  return false;
}

function moneyFromCents(cents) {
  return (Number(cents || 0) / 100).toFixed(2);
}

function paypalCustomId(email, selectedPlan) {
  return [email, selectedPlan.id, selectedPlan.billingCycle].join("|").slice(0, 127);
}

function parsePaypalCustomId(value) {
  const [email, plan, billingCycle] = String(value || "").split("|");
  return { email: cleanEmail(email), plan, billingCycle };
}

function paypalLink(resource, rel) {
  return resource?.links?.find((link) => link.rel === rel)?.href || "";
}

async function paypalAccessToken() {
  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(json?.error_description || json?.message || `PayPal OAuth returned ${response.status}`);
  }
  return json.access_token;
}

async function paypalRequest(pathname, body = null, method = "POST") {
  const token = await paypalAccessToken();
  const options = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json"
    }
  };
  if (body) {
    options.body = JSON.stringify(body);
    options.headers["PayPal-Request-Id"] = `axiomflow-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
  }

  const response = await fetch(`${PAYPAL_API_URL}${pathname}`, options);
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const issue = json?.details?.[0]?.issue || json?.name || "";
    const message = json?.details?.[0]?.description || json?.message || `PayPal returned ${response.status}`;
    throw new Error(issue ? `${issue}: ${message}` : message);
  }
  return json;
}

async function ensurePaypalProduct(store) {
  if (store.paypalProductId) return store.paypalProductId;
  const product = await paypalRequest("/v1/catalogs/products", {
    name: "AXIOMFLOW",
    description: "AI-powered business automation and revenue growth platform.",
    type: "SERVICE",
    category: "SOFTWARE"
  });
  store.paypalProductId = product.id;
  rememberBillingEvent(store, "paypal.product.created", { productId: product.id });
  return product.id;
}

async function ensurePaypalPlan(store, selectedPlan) {
  if (selectedPlan.paypalPlanId) return selectedPlan.paypalPlanId;
  const key = `${selectedPlan.id}_${selectedPlan.billingCycle}`;
  if (store.paypalPlans[key]) return store.paypalPlans[key];

  const productId = await ensurePaypalProduct(store);
  const intervalUnit = selectedPlan.billingCycle === "yearly" ? "YEAR" : "MONTH";
  const plan = await paypalRequest("/v1/billing/plans", {
    product_id: productId,
    name: `AXIOMFLOW ${selectedPlan.name} ${selectedPlan.billingCycle}`,
    description: `${selectedPlan.name} subscription for AXIOMFLOW.`,
    status: "ACTIVE",
    billing_cycles: [
      {
        frequency: { interval_unit: intervalUnit, interval_count: 1 },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: moneyFromCents(selectedPlan.amount),
            currency_code: "USD"
          }
        }
      }
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee_failure_action: "CONTINUE",
      payment_failure_threshold: 3
    }
  });
  store.paypalPlans[key] = plan.id;
  rememberBillingEvent(store, "paypal.plan.created", { planId: plan.id, plan: selectedPlan.id, billingCycle: selectedPlan.billingCycle });
  return plan.id;
}

function buildPaypalSubscription(req, input, selectedPlan, paypalPlanId) {
  const origin = requestOrigin(req);
  const nextPath = cleanPath(input.next || "/pages/dashboard.html");
  const firstName = cleanText(input.name || "", 60).split(/\s+/)[0] || "AXIOMFLOW";
  const lastName = cleanText(input.name || "", 120).split(/\s+/).slice(1).join(" ") || "Subscriber";
  return {
    plan_id: paypalPlanId,
    custom_id: paypalCustomId(input.email, selectedPlan),
    subscriber: {
      email_address: input.email,
      name: {
        given_name: firstName,
        surname: lastName
      }
    },
    application_context: {
      brand_name: "AXIOMFLOW",
      locale: "en-US",
      shipping_preference: "NO_SHIPPING",
      user_action: "SUBSCRIBE_NOW",
      payment_method: {
        payer_selected: "PAYPAL",
        payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED"
      },
      return_url: `${origin}/pages/pricing.html?checkout=success&next=${encodeURIComponent(nextPath)}`,
      cancel_url: `${origin}/pages/pricing.html?checkout=cancelled&plan=${encodeURIComponent(selectedPlan.id)}`
    }
  };
}

function normalizePaypalStatus(status) {
  return cleanText(status || "unpaid", 40).toLowerCase();
}

function upsertSubscriptionAccess(store, data) {
  const now = new Date().toISOString();
  const email = cleanEmail(data.email);
  if (!email) return null;
  const subscriptionId = cleanText(data.subscriptionId || "", 160);
  const customerId = cleanText(data.customerId || "", 160);
  const status = cleanText(data.status || "active", 40).toLowerCase();
  const plan = paidPlans[data.plan] ? data.plan : "starter";
  const billingCycle = data.billingCycle === "yearly" ? "yearly" : "monthly";
  const record = {
    provider: "paypal",
    email,
    plan,
    billingCycle,
    status,
    customerId,
    subscriptionId,
    updatedAt: now
  };

  if (subscriptionId) store.subscriptions[subscriptionId] = { ...(store.subscriptions[subscriptionId] || {}), ...record };
  if (customerId) store.customers[customerId] = { ...(store.customers[customerId] || {}), email, customerId, updatedAt: now };

  for (const [tokenHash, access] of Object.entries(store.accessTokens)) {
    if ((subscriptionId && access.subscriptionId === subscriptionId) || access.email === email) {
      store.accessTokens[tokenHash] = { ...access, ...record };
    }
  }
  return record;
}

function issueAccessForSubscription(req, res, store, record) {
  const token = createAccessToken();
  const tokenHash = hashToken(token);
  store.accessTokens[tokenHash] = {
    ...record,
    createdAt: new Date().toISOString()
  };
  setAccessCookie(req, res, token);
  return store.accessTokens[tokenHash];
}

async function createCheckoutSession(req, res) {
  if (!paypalConfigured(res)) return;
  try {
    const input = await readBody(req);
    const email = cleanEmail(input.email);
    const selectedPlan = planFor(input.plan, input.billingCycle);
    if (!email) {
      send(res, 400, { error: "A valid email is required before checkout." });
      return;
    }
    if (!selectedPlan) {
      send(res, 400, { error: "Choose a paid subscription plan before checkout." });
      return;
    }

    const store = readBillingStore();
    const paypalPlanId = await ensurePaypalPlan(store, selectedPlan);
    const subscription = await paypalRequest("/v1/billing/subscriptions", buildPaypalSubscription(req, { ...input, email }, selectedPlan, paypalPlanId));
    const approveUrl = paypalLink(subscription, "approve");
    if (!approveUrl) throw new Error("PayPal did not return an approval link.");

    store.checkoutSessions[subscription.id] = {
      id: subscription.id,
      email,
      plan: selectedPlan.id,
      billingCycle: selectedPlan.billingCycle,
      status: normalizePaypalStatus(subscription.status || "approval_pending"),
      provider: "paypal",
      customerId: "",
      subscriptionId: subscription.id,
      paypalPlanId,
      createdAt: new Date().toISOString()
    };
    rememberBillingEvent(store, "paypal.subscription.created", { subscriptionId: subscription.id, email, plan: selectedPlan.id });
    writeBillingStore(store);
    send(res, 200, { id: subscription.id, subscriptionId: subscription.id, url: approveUrl, provider: "PayPal" });
  } catch (error) {
    send(res, 502, { error: error.message || "PayPal subscription checkout failed.", provider: "PayPal Subscriptions" });
  }
}

async function verifyCheckoutSession(req, res) {
  if (!paypalConfigured(res)) return;
  try {
    const input = await readBody(req);
    const subscriptionId = cleanText(input.subscriptionId || input.sessionId, 180);
    if (!/^I-[A-Z0-9]+$/i.test(subscriptionId)) {
      send(res, 400, { error: "A valid PayPal subscription ID is required." });
      return;
    }

    const subscription = await paypalRequest(`/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`, null, "GET");
    const store = readBillingStore();
    const existing = store.checkoutSessions[subscriptionId] || store.subscriptions[subscriptionId] || {};
    const custom = parsePaypalCustomId(subscription.custom_id || existing.customId);
    const email = cleanEmail(subscription.subscriber?.email_address || custom.email || existing.email);
    const status = normalizePaypalStatus(subscription.status);
    if (!email || !activeStatus(status)) {
      send(res, 402, {
        error: "PayPal has not confirmed an active subscription yet.",
        status
      });
      return;
    }

    const record = upsertSubscriptionAccess(store, {
      email,
      plan: custom.plan || existing.plan,
      billingCycle: custom.billingCycle || existing.billingCycle,
      status,
      customerId: subscription.subscriber?.payer_id || existing.customerId || "",
      subscriptionId
    });
    const access = issueAccessForSubscription(req, res, store, record);
    store.checkoutSessions[subscriptionId] = {
      ...(store.checkoutSessions[subscriptionId] || {}),
      id: subscriptionId,
      email,
      plan: access.plan,
      billingCycle: access.billingCycle,
      status,
      provider: "paypal",
      customerId: access.customerId,
      subscriptionId: access.subscriptionId,
      verifiedAt: new Date().toISOString()
    };
    rememberBillingEvent(store, "paypal.subscription.verified", { subscriptionId, email, plan: access.plan });
    writeBillingStore(store);
    send(res, 200, { ok: true, access: publicAccess(access) });
  } catch (error) {
    send(res, 502, { error: error.message || "PayPal verification failed.", provider: "PayPal Subscriptions" });
  }
}

async function createPortalSession(req, res) {
  if (!paypalConfigured(res)) return;
  const access = requirePaidAccess(req, res);
  if (!access) return;
  if (!access.subscriptionId) {
    send(res, 400, { error: "No PayPal subscription is linked to this account." });
    return;
  }

  try {
    const subscription = await paypalRequest(`/v1/billing/subscriptions/${encodeURIComponent(access.subscriptionId)}`, null, "GET");
    const manageUrl = paypalLink(subscription, "edit") || `${PAYPAL_WEB_URL}/myaccount/autopay/`;
    send(res, 200, { url: manageUrl });
  } catch (error) {
    send(res, 502, { error: error.message || "PayPal billing management failed.", provider: "PayPal Subscriptions" });
  }
}

function currentBilling(req, res) {
  send(res, 200, { access: publicAccess(accessFromCookie(req)) });
}

function logoutBilling(req, res) {
  clearAccessCookie(req, res);
  send(res, 200, { ok: true });
}

async function verifyPaypalWebhook(rawBody, headers) {
  if (!PAYPAL_WEBHOOK_ID) throw new Error("PAYPAL_WEBHOOK_ID is not configured.");
  const event = JSON.parse(rawBody);
  const verification = await paypalRequest("/v1/notifications/verify-webhook-signature", {
    auth_algo: headers["paypal-auth-algo"],
    cert_url: headers["paypal-cert-url"],
    transmission_id: headers["paypal-transmission-id"],
    transmission_sig: headers["paypal-transmission-sig"],
    transmission_time: headers["paypal-transmission-time"],
    webhook_id: PAYPAL_WEBHOOK_ID,
    webhook_event: event
  });
  if (verification.verification_status !== "SUCCESS") {
    throw new Error("PayPal webhook signature verification failed.");
  }
  return event;
}

function paypalWebhookStatus(type, currentStatus) {
  const statusMap = {
    "BILLING.SUBSCRIPTION.ACTIVATED": "active",
    "BILLING.SUBSCRIPTION.RE-ACTIVATED": "active",
    "BILLING.SUBSCRIPTION.CANCELLED": "cancelled",
    "BILLING.SUBSCRIPTION.SUSPENDED": "suspended",
    "BILLING.SUBSCRIPTION.EXPIRED": "expired",
    "BILLING.SUBSCRIPTION.PAYMENT.FAILED": "suspended"
  };
  return statusMap[type] || normalizePaypalStatus(currentStatus || "unpaid");
}

function applyPaypalWebhookEvent(store, event) {
  const resource = event?.resource || {};
  const subscriptionId = cleanText(resource.id || resource.billing_agreement_id || "", 180);
  if (!subscriptionId) return;
  const existing = store.subscriptions[subscriptionId] || store.checkoutSessions[subscriptionId] || {};
  const custom = parsePaypalCustomId(resource.custom_id || existing.customId);
  const status = paypalWebhookStatus(event.event_type, resource.status || existing.status);
  upsertSubscriptionAccess(store, {
    email: resource.subscriber?.email_address || custom.email || existing.email,
    plan: custom.plan || existing.plan,
    billingCycle: custom.billingCycle || existing.billingCycle,
    status,
    customerId: resource.subscriber?.payer_id || existing.customerId || "",
    subscriptionId
  });
  store.checkoutSessions[subscriptionId] = {
    ...(store.checkoutSessions[subscriptionId] || {}),
    id: subscriptionId,
    status,
    provider: "paypal",
    updatedAt: new Date().toISOString()
  };
}

async function paypalWebhook(req, res) {
  try {
    const rawBody = await readRawBody(req);
    const event = await verifyPaypalWebhook(rawBody, req.headers);
    const store = readBillingStore();
    applyPaypalWebhookEvent(store, event);
    rememberBillingEvent(store, event.event_type || "paypal.event", { paypalEventId: event.id || "" });
    writeBillingStore(store);
    send(res, 200, { received: true });
  } catch (error) {
    send(res, 400, { error: error.message || "Webhook handling failed." });
  }
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages) || !messages.length) {
    throw new Error("messages must include at least one item.");
  }
  return messages.slice(0, 16).map((message) => {
    const role = ["system", "user", "assistant"].includes(message?.role) ? message.role : "user";
    const content = cleanText(message?.content, 16000);
    if (!content) throw new Error("message content is required.");
    return { role, content };
  });
}

function buildNvidiaPayload(input) {
  return {
    model: cleanText(input.model || NVIDIA_MODEL, 160),
    messages: normalizeMessages(input.messages),
    max_tokens: clamp(input.max_tokens, 1, 2048, 512),
    temperature: clamp(input.temperature, 0, 2, 1),
    top_p: clamp(input.top_p, 0, 1, 1),
    frequency_penalty: clamp(input.frequency_penalty, -2, 2, 0),
    presence_penalty: clamp(input.presence_penalty, -2, 2, 0),
    stream: false
  };
}

function recordLatency(latencyMs) {
  gatewayStats.upstreamRequests += 1;
  gatewayStats.averageLatencyMs = Math.round(
    (gatewayStats.averageLatencyMs * (gatewayStats.upstreamRequests - 1) + latencyMs) / gatewayStats.upstreamRequests
  );
}

async function proxyNvidia(req, res) {
  gatewayStats.totalRequests += 1;
  if (!requirePaidAccess(req, res)) return;
  if (!checkRateLimit(req)) {
    send(res, 429, { error: "Gateway rate limit reached. Try again shortly." });
    return;
  }
  if (!NVIDIA_API_KEY) {
    send(res, 503, {
      error: "NVIDIA_API_KEY is not configured on the gateway server.",
      provider: "NVIDIA AI",
      model: NVIDIA_MODEL
    });
    return;
  }

  try {
    const input = await readBody(req);
    const payload = buildNvidiaPayload(input);
    const controller = new AbortController();
    const startedAt = Date.now();
    const timeout = setTimeout(() => controller.abort(), Math.max(4000, Math.min(60000, NVIDIA_TIMEOUT_MS)));
    const upstream = await fetch(NVIDIA_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeout);
    const text = await upstream.text();
    const latencyMs = Date.now() - startedAt;
    recordLatency(latencyMs);
    if (!upstream.ok) gatewayStats.upstreamFailures += 1;
    res.writeHead(upstream.status, {
      "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-AXIOM-Upstream-Latency-Ms": String(latencyMs)
    });
    res.end(text);
  } catch (error) {
    gatewayStats.upstreamFailures += 1;
    send(res, 502, {
      error: error.name === "AbortError" ? "NVIDIA gateway request timed out." : error.message,
      provider: "NVIDIA AI",
      model: NVIDIA_MODEL
    });
  }
}

function health(res) {
  send(res, 200, {
    ok: Boolean(NVIDIA_API_KEY),
    configured: Boolean(NVIDIA_API_KEY),
    provider: "NVIDIA AI",
    model: NVIDIA_MODEL,
    endpoint: NVIDIA_API_URL,
    uptimeSeconds: Math.round(process.uptime()),
    rateLimitPerMinute: REQUEST_LIMIT,
    timeoutMs: NVIDIA_TIMEOUT_MS,
    paypalBillingConfigured: Boolean(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET),
    paypalEnvironment: PAYPAL_ENV,
    stats: gatewayStats
  });
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  if (protectedPagePaths.has(pathname) && !accessFromCookie(req)) {
    const redirect = `/pages/pricing.html?gate=subscription&next=${encodeURIComponent(pathname)}`;
    res.writeHead(302, {
      Location: redirect,
      "Cache-Control": "no-store"
    });
    res.end();
    return;
  }
  const requested = path.normalize(path.join(ROOT, pathname));
  if (!requested.startsWith(ROOT)) {
    send(res, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }

  fs.stat(requested, (statError, stats) => {
    if (statError || !stats.isFile()) {
      send(res, 404, "File not found", "text/plain; charset=utf-8");
      return;
    }
    const ext = path.extname(requested).toLowerCase();
    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600",
      "X-Content-Type-Options": "nosniff"
    });
    fs.createReadStream(requested).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  setSecurityHeaders(req, res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
  if (req.method === "POST" && url.pathname === "/api/billing/checkout") {
    createCheckoutSession(req, res);
    return;
  }
  if (req.method === "POST" && (url.pathname === "/api/billing/verify-subscription" || url.pathname === "/api/billing/verify-session")) {
    verifyCheckoutSession(req, res);
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/billing/me") {
    currentBilling(req, res);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/billing/portal") {
    createPortalSession(req, res);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/billing/logout") {
    logoutBilling(req, res);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/paypal/webhook") {
    paypalWebhook(req, res);
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/nvidia/health") {
    health(res);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/nvidia/v1/chat/completions") {
    proxyNvidia(req, res);
    return;
  }
  if (req.method === "GET") {
    serveStatic(req, res);
    return;
  }
  send(res, 405, { error: "Method not allowed." });
});

server.listen(PORT, HOST, () => {
  console.log(`AXIOMFLOW running at http://${HOST}:${PORT}/index.html`);
  console.log(`NVIDIA gateway ${NVIDIA_API_KEY ? "configured" : "waiting for NVIDIA_API_KEY"}`);
});
