(function () {
  "use strict";

  const PROJECTS_KEY = "axiomflow.projects";
  const REPORTS_KEY = "axiomflow.reports";
  const REVENUE_KEY = "axiomflow.revenue";
  const EVENTS_KEY = "axiomflow.events";

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

  function id(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function seed() {
    if (!readJSON(PROJECTS_KEY, []).length) {
      writeJSON(PROJECTS_KEY, [
        {
          id: id("prj"),
          name: "Construction Bid Generator",
          industry: "Construction",
          status: "Build",
          progress: 68,
          opportunityScore: 84,
          revenueGoal: 18000,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18).toISOString()
        },
        {
          id: id("prj"),
          name: "Agency Lead Qualification AI",
          industry: "Agencies",
          status: "Validate",
          progress: 43,
          opportunityScore: 76,
          revenueGoal: 12000,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString()
        },
        {
          id: id("prj"),
          name: "Privacy Audit Autopilot",
          industry: "Consulting",
          status: "Launch",
          progress: 82,
          opportunityScore: 91,
          revenueGoal: 26000,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 32).toISOString()
        }
      ]);
    }
    if (!readJSON(REVENUE_KEY, []).length) {
      writeJSON(REVENUE_KEY, [
        { id: id("rev"), label: "Pilot retainers", amount: 3600, month: "Jan", createdAt: new Date().toISOString() },
        { id: id("rev"), label: "Template sales", amount: 5200, month: "Feb", createdAt: new Date().toISOString() },
        { id: id("rev"), label: "Pro subscriptions", amount: 8800, month: "Mar", createdAt: new Date().toISOString() },
        { id: id("rev"), label: "Enterprise onboarding", amount: 14300, month: "Apr", createdAt: new Date().toISOString() },
        { id: id("rev"), label: "Usage expansion", amount: 19200, month: "May", createdAt: new Date().toISOString() },
        { id: id("rev"), label: "Annual upgrades", amount: 24100, month: "Jun", createdAt: new Date().toISOString() }
      ]);
    }
  }

  function recordEvent(type, meta = {}) {
    const events = readJSON(EVENTS_KEY, []);
    events.unshift({
      id: id("evt"),
      type,
      meta,
      createdAt: new Date().toISOString()
    });
    writeJSON(EVENTS_KEY, events.slice(0, 200));
  }

  function getProjects() {
    seed();
    return readJSON(PROJECTS_KEY, []);
  }

  function setProjects(projects) {
    writeJSON(PROJECTS_KEY, projects);
  }

  function createProject(input) {
    seed();
    const projects = getProjects();
    const project = {
      id: id("prj"),
      name: String(input.name || "New AI Business").trim().replace(/[<>]/g, ""),
      industry: String(input.industry || "Automation").trim().replace(/[<>]/g, ""),
      status: String(input.status || "Validate").trim().replace(/[<>]/g, ""),
      progress: Math.max(5, Math.min(98, Number(input.progress || 22))),
      opportunityScore: Math.max(35, Math.min(96, Number(input.opportunityScore || 72))),
      revenueGoal: Math.max(0, Number(input.revenueGoal || 10000)),
      createdAt: new Date().toISOString()
    };
    projects.unshift(project);
    setProjects(projects);
    recordEvent("project.created", { name: project.name });
    return project;
  }

  function saveReport(feature, result) {
    const reports = readJSON(REPORTS_KEY, []);
    const report = {
      id: result.id || id("rep"),
      feature,
      provider: result.provider || "NVIDIA AI",
      source: result.source || "local-planning-engine",
      status: result.status || "success",
      title: result.data?.title || result.data?.headline || feature,
      score: result.data?.score || result.data?.ideas?.[0]?.validationScore || null,
      createdAt: result.createdAt || new Date().toISOString(),
      result
    };
    reports.unshift(report);
    writeJSON(REPORTS_KEY, reports.slice(0, 100));
    recordEvent("ai.report.saved", { feature, title: report.title });
    return report;
  }

  function getReports(feature) {
    const reports = readJSON(REPORTS_KEY, []);
    return feature ? reports.filter((report) => report.feature === feature) : reports;
  }

  function addRevenue(input) {
    seed();
    const revenue = readJSON(REVENUE_KEY, []);
    const entry = {
      id: id("rev"),
      label: String(input.label || "Revenue").trim().replace(/[<>]/g, ""),
      amount: Math.max(0, Number(input.amount || 0)),
      month: String(input.month || new Date().toLocaleString("en", { month: "short" })).trim().slice(0, 12),
      createdAt: new Date().toISOString()
    };
    revenue.push(entry);
    writeJSON(REVENUE_KEY, revenue);
    recordEvent("revenue.added", { amount: entry.amount });
    return entry;
  }

  function getRevenue() {
    seed();
    return readJSON(REVENUE_KEY, []);
  }

  function getEvents() {
    return readJSON(EVENTS_KEY, []);
  }

  function getStats() {
    const projects = getProjects();
    const reports = getReports();
    const revenue = getRevenue();
    const aiUsage = window.AxiomAI?.getUsage?.() || { total: 0, gateway: 0, fallbacks: 0 };
    const totalRevenue = revenue.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const avgOpportunity = projects.length
      ? Math.round(projects.reduce((sum, project) => sum + Number(project.opportunityScore || 0), 0) / projects.length)
      : 0;
    return {
      projects: projects.length,
      reports: reports.length,
      aiGenerations: aiUsage.total,
      totalRevenue,
      avgOpportunity,
      revenue,
      projectsList: projects,
      reportsList: reports,
      events: getEvents(),
      aiUsage
    };
  }

  function clearAllData() {
    [PROJECTS_KEY, REPORTS_KEY, REVENUE_KEY, EVENTS_KEY].forEach((key) => localStorage.removeItem(key));
    seed();
  }

  function drawLineChart(canvas, values, color) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.clientWidth || 480;
    const height = canvas.clientHeight || 220;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, width, height);
    const padding = 26;
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = Math.max(max - min, 1);
    ctx.strokeStyle = "rgba(125, 140, 160, 0.22)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i += 1) {
      const y = padding + ((height - padding * 2) / 3) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    ctx.beginPath();
    values.forEach((value, index) => {
      const x = padding + ((width - padding * 2) / Math.max(values.length - 1, 1)) * index;
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.stroke();
    values.forEach((value, index) => {
      const x = padding + ((width - padding * 2) / Math.max(values.length - 1, 1)) * index;
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawBarChart(canvas, values, color) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.clientWidth || 480;
    const height = canvas.clientHeight || 220;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, width, height);
    const max = Math.max(...values, 1);
    const gap = 12;
    const barWidth = (width - gap * (values.length + 1)) / values.length;
    values.forEach((value, index) => {
      const barHeight = Math.max(18, (value / max) * (height - 34));
      const x = gap + (barWidth + gap) * index;
      const y = height - barHeight - 12;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 8);
      ctx.fill();
    });
  }

  function drawCharts() {
    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue("--accent").trim() || "#0f6bff";
    const success = styles.getPropertyValue("--success").trim() || "#0d9488";
    const warning = styles.getPropertyValue("--warning").trim() || "#d97706";
    const stats = getStats();
    drawLineChart(document.querySelector("[data-chart='growth']"), stats.revenue.map((entry) => Number(entry.amount || 0)), accent);
    drawBarChart(document.querySelector("[data-chart='progress']"), stats.projectsList.map((project) => Number(project.progress || 0)), success);
    drawBarChart(document.querySelector("[data-chart='opportunity']"), stats.projectsList.map((project) => Number(project.opportunityScore || 0)), warning);
  }

  document.addEventListener("DOMContentLoaded", () => {
    seed();
    window.addEventListener("resize", () => {
      if (document.querySelector("[data-chart]")) drawCharts();
    });
    window.addEventListener("axiom:theme-change", () => {
      if (document.querySelector("[data-chart]")) drawCharts();
    });
  });

  window.AxiomDashboard = {
    seed,
    createProject,
    getProjects,
    saveReport,
    getReports,
    addRevenue,
    getRevenue,
    getStats,
    getEvents,
    recordEvent,
    clearAllData,
    drawCharts
  };
})();
