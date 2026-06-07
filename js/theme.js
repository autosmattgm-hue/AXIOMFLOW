(function () {
  "use strict";

  const STORAGE_KEY = "axiomflow.theme";
  const themes = {
    white: { label: "White", color: "#0f6bff" },
    black: { label: "Black", color: "#32a2ff" },
    milk: { label: "Milk", color: "#1267e8" }
  };

  function normalizeTheme(value) {
    return Object.prototype.hasOwnProperty.call(themes, value) ? value : "white";
  }

  function getStoredTheme() {
    try {
      return normalizeTheme(localStorage.getItem(STORAGE_KEY) || "white");
    } catch (error) {
      return "white";
    }
  }

  function setTheme(theme) {
    const nextTheme = normalizeTheme(theme);
    document.documentElement.dataset.theme = nextTheme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themes[nextTheme].color);
    try {
      localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch (error) {
      console.warn("Theme preference could not be saved.", error);
    }
    syncThemeButtons(nextTheme);
    window.dispatchEvent(new CustomEvent("axiom:theme-change", { detail: { theme: nextTheme } }));
  }

  function syncThemeButtons(theme) {
    document.querySelectorAll("[data-theme-option]").forEach((button) => {
      const isActive = button.dataset.themeOption === theme;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function initTheme() {
    setTheme(getStoredTheme());
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-theme-option]");
      if (!button) return;
      setTheme(button.dataset.themeOption);
    });
  }

  window.AxiomTheme = {
    themes,
    init: initTheme,
    setTheme,
    getTheme: getStoredTheme
  };

  document.addEventListener("DOMContentLoaded", initTheme);
})();
