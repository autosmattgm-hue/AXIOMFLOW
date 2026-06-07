"use strict";

const crypto = require("crypto");

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
const SESSION_SECRET = process.env.SESSION_SECRET || PAYPAL_CLIENT_SECRET || "axiomflow-dev-session-secret";
const ACCESS_COOKIE = "axiomflow_access";

const paidPlans = {
  starter: { id: "starter", name: "Starter", monthly: 2900, yearly: 29000, monthlyEnv: "PAYPAL_PLAN_STARTER_MONTHLY", yearlyEnv: "PAYPAL_PLAN_STARTER_YEARLY" },
  pro: { id: "pro", name: "Pro", monthly: 7900, yearly: 79000, monthlyEnv: "PAYPAL_PLAN_PRO_MONTHLY", yearlyEnv: "PAYPAL_PLAN_PRO_YEARLY" },
  enterprise: { id: "enterprise", name: "Enterprise", monthly: 24900, yearly: 249000, monthlyEnv: "PAYPAL_PLAN_ENTERPRISE_MONTHLY", yearlyEnv: "PAYPAL_PLAN_ENTERPRISE_YEARLY" }
};

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
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

function requestOrigin(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`;
}

function readRawBody(req) {
  if (typeof req.body === "string") return Promise.resolve(req.body);
  if (req.body && typeof req.body === "object") return Promise.resolve(JSON.stringify(req.body));
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function readJSON(req) {
  const raw = await readRawBody(req);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error("Request body must be valid JSON.");
  }
}

function planFor(planId, cycle) {
  const plan = paidPlans[cleanText(planId, 40)];
  const billingCycle = cycle === "yearly" ? "yearly" : "monthly";
  if (!plan) return null;
  return {
    ...plan,
    billingCycle,
    amount: plan[billingCycle],
    paypalPlanId: process.env[billingCycle === "yearly" ? plan.yearlyEnv : plan.monthlyEnv] || ""
  };
}

function moneyFromCents(cents) {
  return (Number(cents || 0) / 100).toFixed(2);
}

function activeStatus(status) {
  return ["active", "trialing"].includes(String(status || "").toLowerCase());
}

function normalizeStatus(status) {
  return cleanText(status || "unpaid", 40).toLowerCase();
}

function sign(value) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

function encodeAccess(access) {
  const payload = Buffer.from(JSON.stringify(access)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decodeAccess(token) {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature || sign(payload) !== signature) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch (error) {
    return null;
  }
}

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "")
    .split(";")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const index = pair.indexOf("=");
      return index === -1 ? [pair, ""] : [pair.slice(0, index), decodeURIComponent(pair.slice(index + 1))];
    }));
}

function setAccessCookie(req, res, access) {
  const secure = req.headers["x-forwarded-proto"] === "https" ? "Secure; " : "";
  res.setHeader("Set-Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(encodeAccess(access))}; Path=/; HttpOnly; SameSite=Lax; ${secure}Max-Age=86400`);
}

function clearAccessCookie(res) {
  res.setHeader("Set-Cookie", `${ACCESS_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function accessFromCookie(req) {
  const access = decodeAccess(parseCookies(req)[ACCESS_COOKIE]);
  if (!access || access.provider !== "paypal" || !activeStatus(access.status)) return null;
  return access;
}

function publicAccess(access) {
  if (!access) return { active: false, status: "unpaid" };
  return {
    active: activeStatus(access.status),
    provider: "paypal",
    status: access.status,
    email: access.email,
    plan: access.plan,
    billingCycle: access.billingCycle,
    customerId: access.customerId,
    subscriptionId: access.subscriptionId,
    updatedAt: access.updatedAt
  };
}

function paypalConfigured(res) {
  if (PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET) return true;
  send(res, 503, { error: "PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are not configured.", provider: "PayPal Subscriptions" });
  return false;
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
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error_description || json.message || `PayPal OAuth returned ${response.status}`);
  return json.access_token;
}

async function paypalRequest(pathname, body = null, method = "POST") {
  const token = await paypalAccessToken();
  const options = {
    method,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" }
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

async function createPaypalPlan(selectedPlan) {
  const product = await paypalRequest("/v1/catalogs/products", {
    name: "AXIOMFLOW",
    description: "AI-powered business automation and revenue growth platform.",
    type: "SERVICE",
    category: "SOFTWARE"
  });
  const intervalUnit = selectedPlan.billingCycle === "yearly" ? "YEAR" : "MONTH";
  const plan = await paypalRequest("/v1/billing/plans", {
    product_id: product.id,
    name: `AXIOMFLOW ${selectedPlan.name} ${selectedPlan.billingCycle}`,
    description: `${selectedPlan.name} subscription for AXIOMFLOW.`,
    status: "ACTIVE",
    billing_cycles: [{
      frequency: { interval_unit: intervalUnit, interval_count: 1 },
      tenure_type: "REGULAR",
      sequence: 1,
      total_cycles: 0,
      pricing_scheme: { fixed_price: { value: moneyFromCents(selectedPlan.amount), currency_code: "USD" } }
    }],
    payment_preferences: { auto_bill_outstanding: true, setup_fee_failure_action: "CONTINUE", payment_failure_threshold: 3 }
  });
  return plan.id;
}

function paypalLink(resource, rel) {
  return resource?.links?.find((link) => link.rel === rel)?.href || "";
}

function paypalCustomId(email, selectedPlan) {
  return [email, selectedPlan.id, selectedPlan.billingCycle].join("|").slice(0, 127);
}

function parsePaypalCustomId(value) {
  const [email, plan, billingCycle] = String(value || "").split("|");
  return { email: cleanEmail(email), plan, billingCycle };
}

async function createCheckout(req, res) {
  if (!paypalConfigured(res)) return;
  try {
    const input = await readJSON(req);
    const email = cleanEmail(input.email);
    const selectedPlan = planFor(input.plan, input.billingCycle);
    if (!email) return send(res, 400, { error: "A valid email is required before checkout." });
    if (!selectedPlan) return send(res, 400, { error: "Choose a paid subscription plan before checkout." });

    const paypalPlanId = selectedPlan.paypalPlanId || await createPaypalPlan(selectedPlan);
    const nextPath = cleanPath(input.next || "/pages/dashboard.html");
    const subscription = await paypalRequest("/v1/billing/subscriptions", {
      plan_id: paypalPlanId,
      custom_id: paypalCustomId(email, selectedPlan),
      subscriber: {
        email_address: email,
        name: { given_name: cleanText(input.name || "AXIOMFLOW", 60).split(/\s+/)[0] || "AXIOMFLOW", surname: "Subscriber" }
      },
      application_context: {
        brand_name: "AXIOMFLOW",
        locale: "en-US",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        payment_method: { payer_selected: "PAYPAL", payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED" },
        return_url: `${requestOrigin(req)}/pages/pricing.html?checkout=success&next=${encodeURIComponent(nextPath)}`,
        cancel_url: `${requestOrigin(req)}/pages/pricing.html?checkout=cancelled&plan=${encodeURIComponent(selectedPlan.id)}`
      }
    });
    const approveUrl = paypalLink(subscription, "approve");
    if (!approveUrl) throw new Error("PayPal did not return an approval link.");
    send(res, 200, { id: subscription.id, subscriptionId: subscription.id, url: approveUrl, provider: "PayPal" });
  } catch (error) {
    send(res, 502, { error: error.message || "PayPal subscription checkout failed.", provider: "PayPal Subscriptions" });
  }
}

async function verifySubscription(req, res) {
  if (!paypalConfigured(res)) return;
  try {
    const input = await readJSON(req);
    const subscriptionId = cleanText(input.subscriptionId || input.sessionId, 180);
    if (!/^I-[A-Z0-9]+$/i.test(subscriptionId)) return send(res, 400, { error: "A valid PayPal subscription ID is required." });
    const subscription = await paypalRequest(`/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`, null, "GET");
    const custom = parsePaypalCustomId(subscription.custom_id);
    const email = cleanEmail(subscription.subscriber?.email_address || custom.email);
    const status = normalizeStatus(subscription.status);
    if (!email || !activeStatus(status)) return send(res, 402, { error: "PayPal has not confirmed an active subscription yet.", status });

    const access = {
      provider: "paypal",
      email,
      plan: paidPlans[custom.plan] ? custom.plan : "starter",
      billingCycle: custom.billingCycle === "yearly" ? "yearly" : "monthly",
      status,
      customerId: subscription.subscriber?.payer_id || "",
      subscriptionId,
      updatedAt: new Date().toISOString()
    };
    setAccessCookie(req, res, access);
    send(res, 200, { ok: true, access: publicAccess(access) });
  } catch (error) {
    send(res, 502, { error: error.message || "PayPal verification failed.", provider: "PayPal Subscriptions" });
  }
}

async function requirePaidAccess(req, res) {
  const access = accessFromCookie(req);
  if (!access) {
    send(res, 402, { error: "Active AXIOMFLOW subscription required.", code: "subscription_required", pricingUrl: "/pages/pricing.html" });
    return null;
  }
  if (PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET && access.subscriptionId) {
    const subscription = await paypalRequest(`/v1/billing/subscriptions/${encodeURIComponent(access.subscriptionId)}`, null, "GET");
    if (!activeStatus(normalizeStatus(subscription.status))) {
      send(res, 402, { error: "PayPal subscription is not active.", code: "subscription_inactive", status: subscription.status });
      return null;
    }
  }
  return access;
}

async function billingPortal(req, res) {
  if (!paypalConfigured(res)) return;
  try {
    const access = await requirePaidAccess(req, res);
    if (!access) return;
    const subscription = await paypalRequest(`/v1/billing/subscriptions/${encodeURIComponent(access.subscriptionId)}`, null, "GET");
    send(res, 200, { url: paypalLink(subscription, "edit") || `${PAYPAL_WEB_URL}/myaccount/autopay/` });
  } catch (error) {
    send(res, 502, { error: error.message || "PayPal billing management failed.", provider: "PayPal Subscriptions" });
  }
}

async function paypalWebhook(req, res) {
  if (!paypalConfigured(res)) return;
  if (!PAYPAL_WEBHOOK_ID) return send(res, 503, { error: "PAYPAL_WEBHOOK_ID is not configured.", provider: "PayPal Subscriptions" });
  try {
    const raw = await readRawBody(req);
    const event = JSON.parse(raw || "{}");
    const verification = await paypalRequest("/v1/notifications/verify-webhook-signature", {
      auth_algo: req.headers["paypal-auth-algo"],
      cert_url: req.headers["paypal-cert-url"],
      transmission_id: req.headers["paypal-transmission-id"],
      transmission_sig: req.headers["paypal-transmission-sig"],
      transmission_time: req.headers["paypal-transmission-time"],
      webhook_id: PAYPAL_WEBHOOK_ID,
      webhook_event: event
    });
    if (verification.verification_status !== "SUCCESS") throw new Error("PayPal webhook signature verification failed.");
    send(res, 200, { received: true });
  } catch (error) {
    send(res, 400, { error: error.message || "Webhook handling failed." });
  }
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages) || !messages.length) throw new Error("messages must include at least one item.");
  return messages.slice(0, 16).map((message) => {
    const role = ["system", "user", "assistant"].includes(message?.role) ? message.role : "user";
    const content = cleanText(message?.content, 16000);
    if (!content) throw new Error("message content is required.");
    return { role, content };
  });
}

async function proxyNvidia(req, res) {
  const access = await requirePaidAccess(req, res);
  if (!access) return;
  if (!NVIDIA_API_KEY) return send(res, 503, { error: "NVIDIA_API_KEY is not configured.", provider: "NVIDIA AI", model: NVIDIA_MODEL });
  try {
    const input = await readJSON(req);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.max(4000, Math.min(60000, NVIDIA_TIMEOUT_MS)));
    const upstream = await fetch(NVIDIA_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${NVIDIA_API_KEY}`, Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: cleanText(input.model || NVIDIA_MODEL, 160),
        messages: normalizeMessages(input.messages),
        max_tokens: Math.max(1, Math.min(2048, Number(input.max_tokens || 512))),
        temperature: Math.max(0, Math.min(2, Number(input.temperature ?? 1))),
        top_p: Math.max(0, Math.min(1, Number(input.top_p ?? 1))),
        frequency_penalty: Math.max(-2, Math.min(2, Number(input.frequency_penalty || 0))),
        presence_penalty: Math.max(-2, Math.min(2, Number(input.presence_penalty || 0))),
        stream: false
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    const text = await upstream.text();
    res.statusCode = upstream.status;
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(text);
  } catch (error) {
    send(res, 502, { error: error.name === "AbortError" ? "NVIDIA gateway request timed out." : error.message, provider: "NVIDIA AI", model: NVIDIA_MODEL });
  }
}

function routePath(req) {
  const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
  const raw = url.searchParams.get("path") || url.pathname.replace(/^\/api\/?/, "");
  return `/${raw.replace(/^\/+/, "")}`;
}

module.exports = async function handler(req, res) {
  const path = routePath(req);
  if (req.method === "OPTIONS") return send(res, 204, {});
  if (req.method === "GET" && path === "/nvidia/health") {
    return send(res, 200, {
      ok: Boolean(NVIDIA_API_KEY),
      configured: Boolean(NVIDIA_API_KEY),
      provider: "NVIDIA AI",
      model: NVIDIA_MODEL,
      paypalBillingConfigured: Boolean(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET),
      paypalEnvironment: PAYPAL_ENV
    });
  }
  if (req.method === "POST" && path === "/nvidia/v1/chat/completions") return proxyNvidia(req, res);
  if (req.method === "POST" && path === "/billing/checkout") return createCheckout(req, res);
  if (req.method === "POST" && (path === "/billing/verify-subscription" || path === "/billing/verify-session")) return verifySubscription(req, res);
  if (req.method === "GET" && path === "/billing/me") return send(res, 200, { access: publicAccess(accessFromCookie(req)) });
  if (req.method === "POST" && path === "/billing/portal") return billingPortal(req, res);
  if (req.method === "POST" && path === "/billing/logout") {
    clearAccessCookie(res);
    return send(res, 200, { ok: true });
  }
  if (req.method === "POST" && path === "/paypal/webhook") return paypalWebhook(req, res);
  return send(res, 404, { error: "API route not found.", path });
};
