# AXIOMFLOW Component Map

This static build keeps reusable UI components in JavaScript render functions so every page can share the same navigation, drawers, cards, forms, reports, pricing tables, dashboards, and admin surfaces without a framework build step.

- `renderChrome()` builds the sticky header, desktop navigation, mobile drawer, account action, and theme controls.
- `pageIntro()`, `emptyState()`, `sectionList()`, and report renderers keep page sections consistent.
- `handleAIForm()` standardizes validation, loading states, rate-limited NVIDIA AI generation, dashboard persistence, and toast feedback.
- `AxiomDashboard` centralizes local project, report, revenue, event, and chart state.
- `AxiomAuth` centralizes registration, login, reset, profile, subscription, CSRF, and role checks.
