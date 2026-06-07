(function () {
  "use strict";

  const SETTINGS_KEY = "axiomflow.aiSettings";
  const RATE_KEY = "axiomflow.aiRate";
  const REQUESTS_KEY = "axiomflow.aiRequests";
  const DEFAULT_SETTINGS = {
    providerVersion: "nvidia-maverick-v2",
    gatewayUrl: "/api/nvidia",
    model: "meta/llama-4-maverick-17b-128e-instruct",
    maxTokens: 512,
    temperature: 1,
    topP: 1,
    maxRequestsPerMinute: 12,
    timeoutMs: 30000
  };

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

  function sanitizeText(value) {
    return String(value || "").trim().replace(/[<>]/g, "");
  }

  function asNumber(value, fallback = 0) {
    const number = Number(String(value || "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(number) ? number : fallback;
  }

  function clamp(number, min, max) {
    return Math.max(min, Math.min(max, number));
  }

  function getSettings() {
    const stored = readJSON(SETTINGS_KEY, {});
    const settings = { ...DEFAULT_SETTINGS, ...stored };
    if (stored.providerVersion !== DEFAULT_SETTINGS.providerVersion) {
      const storedGateway = sanitizeText(stored.gatewayUrl || "");
      const oldLocalGateway = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/api\/nvidia/i.test(storedGateway);
      settings.providerVersion = DEFAULT_SETTINGS.providerVersion;
      settings.gatewayUrl = !storedGateway || oldLocalGateway ? DEFAULT_SETTINGS.gatewayUrl : storedGateway;
      settings.model = sanitizeText(stored.model || DEFAULT_SETTINGS.model);
      settings.maxTokens = clamp(asNumber(stored.maxTokens, DEFAULT_SETTINGS.maxTokens), 64, 2048);
      settings.temperature = clamp(asNumber(stored.temperature, DEFAULT_SETTINGS.temperature), 0, 2);
      settings.topP = clamp(asNumber(stored.topP, DEFAULT_SETTINGS.topP), 0.1, 1);
      settings.maxRequestsPerMinute = clamp(asNumber(stored.maxRequestsPerMinute, DEFAULT_SETTINGS.maxRequestsPerMinute), 1, 60);
      settings.timeoutMs = clamp(asNumber(stored.timeoutMs, DEFAULT_SETTINGS.timeoutMs), 4000, 60000);
      writeJSON(SETTINGS_KEY, settings);
    }
    return settings;
  }

  function saveSettings(input) {
    const settings = {
      providerVersion: DEFAULT_SETTINGS.providerVersion,
      gatewayUrl: sanitizeText(input.gatewayUrl || DEFAULT_SETTINGS.gatewayUrl),
      model: sanitizeText(input.model || DEFAULT_SETTINGS.model),
      maxTokens: clamp(asNumber(input.maxTokens, DEFAULT_SETTINGS.maxTokens), 64, 2048),
      temperature: clamp(asNumber(input.temperature, DEFAULT_SETTINGS.temperature), 0, 2),
      topP: clamp(asNumber(input.topP, DEFAULT_SETTINGS.topP), 0.1, 1),
      maxRequestsPerMinute: clamp(asNumber(input.maxRequestsPerMinute, DEFAULT_SETTINGS.maxRequestsPerMinute), 1, 60),
      timeoutMs: clamp(asNumber(input.timeoutMs, DEFAULT_SETTINGS.timeoutMs), 4000, 60000)
    };
    writeJSON(SETTINGS_KEY, settings);
    return settings;
  }

  function getRequests() {
    return readJSON(REQUESTS_KEY, []);
  }

  function logRequest(entry) {
    const requests = getRequests();
    requests.unshift({
      id: `air_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      ...entry
    });
    writeJSON(REQUESTS_KEY, requests.slice(0, 120));
  }

  function clearRequests() {
    writeJSON(REQUESTS_KEY, []);
  }

  function checkRateLimit() {
    const settings = getSettings();
    const now = Date.now();
    const state = readJSON(RATE_KEY, { windowStart: now, count: 0 });
    const fresh = now - state.windowStart > 60000 ? { windowStart: now, count: 0 } : state;
    if (fresh.count >= settings.maxRequestsPerMinute) {
      throw new Error("AI request limit reached. Wait a minute or raise the limit in Settings.");
    }
    fresh.count += 1;
    writeJSON(RATE_KEY, fresh);
  }

  function promptFor(feature, input) {
    const payload = JSON.stringify(input, null, 2);
    const taskMap = {
      businessFinder: "Generate profitable AI business opportunities with revenue potential, competition score, startup cost, validation score, and launch actions.",
      validation: "Evaluate the three-tier pain test and return pass, warning, or fail with explanations and risk controls.",
      blueprint: "Generate a step-by-step launch blueprint covering audience discovery, community research, MVP strategy, pricing, launch, and growth.",
      builder: "Design an AI business MVP with modules, automation workflows, monetization, security controls, and launch KPIs.",
      outreach: "Generate personalized outreach, sales emails, follow-ups, and a concise prospect summary.",
      compliance: "Analyze compliance, privacy, legal, and regulatory risks and return actionable fixes.",
      chat: "Answer as a concise AXIOMFLOW business automation assistant."
    };
    return [
      "You are the AXIOMFLOW NVIDIA AI service.",
      "Return only strict JSON. Do not include markdown, code fences, explanations, or keys outside the schema.",
      "Use concise, measurable, production-ready business guidance.",
      taskMap[feature] || taskMap.chat,
      "JSON schema:",
      schemaFor(feature),
      "Input:",
      payload
    ].join("\n");
  }

  function schemaFor(feature) {
    const schemas = {
      businessFinder: {
        headline: "Short portfolio headline",
        summary: "Buyer and monetization summary",
        ideas: [
          {
            name: "Idea name",
            summary: "What the product does and who buys it",
            revenuePotential: "$ range or MRR path",
            competitionScore: 65,
            startupCost: "$ launch budget",
            validationScore: 82,
            firstLaunchAction: "First paid validation action"
          }
        ],
        recommendedNextStep: "Highest leverage next step"
      },
      validation: {
        score: 82,
        status: "Pass, Warning, or Fail",
        summary: "Decision summary",
        checks: [
          { label: "Urgent problem", result: "yes, partial, or no", explanation: "Evidence and risk" }
        ],
        nextActions: ["Action"]
      },
      blueprint: {
        title: "Launch blueprint title",
        audience: "Target buyer",
        successMetric: "Measured success metric",
        sections: [
          { title: "Phase title", steps: ["Specific step"] }
        ]
      },
      builder: {
        title: "MVP name",
        positioning: "Buyer positioning",
        modules: ["Module"],
        stack: ["Stack decision"],
        monetization: ["Revenue mechanism"],
        launchKPIs: ["KPI"]
      },
      outreach: {
        prospectSummary: "Concise prospect insight",
        email: { subject: "Subject", body: "Plain text email body" },
        followUps: ["Follow-up message"]
      },
      compliance: {
        title: "Scan title",
        score: 72,
        status: "Pass, Warning, or Fail",
        surface: "Surface reviewed",
        findings: ["Finding"],
        fixes: ["Fix"]
      },
      chat: {
        answer: "Concise assistant answer",
        actions: ["Action"]
      }
    };
    return JSON.stringify(schemas[feature] || schemas.chat);
  }

  function normalizeEndpoint(value) {
    const url = sanitizeText(value);
    if (!url) return "";
    if (/^https:\/\/integrate\.api\.nvidia\.com/i.test(url)) return "";
    const base = /^(https?:)?\/\//i.test(url) || url.startsWith("/") ? url : `/${url}`;
    return base.endsWith("/v1/chat/completions") ? base : `${base.replace(/\/+$/g, "")}/v1/chat/completions`;
  }

  function timeoutSignal(timeoutMs) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    return { signal: controller.signal, cancel: () => clearTimeout(id) };
  }

  async function fetchGateway(feature, input) {
    const settings = getSettings();
    const endpoint = normalizeEndpoint(settings.gatewayUrl);
    if (!endpoint) return null;
    const prompt = promptFor(feature, input);
    const body = {
      model: settings.model,
      max_tokens: settings.maxTokens,
      temperature: settings.temperature,
      top_p: settings.topP,
      frequency_penalty: 0,
      presence_penalty: 0,
      stream: false,
      messages: [
        {
          role: "system",
          content: "You are AXIOMFLOW, a business automation and revenue growth assistant powered by NVIDIA AI. Return practical, concise, production-ready business guidance."
        },
        { role: "user", content: prompt }
      ]
    };

    let lastError;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const timer = timeoutSignal(settings.timeoutMs);
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-AXIOM-CSRF": window.AxiomAuth?.getCsrfToken?.() || ""
          },
          body: JSON.stringify(body),
          signal: timer.signal
        });
        timer.cancel();
        const json = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message = json.error || json.detail || `Gateway returned ${response.status}`;
          const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
          const configuredError = /NVIDIA_API_KEY|not configured/i.test(message);
          if (!retryable || configuredError || attempt === 1) throw new Error(message);
          lastError = new Error(message);
          await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
          continue;
        }
        return json?.choices?.[0]?.message?.content || json?.output_text || JSON.stringify(json);
      } catch (error) {
        timer.cancel();
        lastError = error;
        if (error.name === "AbortError") {
          lastError = new Error("NVIDIA gateway request timed out.");
        }
        if (attempt === 1) break;
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
    throw lastError || new Error("NVIDIA gateway request failed.");
  }

  function parseGatewayData(content) {
    const raw = String(content || "").trim();
    if (!raw) return null;
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const direct = parseJSON(cleaned);
    if (direct) return unwrapGatewayData(direct);

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    return unwrapGatewayData(parseJSON(cleaned.slice(start, end + 1)));
  }

  function parseJSON(value) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function unwrapGatewayData(value) {
    if (!value) return null;
    if (value.data && typeof value.data === "object" && !Array.isArray(value.data)) return value.data;
    if (value.result && typeof value.result === "object" && !Array.isArray(value.result)) return value.result;
    return value;
  }

  function textOr(value, fallback = "", max = 2000) {
    const text = sanitizeText(value).slice(0, max);
    return text || fallback;
  }

  function scoreOr(value, fallback = 0) {
    return clamp(asNumber(value, fallback), 0, 100);
  }

  function listOr(value, fallback = [], maxItems = 8) {
    if (!Array.isArray(value)) return fallback;
    const items = value.map((item) => textOr(item, "", 700)).filter(Boolean).slice(0, maxItems);
    return items.length ? items : fallback;
  }

  function normalizeGatewayData(feature, data, fallback) {
    const normalizers = {
      businessFinder: normalizeBusinessFinderData,
      validation: normalizeValidationData,
      blueprint: normalizeBlueprintData,
      builder: normalizeBuilderData,
      outreach: normalizeOutreachData,
      compliance: normalizeComplianceData,
      chat: normalizeChatData
    };
    return normalizers[feature] ? normalizers[feature](data, fallback) : fallback;
  }

  function normalizeBusinessFinderData(data, fallback) {
    const sourceIdeas = Array.isArray(data.ideas) ? data.ideas : [];
    const ideas = sourceIdeas.map((idea, index) => {
      const backup = fallback.ideas?.[index] || {};
      return {
        name: textOr(idea?.name, backup.name || "AI business opportunity", 120),
        summary: textOr(idea?.summary, backup.summary || "", 900),
        revenuePotential: textOr(idea?.revenuePotential, backup.revenuePotential || "Revenue range requires validation.", 140),
        competitionScore: scoreOr(idea?.competitionScore, backup.competitionScore || 50),
        startupCost: textOr(idea?.startupCost, backup.startupCost || "$2,500-$7,500", 80),
        validationScore: scoreOr(idea?.validationScore, backup.validationScore || 70),
        firstLaunchAction: textOr(idea?.firstLaunchAction, backup.firstLaunchAction || "Pre-sell a fixed-scope pilot.", 220)
      };
    }).filter((idea) => idea.name && idea.summary).slice(0, 4);

    return {
      ...fallback,
      headline: textOr(data.headline, fallback.headline, 160),
      summary: textOr(data.summary, fallback.summary, 900),
      ideas: ideas.length ? ideas : fallback.ideas,
      recommendedNextStep: textOr(data.recommendedNextStep, fallback.recommendedNextStep, 280)
    };
  }

  function normalizeValidationData(data, fallback) {
    const checks = Array.isArray(data.checks)
      ? data.checks.map((check, index) => {
        const backup = fallback.checks?.[index] || {};
        return {
          label: textOr(check?.label, backup.label || "Validation check", 100),
          result: textOr(check?.result, backup.result || "partial", 40),
          explanation: textOr(check?.explanation, backup.explanation || "", 400)
        };
      }).filter((check) => check.label).slice(0, 5)
      : fallback.checks;

    return {
      ...fallback,
      score: scoreOr(data.score, fallback.score),
      status: textOr(data.status, fallback.status, 40),
      summary: textOr(data.summary, fallback.summary, 900),
      checks: checks.length ? checks : fallback.checks,
      nextActions: listOr(data.nextActions, fallback.nextActions, 6)
    };
  }

  function normalizeBlueprintData(data, fallback) {
    const sections = Array.isArray(data.sections)
      ? data.sections.map((section, index) => {
        const backup = fallback.sections?.[index] || {};
        return {
          title: textOr(section?.title, backup.title || "Launch phase", 120),
          steps: listOr(section?.steps, backup.steps || [], 7)
        };
      }).filter((section) => section.title && section.steps.length).slice(0, 8)
      : fallback.sections;

    return {
      ...fallback,
      title: textOr(data.title, fallback.title, 160),
      audience: textOr(data.audience, fallback.audience, 120),
      successMetric: textOr(data.successMetric, fallback.successMetric, 240),
      sections: sections.length ? sections : fallback.sections
    };
  }

  function normalizeBuilderData(data, fallback) {
    return {
      ...fallback,
      title: textOr(data.title, fallback.title, 160),
      positioning: textOr(data.positioning, fallback.positioning, 900),
      modules: listOr(data.modules, fallback.modules, 8),
      stack: listOr(data.stack, fallback.stack, 8),
      monetization: listOr(data.monetization, fallback.monetization, 8),
      launchKPIs: listOr(data.launchKPIs, fallback.launchKPIs, 8)
    };
  }

  function normalizeOutreachData(data, fallback) {
    return {
      ...fallback,
      prospectSummary: textOr(data.prospectSummary, fallback.prospectSummary, 900),
      email: {
        subject: textOr(data.email?.subject, fallback.email?.subject || "Workflow automation idea", 120),
        body: textOr(data.email?.body, fallback.email?.body || "", 1600)
      },
      followUps: listOr(data.followUps, fallback.followUps, 5)
    };
  }

  function normalizeComplianceData(data, fallback) {
    return {
      ...fallback,
      title: textOr(data.title, fallback.title, 160),
      score: scoreOr(data.score, fallback.score),
      status: textOr(data.status, fallback.status, 40),
      surface: textOr(data.surface, fallback.surface, 160),
      findings: listOr(data.findings, fallback.findings, 8),
      fixes: listOr(data.fixes, fallback.fixes, 8)
    };
  }

  function normalizeChatData(data, fallback) {
    return {
      ...fallback,
      answer: textOr(data.answer, fallback.answer, 1600),
      actions: listOr(data.actions, fallback.actions, 8)
    };
  }

  function titleCase(value) {
    return sanitizeText(value)
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  }

  function marketProfile(input) {
    const industry = titleCase(input.industry || "Business Services");
    const target = titleCase(input.targetMarket || "Small Businesses");
    const budget = asNumber(input.budget, 5000);
    const team = asNumber(input.teamSize, 1);
    const skills = sanitizeText(input.skills || "sales, operations");
    const speed = budget > 15000 ? "aggressive" : budget > 5000 ? "focused" : "lean";
    return { industry, target, budget, team, skills, speed };
  }

  function businessFinder(input) {
    const profile = marketProfile(input);
    const baseScore = clamp(58 + profile.team * 4 + Math.floor(profile.budget / 4000), 52, 94);
    const ideas = [
      {
        name: `${profile.industry} Compliance Autopilot`,
        summary: `A subscription platform that scans policies, websites, and operating workflows for risk and produces executive-ready remediation reports for ${profile.target}.`,
        revenuePotential: profile.budget > 12000 ? "$18k-$55k MRR in 9-12 months" : "$5k-$18k MRR in 6-9 months",
        competitionScore: clamp(38 + profile.team * 5, 35, 72),
        startupCost: `$${Math.max(1800, Math.round(profile.budget * 0.42)).toLocaleString()}`,
        validationScore: baseScore + 4,
        firstLaunchAction: "Interview 12 operators with compliance budget ownership and pre-sell a fixed-scope audit."
      },
      {
        name: `${profile.industry} Workflow Revenue Desk`,
        summary: `An automation workspace for proposals, bid generation, lead scoring, follow-ups, and invoice-ready project handoffs.`,
        revenuePotential: profile.budget > 12000 ? "$25k-$80k MRR with agency-assisted onboarding" : "$7k-$24k MRR from niche templates",
        competitionScore: clamp(45 + Math.floor(profile.budget / 3500), 42, 82),
        startupCost: `$${Math.max(2400, Math.round(profile.budget * 0.52)).toLocaleString()}`,
        validationScore: baseScore,
        firstLaunchAction: "Ship one workflow template for the highest-cost manual task and price it against hours saved."
      },
      {
        name: `${profile.target} Micro CRM AI`,
        summary: `A lightweight CRM with reminders, AI follow-ups, invoice triggers, booking links, and prospect intelligence for teams that dislike enterprise CRM complexity.`,
        revenuePotential: "$3k-$30k MRR through tiered seats and workflow add-ons",
        competitionScore: 68,
        startupCost: `$${Math.max(1500, Math.round(profile.budget * 0.35)).toLocaleString()}`,
        validationScore: clamp(baseScore - 3, 40, 92),
        firstLaunchAction: "Run a 14-day concierge pilot with 5 paying teams and track reply-rate lift."
      }
    ];

    return {
      headline: `${profile.speed} launch portfolio for ${profile.industry}`,
      summary: `Best fit: combine ${profile.skills} with a paid pilot model for ${profile.target}. Focus on measurable labor replacement and weekly revenue reporting.`,
      ideas,
      recommendedNextStep: "Validate the top idea with the three-tier pain test, then build a paid MVP blueprint."
    };
  }

  function validation(input) {
    const values = ["urgent", "manualLabor", "existingBudget"].map((key) => sanitizeText(input[key] || "no"));
    const scoreMap = { yes: 34, partial: 19, no: 3 };
    const score = clamp(values.reduce((sum, value) => sum + (scoreMap[value] || 0), 0), 0, 100);
    const status = score >= 78 ? "Pass" : score >= 52 ? "Warning" : "Fail";
    const guidance = {
      yes: "Strong evidence. Keep pricing near the economic value created.",
      partial: "Moderate evidence. Narrow the buyer segment and ask for proof of urgency.",
      no: "Weak evidence. Reframe the offer around a costly event, deadline, or measurable labor drain."
    };
    return {
      score,
      status,
      summary: status === "Pass"
        ? "This opportunity has enough pain, labor replacement, and budget evidence for a paid pilot."
        : status === "Warning"
          ? "This opportunity can work if the buyer segment is tightened and budget proof is gathered before build-out."
          : "This opportunity should be redesigned before engineering resources are committed.",
      checks: [
        { label: "Urgent problem", result: input.urgent, explanation: guidance[input.urgent] || guidance.no },
        { label: "Replaces manual labor", result: input.manualLabor, explanation: guidance[input.manualLabor] || guidance.no },
        { label: "Existing budget", result: input.existingBudget, explanation: guidance[input.existingBudget] || guidance.no }
      ],
      nextActions: [
        "Capture 5 buyer quotes about the cost of inaction.",
        "Build a one-page paid pilot offer with scope, timeline, and success metric.",
        "Reject or revise the idea if two buyers cannot name an existing budget source."
      ]
    };
  }

  function blueprint(input) {
    const niche = titleCase(input.niche || input.industry || "AI Services");
    const audience = titleCase(input.audience || "Founder-led companies");
    const price = sanitizeText(input.price || "$799/month");
    const timeline = sanitizeText(input.timeline || "30 days");
    const sections = [
      {
        title: "Audience Discovery",
        steps: [
          `Map 30 ${audience} accounts by team size, budget owner, and trigger event.`,
          "Interview buyers about revenue leakage, manual workload, compliance fear, and response-time gaps.",
          "Rank pains by willingness to pay and implementation speed."
        ]
      },
      {
        title: "Community Research",
        steps: [
          `Monitor ${niche} forums, LinkedIn posts, reviews, and trade groups for repeated workflow complaints.`,
          "Collect exact phrases for landing page proof, onboarding language, and outreach personalization.",
          "Identify 3 partner channels with established trust."
        ]
      },
      {
        title: "MVP Strategy",
        steps: [
          "Ship one painful workflow end-to-end before expanding feature breadth.",
          "Add audit logs, role controls, retry states, and exportable reports from day one.",
          "Measure activation by time-to-first-report and weekly workflow completions."
        ]
      },
      {
        title: "Pricing Strategy",
        steps: [
          `Anchor the pilot at ${price} with a clear ROI promise.`,
          "Offer annual savings, implementation services, and usage-based expansion tiers.",
          "Protect margin with request limits and premium automation templates."
        ]
      },
      {
        title: "Launch Strategy",
        steps: [
          `Run a ${timeline} launch sprint with 10 warm prospects, 3 live demos, and 2 paid pilots.`,
          "Publish proof assets: before/after workflow time, compliance score lift, and revenue actions created.",
          "Use founder-led onboarding until support questions repeat predictably."
        ]
      },
      {
        title: "Growth Strategy",
        steps: [
          "Convert repeated services into marketplace automations.",
          "Add referral credits for agencies, consultants, and trade associations.",
          "Build programmatic SEO pages around niche workflow calculators and templates."
        ]
      }
    ];
    return {
      title: `${niche} launch blueprint`,
      audience,
      successMetric: "First 3 paying pilot customers with documented ROI inside 45 days.",
      sections
    };
  }

  function builder(input) {
    const niche = titleCase(input.niche || "Business Automation");
    const offer = sanitizeText(input.offer || `${niche} automation desk`);
    const audience = titleCase(input.audience || "service businesses");
    return {
      title: offer,
      positioning: `${offer} helps ${audience} remove manual revenue operations, protect trust, and launch measurable AI workflows.`,
      modules: [
        "Opportunity intake and AI-scored prioritization",
        "Secure document and website analysis",
        "Workflow automation templates with approval checkpoints",
        "Micro CRM with reminders, follow-ups, invoices, and booking",
        "Revenue dashboard with funnel events and saved AI reports"
      ],
      stack: [
        "Static front-end PWA for fast acquisition pages",
        "Secure NVIDIA AI gateway for inference requests",
        "JWT-backed API with rate limits, audit logs, and request replay protection",
        "PostgreSQL-ready entity model for users, projects, reports, subscriptions, and usage"
      ],
      monetization: [
        "Free validation tools for acquisition",
        "Starter plan for solo operators",
        "Pro plan with advanced automations and analytics",
        "Enterprise plan with compliance, admin, SLA, and onboarding"
      ],
      launchKPIs: ["Activation rate", "Paid pilot conversion", "AI report completion", "Saved labor hours", "Expansion revenue"]
    };
  }

  function outreach(input) {
    const company = titleCase(input.companyName || "Target Company");
    const website = sanitizeText(input.websiteUrl || "their website");
    const linkedin = sanitizeText(input.linkedinUrl || "their LinkedIn profile");
    return {
      prospectSummary: `${company} likely has discoverable workflow, compliance, or revenue operations signals across ${website} and ${linkedin}. Position the message around measurable manual work reduction.`,
      email: {
        subject: `${company} workflow revenue idea`,
        body: `Hi ${company} team,\n\nI noticed your public presence points to growing operational complexity. AXIOMFLOW can map one manual revenue workflow, estimate the hours lost, and launch an AI-assisted process with approval controls.\n\nWorth a 15-minute review if we can show a concrete savings target before any build work?`
      },
      followUps: [
        "Following up with a narrower idea: we can audit one workflow and return a savings estimate in 48 hours.",
        "If improving response time, proposal speed, or compliance visibility is a current priority, I can send a one-page pilot scope.",
        "Closing the loop. The quickest fit is a fixed-scope automation audit with measurable ROI and no platform migration."
      ]
    };
  }

  function compliance(input) {
    const surface = sanitizeText(input.surface || "website and policies");
    const company = titleCase(input.company || "Company");
    const riskWords = sanitizeText(input.notes || "").toLowerCase();
    const highRisk = ["health", "finance", "children", "payment", "biometric"].some((word) => riskWords.includes(word));
    const score = highRisk ? 62 : 78;
    return {
      title: `${company} compliance scan`,
      score,
      status: score >= 75 ? "Warning" : "Warning",
      surface,
      findings: [
        "Privacy disclosures should clearly state data collection, retention, subprocessors, and user rights.",
        "AI-generated decisions need human review paths, explainability notes, and audit logging.",
        "Forms and file uploads should include validation, consent capture, and abuse protections.",
        highRisk ? "High-risk data category detected. Add stronger consent, access controls, retention limits, and legal review." : "No high-risk category was obvious from the supplied notes."
      ],
      fixes: [
        "Add policy versioning, consent receipts, and deletion request workflow.",
        "Document model usage, request logging, and data minimization rules.",
        "Add role-based access, signed upload URLs, CSP headers, and incident response owners."
      ]
    };
  }

  function chat(input) {
    const message = sanitizeText(input.message || "");
    return {
      answer: `Focus on the highest-value workflow that is urgent, repetitive, and already funded. For "${message}", define the buyer, quantify the manual cost, pre-sell a pilot, then automate only the steps that remove measurable labor or increase revenue.`,
      actions: [
        "Write the buyer's current workflow in 7 steps or fewer.",
        "Attach a dollar value to the bottleneck.",
        "Run the validation test before building.",
        "Turn the winning workflow into a reusable marketplace template."
      ]
    };
  }

  const generators = {
    businessFinder,
    validation,
    blueprint,
    builder,
    outreach,
    compliance,
    chat
  };

  async function generate(feature, input = {}, options = {}) {
    const started = performance.now();
    checkRateLimit();
    const localGenerator = generators[feature] || generators.chat;
    let structured = localGenerator(input);
    let gatewayText = "";
    let source = options.localOnly ? "free-local-preview" : "local-planning-engine";
    let status = options.localOnly ? "free-preview" : "success";
    let errorMessage = "";

    if (!options.localOnly) {
      try {
        const response = await fetchGateway(feature, input);
        if (response) {
          const gatewayData = parseGatewayData(response);
          if (gatewayData) {
            structured = normalizeGatewayData(feature, gatewayData, structured);
          } else {
            gatewayText = response;
          }
          source = "nvidia-gateway";
        }
      } catch (error) {
        status = "gateway-fallback";
        errorMessage = error.message || "Gateway unavailable.";
      }
    }

    const result = {
      id: `gen_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      feature,
      provider: "NVIDIA AI",
      source,
      status,
      createdAt: new Date().toISOString(),
      latencyMs: Math.round(performance.now() - started),
      input,
      data: {
        ...structured,
        nvidiaInsight: gatewayText
      },
      error: errorMessage
    };

    logRequest({
      feature,
      provider: result.provider,
      source,
      status,
      latencyMs: result.latencyMs,
      error: errorMessage
    });
    return result;
  }

  async function testGateway() {
    const settings = getSettings();
    const endpoint = normalizeEndpoint(settings.gatewayUrl);
    if (!endpoint) throw new Error("NVIDIA gateway URL is not configured.");
    const started = performance.now();
    const timer = timeoutSignal(settings.timeoutMs);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AXIOM-CSRF": window.AxiomAuth?.getCsrfToken?.() || ""
        },
        body: JSON.stringify({
          model: settings.model,
          max_tokens: 32,
          temperature: 0,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
          stream: false,
          messages: [
            {
              role: "user",
              content: "Return exactly this readiness phrase and nothing else: AXIOMFLOW_NVIDIA_READY"
            }
          ]
        }),
        signal: timer.signal
      });
      timer.cancel();
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || `Gateway returned ${response.status}`);
      const content = json?.choices?.[0]?.message?.content || json?.output_text || JSON.stringify(json);
      logRequest({
        feature: "gatewayTest",
        provider: "NVIDIA AI",
        source: "nvidia-gateway",
        status: "success",
        latencyMs: Math.round(performance.now() - started),
        error: ""
      });
      return {
        ok: true,
        model: settings.model,
        latencyMs: Math.round(performance.now() - started),
        content
      };
    } catch (error) {
      timer.cancel();
      logRequest({
        feature: "gatewayTest",
        provider: "NVIDIA AI",
        source: "nvidia-gateway",
        status: "failed",
        latencyMs: Math.round(performance.now() - started),
        error: error.message || "Gateway test failed."
      });
      throw error;
    }
  }

  function getUsage() {
    const requests = getRequests();
    const total = requests.length;
    const gateway = requests.filter((request) => request.source === "nvidia-gateway").length;
    const fallbacks = requests.filter((request) => request.status === "gateway-fallback").length;
    return { total, gateway, fallbacks, requests };
  }

  window.AxiomAI = {
    getSettings,
    saveSettings,
    getRequests,
    clearRequests,
    getUsage,
    testGateway,
    generate
  };
})();
