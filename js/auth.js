(function () {
  "use strict";

  const USERS_KEY = "axiomflow.users";
  const SESSION_KEY = "axiomflow.session";
  const RESET_KEY = "axiomflow.passwordResets";
  const SECRET_KEY = "axiomflow.deviceSecret";
  const CSRF_KEY = "axiomflow.csrf";
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let initPromise;

  function safeParse(value, fallback) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function readJSON(key, fallback) {
    try {
      return safeParse(localStorage.getItem(key), fallback);
    } catch (error) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function randomId(prefix) {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${prefix}_${token}`;
  }

  function bytesToHex(buffer) {
    return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async function sha256(value) {
    const data = new TextEncoder().encode(value);
    return bytesToHex(await crypto.subtle.digest("SHA-256", data));
  }

  function toBase64Url(value) {
    const json = typeof value === "string" ? value : JSON.stringify(value);
    const encoded = btoa(unescape(encodeURIComponent(json)));
    return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function fromBase64Url(value) {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    return JSON.parse(decodeURIComponent(escape(atob(padded))));
  }

  function sanitizeText(value) {
    return String(value || "").trim().replace(/[<>]/g, "");
  }

  function publicUser(user) {
    if (!user) return null;
    const { passwordHash, salt, ...safeUser } = user;
    return safeUser;
  }

  function getUsers() {
    return readJSON(USERS_KEY, []);
  }

  function setUsers(users) {
    writeJSON(USERS_KEY, users);
  }

  function getResets() {
    return readJSON(RESET_KEY, []);
  }

  function setResets(resets) {
    writeJSON(RESET_KEY, resets);
  }

  function getDeviceSecret() {
    let secret = localStorage.getItem(SECRET_KEY);
    if (!secret) {
      secret = randomId("secret");
      localStorage.setItem(SECRET_KEY, secret);
    }
    return secret;
  }

  async function hashPassword(password, salt) {
    return sha256(`${salt}:${password}`);
  }

  async function seedUsers() {
    const users = getUsers();
    if (users.length) return;
    const adminSalt = randomId("salt");
    const demoSalt = randomId("salt");
    const seeded = [
      {
        id: randomId("usr"),
        name: "Axiom Admin",
        email: "admin@axiomflow.ai",
        company: "AXIOMFLOW",
        role: "admin",
        avatar: "",
        subscription: "enterprise",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        salt: adminSalt,
        passwordHash: await hashPassword("AxiomAdmin2026!", adminSalt)
      },
      {
        id: randomId("usr"),
        name: "Demo Founder",
        email: "founder@example.com",
        company: "Northstar Automation",
        role: "user",
        avatar: "",
        subscription: "pro",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        salt: demoSalt,
        passwordHash: await hashPassword("DemoUser2026!", demoSalt)
      }
    ];
    setUsers(seeded);
  }

  async function ensureInit() {
    if (!initPromise) {
      initPromise = seedUsers();
    }
    await initPromise;
  }

  async function createJwt(user) {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "HS256", typ: "JWT" };
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      iss: "axiomflow",
      aud: "axiomflow-web",
      iat: now,
      exp: now + 60 * 60 * 6
    };
    const body = `${toBase64Url(header)}.${toBase64Url(payload)}`;
    const signature = toBase64Url(await sha256(`${body}.${getDeviceSecret()}`));
    return `${body}.${signature}`;
  }

  async function createSession(user) {
    const token = await createJwt(user);
    const session = {
      token,
      refreshToken: randomId("refresh"),
      userId: user.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + 1000 * 60 * 60 * 6,
      refreshExpiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30
    };
    writeJSON(SESSION_KEY, session);
    window.dispatchEvent(new CustomEvent("axiom:auth-change", { detail: { user: publicUser(user) } }));
    return session;
  }

  function getSession() {
    const session = readJSON(SESSION_KEY, null);
    if (!session) return null;
    if (session.expiresAt > Date.now()) return session;
    if (session.refreshExpiresAt > Date.now()) {
      session.expiresAt = Date.now() + 1000 * 60 * 60 * 6;
      writeJSON(SESSION_KEY, session);
      return session;
    }
    localStorage.removeItem(SESSION_KEY);
    return null;
  }

  function decodeSession() {
    const session = getSession();
    if (!session?.token) return null;
    const [, payload] = session.token.split(".");
    try {
      return fromBase64Url(payload);
    } catch (error) {
      return null;
    }
  }

  function getCurrentUser() {
    const session = getSession();
    if (!session) return null;
    const users = getUsers();
    return publicUser(users.find((user) => user.id === session.userId));
  }

  function passwordIsStrong(password) {
    return typeof password === "string" && password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password);
  }

  function assertCsrf(token) {
    if (!token || token !== getCsrfToken()) {
      throw new Error("Security token expired. Refresh the page and try again.");
    }
  }

  function getCsrfToken() {
    let token = sessionStorage.getItem(CSRF_KEY);
    if (!token) {
      token = randomId("csrf");
      sessionStorage.setItem(CSRF_KEY, token);
    }
    return token;
  }

  async function register(input) {
    await ensureInit();
    assertCsrf(input.csrf);
    const name = sanitizeText(input.name);
    const email = sanitizeText(input.email).toLowerCase();
    const company = sanitizeText(input.company || "");
    const password = String(input.password || "");
    if (name.length < 2) throw new Error("Enter your full name.");
    if (!EMAIL_RE.test(email)) throw new Error("Enter a valid email address.");
    if (!passwordIsStrong(password)) throw new Error("Use 10+ characters with an uppercase letter and a number.");
    const users = getUsers();
    if (users.some((user) => user.email === email)) throw new Error("An account with this email already exists.");
    const salt = randomId("salt");
    const user = {
      id: randomId("usr"),
      name,
      email,
      company,
      role: email.endsWith("@axiomflow.ai") ? "admin" : "user",
      avatar: "",
      subscription: "pending_payment",
      billingStatus: "unpaid",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      salt,
      passwordHash: await hashPassword(password, salt)
    };
    users.push(user);
    setUsers(users);
    await createSession(user);
    return publicUser(user);
  }

  async function login(input) {
    await ensureInit();
    assertCsrf(input.csrf);
    const email = sanitizeText(input.email).toLowerCase();
    const password = String(input.password || "");
    if (!EMAIL_RE.test(email)) throw new Error("Enter a valid email address.");
    const users = getUsers();
    const user = users.find((candidate) => candidate.email === email);
    if (!user) throw new Error("Email or password is incorrect.");
    const passwordHash = await hashPassword(password, user.salt);
    if (passwordHash !== user.passwordHash) throw new Error("Email or password is incorrect.");
    await createSession(user);
    return publicUser(user);
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new CustomEvent("axiom:auth-change", { detail: { user: null } }));
  }

  async function requestPasswordReset(input) {
    await ensureInit();
    assertCsrf(input.csrf);
    const email = sanitizeText(input.email).toLowerCase();
    if (!EMAIL_RE.test(email)) throw new Error("Enter a valid email address.");
    const users = getUsers();
    const user = users.find((candidate) => candidate.email === email);
    if (!user) throw new Error("No account was found for that email.");
    const token = randomId("reset");
    const resets = getResets().filter((item) => item.email !== email && item.expiresAt > Date.now());
    resets.push({
      email,
      token,
      expiresAt: Date.now() + 1000 * 60 * 30,
      used: false
    });
    setResets(resets);
    return { email, token };
  }

  async function resetPassword(input) {
    await ensureInit();
    assertCsrf(input.csrf);
    const email = sanitizeText(input.email).toLowerCase();
    const token = sanitizeText(input.token);
    const password = String(input.password || "");
    if (!passwordIsStrong(password)) throw new Error("Use 10+ characters with an uppercase letter and a number.");
    const resets = getResets();
    const reset = resets.find((item) => item.email === email && item.token === token && !item.used && item.expiresAt > Date.now());
    if (!reset) throw new Error("Reset token is invalid or expired.");
    const users = getUsers();
    const user = users.find((candidate) => candidate.email === email);
    if (!user) throw new Error("Account not found.");
    user.salt = randomId("salt");
    user.passwordHash = await hashPassword(password, user.salt);
    user.updatedAt = new Date().toISOString();
    reset.used = true;
    setUsers(users);
    setResets(resets);
    return true;
  }

  async function updateProfile(input) {
    await ensureInit();
    assertCsrf(input.csrf);
    const session = getSession();
    if (!session) throw new Error("Sign in to update your profile.");
    const users = getUsers();
    const user = users.find((candidate) => candidate.id === session.userId);
    if (!user) throw new Error("Session user was not found.");
    const name = sanitizeText(input.name);
    const company = sanitizeText(input.company || "");
    if (name.length < 2) throw new Error("Enter your full name.");
    user.name = name;
    user.company = company;
    if (typeof input.avatar === "string") user.avatar = input.avatar;
    user.updatedAt = new Date().toISOString();
    setUsers(users);
    window.dispatchEvent(new CustomEvent("axiom:auth-change", { detail: { user: publicUser(user) } }));
    return publicUser(user);
  }

  async function changePassword(input) {
    await ensureInit();
    assertCsrf(input.csrf);
    const session = getSession();
    if (!session) throw new Error("Sign in to change your password.");
    const users = getUsers();
    const user = users.find((candidate) => candidate.id === session.userId);
    if (!user) throw new Error("Session user was not found.");
    const currentHash = await hashPassword(String(input.currentPassword || ""), user.salt);
    if (currentHash !== user.passwordHash) throw new Error("Current password is incorrect.");
    if (!passwordIsStrong(input.newPassword)) throw new Error("Use 10+ characters with an uppercase letter and a number.");
    user.salt = randomId("salt");
    user.passwordHash = await hashPassword(String(input.newPassword), user.salt);
    user.updatedAt = new Date().toISOString();
    setUsers(users);
    return true;
  }

  async function updateSubscription(plan) {
    sessionStorage.setItem("axiomflow.pendingPlan", sanitizeText(plan));
    throw new Error("Use secure PayPal approval to activate a subscription.");
  }

  async function syncBillingAccess(access) {
    await ensureInit();
    const session = getSession();
    if (!session) return null;
    const users = getUsers();
    const user = users.find((candidate) => candidate.id === session.userId);
    if (!user) return null;
    const active = Boolean(access?.active);
    user.subscription = active ? sanitizeText(access.plan || "paid") : "unpaid";
    user.billingStatus = active ? sanitizeText(access.status || "active") : "unpaid";
    user.paypalPayerId = active ? sanitizeText(access.customerId || "") : "";
    user.paypalSubscriptionId = active ? sanitizeText(access.subscriptionId || "") : "";
    user.updatedAt = new Date().toISOString();
    setUsers(users);
    window.dispatchEvent(new CustomEvent("axiom:auth-change", { detail: { user: publicUser(user) } }));
    return publicUser(user);
  }

  function getAllUsers() {
    return getUsers().map(publicUser);
  }

  function isAdmin() {
    return getCurrentUser()?.role === "admin";
  }

  document.addEventListener("DOMContentLoaded", () => {
    ensureInit().catch((error) => console.warn("Auth initialization failed.", error));
  });

  window.AxiomAuth = {
    ensureInit,
    getCsrfToken,
    getCurrentUser,
    getSession,
    decodeSession,
    getAllUsers,
    isAdmin,
    register,
    login,
    logout,
    requestPasswordReset,
    resetPassword,
    updateProfile,
    changePassword,
    updateSubscription,
    syncBillingAccess
  };
})();
